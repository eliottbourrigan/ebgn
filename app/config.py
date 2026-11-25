import os
from pathlib import Path

DATA_DIR = Path(os.environ.get("EBGN_DATA_DIR", "data"))
HOST = os.environ.get("EBGN_HOST", "127.0.0.1")
PORT = int(os.environ.get("EBGN_PORT", "8010"))
