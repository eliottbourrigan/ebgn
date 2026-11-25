#!/usr/bin/env bash
# Déploiement côté VPS, appelé par GitHub Actions après l'envoi du code dans un
# dossier temporaire :   sudo bash <release>/scripts/remote-deploy.sh --domain ebgn.fr --port 8010
#
# Utilisateur dédié « ebgn », code dans /home/ebgn/app, données dans /home/ebgn/data
# (jamais écrasées par un déploiement).
set -euo pipefail

DOMAIN=""
PORT=8010
SERVICE=ebgn
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --service) SERVICE="$2"; shift 2 ;;
    *) echo "Option inconnue : $1"; exit 1 ;;
  esac
done
[[ $EUID -eq 0 ]] || { echo "À lancer en root (ou sudo)."; exit 1; }

RELEASE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER="$SERVICE"
HOME_DIR="/home/$APP_USER"
APP_DIR="$HOME_DIR/app"
DATA_DIR="$HOME_DIR/data"
say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

FIRST=0
if ! id "$APP_USER" >/dev/null 2>&1; then
  say "Création de l'utilisateur $APP_USER"
  useradd --create-home --home-dir "$HOME_DIR" --shell /usr/sbin/nologin "$APP_USER"
  FIRST=1
fi
[[ -f /etc/systemd/system/$SERVICE@.service ]] || FIRST=1
mkdir -p "$APP_DIR" "$DATA_DIR"

say "Mise à jour du code"
command -v rsync >/dev/null || { apt-get update -qq && apt-get install -y -qq rsync >/dev/null; }
rsync -a --delete --exclude data --exclude .venv --exclude backups "$RELEASE/" "$APP_DIR/"
chown -R "$APP_USER": "$HOME_DIR"

ARGS=(--port "$PORT" --data-dir "$DATA_DIR" --service "$SERVICE")
[[ -n "$DOMAIN" ]] && ARGS+=(--domain "$DOMAIN")
[[ $FIRST -eq 0 ]] && ARGS+=(--skip-system)
bash "$APP_DIR/scripts/install.sh" "${ARGS[@]}"

rm -rf "$RELEASE"
