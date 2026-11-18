"""Run Consistency & Reproducibility Evaluator for HookScene.
Compares two runs on candidate counts, common/new/missing candidates, line spans,
ranking shifts, Jaccard overlap, score stability, Spearman rank correlation, and timing deltas.
"""
from __future__ import annotations

from typing import Any
from .schemas import (
    CandidateMatch,
    CandidateMatchDetail,
    DetailedRunComparison,
    RankingChange,
    RunConsistencyResult,
    RunMetadata,
)
from .store import EvalStore


def temporal_iou(a_start: float, a_end: float, b_start: float, b_end: float) -> float:
    """Calculate temporal Intersection over Union between two intervals."""
    inter = max(0.0, min(a_end, b_end) - max(a_start, b_start))
    union = (a_end - a_start) + (b_end - b_start) - inter
    return round(inter / union, 3) if union > 0 else 0.0


def same_moment(promo_a: dict[str, Any], promo_b: dict[str, Any], iou_threshold: float = 0.5) -> tuple[bool, float]:
    """Check if two promo candidates represent the same moment in the same episode."""
    seg_a = promo_a.get("segments", [{}])[0]
    seg_b = promo_b.get("segments", [{}])[0]

    ep_a = seg_a.get("episode")
    ep_b = seg_b.get("episode")

    if ep_a is None or ep_b is None or ep_a != ep_b:
        return False, 0.0

    # Also check exact line ID overlap if present
    h_a = promo_a.get("hook_line_id")
    h_b = promo_b.get("hook_line_id")
    c_a = promo_a.get("cliffhanger_line_id")
    c_b = promo_b.get("cliffhanger_line_id")

    if h_a and h_b and h_a == h_b and c_a and c_b and c_a == c_b:
        return True, 1.0

    iou = temporal_iou(
        float(seg_a.get("start", 0)),
        float(seg_a.get("end", 0)),
        float(seg_b.get("start", 0)),
        float(seg_b.get("end", 0)),
    )
    return iou >= iou_threshold, iou


def compare_runs(
    run_a: dict[str, Any],
    run_b: dict[str, Any],
    run_a_id: str = "run_1",
    run_b_id: str = "run_2",
    iou_threshold: float = 0.5,
) -> RunConsistencyResult:
    """Compare two pipeline runs and compute Jaccard consistency overlap and ranking changes."""
    promos_a: list[dict[str, Any]] = run_a.get("promos") or []
    promos_b: list[dict[str, Any]] = run_b.get("promos") or []

    count_a = len(promos_a)
    count_b = len(promos_b)

    common_matches: list[CandidateMatch] = []
    matched_b_indices: set[int] = set()

    for idx_a, pa in enumerate(promos_a):
        best_match_idx = -1
        best_iou = 0.0

        for idx_b, pb in enumerate(promos_b):
            if idx_b in matched_b_indices:
                continue
            is_same, score_iou = same_moment(pa, pb, iou_threshold)
            if is_same and score_iou > best_iou:
                best_iou = score_iou
                best_match_idx = idx_b

        if best_match_idx >= 0:
            pb = promos_b[best_match_idx]
            matched_b_indices.add(best_match_idx)

            sa = pa.get("segments", [{}])[0]
            sb = pb.get("segments", [{}])[0]
            ep = int(sa.get("episode", 1))

            rank_a = pa.get("rank", idx_a + 1)
            rank_b = pb.get("rank", best_match_idx + 1)
            score_a = float(pa.get("score_100") or round(float(pa.get("composite", 0.8)) * 100))
            score_b = float(pb.get("score_100") or round(float(pb.get("composite", 0.8)) * 100))

            span_a = f"{sa.get('start', 0):.1f}s-{sa.get('end', 0):.1f}s"
            span_b = f"{sb.get('start', 0):.1f}s-{sb.get('end', 0):.1f}s"

            common_matches.append(
                CandidateMatch(
                    pid_a=str(pa.get("pid", f"A_{idx_a}")),
                    pid_b=str(pb.get("pid", f"B_{best_match_idx}")),
                    episode=ep,
                    iou=round(best_iou, 2),
                    span_a=span_a,
                    span_b=span_b,
                    rank_a=rank_a,
                    rank_b=rank_b,
                    score_a=score_a,
                    score_b=score_b,
                    rank_delta=(rank_a - rank_b) if rank_a and rank_b else 0,
                    score_delta=round(score_a - score_b, 1),
                )
            )

    common_count = len(common_matches)
    # Total unique candidates across both runs: Count(A) + Count(B) - Common
    unique_count = max(1, count_a + count_b - common_count)

    # Consistency formula: (Common / Unique) * 100
    consistency_pct = round((common_count / unique_count) * 100.0, 1)

    label = "High" if consistency_pct >= 70.0 else "Moderate" if consistency_pct >= 40.0 else "Low"

    # Ranking changes summary
    ranking_changes: list[RankingChange] = []
    for m in common_matches:
        if m.rank_a and m.rank_b:
            if m.rank_a < m.rank_b:
                direction = "improved"
            elif m.rank_a > m.rank_b:
                direction = "dropped"
            else:
                direction = "unchanged"
            ranking_changes.append(
                RankingChange(
                    pid=m.pid_a,
                    episode=m.episode,
                    rank_run_a=m.rank_a,
                    rank_run_b=m.rank_b,
                    rank_delta=abs(m.rank_a - m.rank_b),
                    direction=direction,
                )
            )

    return RunConsistencyResult(
        run_a_id=run_a_id,
        run_b_id=run_b_id,
        run_a_count=count_a,
        run_b_count=count_b,
        common_candidates_count=common_count,
        unique_candidates_count=unique_count,
        consistency_score=consistency_pct,
        common_matches=common_matches,
        ranking_changes=ranking_changes,
        consistency_label=label,
        disclaimer="Consistency reflects algorithmic repeatability across runs, not necessarily correctness.",
    )


def calculate_spearman_rho(ranks_a: list[int], ranks_b: list[int]) -> tuple[float | None, str]:
    """Calculate Spearman rank correlation coefficient rho between two sets of ranks."""
    n = len(ranks_a)
    if n < 3:
        return None, f"Insufficient matched candidates (N={n} < 3) to compute Spearman rank correlation."

    d_sq_sum = sum((ra - rb) ** 2 for ra, rb in zip(ranks_a, ranks_b))
    rho = 1.0 - (6.0 * d_sq_sum) / (n * (n * n - 1))
    rho_clamped = max(-1.0, min(1.0, round(rho, 3)))

    if rho_clamped >= 0.7:
        note = f"High ranking agreement (rho={rho_clamped:+.3f}, N={n})"
    elif rho_clamped >= 0.4:
        note = f"Moderate ranking agreement (rho={rho_clamped:+.3f}, N={n})"
    elif rho_clamped >= 0.0:
        note = f"Low ranking agreement (rho={rho_clamped:+.3f}, N={n})"
    else:
        note = f"Negative ranking agreement (rho={rho_clamped:+.3f}, N={n})"
    return rho_clamped, note


def compare_runs_detailed(
    run_a: dict[str, Any],
    run_b: dict[str, Any],
    run_a_id: str = "run_1",
    run_b_id: str = "run_2",
    iou_threshold: float = 0.5,
    store: EvalStore | None = None,
) -> DetailedRunComparison:
    """Comprehensive comparison between two completed runs."""
    promos_a: list[dict[str, Any]] = run_a.get("promos") or []
    promos_b: list[dict[str, Any]] = run_b.get("promos") or []

    count_a = len(promos_a)
    count_b = len(promos_b)

    common_matches: list[CandidateMatchDetail] = []
    matched_b_indices: set[int] = set()
    matched_a_indices: set[int] = set()

    ranks_a: list[int] = []
    ranks_b: list[int] = []
    abs_score_deltas: list[float] = []

    for idx_a, pa in enumerate(promos_a):
        best_match_idx = -1
        best_iou = 0.0

        for idx_b, pb in enumerate(promos_b):
            if idx_b in matched_b_indices:
                continue
            is_same, score_iou = same_moment(pa, pb, iou_threshold)
            if is_same and score_iou > best_iou:
                best_iou = score_iou
                best_match_idx = idx_b

        if best_match_idx >= 0:
            pb = promos_b[best_match_idx]
            matched_b_indices.add(best_match_idx)
            matched_a_indices.add(idx_a)

            sa = pa.get("segments", [{}])[0]
            sb = pb.get("segments", [{}])[0]
            ep = int(sa.get("episode", 1))

            start_a = float(sa.get("start", 0))
            end_a = float(sa.get("end", 0))
            start_b = float(sb.get("start", 0))
            end_b = float(sb.get("end", 0))

            rank_a = pa.get("rank", idx_a + 1)
            rank_b = pb.get("rank", best_match_idx + 1)
            ranks_a.append(rank_a)
            ranks_b.append(rank_b)

            score_a = float(pa.get("score_100") or round(float(pa.get("composite", 0.8)) * 100))
            score_b = float(pb.get("score_100") or round(float(pb.get("composite", 0.8)) * 100))
            abs_score_deltas.append(abs(score_a - score_b))

            span_a = f"{start_a:.1f}s-{end_a:.1f}s"
            span_b = f"{start_b:.1f}s-{end_b:.1f}s"

            common_matches.append(
                CandidateMatchDetail(
                    pid_a=str(pa.get("pid", f"A_{idx_a}")),
                    pid_b=str(pb.get("pid", f"B_{best_match_idx}")),
                    episode=ep,
                    iou=round(best_iou, 2),
                    span_a=span_a,
                    span_b=span_b,
                    start_a=start_a,
                    end_a=end_a,
                    start_b=start_b,
                    end_b=end_b,
                    delta_start=round(start_b - start_a, 2),
                    delta_end=round(end_b - end_a, 2),
                    rank_a=rank_a,
                    rank_b=rank_b,
                    score_a=score_a,
                    score_b=score_b,
                    rank_delta=(rank_a - rank_b) if rank_a and rank_b else 0,
                    score_delta=round(score_a - score_b, 1),
                )
            )

    common_count = len(common_matches)
    unique_count = max(1, count_a + count_b - common_count)
    jaccard_consistency = round((common_count / unique_count) * 100.0, 1) if unique_count > 0 else 0.0

    avg_score_diff = round(sum(abs_score_deltas) / len(abs_score_deltas), 2) if abs_score_deltas else 0.0
    spearman_rho, spearman_note = calculate_spearman_rho(ranks_a, ranks_b)

    # Missing candidates (Run A only)
    missing_candidates = []
    for idx_a, pa in enumerate(promos_a):
        if idx_a not in matched_a_indices:
            sa = pa.get("segments", [{}])[0]
            missing_candidates.append({
                "pid": pa.get("pid", f"A_{idx_a}"),
                "episode": sa.get("episode", 1),
                "rank": pa.get("rank", idx_a + 1),
                "score": float(pa.get("score_100") or round(float(pa.get("composite", 0.8)) * 100)),
                "duration": pa.get("duration", 0.0),
                "hook": pa.get("hook", ""),
            })

    # Newly appearing candidates (Run B only)
    new_candidates = []
    for idx_b, pb in enumerate(promos_b):
        if idx_b not in matched_b_indices:
            sb = pb.get("segments", [{}])[0]
            new_candidates.append({
                "pid": pb.get("pid", f"B_{idx_b}"),
                "episode": sb.get("episode", 1),
                "rank": pb.get("rank", idx_b + 1),
                "score": float(pb.get("score_100") or round(float(pb.get("composite", 0.8)) * 100)),
                "duration": pb.get("duration", 0.0),
                "hook": pb.get("hook", ""),
            })

    # Metadata & Config Difference Checking
    meta_a = None
    meta_b = None
    if store is not None:
        meta_a = store.get_run_metadata(run_a_id)
        meta_b = store.get_run_metadata(run_b_id)

    config_differs = False
    config_diff_reasons = []

    if meta_a and meta_b:
        if meta_a.model_provider != meta_b.model_provider or meta_a.model_version != meta_b.model_version:
            config_differs = True
            config_diff_reasons.append(
                f"Model differs: '{meta_a.model_provider}/{meta_a.model_version}' vs '{meta_b.model_provider}/{meta_b.model_version}'"
            )
        if meta_a.prompt_version != meta_b.prompt_version:
            config_differs = True
            config_diff_reasons.append(f"Prompt version differs: '{meta_a.prompt_version}' vs '{meta_b.prompt_version}'")
        if meta_a.temperature != meta_b.temperature:
            config_differs = True
            config_diff_reasons.append(f"Temperature differs: {meta_a.temperature} vs {meta_b.temperature}")
        if meta_a.screenplay_hash and meta_b.screenplay_hash and meta_a.screenplay_hash != meta_b.screenplay_hash:
            config_differs = True
            config_diff_reasons.append("Screenplay content hash mismatch between runs")
    elif "baseline" in run_a_id.lower() or "baseline" in run_b_id.lower():
        config_differs = True
        config_diff_reasons.append("Configuration differs: Comparing LLM pipeline run with deterministic rule baseline.")

    return DetailedRunComparison(
        run_a_id=run_a_id,
        run_b_id=run_b_id,
        run_a_metadata=meta_a,
        run_b_metadata=meta_b,
        config_differs=config_differs,
        config_diff_reasons=config_diff_reasons,
        run_a_count=count_a,
        run_b_count=count_b,
        common_count=common_count,
        unique_count=unique_count,
        jaccard_consistency=jaccard_consistency,
        avg_score_diff=avg_score_diff,
        spearman_rank_correlation=spearman_rho,
        spearman_note=spearman_note,
        common_candidates=common_matches,
        new_candidates=new_candidates,
        missing_candidates=missing_candidates,
        disclaimer="Consistency reflects algorithmic repeatability across runs, not correctness.",
    )

