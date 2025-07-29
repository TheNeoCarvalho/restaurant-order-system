#!/bin/bash

# Database backup script for Restaurant Order System

set -e

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "❌ Error: .env file not found."
    exit 1
fi

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="restaurant_orders_backup_${DATE}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🗄️ Starting database backup..."
echo "📅 Date: $(date)"
echo "🎯 Target: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "📁 Backup file: ${BACKUP_PATH}"

# Create database backup
docker-compose exec -T postgres pg_dump \
    -h localhost \
    -U "${DB_USERNAME}" \
    -d "${DB_NAME}" \
    --no-password \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=plain > "${BACKUP_PATH}"

if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully!"
    
    # Compress the backup
    gzip "${BACKUP_PATH}"
    COMPRESSED_FILE="${BACKUP_PATH}.gz"
    
    echo "🗜️ Backup compressed: ${COMPRESSED_FILE}"
    echo "📊 File size: $(du -h "${COMPRESSED_FILE}" | cut -f1)"
    
    # Clean up old backups (keep last 30 days)
    find "${BACKUP_DIR}" -name "restaurant_orders_backup_*.sql.gz" -mtime +30 -delete
    echo "🧹 Old backups cleaned up (kept last 30 days)"
    
    # Upload to S3 if configured
    if [ -n "$BACKUP_S3_BUCKET" ] && [ -n "$AWS_ACCESS_KEY_ID" ]; then
        echo "☁️ Uploading backup to S3..."
        aws s3 cp "${COMPRESSED_FILE}" "s3://${BACKUP_S3_BUCKET}/database-backups/" \
            --region "${AWS_REGION:-us-east-1}"
        
        if [ $? -eq 0 ]; then
            echo "✅ Backup uploaded to S3 successfully!"
        else
            echo "⚠️ Failed to upload backup to S3"
        fi
    fi
    
else
    echo "❌ Backup failed!"
    exit 1
fi

echo "🎉 Backup process completed!"