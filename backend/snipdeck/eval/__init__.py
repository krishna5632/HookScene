"""Quality Evaluation module for HookScene.
Measures technical correctness, blind independent editorial quality, and run consistency.
"""
from .schemas import (
    RuleEvaluationResult,
    CandidateEvaluationRecord,
    EditorialMetricsSummary,
    EvaluationRunSummary,
    RunConsistencyResult,
    FailureRecord,
    FailureAnalysisSummary,
    HumanDecisionPayload,
    RunMetadata,
    CandidateMatchDetail,
    DetailedRunComparison,
    FAILURE_CATEGORIES,
)
from .failure_tracker import track_run_failures_and_metadata, compute_screenplay_hash
from .consistency import compare_runs, compare_runs_detailed, calculate_spearman_rho
from .store import EvalStore

__all__ = [
    "RuleEvaluationResult",
    "CandidateEvaluationRecord",
    "EditorialMetricsSummary",
    "EvaluationRunSummary",
    "RunConsistencyResult",
    "FailureRecord",
    "FailureAnalysisSummary",
    "HumanDecisionPayload",
    "RunMetadata",
    "CandidateMatchDetail",
    "DetailedRunComparison",
    "FAILURE_CATEGORIES",
    "track_run_failures_and_metadata",
    "compute_screenplay_hash",
    "compare_runs",
    "compare_runs_detailed",
    "calculate_spearman_rho",
    "EvalStore",
]
