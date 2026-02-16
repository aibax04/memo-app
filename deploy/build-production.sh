#!/usr/bin/env bash
# Build Memo App for production deploy.
# Run from repo root. Frontend is built with same-origin API (VITE_API_URL=).
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "Building Memo App for production..."

# Frontend: build with same-origin API (nginx will proxy /api and /token)
cd memwebapp/frontend
export VITE_API_URL=
npm ci --omit=dev 2>/dev/null || npm install
npm run build
echo "Frontend build done → memwebapp/frontend/dist/"

# Backend: ensure .venv and deps (optional, for deploy target)
cd "$REPO_ROOT/memwebapp/backend"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi
echo "Backend ready (use PORT=8002 in production)."

echo "Done. Copy memwebapp/ to EC2 and configure nginx + systemd as in deploy/EC2-SETUP.md"
