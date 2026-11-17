"""HookScene Studio root entrypoint wrapper.
Forwards execution to backend/server.py for backward compatibility.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "backend" / "src"))

from backend.server import start_server

if __name__ == "__main__":
    start_server()
