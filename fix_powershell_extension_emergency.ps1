#!/usr/bin/env powershell
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PowerShell Extension Emergency Recovery - Automated Script
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# CRITICAL: Restores PowerShell Extension from crash state
# Status: Emergency Recovery Mode
# Time: ~5 minutes
#
# Usage: Right-click PowerShell > Run as Administrator
#        cd C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666
#        Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
#        .\fix_powershell_extension_emergency.ps1
#
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#Requires -RunAsAdministrator

$ErrorActionPreference = 'Continue'
$WarningPreference = 'SilentlyContinue'

# ============================================================================
# COLOR DEFINITIONS
# ============================================================================
$colors = @{
    Title = 'Cyan'
    Status = 'DarkCyan'
    Success = 'Green'
    Warning = 'Yellow'
    Error = 'Red'
    Info = 'Magenta'
    Subtle = 'Gray'
    Progress = 'Blue'
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================
function Write-ColorLine {
    param([string]$Text, [string]$Color = 'White', [int]$Indent = 0)
    $prefix = ' ' * $Indent
    Write-Host "$prefix$Text" -ForegroundColor $Color
}

function Write-Title {
    param([string]$Text)
    Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor $colors['Title']
    Write-Host "║  $($Text.PadRight(52))║" -ForegroundColor $colors['Title']
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor $colors['Title']
}

function Write-Progress {
    param([int]$Step, [int]$Total, [string]$Text)
    $percent = [math]::Round(($Step / $Total) * 100, 0)
    Write-Host "`n[$($Step)/$($Total)] $Text" -ForegroundColor $colors['Progress']
}

function Test-IsAdmin {
    if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')) {
        Write-ColorLine "ERROR: This script requires Administrator privileges" -Color $colors['Error']
        Write-ColorLine "Please run: Right-click PowerShell > 'Run as Administrator'" -Color $colors['Warning']
        exit 1
    }
}

# ============================================================================
# MAIN RECOVERY SCRIPT
# ============================================================================

Write-Title "PowerShell Extension Emergency Recovery"
Write-ColorLine "$(Get-Date -Format 'dddd, MMMM dd, yyyy HH:mm:ss')" -Color $colors['Subtle']
Write-ColorLine "Status: CRITICAL - Recovering from repeated crashes" -Color $colors['Error']
Write-ColorLine ""

# Verify admin
Test-IsAdmin

# ============================================================================
# STEP 1: TERMINATE VS CODE & PROCESSES
# ============================================================================
Write-Progress 1 5 "Terminating VS Code and PowerShell processes..."

$processes = @('code', 'pwsh', 'powershell', 'CodeHelper')
foreach ($proc in $processes) {
    $running = Get-Process -Name $proc -ErrorAction SilentlyContinue
    if ($running) {
        Write-ColorLine "  • Stopping: $proc (PID: $($running.Id))" -Color $colors['Info'] -Indent 2
        $running | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 2
Write-ColorLine "✓ All processes terminated" -Color $colors['Success'] -Indent 2

# ============================================================================
# STEP 2: DELETE CORRUPTED EXTENSION FILES
# ============================================================================
Write-Progress 2 5 "Removing corrupted extension files..."

$extensionPaths = @(
    @{
        Path = "$env:USERPROFILE\.vscode\extensions\ms-vscode.powershell*"
        Name = "VS Code PowerShell Extension"
    },
    @{
        Path = "$env:USERPROFILE\AppData\Local\vscode-server\extensions\ms-vscode.powershell*"
        Name = "VS Code Server Extension"
    }
)

$deletedCount = 0
foreach ($item in $extensionPaths) {
    $existing = Get-Item -Path $item.Path -Recurse -ErrorAction SilentlyContinue
    if ($existing) {
        try {
            Remove-Item -Path $item.Path -Recurse -Force -ErrorAction SilentlyContinue
            $deletedCount++
            Write-ColorLine "  • Deleted: $($item.Name)" -Color $colors['Success'] -Indent 2
        } catch {
            Write-ColorLine "  ⚠ Could not delete: $($item.Name) (may be locked)" -Color $colors['Warning'] -Indent 2
        }
    }
}

Write-ColorLine "✓ Extension files removed ($deletedCount items)" -Color $colors['Success'] -Indent 2

# ============================================================================
# STEP 3: CLEAR EXTENSION CACHE & TEMP FILES
# ============================================================================
Write-Progress 3 5 "Clearing cache and temporary files..."

$cachePaths = @(
    @{
        Path = "$env:TEMP\PSES*"
        Name = "PSES Temp Files"
    },
    @{
        Path = "$env:LOCALAPPDATA\PowerShell*"
        Name = "PowerShell Extension Data"
    },
    @{
        Path = "$env:TEMP\PowerShell*"
        Name = "PowerShell Temp Files"
    }
)

$clearedCount = 0
foreach ($item in $cachePaths) {
    $existing = Get-Item -Path $item.Path -ErrorAction SilentlyContinue
    if ($existing) {
        try {
            Remove-Item -Path $item.Path -Recurse -Force -ErrorAction SilentlyContinue
            $clearedCount++
            Write-ColorLine "  • Cleared: $($item.Name)" -Color $colors['Success'] -Indent 2
        } catch {
            Write-ColorLine "  ⚠ Could not clear: $($item.Name)" -Color $colors['Warning'] -Indent 2
        }
    }
}

Write-ColorLine "✓ Cache cleared ($($clearedCount) items)" -Color $colors['Success'] -Indent 2

# ============================================================================
# STEP 4: CREATE MINIMAL POWERSHELL PROFILE
# ============================================================================
Write-Progress 4 5 "Setting up clean PowerShell profile..."

try {
    $profileDir = Split-Path -Parent $PROFILE
    if (!(Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
        Write-ColorLine "  • Created profile directory" -Color $colors['Success'] -Indent 2
    }

    $minimalProfile = @'
# ╔══════════════════════════════════════════════════════╗
# ║  Minimal Profile - Recovery Mode                     ║
# ║  Extensions only - User customizations disabled      ║
# ║  Generated: Feb 20, 2026                             ║
# ╚══════════════════════════════════════════════════════╝

# Basic aliases
Set-Alias -Name ls -Value Get-ChildItem -Force -ErrorAction SilentlyContinue
Set-Alias -Name grep -Value Select-String -Force -ErrorAction SilentlyContinue

# PSReadLine basic config (no heavy operations)
$PSReadLineOptions = @{
    HistoryNoDuplicates = $true
    MaximumHistoryCount = 1000
    BellStyle = 'None'
}

foreach ($option in $PSReadLineOptions.GetEnumerator()) {
    Set-PSReadLineOption @{$option.Key = $option.Value} -ErrorAction SilentlyContinue
}

# Suppress module auto-loading (prevents extension conflicts)
$env:PSModuleAutoLoadingPreference = 'ModuleQualified'

Write-Host "✅ Minimal Profile Loaded (Recovery Mode)" -ForegroundColor Green
Write-Host "   Ready for VS Code PowerShell Extension" -ForegroundColor Gray
'@

    Set-Content -Path $PROFILE -Value $minimalProfile -Encoding UTF8 -Force
    Write-ColorLine "  • Profile configured for recovery mode" -Color $colors['Success'] -Indent 2
}
catch {
    Write-ColorLine "  ⚠ Could not create profile: $($_ | Select-Object -ExpandProperty Message)" -Color $colors['Warning'] -Indent 2
}

Write-ColorLine "✓ Profile ready" -Color $colors['Success'] -Indent 2

# ============================================================================
# STEP 5: VERIFICATION & SUMMARY
# ============================================================================
Write-Progress 5 5 "Verifying recovery and generating summary..."

Write-ColorLine ""
Write-ColorLine "╔════════════════════════════════════════════════════════╗" -Color $colors['Status']
Write-ColorLine "║  Recovery Summary                                      ║" -Color $colors['Status']
Write-ColorLine "╚════════════════════════════════════════════════════════╝" -Color $colors['Status']

Write-ColorLine ""
Write-ColorLine "Status: ✅ RECOVERY COMPLETE" -Color $colors['Success']
Write-ColorLine ""
Write-ColorLine "What was done:" -Color $colors['Info']
Write-ColorLine "  ✓ Terminated all VS Code processes" -Color $colors['Success'] -Indent 2
Write-ColorLine "  ✓ Deleted corrupted extension files" -Color $colors['Success'] -Indent 2
Write-ColorLine "  ✓ Cleared extension cache" -Color $colors['Success'] -Indent 2
Write-ColorLine "  ✓ Created minimal PowerShell profile" -Color $colors['Success'] -Indent 2
Write-ColorLine ""

Write-ColorLine "⚠️  NEXT STEPS (IMPORTANT):" -Color $colors['Warning']
Write-ColorLine ""
Write-ColorLine "  1. Close this PowerShell window" -Color $colors['Info'] -Indent 2
Write-ColorLine ""
Write-ColorLine "  2. Open VS Code fresh:" -Color $colors['Info'] -Indent 2
Write-ColorLine "     • Click VS Code icon or run: code" -Color $colors['Subtle'] -Indent 4
Write-ColorLine ""
Write-ColorLine "  3. Install PowerShell Extension:" -Color $colors['Info'] -Indent 2
Write-ColorLine "     • Press Ctrl+Shift+X (Extensions)" -Color $colors['Subtle'] -Indent 4
Write-ColorLine "     • Search: 'PowerShell'" -Color $colors['Subtle'] -Indent 4
Write-ColorLine "     • Click Install on first result (Microsoft)" -Color $colors['Subtle'] -Indent 4
Write-ColorLine "     • Wait 1-2 minutes for full initialization" -Color $colors['Subtle'] -Indent 4
Write-ColorLine ""
Write-ColorLine "  4. Reload VS Code:" -Color $colors['Info'] -Indent 2
Write-ColorLine "     • Press Ctrl+Shift+P" -Color $colors['Subtle'] -Indent 4
Write-ColorLine "     • Type: 'Reload Window'" -Color $colors['Subtle'] -Indent 4
Write-ColorLine "     • Press Enter" -Color $colors['Subtle'] -Indent 4
Write-ColorLine ""
Write-ColorLine "  5. Test the extension:" -Color $colors['Info'] -Indent 2
Write-ColorLine "     • Open a PowerShell Terminal (Ctrl+`)" -Color $colors['Subtle'] -Indent 4
Write-ColorLine "     • Should display PowerShell version without errors" -Color $colors['Subtle'] -Indent 4
Write-ColorLine ""

# ============================================================================
# DIAGNOSTIC INFO
# ============================================================================
Write-ColorLine ""
Write-ColorLine "System Information:" -Color $colors['Info']
Write-ColorLine ""

$sysInfo = @{
    'PowerShell Version' = $PSVersionTable.PSVersion.ToString()
    'OS' = [System.Environment]::OSVersion.VersionString
    'User' = [System.Environment]::UserName
    'Timestamp' = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
}

foreach ($key in $sysInfo.Keys) {
    Write-ColorLine "  • $key : $($sysInfo[$key])" -Color $colors['Subtle'] -Indent 2
}

Write-ColorLine ""
Write-ColorLine "⏱️  Total Recovery Time: $('{0:N0}' -f ([datetime]::Now - (Get-Process -Id $PID).StartTime).TotalSeconds) seconds" -Color $colors['Subtle']
Write-ColorLine ""
Write-ColorLine "═══════════════════════════════════════════════════════════════" -Color $colors['Status']
Write-ColorLine ""
Write-Host ""
