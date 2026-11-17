"""Tests for Feature 2 (Failure Analysis) and Feature 3 (Reproducibility & Run Consistency)."""
from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from snipdeck.eval.consistency import (
    calculate_spearman_rho,
    compare_runs,
    compare_runs_detailed,
    same_moment,
    temporal_iou,
)
from snipdeck.eval.failure_tracker import (
    compute_screenplay_hash,
    track_run_failures_and_metadata,
)
from snipdeck.eval.schemas import (
    FAILURE_CATEGORIES,
    HumanDecisionPayload,
    RunMetadata,
)
from snipdeck.eval.store import EvalStore


@pytest.fixture
def temp_store():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test_eval.db"
        yield EvalStore(db_path=db_path)


def test_failure_recording_and_categories(temp_store):
    """Verify recording of different failure categories and retrieval."""
    temp_store.record_failure(
        run_id="run-A",
        candidate_id="P001",
        category="weak_hook",
        description="Opening dialogue has 0.7 drop risk",
        source="automatic_validation",
        episode=1,
    )
    temp_store.record_failure(
        run_id="run-A",
        candidate_id="P002",
        category="spoiler",
        description="Late payoff reveal in Episode 45",
        source="automatic_validation",
        episode=45,
    )
    temp_store.record_failure(
        run_id="run-A",
        candidate_id="P003",
        category="judge_disagreement",
        description="Judges diverged on hook and cliffhanger",
        source="automatic_validation",
        episode=3,
    )

    failures = temp_store.list_failures(run_id="run-A")
    assert len(failures) == 3
    pids = {f.candidate_id for f in failures}
    assert pids == {"P001", "P002", "P003"}

    summary = temp_store.get_failure_analysis_summary(run_id="run-A")
    assert summary.automatic_validation_count == 3
    assert summary.human_review_count == 0
    assert "Weak hook" in summary.category_distribution
    assert "Spoiler" in summary.category_distribution
    assert "Judge disagreement" in summary.category_distribution


def test_duplicate_prevention_on_retry(temp_store):
    """Verify that retrying pipeline stages does not create duplicate failure records."""
    for _ in range(3):
        temp_store.record_failure(
            run_id="run-retry",
            candidate_id="P005",
            category="duplicate_overlap",
            description="Overlaps with candidate P004",
            source="automatic_validation",
            episode=2,
        )

    failures = temp_store.list_failures(run_id="run-retry")
    assert len(failures) == 1
    assert failures[0].candidate_id == "P005"
    assert failures[0].category == "duplicate_overlap"


def test_human_editorial_feedback_and_separation(temp_store):
    """Verify human editorial rejection workflow and separation from automatic failures."""
    # 1. Automatic technical failure on P010
    temp_store.record_failure(
        run_id="run-review",
        candidate_id="P010",
        category="invalid_boundary",
        description="Start cut inside spoken line",
        source="automatic_validation",
        episode=4,
    )

    # 2. Human reviewer rejects P011 for editorial reasons
    payload = HumanDecisionPayload(
        run_id="run-review",
        candidate_id="P011",
        episode=4,
        decision="rejected",
        category="low_drama",
        comment="Dialogue feels too flat for promotional trailer",
    )
    temp_store.record_human_decision(payload)

    failures = temp_store.list_failures(run_id="run-review")
    assert len(failures) == 2

    auto_fails = [f for f in failures if f.source == "automatic_validation"]
    human_fails = [f for f in failures if f.source == "human_review"]

    assert len(auto_fails) == 1
    assert auto_fails[0].candidate_id == "P010"
    assert auto_fails[0].reviewer_comment is None

    assert len(human_fails) == 1
    assert human_fails[0].candidate_id == "P011"
    assert human_fails[0].reviewer_comment == "Dialogue feels too flat for promotional trailer"
    assert human_fails[0].category == "low_drama"

    # 3. If reviewer changes mind and approves, human failure is cleared
    approve_payload = HumanDecisionPayload(
        run_id="run-review",
        candidate_id="P011",
        episode=4,
        decision="approved",
    )
    temp_store.record_human_decision(approve_payload)

    remaining_human = temp_store.list_failures(run_id="run-review", source="human_review")
    assert len(remaining_human) == 0
    # Automatic failure still remains intact
    assert len(temp_store.list_failures(run_id="run-review", source="automatic_validation")) == 1


def test_screenplay_content_hashing_and_metadata(temp_store):
    """Verify screenplay hashing and run metadata persistence."""
    sample_episodes = {
        1: {
            "lines": [
                {"speaker": "DUKE", "text": "I cannot marry you."},
                {"speaker": "JULIANA", "text": "What do you mean?"},
            ]
        },
        2: {
            "lines": [
                {"speaker": "MATRIARCH", "text": "Leave at once."},
            ]
        },
    }

    hash1 = compute_screenplay_hash(sample_episodes)
    hash2 = compute_screenplay_hash(sample_episodes)
    assert hash1 == hash2
    assert len(hash1) == 16

    meta = RunMetadata(
        run_id="run-meta-1",
        show_title="Duke Story",
        screenplay_hash=hash1,
        model_provider="gemini",
        model_version="gemini-3.8-flash",
        prompt_version="v2.4",
        pipeline_version="2.0.0",
        temperature=0.2,
        candidate_ids=["P01", "P02"],
        candidate_time_ranges={"P01": [0.0, 45.0], "P02": [50.0, 95.0]},
        candidate_scores={"P01": 92.0, "P02": 85.0},
        candidate_rankings={"P01": 1, "P02": 2},
        total_candidates=2,
        status="completed",
    )
    temp_store.save_run_metadata(meta)

    fetched = temp_store.get_run_metadata("run-meta-1")
    assert fetched is not None
    assert fetched.screenplay_hash == hash1
    assert fetched.model_version == "gemini-3.8-flash"
    assert fetched.temperature == 0.2
    assert fetched.candidate_scores["P01"] == 92.0


def test_candidate_matching_and_jaccard_consistency():
    """Verify candidate matching using line IDs and temporal IoU, and Jaccard consistency."""
    cand_a = {
        "pid": "PA1",
        "rank": 1,
        "score_100": 90,
        "hook_line_id": "E01_L005",
        "cliffhanger_line_id": "E01_L025",
        "segments": [{"episode": 1, "start": 10.0, "end": 45.0}],
    }
    cand_b_exact = {
        "pid": "PB1",
        "rank": 2,
        "score_100": 88,
        "hook_line_id": "E01_L005",
        "cliffhanger_line_id": "E01_L025",
        "segments": [{"episode": 1, "start": 10.5, "end": 45.2}],
    }
    cand_b_iou = {
        "pid": "PB2",
        "rank": 3,
        "score_100": 80,
        "hook_line_id": "E01_L006",
        "cliffhanger_line_id": "E01_L024",
        "segments": [{"episode": 1, "start": 12.0, "end": 44.0}],
    }

    match_exact, iou_exact = same_moment(cand_a, cand_b_exact)
    assert match_exact is True
    assert iou_exact == 1.0

    match_iou, iou_val = same_moment(cand_a, cand_b_iou)
    assert match_iou is True
    assert iou_val > 0.7

    run_a = {"promos": [cand_a, {"pid": "PA2", "segments": [{"episode": 2, "start": 0.0, "end": 30.0}]}]}
    run_b = {"promos": [cand_b_exact, {"pid": "PB3", "segments": [{"episode": 3, "start": 0.0, "end": 30.0}]}]}

    # 1 common match out of 3 unique (cand_a/cand_b_exact, PA2, PB3)
    res = compare_runs(run_a, run_b, run_a_id="run-A", run_b_id="run-B")
    assert res.common_candidates_count == 1
    assert res.unique_candidates_count == 3
    # Jaccard = (1 / 3) * 100 = 33.3%
    assert res.consistency_score == 33.3


def test_score_stability_and_spearman_rank_correlation(temp_store):
    """Verify score differences and Spearman rank correlation calculation."""
    # 1. Test Spearman calculation with known ranks
    ranks_1 = [1, 2, 3, 4, 5]
    ranks_2 = [1, 2, 3, 4, 5]
    rho_perf, _ = calculate_spearman_rho(ranks_1, ranks_2)
    assert rho_perf == 1.0

    ranks_inv = [5, 4, 3, 2, 1]
    rho_inv, _ = calculate_spearman_rho(ranks_1, ranks_inv)
    assert rho_inv == -1.0

    # 2. Test insufficient candidates (N < 3)
    rho_small, note_small = calculate_spearman_rho([1, 2], [2, 1])
    assert rho_small is None
    assert "Insufficient" in note_small

    # 3. Test detailed comparison between two runs
    run_a = {
        "promos": [
            {"pid": "P01", "rank": 1, "composite": 0.95, "score_100": 95, "segments": [{"episode": 1, "start": 0.0, "end": 35.0}]},
            {"pid": "P02", "rank": 2, "composite": 0.88, "score_100": 88, "segments": [{"episode": 2, "start": 10.0, "end": 40.0}]},
            {"pid": "P03", "rank": 3, "composite": 0.82, "score_100": 82, "segments": [{"episode": 3, "start": 5.0, "end": 35.0}]},
            {"pid": "P04", "rank": 4, "composite": 0.75, "score_100": 75, "segments": [{"episode": 4, "start": 0.0, "end": 30.0}]},
        ]
    }
    run_b = {
        "promos": [
            {"pid": "P01_b", "rank": 2, "composite": 0.90, "score_100": 90, "segments": [{"episode": 1, "start": 0.0, "end": 35.0}]},
            {"pid": "P02_b", "rank": 1, "composite": 0.92, "score_100": 92, "segments": [{"episode": 2, "start": 10.0, "end": 40.0}]},
            {"pid": "P03_b", "rank": 3, "composite": 0.82, "score_100": 82, "segments": [{"episode": 3, "start": 5.0, "end": 35.0}]},
            {"pid": "P05_b", "rank": 4, "composite": 0.70, "score_100": 70, "segments": [{"episode": 5, "start": 0.0, "end": 30.0}]},
        ]
    }

    comp = compare_runs_detailed(run_a, run_b, run_a_id="runA", run_b_id="runB", store=temp_store)
    assert comp.common_count == 3  # P01, P02, P03 matched
    assert comp.run_a_count == 4
    assert comp.run_b_count == 4
    assert comp.unique_count == 5  # 3 common + 1 missing + 1 new = 5
    # Jaccard = (3 / 5) * 100 = 60.0%
    assert comp.jaccard_consistency == 60.0
    # Average absolute score difference: (|95-90| + |88-92| + |82-82|) / 3 = (5 + 4 + 0) / 3 = 3.0
    assert comp.avg_score_diff == 3.0
    assert comp.spearman_rank_correlation is not None
    assert comp.spearman_rank_correlation >= 0.5
    assert len(comp.missing_candidates) == 1
    assert comp.missing_candidates[0]["pid"] == "P04"
    assert len(comp.new_candidates) == 1
    assert comp.new_candidates[0]["pid"] == "P05_b"


def test_empty_runs_handling(temp_store):
    """Verify that comparing empty runs handles zero divisions gracefully."""
    empty_a = {"promos": []}
    empty_b = {"promos": []}
    comp = compare_runs_detailed(empty_a, empty_b, run_a_id="emptyA", run_b_id="emptyB", store=temp_store)
    assert comp.common_count == 0
    assert comp.unique_count == 1  # max(1, 0)
    assert comp.jaccard_consistency == 0.0
    assert comp.avg_score_diff == 0.0
    assert comp.spearman_rank_correlation is None
    assert "Insufficient" in comp.spearman_note
