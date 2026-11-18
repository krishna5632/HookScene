"""HookScene Backend Package."""
import sys
from pathlib import Path

# Ensure backend directory is in sys.path so 'hookscene' can always be imported directly
_backend_dir = str(Path(__file__).resolve().parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

# Aliasing for backward compatibility if anything requests legacy name
try:
    import hookscene
    sys.modules['snipdeck'] = hookscene
except ImportError:
    pass
