"""Orchestrator for Quality Evaluation in HookScene.
Coordinates Deterministic Rule Evaluation, Independent Blind Editorial Evaluation, and Persistence.
"""
from __future__ import annotations

import asyncio
import datetime
import inspect
import uuid
from typing import Any

from .consistency import compare_runs, compare_runs_detailed
from .failure_tracker import track_run_failures_and_metadata
from .independent_judge import evaluate_independent_llm
from .rules import evaluate_rules
from .schemas import DetailedRunComparison, EvaluationRunSummary, RunConsistencyResult
from .store import EvalStore


async def run_quality_evaluation(
    run_payload: dict[str, Any],
    run_id: str = "official_run",
    llm: Any | None = None,
    episodes: dict[int, Any] | None = None,
    rules: dict[str, Any] | None = None,
    top_k: int | None = None,
    store: EvalStore | None = None,
) -> EvaluationRunSummary:
    """Execute complete quality evaluation for a given run payload."""
    eval_store = store or EvalStore()
    show_title = run_payload.get("show") or "I Married a Broken Soldier. He was a Duke"
    promos: list[dict[str, Any]] = run_payload.get("promos") or []
    all_candidates: list[dict[str, Any]] = run_payload.get("candidates") or promos

    # Save run payload in store for comparison retrieval
    eval_store.save_run(run_id, show_title, run_payload)

    # 1. Deterministic Rule Evaluation on promos (and candidate pool if applicable)
    tech_eval = evaluate_rules(promos, episodes=episodes, rules=rules)

    # Map failures by PID for candidate-level breakdown
    fails_by_pid: dict[str, list[str]] = {}
    for f in tech_eval.failures_list:
        fails_by_pid.setdefault(f.pid, []).append(f.message)

    # 2. Independent Blind Editorial Evaluation
    eval_res = evaluate_independent_llm(
        promos=promos,
        llm=llm,
        show_title=show_title,
        top_k=top_k,
    )
    if asyncio.iscoroutine(eval_res):
        cand_records, editorial_summary = await eval_res
    else:
        cand_records, editorial_summary = eval_res

    # 3. Merge technical pass/fail status and calculate distribution
    distribution = {
        "good": 0,
        "needs_review": 0,
        "poor": 0,
        "insufficient_evidence": 0,
    }

    for record in cand_records:
        if record.pid in fails_by_pid:
            record.technical_passed = False
            record.technical_failures = fails_by_pid[record.pid]
            # Flag that technical issues require review
            if record.classification == "good":
                record.classification = "needs_review"
        else:
            record.technical_passed = True
            record.technical_failures = []

        cls_key = record.classification
        distribution[cls_key] = distribution.get(cls_key, 0) + 1

    summary = EvaluationRunSummary(
        evaluation_id=f"eval_{datetime.date.today().strftime('%Y%m%d')}_{str(uuid.uuid4())[:8]}",
        run_id=run_id,
        show_title=show_title,
        created_at=datetime.datetime.now().isoformat(),
        is_independent_assessment=True,
        technical_metrics=tech_eval,
        editorial_metrics=editorial_summary,
        distribution=distribution,
        candidate_evaluations=cand_records,
    )

    # 4. Persist evaluation results
    eval_store.save_evaluation(summary)

    # 5. Extract and persist automatic failures & run metadata (Features 2 & 3)
    try:
        track_run_failures_and_metadata(run_id, run_payload, store=eval_store, episodes=episodes)
    except Exception as e:
        logger.warning(f"Failed to track run failures/metadata for {run_id}: {e}")

    return summary


def run_consistency_comparison(
    run_a_payload: dict[str, Any],
    run_b_payload: dict[str, Any],
    run_a_id: str = "run_a",
    run_b_id: str = "run_b",
    store: EvalStore | None = None,
) -> RunConsistencyResult:
    """Execute consistency comparison between two runs."""
    eval_store = store or EvalStore()
    result = compare_runs(run_a_payload, run_b_payload, run_a_id=run_a_id, run_b_id=run_b_id)
    eval_store.save_comparison(result)
    return result


def run_consistency_comparison_detailed(
    run_a_payload: dict[str, Any],
    run_b_payload: dict[str, Any],
    run_a_id: str = "run_a",
    run_b_id: str = "run_b",
    store: EvalStore | None = None,
) -> DetailedRunComparison:
    """Execute detailed consistency comparison between two runs."""
    eval_store = store or EvalStore()
    result = compare_runs_detailed(run_a_payload, run_b_payload, run_a_id=run_a_id, run_b_id=run_b_id, store=eval_store)
    return result

