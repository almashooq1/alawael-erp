# Manual Hostinger Setup Script
# Run commands one by one to diagnose issues

$HostingerHost = "82.25.96.160"
$HostingerPort = "65002"
$HostingerUser = "u799444911"
$HostingerPassword = "Be@101010"

Write-Host "`n=== Hostinger Manual Setup ===" -ForegroundColor Cyan

# Install Posh-SSH if not installed
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Host "Installing Posh-SSH..." -ForegroundColor Yellow
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -AllowClobber -SkipPublisherCheck
}

Import-Module Posh-SSH

# Create credentials
$SecurePassword = ConvertTo-SecureString $HostingerPassword -AsPlainText -Force
$Credential = New-Object System.Management.Automation.PSCredential ($HostingerUser, $SecurePassword)

# Connect
Write-Host "Connecting to Hostinger..." -ForegroundColor Yellow
$Session = New-SSHSession -ComputerName $HostingerHost -Port $HostingerPort -Credential $Credential -AcceptKey
Write-Host "Connected! Session ID: $($Session.SessionId)`n" -ForegroundColor Green

# Check environment
Write-Host "=== System Information ===" -ForegroundColor Cyan
$commands = @(
    "whoami"
    "pwd"
    "ls -la"
    "which node"
    "which npm"
    "which git"
    "node --version 2>&1 || echo 'Node.js not found'"
    "npm --version 2>&1 || echo 'npm not found'"
    "git --version 2>&1 || echo 'git not found'"
)

foreach ($cmd in $commands) {
    Write-Host "`nCommand: $cmd" -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $cmd -TimeOut 30
    if ($result.Output) {
        $result.Output | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    }
    if ($result.Error) {
        $result.Error | ForEach-Object { Write-Host "  ERROR: $_" -ForegroundColor Red }
    }
}

Write-Host "`n=== Keep Session Open ===" -ForegroundColor Cyan
Write-Host "Session ID: $($Session.SessionId)" -ForegroundColor Green
Write-Host "`nTo run commands manually:" -ForegroundColor Yellow
Write-Host "  Invoke-SSHCommand -SessionId $($Session.SessionId) -Command 'your-command'" -ForegroundColor Gray
Write-Host "`nTo close session:" -ForegroundColor Yellow
Write-Host "  Remove-SSHSession -SessionId $($Session.SessionId)" -ForegroundColor Gray
Write-Host "`nSession will remain open for manual commands...`n" -ForegroundColor Cyan
