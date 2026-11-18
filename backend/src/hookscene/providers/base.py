"""Client for any OpenAI-compatible chat endpoint (Gemini, Groq, OpenRouter, OpenAI, Anthropic's OpenAI-compatible
endpoint, or a company gateway).

The steps in core/stages.py call LLM.ajson(stage, system, user, Schema). Which model a stage uses is set in
config.yaml.

* per-stage provider and model, fallback models, optional reasoning_effort
* parallel calls: a concurrency limit per provider and a minimum gap between call starts
* disk cache keyed by (endpoint, model, temperature, messages, effort), so re-runs cost nothing
* replies parsed as JSON and checked against a Pydantic schema; one retry shows the model its invalid reply
* backoff on 429/5xx/timeouts, model fallback, and a record of models whose daily quota ran out (dead_models.json)
* every call is logged (tokens including hidden reasoning tokens, seconds, cache hit) for run_log.json

Provider quirks that need code (not just config), see docs/providers.md:
* Anthropic's OpenAI-compatible layer rejects `response_format: json_object` (400) and requires `max_tokens`.
  Set `json_mode: false` and `max_tokens: <n>` on the provider in config.yaml; this client reads both, and also
  recovers automatically if a provider rejects response_format at call time.
* A provider that doesn't support `reasoning_effort` is retried once without it (generic, not Anthropic-specific).
* A provider that needs an extra header (e.g. Anthropic's `anthropic-workspace-id` for unscoped keys) can set
  `extra_headers` on the provider in config.yaml.

Transport: the `openai` SDK in normal Python; in the browser (Pyodide) the browser's fetch via pyodide.http.pyfetch.
"""
from __future__ import annotations

import asyncio
import copy
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, TypeVar

import yaml
from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)
IN_BROWSER = sys.platform == "emscripten"


def load_env_file(path: str | Path | None = None) -> None:
    """Load KEY=VALUE lines from <project>/.env into os.environ (without overriding real env vars)."""
    p = Path(path) if path else Path(__file__).resolve().parents[3] / ".env"
    try:
        if not p.exists():
            return
        lines = p.read_text(encoding="utf-8-sig").splitlines()
    except OSError:
        return
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if v and not os.environ.get(k):
            os.environ[k] = v


def _deep_merge(base: dict, over: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        out[k] = _deep_merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else copy.deepcopy(v)
    return out


def apply_profile(cfg: dict, profile: str | None) -> dict:
    """Overlay a named profile from cfg['profiles'] (e.g. fast / thorough / free_tier)."""
    if not profile:
        return cfg
    profs = cfg.get("profiles") or {}
    if profile not in profs:
        raise ValueError(f"unknown profile '{profile}'; choose one of {sorted(profs)}")
    out = _deep_merge(cfg, profs[profile])
    out["active_profile"] = profile
    return out


def load_config(path: str | Path, profile: str | None = None) -> dict:
    cfg = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    return apply_profile(cfg, profile or cfg.get("default_profile"))


def _extract_json(text: str) -> Any:
    """Parse model output as JSON, tolerating ```json fences and stray prose."""
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t, flags=re.I)
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        m = re.search(r"[\[{].*[\]}]", t, flags=re.S)
        if not m:
            raise
        return json.loads(m.group(0))


class HTTPError(Exception):
    """Provider error with an HTTP status (same attribute name the openai SDK uses)."""

    def __init__(self, status: int | None, message: str):
        super().__init__(message)
        self.status_code = status


class FatalProviderError(Exception):
    """Account problem (bad key, no credit, no access). Not a RuntimeError, so the per-call error handlers in
    core/stages.py don't catch it and the whole run stops with this message."""


FATAL_HINTS = {
    401: "The provider rejected the API key (HTTP 401). Check that the key is right and belongs to the chosen provider.",
    402: "The API key's account has no credit left (HTTP 402). Top up billing for this key (Google AI Studio -> "
         "Billing), or use a different key. Tip: 'Instant baseline (no key)' still works.",
    403: "The provider refused access (HTTP 403): the key may lack permission for this model or API, or be restricted.",
}


def run_sync(coro):
    """Run a coroutine from synchronous code (CLI, tests)."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    raise RuntimeError("an event loop is already running: use the async API (ajson / arun)")


class LLM:
    def __init__(self, config: dict, cache_dir: str | Path = ".cache", api_keys: dict | None = None,
                 use_cache: bool = True, fresh_stages: set[str] | None = None, log=None):
        load_env_file()
        self.cfg = config
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.api_keys = api_keys or {}  # provider name -> key (UI "bring your own key")
        self.use_cache = use_cache
        self.fresh_stages = set(fresh_stages or ())  # stages that skip reading the cache (they still write it)
        self._skip: set[str] = set()  # models that hung or stayed overloaded in this run
        self.calls: list[dict] = []
        self.log = log or (lambda msg: print(msg, flush=True))
        self._clients: dict[str, Any] = {}
        self._loop_state: dict[int, dict] = {}  # per event loop: semaphores, spacing locks, next start times
        self._dead_path = self.cache_dir / "dead_models.json"
        try:
            now = time.time()
            self._dead = {k: v for k, v in json.loads(self._dead_path.read_text(encoding="utf-8")).items() if v > now}
        except Exception:  # noqa: BLE001 - no file yet / unreadable: start clean
            self._dead = {}

    def _mark_dead(self, model: str, msg: str) -> None:
        """Daily free-tier quota used up: skip this model until the quota resets."""
        secs = 6 * 3600.0
        m = re.search(r"retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?", msg)
        if m and any(m.groups()):
            secs = int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + float(m.group(3) or 0)
        self._dead[model] = time.time() + secs + 60
        try:
            self._dead_path.write_text(json.dumps(self._dead), encoding="utf-8")
        except OSError:
            pass

    # internals
    def _stage(self, stage: str) -> tuple[str, dict, str]:
        s = self.cfg["stages"][stage]
        prov = s["provider"]
        return prov, self.cfg["providers"][prov], s["model"]

    def _api_key(self, prov: str, pcfg: dict) -> str:
        key = self.api_keys.get(prov) or os.environ.get(pcfg.get("api_key_env", ""), "")
        if not key:
            raise FatalProviderError(f"No API key for provider '{prov}'. Set env var {pcfg.get('api_key_env')} "
                                     f"or paste a key in the app.")
        return key

    def _client(self, prov: str, pcfg: dict):
        if prov not in self._clients:
            from openai import OpenAI

            self._clients[prov] = OpenAI(api_key=self._api_key(prov, pcfg), base_url=pcfg["base_url"],
                                         timeout=pcfg.get("timeout", 90), max_retries=0,
                                         default_headers=pcfg.get("extra_headers") or None)
        return self._clients[prov]

    def _key(self, pcfg: dict, model: str, messages: list[dict], temperature: float, effort: str | None = None) -> str:
        parts = [pcfg["base_url"], model, temperature, messages] + ([effort] if effort else [])  # keys without effort match older cache files
        blob = json.dumps(parts, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(blob.encode("utf-8")).hexdigest()

    def _models(self, stage: str) -> list[str]:
        st = self.cfg["stages"][stage]
        return [st["model"]] + list(st.get("fallback_models", []))

    def _state(self) -> dict:
        loop = asyncio.get_running_loop()
        return self._loop_state.setdefault(id(loop), {"sem": {}, "lock": {}, "next": {}})

    async def _slot(self, prov: str, pcfg: dict):
        """Concurrency limit per provider + minimum spacing between call starts."""
        st = self._state()
        sem = st["sem"].setdefault(prov, asyncio.Semaphore(max(1, int(pcfg.get("concurrency", 1)))))
        lock = st["lock"].setdefault(prov, asyncio.Lock())
        gap = float(pcfg.get("min_interval_s", 0))
        await sem.acquire()
        if gap > 0:
            async with lock:
                now = time.time()
                start = max(now, st["next"].get(prov, 0.0))
                st["next"][prov] = start + gap
            if start > now:
                await asyncio.sleep(start - now)
        return sem

    async def _transport(self, prov: str, pcfg: dict, kwargs: dict) -> tuple[str, int, int, int]:
        """One chat-completion call -> (text, prompt_tokens, completion_tokens, total_tokens)."""
        if IN_BROWSER:
            from pyodide.http import pyfetch  # type: ignore

            url = pcfg["base_url"].rstrip("/") + "/chat/completions"
            limit = float(pcfg.get("timeout", 90))
            opts: dict[str, Any] = {}
            try:  # abort the request itself, so a hung call does not keep a connection open
                from js import AbortSignal  # type: ignore
                opts["signal"] = AbortSignal.timeout(int(limit * 1000))
            except Exception:  # noqa: BLE001 - older browsers: asyncio.wait_for below still stops waiting
                pass

            async def go():
                headers = {"Content-Type": "application/json",
                           "Authorization": f"Bearer {self._api_key(prov, pcfg)}"}
                headers.update(pcfg.get("extra_headers") or {})
                r = await pyfetch(url, method="POST", body=json.dumps(kwargs), headers=headers, **opts)
                return r, await r.string()

            try:
                r, body = await asyncio.wait_for(go(), timeout=limit + 2)
            except asyncio.TimeoutError as e:
                raise HTTPError(None, f"request timed out after {limit:.0f} s") from e
            except Exception as e:  # noqa: BLE001
                if "abort" in str(e).lower() or "timed out" in str(e).lower() or "timeout" in str(e).lower():
                    raise HTTPError(None, f"request timed out after {limit:.0f} s") from e
                raise
            if r.status != 200:
                raise HTTPError(r.status, f"HTTP {r.status}: {body[:600]}")
            d = json.loads(body)
            u = d.get("usage")
            text = ((d.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
            if u and isinstance(u, dict) and "prompt_tokens" in u:
                pt = u.get("prompt_tokens")
                ct = u.get("completion_tokens")
                tt = u.get("total_tokens") or (((pt or 0) + (ct or 0)) if (pt is not None and ct is not None) else None)
            else:
                pt, ct, tt = None, None, None
            return text, pt, ct, tt
        client = self._client(prov, pcfg)
        r = await asyncio.to_thread(client.chat.completions.create, **kwargs)
        u = getattr(r, "usage", None)
        if u is not None and getattr(u, "prompt_tokens", None) is not None:
            pt = getattr(u, "prompt_tokens", None)
            ct = getattr(u, "completion_tokens", None)
            tt = getattr(u, "total_tokens", None)
        else:
            pt, ct, tt = None, None, None
        return (r.choices[0].message.content or "", pt, ct, tt)

    async def _araw(self, stage: str, messages: list[dict], temperature: float, json_mode: bool = True) -> str:
        from ..eval.pricing import calculate_call_cost
        prov, pcfg, _ = self._stage(stage)
        models = self._models(stage)
        effort = self.cfg["stages"][stage].get("reasoning_effort")
        if self.use_cache and stage not in self.fresh_stages:
            for model in models:
                cpath = self.cache_dir / f"{self._key(pcfg, model, messages, temperature, effort)}.json"
                if cpath.exists():
                    d = json.loads(cpath.read_text(encoding="utf-8"))
                    pt = d.get("pt")
                    ct = d.get("ct")
                    th = d.get("th", 0)
                    tt = (pt + ct + th) if (pt is not None and ct is not None) else None
                    self.calls.append({
                        "call_id": f"call_{len(self.calls)+1:04d}",
                        "stage": stage,
                        "provider": prov,
                        "model": model,
                        "cached": True,
                        "prompt_tokens": pt,
                        "completion_tokens": ct,
                        "thinking_tokens": th,
                        "total_tokens": tt,
                        "seconds": 0.0,
                        "duration_s": 0.0,
                        "status": "success",
                        "retry_count": 0,
                        "is_fallback": False,
                        "fallback_model": None,
                        "estimated_cost_usd": 0.0,
                        "cost_available": True,
                        "error_msg": None,
                    })
                    return d["text"]

        per_model = int(pcfg.get("retries", 3))
        last_err: Exception | None = None
        for mi, model in enumerate(models):
            if (model in self._dead or model in self._skip) and mi < len(models) - 1:
                continue  # daily quota used up, or it hung / stayed overloaded earlier in this run
            kwargs: dict[str, Any] = dict(model=model, messages=messages, temperature=temperature)
            if json_mode and pcfg.get("json_mode", True):
                kwargs["response_format"] = {"type": "json_object"}
            if effort:
                kwargs["reasoning_effort"] = effort  # caps hidden "thinking" tokens, which are billed as output
            if pcfg.get("max_tokens"):  # Anthropic's OpenAI-compatible layer requires this; others default fine
                kwargs["max_tokens"] = pcfg["max_tokens"]
            for attempt in range(per_model):
                sem = await self._slot(prov, pcfg)
                if model in self._skip and mi < len(models) - 1:
                    sem.release()  # another call found this model stuck while we were queued: don't wait on it too
                    break
                t0 = time.perf_counter()
                try:
                    text, pt, ct, tt = await self._transport(prov, pcfg, kwargs)
                    # Gemini's OpenAI endpoint leaves hidden "thinking" tokens out of completion_tokens, but they are
                    # billed as output: total_tokens - prompt - completion recovers them.
                    th = max(0, (tt or 0) - (pt or 0) - (ct or 0)) if (tt is not None and pt is not None and ct is not None) else 0
                    cpath = self.cache_dir / f"{self._key(pcfg, model, messages, temperature, effort)}.json"
                    cpath.write_text(json.dumps({"text": text, "pt": pt, "ct": ct, "th": th}, ensure_ascii=False),
                                     encoding="utf-8")
                    t_dur = round(time.perf_counter() - t0, 3)
                    cost = calculate_call_cost(pt, ct, model, self.cfg)
                    self.calls.append({
                        "call_id": f"call_{len(self.calls)+1:04d}",
                        "stage": stage,
                        "provider": prov,
                        "model": model,
                        "cached": False,
                        "prompt_tokens": pt,
                        "completion_tokens": ct,
                        "thinking_tokens": th,
                        "total_tokens": tt,
                        "seconds": t_dur,
                        "duration_s": t_dur,
                        "status": "success",
                        "retry_count": attempt,
                        "is_fallback": mi > 0,
                        "fallback_model": model if mi > 0 else None,
                        "estimated_cost_usd": cost,
                        "cost_available": cost is not None,
                        "error_msg": None,
                    })
                    return text
                except FatalProviderError:
                    raise
                except Exception as e:  # noqa: BLE001 - we classify by status/message
                    last_err = e
                    dur = round(time.perf_counter() - t0, 3)
                    err_cls = type(e).__name__
                    is_to = ("timed out" in str(e).lower() or "timeout" in str(e).lower() or err_cls in ("APITimeoutError", "TimeoutError"))
                    self.calls.append({
                        "call_id": f"call_{len(self.calls)+1:04d}",
                        "stage": stage,
                        "provider": prov,
                        "model": model,
                        "cached": False,
                        "prompt_tokens": None,
                        "completion_tokens": None,
                        "thinking_tokens": None,
                        "total_tokens": None,
                        "seconds": dur,
                        "duration_s": dur,
                        "status": "timeout" if is_to else "error",
                        "retry_count": attempt,
                        "is_fallback": mi > 0,
                        "fallback_model": model if mi > 0 else None,
                        "estimated_cost_usd": None,
                        "cost_available": False,
                        "error_msg": str(e)[:250],
                    })
                    status = getattr(e, "status_code", None)
                    msg = str(e).lower()
                    if status in FATAL_HINTS and not (status == 403 and "model" in msg and mi < len(models) - 1):
                        detail = re.sub(r"\s+", " ", str(e))[:300]
                        raise FatalProviderError(f"{FATAL_HINTS[status]} Provider said: {detail}") from e
                    if status == 400 and "reasoning" in msg and "reasoning_effort" in kwargs:
                        # endpoint/model does not support reasoning_effort: drop it and retry this model once
                        kwargs.pop("reasoning_effort")
                        self.log(f"  [llm] {stage}: {model} rejected reasoning_effort; retrying without it")
                        continue
                    if status == 400 and "response_format" in msg and "response_format" in kwargs:
                        # e.g. Anthropic's compat layer: json_object is rejected; drop it and rely on the prompt
                        kwargs.pop("response_format")
                        self.log(f"  [llm] {stage}: {model} rejected response_format; retrying without it")
                        continue
                    if status == 400 and "max_tokens" in msg and "max_tokens" not in kwargs:
                        kwargs["max_tokens"] = pcfg.get("max_tokens_fallback", 8192)
                        self.log(f"  [llm] {stage}: {model} requires max_tokens; retrying with a default")
                        continue
                    if status == 404:  # model not available to this key: try the next model straight away
                        self.log(f"  [llm] {stage}: {model} not available (404); trying next model")
                        break
                    cls = type(e).__name__
                    if status == 429 and ("PerDay" in str(e) or "per day" in msg):
                        self._mark_dead(model, str(e))
                        self.log(f"  [llm] {stage}: {model} daily free-tier quota used up -> skipping it until it resets")
                        break
                    retryable = (status in (429, 500, 502, 503, 504) or "rate" in msg or "timeout" in msg
                                 or "overloaded" in msg or "timed out" in msg or "connection" in msg
                                 or "failed to fetch" in msg or "network" in msg
                                 or cls in ("APIConnectionError", "APITimeoutError"))
                    if not retryable:
                        raise
                    timed_out = ("timed out" in msg or "timeout" in msg
                                 or cls in ("APITimeoutError", "TimeoutError", "ReadTimeout"))
                    last_try = attempt == per_model - 1 or (timed_out and mi < len(models) - 1)
                    if last_try and mi < len(models) - 1:
                        self._skip.add(model)  # don't make later calls in this run wait on it again
                    nxt = " -> switching model" if (last_try and mi < len(models) - 1) else ""
                    delay = 0 if last_try else min(30, 3 * 2 ** attempt)
                    if status == 429 and not last_try:
                        # Google tells us how long to wait ("retry in 12.3s" / retryDelay: "12s")
                        m = re.search(r"retry(?:Delay)?\D{0,12}(\d+(?:\.\d+)?)\s*s", str(e), flags=re.I)
                        delay = min(60, float(m.group(1)) + 1) if m else max(delay, 10)
                    why = (cls if status is None else f"HTTP {status}")
                    self.log(f"  [llm] {stage}: {model} busy/limited ({why}); attempt {attempt + 1}/{per_model}"
                             + (f", retry in {delay:.0f}s" if delay else "") + nxt)
                    if last_try:
                        break
                    if delay:
                        await asyncio.sleep(delay)
                finally:
                    sem.release()
        raise RuntimeError(f"LLM call failed on all models {models}: {str(last_err)[:300]}")

    def _raw(self, stage: str, messages: list[dict], temperature: float, json_mode: bool = True) -> str:
        return run_sync(self._araw(stage, messages, temperature, json_mode))

    # public API
    async def ajson(self, stage: str, system: str, user: str, schema: type[T], temperature: float | None = None,
                    max_retries: int = 1) -> T:
        """Call the stage's model and return a validated Pydantic object."""
        temp = self.cfg["stages"][stage].get("temperature", 0.2) if temperature is None else temperature
        messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
        err_note, prev = "", ""
        for attempt in range(max_retries + 1):
            msgs = messages if not err_note else messages + [
                {"role": "assistant", "content": prev[:4000]},
                {"role": "user", "content": f"Your previous reply was invalid: {err_note}\n"
                                            f"Reply again with ONLY valid JSON matching the schema."}]
            text = await self._araw(stage, msgs, temp)
            try:
                return schema.model_validate(_extract_json(text))
            except (json.JSONDecodeError, ValidationError) as e:
                err_note, prev = str(e)[:600], text
        raise ValueError(f"[{stage}] model output failed validation after retry: {err_note}")

    def json(self, stage: str, system: str, user: str, schema: type[T], temperature: float | None = None,
             max_retries: int = 1) -> T:
        return run_sync(self.ajson(stage, system, user, schema, temperature, max_retries))

    def summary(self) -> dict:
        by_stage: dict[str, dict] = {}
        total_prompt_tokens = 0
        total_completion_tokens = 0
        total_thinking_tokens = 0
        total_tokens = 0
        tokens_available = True
        total_cost_usd = 0.0
        cost_available = True
        total_retries = 0
        total_fallbacks = 0
        failed_calls = 0

        for c in self.calls:
            s = by_stage.setdefault(c["stage"], {
                "calls": 0, "successful_calls": 0, "failed_calls": 0, "cached": 0,
                "prompt_tokens": 0, "completion_tokens": 0, "thinking_tokens": 0, "total_tokens": 0,
                "seconds": 0.0, "model": self.cfg["stages"].get(c["stage"], {}).get("model"),
                "provider": c["provider"], "models_used": {}, "retries": 0, "fallbacks": 0,
                "estimated_cost_usd": 0.0, "cost_available": True,
            })
            s["calls"] += 1
            s["models_used"][c["model"]] = s["models_used"].get(c["model"], 0) + 1
            s["seconds"] = round(s["seconds"] + c.get("seconds", 0.0), 2)
            if c.get("retry_count", 0) > 0:
                s["retries"] += 1
                total_retries += 1
            if c.get("is_fallback"):
                s["fallbacks"] += 1
                total_fallbacks += 1

            if c.get("status") != "success":
                s["failed_calls"] += 1
                failed_calls += 1
                continue

            s["successful_calls"] += 1
            if c.get("cached"):
                s["cached"] += 1
                continue

            pt = c.get("prompt_tokens")
            ct = c.get("completion_tokens")
            th = c.get("thinking_tokens", 0) or 0
            tt = c.get("total_tokens")

            if pt is not None and ct is not None:
                s["prompt_tokens"] += pt
                s["completion_tokens"] += ct
                s["thinking_tokens"] += th
                s["total_tokens"] += (tt if tt is not None else (pt + ct + th))
                total_prompt_tokens += pt
                total_completion_tokens += ct
                total_thinking_tokens += th
                total_tokens += (tt if tt is not None else (pt + ct + th))
            else:
                tokens_available = False

            cost = c.get("estimated_cost_usd")
            if cost is not None:
                s["estimated_cost_usd"] = round(s["estimated_cost_usd"] + cost, 6)
                total_cost_usd += cost
            else:
                s["cost_available"] = False
                cost_available = False

        return {
            "total_calls": len(self.calls),
            "successful_calls": sum(1 for c in self.calls if c.get("status") == "success"),
            "failed_calls": failed_calls,
            "cache_hits": sum(1 for c in self.calls if c.get("cached")),
            "total_prompt_tokens": total_prompt_tokens if tokens_available else None,
            "total_completion_tokens": total_completion_tokens if tokens_available else None,
            "total_thinking_tokens": total_thinking_tokens if tokens_available else None,
            "total_tokens": total_tokens if tokens_available else None,
            "tokens_available": tokens_available,
            "total_estimated_cost_usd": round(total_cost_usd, 6) if cost_available else None,
            "cost_available": cost_available,
            "cost_disclaimer": "Estimated cost based on reported token usage and configured model pricing ($/1M)",
            "total_retries": total_retries,
            "total_fallbacks": total_fallbacks,
            "by_stage": by_stage,
            "calls": self.calls,
        }
