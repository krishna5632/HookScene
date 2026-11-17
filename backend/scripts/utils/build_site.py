"""Build the static web app's data files.

  python scripts/utils/build_site.py                 # package code + sample show + official results (needs the pack + run outputs)
  python scripts/utils/build_site.py --package-only  # just re-package the Python code (what the GitHub Pages workflow runs)

Writes:
  frontend/app.zip                    snipdeck/ (code + prompts), config.yaml, bridge.py -> unpacked by Pyodide
  frontend/data/sample_show.zip       the 50-episode input pack (one-click "try the sample show")
  frontend/data/official.json         the official run's results, rendered instantly without running anything
"""
from __future__ import annotations

import argparse
import json
import sys
import zipfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = BACKEND_DIR.parent
ROOT = ROOT_DIR
WEB = ROOT_DIR / "frontend"
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR / "src"))

PACK = ROOT_DIR / "I Married a Broken Soldier. He was a Duke-script"
OFFICIAL = ROOT_DIR / "results" / "official-run-C"
SHOW_NAME = "I Married a Broken Soldier. He was a Duke"


def package() -> None:
    out = WEB / "app.zip"
    out.parent.mkdir(parents=True, exist_ok=True)

    snipdeck_dir = BACKEND_DIR / "src" / "snipdeck"
    if not snipdeck_dir.exists():
        snipdeck_dir = BACKEND_DIR / "snipdeck"

    cfg_file = BACKEND_DIR / "config.yaml"
    if not cfg_file.exists():
        cfg_file = ROOT_DIR / "config.yaml"

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        if snipdeck_dir.exists():
            for f in sorted(snipdeck_dir.rglob("*")):
                if f.is_file() and "__pycache__" not in f.parts and f.suffix in (".py", ".md", ".yaml", ".json"):
                    rel = f.relative_to(snipdeck_dir.parent)
                    z.write(f, rel.as_posix())
        if cfg_file.exists():
            z.write(cfg_file, "config.yaml")
        bridge_file = WEB / "bridge.py"
        if bridge_file.exists():
            z.write(bridge_file, "bridge.py")
    print(f"wrote {out} ({out.stat().st_size // 1024} KB)")


def sample_show() -> None:
    files = sorted(PACK.rglob("*.txt"))
    if not files:
        print("no input pack found: skipping sample_show.zip")
        return
    out = WEB / "data" / "sample_show.zip"
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(f, f.name)
    print(f"wrote {out} ({len(files)} episodes, {out.stat().st_size // 1024} KB)")


def official() -> None:
    if not (OFFICIAL / "promos.json").exists():
        print("no official run outputs found: skipping official.json")
        return
    from snipdeck.core.parse import load_show

    rd = lambda n: json.loads((OFFICIAL / n).read_text(encoding="utf-8"))  # noqa: E731
    promos, cands, log = rd("promos.json"), rd("candidates_all.json"), rd("run_log.json")
    summary = rd("show_summary.json") if (OFFICIAL / "show_summary.json").exists() else None
    auto = rd("auto_eval.json") if (OFFICIAL / "auto_eval.json").exists() else None
    eps = load_show(PACK)
    data = {
        "show": SHOW_NAME,
        "promos": promos["promos"],
        "montages": promos["montages"],
        "candidates": cands["valid"],
        "rejected": cands["rejected"],
        "show_summary": summary,
        "run_log": log,
        "episode_durations": {e.num: round(e.duration, 2) for e in eps},
        "markdown": (OFFICIAL / "promos.md").read_text(encoding="utf-8"),
        "csv": (OFFICIAL / "promos.csv").read_text(encoding="utf-8-sig"),
        "auto_eval": {k: v for k, v in (auto or {}).items() if k != "run"},
        "run_id": OFFICIAL.name,
    }
    sys.path.insert(0, str(BACKEND_DIR / "scripts" / "eval"))
    import yaml
    from evaluate import rule_checks

    cfg_file = BACKEND_DIR / "config.yaml" if (BACKEND_DIR / "config.yaml").exists() else ROOT_DIR / "config.yaml"
    rc = rule_checks(
        promos["promos"] + promos["montages"],
        {e.num: e for e in eps},
        yaml.safe_load(cfg_file.read_text(encoding="utf-8")),
    )
    data["rules"] = {"checked": rc["n"], "passing": rc["promos_passing"], "failures": rc["failures"]}
    out = WEB / "data" / "official.json"
    out.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--package-only", action="store_true")
    a = ap.parse_args()
    package()
    if not a.package_only:
        sample_show()
        official()
