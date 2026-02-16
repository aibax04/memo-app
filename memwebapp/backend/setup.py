#!/usr/bin/env python3
"""
Setup script for the Meeting Records CRUD API
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"   Error: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        print(f"   Current version: {sys.version}")
        return False
    print(f"✅ Python version {sys.version.split()[0]} is compatible")
    return True

def install_dependencies():
    """Install required dependencies"""
    print("\n📦 Installing dependencies...")
    
    # Check if requirements.txt exists
    if not Path("requirements.txt").exists():
        print("❌ requirements.txt not found")
        return False
    
    # Install dependencies
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies"):
        return False
    
    return True

def create_directories():
    """Create necessary directories"""
    print("\n📁 Creating directories...")
    
    directories = ["temp_audio"]
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ Created directory: {directory}")
    
    return True

def check_optional_dependencies():
    """Check for optional dependencies and provide guidance"""
    print("\n🔍 Checking optional dependencies...")
    
    # Check for OpenAI API key
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  OpenAI API key not found")
        print("   For enhanced audio processing, set OPENAI_API_KEY environment variable")
        print("   You can still use the application without it (basic processing only)")
    else:
        print("✅ OpenAI API key found")
    
    # Check for ffmpeg (required for audio processing)
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        print("✅ ffmpeg found (required for audio processing)")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠️  ffmpeg not found")
        print("   Install ffmpeg for audio format conversion:")
        print("   - macOS: brew install ffmpeg")
        print("   - Ubuntu: sudo apt install ffmpeg")
        print("   - Windows: Download from https://ffmpeg.org/")
    
    return True

def create_env_file():
    """Create .env file from template"""
    print("\n⚙️  Setting up environment...")
    
    if Path(".env").exists():
        print("✅ .env file already exists")
        return True
    
    if Path("env_example.txt").exists():
        try:
            import shutil
            shutil.copy("env_example.txt", ".env")
            print("✅ Created .env file from template")
            print("   Edit .env file to configure your settings")
            return True
        except Exception as e:
            print(f"❌ Failed to create .env file: {e}")
            return False
    else:
        print("⚠️  env_example.txt not found, creating basic .env file")
        try:
            with open(".env", "w") as f:
                f.write("# Meeting Records CRUD API Configuration\n")
                f.write("DATABASE_URL=sqlite:///./meeting_records.db\n")
                f.write("# Add your OpenAI API key here for enhanced processing\n")
                f.write("# OPENAI_API_KEY=your_api_key_here\n")
            print("✅ Created basic .env file")
            return True
        except Exception as e:
            print(f"❌ Failed to create .env file: {e}")
            return False

def main():
    """Main setup function"""
    print("🚀 Setting up Meeting Records CRUD API")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        print("\n❌ Setup failed during dependency installation")
        sys.exit(1)
    
    # Create directories
    if not create_directories():
        print("\n❌ Setup failed during directory creation")
        sys.exit(1)
    
    # Check optional dependencies
    check_optional_dependencies()
    
    # Create environment file
    if not create_env_file():
        print("\n❌ Setup failed during environment setup")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("✅ Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Edit .env file to configure your settings (optional)")
    print("2. Run the application: python run.py")
    print("3. Open frontend.html in your browser")
    print("4. Or use the API directly at http://localhost:8000")
    print("\n📚 Documentation:")
    print("- API Docs: http://localhost:8000/docs")
    print("- README.md for detailed instructions")
    print("\n🎯 Test the API:")
    print("- Run: python test_api.py")

if __name__ == "__main__":
    main() 