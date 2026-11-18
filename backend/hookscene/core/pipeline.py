"""Runs the whole pipeline. Start here when reading the code.

    1 parse              parse.py (done by the caller: load_show / run_folder)
    2 show summary       stages.make_summary, stages.spoiler_episodes
    3 candidates         stages.generate_candidates, plus keyword picks from heuristics.py
    4 validate           validate.py (called inside step 3)
    5 score, rank, select  stages.score_promos, listwise_rank, final_order, select_diverse; attention.py
    6 montages           stages.build_montages
    7 export             export.py (done by the caller)

With use_llm=False only the keyword rules run: that is the no-key baseline."""
from __future__ import annotations

import time
from pathlib import Path

from . import stages as S
from .attention import attention
from .heuristics import propose
from .parse import Episode, load_show
from .schemas import Promo, Rejected
from .validate import validate_many


def _drop_overlapping(extra: list[Promo], base: list[Promo]) -> list[Promo]:
    out = []
    for p in extra:
        if not any(S._overlap(p, b) for b in base):
            out.append(p)
    return out


class PipelineTimer:
    """High-precision execution timer for measuring pipeline stages."""

    def __init__(self):
        self.t_start = time.perf_counter()
        self.records: list[dict] = []
        self._current_stage: str | None = None
        self._stage_t0: float = 0.0

    def start_stage(self, name: str):
        self._current_stage = name
        self._stage_t0 = time.perf_counter()

    def end_stage(self, name: str, status: str = "completed", error_msg: str | None = None, **details):
        t1 = time.perf_counter()
        dur = round(t1 - self._stage_t0, 3)
        rec = {
            "stage_name": name,
            "duration_s": dur,
            "status": status,
            "error_msg": error_msg,
            "details": details,
        }
        self.records.append(rec)
        self._current_stage = None
        return rec

    def summary(self) -> dict:
        total_dur = round(time.perf_counter() - self.t_start, 3)
        durations = {r["stage_name"]: r["duration_s"] for r in self.records}
        slowest = max(self.records, key=lambda r: r["duration_s"])["stage_name"] if self.records else None
        fastest = min(self.records, key=lambda r: r["duration_s"])["stage_name"] if self.records else None
        avg_dur = round(sum(r["duration_s"] for r in self.records) / max(1, len(self.records)), 3)
        return {
            "total_duration_s": total_dur,
            "slowest_stage": slowest,
            "fastest_stage": fastest,
            "avg_stage_duration_s": avg_dur,
            "stage_durations": durations,
            "stage_records": self.records,
        }


async def arun(eps: list[Episode], cfg: dict, llm=None, use_llm: bool = True, do_montage: bool = True,
        progress=lambda *_: None, show: str = "") -> dict:
    timer = PipelineTimer()
    rules = dict(cfg["rules"])
    weights = cfg["weights"]
    em = {e.num: e for e in eps}
    n_eps = max((e.num for e in eps), default=1)
    rejected: list[Rejected] = []
    mrejected: list[Rejected] = []
    summary = None
    rank_ok = None
    spoiler_eps: set[int] = set()
    spoiler_info: dict = {}
    promos: list[Promo] = []

    # deterministic validation stage (heuristic candidate validation)
    timer.start_stage("validate")
    hper = rules.get("heuristic_per_episode", 1) if use_llm else 3
    hcands = [c for e in eps for c in propose(e, rules, per_episode=hper)]
    hpromos, hbad = validate_many(hcands, em, rules, "heuristic", start_no=1)
    rejected += hbad
    timer.end_stage("validate", status="completed", candidates_proposed=len(hcands), candidates_rejected=len(hbad))

    if use_llm:
        if llm is None:
            raise ValueError("use_llm=True needs an LLM client")
        # Stage 1: Narrative analysis / summary
        timer.start_stage("summary")
        try:
            progress("summary", 0, 1)
            summary = await S.make_summary(llm, eps, show)
            spoiler_eps, spoiler_info = await S.spoiler_episodes(llm, eps, show, summary, rules)
            progress("summary", 1, 1)
            timer.end_stage("summary", status="completed", spoiler_episodes=list(spoiler_eps))
        except Exception as e:
            timer.end_stage("summary", status="failed", error_msg=str(e))
            raise

        # Stage 2: Candidate extraction
        timer.start_stage("candidates")
        try:
            lp, lbad = await S.generate_candidates(llm, eps, summary, rules, progress)
            rejected += lbad
            lp += _drop_overlapping(hpromos, lp)
            for n, p in enumerate(lp, 1):
                p.pid = f"P{n:03d}"
            promos = lp
            for p in promos:
                p.attention = attention(em, p.segments)
            timer.end_stage("candidates", status="completed", candidates_extracted=len(promos), rejected=len(lbad))
        except Exception as e:
            timer.end_stage("candidates", status="failed", error_msg=str(e))
            raise

        # Stage 3: Dual-judge evaluation
        timer.start_stage("score")
        try:
            await S.score_promos(llm, promos, summary, rules, weights, progress)
            S.apply_spoiler_policy(promos, spoiler_eps, rules)  # before ranking, so the ranker sees the same flags
            promos.sort(key=lambda p: (-p.composite, p.pid))
            timer.end_stage("score", status="completed", scored_candidates=len(promos))
        except Exception as e:
            timer.end_stage("score", status="failed", error_msg=str(e))
            raise

        # Stage 4: Candidate ranking
        timer.start_stage("rank")
        try:
            ranks, rank_ok = await S.listwise_rank(llm, promos, rules, progress)
            ordered = S.final_order(promos, ranks, rules, spoiler_eps, n_eps)
            timer.end_stage("rank", status="completed", rank_ok=rank_ok)
        except Exception as e:
            timer.end_stage("rank", status="failed", error_msg=str(e))
            raise
    else:
        timer.start_stage("score")
        promos = hpromos
        for p in promos:
            p.attention = attention(em, p.segments)
        mx = max((p.heur_score for p in promos), default=1.0) or 1.0
        for p in promos:
            p.composite = round(p.heur_score / mx, 4)
            p.score_note = "rule-based baseline (no LLM)"
        promos.sort(key=lambda p: (-p.composite, p.pid))
        timer.end_stage("score", status="completed", scored_candidates=len(promos), note="rule-based")

        timer.start_stage("rank")
        ordered = S.final_order(promos, {}, {**rules, "final_llm_weight": 0.0}, set(), n_eps)
        timer.end_stage("rank", status="completed", note="heuristic order")

    # quality bar (passes_bar): judge hook score >= min_hook_score and no needs_context flag.
    eligible = [p for p in ordered if S.passes_bar(p, rules, use_llm)]
    top = S.select_diverse(eligible, rules, rules["final_n"])
    for i, p in enumerate(top, 1):
        p.rank = i

    montages: list[Promo] = []
    if use_llm and do_montage and top:
        timer.start_stage("montage")
        try:
            progress("montage", 0, 1)
            montages, mrejected = await S.build_montages(llm, eligible, eps, summary, rules, start_no=1,
                                                   spoiler_eps=spoiler_eps)
            for m in montages:
                m.attention = attention(em, m.segments)
            if montages:
                await S.score_promos(llm, montages, summary, {**rules, "score_batch": 25}, weights)
                S.apply_spoiler_policy(montages, spoiler_eps, rules)
                montages = S.final_order(montages, {}, rules, spoiler_eps, n_eps)
                for m in montages:
                    if not S.passes_bar(m, rules, True) or m.composite < rules.get("montage_min_composite", 0.0):
                        mrejected.append(Rejected(source="montage", reason=f"{m.pid} below the quality bar "
                                                  f"(hook {m.scores.get('hook_3s')}, composite {m.composite:.2f}, "
                                                  f"flags {[k for k, v in m.flags.items() if v]})",
                                                  start_line=m.segments[0].first_line, end_line=m.segments[-1].last_line))
                montages = [m for m in montages if S.passes_bar(m, rules, True)
                            and m.composite >= rules.get("montage_min_composite", 0.0)][: rules.get("montage_keep", 5)]
                for i, m in enumerate(montages, 1):
                    m.rank = i
            progress("montage", 1, 1)
            timer.end_stage("montage", status="completed", montages_created=len(montages), rejected=len(mrejected))
        except (ValueError, RuntimeError) as e:  # a montage failure keeps the single-clip results
            mrejected.append(Rejected(source="montage", reason=f"montage stage failed: {e}"))
            timer.end_stage("montage", status="failed", error_msg=str(e))
    else:
        timer.start_stage("montage")
        timer.end_stage("montage", status="skipped", reason="disabled or rule-based baseline")

    perf = timer.summary()
    return {
        "promos": top,
        "montages": montages,
        "all_candidates": promos,
        "rejected": rejected + mrejected,
        "show_summary": summary,
        "performance": perf,
        "run_log": {
            "mode": "llm" if use_llm else "rule-based baseline (no LLM)",
            "episodes": len(eps),
            "lines": sum(len(e.lines) for e in eps),
            "candidates_valid": len(promos),
            "candidates_rejected": len(rejected),
            "candidates_rejected_then_repaired": sum(1 for r in rejected if r.repaired),
            "montages_rejected": len(mrejected),
            "final_promos": len(top),
            "candidates_passing_quality_bar": len(eligible),
            "montages": len(montages),
            "rank_runs_ok": rank_ok,
            "late_payoff_episodes": sorted(spoiler_eps),
            "late_payoff_vote": spoiler_info,
            "seconds": perf["total_duration_s"],
            "performance": perf,
            "llm": llm.summary() if llm else None,
            "stage_models": cfg["stages"] if use_llm else None,
        },
    }



def run(*a, **kw) -> dict:
    """Synchronous wrapper for the CLI and tests. The website awaits arun() directly."""
    from ..providers import run_sync
    return run_sync(arun(*a, **kw))


def run_folder(folder: str | Path, cfg: dict, **kw) -> dict:
    return run(load_show(folder), cfg, **kw)
