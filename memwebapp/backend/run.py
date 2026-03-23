#!/usr/bin/env python3
"""
Startup script for the Meeting Records CRUD API
"""

import uvicorn
import os
import sys
from pathlib import Path

def main():
    """Start the FastAPI application"""
    
    # Check if required directories exist
    required_dirs = ['api', 'config', 'database']
    missing_dirs = [d for d in required_dirs if not Path(d).exists()]
    
    if missing_dirs:
        print("❌ Missing required directories:")
        for directory in missing_dirs:
            print(f"   - {directory}")
        print("\nPlease ensure all directories are present in the current directory.")
        sys.exit(1)
    
    # Check if required files exist
    required_files = ['main.py', 'config/settings.py', 'database/connection.py', 'api/routers/meetings.py']
    missing_files = [f for f in required_files if not Path(f).exists()]
    
    if missing_files:
        print("❌ Missing required files:")
        for file in missing_files:
            print(f"   - {file}")
        print("\nPlease ensure all files are present in the current directory.")
        sys.exit(1)
    
    # Create temp_audio directory if it doesn't exist
    temp_audio_dir = Path("temp_audio")
    temp_audio_dir.mkdir(exist_ok=True)
    
    # Get configuration from environment or use defaults
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    print("🚀 Starting OWNnote API (Meeting Records)")
    print("=" * 60)
    print(f"📡 Server: http://{host}:{port}")
    print(f"📚 API Docs: http://{host}:{port}/docs")
    print(f"📖 ReDoc: http://{host}:{port}/redoc")
    print(f"🏥 Health Check: http://{host}:{port}/health")
    print(f"🌐 Frontend: Open frontend.html in your browser")
    print("=" * 60)
    print("Press Ctrl+C to stop the server")
    print()
    
    try:
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 