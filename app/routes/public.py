from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from app.web import STATIC, render

router = APIRouter()

GH = "https://github.com/eliottbourrigan/"

# (nom, nature, année, lien) — la liste à éditer
PROJECTS = [
    ("iodej", "application web", "2026", GH + "iodej"),
    ("keypong", "jeu", "2026", GH + "keypong"),
    ("kanban-md", "outil", "2026", GH + "kanban-md"),
    ("strava-prog", "sport", "2026", GH + "strava-prog"),
    ("geotrainer", "jeu", "2025", GH + "geotrainer"),
]

CV = STATIC / "cv.pdf"


@router.get("/")
def home(request: Request):
    return render(request, "index.html", projects=PROJECTS)


@router.get("/cv")
def cv():
    if not CV.exists():
        raise HTTPException(404)
    return FileResponse(CV, media_type="application/pdf", filename="eliott-bourrigan-cv.pdf",
                        content_disposition_type="inline")
