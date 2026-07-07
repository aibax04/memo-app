# Memo App

Welcome to **Memo** (accessible at [ext.makememo.ai](https://ext.makememo.ai)), a comprehensive full-stack application leveraging AI for notes, audio processing, and meeting summaries.

## 🚀 Quick Access

- **Production URL**: [https://ext.makememo.ai](https://ext.makememo.ai)

## 🛠 Tech Stack

Memo is built using a modern, scalable tech stack:

### Frontend (`memwebapp/frontend`)
- **Framework**: React 18 with TypeScript, bootstrapped via [Vite](https://vitejs.dev/).
- **Styling**: Tailwind CSS combined with [shadcn/ui](https://ui.shadcn.com/) (Radix UI components).
- **State Management & Fetching**: React Query (`@tanstack/react-query`).
- **Forms & Validation**: React Hook Form + Zod.
- **Charts**: Recharts & ApexCharts.
- **Icons**: Lucide React.

### Backend (`memwebapp/backend`)
- **Framework**: FastAPI (Python 3) running on Uvicorn.
- **Database**: PostgreSQL (via SQLAlchemy & `psycopg2-binary`).
- **AI & Audio Processing**:
  - OpenAI API (`openai`)
  - Google Gemini (`google-generativeai`)
  - Audio processing using Whisper, PyDub, and SpeechRecognition.
- **Authentication**: JWT-based auth (`python-jose`, `passlib`, `bcrypt`) alongside OAuth integrations (Google & MSAL).
- **Cloud/Storage**: AWS SDK (`boto3`).

### Infrastructure & Deployment
- **Containerization**: Docker & Docker Compose (`docker-compose.yml`).
- **Web Server**: Nginx (used as a reverse proxy in production).

---

## 💻 Local Development

To run Memo locally, we provide a unified startup script that handles both the frontend dev server and the backend API.

1. Ensure you have **Python 3** and **Node.js** installed.
2. Clone the repository.
3. Install frontend dependencies:
   ```bash
   cd memwebapp/frontend
   npm install
   ```
4. Create a virtual environment and install backend dependencies:
   ```bash
   cd memwebapp/backend
   python -m venv .venv
   source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```
5. Set up your `.env` files in both `memwebapp/backend` and `memwebapp/frontend`.
6. Run the application from the root directory:
   ```bash
   python run.py
   ```
   - Frontend will be available at `http://localhost:5173`
   - Backend API will be available at `http://localhost:8000` (or the port specified in your backend `.env`)

---

## ☁️ Setting Up on AWS

To host Memo on AWS, follow these steps to configure an EC2 instance:

1. **Provision an EC2 Instance**: Launch an Ubuntu instance (e.g., Ubuntu 22.04 LTS or newer).
2. **Security Groups**: Ensure ports `80` (HTTP), `443` (HTTPS), and `22` (SSH) are open.
3. **Install Dependencies on EC2**: SSH into the server and install Docker, Docker Compose, and Nginx.
4. **Configure Nginx**: Set up an Nginx reverse proxy to route traffic:
   - Route root `/` traffic to the frontend port (`5173` or `80` mapped in docker).
   - Route API traffic (e.g., `/api`) to the backend port (`8002`).
5. **Set up SSH Alias (Required for Deployment)**:
   The deployment script relies on an SSH alias named `Acknowledge`. Add this to your local `~/.ssh/config` file:
   ```text
   Host Acknowledge
       HostName <YOUR_EC2_IP_ADDRESS>
       User ubuntu
       IdentityFile ~/.ssh/your-aws-key.pem
   ```
6. **Clone & Configure**: Create the `/home/ubuntu/memoapp` directory on the server and add your production `.env` files to `memwebapp/backend/.env` and `memwebapp/frontend/.env`.

---

## 🚢 Deployment (`sync_to_prod.sh`)

We use a custom bash script (`sync_to_prod.sh`) for rapid deployment to production, bypassing GitHub. 

### How `sync_to_prod.sh` works:
1. **Syncs Files**: It uses `rsync` to push your local files directly to the EC2 server (alias `Acknowledge`), excluding heavy folders like `node_modules`, `.venv`, and `.git`.
2. **Rebuilds on Server**: It connects via SSH and runs a remote sequence:
   - Stops existing Docker containers (`memoapp_backend`, `memoapp_frontend`).
   - Updates backend Python dependencies in the virtual environment.
   - Installs Node modules and creates a fresh Vite production build for the frontend.
   - Runs database migrations (if switching to Postgres) and database seeds (`seed_templates.py`, `seed_sample_meeting.py`).
   - Restarts `systemd` services (`memoapp-backend`, `memoapp-frontend`) and reloads `nginx`.

### Usage:
Whenever you have local changes ready for production, simply run:
```bash
./sync_to_prod.sh
```
> **Note:** Ensure your local `Acknowledge` SSH host is correctly configured in `~/.ssh/config` before running this script.
