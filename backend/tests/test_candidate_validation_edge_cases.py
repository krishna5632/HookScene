"""Candidate Validation and Business Rule Edge-Case Tests (Feature 4, Section 2).
Tests the actual business rules:
- Candidate duration < 20s, 20-60s, > 60s
- Hook window <= 3s vs > 3s
- Invalid / inverted timestamps (start >= end)
- Invalid screenplay boundaries and safe cut snapping
- Spoiler episode restrictions
- Duplicate candidate suppression (temporal overlap and semantic similarity)
"""
from __future__ import annotations

import pytest
from hookscene.core.parse import Episode, Line
from hookscene.core.schemas import RawCandidate, Promo, Segment
from hookscene.core.validate import build_single, Invalid, snap_segment
from hookscene.core.stages import is_duplicate_moment, _same_moment, calculate_overlap_ratio
from hookscene.eval.rules import evaluate_rules


@pytest.fixture
def sample_episode() -> Episode:
    """Creates a synthetic 100-second episode with clear lines and timing."""
    lines = [
        Line(id="E01_L001", ep=1, idx=1, scene=1, scene_heading="INT. ROOM - DAY", speaker="ALICE", text="Wait, who are you?!", kind="DIALOGUE",
             start=2.0, end=4.5, emotion="shocked"),
        Line(id="E01_L002", ep=1, idx=2, scene=1, scene_heading="INT. ROOM - DAY", speaker="BOB", text="I am your worst nightmare.", kind="DIALOGUE",
             start=5.0, end=8.0, emotion="cold"),
        Line(id="E01_L003", ep=1, idx=3, scene=1, scene_heading="INT. ROOM - DAY", speaker="ALICE", text="You cannot stay here.", kind="DIALOGUE",
             start=9.0, end=14.0, emotion="tense"),
        Line(id="E01_L004", ep=1, idx=4, scene=1, scene_heading="INT. ROOM - DAY", speaker="BOB", text="The Duke gave me this land.", kind="DIALOGUE",
             start=15.0, end=22.0, emotion="commanding"),
        Line(id="E01_L005", ep=1, idx=5, scene=1, scene_heading="INT. ROOM - DAY", speaker="ALICE", text="He died five years ago!", kind="DIALOGUE",
             start=23.0, end=28.0, emotion="furious"),
        Line(id="E01_L006", ep=1, idx=6, scene=1, scene_heading="INT. ROOM - DAY", speaker="BOB", text="Then who signed this order yesterday?", kind="DIALOGUE",
             start=29.0, end=35.0, emotion="whispering"),
        Line(id="E01_L007", ep=1, idx=7, scene=1, scene_heading="INT. ROOM - DAY", speaker="ALICE", text="No... that signature...", kind="DIALOGUE",
             start=36.0, end=45.0, emotion="horrified"),
        Line(id="E01_L008", ep=1, idx=8, scene=1, scene_heading="INT. ROOM - DAY", speaker="BOB", text="Tell me the truth, Alice!", kind="DIALOGUE",
             start=46.0, end=65.0, emotion="desperate"),
        Line(id="E01_L009", ep=1, idx=9, scene=1, scene_heading="INT. ROOM - DAY", speaker="ALICE", text="I was the one who poisoned him.", kind="DIALOGUE",
             start=66.0, end=85.0, emotion="crying"),
        Line(id="E01_L010", ep=1, idx=10, scene=1, scene_heading="INT. ROOM - DAY", speaker="BOB", text="May God have mercy on your soul.", kind="DIALOGUE",
             start=86.0, end=95.0, emotion="devastated"),
    ]
    return Episode(num=1, logline="Pilot", continuity="", path="", lines=lines)


@pytest.fixture
def standard_rules() -> dict:
    return {
        "min_len_s": 20.0,
        "max_len_s": 60.0,
        "hook_window_s": 3.0,
        "lead_in_s": 0.5,
        "tail_s": 1.0,
        "react_s": 3.0,
        "max_per_episode": 2,
    }


def test_candidate_duration_valid(sample_episode, standard_rules):
    """Candidate with duration 33s (between 20s and 60s) validates and produces Promo."""
    eps = {1: sample_episode}
    c = RawCandidate(
        episode=1,
        start_line="E01_L001",
        hook_line="E01_L001",
        cliffhanger_line="E01_L006",
        end_line="E01_L006",
        hook_type="conflict",
        cliffhanger_type="reveal",
        open_question="Who signed the order?",
        why="High stakes confrontation",
    )
    promo = build_single(c, eps, standard_rules, source="llm", pid="P001")
    assert promo.pid == "P001"
    assert 20.0 <= promo.duration <= 60.0
    assert promo.duration >= 33.0
    assert promo.hook_line_id == "E01_L001"
    assert promo.cliffhanger_line_id == "E01_L006"


def test_candidate_duration_below_20_seconds_rejected(sample_episode, standard_rules):
    """Candidate with duration ~13s (< 20s) is rejected with clear 'too short' message."""
    eps = {1: sample_episode}
    c = RawCandidate(
        episode=1,
        start_line="E01_L001",
        hook_line="E01_L001",
        cliffhanger_line="E01_L003",
        end_line="E01_L003",
        hook_type="conflict",
        cliffhanger_type="tension",
        open_question="",
        why="Too brief clip",
    )
    with pytest.raises(Invalid) as exc:
        build_single(c, eps, standard_rules, source="llm", pid="P002")
    assert "too short" in str(exc.value)
    assert "limit 20.0-60.0s" in str(exc.value)


def test_candidate_duration_above_60_seconds_rejected(sample_episode, standard_rules):
    """Candidate with duration ~85s (> 60s) is rejected with clear 'too long' message."""
    eps = {1: sample_episode}
    c = RawCandidate(
        episode=1,
        start_line="E01_L001",
        hook_line="E01_L001",
        cliffhanger_line="E01_L009",
        end_line="E01_L009",
        hook_type="conflict",
        cliffhanger_type="confession",
        open_question="",
        why="Excessively long clip spanning 85s",
    )
    with pytest.raises(Invalid) as exc:
        build_single(c, eps, standard_rules, source="llm", pid="P003")
    assert "too long" in str(exc.value)
    assert "limit 20.0-60.0s" in str(exc.value)


def test_hook_window_within_3_seconds(sample_episode, standard_rules):
    """Hook line starting within 3s of the clip start passes."""
    eps = {1: sample_episode}
    c = RawCandidate(
        episode=1,
        start_line="E01_L001",
        hook_line="E01_L001",
        cliffhanger_line="E01_L006",
        end_line="E01_L006",
        hook_type="conflict",
        cliffhanger_type="reveal",
        open_question="",
        why="Valid 0.5s hook onset",
    )
    p = build_single(c, eps, standard_rules, source="llm", pid="P004")
    assert p.segments[0].start <= sample_episode.lines[0].start
    hook_offset = sample_episode.lines[0].start - p.segments[0].start
    assert hook_offset <= standard_rules["hook_window_s"]


def test_hook_duration_exceeding_3_seconds(sample_episode, standard_rules):
    """If hook line is proposed far after start_line, build_single snaps start to hook or rejects."""
    eps = {1: sample_episode}
    c = RawCandidate(
        episode=1,
        start_line="E01_L001",
        hook_line="E01_L004",  # 15s in
        cliffhanger_line="E01_L008",
        end_line="E01_L008",
        hook_type="statement",
        cliffhanger_type="demand",
        open_question="",
        why="Late hook proposal",
    )
    promo = build_single(c, eps, standard_rules, source="llm", pid="P005")
    hook_l = sample_episode.by_id()["E01_L004"]
    assert hook_l.start - promo.segments[0].start <= standard_rules["hook_window_s"]


def test_inverted_or_out_of_order_lines(sample_episode, standard_rules):
    """End line before start line or cliffhanger before hook raises Invalid."""
    eps = {1: sample_episode}
    c_inverted = RawCandidate(
        episode=1,
        start_line="E01_L006",
        hook_line="E01_L006",
        cliffhanger_line="E01_L002",  # Earlier in time!
        end_line="E01_L002",
        hook_type="conflict",
        cliffhanger_type="reveal",
        open_question="",
        why="Inverted bounds",
    )
    with pytest.raises(Invalid) as exc:
        build_single(c_inverted, eps, standard_rules, source="llm", pid="P006")
    assert "need start <= hook <= cliffhanger <= end" in str(exc.value)


def test_invalid_line_id(sample_episode, standard_rules):
    """Non-existent line ID raises Invalid with descriptive message."""
    eps = {1: sample_episode}
    c_bad_id = RawCandidate(
        episode=1,
        start_line="E01_L999",  # Does not exist
        hook_line="E01_L001",
        cliffhanger_line="E01_L006",
        end_line="E01_L006",
        hook_type="conflict",
        cliffhanger_type="reveal",
        open_question="",
        why="Non-existent line",
    )
    with pytest.raises(Invalid) as exc:
        build_single(c_bad_id, eps, standard_rules, source="llm", pid="P007")
    assert "start_line 'E01_L999' does not exist" in str(exc.value)


def test_duplicate_and_overlapping_candidate_suppression():
    """Detects temporal overlap (>= 60%) between two overlapping promo candidates."""
    seg_a = Segment(episode=1, start=10.0, end=40.0, start_ts="00:10.00", end_ts="00:40.00", first_line="L1", last_line="L5")
    seg_b = Segment(episode=1, start=12.0, end=38.0, start_ts="00:12.00", end_ts="00:38.00", first_line="L1", last_line="L4")
    seg_c = Segment(episode=1, start=60.0, end=90.0, start_ts="01:00.00", end_ts="01:30.00", first_line="L8", last_line="L12")

    p_a = Promo(pid="P001", kind="single", source="llm", segments=[seg_a], duration=30.0,
                hook="You betrayed me!", hook_line_id="L1", hook_type="conflict",
                cliffhanger="I had no choice.", cliffhanger_line_id="L5", cliffhanger_type="reveal",
                excerpt=["You betrayed me!", "Why would you do this?", "I had no choice."])

    p_b = Promo(pid="P002", kind="single", source="llm", segments=[seg_b], duration=26.0,
                hook="You betrayed me!", hook_line_id="L1", hook_type="conflict",
                cliffhanger="Why would you do this?", cliffhanger_line_id="L4", cliffhanger_type="reveal",
                excerpt=["You betrayed me!", "Why would you do this?"])

    p_c = Promo(pid="P003", kind="single", source="llm", segments=[seg_c], duration=30.0,
                hook="The battle is tomorrow.", hook_line_id="L8", hook_type="action",
                cliffhanger="We must be ready.", cliffhanger_line_id="L12", cliffhanger_type="preparation",
                excerpt=["The battle is tomorrow.", "We must be ready."])

    # A and B overlap by (38 - 12) / (40 - 10) = 26/30 = 86.7%
    is_dup, reason = is_duplicate_moment(p_a, p_b, time_threshold=0.60)
    assert is_dup is True
    assert "temporal overlap" in reason or "semantic" in reason
    assert _same_moment(p_a, p_b, thr=0.5) is True

    # A and C do not overlap at all (0%)
    is_dup_c, _ = is_duplicate_moment(p_a, p_c, time_threshold=0.60)
    assert is_dup_c is False
    assert _same_moment(p_a, p_c, thr=0.5) is False


def test_spoiler_restriction_enforcement():
    """Candidates from designated late payoff / spoiler episodes are flagged by deterministic rule evaluator."""
    promo_normal = {
        "pid": "P001",
        "episode": 3,
        "duration": 35.0,
        "segments": [{"episode": 3, "start": 10.0, "end": 45.0, "first_line": "E03_L01", "last_line": "E03_L08"}],
        "hook_line_id": "E03_L01",
        "hook": "Who is at the gate?",
        "cliffhanger": "Open the gates now!",
    }
    promo_spoiler = {
        "pid": "P002",
        "episode": 48,  # Designated spoiler episode
        "duration": 40.0,
        "segments": [{"episode": 48, "start": 5.0, "end": 45.0, "first_line": "E48_L01", "last_line": "E48_L09"}],
        "hook_line_id": "E48_L01",
        "hook": "The killer was the butler all along!",
        "cliffhanger": "Now you know the truth.",
    }

    eval_res = evaluate_rules(
        promos=[promo_normal, promo_spoiler],
        spoiler_episodes={47, 48, 49, 50},
    )
    assert eval_res.total_candidates == 2
    assert eval_res.passed_candidates == 1
    assert eval_res.failed_candidates == 1
    assert eval_res.rule_failures.get("spoiler_restrictions") == 1
    assert any(f.pid == "P002" and f.rule == "spoiler_restrictions" for f in eval_res.failures_list)


def test_invalid_screenplay_boundary_timestamps():
    """Negative start time or end before start triggers timestamp validity failure."""
    bad_time_promo = {
        "pid": "P099",
        "episode": 1,
        "duration": 30.0,
        "segments": [{"episode": 1, "start": 50.0, "end": 20.0, "first_line": "L01", "last_line": "L02"}],  # start > end!
        "hook_line_id": "L01",
    }
    eval_res = evaluate_rules(promos=[bad_time_promo])
    assert eval_res.passed_candidates == 0
    assert eval_res.rule_failures.get("timestamp_validity") == 1
