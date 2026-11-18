"""Comprehensive Regression Test Suite for HookScene (Feature 4, Section 4).
Verifies that all core functionality across the pipeline remains operational:
- Screenplay parsing & line model
- Candidate extraction (heuristics)
- Deterministic candidate validation & rule evaluation
- Dual-judge evaluation, weighted composite score, and divergence flagging
- Candidate ranking aggregation
- Review Desk approval / rejection workflow with failure reasons
- Failure analysis tracking & summary dashboard metrics
- Run consistency comparison (Jaccard overlap, Spearman rank correlation)
- All 5 export formats (CMX 3600 EDL, FCPXML 1.9, CSV, JSON, Markdown)
"""
from __future__ import annotations

import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
import pytest

from hookscene.core.parse import Episode, Line, parse_episode
from hookscene.core.schemas import RawCandidate, Promo, Segment
from hookscene.core.validate import build_single
from hookscene.core.heuristics import propose, detect_signals
from hookscene.core.stages import calculate_score_100, composite, check_judge_divergence
from hookscene.core.schemas import ScoreItem
from hookscene.eval.rules import evaluate_rules
from hookscene.eval.store import EvalStore
from hookscene.eval.schemas import HumanDecisionPayload
from hookscene.eval.failure_tracker import track_run_failures_and_metadata
from hookscene.eval.consistency import compare_runs_detailed, calculate_spearman_rho, temporal_iou
from hookscene.export import to_edl, to_fcpxml, to_csv, to_markdown, payload


@pytest.fixture
def sample_screenplay_episode() -> Episode:
    """Creates a sample 50-second episode with dialogue and action."""
    lines = [
        Line(id="E01_L001", ep=1, idx=1, scene=1, scene_heading="INT. STUDY - NIGHT",
             speaker=None, emotion=None, text="The door flies open.", kind="ACTION",
             start=0.5, end=2.0),
        Line(id="E01_L002", ep=1, idx=2, scene=1, scene_heading="INT. STUDY - NIGHT",
             speaker="VICTORIA", emotion="Furious", text="You cannot keep the truth from me anymore!", kind="DIALOGUE",
             start=2.5, end=6.5),
        Line(id="E01_L003", ep=1, idx=3, scene=1, scene_heading="INT. STUDY - NIGHT",
             speaker="ARTHUR", emotion="Cold", text="Some truths are meant to stay buried, Victoria.", kind="DIALOGUE",
             start=7.0, end=11.5),
        Line(id="E01_L004", ep=1, idx=4, scene=1, scene_heading="INT. STUDY - NIGHT",
             speaker="VICTORIA", emotion="Desperate", text="He was my brother! You swore you would protect him!", kind="DIALOGUE",
             start=12.0, end=18.0),
        Line(id="E01_L005", ep=1, idx=5, scene=1, scene_heading="INT. STUDY - NIGHT",
             speaker="ARTHUR", emotion="Whispering", text="And I did. Until he betrayed the entire realm.", kind="DIALOGUE",
             start=18.5, end=25.0),
        Line(id="E01_L006", ep=1, idx=6, scene=1, scene_heading="INT. STUDY - NIGHT",
             speaker="VICTORIA", emotion="Horrified", text="What did you do to him, Arthur?!", kind="DIALOGUE",
             start=25.5, end=32.0),
        Line(id="E01_L007", ep=1, idx=7, scene=1, scene_heading="INT. STUDY - NIGHT",
             speaker="ARTHUR", emotion="Commanding", text="Guards! Escort Lady Victoria to the high tower.", kind="DIALOGUE",
             start=32.5, end=38.0),
        Line(id="E01_L008", ep=1, idx=8, scene=1, scene_heading="INT. STUDY - NIGHT",
             speaker="VICTORIA", emotion="Screaming", text="You will pay for this!", kind="DIALOGUE",
             start=38.5, end=44.0),
    ]
    return Episode(num=1, logline="Victoria confronts Arthur.", continuity="", path="", lines=lines)


@pytest.fixture
def sample_promo() -> Promo:
    """Creates a sample evaluated Promo object for exports and ranking tests."""
    seg = Segment(episode=1, start=2.0, end=38.5, start_ts="00:02.00", end_ts="00:38.50",
                  first_line="E01_L002", last_line="E01_L007")
    return Promo(
        pid="P001",
        rank=1,
        kind="single",
        source="llm",
        segments=[seg],
        duration=36.5,
        hook='VICTORIA: "You cannot keep the truth from me anymore!"',
        hook_line_id="E01_L002",
        hook_type="conflict",
        cliffhanger='ARTHUR: "Guards! Escort Lady Victoria to the high tower."',
        cliffhanger_line_id="E01_L007",
        cliffhanger_type="ultimatum",
        primary_signal="conflict",
        signal_intensity=4,
        signals_detected=["conflict", "suspense"],
        open_question="What happened to Victoria's brother?",
        why="High stakes confrontation with sudden betrayal reveal",
        scores={"hook_3s": 5.0, "cliffhanger": 5.0, "standalone": 4.0, "intensity": 5.0, "plot_relevance": 4.0},
        composite=0.94,
        score_100=94,
        score_note="Strong hook and tense cliffhanger",
        rank_reason="Highest dramatic intensity across Episode 1",
        excerpt=[
            'E01_L002 00:02.50 VICTORIA: "You cannot keep the truth from me anymore!"',
            'E01_L007 00:32.50 ARTHUR: "Guards! Escort Lady Victoria to the high tower."',
        ],
    )


# 1. Screenplay parsing regression
def test_screenplay_parsing_regression(tmp_path):
    raw_script = """EPISODE NUMBER: Episode 5
EPISODE LOGLINE: The secret will is discovered.
CONTINUITY NOTES: Night storm.

--- SCRIPT START ---
SCENE 01
Scene heading: INT. PARLOR - NIGHT
**LADY ELEANOR (Cold):**
Start: (00:01.00) | End: (00:04.00)
"He left everything to his secret daughter."

**SOUND FX:**
Start: (00:04.20) | End: (00:06.00)
Thunder rolls outside.
--- SCRIPT END ---
"""
    f = tmp_path / "ep05.txt"
    f.write_text(raw_script, encoding="utf-8")
    ep = parse_episode(f)
    assert ep.num == 5
    assert ep.logline == "The secret will is discovered."
    assert len(ep.lines) == 2
    assert ep.lines[0].speaker == "LADY ELEANOR"
    assert ep.lines[0].kind == "DIALOGUE"
    assert ep.lines[1].kind == "SFX"
    assert ep.duration == 6.0
    assert ep.cut_ok(0.5) is True
    assert ep.cut_ok(2.0) is False  # inside speech


# 2. Candidate extraction regression
def test_candidate_extraction_regression(sample_screenplay_episode):
    rules = {
        "min_len_s": 20.0,
        "max_len_s": 60.0,
        "hook_window_s": 3.0,
        "lead_in_s": 0.5,
        "tail_s": 1.0,
        "react_s": 3.0,
    }
    cands = propose(sample_screenplay_episode, rules, per_episode=2)
    assert len(cands) >= 1
    c = cands[0]
    assert c.episode == 1
    assert c.start_line.startswith("E01_L")
    assert c.end_line.startswith("E01_L")
    assert c.hook_line.startswith("E01_L")
    assert c.cliffhanger_line.startswith("E01_L")
    assert c.primary_signal in ["conflict", "suspense", "action", "emotion", "relationship", "surprise"]


# 3. Deterministic validation regression
def test_deterministic_validation_regression(sample_screenplay_episode):
    rules = {
        "min_len_s": 20.0,
        "max_len_s": 60.0,
        "hook_window_s": 3.0,
        "lead_in_s": 0.5,
        "tail_s": 1.0,
        "react_s": 3.0,
        "max_per_episode": 2,
    }
    raw = RawCandidate(
        episode=1,
        start_line="E01_L002",
        hook_line="E01_L002",
        cliffhanger_line="E01_L007",
        end_line="E01_L007",
        hook_type="conflict",
        cliffhanger_type="ultimatum",
        open_question="Where is her brother?",
        why="High stakes confrontation",
    )
    p = build_single(raw, {1: sample_screenplay_episode}, rules, "llm", "P001")
    assert p.duration >= 20.0
    assert p.duration <= 60.0

    eval_result = evaluate_rules([p.model_dump()], episodes={1: sample_screenplay_episode})
    assert eval_result.passed_candidates == 1
    assert eval_result.pass_rate == 100.0


# 4. Dual-judge evaluation and weighted scoring regression
def test_dual_judge_and_weighted_scoring_regression():
    weights = {"hook_3s": 0.25, "cliffhanger": 0.25, "standalone": 0.20, "intensity": 0.20, "plot_relevance": 0.10}
    scores = {"hook_3s": 5.0, "cliffhanger": 5.0, "standalone": 4.0, "intensity": 5.0, "plot_relevance": 4.0}
    score_100 = calculate_score_100(scores, weights)
    assert score_100 == 94

    # Dual-judge consensus
    j1 = ScoreItem(id="P01", hook_3s=5.0, standalone=4.0, cliffhanger=5.0, intensity=5.0, plot_relevance=4.0, trope_fit=4.0)
    j2 = ScoreItem(id="P01", hook_3s=5.0, standalone=4.0, cliffhanger=5.0, intensity=4.0, plot_relevance=4.0, trope_fit=4.0)
    is_div, _ = check_judge_divergence([j1, j2])
    assert is_div is False

    # Dual-judge divergence (J1 hook=5.0, J2 hook=2.0)
    j3 = ScoreItem(id="P01", hook_3s=2.0, standalone=4.0, cliffhanger=5.0, intensity=4.0, plot_relevance=4.0, trope_fit=4.0)
    is_div_flag, div_info = check_judge_divergence([j1, j3])
    assert is_div_flag is True
    assert "hook_3s" in div_info["differing_criteria"]


# 5. Review Desk approval and rejection workflows
def test_review_desk_workflows(tmp_path):
    store = EvalStore(db_path=tmp_path / "test.db")
    # Human rejection with failure category and reviewer comment
    dec_rej = HumanDecisionPayload(
        run_id="run-01",
        candidate_id="P002",
        decision="rejected",
        category="weak_hook",
        comment="Hook line lacks sharp confrontation",
    )
    store.record_human_decision(dec_rej)
    failures = store.list_failures(run_id="run-01", source="human_review")
    assert len(failures) == 1
    assert failures[0].candidate_id == "P002"
    assert failures[0].category == "weak_hook"
    assert failures[0].reviewer_comment == "Hook line lacks sharp confrontation"

    # Human changes mind and approves candidate
    dec_app = HumanDecisionPayload(run_id="run-01", candidate_id="P002", decision="approved")
    store.record_human_decision(dec_app)
    human_failures = store.list_failures(run_id="run-01", source="human_review")
    assert len(human_failures) == 0


# 6. Failure analysis tracking regression
def test_failure_analysis_tracking_regression(tmp_path):
    store = EvalStore(db_path=tmp_path / "test.db")
    fake_run = {
        "run_id": "run-test-fa",
        "show": "Test Show",
        "promos": [{"pid": "P01", "duration": 40.0, "segments": [{"episode": 1, "start": 10.0, "end": 50.0}]}],
        "rejected": [
            {"episode": 1, "start_line": "L1", "end_line": "L2", "hook_line": "L1", "cliffhanger_line": "L2", "reason": "too short: 12.0s"},
            {"episode": 2, "start_line": "L3", "end_line": "L4", "hook_line": "L3", "cliffhanger_line": "L4", "reason": "hook does not start within first 3s"},
        ],
        "eval_summary": {
            "rule_evaluation": {"rule_failures": {"duration_compliance": 1, "hook_window": 1}},
            "independent_editorial": {"records": []},
        },
    }
    track_run_failures_and_metadata("run-test-fa", fake_run, store=store)
    summary = store.get_failure_analysis_summary(run_id="run-test-fa")
    assert summary.total_rejected >= 2
    assert summary.automatic_validation_count >= 2
    assert len(summary.failures) >= 2


# 7. Run consistency comparison regression
def test_run_consistency_comparison_regression(tmp_path):
    store = EvalStore(db_path=tmp_path / "test.db")
    run_a = {
        "run_id": "run-A",
        "show": "Show X",
        "promos": [
            {"pid": "P01", "duration": 35.0, "score_100": 92, "rank": 1, "segments": [{"episode": 1, "start": 10.0, "end": 45.0, "first_line": "L1", "last_line": "L8"}]},
            {"pid": "P02", "duration": 40.0, "score_100": 85, "rank": 2, "segments": [{"episode": 2, "start": 5.0, "end": 45.0, "first_line": "L1", "last_line": "L9"}]},
            {"pid": "P03", "duration": 30.0, "score_100": 78, "rank": 3, "segments": [{"episode": 3, "start": 15.0, "end": 45.0, "first_line": "L1", "last_line": "L7"}]},
        ],
        "rejected": [],
    }
    run_b = {
        "run_id": "run-B",
        "show": "Show X",
        "promos": [
            {"pid": "P01", "duration": 35.0, "score_100": 90, "rank": 1, "segments": [{"episode": 1, "start": 11.0, "end": 45.0, "first_line": "L1", "last_line": "L8"}]},
            {"pid": "P02", "duration": 40.0, "score_100": 84, "rank": 2, "segments": [{"episode": 2, "start": 5.0, "end": 45.0, "first_line": "L1", "last_line": "L9"}]},
            {"pid": "P03", "duration": 30.0, "score_100": 79, "rank": 3, "segments": [{"episode": 3, "start": 15.0, "end": 45.0, "first_line": "L1", "last_line": "L7"}]},
        ],
        "rejected": [],
    }
    track_run_failures_and_metadata("run-A", run_a, store=store)
    track_run_failures_and_metadata("run-B", run_b, store=store)

    comp = compare_runs_detailed(run_a, run_b, run_a_id="run-A", run_b_id="run-B", store=store)
    assert comp.jaccard_consistency >= 90.0
    assert comp.spearman_rank_correlation == 1.0
    assert comp.common_count == 3
    assert len(comp.common_candidates) == 3
    assert all(c.rank_delta == 0 for c in comp.common_candidates)


# 8. All 5 Export formats regression
def test_all_export_formats_regression(sample_promo):
    res_dict = {
        "promos": [sample_promo],
        "montages": [],
        "all_candidates": [sample_promo],
        "rejected": [],
        "run_log": {
            "mode": "llm",
            "episodes": 1,
            "lines": 8,
            "candidates_valid": 1,
            "candidates_rejected": 0,
            "final_promos": 1,
            "montages": 0,
        },
        "show_summary": None,
    }

    # Format 1: CMX 3600 EDL
    edl_text = to_edl(res_dict, "Broken Soldier")
    assert "TITLE: Broken Soldier" in edl_text
    assert "FCM: NON-DROP FRAME" in edl_text
    assert "001  AX       V     C" in edl_text
    assert "* FROM CLIP: EP_1_P001" in edl_text

    # Format 2: Apple Final Cut Pro XML 1.9
    fcpxml_text = to_fcpxml(res_dict, "Broken Soldier")
    assert '<?xml version="1.0" encoding="UTF-8"?>' in fcpxml_text
    assert '<fcpxml version="1.9">' in fcpxml_text
    assert '<event name="Broken Soldier Promos">' in fcpxml_text
    assert '<project name="Promo Timeline">' in fcpxml_text
    # Verify XML parses without syntax errors
    root = ET.fromstring(fcpxml_text)
    assert root.tag == "fcpxml"

    # Format 3: CSV
    csv_text = to_csv(res_dict)
    assert "rank,type,id,segments,duration_s,hook,hook_type" in csv_text
    assert "P001" in csv_text
    assert "36.5" in csv_text

    # Format 4: Markdown
    md_text = to_markdown(res_dict, "Broken Soldier")
    assert "# Promo picks — Broken Soldier" in md_text
    assert "## #1 — P001" in md_text
    assert "You cannot keep the truth" in md_text

    # Format 5: JSON payload
    out_payload = payload(res_dict, "Broken Soldier", episode_durations={1: 50.0})
    assert out_payload["show"] == "Broken Soldier"
    assert len(out_payload["promos"]) == 1
    assert out_payload["promos"][0]["pid"] == "P001"
    assert out_payload["promos"][0]["score_100"] == 94
