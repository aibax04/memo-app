# Memo App – Production on EC2 with Nginx

Frontend is served on **port 5173** (or via nginx proxy). Backend runs on **port 8002**. Nginx listens on **80** (and optionally 443) and proxies to both.

## Architecture

- **Nginx** (port 80/443): reverse proxy
  - `/` → frontend (127.0.0.1:5173)
  - `/api`, `/token`, `/health`, `/dashboards`, `/charts`, etc. → backend (127.0.0.1:8002)
- **Frontend** (port 5173): Vite preview (built static app)
- **Backend** (port 8002): FastAPI (uvicorn)

## 1. EC2 instance

- **AMI**: Ubuntu 22.04 LTS
- **Security group**: allow inbound **22** (SSH), **80** (HTTP), **443** (HTTPS). Do **not** expose 5173 or 8002 publicly; nginx runs on 80.

## 2. One-time setup on the server

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>

# System packages
sudo apt update
sudo apt install -y nginx python3-venv python3-pip nodejs npm git

# App directory (adjust if you deploy elsewhere)
sudo mkdir -p /home/ubuntu/memoapp
sudo chown ubuntu:ubuntu /home/ubuntu/memoapp
```

## 3. Deploy the app

From your **local** machine (or CI), copy the repo to EC2 and build:

```bash
# From your laptop (replace with your EC2 IP and key)
rsync -avz --exclude node_modules --exclude .venv --exclude .git -e "ssh -i your-key.pem" \
  ./memwebapp/ ubuntu@<EC2-IP>:/home/ubuntu/memoapp/
```

On the **EC2** server:

```bash
cd /home/ubuntu/memoapp

# Backend: venv and deps
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
# Copy and edit .env (DATABASE_URL, JWT_SECRET, FRONTEND_URL, etc.)
cp .env.backup .env
nano .env   # set PORT=8002, NODE_ENV=production, FRONTEND_URL=https://your-domain.com

# Frontend: build (use same origin for API in production)
cd ../frontend
npm ci
# Build with empty VITE_API_URL so the app uses same origin (nginx proxies /api to backend)
VITE_API_URL= npm run build
# Or from repo root: ./deploy/build-production.sh
# Preview serves the build on 5173
npm run preview -- --host 0.0.0.0 --port 5173 &
# Or use systemd (see below)
```

## 4. Nginx

Copy the config and enable the site:

```bash
sudo cp /home/ubuntu/memoapp/../deploy/nginx-memoapp.conf /etc/nginx/sites-available/memoapp
# If deploy is inside repo: from repo root on server after cloning:
# sudo cp deploy/nginx-memoapp.conf /etc/nginx/sites-available/memoapp

sudo ln -sf /etc/nginx/sites-available/memoapp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

If the deploy folder is not on the server, create the config manually:

```bash
sudo nano /etc/nginx/sites-available/memoapp
# Paste contents of deploy/nginx-memoapp.conf
sudo ln -sf /etc/nginx/sites-available/memoapp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Systemd (backend and frontend as services)

So backend and frontend restart on reboot and on failure:

```bash
# Copy service files (adjust paths if your repo is at a different path)
sudo cp /path/to/deploy/memoapp-backend.service /etc/systemd/system/
sudo cp /path/to/deploy/memoapp-frontend.service /etc/systemd/system/

# Edit if your app is not under /home/ubuntu/memoapp
sudo sed -i 's|/home/ubuntu/memoapp|/home/ubuntu/memoapp|g' /etc/systemd/system/memoapp-backend.service
sudo sed -i 's|/home/ubuntu/memoapp|/home/ubuntu/memoapp|g' /etc/systemd/system/memoapp-frontend.service

sudo systemctl daemon-reload
sudo systemctl enable memoapp-backend memoapp-frontend
sudo systemctl start memoapp-backend memoapp-frontend
sudo systemctl status memoapp-backend memoapp-frontend
```

Backend uses **port 8002** via the service (uvicorn runs with `--port 8002`). Frontend service runs `npm run preview -- --host 0.0.0.0 --port 5173`.

## 6. Environment (backend)

In `/home/ubuntu/memoapp/backend/.env` set at least:

- `PORT=8002`
- `NODE_ENV=production`
- `DATABASE_URL=...` (e.g. PostgreSQL on RDS)
- `JWT_SECRET=...` (strong random value)
- `FRONTEND_URL=https://your-domain.com` (or `http://<EC2-IP>` for testing)
- CORS is configured in code to allow your frontend origin; with nginx on the same host, `http://your-domain.com` or the EC2 public IP is the origin.

## 7. Frontend API URL in production

The frontend is built with `VITE_API_URL=` (empty) so it uses the **same origin**. Nginx then proxies `/api`, `/token`, etc. to the backend on 8002. No change needed in the frontend code if you build with empty `VITE_API_URL`.

If you prefer an explicit API URL (e.g. `https://api.your-domain.com`), set when building:

```bash
VITE_API_URL=https://your-domain.com npm run build
```

Then your nginx or DNS must serve the API at that host.

## 8. HTTPS (recommended)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

Then uncomment the HTTPS `server { listen 443 ssl; ... }` block in `nginx-memoapp.conf` and point `ssl_certificate` / `ssl_certificate_key` to the paths certbot uses (e.g. `/etc/letsencrypt/live/your-domain.com/`).

## 9. Quick checks

- Backend: `curl http://127.0.0.1:8002/health`
- Frontend: `curl -I http://127.0.0.1:5173`
- Via nginx: `curl http://<EC2-IP>/health` and `curl -I http://<EC2-IP>/`

If these work, the Memo App is running in production with the frontend on 5173 and the backend on 8002 behind nginx.
