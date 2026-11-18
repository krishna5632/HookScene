"""Step 7 of the pipeline: write a run's outputs (promos.md / .csv / .json, every candidate, the run log)."""
from __future__ import annotations

import csv
import json
from pathlib import Path

from ..core.schemas import Promo


def seg_str(p: Promo) -> str:
    return " + ".join(f"E{s.episode:02d} {s.start_ts}-{s.end_ts}" for s in p.segments)


def _scores(p: Promo) -> str:
    return ", ".join(f"{k}={v}" for k, v in p.scores.items()) or "n/a"


def _flags(p: Promo) -> str:
    return ", ".join(k for k, v in p.flags.items() if v) or "none"


def to_markdown(res: dict, show: str) -> str:
    log = res["run_log"]
    out = [f"# Promo picks — {show}", "",
           f"Mode: **{log['mode']}** · {log['episodes']} episodes · {log['lines']} screenplay lines · "
           f"{log['candidates_valid']} valid candidates, {log['candidates_rejected']} rejected · "
           f"final list: {log['final_promos']} promos"
           + (f" + {log['montages']} montages" if log['montages'] else ""), "",
           "Timestamps are screenplay times (mm:ss.ss) in the named episode. All times were computed by code "
           "from line IDs and snapped to safe cut points; none were written by the model.", ""]
    if res.get("show_summary") is not None:
        out += [f"**Premise (model-written):** {getattr(res['show_summary'], 'premise', '')}", ""]

    def card(p: Promo, label: str):
        out.append(f"## {label} — {p.pid} · {seg_str(p)} · {p.duration:.0f}s")
        out.append(f"- **Hook:** {p.hook}  _(type: {p.hook_type})_")
        out.append(f"- **Cliffhanger:** {p.cliffhanger}  _(type: {p.cliffhanger_type})_")
        if p.open_question:
            out.append(f"- **Open question:** {p.open_question}")
        out.append(f"- **Why it works:** {p.why or '—'}")
        out.append(f"- **Scores:** {_scores(p)} · composite {p.composite:.2f} · flags: {_flags(p)}")
        if p.attention:
            a = p.attention
            out.append(f"- **Attention (text proxy):** hook {a['hook_attention']:.2f} · hold {a['hold']:.2f} · "
                       f"first voice at {a['hook_features']['t_first_voice']:.1f}s"
                       + (f" · ⚠ {'; '.join(a['flags'])}" if a.get("flags") else ""))
        if p.rank_reason:
            out.append(f"- **Rank note:** {p.rank_reason}")
        if p.score_note and p.score_note != "none":
            out.append(f"- **Judge note:** {p.score_note}")
        out.append("")
        out.append("<details><summary>script</summary>\n\n```\n" + "\n".join(p.excerpt) + "\n```\n</details>\n")

    for p in res["promos"]:
        card(p, f"#{p.rank}")
    if res["montages"]:
        out += ["# Montage promos (v2: joined moments)", ""]
        for p in res["montages"]:
            card(p, f"M{p.rank}")
    return "\n".join(out)


def to_csv(res: dict) -> str:
    import io
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["rank", "type", "id", "segments", "duration_s", "hook", "hook_type", "cliffhanger",
                "cliffhanger_type", "open_question", "why", "composite", "scores", "flags", "rank_note",
                "hook_attention", "hold", "attention_flags"])
    for p in list(res["promos"]) + list(res["montages"]):
        w.writerow([("M" if p.kind == "montage" else "") + str(p.rank), p.kind, p.pid, seg_str(p), p.duration,
                    p.hook, p.hook_type, p.cliffhanger, p.cliffhanger_type, p.open_question, p.why,
                    f"{p.composite:.2f}", _scores(p), _flags(p), p.rank_reason,
                    p.attention.get("hook_attention", ""), p.attention.get("hold", ""),
                    "; ".join(p.attention.get("flags", []))])
    return buf.getvalue()


def to_edl(res: dict, show: str) -> str:
    """Export promos as CMX 3600 Edit Decision List (EDL) for NLEs (Premiere, DaVinci Resolve)."""
    promos = list(res.get("promos", [])) + list(res.get("montages", []))
    lines = [f"TITLE: {show}", "FCM: NON-DROP FRAME", ""]
    for idx, p in enumerate(promos, 1):
        segs = p.segments if hasattr(p, "segments") else (p.get("segments") or [{}])
        s0 = segs[0] if segs else {}
        ep = getattr(s0, "episode", None) or (s0.get("episode") if isinstance(s0, dict) else 1)
        start_sec = getattr(s0, "start", 0.0) if hasattr(s0, "start") else (s0.get("start", 0.0) if isinstance(s0, dict) else 0.0)
        end_sec = getattr(segs[-1], "end", 0.0) if hasattr(segs[-1], "end") else (segs[-1].get("end", 0.0) if isinstance(segs[-1], dict) else 0.0)
        dur_sec = getattr(p, "duration", 0.0) if hasattr(p, "duration") else (p.get("duration", 0.0) if isinstance(p, dict) else 0.0)

        def tc(sec: float) -> str:
            m = int(sec // 60)
            s = int(sec % 60)
            f = int(round((sec % 1) * 30))
            return f"{m:02d}:{s:02d}:{f:02d}:00"

        entry_num = f"{idx:03d}"
        lines.append(f"{entry_num}  AX       V     C        {tc(start_sec)} {tc(end_sec)} 00:00:00:00 {tc(dur_sec)}")
        pid = getattr(p, "pid", None) or (p.get("pid") if isinstance(p, dict) else f"P{idx:03d}")
        lines.append(f"* FROM CLIP: EP_{ep}_{pid}")
        lines.append("")
    return "\n".join(lines)


def to_fcpxml(res: dict, show: str) -> str:
    """Export promos as Apple Final Cut Pro XML (FCPXML)."""
    promos = list(res.get("promos", [])) + list(res.get("montages", []))
    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!DOCTYPE fcpxml>',
        '<fcpxml version="1.9">',
        '  <resources>',
        '    <format id="r1" frameDuration="1001/30000s" width="1080" height="1920"/>',
        '  </resources>',
        '  <library>',
        f'    <event name="{show} Promos">',
        '      <project name="Promo Timeline">',
        '        <sequence format="r1">',
        '          <spine>',
    ]
    for idx, p in enumerate(promos, 1):
        segs = p.segments if hasattr(p, "segments") else (p.get("segments") or [{}])
        s0 = segs[0] if segs else {}
        ep = getattr(s0, "episode", 1) if hasattr(s0, "episode") else (s0.get("episode", 1) if isinstance(s0, dict) else 1)
        dur = getattr(p, "duration", 30.0) if hasattr(p, "duration") else (p.get("duration", 30.0) if isinstance(p, dict) else 30.0)
        pid = getattr(p, "pid", f"P{idx}") if hasattr(p, "pid") else (p.get("pid", f"P{idx}") if isinstance(p, dict) else f"P{idx}")
        dur_frames = max(1, int(dur * 30))
        out.append(f'            <clip name="EP_{ep}_{pid}" duration="{dur_frames * 1001}/30000s" format="r1"/>')
    out.extend([
        '          </spine>',
        '        </sequence>',
        '      </project>',
        '    </event>',
        '  </library>',
        '</fcpxml>',
    ])
    return "\n".join(out)



def payload(res: dict, show: str, episode_durations: dict | None = None) -> dict:
    """Everything the website needs, as one JSON-able dict."""
    dump = lambda objs: [o.model_dump() for o in objs]  # noqa: E731
    return {"show": show, "promos": dump(res["promos"]), "montages": dump(res["montages"]),
            "candidates": dump(res["all_candidates"]), "rejected": dump(res["rejected"]),
            "show_summary": res["show_summary"].model_dump() if res.get("show_summary") is not None else None,
            "run_log": json.loads(json.dumps(res["run_log"], default=str)),
            "episode_durations": episode_durations or {},
            "markdown": to_markdown(res, show), "csv": to_csv(res)}


def write_all(res: dict, out_dir: str | Path, show: str) -> Path:
    d = Path(out_dir)
    d.mkdir(parents=True, exist_ok=True)
    dump = lambda objs: [o.model_dump() for o in objs]  # noqa: E731
    (d / "promos.json").write_text(json.dumps(
        {"show": show, "promos": dump(res["promos"]), "montages": dump(res["montages"])},
        ensure_ascii=False, indent=2), encoding="utf-8")
    (d / "candidates_all.json").write_text(json.dumps(
        {"valid": dump(res["all_candidates"]), "rejected": dump(res["rejected"])},
        ensure_ascii=False, indent=2), encoding="utf-8")
    (d / "run_log.json").write_text(json.dumps(res["run_log"], ensure_ascii=False, indent=2, default=str),
                                    encoding="utf-8")
    if res.get("show_summary") is not None:
        (d / "show_summary.json").write_text(json.dumps(res["show_summary"].model_dump(), ensure_ascii=False, indent=2),
                                            encoding="utf-8")
    (d / "promos.md").write_text(to_markdown(res, show), encoding="utf-8")
    (d / "promos.csv").write_text(to_csv(res), encoding="utf-8-sig", newline="")
    return d
