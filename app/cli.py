"""ebgn serve [--host H] [--port P] — lance le serveur de production."""
import argparse

import uvicorn

from app import config


def main() -> None:
    parser = argparse.ArgumentParser(prog="ebgn")
    sub = parser.add_subparsers(dest="cmd", required=True)
    serve = sub.add_parser("serve")
    serve.add_argument("--host", default=config.HOST)
    serve.add_argument("--port", type=int, default=config.PORT)
    args = parser.parse_args()
    uvicorn.run("app.main:app", host=args.host, port=args.port, proxy_headers=True)
