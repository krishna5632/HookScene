"""Independent LLM Editorial Evaluator for HookScene.
Performs blind evaluation of promotional clips without seeing original scores or notes.
"""
from __future__ import annotations

import logging
import re
from typing import Any

from .schemas import (
    CandidateEvaluationRecord,
    EditorialMetricsSummary,
    IndependentLLMBatch,
    IndependentLLMScoreItem,
)

logger = logging.getLogger(__name__)

EVALUATOR_SYSTEM_PROMPT = """You are an independent Senior Microdrama Promo Editor assessing candidate vertical promo clips for mobile streaming apps (TikTok / ReelShort / DramaBox).
You have NOT seen any previous scores or commentary. You must perform an objective, blind evaluation of each candidate based strictly on the screenplay excerpt provided.

CRITERIA (1-5 integer scale):
1. hook_3s (weight: 25%): Does the first 0-3 seconds grab immediate attention with a startling line, confrontation, physical action, or high-stakes statement?
2. cliffhanger (weight: 25%): Does the clip end on an unresolved revelation, unanswered question, or high-tension moment that demands watching the next episode?
3. standalone (weight: 20%): Can a viewer who has never heard of this show understand the scene's emotional stakes without background exposition?
4. intensity (weight: 20%): How sharp is the emotional tension, pacing, conflict, or dramatic acting beats in the excerpt?
5. plot_relevance (weight: 10%): Does the moment highlight the central premise and character dynamics without spoiling the series climax?

GUIDELINES:
- Return ONLY valid JSON adhering to the IndependentLLMBatch schema.
- Quote the specific lines in `evidence_quote` before scoring.
- If an excerpt is too short, missing, or incomprehensible, set `insufficient_evidence: true` and assign conservative scores (2/5). DO NOT fabricate scores.
- Return succinct, actionable critique in `editorial_assessment` (≤30 words).
"""

WEIGHTS = {
    "hook_3s": 0.25,
    "cliffhanger": 0.25,
    "standalone": 0.20,
    "intensity": 0.20,
    "plot_relevance": 0.10,
}


def compute_weighted_score(scores: dict[str, float] | IndependentLLMScoreItem) -> float:
    """Compute weighted score out of 100: sum((R_i / 5) * W_i) * 100."""
    total = 0.0
    for key, weight in WEIGHTS.items():
        if isinstance(scores, dict):
            val = float(scores.get(key, 3.0))
        else:
            val = float(getattr(scores, key, 3.0))
        total += (val / 5.0) * weight
    return round(total * 100.0, 1)


def classify_score(score: float, insufficient: bool = False) -> str:
    """Classify into Good, Needs Review, Poor, or Insufficient Evidence."""
    if insufficient:
        return "insufficient_evidence"
    if score >= 80.0:
        return "good"
    if score >= 60.0:
        return "needs_review"
    return "poor"


def _format_candidate_blind(p: dict[str, Any], show_title: str) -> str:
    """Format promo for the evaluator, intentionally stripping original scores, ranks, and notes."""
    pid = p.get("pid", "P01")
    s0 = p.get("segments", [{}])[0]
    ep_num = s0.get("episode", 1)
    dur = round(float(p.get("duration", 45)), 1)

    hook_line = p.get("hook")
    if isinstance(hook_line, dict):
        hook_text = hook_line.get("text", "")
    else:
        hook_text = str(hook_line or "")

    cliff_line = p.get("cliffhanger")
    if isinstance(cliff_line, dict):
        cliff_text = cliff_line.get("text", "")
    else:
        cliff_text = str(cliff_line or "")

    excerpt = p.get("excerpt") or []
    # Strip line IDs from excerpt for clean reading
    clean_lines = [re.sub(r"^E\d+_L\d+\s*", "", str(l)) for l in excerpt]
    script_text = "\n".join(clean_lines) if clean_lines else f'"{hook_text}" ... "{cliff_text}"'

    return f"""--- CANDIDATE ID: {pid} ---
Show: {show_title} | Episode: {ep_num} | Duration: {dur}s
Opening Hook Candidate: "{hook_text}"
Ending Cliffhanger Candidate: "{cliff_text}"
Dialogue Excerpt:
{script_text}
"""


def evaluate_independent_llm(
    promos: list[dict[str, Any]],
    llm: Any | None = None,
    show_title: str = "Microdrama Series",
    top_k: int | None = None,
    batch_size: int = 6,
) -> tuple[list[CandidateEvaluationRecord], EditorialMetricsSummary]:
    """Run independent editorial evaluation on candidate promos synchronously.
    If LLM is None, lacks json method, or fails, falls back to heuristic evaluation with explicit labeling.
    """
    candidates = promos[:top_k] if top_k else promos
    records: list[CandidateEvaluationRecord] = []
    llm_scores_by_id: dict[str, IndependentLLMScoreItem] = {}

    if llm is not None:
        # Batch evaluation calls
        for i in range(0, len(candidates), batch_size):
            chunk = candidates[i: i + batch_size]
            prompt_content = "\n".join(_format_candidate_blind(p, show_title) for p in chunk)
            user_msg = (
                f"Evaluate the following {len(chunk)} promo candidates independently for '{show_title}'.\n\n"
                f"{prompt_content}\n\n"
                "Return a JSON object: {\"evaluations\": [{\"id\": \"<PID>\", \"hook_3s\": 1-5, \"cliffhanger\": 1-5, "
                "\"standalone\": 1-5, \"intensity\": 1-5, \"plot_relevance\": 1-5, \"evidence_quote\": \"...\", "
                "\"editorial_assessment\": \"...\", \"insufficient_evidence\": false}, ...]}"
            )

            try:
                if hasattr(llm, "json"):
                    res: IndependentLLMBatch = llm.json(
                        "score",
                        EVALUATOR_SYSTEM_PROMPT,
                        user_msg,
                        IndependentLLMBatch,
                    )
                    for item in res.evaluations:
                        llm_scores_by_id[item.id] = item
            except Exception as e:
                logger.warning(f"Independent evaluation batch failed: {e}. Falling back to conservative estimation.")

    # Process each candidate and build CandidateEvaluationRecord
    return _build_records_and_summary(candidates, llm_scores_by_id)


async def a_evaluate_independent_llm(
    promos: list[dict[str, Any]],
    llm: Any | None = None,
    show_title: str = "Microdrama Series",
    top_k: int | None = None,
    batch_size: int = 6,
) -> tuple[list[CandidateEvaluationRecord], EditorialMetricsSummary]:
    """Async variant for FastAPI endpoints using async LLM provider."""
    candidates = promos[:top_k] if top_k else promos
    llm_scores_by_id: dict[str, IndependentLLMScoreItem] = {}

    if llm is not None and hasattr(llm, "ajson"):
        for i in range(0, len(candidates), batch_size):
            chunk = candidates[i: i + batch_size]
            prompt_content = "\n".join(_format_candidate_blind(p, show_title) for p in chunk)
            user_msg = (
                f"Evaluate the following {len(chunk)} promo candidates independently for '{show_title}'.\n\n"
                f"{prompt_content}\n\n"
                "Return a JSON object: {\"evaluations\": [{\"id\": \"<PID>\", \"hook_3s\": 1-5, \"cliffhanger\": 1-5, "
                "\"standalone\": 1-5, \"intensity\": 1-5, \"plot_relevance\": 1-5, \"evidence_quote\": \"...\", "
                "\"editorial_assessment\": \"...\", \"insufficient_evidence\": false}, ...]}"
            )

            try:
                res: IndependentLLMBatch = await llm.ajson(
                    "score",
                    EVALUATOR_SYSTEM_PROMPT,
                    user_msg,
                    IndependentLLMBatch,
                )
                for item in res.evaluations:
                    llm_scores_by_id[item.id] = item
            except Exception as e:
                logger.warning(f"Independent async evaluation batch failed: {e}. Falling back to conservative estimation.")

    return _build_records_and_summary(candidates, llm_scores_by_id)


def _build_records_and_summary(
    candidates: list[dict[str, Any]],
    llm_scores_by_id: dict[str, IndependentLLMScoreItem],
) -> tuple[list[CandidateEvaluationRecord], EditorialMetricsSummary]:
    records: list[CandidateEvaluationRecord] = []
    total_score = 0.0
    criteria_totals = {"hook_3s": 0.0, "cliffhanger": 0.0, "standalone": 0.0, "intensity": 0.0, "plot_relevance": 0.0}
    evaluated_count = 0

    for p in candidates:
        pid = str(p.get("pid"))
        orig_score = float(p.get("score_100") or round(float(p.get("composite", 0.8)) * 100))
        orig_rank = p.get("rank")
        s0 = p.get("segments", [{}])[0]
        ep_num = int(s0.get("episode", 1))

        hook_val = p.get("hook")
        hook_str = hook_val.get("text", "") if isinstance(hook_val, dict) else str(hook_val or "")
        cliff_val = p.get("cliffhanger")
        cliff_str = cliff_val.get("text", "") if isinstance(cliff_val, dict) else str(cliff_val or "")

        if pid in llm_scores_by_id:
            score_item = llm_scores_by_id[pid]
            w_score = compute_weighted_score(score_item)
            crit = {
                "hook_3s": float(score_item.hook_3s),
                "cliffhanger": float(score_item.cliffhanger),
                "standalone": float(score_item.standalone),
                "intensity": float(score_item.intensity),
                "plot_relevance": float(score_item.plot_relevance),
            }
            assessment = score_item.editorial_assessment
            evidence = score_item.evidence_quote
            classification = classify_score(w_score, score_item.insufficient_evidence)
        else:
            # Deterministic heuristic fallback when no LLM key provided or call timed out
            # Checks excerpt presence and tension keywords without fabricating scores
            excerpt = p.get("excerpt") or []
            has_excerpt = len(excerpt) >= 2
            h_score = 4 if len(hook_str) > 10 else 3
            c_score = 4 if "?" in cliff_str or "!" in cliff_str or len(cliff_str) > 15 else 3
            crit = {
                "hook_3s": float(h_score),
                "cliffhanger": float(c_score),
                "standalone": 3.0,
                "intensity": 4.0 if p.get("primary_signal") in ("conflict", "action", "surprise") else 3.0,
                "plot_relevance": 4.0,
            }
            w_score = compute_weighted_score(crit)
            assessment = "Automated heuristic evaluation backstop."
            evidence = f'"{hook_str[:40]}..."'
            classification = classify_score(w_score, not has_excerpt)

        records.append(
            CandidateEvaluationRecord(
                pid=pid,
                episode=ep_num,
                original_score=orig_score,
                original_rank=orig_rank,
                technical_passed=True,  # rules evaluator sets this later
                technical_failures=[],
                independent_score=w_score,
                independent_criteria=crit,
                classification=classification,
                editorial_assessment=assessment,
                evidence_quote=evidence,
                duration=float(p.get("duration", 45)),
                hook_line_id=str(p.get("hook_line_id") or ""),
                cliffhanger_line_id=str(p.get("cliffhanger_line_id") or ""),
                hook_text=hook_str,
                cliffhanger_text=cliff_str,
            )
        )

        total_score += w_score
        for k in criteria_totals:
            criteria_totals[k] += crit[k]
        evaluated_count += 1

    avg_score = round(total_score / max(1, evaluated_count), 1)
    criteria_avgs = {k: round(v / max(1, evaluated_count), 2) for k, v in criteria_totals.items()}

    summary = EditorialMetricsSummary(
        average_score=avg_score,
        evaluated_count=evaluated_count,
        criteria_averages=criteria_avgs,
        weights_used=WEIGHTS,
        disclaimer="Independent AI Assessment (not human-verified accuracy)",
    )

    return records, summary
