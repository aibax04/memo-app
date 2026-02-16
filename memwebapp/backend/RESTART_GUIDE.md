# Backend Restart Guide

This guide explains how to restart the Memo App backend server on your production instance.

## Quick Restart

If you have the restart script:
```bash
cd /path/to/memwebapp/backend
./restart.sh
```

## Manual Restart Methods

### Method 1: systemd Service (Most Common)
```bash
sudo systemctl restart memoapp-backend
# Or if the service has a different name:
sudo systemctl restart memoapp
```

Check status:
```bash
sudo systemctl status memoapp-backend
```

### Method 2: supervisor
```bash
supervisorctl restart memoapp-backend
```

Check status:
```bash
supervisorctl status memoapp-backend
```

### Method 3: pm2
```bash
pm2 restart memoapp-backend
# Or restart all:
pm2 restart all
```

Check status:
```bash
pm2 list
pm2 logs memoapp-backend
```

### Method 4: Manual Process Management

1. **Find the running process:**
   ```bash
   ps aux | grep "python.*main.py"
   # Or
   pgrep -f "python.*main.py"
   ```

2. **Kill the process:**
   ```bash
   kill <PID>
   # If it doesn't stop:
   kill -9 <PID>
   ```

3. **Restart the server:**
   ```bash
   cd /path/to/memwebapp/backend
   source venv/bin/activate  # If using virtual environment
   nohup python main.py > output.log 2> error.log &
   ```

## Finding Your Process Manager

To find out which method your server uses:

```bash
# Check for systemd
systemctl list-units | grep memoapp

# Check for supervisor
supervisorctl status

# Check for pm2
pm2 list

# Check for screen/tmux
screen -ls
tmux ls

# Check running Python processes
ps aux | grep python
```

## After Restart

1. **Verify the server is running:**
   ```bash
   curl http://localhost:8000/health
   # Or
   curl https://psi.memoapp.io/health
   ```

2. **Check logs:**
   ```bash
   tail -f output.log
   tail -f error.log
   # Or if using systemd:
   sudo journalctl -u memoapp-backend -f
   ```

3. **Test the suggest endpoints:**
   ```bash
   curl -X POST https://psi.memoapp.io/api/v1/mobile/debug/routes
   ```

## Common Issues

### Port Already in Use
If you get "port already in use" error:
```bash
# Find process using port 8000
lsof -i :8000
# Kill it
kill -9 <PID>
```

### Permission Denied
Make sure you have the right permissions:
```bash
sudo systemctl restart memoapp-backend
# Or
sudo supervisorctl restart memoapp-backend
```

## Notes

- After pushing new code, **always restart the server** for changes to take effect
- The route order fix requires a restart to be applied
- Check logs after restart to ensure everything started correctly

