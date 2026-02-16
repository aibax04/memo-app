#!/usr/bin/env bash
# One-time bootstrap for Memo App on a fresh Ubuntu EC2 instance.
# Run on the EC2 host (e.g. after cloning the repo or copying deploy/ and memwebapp/).
#
# Usage:
#   Option A - Run from your laptop (replace KEY and HOST):
#     scp -i key.pem deploy/bootstrap-ec2.sh ubuntu@<EC2_HOST>:/tmp/
#     ssh -i key.pem ubuntu@<EC2_HOST> 'bash /tmp/bootstrap-ec2.sh'
#
#   Option B - On EC2 after cloning repo to /home/ubuntu/memoapp:
#     cd /home/ubuntu/memoapp && bash deploy/bootstrap-ec2.sh

set -e
APP_PATH="${APP_PATH:-/home/ubuntu/memoapp}"
echo "Bootstrapping Memo App at $APP_PATH"

# If we're inside the repo, detect path
if [ -d "deploy" ] && [ -d "memwebapp" ]; then
  APP_PATH="$(pwd)"
  cd "$APP_PATH"
else
  sudo mkdir -p "$APP_PATH"
  sudo chown -R "$USER:$USER" "$APP_PATH"
  cd "$APP_PATH"
fi

# System packages
sudo apt-get update -qq
sudo apt-get install -y nginx python3-venv python3-pip nodejs npm git

# Backend
cd "$APP_PATH/memwebapp/backend"
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
[ -f .env ] || cp .env.backup .env 2>/dev/null || true
echo "Backend ready (port 8002). Edit memwebapp/backend/.env (PORT=8002, DATABASE_URL, JWT_SECRET, FRONTEND_URL)."

# Frontend
cd "$APP_PATH/memwebapp/frontend"
npm ci 2>/dev/null || npm install
VITE_API_URL= npm run build
echo "Frontend built."

# Nginx
sudo cp "$APP_PATH/deploy/nginx-memoapp.conf" /etc/nginx/sites-available/memoapp
sudo ln -sf /etc/nginx/sites-available/memoapp /etc/nginx/sites-enabled
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Systemd: replace path in service files and install
BACKEND_SVC="/etc/systemd/system/memoapp-backend.service"
FRONTEND_SVC="/etc/systemd/system/memoapp-frontend.service"
sudo sed "s|/home/ubuntu/memoapp|$APP_PATH|g" "$APP_PATH/deploy/memoapp-backend.service" | sudo tee "$BACKEND_SVC" > /dev/null
sudo sed "s|/home/ubuntu/memoapp|$APP_PATH|g" "$APP_PATH/deploy/memoapp-frontend.service" | sudo tee "$FRONTEND_SVC" > /dev/null
sudo systemctl daemon-reload
sudo systemctl enable memoapp-backend memoapp-frontend
sudo systemctl start memoapp-backend memoapp-frontend

echo "Done. Backend: 8002, Frontend: 5173, Nginx: 80"
echo "Check: curl -s http://127.0.0.1:8002/health && curl -sI http://127.0.0.1:5173 | head -1"
