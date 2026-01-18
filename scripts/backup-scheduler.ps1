#!/usr/bin/env powershell

<#
.SYNOPSIS
Backup Scheduler for Alawael ERP System
.DESCRIPTION
Automates database backups using Windows Task Scheduler
.AUTHOR
Alawael Development Team
.VERSION
1.0.0
#>

param(
    [string]$Action = "schedule",
    [string]$Frequency = "daily",  # daily, hourly, weekly
    [int]$IntervalHours = 24,
    [string]$Time = "02:00",  # HH:mm
    [ValidateSet("System", "Current")]
    [string]$RunAs = "Current"
)

$ProjectRoot = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"
$BackendDir = Join-Path $ProjectRoot "backend"
$ScriptsDir = Join-Path $ProjectRoot "scripts"
$BackupDir = Join-Path $ProjectRoot "backups"
$LogDir = Join-Path $ProjectRoot "logs"
$BackupScript = Join-Path $BackendDir "scripts\backup.js"
$TaskName = "Alawael-Backup-Scheduler"

# Ensure directories exist
@($BackupDir, $LogDir) | ForEach-Object {
    if (!(Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
        Write-Host "✅ Created directory: $_" -ForegroundColor Green
    }
}

function New-BackupTask {
    <#
    .SYNOPSIS
    Create a new scheduled backup task
    #>
    
    Write-Host "`n📅 Setting up automated backup scheduler..." -ForegroundColor Cyan
    
    $BackupCommand = @"
`$ErrorActionPreference = 'Continue'
`$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
`$logFile = '$LogDir\backup-`$timestamp.log'

try {
    Write-Host "[`$timestamp] Starting backup..." | Tee-Object -FilePath `$logFile -Append
    
    # Create backup via API
    `$response = Invoke-RestMethod -Uri 'http://localhost:3001/api/backup/create' `
        -Method POST `
        -ContentType 'application/json' `
        -ErrorAction Stop
    
    if (`$response.success) {
        Write-Host "[`$timestamp] ✅ Backup created: `$(`$response.filename)" | Tee-Object -FilePath `$logFile -Append
        Write-Host "[`$timestamp] Size: `$(`$response.size) bytes" | Tee-Object -FilePath `$logFile -Append
    } else {
        Write-Host "[`$timestamp] ❌ Backup failed: `$(`$response.message)" | Tee-Object -FilePath `$logFile -Append
    }
}
catch {
    Write-Host "[`$timestamp] ❌ Error: `$(`$_.Exception.Message)" | Tee-Object -FilePath `$logFile -Append
}
"@

    # Save script to file
    $TaskScriptPath = Join-Path $ScriptsDir "run-backup.ps1"
    $BackupCommand | Out-File -FilePath $TaskScriptPath -Encoding UTF8 -Force
    Write-Host "✅ Created backup script: $TaskScriptPath" -ForegroundColor Green

    # Create scheduled task
    try {
        # Remove existing task if present
        Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false
    }
    catch {}

    # Create trigger based on frequency
    switch ($Frequency.ToLower()) {
        "hourly" {
            $Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 365)
            Write-Host "📌 Frequency: Every hour" -ForegroundColor Yellow
        }
        "daily" {
            [datetime]$TimeObj = Get-Date -Hour 2 -Minute 0 -Second 0
            $Trigger = New-ScheduledTaskTrigger -Daily -At $TimeObj
            Write-Host "📌 Frequency: Daily at 02:00 AM" -ForegroundColor Yellow
        }
        "weekly" {
            [datetime]$TimeObj = Get-Date -Hour 2 -Minute 0 -Second 0
            $Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At $TimeObj
            Write-Host "📌 Frequency: Weekly (Sundays at 02:00 AM)" -ForegroundColor Yellow
        }
        default {
            Write-Host "❌ Unknown frequency: $Frequency" -ForegroundColor Red
            return
        }
    }

    # Create action
    $PSPath = (Get-Command powershell).Source
    $Action = New-ScheduledTaskAction `
        -Execute $PSPath `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$TaskScriptPath`"" `
        -WorkingDirectory $BackendDir

    # Create settings
    $Settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable `
        -MultipleInstances IgnoreNew

    # Register task
    try {
        $Principal = New-ScheduledTaskPrincipal -UserID "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        Register-ScheduledTask `
            -TaskName $TaskName `
            -Trigger $Trigger `
            -Action $Action `
            -Settings $Settings `
            -Principal $Principal `
            -Force | Out-Null
        
        Write-Host "`n✅ Backup scheduler created successfully!" -ForegroundColor Green
        Write-Host "   Task Name: $TaskName" -ForegroundColor Green
        Write-Host "   Status: ACTIVE" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Error creating scheduled task: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "`n💡 Try running PowerShell as Administrator" -ForegroundColor Yellow
    }
}

function Test-Backup {
    <#
    .SYNOPSIS
    Test the backup functionality
    #>
    
    Write-Host "`n🧪 Testing backup functionality..." -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri 'http://localhost:3001/api/backup/create' `
            -Method POST `
            -ContentType 'application/json' `
            -ErrorAction Stop
        
        if ($response.success) {
            Write-Host "✅ Test backup created successfully!" -ForegroundColor Green
            Write-Host "   Filename: $($response.filename)" -ForegroundColor Cyan
            Write-Host "   Size: $($response.size) bytes" -ForegroundColor Cyan
            Write-Host "   Location: $($response.path)" -ForegroundColor Cyan
        }
        else {
            Write-Host "❌ Backup test failed: $($response.message)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ Error testing backup: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Make sure Backend is running on http://localhost:3001" -ForegroundColor Yellow
    }
}

function Get-BackupStatus {
    <#
    .SYNOPSIS
    Get backup statistics and status
    #>
    
    Write-Host "`n📊 Backup Status:" -ForegroundColor Cyan
    
    try {
        $stats = Invoke-RestMethod -Uri 'http://localhost:3001/api/backup/stats' `
            -ErrorAction Stop
        
        if ($stats.success) {
            Write-Host "   Total Backups: $($stats.stats.totalBackups)" -ForegroundColor Green
            Write-Host "   Total Size: $('{0:N0}' -f $stats.stats.totalSize) bytes" -ForegroundColor Green
            Write-Host "   Average Size: $('{0:N0}' -f $stats.stats.averageSize) bytes" -ForegroundColor Green
            
            if ($stats.stats.latestBackup) {
                Write-Host "   Latest Backup: $($stats.stats.latestBackup.filename)" -ForegroundColor Cyan
            }
        }
    }
    catch {
        Write-Host "   Could not connect to Backend" -ForegroundColor Yellow
    }
}

function Get-TaskStatus {
    <#
    .SYNOPSIS
    Get status of scheduled task
    #>
    
    Write-Host "`n⏰ Scheduled Task Status:" -ForegroundColor Cyan
    
    try {
        $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        
        if ($task) {
            $taskInfo = Get-ScheduledTaskInfo -InputObject $task
            Write-Host "   Task Name: $($task.TaskName)" -ForegroundColor Green
            Write-Host "   Status: $($task.State)" -ForegroundColor Green
            Write-Host "   Last Run: $($taskInfo.LastRunTime)" -ForegroundColor Cyan
            Write-Host "   Last Result: $($taskInfo.LastTaskResult)" -ForegroundColor Cyan
            Write-Host "   Next Run: $($taskInfo.NextRunTime)" -ForegroundColor Cyan
        }
        else {
            Write-Host "   ❌ Task not found. Run 'schedule' action to create it." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "   Error getting task status: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Disable-BackupTask {
    <#
    .SYNOPSIS
    Disable the scheduled backup task
    #>
    
    Write-Host "`n⏸️  Disabling backup scheduler..." -ForegroundColor Yellow
    
    try {
        $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($task) {
            Disable-ScheduledTask -InputObject $task -Confirm:$false | Out-Null
            Write-Host "✅ Backup scheduler disabled" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️  Task not found" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Enable-BackupTask {
    <#
    .SYNOPSIS
    Enable the scheduled backup task
    #>
    
    Write-Host "`n▶️  Enabling backup scheduler..." -ForegroundColor Yellow
    
    try {
        $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($task) {
            Enable-ScheduledTask -InputObject $task | Out-Null
            Write-Host "✅ Backup scheduler enabled" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️  Task not found. Run 'schedule' action first." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Main execution
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Alawael Backup Scheduler - Version 1.0.0         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

switch ($Action.ToLower()) {
    "schedule" { New-BackupTask }
    "test" { Test-Backup }
    "status" { Get-TaskStatus }
    "stats" { Get-BackupStatus }
    "disable" { Disable-BackupTask }
    "enable" { Enable-BackupTask }
    default {
        Write-Host "Available actions:" -ForegroundColor Yellow
        Write-Host "  schedule  - Create scheduled backup task" -ForegroundColor Cyan
        Write-Host "  test      - Test backup functionality" -ForegroundColor Cyan
        Write-Host "  status    - Check scheduler status" -ForegroundColor Cyan
        Write-Host "  stats     - Get backup statistics" -ForegroundColor Cyan
        Write-Host "  disable   - Disable scheduled task" -ForegroundColor Cyan
        Write-Host "  enable    - Enable scheduled task" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Example:" -ForegroundColor Yellow
        Write-Host "  .\backup-scheduler.ps1 -Action schedule -Frequency daily" -ForegroundColor Cyan
    }
}

Write-Host ""
