#!/bin/bash
# Restart script for Memo App Backend Server

echo "🔄 Restarting Memo App Backend Server..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if running in a virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ Activated virtual environment"
fi

# Try different process management methods
# Method 1: systemd service
if systemctl is-active --quiet memoapp-backend 2>/dev/null; then
    echo "📦 Detected systemd service"
    sudo systemctl restart memoapp-backend
    echo "✅ Backend restarted via systemd"
    exit 0
fi

# Method 2: supervisor
if command -v supervisorctl &> /dev/null; then
    if supervisorctl status memoapp-backend &> /dev/null; then
        echo "📦 Detected supervisor"
        supervisorctl restart memoapp-backend
        echo "✅ Backend restarted via supervisor"
        exit 0
    fi
fi

# Method 3: pm2
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "memoapp-backend"; then
        echo "📦 Detected pm2"
        pm2 restart memoapp-backend
        echo "✅ Backend restarted via pm2"
        exit 0
    fi
fi

# Method 4: Find and kill existing process, then restart
echo "🔍 Looking for running backend process..."
PID=$(pgrep -f "python.*main.py" | head -1)

if [ ! -z "$PID" ]; then
    echo "🛑 Stopping existing process (PID: $PID)"
    kill $PID
    sleep 2
    
    # Force kill if still running
    if kill -0 $PID 2>/dev/null; then
        echo "⚠️  Process still running, force killing..."
        kill -9 $PID
        sleep 1
    fi
fi

# Start the server
echo "🚀 Starting backend server..."
if [ -f "main.py" ]; then
    nohup python main.py > output.log 2> error.log &
    NEW_PID=$!
    echo "✅ Backend started with PID: $NEW_PID"
    echo "📝 Logs: output.log and error.log"
else
    echo "❌ Error: main.py not found in current directory"
    exit 1
fi

echo "✅ Restart complete!"

