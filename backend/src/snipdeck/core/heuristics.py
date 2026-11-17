"""Keyword rules: extra picks for the model pipeline, and the no-key baseline.

Scans each episode for windows that open on a strong line within 3 s and end on an unresolved-sounding line.
Includes a multi-signal scene detection system across 6 key microdrama moments:
- Conflict (arguments, power struggles)
- Surprise (secret reveals, shock twists)
- Emotion (heartbreak, betrayal tears)
- Suspense (threats, mystery about to drop)
- Action (physical violence, slaps, entries)
- Relationship (marriage ultimatums, divorces)
"""
from __future__ import annotations

import re

from .parse import Episode, Line
from .schemas import RawCandidate

HOOK_WORDS = re.compile(
    r"\b(slap|slaps|slapped|strike|strikes|struck|whip|crest|crack|gasp|scream|screams|shout|"
    r"kneel|kneels|chains|manacle|explosion|explodes|blood|dagger|sword|sabre|pistol|knife|"
    r"duke|duchess|alexander died|dead|alive|poison|arsenic|witch|witchcraft|hang|gallows|execut|"
    r"married|marry|wedding|marrying|disown|traitor|liar|betray|imposter|impostor|"
    r"who are you|you knew|how dare|never|nothing|worthless|mistake|truth|secret|"
    r"arrest|guards|refuse|stand down|kill|die|swear)\b", re.I)
HOT_EMO = re.compile(r"(shock|scream|furious|outrag|hyster|horrif|devastat|gasp|trembl|menac|cold|commanding|"
                     r"defiant|desperate|terrif|panick|unhinged|vengeful|sob)", re.I)
RESOLVE = re.compile(r"\b(thank you|forgive|i love you|we are safe|it is over|it's over|peace)\b", re.I)

# Multi-signal tension detection dictionaries
SIGNAL_PATTERNS = {
    "action": re.compile(r"\b(slap|slaps|slapped|grab|grabs|grabbed|punch|punches|strike|strikes|struck|choke|shove|smash|knife|dagger|sword|gun|pistol|bursts|weapon|shatters)\b", re.I),
    "conflict": re.compile(r"\b(liar|traitor|disgrace|worthless|how dare|get out|never again|shut up|enemy|hate|fight|mistake|scum|refuse|disown|bastard|pathetic)\b", re.I),
    "surprise": re.compile(r"\b(impossible|who are you|real father|not my father|dna|secret|all along|impostor|imposter|truth is|reveal|alive|alexander died|poison|shock)\b", re.I),
    "emotion": re.compile(r"\b(tears|crying|cries|wept|heartbroken|heartbreak|sob|sobs|devastated|beg|plead|pleading|forgive|abandoned|destroyed|why did you|hurt|gasp)\b", re.I),
    "suspense": re.compile(r"\b(know who killed|listen closely|don't move|someone is|dying to know|countdown|threat|before it's too late|you have until|warning|watching you)\b", re.I),
    "relationship": re.compile(r"\b(marry|married|wedding|marrying|divorce|annulment|fiance|fiancée|mistress|lover|husband|wife|love you|breakup|belong to me)\b", re.I),
}


def detect_signals(lines: list[Line]) -> dict[str, float]:
    """Calculates presence scores across the 6 microdrama dramatic signals."""
    scores = {k: 0.0 for k in SIGNAL_PATTERNS}
    for l in lines:
        t = l.text
        weight = 2.0 if l.kind in ("ACTION", "SFX") else 1.0
        for sig, pat in SIGNAL_PATTERNS.items():
            cnt = len(pat.findall(t))
            if cnt > 0:
                scores[sig] += cnt * weight
        if HOT_EMO.search(l.emotion or ""):
            scores["emotion"] += 1.5
            scores["conflict"] += 0.8
        if "!" in t:
            scores["conflict"] += 0.4
        if "?" in t:
            scores["suspense"] += 0.5
    return scores


def classify_signals(lines: list[Line]) -> tuple[str, int, list[str]]:
    """Returns (primary_signal, intensity_1_to_5, detected_signals_list)."""
    scores = detect_signals(lines)
    detected = [k for k, v in scores.items() if v >= 1.0]
    sorted_sigs = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    best_sig, best_val = sorted_sigs[0]
    if best_val < 0.5:
        primary = "conflict"
        intensity = 2
    else:
        primary = best_sig
        intensity = min(5, max(1, int(round(best_val))))
    if primary not in detected:
        detected.insert(0, primary)
    return primary, intensity, detected


def hook_strength(lines: list[Line]) -> float:
    s = 0.0
    for l in lines:
        t = l.text
        if l.kind == "DIALOGUE":
            s += 1.0 + (1.0 if HOT_EMO.search(l.emotion or "") else 0)
            s += 0.7 * len(HOOK_WORDS.findall(t))
            s += 0.5 * t.count("!") + 0.4 * t.count("?")
            if len(t.split()) <= 6:
                s += 0.6  # short, punchy line
        elif l.kind in ("ACTION", "SFX"):
            s += 0.6 * len(HOOK_WORDS.findall(t)) + 0.3
        else:
            s += 0.15 * len(HOOK_WORDS.findall(t))
    return s


def cliff_strength(lines: list[Line], at_episode_end: bool) -> float:
    if not lines:
        return 0.0
    s = 0.0
    for l in lines[-3:]:
        t = l.text.strip()
        if t.endswith("?\"") or t.endswith("?"):
            s += 1.2
        if t.endswith("...\"") or t.endswith("..."):
            s += 0.8
        if t.endswith("!\"") or t.endswith("!"):
            s += 0.6
        s += 0.5 * len(HOOK_WORDS.findall(t))
        if HOT_EMO.search(l.emotion or ""):
            s += 0.5
        if RESOLVE.search(t):
            s -= 1.5
    if at_episode_end:
        s += 1.5  # episodes end on a designed cut
    return s


def propose(ep: Episode, rules: dict, per_episode: int = 3) -> list[RawCandidate]:
    lo, hi = rules["min_len_s"], rules["max_len_s"]
    lines = ep.lines
    scored: list[tuple[float, int, int]] = []
    for i, a in enumerate(lines):
        if a.kind == "CAMERA":
            continue  # start on a spoken/acted beat
        t0 = a.start
        first3 = [l for l in lines if t0 <= l.start <= t0 + rules["hook_window_s"] and l.kind != "CAMERA"]
        h = hook_strength(first3)
        for j in range(i, len(lines)):
            b = lines[j]
            if b.kind == "CAMERA":
                continue
            dur = b.end - t0
            if dur < lo:
                continue
            if dur > hi:
                break
            body = [l for l in lines[i:j + 1] if l.kind in ("DIALOGUE", "ACTION", "SFX")]
            c = cliff_strength(body, at_episode_end=(j >= len(lines) - 2))
            inten = sum(1 for l in body if l.kind == "DIALOGUE" and HOT_EMO.search(l.emotion or "")) / max(1, len(body))
            scored.append((2.0 * h + 2.0 * c + 3.0 * inten, i, j))
    scored.sort(reverse=True)

    picked: list[tuple[int, int]] = []
    out: list[RawCandidate] = []
    for sc, i, j in scored:
        a, b = lines[i], lines[j]
        if any(not (b.end <= lines[pi].start or a.start >= lines[pj].end) for pi, pj in picked):
            continue  # no overlap with an already-picked window
        body = [l for l in lines[i:j + 1] if l.kind != "CAMERA"]
        if not body:
            continue
        cliff = body[-1]
        hook = next((l for l in lines[i:j + 1] if l.kind != "CAMERA"), a)
        picked.append((i, j))
        
        # Multi-signal evaluation
        prim_sig, intensity, detected_sigs = classify_signals(body)
        
        out.append(RawCandidate(
            episode=ep.num, start_line=a.id, end_line=b.id, hook_line=hook.id, cliffhanger_line=cliff.id,
            hook_type="other", cliffhanger_type="other",
            primary_signal=prim_sig, signal_intensity=intensity, signals_detected=detected_sigs,
            open_question="", why=f"multi-signal pick ({prim_sig} level {intensity})", heur_score=round(sc, 3)))
        if len(out) >= per_episode:
            break
    return out
