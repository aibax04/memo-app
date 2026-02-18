# Current production instance

| Setting   | Value        |
|----------|--------------|
| **IP**   | 43.205.135.78 |
| **URL**  | http://43.205.135.78 |
| **Ports**| Nginx 80 (public), Backend 8002 (internal), Frontend 5173 (internal) |

## GitHub Actions

Set **EC2_HOST** = `43.205.135.78` in repo Secrets so the workflow deploys to this instance.

## Backend .env on EC2

```
PORT=8002
NODE_ENV=production
FRONTEND_URL=http://43.205.135.78
DASHBOARD_BASE_URL=http://43.205.135.78
```

## Verify

```bash
./deploy/deploy-and-verify.sh 43.205.135.78
```

Open in browser: **http://43.205.135.78**
