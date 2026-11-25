from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles

from app import config
from app.routes import public
from app.web import STATIC, render

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/static", StaticFiles(directory=STATIC), name="static")
app.include_router(public.router)

CSP = "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"


@app.middleware("http")
async def headers(request: Request, call_next):
    response = await call_next(request)
    h = response.headers
    h["Content-Security-Policy"] = CSP
    h["X-Content-Type-Options"] = "nosniff"
    h["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith("/static/") and "v=" in request.url.query:
        h["Cache-Control"] = "public, max-age=31536000, immutable"
    return response


@app.exception_handler(404)
async def not_found(request: Request, exc):
    return render(request, "404.html", status_code=404)


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/healthz/lb")
def healthz_lb():
    if Path(config.DATA_DIR, f"drain-{config.PORT}").exists():
        return PlainTextResponse("draining", status_code=503)
    return {"ok": True}


@app.get("/robots.txt", response_class=PlainTextResponse)
def robots():
    return "User-agent: *\nAllow: /\n"
