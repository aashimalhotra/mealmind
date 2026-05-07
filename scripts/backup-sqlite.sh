#!/bin/bash
# SQLite Nightly Backup Script for MealMind
# This script creates a timestamped backup of the SQLite database
# and maintains a rolling 7-day backup history.

set -e

# Configuration
DB_PATH="${DB_PATH:-/opt/mealmind/backend/data/mealmind.db}"
BACKUP_DIR="${BACKUP_DIR:-/opt/mealmind/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mealmind_$TIMESTAMP.db"
LATEST_LINK="$BACKUP_DIR/mealmind_latest.db"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "ERROR: Database not found at $DB_PATH"
    exit 1
fi

# Create backup using SQLite backup command for consistency
echo "Creating backup of $DB_PATH..."
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Verify backup was created
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup failed - file not created"
    exit 1
fi

# Update latest symlink
rm -f "$LATEST_LINK"
ln -s "$BACKUP_FILE" "$LATEST_LINK"

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "mealmind_*.db" -type f -mtime +$RETENTION_DAYS -delete

# List current backups
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR"/mealmind_*.db 2>/dev/null || echo "No backups found"

echo ""
echo "Backup completed successfully!"
```

# Setup instructions:
# 1. Make the script executable: chmod +x /opt/mealmind/scripts/backup-sqlite.sh
# 2. Add to crontab for nightly backups:
#    0 2 * * * /opt/mealmind/scripts/backup-sqlite.sh >> /var/log/mealmind-backup.log 2>&1
#
# For Docker deployment, run inside the API container or as a sidecar:
# docker exec mealmind-api /scripts/backup-sqlite.sh
