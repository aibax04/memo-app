#!/usr/bin/env bash
# Run this ON the EC2 instance to fix and verify Memo App.
# From your laptop: ssh -i key.pem ubuntu@YOUR_EC2_IP 'bash -s' < deploy/check-on-ec2.sh
# Or on EC2: cd /home/ubuntu/memoapp && bash deploy/check-on-ec2.sh

set -e
APP_PATH="${APP_PATH:-/home/ubuntu/memoapp}"
cd "$APP_PATH" 2>/dev/null || { echo "Run from repo root (e.g. /home/ubuntu/memoapp)"; exit 1; }

echo "=== Memo App EC2 check ==="

# 1) Backend .env must have PORT and FRONTEND_URL
ENV_FILE="memwebapp/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Creating $ENV_FILE from .env.backup"
  cp memwebapp/backend/.env.backup "$ENV_FILE" 2>/dev/null || true
fi
if [ -f "$ENV_FILE" ]; then
  if ! grep -q "^PORT=8002" "$ENV_FILE" 2>/dev/null; then
    echo "Setting PORT=8002 in $ENV_FILE"
    sed -i.bak '/^PORT=/d' "$ENV_FILE" 2>/dev/null || true
    echo "PORT=8002" >> "$ENV_FILE"
  fi
  if ! grep -q "^FRONTEND_URL=http://[0-9]" "$ENV_FILE" 2>/dev/null; then
    PUB=$(curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")
    if [ -n "$PUB" ]; then
      echo "Setting FRONTEND_URL=http://$PUB in $ENV_FILE (required for CORS)"
      sed -i.bak '/^FRONTEND_URL=/d;/^DASHBOARD_BASE_URL=/d' "$ENV_FILE" 2>/dev/null || true
      echo "FRONTEND_URL=http://$PUB" >> "$ENV_FILE"
      echo "DASHBOARD_BASE_URL=http://$PUB" >> "$ENV_FILE"
    else
      echo "WARNING: Set FRONTEND_URL in $ENV_FILE to http://43.205.135.78"
    fi
  fi
fi

# 2) Restart services
echo "Restarting services..."
sudo systemctl restart memoapp-backend memoapp-frontend nginx 2>/dev/null || true
sleep 2

# 3) Status
echo ""
echo "=== Service status ==="
for svc in memoapp-backend memoapp-frontend nginx; do
  if sudo systemctl is-active --quiet $svc 2>/dev/null; then
    echo "  $svc: running"
  else
    echo "  $svc: NOT RUNNING"
    sudo systemctl status $svc --no-pager 2>/dev/null | tail -5
  fi
done

# 4) Local curl
echo ""
echo "=== Local checks ==="
curl -sf http://127.0.0.1:8002/health >/dev/null && echo "  Backend (8002): OK" || echo "  Backend (8002): FAIL"
curl -sfI http://127.0.0.1:5173/ 2>/dev/null | head -1 | grep -q 200 && echo "  Frontend (5173): OK" || echo "  Frontend (5173): FAIL"
curl -sf http://127.0.0.1:80/health >/dev/null && echo "  Nginx (80): OK" || echo "  Nginx (80): FAIL"

echo ""
echo "From your laptop run: ./deploy/deploy-and-verify.sh $(curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'YOUR_EC2_IP')"
