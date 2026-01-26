# Database Backup Script (Windows/PowerShell)
# سكريبت النسخ الاحتياطية لقاعدة البيانات (Windows)

param(
    [Parameter(Position = 0)]
    [string]$Command = "help",
    
    [string]$BackupDir = "./backups",
    [string]$ArchiveDir = "./backups/archive",
    [int]$RetentionDays = 30,
    [string]$MongoUri = "mongodb://admin:admin@localhost:27017/alawael"
)

# ================== Configuration ==================

$ErrorActionPreference = "Stop"

# Color codes
$Colors = @{
    Blue   = "`e[34m"
    Green  = "`e[32m"
    Red    = "`e[31m"
    Yellow = "`e[33m"
    Reset  = "`e[0m"
}

# ================== Functions ==================

function Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "$($Colors.Blue)[$timestamp]$($Colors.Reset) $Message"
}

function Success {
    param([string]$Message)
    Write-Host "$($Colors.Green)✅ $Message$($Colors.Reset)"
}

function Error {
    param([string]$Message)
    Write-Host "$($Colors.Red)❌ $Message$($Colors.Reset)"
}

function Warning {
    param([string]$Message)
    Write-Host "$($Colors.Yellow)⚠️  $Message$($Colors.Reset)"
}

# Create backup directories
function Create-BackupDirs {
    if (!(Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir | Out-Null
    }
    if (!(Test-Path $ArchiveDir)) {
        New-Item -ItemType Directory -Path $ArchiveDir | Out-Null
    }
    Success "Backup directories created"
}

# Full Database Backup
function Backup-Full {
    Log "Starting Full Database Backup..."
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = "full_backup_$timestamp"
    $backupPath = Join-Path $BackupDir $backupName

    # Create backup directory
    New-Item -ItemType Directory -Path $backupPath | Out-Null

    # Run mongodump
    try {
        & mongodump --uri=$MongoUri --out=$backupPath --verbose
        
        # Create archive
        $archivePath = Join-Path $ArchiveDir "$backupName.zip"
        Compress-Archive -Path $backupPath -DestinationPath $archivePath -Force
        
        # Clean up
        Remove-Item $backupPath -Recurse -Force
        
        Success "Full backup completed: $backupName"
    }
    catch {
        Error "Full backup failed: $_"
        return $false
    }
    
    return $true
}

# Incremental Backup
function Backup-Incremental {
    Log "Starting Incremental Backup..."
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = "incremental_backup_$timestamp"
    $backupPath = Join-Path $BackupDir $backupName

    New-Item -ItemType Directory -Path $backupPath | Out-Null

    $collections = @("users", "modules", "reports", "attendance", "payments", "documents")

    foreach ($collection in $collections) {
        Log "Backing up collection: $collection"

        try {
            $outputFile = Join-Path $backupPath "$collection.json"
            & mongoexport --uri=$MongoUri --collection=$collection --out=$outputFile --jsonArray
        }
        catch {
            Warning "Failed to backup collection: $collection"
        }
    }

    # Create archive
    try {
        $archivePath = Join-Path $ArchiveDir "$backupName.zip"
        Compress-Archive -Path $backupPath -DestinationPath $archivePath -Force
        Remove-Item $backupPath -Recurse -Force
        Success "Incremental backup completed"
    }
    catch {
        Error "Failed to create archive: $_"
    }
}

# Backup specific collection
function Backup-Collection {
    param([string]$CollectionName)
    
    if ([string]::IsNullOrEmpty($CollectionName)) {
        Error "Collection name required"
        return $false
    }

    Log "Backing up collection: $CollectionName"

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = Join-Path $ArchiveDir "${CollectionName}_${timestamp}.json"

    try {
        & mongoexport --uri=$MongoUri --collection=$CollectionName --out=$backupFile --jsonArray
        
        # Compress
        $compressedFile = "$backupFile.zip"
        Compress-Archive -Path $backupFile -DestinationPath $compressedFile
        Remove-Item $backupFile
        
        Success "Collection backup completed: $(Split-Path $compressedFile -Leaf)"
    }
    catch {
        Error "Collection backup failed: $_"
        return $false
    }

    return $true
}

# Restore from backup
function Restore-Backup {
    param([string]$BackupFile)

    if ([string]::IsNullOrEmpty($BackupFile) -or !(Test-Path $BackupFile)) {
        Error "Backup file not found: $BackupFile"
        return $false
    }

    Log "Restoring from backup: $BackupFile"

    $tempPath = Join-Path $BackupDir "restore_temp"
    
    try {
        # Extract archive
        Expand-Archive -Path $BackupFile -DestinationPath $tempPath -Force
        
        # Get extracted directory
        $backupDir = Get-ChildItem $tempPath | Select-Object -First 1
        
        # Restore
        & mongorestore --uri=$MongoUri (Join-Path $tempPath $backupDir.Name) --verbose
        
        # Cleanup
        Remove-Item $tempPath -Recurse -Force
        
        Success "Restore completed successfully"
    }
    catch {
        Error "Restore failed: $_"
        return $false
    }

    return $true
}

# List all backups
function List-Backups {
    Log "Available Backups:"
    Write-Host ""
    
    if (!(Test-Path $ArchiveDir)) {
        Warning "No backups found"
        return
    }
    
    Get-ChildItem $ArchiveDir -File | Sort-Object -Property LastWriteTime -Descending | ForEach-Object {
        $size = "{0:N2} MB" -f ($_.Length / 1MB)
        $date = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        Write-Host "  $($_.Name) [$size] - $date"
    }
    Write-Host ""
}

# Cleanup old backups
function Cleanup-OldBackups {
    Log "Cleaning up backups older than $RetentionDays days..."

    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    $deleted = 0

    if (Test-Path $ArchiveDir) {
        Get-ChildItem $ArchiveDir -File | Where-Object { $_.LastWriteTime -lt $cutoffDate } | ForEach-Object {
            Log "Deleting: $($_.Name)"
            Remove-Item $_.FullName -Force
            $deleted++
        }
    }

    if ($deleted -gt 0) {
        Success "Cleanup completed - $deleted old backups deleted"
    }
    else {
        Success "No old backups to delete"
    }
}

# Show backup statistics
function Show-Stats {
    Log "Backup Statistics:"
    Write-Host ""

    $backupDirSize = 0
    $archiveDirSize = 0

    if (Test-Path $BackupDir) {
        $backupDirSize = (Get-ChildItem $BackupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    }

    if (Test-Path $ArchiveDir) {
        $archiveDirSize = (Get-ChildItem $ArchiveDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    }

    $totalSize = $backupDirSize + $archiveDirSize
    $backupCount = 0

    if (Test-Path $ArchiveDir) {
        $backupCount = (Get-ChildItem $ArchiveDir -File | Measure-Object).Count
    }

    Write-Host "  Total Backups: $backupCount"
    Write-Host "  Total Size: $("{0:N2} MB" -f $totalSize)"

    if (Test-Path $ArchiveDir) {
        $latest = Get-ChildItem $ArchiveDir -File | Sort-Object -Property LastWriteTime -Descending | Select-Object -First 1
        if ($latest) {
            Write-Host "  Latest: $($latest.Name) - $($latest.LastWriteTime)"
        }

        $oldest = Get-ChildItem $ArchiveDir -File | Sort-Object -Property LastWriteTime | Select-Object -First 1
        if ($oldest) {
            Write-Host "  Oldest: $($oldest.Name)"
        }
    }

    Write-Host ""
}

# Setup scheduled task
function Setup-ScheduledTask {
    Log "Setting up backup scheduled task..."

    Write-Host ""
    Write-Host "Example PowerShell Scheduled Task:"
    Write-Host ""
    Write-Host '$trigger = New-JobTrigger -Daily -At "2:00 AM"'
    Write-Host '$action = New-ScheduledJobOption -RunElevated'
    Write-Host 'Register-ScheduledJob -Name "DatabaseBackup" -Trigger $trigger -ScriptBlock {'
    Write-Host '  & ""C:\path\to\backup.ps1"" -Command full'
    Write-Host '} -RunAs32'
    Write-Host ""
}

# ================== Main ==================

switch ($Command.ToLower()) {
    "init" {
        Log "Initializing backup system..."
        Create-BackupDirs
        Success "Backup system initialized"
    }

    "full" {
        Create-BackupDirs
        Backup-Full
    }

    "incremental" {
        Create-BackupDirs
        Backup-Incremental
    }

    "collection" {
        Create-BackupDirs
        if ($args.Count -gt 0) {
            Backup-Collection -CollectionName $args[0]
        }
        else {
            Error "Collection name required"
        }
    }

    "restore" {
        if ($args.Count -gt 0) {
            Restore-Backup -BackupFile $args[0]
        }
        else {
            Error "Backup file path required"
        }
    }

    "list" {
        List-Backups
    }

    "cleanup" {
        Cleanup-OldBackups
    }

    "stats" {
        Show-Stats
    }

    "scheduled" {
        Setup-ScheduledTask
    }

    "all" {
        Log "Running complete backup routine..."
        Create-BackupDirs
        Backup-Full
        Cleanup-OldBackups
        Show-Stats
        Success "Backup routine completed"
    }

    default {
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════════════╗"
        Write-Host "║          📦 Database Backup Management (PowerShell) 📦        ║"
        Write-Host "╚════════════════════════════════════════════════════════════════╝"
        Write-Host ""
        Write-Host "Usage: .\backup.ps1 <command> [options]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  init              Initialize backup system"
        Write-Host "  full              Perform full database backup"
        Write-Host "  incremental       Perform incremental backup"
        Write-Host "  collection <name> Backup specific collection"
        Write-Host "  restore <path>    Restore from backup file"
        Write-Host "  list              List all available backups"
        Write-Host "  cleanup           Remove old backups"
        Write-Host "  stats             Show backup statistics"
        Write-Host "  scheduled         Setup automated backups"
        Write-Host "  all               Run complete backup routine"
        Write-Host ""
        Write-Host "Examples:"
        Write-Host "  .\backup.ps1 full"
        Write-Host "  .\backup.ps1 collection users"
        Write-Host "  .\backup.ps1 restore ""backups/full_backup_20250104_120000.zip"""
        Write-Host ""
        Write-Host "Configuration:"
        Write-Host "  MongoUri: $MongoUri"
        Write-Host "  BackupDir: $BackupDir"
        Write-Host "  ArchiveDir: $ArchiveDir"
        Write-Host "  Retention: $RetentionDays days"
        Write-Host ""
    }
}
