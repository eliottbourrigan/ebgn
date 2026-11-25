"""Tâches de dev, identiques sous Linux, macOS et Windows : uv run dev | css | test | check."""
import os
import signal
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS_IN = ROOT / "app/static/css/input.css"
CSS_OUT = ROOT / "app/static/css/app.css"


def _tailwind(*args: str) -> list[str]:
    import pytailwindcss  # dépendance de dev : binaire Tailwind autonome, sans Node

    path = pytailwindcss.get_bin_path()
    if not Path(path).exists():
        pytailwindcss.install()
    return [str(path), "-i", str(CSS_IN), "-o", str(CSS_OUT), *args]


def css() -> None:
    sys.exit(subprocess.call(_tailwind("--minify"), cwd=ROOT))


def test() -> None:
    sys.exit(subprocess.call([sys.executable, "-m", "pytest", "-q", *sys.argv[1:]], cwd=ROOT))


def check() -> None:
    for cmd in (_tailwind("--minify"), [sys.executable, "-m", "pytest", "-q"]):
        if code := subprocess.call(cmd, cwd=ROOT):
            sys.exit(code)


def _stop(*_):
    raise KeyboardInterrupt


def dev() -> None:
    port = os.environ.get("PORT", "8000")
    subprocess.call(_tailwind(), cwd=ROOT)  # premier build avant de servir
    procs = [
        subprocess.Popen(_tailwind("--watch=always"), cwd=ROOT),
        subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--reload",
                          "--host", "0.0.0.0", "--port", port], cwd=ROOT),
    ]
    print(f"\n  → http://localhost:{port}   (Ctrl+C pour arrêter)\n", flush=True)
    signal.signal(signal.SIGTERM, _stop)
    try:
        procs[1].wait()
    except KeyboardInterrupt:
        pass
    finally:
        for p in procs:
            p.terminate()
        for p in procs:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()
