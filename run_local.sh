#!/usr/bin/env bash
#
# Memo App – run backend + frontend locally and connect Chrome extension
# Usage: ./run_local.sh   (from repo root)
#
# First run: creates .venv and installs requirements (progress shown).
# If install hangs: Ctrl+C, remove memwebapp/backend/.venv, run again.
#

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Paths: support running from repo root (opticall-mobile-backend) or from memwebapp
if [[ -d "memwebapp" ]]; then
  MEMWEBAPP="memwebapp"
else
  MEMWEBAPP="."
fi
BACKEND_DIR="$MEMWEBAPP/backend"
FRONTEND_DIR="$MEMWEBAPP/frontend"
EXTENSION_DIR="$MEMWEBAPP/memo_meet_recorder"

if [[ ! -f "$BACKEND_DIR/run.py" ]]; then
  echo "❌ Backend not found at $BACKEND_DIR. Run this script from the repo root."
  exit 1
fi
if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
  echo "❌ Frontend not found at $FRONTEND_DIR. Run this script from the repo root."
  exit 1
fi
if [[ ! -f "$EXTENSION_DIR/manifest.json" ]]; then
  echo "❌ Chrome extension not found at $EXTENSION_DIR."
  exit 1
fi

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "=============================================="
echo "  Memo App – Local stack (backend + frontend)"
echo "=============================================="
echo ""

# 0) Backend virtual environment
VENV_DIR="$SCRIPT_DIR/$BACKEND_DIR/.venv"
REQUIREMENTS_FILE="$SCRIPT_DIR/$BACKEND_DIR/requirements.txt"
NEED_PIP_INSTALL=false

if [[ ! -d "$VENV_DIR" ]]; then
  echo "▶ Creating virtual environment at $BACKEND_DIR/.venv ..."
  python3 -m venv "$VENV_DIR"
  echo "   Created."
  NEED_PIP_INSTALL=true
fi

if [[ "$NEED_PIP_INSTALL" == "true" ]]; then
  echo "▶ Installing backend requirements (first run – may take 1–2 minutes)..."
  export PIP_DEFAULT_TIMEOUT=120
  export PIP_NO_INPUT=1
  "$VENV_DIR/bin/pip" install --upgrade pip -q
  "$VENV_DIR/bin/pip" install -r "$REQUIREMENTS_FILE"
  echo "   Done."
else
  echo "▶ Using existing venv (skip: pip install)."
fi
echo ""

# 1) Backend
echo "▶ Starting backend (port 8000)..."
(cd "$SCRIPT_DIR/$BACKEND_DIR" && "$VENV_DIR/bin/python" run.py) &
BACKEND_PID=$!
sleep 2
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  echo "❌ Backend failed to start. Check $BACKEND_DIR (e.g. python3 run.py)."
  exit 1
fi
echo "   Backend running (PID $BACKEND_PID)"
echo ""

# 2) Frontend (use local npm cache to avoid EACCES on ~/.npm)
FRONTEND_ABS="$SCRIPT_DIR/$FRONTEND_DIR"
NPM_CACHE="$SCRIPT_DIR/.npm-cache"
if [[ ! -d "$FRONTEND_ABS/node_modules" ]] || [[ ! -f "$FRONTEND_ABS/node_modules/.package-lock.json" ]]; then
  echo "▶ Installing frontend dependencies (using local cache)..."
  (cd "$FRONTEND_ABS" && npm install --cache "$NPM_CACHE" --prefer-offline --no-audit) || true
  echo "   Done."
fi
echo "▶ Starting frontend (port 5173)..."
(cd "$FRONTEND_ABS" && npm run dev) &
FRONTEND_PID=$!
sleep 3
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
  echo "❌ Frontend failed to start. Run: cd $FRONTEND_DIR && npm install --cache .npm-cache && npm run dev"
  kill "$BACKEND_PID" 2>/dev/null || true
  exit 1
fi
echo "   Frontend running (PID $FRONTEND_PID)"
echo ""

# 3) Instructions
echo "=============================================="
echo "  Stack is running"
echo "=============================================="
echo ""
echo "  Backend:    http://localhost:8000"
echo "  API docs:   http://localhost:8000/docs"
echo "  Frontend:   http://localhost:5173"
echo ""
echo "  Chrome extension (one-time setup):"
echo "  1. Open Chrome → chrome://extensions/"
echo "  2. Turn on 'Developer mode'"
echo "  3. Click 'Load unpacked'"
echo "  4. Select this folder:"
echo "     $(cd "$SCRIPT_DIR" && cd "$EXTENSION_DIR" && pwd)"
echo "  5. Log in at http://localhost:5173 so the extension can sync auth."
echo ""
echo "  Press Ctrl+C to stop backend and frontend."
echo "=============================================="
echo ""

wait
