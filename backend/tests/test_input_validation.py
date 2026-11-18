"""Input Validation and Edge-Case Tests for HookScene (Feature 4, Section 1).
Tests input boundaries: empty, very short, corrupted, malformed, large, and unsupported files.
"""
from __future__ import annotations

import base64
import io
import zipfile
from pathlib import Path

import pytest
from fastapi import HTTPException

from backend.main import run_pipeline
from hookscene.core.parse import parse_episode, load_show
from hookscene.core.subtitles import load_subtitles, read_cues


def test_empty_screenplay(tmp_path):
    """Empty screenplay file returns an Episode object with zero lines and 0.0 duration."""
    f = tmp_path / "empty_episode.txt"
    f.write_text("", encoding="utf-8")
    ep = parse_episode(f)
    assert ep.num == 0
    assert len(ep.lines) == 0
    assert ep.duration == 0.0

    # load_show filters out episodes without lines
    eps = load_show(tmp_path)
    assert eps == []


def test_very_short_screenplay(tmp_path):
    """Very short screenplay (e.g. 1 short beat, 2 seconds) parses safely but has insufficient length for 20s promo."""
    content = """EPISODE NUMBER: Episode 1
EPISODE LOGLINE: A quick moment.
CONTINUITY NOTES: None.

--- SCRIPT START ---
SCENE 01
Scene heading: INT. ROOM - DAY
**ANNA (Whispering):**
Start: (00:00.00) | End: (00:02.00)
"Wait."
--- SCRIPT END ---
"""
    f = tmp_path / "short_episode.txt"
    f.write_text(content, encoding="utf-8")
    ep = parse_episode(f)
    assert ep.num == 1
    assert len(ep.lines) == 1
    assert ep.duration == 2.0
    assert ep.lines[0].text.strip('"') == "Wait."


def test_unsupported_file_format(tmp_path):
    """API rejects unsupported file formats (.pdf, .exe, .bin) with HTTP 400."""
    from backend.main import validate_and_extract_upload

    files = [
        {
            "name": "script.pdf",
            "content": "%PDF-1.4 malformed binary data",
            "is_base64": False,
        }
    ]
    with pytest.raises(HTTPException) as exc_info:
        validate_and_extract_upload(files, tmp_path)
    assert exc_info.value.status_code == 400
    assert "Unsupported file format" in exc_info.value.detail


def test_corrupted_zip_file(tmp_path):
    """API rejects corrupted or truncated ZIP files with HTTP 400."""
    from backend.main import validate_and_extract_upload

    corrupted_bytes = b"PK\x03\x04this is truncated and corrupted zip data"
    b64_content = base64.b64encode(corrupted_bytes).decode("ascii")

    files = [
        {
            "name": "episodes.zip",
            "content": b64_content,
            "is_base64": True,
        }
    ]
    with pytest.raises(HTTPException) as exc_info:
        validate_and_extract_upload(files, tmp_path)
    assert exc_info.value.status_code == 400
    assert "Corrupted or invalid ZIP file" in exc_info.value.detail


def test_file_size_limit_exceeded(tmp_path):
    """Files exceeding 50MB raise HTTP 413 Payload Too Large."""
    from backend.main import validate_and_extract_upload

    oversized = "A" * (51 * 1024 * 1024)
    files = [
        {
            "name": "oversized.txt",
            "content": oversized,
            "is_base64": False,
        }
    ]
    with pytest.raises(HTTPException) as exc_info:
        validate_and_extract_upload(files, tmp_path)
    assert exc_info.value.status_code == 413
    assert "50MB" in exc_info.value.detail


def test_missing_timestamps_in_screenplay(tmp_path):
    """Lines missing Start/End timestamps are ignored without throwing unhandled exceptions."""
    content = """EPISODE NUMBER: Episode 1
EPISODE LOGLINE: Test missing timestamps.
CONTINUITY NOTES: None.

--- SCRIPT START ---
SCENE 01
Scene heading: INT. ROOM - DAY
**ANNA (Cold):**
"You should leave."

**BEN (Angry):**
Start: (00:05.00) | End: (00:08.00)
"Why should I?"
--- SCRIPT END ---
"""
    f = tmp_path / "missing_ts.txt"
    f.write_text(content, encoding="utf-8")
    ep = parse_episode(f)
    # Only BEN's line has valid timestamps and should be captured
    assert len(ep.lines) == 1
    assert ep.lines[0].speaker == "BEN"
    assert ep.lines[0].start == 5.0
    assert ep.lines[0].end == 8.0


def test_invalid_srt_vtt_format(tmp_path):
    """Subtitles with malformed cue headers, missing arrows, or broken millisecond syntax don't crash."""
    bad_srt = """1
Malformed header without timestamp arrow
Some random dialogue.

2
00:00:05.000 --> 00:00:09.000
Valid line after malformed cue.
"""
    f = tmp_path / "bad.srt"
    f.write_text(bad_srt, encoding="utf-8")
    cues = read_cues(f)
    assert len(cues) == 1
    assert cues[0][0] == 5.0
    assert cues[0][1] == 9.0
    assert cues[0][2] == "Valid line after malformed cue."


def test_duplicate_dialogue_or_rolling_captions(tmp_path):
    """Repeated rolling auto-captions where a cue contains repeated tail of the previous cue are deduplicated."""
    rolling_srt = """1
00:00:01,000 --> 00:00:03,000
Hello my name is

2
00:00:03,000 --> 00:00:05,000
Hello my name is Alexander and I am

3
00:00:05,000 --> 00:00:07,000
Alexander and I am the Duke.
"""
    f = tmp_path / "rolling.srt"
    f.write_text(rolling_srt, encoding="utf-8")
    cues = read_cues(f)
    # Second cue drops "Hello my name is", leaving "Alexander and I am"
    # Third cue drops "Alexander and I am", leaving "the Duke."
    assert len(cues) == 3
    assert cues[0][2] == "Hello my name is"
    assert cues[1][2] == "Alexander and I am"
    assert cues[2][2] == "the Duke."


def test_very_large_screenplay_handling(tmp_path):
    """Screenplay with 1,000 sequential lines parses properly with correct line indexing."""
    lines = [
        "EPISODE NUMBER: Episode 1",
        "EPISODE LOGLINE: Large episode benchmark.",
        "CONTINUITY NOTES: Synthetic.",
        "--- SCRIPT START ---",
        "SCENE 01",
        "Scene heading: INT. GREAT HALL - NIGHT",
    ]
    for i in range(1, 1001):
        lines.append(f"**SPEAKER_{i % 5} (Neutral):**")
        t0 = i * 2.0
        t1 = t0 + 1.5
        m0 = int(t0 // 60)
        s0 = t0 % 60
        m1 = int(t1 // 60)
        s1 = t1 % 60
        lines.append(f"Start: ({m0:02d}:{s0:05.2f}) | End: ({m1:02d}:{s1:05.2f})")
        lines.append(f'"Dialogue line number {i} in the grand hall."')
        lines.append("")
    lines.append("--- SCRIPT END ---")

    f = tmp_path / "large_episode.txt"
    f.write_text("\n".join(lines), encoding="utf-8")
    ep = parse_episode(f)
    assert len(ep.lines) == 1000
    assert ep.lines[0].id == "E01_L001"
    assert ep.lines[-1].id == "E01_L1000"
    assert ep.duration > 2000.0


def test_malformed_screenplay_content(tmp_path):
    """Malformed headers, emoji in dialogue, special punctuation, and missing scenes parse gracefully."""
    content = """EPISODE NUMBER: Episode 99
EPISODE LOGLINE: 🎭 Drama with emojis & odd chars: <>&"'!

--- SCRIPT START ---
**UNKNOWN_ENTITY (O.S.:**
Start: (00:01.00) | End: (00:04.00)
"What is this magic?! ✨🎉 (shrieks loudly) — it cannot be!"

**ACTION:**
Start: (00:04.50) | End: (00:06.00)
The chandelier crashes with a loud BANG! 💥
--- SCRIPT END ---
"""
    f = tmp_path / "malformed.txt"
    f.write_text(content, encoding="utf-8")
    ep = parse_episode(f)
    assert ep.num == 99
    assert len(ep.lines) == 2
    assert "✨🎉" in ep.lines[0].text
    assert ep.lines[1].kind == "ACTION"
    assert "💥" in ep.lines[1].text
