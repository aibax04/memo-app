#!/usr/bin/env bash
# Instant sync to production using the 'Acknowledge' SSH alias
# This bypasses GitHub and pushes your local files directly to the server.

set -e

echo "🚀 Syncing local changes to ext.makememo.ai (Acknowledge)..."

# 1. Sync files (excluding environment files and heavy folders)
rsync -avz --exclude '.git' \
          --exclude 'node_modules' \
          --exclude '.venv' \
          --exclude '__pycache__' \
          --exclude 'memwebapp/frontend/dist' \
          --exclude 'memwebapp/backend/.env' \
          --exclude 'memwebapp/frontend/.env' \
          ./ Acknowledge:/home/ubuntu/memoapp/

echo "🏗️  Rebuilding and restarting on server..."

# 2. Run the bootstrap/restart commands on the server
ssh Acknowledge << 'REMOTE'
  cd /home/ubuntu/memoapp
  # Stop conflicting docker containers if they exist
  sudo docker stop memoapp_backend memoapp_frontend || true
  
  # Backend
  cd memwebapp/backend
  [ -d .venv ] || python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
  
  # Frontend build
  cd ../frontend
  npm install --silent
  VITE_API_URL=https://ext.makememo.ai VITE_PROMO_CODE=MEMOUSER7860 npm run build
  
  # Seed templates
  cd ../backend
  # Migrate data if switching to Postgres (idempotent)
  .venv/bin/python migrate_to_postgres.py
  .venv/bin/python seed_templates.py
  .venv/bin/python seed_sample_meeting.py
  
  # Restart services
  sudo systemctl restart memoapp-backend
  sudo systemctl restart memoapp-frontend
  sudo systemctl reload nginx
REMOTE

echo "✅ Deployment complete! Check https://ext.makememo.ai"
