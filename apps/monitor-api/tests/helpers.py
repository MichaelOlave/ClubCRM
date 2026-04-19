import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]


def add_api_root_to_path() -> None:
    if str(API_ROOT) not in sys.path:
        sys.path.insert(0, str(API_ROOT))
