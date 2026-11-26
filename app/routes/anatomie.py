from fastapi import APIRouter, Request

from app import anatomie
from app.web import render

router = APIRouter()


@router.get("/anatomie")
def page(request: Request):
    return render(request, "anatomie.html")


@router.get("/anatomie/recherche")
def recherche(request: Request, q: str = ""):
    return render(request, "partials/_anatomie_resultats.html", q=q.strip(), hits=anatomie.search(q))
