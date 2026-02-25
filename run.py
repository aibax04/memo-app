import subprocess
import os
import signal
import sys
import time

def run():
    # Paths to sub-projects
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "memwebapp", "backend")
    frontend_dir = os.path.join(root_dir, "memwebapp", "frontend")

    # Check if directories exist
    if not os.path.exists(backend_dir):
        print(f"❌ Backend directory not found at {backend_dir}")
        return
    if not os.path.exists(frontend_dir):
        print(f"❌ Frontend directory not found at {frontend_dir}")
        return

    processes = []

    try:
        # 1. Start Backend
        print("🚀 Starting Memo App Backend...")
        backend_process = subprocess.Popen(
            [sys.executable, "run.py"],
            cwd=backend_dir,
            shell=False
        )
        processes.append(backend_process)

        # 2. Start Frontend
        print("🚀 Starting Memo App Frontend...")
        # On Windows, we need to use shell=True for npm or use npm.cmd
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        
        # Check if npm exists
        try:
            subprocess.run([npm_cmd, "--version"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ npm not found. Please ensure Node.js is installed and in your PATH.")
            backend_process.terminate()
            return

        frontend_process = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=frontend_dir,
            shell=True if os.name == "nt" else False
        )
        processes.append(frontend_process)

        print("\n" + "="*60)
        print("🎉 Memo App is running!")
        print(f"📡 Backend:  http://localhost:8000")
        print(f"📖 API Docs: http://localhost:8000/docs")
        print(f"🎨 Frontend: http://localhost:5173")
        print("="*60 + "\n")
        print("👉 Press Ctrl+C to stop both processes safely.\n")

        # Keep the script running
        while True:
            time.sleep(1)
            # Monitor if any process died
            if backend_process.poll() is not None:
                print(f"❌ Backend process exited with code {backend_process.returncode}")
                break
            if frontend_process.poll() is not None:
                print(f"❌ Frontend process exited with code {frontend_process.returncode}")
                break

    except KeyboardInterrupt:
        print("\n🛑 Shutting down Memo App...")
    except Exception as e:
        print(f"❌ An error occurred: {e}")
    finally:
        # Clean up processes
        for p in processes:
            if p.poll() is None:
                print(f"⏱  Stopping process {p.pid}...")
                if os.name == 'nt':
                    # On Windows, we often need taskkill to kill process trees (especially for npm/vite)
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], capture_output=True)
                else:
                    p.terminate()
        
        # Wait a moment for cleanup
        time.sleep(1)
        print("✅ All processes stopped. Goodbye!")

if __name__ == "__main__":
    run()
