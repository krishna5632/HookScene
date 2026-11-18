"""Deterministic Rule Evaluator for HookScene.
Evaluates candidate promos against editorial constraints without calling any LLM.
"""
from __future__ import annotations

from typing import Any
from .schemas import RuleEvaluationResult, RuleFailure


DEFAULT_RULES = {
    "min_len_s": 20.0,
    "max_len_s": 60.0,
    "hook_window_s": 3.0,
    "max_per_episode": 2,
    "spoiler_episodes": set(),
}


def evaluate_rules(
    promos: list[dict[str, Any]],
    episodes: dict[int, Any] | None = None,
    rules: dict[str, Any] | None = None,
    spoiler_episodes: set[int] | list[int] | None = None,
) -> RuleEvaluationResult:
    """Evaluate deterministic technical correctness rules on a list of candidate promo dicts."""
    cfg = dict(DEFAULT_RULES)
    if rules:
        cfg.update(rules)

    spoilers = set(spoiler_episodes or cfg.get("spoiler_episodes") or [])
    eps = episodes or {}

    total = len(promos)
    if total == 0:
        return RuleEvaluationResult(
            total_candidates=0,
            passed_candidates=0,
            failed_candidates=0,
            pass_rate=100.0,
            rule_failures={},
            failures_list=[],
        )

    failures: list[RuleFailure] = []
    rule_counts: dict[str, int] = {
        "duration_compliance": 0,
        "hook_window": 0,
        "timestamp_validity": 0,
        "line_ids_valid": 0,
        "boundary_compliance": 0,
        "spoiler_restrictions": 0,
        "duplicate_suppression": 0,
    }

    failed_pids: set[str] = set()

    # Track singles per episode for overlap & count checks
    singles: list[dict[str, Any]] = []

    for p in promos:
        pid = str(p.get("pid", "unknown"))
        duration = float(p.get("duration", 0.0))
        kind = p.get("kind", "single")
        segments = p.get("segments", [])
        hook_line_id = str(p.get("hook_line_id") or "")
        cliff_line_id = str(p.get("cliffhanger_line_id") or "")

        promo_failed_before = len(failures)

        # 1. Duration compliance (20.0s - 60.0s)
        min_len = cfg["min_len_s"]
        max_len = cfg["max_len_s"]
        if not (min_len - 1e-4 <= duration <= max_len + 1e-4):
            msg = f"Duration {duration:.1f}s outside bounds ({min_len}s - {max_len}s)"
            failures.append(RuleFailure(pid=pid, rule="duration_compliance", message=msg))
            rule_counts["duration_compliance"] += 1

        # 2. Timestamp validity
        if not segments:
            msg = "Missing segment timestamps"
            failures.append(RuleFailure(pid=pid, rule="timestamp_validity", message=msg))
            rule_counts["timestamp_validity"] += 1
        else:
            for idx, s in enumerate(segments):
                ep_num = s.get("episode")
                start = float(s.get("start", 0.0))
                end = float(s.get("end", 0.0))

                if start < 0 or end <= start:
                    msg = f"Segment {idx+1} invalid timestamps (start: {start}, end: {end})"
                    failures.append(RuleFailure(pid=pid, rule="timestamp_validity", message=msg, episode=ep_num))
                    rule_counts["timestamp_validity"] += 1

                ep = eps.get(ep_num)
                if ep is not None:
                    if end > ep.duration + 0.5:
                        msg = f"Segment {idx+1} end ({end:.1f}s) exceeds episode duration ({ep.duration:.1f}s)"
                        failures.append(RuleFailure(pid=pid, rule="timestamp_validity", message=msg, episode=ep_num))
                        rule_counts["timestamp_validity"] += 1

                    # 3. Dialogue boundary compliance
                    if hasattr(ep, "cut_ok"):
                        if not ep.cut_ok(start) or not ep.cut_ok(end):
                            msg = f"Segment {idx+1} cuts inside a spoken dialogue or sound effect"
                            failures.append(RuleFailure(pid=pid, rule="boundary_compliance", message=msg, episode=ep_num))
                            rule_counts["boundary_compliance"] += 1

        # 4. Valid screenplay line IDs
        s0 = segments[0] if segments else {}
        ep_num0 = s0.get("episode")
        ep0 = eps.get(ep_num0)

        if ep0 is not None and hasattr(ep0, "by_id"):
            line_index = ep0.by_id()
            if hook_line_id and hook_line_id not in line_index:
                msg = f"Hook line ID '{hook_line_id}' not found in Episode {ep_num0}"
                failures.append(RuleFailure(pid=pid, rule="line_ids_valid", message=msg, episode=ep_num0))
                rule_counts["line_ids_valid"] += 1

            if cliff_line_id and cliff_line_id not in line_index:
                msg = f"Cliffhanger line ID '{cliff_line_id}' not found in Episode {ep_num0}"
                failures.append(RuleFailure(pid=pid, rule="line_ids_valid", message=msg, episode=ep_num0))
                rule_counts["line_ids_valid"] += 1

            # 5. Hook window (≤ 3.0s of clip start)
            if hook_line_id and hook_line_id in line_index:
                hook_line = line_index[hook_line_id]
                clip_start = float(s0.get("start", 0.0))
                hook_delay = hook_line.start - clip_start
                hook_win = cfg["hook_window_s"]
                if hook_delay > hook_win + 1e-4:
                    msg = f"Hook line starts at +{hook_delay:.2f}s, exceeding {hook_win:.1f}s window"
                    failures.append(RuleFailure(pid=pid, rule="hook_window", message=msg, episode=ep_num0))
                    rule_counts["hook_window"] += 1
                elif hook_delay < -0.05:
                    msg = f"Hook line starts before clip start ({hook_delay:.2f}s)"
                    failures.append(RuleFailure(pid=pid, rule="hook_window", message=msg, episode=ep_num0))
                    rule_counts["hook_window"] += 1
        elif hook_line_id and s0:
            # Fallback when full Episode object is not provided:
            # check hook data stored on promo object
            hook_obj = p.get("hook")
            if isinstance(hook_obj, dict) and "start" in hook_obj:
                clip_start = float(s0.get("start", 0.0))
                hook_delay = float(hook_obj["start"]) - clip_start
                if hook_delay > cfg["hook_window_s"] + 1e-4:
                    msg = f"Hook starts at +{hook_delay:.2f}s (exceeds {cfg['hook_window_s']}s)"
                    failures.append(RuleFailure(pid=pid, rule="hook_window", message=msg, episode=ep_num0))
                    rule_counts["hook_window"] += 1

        # 6. Spoiler restrictions
        if spoilers:
            for s in segments:
                ep_num = s.get("episode")
                if ep_num in spoilers:
                    msg = f"Promo segment is from spoiler/payoff episode {ep_num}"
                    failures.append(RuleFailure(pid=pid, rule="spoiler_restrictions", message=msg, episode=ep_num))
                    rule_counts["spoiler_restrictions"] += 1
                    break

        if len(failures) > promo_failed_before:
            failed_pids.add(pid)

        if kind != "montage":
            singles.append(p)

    # 7. Duplicate suppression (pairwise check on singles)
    for i, a in enumerate(singles):
        pid_a = str(a.get("pid", f"A_{i}"))
        for b in singles[i + 1:]:
            pid_b = str(b.get("pid", "B"))
            for sa in a.get("segments", []):
                for sb in b.get("segments", []):
                    if sa.get("episode") == sb.get("episode"):
                        s1 = max(float(sa.get("start", 0)), float(sb.get("start", 0)))
                        s2 = min(float(sa.get("end", 0)), float(sb.get("end", 0)))
                        if s2 - s1 > 2.0:  # more than 2 seconds temporal overlap
                            msg = f"Candidate {pid_a} overlaps candidate {pid_b} in Episode {sa.get('episode')}"
                            failures.append(RuleFailure(pid=pid_a, rule="duplicate_suppression", message=msg))
                            rule_counts["duplicate_suppression"] += 1
                            failed_pids.add(pid_a)
                            failed_pids.add(pid_b)

    failed_count = len(failed_pids)
    passed_count = total - failed_count
    pass_rate = round((passed_count / max(1, total)) * 100.0, 1)

    return RuleEvaluationResult(
        total_candidates=total,
        passed_candidates=passed_count,
        failed_candidates=failed_count,
        pass_rate=pass_rate,
        rule_failures=rule_counts,
        failures_list=failures,
    )
