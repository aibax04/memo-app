# Set up deploy to run on your AWS host

The workflow **Deploy Memo App to AWS EC2** (`.github/workflows/deploy-production.yml`) runs on every **push to `main`** and deploys to the host you configure below.

## 1. Add GitHub Secrets

Use **Actions** secrets (not Environment variables). In your GitHub repo: **Settings → Secrets and variables → Actions** → **New repository secret**. Add:

| Secret name    | Value | Example |
|----------------|-------|--------|
| **EC2_HOST**   | Your EC2 public IP or public DNS | `43.205.135.78` |
| **EC2_USER**   | SSH user (Ubuntu AMI = `ubuntu`) | `ubuntu` |
| **EC2_SSH_KEY**| Full contents of your `.pem` private key | Paste entire file (including `-----BEGIN...` and `-----END...`) |
| **EC2_APP_PATH**| Path on the server where the app will live | `/home/ubuntu/memoapp` |
| **GH_CLONE_TOKEN** (optional) | GitHub Personal Access Token (repo scope) for cloning a **private** repo on EC2 | `ghp_xxxx` |

- **EC2_HOST**: From AWS Console → EC2 → Instances → your instance → “Public IPv4 address” or “Public IPv4 DNS”.
- **EC2_SSH_KEY**: The private key you use to `ssh -i key.pem ubuntu@<EC2_HOST>` (copy the whole file).
- **EC2_APP_PATH**: Directory on the EC2 instance where the repo will be cloned and the app will run. Use `/home/ubuntu/memoapp` unless you want a different path.

## 2. One-time setup on your EC2 host

SSH into the host and either clone the repo and run the bootstrap script, or copy the script and run it.

**Option A – Clone repo on EC2 and bootstrap**

```bash
ssh -i your-key.pem ubuntu@43.205.135.78

# Clone your repo (replace with your repo URL; use HTTPS or SSH)
git clone https://github.com/YOUR_ORG/opticall-mobile-backend.git /home/ubuntu/memoapp
cd /home/ubuntu/memoapp

# One-time bootstrap: nginx, backend .venv, frontend build, systemd services
bash deploy/bootstrap-ec2.sh
```

**Option B – Copy bootstrap from your laptop**

```bash
# From your laptop
scp -i your-key.pem -r deploy ubuntu@43.205.135.78:/tmp/
scp -i your-key.pem -r memwebapp ubuntu@43.205.135.78:/tmp/
ssh -i your-key.pem ubuntu@43.205.135.78 'mkdir -p /home/ubuntu/memoapp && mv /tmp/deploy /tmp/memwebapp /home/ubuntu/memoapp/ && cd /home/ubuntu/memoapp && bash deploy/bootstrap-ec2.sh'
```

**Then on the server, set production env:**

```bash
nano /home/ubuntu/memoapp/memwebapp/backend/.env
# Set at least: PORT=8002, NODE_ENV=production, DATABASE_URL=..., JWT_SECRET=..., FRONTEND_URL=http://43.205.135.78
sudo systemctl restart memoapp-backend
```

## 3. Security group (AWS)

On the EC2 instance’s security group, allow:

- **22** (SSH) from your IP (or your CI IP if you want)
- **80** (HTTP) from `0.0.0.0/0` (so the app is reachable)
- **443** (HTTPS) from `0.0.0.0/0` if you use SSL

Do **not** open 5173 or 8002 to the internet; nginx on 80 is the public entry.

## 4. Make sure the workflow runs on your host

1. Push to **main** (or trigger **Actions → Deploy Memo App to AWS EC2 → Run workflow**).
2. Open **Actions** tab and click the running or latest workflow.
3. If it fails, check the log; typical issues:
   - **EC2_HOST / EC2_SSH_KEY**: Wrong host, wrong key, or key not in PEM format.
   - **Permission denied (publickey)**: EC2_SSH_KEY doesn’t match the key pair used for the instance.
   - **Clone failed**: Repo private and no token; use a deploy key or add a token (e.g. **GH_TOKEN** secret) and adjust the clone URL in the workflow.

## 5. Check that production is running on your host

From your machine:

```bash
# Replace with your EC2 IP or domain
curl http://43.205.135.78/health
curl -I http://43.205.135.78/
```

On the server:

```bash
sudo systemctl status memoapp-backend memoapp-frontend nginx
curl -s http://127.0.0.1:8002/health
curl -sI http://127.0.0.1:5173 | head -1
```

Once secrets and one-time setup are done, every push to **main** will deploy and restart the app on the host you provided.
