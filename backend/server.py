"""HookScene Studio entrypoint. Runs the backend server."""
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
SRC_DIR = BACKEND_DIR / "src"

sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(SRC_DIR))

try:
    from backend.main import app, start_server
except ImportError:
    from main import app, start_server

if __name__ == "__main__":
    start_server()
