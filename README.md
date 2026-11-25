# ebgn

Page d'accueil d'Eliott Bourrigan. FastAPI + Jinja + Tailwind v4, selon `stack.md`.

```
uv sync
uv run dev      # http://localhost:8000
uv run check    # css + tests
```

- Projets : liste `PROJECTS` dans `app/routes/public.py`.
- CV : déposer `app/static/cv.pdf`, servi sur `/cv` (404 tant qu'il est absent).
- Couleurs et police : `@theme` dans `app/static/css/input.css` (carmin `--color-carmine`).
- Police : Inter (OFL), `app/static/fonts/`.
