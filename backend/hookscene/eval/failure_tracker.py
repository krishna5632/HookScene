"""Centralized Failure Tracker for HookScene.
Automatically records failures across validation, scoring, and review stages without redundant LLM calls.
"""
from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from .schemas import FAILURE_CATEGORIES, FailureRecord, RunMetadata
from .store import EvalStore

logger = logging.getLogger("snipdeck.eval.failure_tracker")


def compute_screenplay_hash(episodes_data: Any) -> str:
    """Compute a deterministic SHA-256 hash for screenplay text/lines."""
    hasher = hashlib.sha256()
    if isinstance(episodes_data, dict):
        for ep_num in sorted(episodes_data.keys()):
            ep = episodes_data[ep_num]
            if hasattr(ep, "lines"):
                for l in getattr(ep, "lines", []):
                    hasher.update(f"{getattr(l, 'speaker', '')}:{getattr(l, 'text', '')}\n".encode("utf-8"))
            elif isinstance(ep, dict) and "lines" in ep:
                for l in ep["lines"]:
                    hasher.update(f"{l.get('speaker', '')}:{l.get('text', '')}\n".encode("utf-8"))
    elif isinstance(episodes_data, (list, tuple)):
        for item in episodes_data:
            hasher.update(str(item).encode("utf-8"))
    else:
        hasher.update(str(episodes_data).encode("utf-8"))
    return hasher.hexdigest()[:16]


def track_run_failures_and_metadata(
    run_id: str,
    run_payload: dict[str, Any],
    store: EvalStore | None = None,
    episodes: dict[int, Any] | None = None,
) -> tuple[int, RunMetadata]:
    """Extract automatic failures from run payload and store run metadata."""
    if store is None:
        store = EvalStore()

    show_title = run_payload.get("show") or "I Married a Broken Soldier. He was a Duke"
    promos = run_payload.get("promos") or []
    montages = run_payload.get("montages") or []
    all_promos = promos + montages
    run_log = run_payload.get("run_log") or {}
    llm_info = run_log.get("llm") or {}

    # 1. Compute screenplay hash & build RunMetadata
    if episodes:
        screenplay_hash = compute_screenplay_hash(episodes)
    else:
        # Fallback hash from run characteristics
        seed = f"{show_title}-{run_log.get('episodes', 50)}-{run_log.get('lines', 3727)}"
        screenplay_hash = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:16]

    model_prov = "gemini"
    model_ver = "gemini-3.8-flash"
    if "candidates" in llm_info.get("by_stage", {}):
        cand_stage = llm_info["by_stage"]["candidates"]
        model_prov = cand_stage.get("provider", model_prov)
        model_ver = cand_stage.get("model", model_ver)
    elif run_payload.get("mode") == "heuristic" or "baseline" in run_id.lower():
        model_prov = "deterministic"
        model_ver = "heuristic-rules-v1"

    cand_ids: list[str] = []
    time_ranges: dict[str, list[float]] = {}
    scores: dict[str, float] = {}
    rankings: dict[str, int] = {}

    for p in all_promos:
        pid = p.get("pid", "")
        if not pid:
            continue
        cand_ids.append(pid)
        segs = p.get("segments") or []
        if segs:
            t0 = segs[0].get("start", 0.0)
            t1 = segs[-1].get("end", 0.0)
            time_ranges[pid] = [round(t0, 2), round(t1, 2)]
        score_val = p.get("composite", 0.0)
        if "score_100" in p:
            score_val = float(p["score_100"])
        scores[pid] = round(score_val, 1)
        if p.get("rank") is not None:
            rankings[pid] = int(p["rank"])

    metadata = RunMetadata(
        run_id=run_id,
        show_title=show_title,
        screenplay_hash=screenplay_hash,
        model_provider=model_prov,
        model_version=model_ver,
        prompt_version="v2.4",
        pipeline_version="2.0.0",
        temperature=0.2 if model_prov != "deterministic" else None,
        generation_settings={
            "mode": run_payload.get("mode", "llm"),
            "hook_window_s": 3.0,
            "min_duration": 20.0,
            "max_duration": 60.0,
        },
        candidate_ids=cand_ids,
        candidate_time_ranges=time_ranges,
        candidate_scores=scores,
        candidate_rankings=rankings,
        total_candidates=len(cand_ids),
        status="completed",
    )
    store.save_run_metadata(metadata)

    # 2. Extract Failures from existing pipeline outputs
    failures_to_record: list[dict[str, Any]] = []

    for p in all_promos:
        pid = p.get("pid", "")
        ep = p.get("segments", [{}])[0].get("episode", 1)
        flags = p.get("flags") or {}
        scores_dict = p.get("scores") or {}

        # a) Spoiler & late payoff risk
        if flags.get("spoiler_risk") or flags.get("late_payoff_episode"):
            failures_to_record.append({
                "run_id": run_id,
                "candidate_id": pid,
                "episode": ep,
                "category": "spoiler",
                "description": f"Late payoff reveal or climax spoiler detected in Episode {ep}",
                "source": "automatic_validation",
            })

        # b) Missing context risk
        if flags.get("needs_context"):
            failures_to_record.append({
                "run_id": run_id,
                "candidate_id": pid,
                "episode": ep,
                "category": "missing_context",
                "description": "Requires external backstory; viewer cannot follow standalone",
                "source": "automatic_validation",
            })

        # c) Judge divergence
        judge_div = p.get("judge_divergence") or {}
        if judge_div.get("is_divergent"):
            diffs = judge_div.get("differing_criteria") or []
            diff_str = ", ".join(diffs) if diffs else "composite ratings"
            failures_to_record.append({
                "run_id": run_id,
                "candidate_id": pid,
                "episode": ep,
                "category": "judge_disagreement",
                "description": f"Dual AI judges diverged significantly on: {diff_str}",
                "source": "automatic_validation",
            })

        # d) Weak hook
        att = p.get("attention") or {}
        if att.get("drop_risk", 0.0) > 0.6 or (scores_dict.get("hook_3s", 5) <= 2):
            failures_to_record.append({
                "run_id": run_id,
                "candidate_id": pid,
                "episode": ep,
                "category": "weak_hook",
                "description": "Opening 0–3s hook dialogue has low scroll-stopping power or high drop risk",
                "source": "automatic_validation",
            })

        # e) Weak cliffhanger
        if scores_dict.get("cliffhanger", 5) <= 2:
            failures_to_record.append({
                "run_id": run_id,
                "candidate_id": pid,
                "episode": ep,
                "category": "weak_cliffhanger",
                "description": "Ending cut fails to preserve an unresolved question or climax tension",
                "source": "automatic_validation",
            })

        # f) Low dramatic intensity
        if scores_dict.get("intensity", 5) <= 2:
            failures_to_record.append({
                "run_id": run_id,
                "candidate_id": pid,
                "episode": ep,
                "category": "low_drama",
                "description": "Dialogue intensity is low; conversation lacks dramatic stakes",
                "source": "automatic_validation",
            })

        # g) Duplicate variants detected and suppressed
        dup_count = p.get("duplicate_variants_count", 0)
        if dup_count > 0:
            failures_to_record.append({
                "run_id": run_id,
                "candidate_id": pid,
                "episode": ep,
                "category": "duplicate_overlap",
                "description": f"Detected and deduplicated {dup_count} overlapping boundary variants",
                "source": "automatic_validation",
            })

    # 3. Check for explicitly rejected candidates in run_payload or candidates_all
    rejected_list = run_payload.get("candidates_rejected") or run_payload.get("rejected") or []
    if isinstance(rejected_list, list):
        for idx, rej in enumerate(rejected_list):
            if isinstance(rej, dict):
                r_pid = rej.get("pid") or f"REJ-{idx + 1}"
                r_ep = rej.get("episode")
                reason = rej.get("reason", "Failed validation").lower()

                cat = "other"
                if "duration" in reason or "length" in reason or "cut" in reason or "spoken line" in reason:
                    cat = "invalid_boundary"
                elif "hook" in reason:
                    cat = "weak_hook"
                elif "cliff" in reason:
                    cat = "weak_cliffhanger"
                elif "spoiler" in reason:
                    cat = "spoiler"
                elif "context" in reason:
                    cat = "missing_context"
                elif "duplicate" in reason or "overlap" in reason:
                    cat = "duplicate_overlap"

                failures_to_record.append({
                    "run_id": run_id,
                    "candidate_id": r_pid,
                    "episode": r_ep,
                    "category": cat,
                    "description": rej.get("reason", "Candidate rejected during validation"),
                    "source": "automatic_validation",
                })

    inserted = store.record_failures_batch(failures_to_record)
    return inserted, metadata
