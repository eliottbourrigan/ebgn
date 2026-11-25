import hashlib
from functools import cache
from pathlib import Path

from fastapi import Request
from fastapi.templating import Jinja2Templates

from app.logo import logo

APP = Path(__file__).resolve().parent
STATIC = APP / "static"
templates = Jinja2Templates(directory=APP / "templates")


@cache
def _version(path: str) -> str:
    return hashlib.md5((STATIC / path).read_bytes()).hexdigest()[:10]


def static(path: str) -> str:
    return f"/static/{path}?v={_version(path)}"


templates.env.globals["static"] = static
templates.env.globals["logo"] = logo


def render(request: Request, name: str, status_code: int = 200, **ctx):
    return templates.TemplateResponse(request, name, ctx, status_code=status_code)
