# Memo App

Local development setup for Memo App (backend, frontend, and meeting recorder). Everything runs on **localhost** by default.

## One-command local run

From the **repo root** (parent of `memwebapp/`):

```bash
./run_local.sh
```

This starts the backend and frontend and prints instructions to load the Chrome extension. Press Ctrl+C to stop both servers.

## Structure

```
memwebapp/
├── backend/          # Python API (FastAPI) - port 8000
├── frontend/         # React/Vite dashboard - port 5173
└── memo_meet_recorder/  # Chrome extension for Meet/Teams recording
```

## Quick start (localhost)

### 1. Backend

```bash
cd memwebapp/backend
# Optional: copy .env from .env.backup and set DATABASE_URL (sqlite by default)
pip install -r requirements.txt   # or: uv sync
python run.py
# or: uvicorn main:app --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  

### 2. Frontend

```bash
cd memwebapp/frontend
npm install
npm run dev
```

- App: http://localhost:5173  
- Uses backend at `http://localhost:8000` by default (override with `VITE_API_URL` in `.env`).

### 3. Meeting recorder (Chrome extension)

- Load `memwebapp/memo_meet_recorder` as an unpacked extension in Chrome.
- Log in at http://localhost:5173 so the extension can sync auth; it talks to the backend at http://localhost:8000.

## Environment

- **Backend**: See `backend/.env.backup`. Copy to `backend/.env` and set `APP_NAME=Memo App`, `FRONTEND_URL=http://localhost:5173`, and DB/OAuth as needed.
- **Frontend**: Optional `frontend/.env`: `VITE_API_URL=http://localhost:8000` (default if unset).

Production deployment (URLs, CORS, env) can be configured later.
