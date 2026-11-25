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

# Pluie (app.js) : (clé, libellé, unité, min, max, pas, défaut) — les défauts sont ceux des curseurs
RAIN = [
    ("alpha", "Opacité", "α", 0.05, 1, 0.05, 0.2),
    ("rate", "Débit", "gouttes·s⁻¹", 0, 20, 0.5, 9),
    ("size", "Diamètre initial", "px", 16, 110, 1, 54),
    ("end", "Diamètre à l'impact", "px", 1.5, 8, 0.5, 3.5),
    ("fall", "Temps de chute", "s", 0.4, 2.5, 0.05, 0.95),
    ("vanish", "Convergence vers le point de fuite", "", 0, 1, 0.05, 1),
    ("wobble", "Amplitude de déformation", "", 0, 0.5, 0.01, 0.18),
    ("ploc", "Rayon de l'onde", "×", 0.3, 2.5, 0.05, 1.8),
    ("plocblur", "Flou terminal de l'onde", "px", 0, 4, 0.1, 1.2),
    ("plocdur", "Amortissement de l'onde", "s", 0.4, 2.5, 0.05, 1.1),
]

CV = STATIC / "cv.pdf"


@router.get("/")
def home(request: Request):
    return render(request, "index.html", projects=PROJECTS, rain=RAIN)


@router.get("/cv")
def cv():
    if not CV.exists():
        raise HTTPException(404)
    return FileResponse(CV, media_type="application/pdf", filename="eliott-bourrigan-cv.pdf",
                        content_disposition_type="inline")
