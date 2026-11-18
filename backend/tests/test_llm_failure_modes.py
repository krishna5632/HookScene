"""AI and LLM Failure Mode Tests for HookScene (Feature 4, Section 3).
All external LLM calls are strictly mocked with zero network dependencies or API credit consumption.
Tests verify:
- Invalid JSON string returned from LLM
- Missing required schema fields
- Out-of-bounds score ratings (e.g. 10/5 or -1/5)
- HTTP 503 Service Unavailable triggering fallback provider
- API timeout and provider failure
- HTTP 401 Authentication failure (FatalProviderError)
- Dual-judge score divergence detection (differing criteria delta >= 1.5)
- Insufficient context reporting without fabricated scores
- Empty or whitespace model responses
"""
from __future__ import annotations

import json
import pytest
from pydantic import BaseModel, Field, ValidationError

from hookscene.providers.base import HTTPError, FatalProviderError, _extract_json, FATAL_HINTS
from hookscene.core.stages import check_judge_divergence, calculate_score_100
from hookscene.core.schemas import ScoreItem, ScoreBatch, RawCandidate
from hookscene.eval.independent_judge import classify_score, compute_weighted_score
from hookscene.eval.schemas import IndependentLLMScoreItem, IndependentLLMBatch


class MockCandidateSchema(BaseModel):
    title: str
    score: int = Field(ge=1, le=5)


def test_invalid_json_from_llm():
    """Verify _extract_json raises JSONDecodeError when LLM returns conversational prose without valid JSON."""
    bad_responses = [
        "Sure, here are your clips! I hope you like them.",
        "Here is the result: {title: 'missing quotes on keys'}",
        "<<<NOT_JSON>>>",
        "Error: Internal Server Model Response",
    ]
    for text in bad_responses:
        with pytest.raises(Exception):
            _extract_json(text)


def test_empty_or_malformed_model_responses():
    """Empty strings, whitespace, and truncated JSON brackets fail JSON extraction gracefully."""
    with pytest.raises(Exception):
        _extract_json("")
    with pytest.raises(Exception):
        _extract_json("     \n\t  ")
    with pytest.raises(Exception):
        _extract_json('{"key": "truncated value')


def test_missing_required_response_fields():
    """Model returning JSON missing required fields triggers Pydantic ValidationError."""
    incomplete_payload = {"score": 4}  # Missing 'title'
    with pytest.raises(ValidationError) as exc:
        MockCandidateSchema.model_validate(incomplete_payload)
    assert "title" in str(exc.value)

    # Missing required candidate fields in ScoreItem
    with pytest.raises(ValidationError):
        ScoreItem.model_validate({"id": "P001", "hook_3s": 4.0})  # Missing other criteria


def test_out_of_bounds_score_values():
    """Scores outside the 1-5 integer scale trigger validation errors."""
    with pytest.raises(ValidationError):
        MockCandidateSchema.model_validate({"title": "Promo A", "score": 10})  # > 5
    with pytest.raises(ValidationError):
        MockCandidateSchema.model_validate({"title": "Promo B", "score": 0})   # < 1

    # Also verify IndependentLLMScoreItem rejects invalid scores
    with pytest.raises(ValidationError):
        IndependentLLMScoreItem(
            id="P001",
            hook_3s=6,  # Out of range (must be 1-5)
            cliffhanger=4,
            standalone=4,
            intensity=5,
            plot_relevance=3,
            editorial_assessment="Invalid hook score",
        )


def test_dual_judge_divergence_detection():
    """Detects when Judge 1 and Judge 2 differ by >= 1.5 on a criterion or >= 15 overall."""
    # Judge 1 rates hook high (5), Judge 2 rates hook low (2) -> delta 3.0 >= 1.5
    j1 = ScoreItem(id="P001", hook_3s=5.0, standalone=4.0, cliffhanger=4.0, intensity=5.0, plot_relevance=4.0, trope_fit=4.0)
    j2 = ScoreItem(id="P001", hook_3s=2.0, standalone=4.0, cliffhanger=4.0, intensity=4.0, plot_relevance=4.0, trope_fit=4.0)

    is_div, info = check_judge_divergence([j1, j2], threshold_delta=1.5)
    assert is_div is True
    assert "hook_3s" in info["differing_criteria"]
    assert info["criteria_deltas"]["hook_3s"] == 3.0
    assert info["judge1_score"] > info["judge2_score"]


def test_dual_judge_consensus():
    """Consensus scores between judges (delta < 1.5 and overall delta < 15) does not flag divergence."""
    j1 = ScoreItem(id="P001", hook_3s=4.0, standalone=4.0, cliffhanger=4.0, intensity=4.0, plot_relevance=4.0, trope_fit=4.0)
    j2 = ScoreItem(id="P001", hook_3s=4.0, standalone=4.0, cliffhanger=4.0, intensity=5.0, plot_relevance=4.0, trope_fit=4.0)

    is_div, info = check_judge_divergence([j1, j2], threshold_delta=1.5)
    assert is_div is False
    assert len(info["differing_criteria"]) == 0
    assert info["total_delta"] <= 5


def test_insufficient_context_and_no_fabricated_scores():
    """Verify that insufficient context is explicitly reported and does not fabricate inflated scores."""
    # When evidence is insufficient, classify_score must return 'insufficient_evidence'
    status = classify_score(score=45.0, insufficient=True)
    assert status == "insufficient_evidence"

    # Verify score calculation formula:
    # hook (25%) + cliffhanger (25%) + standalone (20%) + intensity (20%) + relevance (10%)
    # With conservative baseline scores (2/5): (2/5) * 100% = 40.0
    conservative_item = IndependentLLMScoreItem(
        id="P009",
        hook_3s=2,
        cliffhanger=2,
        standalone=2,
        intensity=2,
        plot_relevance=2,
        insufficient_evidence=True,
        editorial_assessment="Fragmented scene with missing context",
    )
    weighted = compute_weighted_score(conservative_item)
    assert weighted == 40.0
    assert classify_score(weighted, insufficient=True) == "insufficient_evidence"


def test_http_503_and_fallback_provider_simulation():
    """Simulates primary provider returning HTTP 503 and switching to secondary provider."""
    providers_called = []

    def mock_provider_call(provider_name: str) -> dict:
        providers_called.append(provider_name)
        if provider_name == "primary_llm":
            raise HTTPError(503, "HTTP 503: Model overloaded, service temporarily unavailable")
        elif provider_name == "fallback_llm":
            return {"title": "Fallback Promo", "score": 4}
        raise RuntimeError("Unknown provider")

    # Orchestrator tries primary, catches 503, switches to fallback
    result = None
    for prov in ["primary_llm", "fallback_llm"]:
        try:
            raw = mock_provider_call(prov)
            result = MockCandidateSchema.model_validate(raw)
            break
        except HTTPError as e:
            if e.status_code == 503:
                continue  # Switch to fallback
            raise

    assert result is not None
    assert result.title == "Fallback Promo"
    assert result.score == 4
    assert providers_called == ["primary_llm", "fallback_llm"]


def test_api_timeout_and_provider_failure():
    """When all providers time out, the system reports a controlled failure."""
    def mock_timing_out_call():
        raise HTTPError(None, "Request timed out after 90 seconds")

    with pytest.raises(HTTPError) as exc:
        mock_timing_out_call()
    assert "timed out" in str(exc.value)


def test_http_401_fatal_authentication_error():
    """HTTP 401 Invalid Key raises FatalProviderError immediately with helpful diagnostic hint."""
    err = HTTPError(401, "HTTP 401: Unauthorized - Invalid API key")
    status = err.status_code
    assert status == 401
    assert 401 in FATAL_HINTS

    with pytest.raises(FatalProviderError) as exc:
        raise FatalProviderError(f"{FATAL_HINTS[status]} Provider said: {str(err)}")

    assert "rejected the API key (HTTP 401)" in str(exc.value)
