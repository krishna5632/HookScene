"""Unit tests for HookScene Quality Evaluation Feature.
Tests:
1. Duration and hook validation.
2. Timestamp and line ID validation.
3. Weighted score calculation.
4. Blind evaluation and invalid LLM response handling.
5. Insufficient context handling.
6. Candidate matching (IoU and line span).
7. Consistency calculation formula (common / unique * 100).
8. SQLite database persistence and retrieval.
"""
import asyncio
import pytest
import tempfile
from pathlib import Path
from pydantic import BaseModel

from hookscene.eval.rules import evaluate_rules
from hookscene.eval.independent_judge import compute_weighted_score, classify_score, evaluate_independent_llm
from hookscene.eval.consistency import temporal_iou, same_moment, compare_runs
from hookscene.eval.store import EvalStore
from hookscene.eval.schemas import (
    CandidateEvaluationRecord,
    EditorialMetricsSummary,
    EvaluationRunSummary,
    RuleEvaluationResult,
    IndependentLLMBatch,
    IndependentLLMScoreItem,
)
from hookscene.eval.runner import run_quality_evaluation


# 1. Duration and Hook Validation Test
def test_duration_and_hook_validation():
    # Valid promo (duration 45s, hook starts at 1.0s)
    valid_promo = {
        "pid": "P01",
        "duration": 45.0,
        "segments": [{"episode": 2, "start": 10.0, "end": 55.0}],
        "hook": {"start": 11.0, "text": "I cannot marry you."},
        "hook_line_id": "E02_L005",
        "cliffhanger_line_id": "E02_L020",
    }
    res = evaluate_rules([valid_promo])
    assert res.total_candidates == 1
    assert res.passed_candidates == 1
    assert res.pass_rate == 100.0
    assert len(res.failures_list) == 0

    # Invalid promo (too short: 15s; hook starts at +5s)
    invalid_promo = {
        "pid": "P02",
        "duration": 15.0,  # Fails min_len_s (20.0s)
        "segments": [{"episode": 2, "start": 10.0, "end": 25.0}],
        "hook": {"start": 15.5, "text": "Too late hook."},  # 5.5s delay > 3.0s window
        "hook_line_id": "E02_L005",
    }
    res_bad = evaluate_rules([invalid_promo])
    assert res_bad.passed_candidates == 0
    assert res_bad.failed_candidates == 1
    assert res_bad.pass_rate == 0.0
    assert res_bad.rule_failures["duration_compliance"] == 1
    assert res_bad.rule_failures["hook_window"] == 1


# 2. Timestamp and Line ID Validation Test
def test_timestamp_and_line_id_validation():
    class DummyLine:
        def __init__(self, lid, start):
            self.id = lid
            self.start = start

    class DummyEpisode:
        def __init__(self, num, dur):
            self.num = num
            self.duration = dur
            self.lines = {"E02_L001": DummyLine("E02_L001", 1.0)}

        def by_id(self):
            return self.lines

        def cut_ok(self, t):
            return True

    episodes = {2: DummyEpisode(2, 60.0)}

    # Negative timestamp and unknown line ID
    bad_timestamps = {
        "pid": "P03",
        "duration": 30.0,
        "segments": [{"episode": 2, "start": -5.0, "end": 25.0}],
        "hook_line_id": "E02_L999",  # Does not exist
    }

    res = evaluate_rules([bad_timestamps], episodes=episodes)
    assert res.rule_failures["timestamp_validity"] >= 1
    assert res.rule_failures["line_ids_valid"] >= 1


# 3. Weighted Score Calculation Test
def test_weighted_score_formula():
    # R = [5, 5, 4, 5, 4] with weights: Hook 25%, Cliffhanger 25%, Standalone 20%, Intensity 20%, Relevance 10%
    # (5/5)*0.25 + (5/5)*0.25 + (4/5)*0.20 + (5/5)*0.20 + (4/5)*0.10
    # = 0.25 + 0.25 + 0.16 + 0.20 + 0.08 = 0.94 -> 94.0
    scores = {
        "hook_3s": 5,
        "cliffhanger": 5,
        "standalone": 4,
        "intensity": 5,
        "plot_relevance": 4,
    }
    calculated = compute_weighted_score(scores)
    assert calculated == 94.0
    assert classify_score(calculated) == "good"

    # Low scores
    low_scores = {
        "hook_3s": 2,
        "cliffhanger": 2,
        "standalone": 2,
        "intensity": 2,
        "plot_relevance": 2,
    }
    low_calc = compute_weighted_score(low_scores)
    assert low_calc == 40.0
    assert classify_score(low_calc) == "poor"


# 4. Blind Evaluation and Mocked LLM Test
class FakeEvalLLM:
    def __init__(self, return_insufficient=False, raise_error=False):
        self.return_insufficient = return_insufficient
        self.raise_error = raise_error
        self.calls = []

    def json(self, stage, system, user, schema, **kwargs):
        self.calls.append((stage, system, user))
        if self.raise_error:
            raise RuntimeError("API quota exceeded or malformed output")

        return IndependentLLMBatch(
            evaluations=[
                IndependentLLMScoreItem(
                    id="P01",
                    hook_3s=5,
                    cliffhanger=4,
                    standalone=4,
                    intensity=5,
                    plot_relevance=4,
                    evidence_quote="I cannot marry you.",
                    editorial_assessment="Immediate emotional confrontation.",
                    insufficient_evidence=self.return_insufficient,
                )
            ]
        )


def test_independent_llm_evaluation_success_and_fallback():
    promo = {
        "pid": "P01",
        "duration": 45.0,
        "segments": [{"episode": 2, "start": 0.0, "end": 45.0}],
        "hook": "I cannot marry you.",
        "cliffhanger": "This is not over.",
        "excerpt": ["E02_L001 Juliana: I cannot marry you.", "E02_L002 Duke: What?"],
    }

    # 1. Normal LLM evaluation
    fake_llm = FakeEvalLLM()
    records, summary = evaluate_independent_llm([promo], llm=fake_llm)
    assert len(records) == 1
    assert records[0].independent_score == 89.0  # (5/5)*0.25 + (4/5)*0.25 + (4/5)*0.20 + (5/5)*0.20 + (4/5)*0.10 = 0.89 -> 89.0
    assert records[0].classification == "good"
    assert summary.evaluated_count == 1

    # 2. Insufficient context LLM evaluation
    insufficient_llm = FakeEvalLLM(return_insufficient=True)
    records_insuf, _ = evaluate_independent_llm([promo], llm=insufficient_llm)
    assert records_insuf[0].classification == "insufficient_evidence"

    # 3. LLM API Error gracefully falls back without crashing
    error_llm = FakeEvalLLM(raise_error=True)
    records_fallback, summary_fallback = evaluate_independent_llm([promo], llm=error_llm)
    assert len(records_fallback) == 1
    assert records_fallback[0].independent_score is not None
    assert summary_fallback.evaluated_count == 1


# 5. Candidate Matching and IoU Test
def test_candidate_matching_and_iou():
    # 50% overlap in same episode
    # A: 10 to 30 (duration 20)
    # B: 20 to 40 (duration 20)
    # intersection: 20 to 30 = 10, union: 10 to 40 = 30 -> IoU: 10/30 = 0.333
    iou_val = temporal_iou(10.0, 30.0, 20.0, 40.0)
    assert iou_val == 0.333

    # Exact match: IoU 1.0
    assert temporal_iou(10.0, 30.0, 10.0, 30.0) == 1.0

    promo_a = {"segments": [{"episode": 5, "start": 10.0, "end": 40.0}]}
    promo_b = {"segments": [{"episode": 5, "start": 12.0, "end": 42.0}]}
    is_match, score = same_moment(promo_a, promo_b, iou_threshold=0.5)
    assert is_match is True
    assert score >= 0.70


# 6. Run Consistency Calculation Test
def test_run_consistency_formula():
    run_a = {
        "promos": [
            {"pid": "PA1", "segments": [{"episode": 1, "start": 10.0, "end": 40.0}], "rank": 1, "score_100": 90},
            {"pid": "PA2", "segments": [{"episode": 2, "start": 10.0, "end": 40.0}], "rank": 2, "score_100": 85},
            {"pid": "PA3", "segments": [{"episode": 3, "start": 10.0, "end": 40.0}], "rank": 3, "score_100": 80},
        ]
    }
    # Run B shares 2 out of 3 moments with Run A, plus has 1 unique moment
    run_b = {
        "promos": [
            {"pid": "PB1", "segments": [{"episode": 1, "start": 10.0, "end": 40.0}], "rank": 2, "score_100": 88},
            {"pid": "PB2", "segments": [{"episode": 2, "start": 10.0, "end": 40.0}], "rank": 1, "score_100": 92},
            {"pid": "PB4", "segments": [{"episode": 9, "start": 10.0, "end": 40.0}], "rank": 3, "score_100": 75},
        ]
    }

    res = compare_runs(run_a, run_b, run_a_id="RunA", run_b_id="RunB")
    assert res.run_a_count == 3
    assert res.run_b_count == 3
    assert res.common_candidates_count == 2
    # Unique across both: 3 + 3 - 2 = 4
    assert res.unique_candidates_count == 4
    # Consistency = (2 / 4) * 100 = 50.0%
    assert res.consistency_score == 50.0
    assert len(res.common_matches) == 2
    assert len(res.ranking_changes) == 2


# 7. SQLite Database Persistence and Retrieval Test
def test_sqlite_eval_store_persistence():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test_eval.db"
        store = EvalStore(db_path)

        # 1. Save and retrieve run
        store.save_run("run_123", "Test Show", {"promos": [{"pid": "P01"}]})
        loaded_run = store.get_run("run_123")
        assert loaded_run is not None
        assert loaded_run["promos"][0]["pid"] == "P01"

        # 2. Save and retrieve evaluation summary
        cand = CandidateEvaluationRecord(
            pid="P01",
            episode=1,
            original_score=90.0,
            original_rank=1,
            technical_passed=True,
            technical_failures=[],
            independent_score=88.0,
            independent_criteria={"hook_3s": 5, "cliffhanger": 4},
            classification="good",
            editorial_assessment="High tension moment.",
            evidence_quote="Test quote.",
            duration=35.0,
        )

        tech_res = RuleEvaluationResult(
            total_candidates=1,
            passed_candidates=1,
            failed_candidates=0,
            pass_rate=100.0,
            rule_failures={},
            failures_list=[],
        )

        edit_res = EditorialMetricsSummary(
            average_score=88.0,
            evaluated_count=1,
            criteria_averages={"hook_3s": 5.0, "cliffhanger": 4.0},
        )

        summary = EvaluationRunSummary(
            evaluation_id="eval_001",
            run_id="run_123",
            show_title="Test Show",
            created_at="2026-11-17T00:00:00",
            technical_metrics=tech_res,
            editorial_metrics=edit_res,
            distribution={"good": 1, "needs_review": 0, "poor": 0, "insufficient_evidence": 0},
            candidate_evaluations=[cand],
        )

        store.save_evaluation(summary)

        loaded_eval = store.get_evaluation("run_123")
        assert loaded_eval is not None
        assert loaded_eval.evaluation_id == "eval_001"
        assert loaded_eval.technical_metrics.pass_rate == 100.0
        assert loaded_eval.editorial_metrics.average_score == 88.0
        assert len(loaded_eval.candidate_evaluations) == 1
        assert loaded_eval.candidate_evaluations[0].pid == "P01"

        # 3. Retrieve failure stats
        stats = store.get_failure_statistics("run_123")
        assert stats["pass_rate"] == 100.0
        assert stats["failed_candidates_count"] == 0
