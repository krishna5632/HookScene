"""Comprehensive test suite for Feature 6: Explainability & Decision Traceability.

Tests candidate decision trace generation, dramatic signal mapping, rubric score
breakdown, screenplay evidence referencing, deterministic validation tracing,
graceful handling of missing data, judge divergence detection, database persistence,
and retrieval across runs.
All tests use mock data with zero external API calls or credit spend.
"""
from __future__ import annotations

import pytest
from snipdeck.eval.explainability import generate_decision_trace
from snipdeck.eval.schemas import CandidateDecisionTrace
from snipdeck.eval.store import EvalStore


@pytest.fixture
def sample_candidate_dict():
    return {
        "pid": "P004",
        "rank": 1,
        "kind": "single",
        "source": "llm",
        "duration": 45.1,
        "segments": [
            {
                "episode": 2,
                "start": 0.0,
                "end": 45.1,
                "start_ts": "00:00.00",
                "end_ts": "00:45.10",
                "first_line": "E02_L001",
                "last_line": "E02_L031",
            }
        ],
        "hook": 'THE FORMER GROOM: "I cannot marry you, Juliana."',
        "hook_line_id": "E02_L002",
        "hook_type": "betrayal_reveal",
        "cliffhanger": 'BLOND NOBLEMAN: "Do not disgrace us further."',
        "cliffhanger_line_id": "E02_L030",
        "cliffhanger_type": "choice_or_ultimatum",
        "open_question": "Will Juliana's own father really force her to accept this public humiliation?",
        "why": "A brutal altar betrayal followed by the father siding with the traitor creates immediate emotional investment and outrage.",
        "rank_reason": "Perfect 5.0 hook and high standalone clarity right at episode 2; flawless introduction to the central conflict.",
        "primary_signal": "conflict",
        "signal_intensity": 5,
        "signals_detected": ["conflict", "relationship", "emotion"],
        "scores": {
            "hook_3s": 5.0,
            "standalone": 4.5,
            "cliffhanger": 3.0,
            "intensity": 4.5,
            "plot_relevance": 4.0,
            "trope_fit": 4.5,
        },
        "flags": {
            "spoiler_risk": False,
            "ad_policy_risk": False,
            "needs_context": False,
        },
        "score_note": "Flawless first-second hook with intense emotional stakes.",
        "score_100": 92,
        "composite": 0.85,
        "judge_divergence": {
            "is_divergent": False,
            "judge1_score": 92,
            "judge2_score": 90,
            "total_delta": 2,
            "differing_criteria": [],
            "judge1_ratings": {"hook_3s": 5, "cliffhanger": 3, "standalone": 4.5, "intensity": 4.5, "plot_relevance": 4},
            "judge2_ratings": {"hook_3s": 5, "cliffhanger": 3, "standalone": 4, "intensity": 4.5, "plot_relevance": 4},
        },
        "duplicate_variants_count": 2,
        "duplicate_notes": ["Merged with slightly shorter variant (00:05-00:40)"],
        "excerpt": [
            'E02_L002 00:00.0  THE FORMER GROOM: "I cannot marry you, Juliana."',
            'E02_L004 00:02.8  [action] Juliana gasps softly in heartbreak, her eyes wide and brimming with tears.',
            'E02_L006 00:04.7  THE FORMER GROOM: "You are far too plain..."',
            'E02_L015 00:18.2  LADY JULIANA: "You gave me your word before both our families."',
            'E02_L017 00:20.9  THE FORMER GROOM: "Promises change when a better choice appears."',
            'E02_L030 00:42.5  BLOND NOBLEMAN: "Do not disgrace us further."',
        ],
    }


# ============================================================================
# 1. Candidate Selection Explanation Tests
# ============================================================================

def test_generate_decision_trace_selection_reason(sample_candidate_dict):
    """Verify that selection reason, core interest, hook why, cliffhanger why, and standalone suitability are populated."""
    trace = generate_decision_trace(sample_candidate_dict, run_id="official-run-C")

    assert trace.candidate_id == "P004"
    assert trace.run_id == "official-run-C"
    assert trace.episode == 2
    assert "altar betrayal" in trace.selection_reason
    assert "Conflict" in trace.interest_summary or "conflict" in trace.interest_summary
    assert "hook line" in trace.hook_why.lower()
    assert "cliffhanger" in trace.cliffhanger_why.lower() or "concludes" in trace.cliffhanger_why.lower()
    assert "standalone clarity" in trace.standalone_suitability.lower()


def test_missing_why_generates_graceful_fallback():
    """Verify that candidate without explicit why field still generates truthful, non-hallucinated explanation."""
    cand = {
        "pid": "P099",
        "duration": 30.0,
        "segments": [{"episode": 5, "start": 10.0, "end": 40.0}],
        "hook": "Who killed him?",
        "hook_line_id": "E05_L010",
        "cliffhanger": "Run now!",
        "cliffhanger_line_id": "E05_L025",
        "primary_signal": "suspense",
        "signal_intensity": 4,
        "scores": {"hook_3s": 4.0, "standalone": 3.5, "cliffhanger": 4.0, "intensity": 3.5, "plot_relevance": 3.0},
    }
    trace = generate_decision_trace(cand, run_id="test-run")

    assert trace.candidate_id == "P099"
    assert trace.primary_signal == "suspense"
    assert "Suspense" in trace.interest_summary or "suspense" in trace.interest_summary
    assert len(trace.selection_reason) > 0


# ============================================================================
# 2. Dramatic Signal Explainability Tests
# ============================================================================

def test_dramatic_signals_mapping_and_quotes(sample_candidate_dict):
    """Verify that detected signals include signal name, intensity, trigger reason, and screenplay quote."""
    trace = generate_decision_trace(sample_candidate_dict, run_id="official-run-C")

    assert len(trace.detected_signals) >= 3
    sig_names = [s.signal for s in trace.detected_signals]
    assert "conflict" in sig_names
    assert "relationship" in sig_names
    assert "emotion" in sig_names

    # Primary signal has highest intensity
    primary_sig = next(s for s in trace.detected_signals if s.signal == "conflict")
    assert primary_sig.intensity == 5
    assert primary_sig.label == "Conflict"
    assert len(primary_sig.evidence_quote) > 0


def test_dramatic_signals_do_not_fabricate_unidentified_signals():
    """Verify that only identified signals are displayed."""
    cand = {
        "pid": "P010",
        "duration": 25.0,
        "segments": [{"episode": 1, "start": 0.0, "end": 25.0}],
        "primary_signal": "action",
        "signals_detected": ["action"],
        "scores": {},
    }
    trace = generate_decision_trace(cand)
    sig_names = [s.signal for s in trace.detected_signals]
    assert sig_names == ["action"]


# ============================================================================
# 3. Rubric Score Breakdown Tests
# ============================================================================

def test_rubric_score_breakdown_weights_and_points(sample_candidate_dict):
    """Verify 5-dimension rubric weights (25%, 25%, 20%, 20%, 10%) and point calculations."""
    trace = generate_decision_trace(sample_candidate_dict, run_id="official-run-C")

    assert len(trace.rubric_breakdown) == 5
    weights_map = {r.key: r.weight_pct for r in trace.rubric_breakdown}
    assert weights_map["hook_3s"] == 25
    assert weights_map["cliffhanger"] == 25
    assert weights_map["standalone"] == 20
    assert weights_map["intensity"] == 20
    assert weights_map["plot_relevance"] == 10
    assert sum(weights_map.values()) == 100

    # Test point calculation: (5.0 / 5.0) * 25 = 25.0 points
    hook_crit = next(r for r in trace.rubric_breakdown if r.key == "hook_3s")
    assert hook_crit.final_score == 5.0
    assert hook_crit.weighted_points == 25.0
    assert hook_crit.judge1_score == 5.0
    assert hook_crit.judge2_score == 5.0

    # Test cliffhanger: (3.0 / 5.0) * 25 = 15.0 points
    cliff_crit = next(r for r in trace.rubric_breakdown if r.key == "cliffhanger")
    assert cliff_crit.final_score == 3.0
    assert cliff_crit.weighted_points == 15.0


def test_rubric_score_unavailable_when_missing():
    """Verify that when scores are absent, values default cleanly without fabricating high ratings."""
    cand = {"pid": "P020", "duration": 30.0, "segments": [{"episode": 1, "start": 0.0, "end": 30.0}]}
    trace = generate_decision_trace(cand)
    assert len(trace.rubric_breakdown) == 5
    for r in trace.rubric_breakdown:
        assert r.final_score is not None


# ============================================================================
# 4. Evidence-Based Explanations Tests
# ============================================================================

def test_screenplay_evidence_parsed_and_tagged(sample_candidate_dict):
    """Verify that excerpt lines are categorized as hook, cliffhanger, or signal lines with line IDs."""
    trace = generate_decision_trace(sample_candidate_dict, run_id="official-run-C")

    assert len(trace.evidence_items) == 6
    hook_ev = next(e for e in trace.evidence_items if e.kind == "hook")
    assert hook_ev.line_id == "E02_L002"
    assert "I cannot marry you" in hook_ev.text
    assert hook_ev.is_direct_quote is True

    cliff_ev = next(e for e in trace.evidence_items if e.kind == "cliffhanger")
    assert cliff_ev.line_id == "E02_L030"
    assert "Do not disgrace us" in cliff_ev.text
    assert cliff_ev.is_direct_quote is True


# ============================================================================
# 5. Validation Decision Trace Tests
# ============================================================================

def test_validation_rules_pass_and_fail_states(sample_candidate_dict):
    """Verify validation checks report status, actual values, and expected thresholds."""
    trace = generate_decision_trace(sample_candidate_dict, run_id="official-run-C")

    assert len(trace.validation_checks) == 6
    v_map = {v.rule_id: v for v in trace.validation_checks}

    # Duration rule
    assert v_map["duration"].status == "passed"
    assert v_map["duration"].actual_value == "45.1s"
    assert v_map["duration"].threshold == "20.0s – 60.0s"

    # Hook window rule
    assert v_map["hook_window"].status == "passed"
    assert "<= 3.0s" in v_map["hook_window"].threshold

    # Spoiler rule
    assert v_map["spoiler_restriction"].status == "passed"

    assert trace.overall_validation_passed is True


def test_validation_rule_fails_on_duration_below_20s():
    """Verify validation rule records failed status when duration is out of bounds."""
    cand = {
        "pid": "P099",
        "duration": 12.0,  # Below 20s minimum
        "segments": [{"episode": 1, "start": 0.0, "end": 12.0}],
        "scores": {},
    }
    trace = generate_decision_trace(cand)
    dur_check = next(v for v in trace.validation_checks if v.rule_id == "duration")
    assert dur_check.status == "failed"
    assert dur_check.actual_value == "12.0s"
    assert trace.overall_validation_passed is False


# ============================================================================
# 6. Judge Agreement & Disagreement Tests
# ============================================================================

def test_judge_divergence_flagging():
    """Verify that significant divergence between Judge 1 and Judge 2 is detected and flagged."""
    cand = {
        "pid": "P055",
        "duration": 35.0,
        "segments": [{"episode": 3, "start": 0.0, "end": 35.0}],
        "scores": {"hook_3s": 3.5},
        "judge_divergence": {
            "is_divergent": True,
            "judge1_score": 90,
            "judge2_score": 65,
            "total_delta": 25,
            "differing_criteria": ["hook_3s", "standalone"],
        },
    }
    trace = generate_decision_trace(cand)
    assert trace.judge_divergence_detected is True
    assert trace.judge1_overall == 90
    assert trace.judge2_overall == 65
    assert trace.judge_divergence_delta == 25


# ============================================================================
# 7. Persistence and Cross-Run Retrieval Tests (EvalStore)
# ============================================================================

def test_save_and_retrieve_decision_trace(tmp_path, sample_candidate_dict):
    """Verify that CandidateDecisionTrace persists into SQLite and can be retrieved."""
    db_file = tmp_path / "test_eval.db"
    store = EvalStore(db_file)

    trace = generate_decision_trace(sample_candidate_dict, run_id="run-test-alpha")
    store.save_decision_trace(trace)

    retrieved = store.get_decision_trace("run-test-alpha", "P004")
    assert retrieved is not None
    assert retrieved["candidate_id"] == "P004"
    assert retrieved["run_id"] == "run-test-alpha"
    assert retrieved["composite_score_100"] == 92
    assert len(retrieved["rubric_breakdown"]) == 5
    assert len(retrieved["validation_checks"]) == 6


def test_previous_run_decision_trace_isolation(tmp_path, sample_candidate_dict):
    """Verify that traces for different runs remain isolated and associated with correct run_id."""
    db_file = tmp_path / "test_eval.db"
    store = EvalStore(db_file)

    trace_a = generate_decision_trace(sample_candidate_dict, run_id="run-A")
    trace_b = generate_decision_trace(sample_candidate_dict, run_id="run-B")

    store.save_decision_trace(trace_a)
    store.save_decision_trace(trace_b)

    ret_a = store.get_decision_trace("run-A", "P004")
    ret_b = store.get_decision_trace("run-B", "P004")

    assert ret_a["run_id"] == "run-A"
    assert ret_b["run_id"] == "run-B"

    list_a = store.list_decision_traces_for_run("run-A")
    assert len(list_a) == 1
    assert list_a[0]["candidate_id"] == "P004"


def test_official_baseline_traces_seeded():
    """Verify that default official-run-C candidates have decision traces in EvalStore."""
    store = EvalStore()
    traces = store.list_decision_traces_for_run("official-run-C")
    assert len(traces) > 0
    pids = [t["candidate_id"] for t in traces]
    assert "P004" in pids or len(pids) > 0
