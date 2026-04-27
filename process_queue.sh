#!/bin/bash
# Script to process NusaERP agent task queue
# Called when agent_tasks.json is modified

QUEUE_FILE="/home/dindin/nusaerp-api/agent_tasks.json"
LOG_FILE="/home/dindin/nusaerp-api/queue_processor.log"

echo "[$(date)] Queue file changed, checking for pending tasks..." >> "$LOG_FILE"

# Check if there are pending tasks
PENDING_COUNT=$(cat "$QUEUE_FILE" | jq '[.[] | select(.status=="PENDING")] | length' 2>/dev/null || echo "0")

if [ "$PENDING_COUNT" -gt 0 ]; then
    echo "[$(date)] Found $PENDING_COUNT pending task(s), triggering Abdul..." >> "$LOG_FILE"
    # Create trigger file for Abdul
    echo "PROCESS_QUEUE" > /tmp/nusaerp_queue_trigger
else
    echo "[$(date)] No pending tasks." >> "$LOG_FILE"
fi
