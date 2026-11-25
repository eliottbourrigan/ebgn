"""ebgn serve — lance le serveur de production."""
import sys

import uvicorn

from app import config


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "serve"
    if cmd != "serve":
        sys.exit("usage : ebgn serve")
    uvicorn.run("app.main:app", host=config.HOST, port=config.PORT, proxy_headers=True)
