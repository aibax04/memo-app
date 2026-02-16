#!/usr/bin/env bash
# Deploy Memo App to EC2 and verify it works.
# Usage:
#   ./deploy/deploy-and-verify.sh                    # show usage and steps
#   ./deploy/deploy-and-verify.sh <EC2_IP_OR_HOST>   # verify only (curl checks)
#   ./deploy/deploy-and-verify.sh <EC2_IP> <KEY.pem> # deploy via rsync + ssh, then verify
#
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOST="${1:-}"
KEY="${2:-}"
APP_PATH="${EC2_APP_PATH:-/home/ubuntu/memoapp}"

verify() {
  local host="$1"
  echo "Verifying production at http://${host} ..."
  ok=0
  if curl -sf "http://${host}/health" > /dev/null; then
    echo "  OK /health"
    ((ok++)) || true
  else
    echo "  FAIL /health"
  fi
  if curl -sf "http://${host}/healthcheck" > /dev/null; then
    echo "  OK /healthcheck"
    ((ok++)) || true
  else
    echo "  FAIL /healthcheck"
  fi
  if curl -sfI "http://${host}/" | head -1 | grep -q 200; then
    echo "  OK / (frontend)"
    ((ok++)) || true
  else
    echo "  FAIL / (frontend)"
  fi
  if [ "$ok" -eq 3 ]; then
    echo "Production is up. Open http://${host}/ in a browser."
    return 0
  fi
  echo "Some checks failed. Fix backend/nginx on EC2 and re-run."
  return 1
}

if [ -z "$HOST" ]; then
  echo "Memo App – Deploy and verify"
  echo ""
  echo "Option A – Deploy via GitHub Actions (after push to main):"
  echo "  1. Add secrets: EC2_HOST, EC2_USER, EC2_SSH_KEY, EC2_APP_PATH (see deploy/GITHUB-SECRETS-AND-HOST.md)"
  echo "  2. git push origin main"
  echo "  3. Run this script to verify: ./deploy/deploy-and-verify.sh YOUR_EC2_IP"
  echo ""
  echo "Option B – Deploy from this machine (rsync + SSH):"
  echo "  ./deploy/deploy-and-verify.sh YOUR_EC2_IP /path/to/key.pem"
  echo ""
  echo "Option C – Verify only (server already deployed):"
  echo "  ./deploy/deploy-and-verify.sh YOUR_EC2_IP"
  exit 0
fi

if [ -n "$KEY" ] && [ -f "$KEY" ]; then
  echo "Deploying to $HOST (app path: $APP_PATH) ..."
  rsync -avz --exclude node_modules --exclude .venv --exclude .git --exclude temp_audio -e "ssh -i $KEY -o StrictHostKeyChecking=accept-new" \
    "$REPO_ROOT/memwebapp/" "ubuntu@${HOST}:${APP_PATH}/memwebapp/"
  rsync -avz -e "ssh -i $KEY" "$REPO_ROOT/deploy/" "ubuntu@${HOST}:${APP_PATH}/deploy/"
  echo "Running bootstrap on server..."
  ssh -i "$KEY" ubuntu@${HOST} "cd $APP_PATH && bash deploy/bootstrap-ec2.sh"
  echo "Deploy done."
fi

verify "$HOST"
