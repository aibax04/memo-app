import os
import signal
import socket
import subprocess
import sys
import time


def _read_backend_port(backend_dir: str) -> int:
    """Read PORT from memwebapp/backend/.env (default 8000)."""
    env_path = os.path.join(backend_dir, ".env")
    port = 8000
    if not os.path.isfile(env_path):
        return port
    try:
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if line.upper().startswith("PORT="):
                    raw = line.split("=", 1)[1].strip().strip('"').strip("'")
                    port = int(raw)
                    break
    except (OSError, ValueError):
        pass
    return port


def _tcp_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def _backend_python_exe(backend_dir: str) -> str:
    """Prefer the backend virtualenv so deps (FastAPI, uvicorn, etc.) are available."""
    if os.name == "nt":
        candidate = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
    else:
        candidate = os.path.join(backend_dir, ".venv", "bin", "python")
    if os.path.isfile(candidate):
        return candidate
    return sys.executable


def _popen_kwargs() -> dict:
    """On Unix, new session so we can kill the whole dev tree (npm/vite, uvicorn --reload)."""
    if os.name == "nt":
        return {}
    return {"start_new_session": True}


def _terminate_process(p: subprocess.Popen) -> None:
    if p.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(p.pid)],
            capture_output=True,
        )
    else:
        try:
            os.killpg(os.getpgid(p.pid), signal.SIGTERM)
        except ProcessLookupError:
            p.terminate()


def run():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "memwebapp", "backend")
    frontend_dir = os.path.join(root_dir, "memwebapp", "frontend")

    if not os.path.exists(backend_dir):
        print(f"❌ Backend directory not found at {backend_dir}")
        return
    if not os.path.exists(frontend_dir):
        print(f"❌ Frontend directory not found at {frontend_dir}")
        return

    backend_py = _backend_python_exe(backend_dir)
    if backend_py != sys.executable:
        print(f"🐍 Using backend venv: {backend_py}")
    else:
        print(
            "⚠️  No memwebapp/backend/.venv found; using current Python. "
            "Create the venv and pip install -r requirements.txt if imports fail."
        )

    processes: list[subprocess.Popen] = []
    pop_kw = _popen_kwargs()
    child_env = {**os.environ, "PYTHONUNBUFFERED": "1"}

    backend_port = _read_backend_port(backend_dir)
    if _tcp_port_in_use(backend_port):
        print(
            f"❌ Port {backend_port} is already in use (another API server is probably still running)."
        )
        print("   Stop it first, then run this script again.")
        if os.name == "nt":
            print(f"   Check:  netstat -ano | findstr :{backend_port}")
        else:
            print(f"   Check:  lsof -nP -iTCP:{backend_port} -sTCP:LISTEN")
            print(f"   Stop:   kill <PID>   (or close the terminal where you ran the app before)")
        return

    vite_port = 5173
    if _tcp_port_in_use(vite_port):
        print(
            f"⚠️  Port {vite_port} looks busy; Vite may pick another port or fail. "
            "Stop the old dev server if you see errors."
        )

    try:
        print("🚀 Starting OWNnote Backend...")
        backend_process = subprocess.Popen(
            [backend_py, "run.py"],
            cwd=backend_dir,
            env=child_env,
            shell=False,
            **pop_kw,
        )
        processes.append(backend_process)

        print("🚀 Starting OWNnote Frontend...")
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        try:
            subprocess.run(
                [npm_cmd, "--version"],
                capture_output=True,
                check=True,
            )
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ npm not found. Please ensure Node.js is installed and in your PATH.")
            _terminate_process(backend_process)
            return

        frontend_shell = os.name == "nt"
        frontend_process = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=frontend_dir,
            env=child_env,
            shell=frontend_shell,
            **({} if frontend_shell else pop_kw),
        )
        processes.append(frontend_process)

        print("\n" + "=" * 60)
        print("🎉 OWNnote is running!")
        print(f"📡 Backend:  http://localhost:{backend_port}")
        print(f"📖 API Docs: http://localhost:{backend_port}/docs")
        print("🎨 Frontend: http://localhost:5173  (see Vite output if the port differs)")
        print("🔗 Frontend talks to the API via VITE_API_URL in memwebapp/frontend/.env")
        print("=" * 60 + "\n")
        print("👉 Press Ctrl+C to stop both processes safely.\n")

        while True:
            time.sleep(1)
            if backend_process.poll() is not None:
                print(f"❌ Backend process exited with code {backend_process.returncode}")
                break
            if frontend_process.poll() is not None:
                print(f"❌ Frontend process exited with code {frontend_process.returncode}")
                break

    except KeyboardInterrupt:
        print("\n🛑 Shutting down OWNnote...")
    except Exception as e:
        print(f"❌ An error occurred: {e}")
    finally:
        for p in processes:
            if p.poll() is None:
                print(f"⏱  Stopping process {p.pid}...")
                _terminate_process(p)
        time.sleep(1)
        print("✅ All processes stopped. Goodbye!")


if __name__ == "__main__":
    run()
