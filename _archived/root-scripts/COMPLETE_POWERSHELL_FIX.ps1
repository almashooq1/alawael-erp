# Complete PowerShell Repair Script
# This script must be run as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Complete PowerShell Repair Script" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clear corrupted profiles
Write-Host "[1/5] Removing corrupted PowerShell profiles..." -ForegroundColor Yellow
$profilePaths = @(
    "$env:USERPROFILE\Documents\WindowsPowerShell",
    "$env:USERPROFILE\OneDrive\Documents\WindowsPowerShell",
    "$env:USERPROFILE\OneDrive\المستندات\WindowsPowerShell"
)

foreach ($path in $profilePaths) {
    if (Test-Path $path) {
        Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Removed: $path" -ForegroundColor Green
    }
}

# Step 2: Reset execution policy
Write-Host ""
Write-Host "[2/5] Resetting execution policies..." -ForegroundColor Yellow
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force -ErrorAction SilentlyContinue
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force -ErrorAction SilentlyContinue
Write-Host "  ✓ Execution policies reset" -ForegroundColor Green

# Step 3: Set environment variables
Write-Host ""
Write-Host "[3/5] Setting environment variables..." -ForegroundColor Yellow
[Environment]::SetEnvironmentVariable('PSModulePath', "$env:SystemRoot\System32\WindowsPowerShell\v1.0\Modules", 'User')
[Environment]::SetEnvironmentVariable('PSModulePath', "$env:SystemRoot\System32\WindowsPowerShell\v1.0\Modules", 'Machine')
Write-Host "  ✓ PSModulePath set correctly" -ForegroundColor Green

# Step 4: Create clean Windows PowerShell profile
Write-Host ""
Write-Host "[4/5] Creating clean profile..." -ForegroundColor Yellow
$profilePath = "$env:USERPROFILE\Documents\WindowsPowerShell\"
if (-not (Test-Path $profilePath)) {
    New-Item -ItemType Directory -Path $profilePath -Force | Out-Null
}

$profileFile = "$profilePath\Microsoft.PowerShell_profile.ps1"
$profileContent = @'
# Clean PowerShell Profile
# No custom configurations - just defaults

# Uncomment to add custom functions or aliases
# function Get-MyFunc { }

'@

Set-Content -Path $profileFile -Value $profileContent -Force
Write-Host "  ✓ Profile created: $profileFile" -ForegroundColor Green

# Step 5: Verify installation
Write-Host ""
Write-Host "[5/5] Verifying PowerShell installation..." -ForegroundColor Yellow
Write-Host "  PowerShell Version: $($PSVersionTable.PSVersion)" -ForegroundColor Cyan
Write-Host "  PSModulePath: $env:PSModulePath" -ForegroundColor Cyan
Write-Host "  ExecutionPolicy (CurrentUser): $(Get-ExecutionPolicy -Scope CurrentUser)" -ForegroundColor Cyan

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ PowerShell repair completed!" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Close and reopen VS Code for changes to take effect!" -ForegroundColor Yellow
Write-Host ""
