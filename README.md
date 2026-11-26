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
- Anatomie 3D : `/anatomie` — modèle Écorché (CC BY-SA 4.0) dans `app/static/anatomie/`, noms français
  dans `app/anatomie.py`, rendu WebGL dans `app/static/js/app.js`.
- Intro (logo tracé puis balayé, une fois par session) : `app/static/js/app.js`.

## Mise en ligne

`git push` sur `main` → tests, puis déploiement sur le VPS (`.github/workflows/deploy.yml`) :
service `ebgn@8010` / `ebgn@8011` derrière Caddy, `https://ebgn.fr` (+ redirection de `www`).
Secrets du dépôt : `VPS_HOST`, `VPS_SSH_KEY`. DNS : `A @ → IP du VPS`.
