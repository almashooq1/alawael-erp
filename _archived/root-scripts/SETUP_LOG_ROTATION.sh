#!/bin/bash
# Log Rotation Configuration for PM2 Logs
# Setup: Run this on Linux/macOS, or configure Windows Task Scheduler equivalent

# Configuration
LOG_DIR="./backend/logs"
ARCHIVE_DIR="${LOG_DIR}/archive"
RETENTION_DAYS=90
MAX_FILE_SIZE="100M"
COMPRESS_COMMAND="gzip"

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

# Function: Rotate logs if they exceed size limit
rotate_log() {
    local log_file=$1
    local max_size=$(echo "$MAX_FILE_SIZE" | sed 's/M/000000/')

    if [ -f "$log_file" ]; then
        local file_size=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null)

        if [ "$file_size" -gt "$max_size" ]; then
            local timestamp=$(date +%Y%m%d_%H%M%S)
            local archive_name="${log_file}.${timestamp}"

            # Rotate the log file
            mv "$log_file" "$archive_name"

            # Compress the archived log
            $COMPRESS_COMMAND "$archive_name"

            # Move to archive directory
            mv "${archive_name}.gz" "$ARCHIVE_DIR/"

            echo "[$(date)] Rotated and compressed: $log_file"
        fi
    fi
}

# Function: Delete old archived logs
cleanup_old_logs() {
    find "$ARCHIVE_DIR" -type f -name "*.gz" -mtime +$RETENTION_DAYS -delete
    echo "[$(date)] Cleaned up logs older than $RETENTION_DAYS days"
}

# Main execution
echo "[$(date)] Starting log rotation..."

# Rotate each log file
for log_file in "$LOG_DIR"/*.log; do
    rotate_log "$log_file"
done

# Cleanup old backups
cleanup_old_logs

echo "[$(date)] Log rotation completed"

# Log the operation
echo "[$(date)] Log rotation cycle completed" >> "$LOG_DIR/rotation.log"
