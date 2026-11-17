"""Pydantic schemas for HookScene Quality Evaluation."""
from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class RuleFailure(BaseModel):
    pid: str
    rule: str
    message: str
    episode: int | None = None


class RuleEvaluationResult(BaseModel):
    total_candidates: int = 0
    passed_candidates: int = 0
    failed_candidates: int = 0
    pass_rate: float = 0.0  # percentage 0.0 - 100.0
    rule_failures: dict[str, int] = Field(default_factory=dict)
    failures_list: list[RuleFailure] = Field(default_factory=list)


class IndependentLLMScoreItem(BaseModel):
    """Raw structured output returned by the independent LLM judge."""
    id: str
    hook_3s: int = Field(ge=1, le=5, description="1-5 rating of instant 0-3s hook power")
    cliffhanger: int = Field(ge=1, le=5, description="1-5 rating of unresolved cliffhanger tension")
    standalone: int = Field(ge=1, le=5, description="1-5 rating of standalone narrative clarity without prior context")
    intensity: int = Field(ge=1, le=5, description="1-5 rating of dramatic and emotional intensity")
    plot_relevance: int = Field(ge=1, le=5, description="1-5 rating of relevance to show premise without spoilers")
    evidence_quote: str = Field(default="", description="Key lines quoted from the candidate as evidence")
    editorial_assessment: str = Field(default="", description="Succinct critique of why this promo succeeds or fails")
    insufficient_evidence: bool = Field(default=False, description="True if clip context is too incomplete to judge fairly")


class IndependentLLMBatch(BaseModel):
    evaluations: list[IndependentLLMScoreItem] = Field(default_factory=list)


class CandidateEvaluationRecord(BaseModel):
    pid: str
    episode: int
    original_score: float = 0.0
    original_rank: int | None = None
    technical_passed: bool = True
    technical_failures: list[str] = Field(default_factory=list)
    independent_score: float | None = None  # weighted score 0-100
    independent_criteria: dict[str, float] = Field(default_factory=dict)
    classification: Literal["good", "needs_review", "poor", "insufficient_evidence"] = "good"
    editorial_assessment: str = ""
    evidence_quote: str = ""
    duration: float = 0.0
    hook_line_id: str = ""
    cliffhanger_line_id: str = ""
    hook_text: str = ""
    cliffhanger_text: str = ""


class EditorialMetricsSummary(BaseModel):
    average_score: float = 0.0
    evaluated_count: int = 0
    criteria_averages: dict[str, float] = Field(default_factory=dict)
    weights_used: dict[str, float] = Field(
        default_factory=lambda: {
            "hook_3s": 0.25,
            "cliffhanger": 0.25,
            "standalone": 0.20,
            "intensity": 0.20,
            "plot_relevance": 0.10,
        }
    )
    disclaimer: str = "Independent AI Assessment (not human-verified accuracy)"


class CandidateMatch(BaseModel):
    pid_a: str
    pid_b: str
    episode: int
    iou: float
    span_a: str
    span_b: str
    rank_a: int | None = None
    rank_b: int | None = None
    score_a: float = 0.0
    score_b: float = 0.0
    rank_delta: int = 0
    score_delta: float = 0.0


class RankingChange(BaseModel):
    pid: str
    episode: int
    rank_run_a: int | None
    rank_run_b: int | None
    rank_delta: int
    direction: Literal["improved", "dropped", "unchanged", "exclusive"]


class RunConsistencyResult(BaseModel):
    run_a_id: str
    run_b_id: str
    run_a_count: int
    run_b_count: int
    common_candidates_count: int
    unique_candidates_count: int
    consistency_score: float  # (common / unique) * 100
    common_matches: list[CandidateMatch] = Field(default_factory=list)
    ranking_changes: list[RankingChange] = Field(default_factory=list)
    consistency_label: str = "High"  # High (>=70%), Moderate (40-69%), Low (<40%)
    disclaimer: str = "Consistency reflects algorithmic repeatability across runs, not necessarily correctness."


class EvaluationRunSummary(BaseModel):
    evaluation_id: str
    run_id: str
    show_title: str
    created_at: str
    is_independent_assessment: bool = True
    technical_metrics: RuleEvaluationResult
    editorial_metrics: EditorialMetricsSummary
    distribution: dict[str, int] = Field(
        default_factory=lambda: {
            "good": 0,
            "needs_review": 0,
            "poor": 0,
            "insufficient_evidence": 0,
        }
    )
    candidate_evaluations: list[CandidateEvaluationRecord] = Field(default_factory=list)


# --- FEATURE 2: FAILURE ANALYSIS SCHEMAS ---

FAILURE_CATEGORIES = {
    "weak_hook": "Weak hook",
    "weak_cliffhanger": "Weak cliffhanger",
    "missing_context": "Missing context",
    "spoiler": "Spoiler",
    "duplicate_overlap": "Duplicate/overlap",
    "invalid_boundary": "Invalid timestamp or screenplay boundary",
    "low_drama": "Low dramatic value",
    "judge_disagreement": "Judge disagreement",
    "insufficient_context": "Insufficient context",
    "other": "Other",
}


class FailureRecord(BaseModel):
    id: int | None = None
    run_id: str
    candidate_id: str
    episode: int | None = None
    category: str
    category_label: str = ""
    description: str
    source: Literal["automatic_validation", "ai_evaluation", "human_review"]
    reviewer_comment: str | None = None
    created_at: str | None = None


class HumanDecisionPayload(BaseModel):
    run_id: str
    candidate_id: str
    episode: int | None = None
    decision: Literal["approved", "rejected", "unreviewed"]
    category: str | None = None
    comment: str | None = None


class FailureAnalysisSummary(BaseModel):
    total_evaluated: int = 0
    total_rejected: int = 0
    automatic_validation_count: int = 0
    human_review_count: int = 0
    ai_evaluation_count: int = 0
    category_distribution: dict[str, int] = Field(default_factory=dict)
    most_common_reasons: list[dict[str, Any]] = Field(default_factory=list)
    breakdown_by_run: dict[str, dict[str, int]] = Field(default_factory=dict)
    failures: list[FailureRecord] = Field(default_factory=list)


# --- FEATURE 3: REPRODUCIBILITY & RUN CONSISTENCY SCHEMAS ---

class RunMetadata(BaseModel):
    run_id: str
    show_title: str = ""
    screenplay_hash: str = ""
    model_provider: str = ""
    model_version: str = ""
    prompt_version: str = ""
    pipeline_version: str = "2.0.0"
    temperature: float | None = None
    generation_settings: dict[str, Any] = Field(default_factory=dict)
    candidate_ids: list[str] = Field(default_factory=list)
    candidate_time_ranges: dict[str, list[float]] = Field(default_factory=dict)
    candidate_scores: dict[str, float] = Field(default_factory=dict)
    candidate_rankings: dict[str, int] = Field(default_factory=dict)
    total_candidates: int = 0
    status: str = "completed"
    created_at: str | None = None


class CandidateMatchDetail(BaseModel):
    pid_a: str
    pid_b: str
    episode: int
    iou: float
    span_a: str
    span_b: str
    start_a: float = 0.0
    end_a: float = 0.0
    start_b: float = 0.0
    end_b: float = 0.0
    delta_start: float = 0.0
    delta_end: float = 0.0
    rank_a: int | None = None
    rank_b: int | None = None
    score_a: float = 0.0
    score_b: float = 0.0
    rank_delta: int = 0
    score_delta: float = 0.0


class DetailedRunComparison(BaseModel):
    run_a_id: str
    run_b_id: str
    run_a_metadata: RunMetadata | None = None
    run_b_metadata: RunMetadata | None = None
    config_differs: bool = False
    config_diff_reasons: list[str] = Field(default_factory=list)
    run_a_count: int = 0
    run_b_count: int = 0
    common_count: int = 0
    unique_count: int = 0
    jaccard_consistency: float = 0.0  # (common / unique) * 100
    avg_score_diff: float = 0.0
    spearman_rank_correlation: float | None = None
    spearman_note: str = ""
    common_candidates: list[CandidateMatchDetail] = Field(default_factory=list)
    new_candidates: list[dict[str, Any]] = Field(default_factory=list)
    missing_candidates: list[dict[str, Any]] = Field(default_factory=list)
    disclaimer: str = "Consistency reflects algorithmic repeatability across runs, not correctness."


# --- FEATURE 5: PERFORMANCE, COST & RESOURCE MONITORING SCHEMAS ---

class StagePerformanceRecord(BaseModel):
    stage_name: str
    duration_s: float = 0.0
    status: Literal["completed", "failed", "skipped"] = "completed"
    started_at: str | None = None
    ended_at: str | None = None
    error_msg: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class LLMCallRecord(BaseModel):
    call_id: str
    stage: str
    provider: str
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    thinking_tokens: int | None = None
    total_tokens: int | None = None
    duration_s: float = 0.0
    status: Literal["success", "error", "timeout"] = "success"
    retry_count: int = 0
    is_fallback: bool = False
    fallback_model: str | None = None
    cached: bool = False
    estimated_cost_usd: float | None = None
    cost_available: bool = False
    error_msg: str | None = None
    timestamp: str | None = None


class PerformanceCostSummary(BaseModel):
    run_id: str
    total_duration_s: float = 0.0
    stage_durations: dict[str, float] = Field(default_factory=dict)
    stage_records: list[StagePerformanceRecord] = Field(default_factory=list)
    slowest_stage: str | None = None
    fastest_stage: str | None = None
    avg_stage_duration_s: float = 0.0
    total_llm_calls: int = 0
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_tokens: int = 0
    tokens_available: bool = True
    total_estimated_cost_usd: float | None = None
    cost_available: bool = True
    cost_disclaimer: str = "Estimated cost based on reported token usage and configured model pricing"
    total_retries: int = 0
    total_fallbacks: int = 0
    failed_calls_count: int = 0
    stage_llm_summary: dict[str, Any] = Field(default_factory=dict)
    calls: list[LLMCallRecord] = Field(default_factory=list)


# --- FEATURE 6: EXPLAINABILITY & DECISION TRACEABILITY SCHEMAS ---

class DramaticSignalTrace(BaseModel):
    signal: str
    label: str
    detected: bool = True
    intensity: int = 3  # 1-5
    trigger_reason: str = ""
    evidence_quote: str = ""
    line_id: str | None = None
    line_number: int | None = None


class RubricCriterionExplanation(BaseModel):
    key: str
    label: str
    weight_pct: int
    final_score: float  # 1.0 - 5.0
    weighted_points: float  # (final_score / 5.0) * weight_pct
    judge1_score: float | None = None
    judge2_score: float | None = None
    explanation: str = ""
    evidence: str = ""
    status: Literal["available", "unavailable"] = "available"


class ValidationRuleCheck(BaseModel):
    rule_id: str
    name: str
    status: Literal["passed", "failed", "not_evaluated"]
    actual_value: str = ""
    threshold: str = ""
    explanation: str = ""


class ScreenplayEvidenceItem(BaseModel):
    kind: Literal["hook", "cliffhanger", "signal", "context"]
    label: str
    line_id: str
    speaker: str | None = None
    text: str
    start_ts: str | None = None
    end_ts: str | None = None
    is_direct_quote: bool = True  # Distinguishes direct screenplay evidence from AI interpretation


class CandidateDecisionTrace(BaseModel):
    candidate_id: str
    run_id: str
    episode: int = 1
    start_time: float = 0.0
    end_time: float = 0.0
    duration: float = 0.0
    
    # 1. Selection Reason
    selection_reason: str = ""
    interest_summary: str = ""
    hook_why: str = ""
    cliffhanger_why: str = ""
    standalone_suitability: str = ""
    
    # 2. Dramatic Signals
    primary_signal: str = "conflict"
    signal_intensity: int = 3
    detected_signals: list[DramaticSignalTrace] = Field(default_factory=list)
    
    # 3. Rubric Score Breakdown
    composite_score_100: int = 0
    rubric_breakdown: list[RubricCriterionExplanation] = Field(default_factory=list)
    
    # 4. Screenplay Evidence
    evidence_items: list[ScreenplayEvidenceItem] = Field(default_factory=list)
    
    # 5. Validation Results
    validation_checks: list[ValidationRuleCheck] = Field(default_factory=list)
    overall_validation_passed: bool = True
    
    # 6. Judge Agreement / Divergence
    dual_judge_evaluated: bool = True
    judge_divergence_detected: bool = False
    judge1_overall: float | None = None
    judge2_overall: float | None = None
    judge_divergence_delta: float | None = None
    judge_notes: str = ""
    
    # Metadata
    model_version: str = "gemini-flash-lite-latest"
    prompt_version: str = "2.0.0"
    created_at: str | None = None



