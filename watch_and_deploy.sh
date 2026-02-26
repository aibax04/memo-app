#!/usr/bin/env bash
# Simple watcher that triggers sync_to_prod.sh when changes are detected.

LAST_MOD=""

echo "👀 Watching for changes in $(pwd)..."

while true; do
  # Find the most recently modified file (excluding ignored dirs)
  CURRENT_MOD=$(find . -maxdepth 3 -not -path '*/.*' -not -path './node_modules*' -not -path './.venv*' -type f -exec stat -t %Y {} + | cut -d' ' -f2 | sort -n | tail -1)
  
  if [ "$CURRENT_MOD" != "$LAST_MOD" ]; then
    if [ -n "$LAST_MOD" ]; then
      echo "✨ Change detected! Syncing..."
      ./sync_to_prod.sh
    fi
    LAST_MOD=$CURRENT_MOD
  fi
  sleep 2
done
