from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from app.web import STATIC, render

router = APIRouter()

GH = "https://github.com/eliottbourrigan/"

# (nom, description courte, année, lien) — la liste à éditer
PROJECTS = [
    ("player neo", "Agent IA qui prédit les scores du Mondial", "2026", "https://iodagroup.ai/neo/"),
    ("iodej", "Où déjeuner entre collègues, en swipant", "2026", GH + "iodej"),
    ("keypong", "Un ping-pong avec des mots", "2026", "https://eliottbourrigan.github.io/keypong/"),
    ("kanban-md", "Un kanban dans un fichier Markdown", "2026", "https://eliottbourrigan.github.io/kanban-md/"),
    ("strava-prog", "Ma progression en course à pied", "2026", GH + "strava-prog"),
    ("geotrainer", "S'entraîner à la géographie", "2025", GH + "geotrainer"),
    ("an aquatic love story", "EP de musique", "2021", "https://open.spotify.com/album/2WbxmvFJmFFw3YyBwf82em"),
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
