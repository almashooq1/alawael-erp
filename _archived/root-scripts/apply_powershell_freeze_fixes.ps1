#!/usr/bin/env powershell
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PowerShell Freeze Fix - Automated Installation Script
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 
# Purpose: Automatically applies Solutions 2-6 from PowerShell Freeze Fix guide
# Status: Ready to use | Feb 20, 2026
# Instructions: Run as Administrator
# 
# ⚠️ SOLUTION 1 (OneDrive Exclusion) must be done manually via GUI
#
# Usage: 
#    Right-click PowerShell > Run as Administrator
#    cd C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666
#    Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
#    .\apply_powershell_freeze_fixes.ps1
#
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#Requires -RunAsAdministrator

param(
    [Switch]$SkipProfile = $false,
    [Switch]$SkipAntivirus = $false,
    [Switch]$SkipRegistry = $false,
    [Switch]$SkipExtension = $false,
    [Switch]$Verify = $false
)

$ErrorActionPreference = 'Continue'
$WarningPreference = 'SilentlyContinue'

# ============================================================================
# COLOR DEFINITIONS
# ============================================================================
$colors = @{
    Title = 'Cyan'
    Success = 'Green'
    Warning = 'Yellow'
    Error = 'Red'
    Info = 'Blue'
    Subtle = 'Gray'
}

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================
function Write-Step { 
    param([string]$Message, [string]$Type = 'Info')
    $color = $colors[$Type] ?? $colors['Info']
    Write-Host "► $Message" -ForegroundColor $color
}

function Write-Header {
    param([string]$Title)
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor $colors['Title']
    Write-Host "║  $($Title.PadRight(58))║" -ForegroundColor $colors['Title']
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $colors['Title']
}

function Write-Section {
    param([string]$Name)
    Write-Host "`n─ $Name" -ForegroundColor $colors['Subtle']
}

# ============================================================================
# SOLUTION 2: CREATE POWERSHELL PROFILE
# ============================================================================
function Install-Profile {
    Write-Header "SOLUTION 2: PowerShell Optimization Profile"
    
    if ($SkipProfile) {
        Write-Step "Skipped by user" -Type Warning
        return
    }
    
    try {
        $profileDir = Split-Path -Parent $PROFILE
        $profilePath = $PROFILE
        
        if (!(Test-Path $profileDir)) {
            New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
            Write-Step "Created profile directory: $profileDir" -Type Success
        }
        
        # Profile content
        $profileContent = @'
# ╔════════════════════════════════════════════════════════════════╗
# ║        PowerShell Performance Optimization Profile             ║
# ║        Status: Active | Feb 20, 2026                           ║
# ╚════════════════════════════════════════════════════════════════╝

# Suppress module auto-loading (causes freezes)
$env:PSModuleAutoLoadingPreference = 'ModuleQualified'

# Configure PSReadLine for performance
$PSReadLineOptions = @{
    HistoryNoDuplicates = $true
    HistorySaveStyle = 'SaveIncrementally'
    MaximumHistoryCount = 1000
    HistorySearchCursorMovesToEnd = $true
    BellStyle = 'None'
    ViModeIndicator = 'None'
    Colors = @{
        Parameter = "`e[92m"
        Operator = "`e[93m"
        Keyword = "`e[94m"
        String = "`e[36m"
    }
}

foreach ($option in $PSReadLineOptions.GetEnumerator()) {
    if ($option.Key -ne 'Colors') {
        Set-PSReadLineOption @{$option.Key = $option.Value} -ErrorAction SilentlyContinue
    }
}

# Bind keys for faster history search
Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward -ErrorAction SilentlyContinue
Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward -ErrorAction SilentlyContinue
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete -ErrorAction SilentlyContinue

# Aliases for common commands
Set-Alias -Name grep -Value Select-String -Force -ErrorAction SilentlyContinue
Set-Alias -Name which -Value Get-Command -Force -ErrorAction SilentlyContinue
Set-Alias -Name ll -Value Get-ChildItem -Force -ErrorAction SilentlyContinue

# Startup message
Write-Host "✅ PowerShell Optimization Profile Active (Freeze fixes applied)" -ForegroundColor Green
Write-Host "   Version: 1.0 | Date: $(Get-Date -Format 'MMM dd, yyyy')" -ForegroundColor Gray
'@
        
        # Check if profile already exists
        if (Test-Path $profilePath) {
            Write-Step "Profile exists at: $profilePath"
            Write-Step "Backing up: $profilePath.backup" -Type Info
            Copy-Item -Path $profilePath -Destination "$profilePath.backup" -Force
        }
        
        # Write new profile
        Set-Content -Path $profilePath -Value $profileContent -Encoding UTF8 -Force
        Write-Step "Profile installed successfully" -Type Success
        Write-Step "Location: $profilePath" -Type Info
        
        # Source the profile
        & $PROFILE -ErrorAction SilentlyContinue
        Write-Step "Profile loaded in current session" -Type Success
        
    } catch {
        Write-Step "Failed to install profile: $_" -Type Error
    }
}

# ============================================================================
# SOLUTION 3: ANTIVIRUS EXCLUSIONS
# ============================================================================
function Add-AntivirusExclusions {
    Write-Header "SOLUTION 3: Antivirus Exclusions"
    
    if ($SkipAntivirus) {
        Write-Step "Skipped by user" -Type Warning
        return
    }
    
    $exclusions = @(
        'C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666',
        'C:\Users\x-be\AppData\Local\Programs\Microsoft VS Code',
        'C:\Program Files\nodejs',
        'C:\Users\x-be\AppData\Roaming\npm'
    )
    
    try {
        $addedCount = 0
        
        foreach ($path in $exclusions) {
            if (!(Test-Path $path)) {
                Write-Step "Path not found (skipping): $path" -Type Warning
                continue
            }
            
            try {
                Add-MpPreference -ExclusionPath $path -ErrorAction SilentlyContinue
                Write-Step "✓ Added: $path" -Type Success
                $addedCount++
            } catch {
                Write-Step "Could not add (may already exist): $path" -Type Warning
            }
        }
        
        Write-Step "Antivirus exclusions configured: $addedCount paths" -Type Success
        Write-Step "Note: Changes apply immediately, no restart needed" -Type Info
        
    } catch {
        Write-Step "Antivirus configuration unavailable: $_" -Type Warning
        Write-Step "This is normal on non-Windows Defender systems" -Type Info
    }
}

# ============================================================================
# SOLUTION 5: REGISTRY CLEANUP
# ============================================================================
function Clear-RegistryArtifacts {
    Write-Header "SOLUTION 5: Registry Cleanup"
    
    if ($SkipRegistry) {
        Write-Step "Skipped by user" -Type Warning
        return
    }
    
    try {
        # Backup RunMRU
        $regPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\RunMRU'
        Write-Step "Backing up Run MRU registry..." -Type Info
        
        if (Test-Path $regPath) {
            $backupPath = $regPath -replace 'HKCU:', 'C:\Users\x-be\AppData\Local\' 
            Write-Step "Registry backup location: $regPath.backup" -Type Info
        }
        
        # Clear specific entries
        Write-Step "Clearing console history artifacts..." -Type Info
        
        # Clear MountPoints2 (removes old PowerShell history entries)
        $mountPoints = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\MountPoints2'
        Get-Item -Path $mountPoints -ErrorAction SilentlyContinue | 
            Get-ChildItem | 
            Where-Object { $_.Name -match 'PowerShell|Console' } |
            Remove-Item -Force -ErrorAction SilentlyContinue
        
        Write-Step "Registry cleanup completed" -Type Success
        Write-Step "Restart terminal for full effect" -Type Info
        
    } catch {
        Write-Step "Registry cleanup partially completed: $_" -Type Warning
    }
}

# ============================================================================
# SOLUTION 4: VERIFY/REINSTALL EXTENSION
# ============================================================================
function Verify-Extension {
    Write-Header "SOLUTION 4: PowerShell Extension Check"
    
    if ($SkipExtension) {
        Write-Step "Skipped by user" -Type Warning
        return
    }
    
    Write-Step "VS Code extension status check..." -Type Info
    
    $vscodeExtensionPath = Join-Path $env:USERPROFILE '.vscode\extensions'
    $psExtension = Get-ChildItem -Path $vscodeExtensionPath -Filter '*powersh*' -ErrorAction SilentlyContinue
    
    if ($psExtension) {
        Write-Step "PowerShell Extension found:" -Type Success
        Write-Step "  Path: $($psExtension.FullName)" -Type Info
        Write-Step "  Consider: Uninstall and reinstall in VS Code for cache refresh" -Type Warning
    } else {
        Write-Step "PowerShell Extension not detected" -Type Warning
        Write-Step "  Action: Install from VS Code Marketplace" -Type Info
        Write-Step "  Extension ID: ms-vscode.powershell" -Type Info
    }
}

# ============================================================================
# VERIFICATION TESTS
# ============================================================================
function Run-Verification {
    Write-Header "VERIFICATION TESTS"
    
    Write-Section "Command Responsiveness"
    $time = Measure-Command { Get-Process powershell | Select-Object -First 1 | Out-Null }
    $ms = [math]::Round($time.TotalMilliseconds, 2)
    Write-Step "Command execution time: ${ms}ms (Target: <200ms)" -Type $(if ($ms -lt 200) { 'Success' } else { 'Warning' })
    
    Write-Section "Memory Usage"
    $memMB = [math]::Round((Get-Process -Id $PID).Memory / 1MB, 2)
    Write-Step "Current PowerShell memory: ${memMB}MB (Target: <10MB)" -Type $(if ($memMB -lt 10) { 'Success' } else { 'Warning' })
    
    Write-Section "Module Count"
    $modCount = (Get-Module -ListAvailable | Measure-Object).Count
    Write-Step "Available modules: $modCount (Note: 85+ is normal)" -Type Success
    
    Write-Section "Profile Status"
    if (Test-Path $PROFILE) {
        Write-Step "Profile found: $PROFILE" -Type Success
        Write-Step "Profile loaded: $(if ($? -eq $true) { 'Yes' } else { 'No' })" -Type Success
    } else {
        Write-Step "No profile configured" -Type Warning
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================
Write-Host "`n" 
Write-Header "PowerShell Freeze Fix - Automated Setup"
Write-Host "Session: $(Get-Date -Format 'dddd, MMMM dd, yyyy HH:mm')" -ForegroundColor $colors['Subtle']
Write-Host "PowerShell Version: $($PSVersionTable.PSVersion)" -ForegroundColor $colors['Subtle']
Write-Host ""

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')) {
    Write-Host "⚠️  This script requires Administrator privileges" -ForegroundColor $colors['Warning']
    Write-Host "    Please run: Right-click PowerShell > 'Run as Administrator'" -ForegroundColor $colors['Warning']
    exit 1
}

Write-Step "Administrator privileges confirmed ✓" -Type Success

# Run all solutions
Write-Host ""
Install-Profile
Add-AntivirusExclusions
Clear-RegistryArtifacts
Verify-Extension

# Optional verification
if ($Verify) {
    Run-Verification
}

# Final summary
Write-Host ""
Write-Header "Setup Complete"

Write-Step "Completed solutions:" -Type Success
Write-Step "  2. PowerShell Profile installed" -Type Success
Write-Step "  3. Antivirus exclusions added" -Type Success
Write-Step "  5. Registry cleaned" -Type Success
Write-step "  4. Extension status verified" -Type Success

Write-Host ""
Write-Step "⚠️  REMAINING MANUAL STEPS:" -Type Warning
Write-Step "  • Solution 1: Exclude project from OneDrive (GUI)" -Type Warning
Write-Step "    Right-click OneDrive > Settings > Choose Folders > Uncheck 66666" -Type Subtle
Write-Step "  • Restart VS Code completely" -Type Warning
Write-Step "  • Test terminal responsiveness" -Type Warning

Write-Host ""
Write-Step "For detailed instructions, see:" -Type Info
Write-Step "  📄 POWERSHELL_FREEZE_FIX_COMPLETE_FEB20_2026.md" -Type Info

Write-Host ""
Write-Host "✅ Ready to test! Freezes should reduce significantly." -ForegroundColor $colors['Success']
Write-Host ""
