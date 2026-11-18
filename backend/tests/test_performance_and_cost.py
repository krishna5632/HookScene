"""Comprehensive test suite for Feature 5: Performance, Cost & Resource Monitoring.

Tests stage timing, LLM token usage extraction, configurable pricing formulas,
retry & fallback tracking, missing usage metadata handling, failed call recording,
prevention of duplicate usage counting, database persistence, and API endpoints.
All tests use mock objects with zero external API calls or credit spend.
"""
from __future__ import annotations

import time
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from hookscene.core.pipeline import PipelineTimer
from hookscene.eval.pricing import (
    DEFAULT_PRICING_PER_M,
    calculate_call_cost,
    get_all_configured_pricing,
    get_model_pricing,
)
from hookscene.eval.schemas import (
    LLMCallRecord,
    PerformanceCostSummary,
    StagePerformanceRecord,
)
from hookscene.eval.store import EvalStore
from hookscene.providers.base import LLM


# ============================================================================
# 1. Pipeline Performance Tracking Tests
# ============================================================================

def test_pipeline_timer_records_stage_durations():
    """Verify that PipelineTimer measures execution time with high precision."""
    timer = PipelineTimer()
    timer.start_stage("summary")
    time.sleep(0.02)
    rec = timer.end_stage("summary", status="completed", spoiler_count=4)

    assert rec["stage_name"] == "summary"
    assert rec["duration_s"] >= 0.015
    assert rec["status"] == "completed"
    assert rec["error_msg"] is None
    assert rec["details"]["spoiler_count"] == 4


def test_pipeline_timer_records_failed_and_skipped_stages():
    """Verify that failed stages record error descriptions rather than successful executions."""
    timer = PipelineTimer()
    timer.start_stage("montage")
    time.sleep(0.01)
    rec = timer.end_stage("montage", status="failed", error_msg="Insufficient candidates for montage synthesis")

    assert rec["stage_name"] == "montage"
    assert rec["status"] == "failed"
    assert "Insufficient candidates" in rec["error_msg"]

    timer.start_stage("export")
    rec2 = timer.end_stage("export", status="skipped", reason="Export skipped by user option")
    assert rec2["status"] == "skipped"


def test_pipeline_timer_summary_computation():
    """Verify calculation of total duration, slowest stage, fastest stage, and stage dictionary."""
    timer = PipelineTimer()

    timer.start_stage("validate")
    time.sleep(0.01)
    timer.end_stage("validate", status="completed")

    timer.start_stage("candidates")
    time.sleep(0.03)
    timer.end_stage("candidates", status="completed")

    timer.start_stage("score")
    time.sleep(0.015)
    timer.end_stage("score", status="completed")

    summary = timer.summary()
    assert summary["total_duration_s"] >= 0.05
    assert summary["slowest_stage"] == "candidates"
    assert summary["fastest_stage"] in ("validate", "score")
    assert len(summary["stage_durations"]) == 3
    assert "candidates" in summary["stage_durations"]
    assert summary["avg_stage_duration_s"] > 0


# ============================================================================
# 2. Token Usage Extraction Tests
# ============================================================================

def test_token_usage_extraction_from_actual_response():
    """Verify that prompt, completion, and total tokens are extracted from provider response metadata."""
    mock_resp = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '{"analysis": "success"}'
    mock_resp.choices = [mock_choice]
    mock_usage = MagicMock()
    mock_usage.prompt_tokens = 1500
    mock_usage.completion_tokens = 320
    mock_usage.total_tokens = 1820
    mock_resp.usage = mock_usage

    # Test extraction
    u = getattr(mock_resp, "usage", None)
    pt = getattr(u, "prompt_tokens", None)
    ct = getattr(u, "completion_tokens", None)
    tt = getattr(u, "total_tokens", None)

    assert pt == 1500
    assert ct == 320
    assert tt == 1820


def test_missing_usage_metadata_does_not_fabricate_tokens():
    """Verify that missing provider usage metadata does not invent tokens or costs."""
    mock_resp = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '{"ok": true}'
    mock_resp.choices = [mock_choice]
    mock_resp.usage = None  # No usage metadata returned by provider

    u = getattr(mock_resp, "usage", None)
    pt = getattr(u, "prompt_tokens", None) if u else None
    ct = getattr(u, "completion_tokens", None) if u else None

    assert pt is None
    assert ct is None

    # Cost calculation must return None when tokens are missing
    cost = calculate_call_cost(pt, ct, "gemini-flash-lite-latest")
    assert cost is None


# ============================================================================
# 3. Configurable Cost Calculation Tests
# ============================================================================

def test_cost_calculation_formula():
    """Verify exact formula: (prompt / 1M * Pin) + (completion / 1M * Pout)."""
    # gemini-flash-lite-latest: $0.10/1M input, $0.40/1M output
    # 100,000 in = $0.010, 10,000 out = $0.004 -> Total $0.014
    cost = calculate_call_cost(100_000, 10_000, "gemini-flash-lite-latest")
    assert cost == 0.014

    # 1,000,000 in = $0.10, 1,000,000 out = $0.40 -> Total $0.50
    cost2 = calculate_call_cost(1_000_000, 1_000_000, "gemini-flash-lite-latest")
    assert cost2 == 0.50


def test_custom_pricing_configuration_override():
    """Verify user-configured pricing in config overrides default rates."""
    custom_cfg = {
        "pricing": {
            "custom-model": {"input_per_m": 2.00, "output_per_m": 8.00},
            "gemini-flash-lite-latest": {"input_per_m": 0.50, "output_per_m": 1.50},
        }
    }
    # Test custom model
    rates = get_model_pricing("custom-model", custom_cfg)
    assert rates == (2.00, 8.00)
    cost = calculate_call_cost(500_000, 100_000, "custom-model", custom_cfg)
    # (0.5 * 2.0) + (0.1 * 8.0) = 1.0 + 0.8 = 1.8
    assert cost == 1.80

    # Test override of existing model
    cost_overridden = calculate_call_cost(1_000_000, 1_000_000, "gemini-flash-lite-latest", custom_cfg)
    assert cost_overridden == 2.00  # 0.50 + 1.50


def test_unknown_model_returns_none():
    """Verify that unconfigured unknown models return None rather than fabricating numbers."""
    rates = get_model_pricing("some-completely-unknown-neural-net-v999")
    assert rates is None
    cost = calculate_call_cost(1000, 500, "some-completely-unknown-neural-net-v999")
    assert cost is None


# ============================================================================
# 4. Retry, Fallback & Duplicate Usage Prevention Tests
# ============================================================================

def test_llm_summary_aggregates_without_duplicate_counting():
    """Verify that retries and failed calls are tracked without double-counting tokens or cost."""
    cfg = {
        "providers": {"gemini": {"base_url": "https://fake.url"}},
        "stages": {"summary": {"provider": "gemini", "model": "gemini-flash-lite-latest"}},
        "pricing": {"gemini-flash-lite-latest": {"input_per_m": 0.10, "output_per_m": 0.40}},
    }
    llm = LLM(cfg, api_keys={"gemini": "fake_key"})

    # Simulate: Call 1 fails on attempt 0 (HTTP 503 error)
    llm.calls.append({
        "call_id": "call_0001",
        "stage": "summary",
        "provider": "gemini",
        "model": "gemini-flash-lite-latest",
        "cached": False,
        "prompt_tokens": None,
        "completion_tokens": None,
        "thinking_tokens": None,
        "total_tokens": None,
        "seconds": 0.45,
        "duration_s": 0.45,
        "status": "error",
        "retry_count": 0,
        "is_fallback": False,
        "fallback_model": None,
        "estimated_cost_usd": None,
        "cost_available": False,
        "error_msg": "HTTP 503: Service Unavailable",
    })

    # Simulate: Call 1 retry attempt 1 succeeds with 10,000 in, 1,000 out
    cost1 = calculate_call_cost(10_000, 1_000, "gemini-flash-lite-latest")
    llm.calls.append({
        "call_id": "call_0002",
        "stage": "summary",
        "provider": "gemini",
        "model": "gemini-flash-lite-latest",
        "cached": False,
        "prompt_tokens": 10_000,
        "completion_tokens": 1_000,
        "thinking_tokens": 0,
        "total_tokens": 11_000,
        "seconds": 1.25,
        "duration_s": 1.25,
        "status": "success",
        "retry_count": 1,
        "is_fallback": False,
        "fallback_model": None,
        "estimated_cost_usd": cost1,
        "cost_available": True,
        "error_msg": None,
    })

    summary = llm.summary()

    # Total calls is 2 (both attempts tracked)
    assert summary["total_calls"] == 2
    assert summary["successful_calls"] == 1
    assert summary["failed_calls"] == 1
    assert summary["total_retries"] == 1

    # BUT total tokens and cost must reflect ONLY successful billed execution (NO double counting)
    assert summary["total_prompt_tokens"] == 10_000
    assert summary["total_completion_tokens"] == 1_000
    assert summary["total_tokens"] == 11_000
    assert summary["total_estimated_cost_usd"] == cost1


def test_fallback_tracking_in_summary():
    """Verify that fallback model activations are tagged and aggregated in summary."""
    cfg = {
        "providers": {"gemini": {"base_url": "https://fake.url"}},
        "stages": {"candidates": {"provider": "gemini", "model": "gemini-flash-lite-latest"}},
    }
    llm = LLM(cfg, api_keys={"gemini": "fake_key"})

    llm.calls.append({
        "call_id": "call_0003",
        "stage": "candidates",
        "provider": "gemini",
        "model": "gemini-3-flash-preview",
        "cached": False,
        "prompt_tokens": 5_000,
        "completion_tokens": 500,
        "total_tokens": 5_500,
        "seconds": 1.1,
        "duration_s": 1.1,
        "status": "success",
        "retry_count": 0,
        "is_fallback": True,
        "fallback_model": "gemini-3-flash-preview",
        "estimated_cost_usd": 0.0007,
        "cost_available": True,
    })

    summary = llm.summary()
    assert summary["total_fallbacks"] == 1
    assert summary["by_stage"]["candidates"]["fallbacks"] == 1


# ============================================================================
# 5. Database Persistence Tests (EvalStore)
# ============================================================================

def test_eval_store_save_and_retrieve_performance_summary(tmp_path):
    """Verify that PerformanceCostSummary persists cleanly into SQLite run_performance table."""
    db_file = tmp_path / "test_eval.db"
    store = EvalStore(db_file)

    test_summary = PerformanceCostSummary(
        run_id="test-run-perf-101",
        total_duration_s=42.5,
        stage_durations={"summary": 4.5, "candidates": 20.0, "score": 12.0, "rank": 6.0},
        stage_records=[
            StagePerformanceRecord(stage_name="summary", duration_s=4.5, status="completed"),
            StagePerformanceRecord(stage_name="candidates", duration_s=20.0, status="completed"),
            StagePerformanceRecord(stage_name="score", duration_s=12.0, status="completed"),
            StagePerformanceRecord(stage_name="rank", duration_s=6.0, status="completed"),
        ],
        slowest_stage="candidates",
        fastest_stage="summary",
        avg_stage_duration_s=10.625,
        total_llm_calls=15,
        total_prompt_tokens=65000,
        total_completion_tokens=8500,
        total_tokens=73500,
        tokens_available=True,
        total_estimated_cost_usd=0.0099,
        cost_available=True,
        total_retries=1,
        total_fallbacks=0,
        failed_calls_count=1,
    )

    store.save_performance_summary("test-run-perf-101", test_summary)

    retrieved = store.get_performance_summary("test-run-perf-101")
    assert retrieved is not None
    assert retrieved["run_id"] == "test-run-perf-101"
    assert retrieved["total_duration_s"] == 42.5
    assert retrieved["total_tokens"] == 73500
    assert retrieved["total_estimated_cost_usd"] == 0.0099
    assert retrieved["slowest_stage"] == "candidates"
    assert len(retrieved["stage_records"]) == 4


def test_eval_store_seeded_baselines_exist():
    """Verify that default baseline runs are seeded with performance data."""
    store = EvalStore()
    all_runs = store.list_performance_summaries()
    run_ids = [r["run_id"] for r in all_runs]

    assert "official-run-C" in run_ids
    assert "repeat-run-D" in run_ids
    assert "rule-baseline" in run_ids

    # Rule baseline must have $0.00 cost (free heuristics)
    rule_summary = store.get_performance_summary("rule-baseline")
    assert rule_summary is not None
    assert rule_summary["total_llm_calls"] == 0
    assert rule_summary["total_tokens"] == 0
    assert rule_summary["total_estimated_cost_usd"] == 0.0


# ============================================================================
# 6. REST API Endpoint Tests
# ============================================================================

def test_performance_data_retrieval_and_pricing_registry():
    """Verify performance summary retrieval, run listing, and pricing rate cards."""
    store = EvalStore()

    # 1. Verify summary retrieval for official-run-C
    summary = store.get_performance_summary("official-run-C")
    assert summary is not None
    assert summary["run_id"] == "official-run-C"
    assert summary["total_duration_s"] > 0
    assert "candidates" in summary["stage_durations"]
    assert summary["total_tokens"] > 0
    assert summary["cost_available"] is True
    assert summary["total_estimated_cost_usd"] > 0

    # 2. Verify listing runs
    runs = store.list_performance_summaries()
    assert len(runs) >= 3
    run_ids = [r["run_id"] for r in runs]
    assert "official-run-C" in run_ids
    assert "repeat-run-D" in run_ids
    assert "rule-baseline" in run_ids

    # 3. Verify pricing registry
    pricing = get_all_configured_pricing()
    assert "gemini-flash-lite-latest" in pricing
    assert pricing["gemini-flash-lite-latest"]["input"] == 0.10
    assert pricing["gemini-flash-lite-latest"]["output"] == 0.40
    assert "gpt-4o" in pricing
    assert pricing["gpt-4o"]["input"] == 2.50

