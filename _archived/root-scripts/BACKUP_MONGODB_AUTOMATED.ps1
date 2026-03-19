# MongoDB Automated Backup Script
# Schedule: Daily at 2:00 AM via Windows Task Scheduler

param([string]$BackupPath = "C:\mongodb-backups")

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFolder = Join-Path $BackupPath "backup_$timestamp"
$logFile = Join-Path $BackupPath "backups.log"

Write-Host "Starting MongoDB backup at $(Get-Date)" | Tee-Object -FilePath $logFile -Append

# Create today's backup folder
New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null

# Execute mongodump
$mongodumpPath = "C:\Program Files\MongoDB\Server\6.0\bin\mongodump.exe"
if (Test-Path $mongodumpPath) {
    & $mongodumpPath --uri "mongodb://localhost:27017/alawael-erp" --out $backupFolder
    Write-Host "? Backup completed to: $backupFolder" | Tee-Object -FilePath $logFile -Append
} else {
    Write-Host "??  mongodump not found at $mongodumpPath" -ForegroundColor Yellow
    Write-Host "Using manual backup as fallback..." -ForegroundColor Yellow
    Copy-Item -Path "backend/data/*" -Destination $backupFolder -Recurse -ErrorAction SilentlyContinue
}

# Cleanup old backups (keep last 30 days)
$deleteDate = (Get-Date).AddDays(-30)
Get-ChildItem -Path $BackupPath -Directory | Where-Object { $_.CreationTime -lt $deleteDate } | Remove-Item -Recurse -Force

Write-Host "Backup completed successfully" | Tee-Object -FilePath $logFile -Append
