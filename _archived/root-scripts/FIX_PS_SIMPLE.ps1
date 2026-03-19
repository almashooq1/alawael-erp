# Simple PowerShell Fix Script
# Run with: powershell -ExecutionPolicy Bypass -File FIX_PS_SIMPLE.ps1

Write-Host "=== PowerShell Fix ===" -ForegroundColor Cyan

# 1. Create Safe Profile
$profileDir = "$env:USERPROFILE\Documents\PowerShell"
$winDir = "$env:USERPROFILE\Documents\WindowsPowerShell"

New-Item -ItemType Directory -Path $profileDir -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $winDir -Force -ErrorAction SilentlyContinue

$profileContent = @"
# Safe PowerShell Profile
`$env:PSModuleAutoLoadingPreference = 'ModuleQualified'
Write-Host 'PowerShell Ready' -ForegroundColor Green
"@

Set-Content -Path "$profileDir\profile.ps1" -Value $profileContent -Encoding UTF8 -Force
Set-Content -Path "$winDir\profile.ps1" -Value $profileContent -Encoding UTF8 -Force
Write-Host "[OK] Profile created" -ForegroundColor Green

# 2. Clear VS Code Cache
$cachePaths = @(
    "$env:APPDATA\Code\Cache",
    "$env:APPDATA\Code\CachedData",
    "$env:APPDATA\Code\GPUCache"
)

foreach ($p in $cachePaths) {
    if (Test-Path $p) {
        Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "[OK] Cache cleared" -ForegroundColor Green

# 3. Fix VS Code Settings
$settingsDir = "$env:APPDATA\Code\User"
$settingsPath = "$settingsDir\settings.json"

if (!(Test-Path $settingsDir)) {
    New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null
}

$settings = @{
    "powershell.scriptAnalysis.enable" = $false
    "powershell.codeLens.enable" = $false
    "powershell.startAutomaticallyOnOpen" = $false
    "powershell.integratedConsole.showOnStartup" = $false
}

if (Test-Path $settingsPath) {
    try {
        $existing = Get-Content $settingsPath -Raw | ConvertFrom-Json
        foreach ($k in $settings.Keys) {
            if ($existing.PSObject.Properties[$k]) {
                $existing.$k = $settings[$k]
            } else {
                $existing | Add-Member -MemberType NoteProperty -Name $k -Value $settings[$k]
            }
        }
        $existing | ConvertTo-Json -Depth 100 | Set-Content $settingsPath -Encoding UTF8
    } catch {
        $settings | ConvertTo-Json -Depth 100 | Set-Content $settingsPath -Encoding UTF8
    }
} else {
    $settings | ConvertTo-Json -Depth 100 | Set-Content $settingsPath -Encoding UTF8
}
Write-Host "[OK] Settings updated" -ForegroundColor Green

Write-Host ""
Write-Host "=== Fix Complete ===" -ForegroundColor Cyan
Write-Host "Please restart VS Code" -ForegroundColor Yellow