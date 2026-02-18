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

# Catch placeholder args so we don't try to curl a literal "YOUR_EC2_IP"
if [ -n "$HOST" ]; then
  case "$HOST" in
    *YOUR_EC2*|*EC2_IP*|*your-*|*example*)
      echo "Error: Replace the placeholder with your real EC2 address."
      echo "  Example: ./deploy/deploy-and-verify.sh 43.205.135.78"
      exit 1
      ;;
  esac
fi
if [ -n "$KEY" ] && [ -n "$2" ]; then
  case "$2" in
    *path/to*|*your-key*)
      echo "Error: Use the path to your real .pem file."
      echo "  Example: ./deploy/deploy-and-verify.sh 43.205.135.78 ~/Downloads/my-key.pem"
      exit 1
      ;;
  esac
fi

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
  if [ "$ok" -eq 0 ]; then
    echo "All checks failed. Is the host correct? (use your EC2 public IP or DNS, not a placeholder)"
    echo "  If the host is correct, on EC2 run: sudo systemctl status memoapp-backend memoapp-frontend nginx"
  else
    echo "Some checks failed. On EC2 run: sudo systemctl restart memoapp-backend memoapp-frontend nginx"
  fi
  return 1
}

if [ -z "$HOST" ]; then
  echo "Memo App – Deploy and verify"
  echo ""
  echo "Option A – Deploy via GitHub Actions (after push to main):"
  echo "  1. Add secrets: EC2_HOST, EC2_USER, EC2_SSH_KEY, EC2_APP_PATH (see deploy/GITHUB-SECRETS-AND-HOST.md)"
  echo "  2. git push origin main"
  echo "  3. Run this script to verify: ./deploy/deploy-and-verify.sh 43.205.135.78"
  echo ""
  echo "Option B – Deploy from this machine (rsync + SSH):"
  echo "  ./deploy/deploy-and-verify.sh <EC2_PUBLIC_IP> <path/to/your-key.pem>"
  echo ""
  echo "Option C – Verify only (server already deployed):"
  echo "  ./deploy/deploy-and-verify.sh <EC2_PUBLIC_IP>"
  echo ""
  echo "Option D – Fix and check on EC2 (repo must be at /home/ubuntu/memoapp on server):"
  echo "  ssh -i <key.pem> ubuntu@43.205.135.78 'cd /home/ubuntu/memoapp && bash deploy/check-on-ec2.sh'"
  echo "  Then verify: ./deploy/deploy-and-verify.sh 43.205.135.78"
  echo ""
  echo "Instance IP: 43.205.135.78 (verify: ./deploy/deploy-and-verify.sh 43.205.135.78)"
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
