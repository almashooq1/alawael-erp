# AlAwael ERP - Hostinger Deployment Script
# This script deploys the project to Hostinger server

$ErrorActionPreference = "Continue"

# Hostinger Connection Details
$HostingerHost = "82.25.96.160"
$HostingerPort = "65002"
$HostingerUser = "u799444911"
$HostingerPassword = "Be@101010"
$GitHubRepo = "https://github.com/almashooq1/alawael-erp.git"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  AlAwael ERP - Hostinger Deployment" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Check if Posh-SSH is installed
Write-Host "Step 1: Checking Posh-SSH module..." -ForegroundColor Yellow
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Host "  Installing Posh-SSH module..." -ForegroundColor Gray
    try {
        Install-Module -Name Posh-SSH -Force -Scope CurrentUser -AllowClobber
        Write-Host "  Posh-SSH installed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "  ERROR: Failed to install Posh-SSH" -ForegroundColor Red
        Write-Host "  Please install manually: Install-Module -Name Posh-SSH -Force" -ForegroundColor Yellow
        exit 1
    }
}
else {
    Write-Host "  Posh-SSH already installed" -ForegroundColor Green
}

Import-Module Posh-SSH

# Step 2: Create SSH credential
Write-Host "`nStep 2: Creating SSH credentials..." -ForegroundColor Yellow
$SecurePassword = ConvertTo-SecureString $HostingerPassword -AsPlainText -Force
$Credential = New-Object System.Management.Automation.PSCredential ($HostingerUser, $SecurePassword)
Write-Host "  Credentials ready" -ForegroundColor Green

# Step 3: Connect to Hostinger
Write-Host "`nStep 3: Connecting to Hostinger..." -ForegroundColor Yellow
try {
    $Session = New-SSHSession -ComputerName $HostingerHost -Port $HostingerPort -Credential $Credential -AcceptKey
    Write-Host "  Connected successfully!" -ForegroundColor Green
    Write-Host "  Session ID: $($Session.SessionId)" -ForegroundColor Gray
}
catch {
    Write-Host "  ERROR: Connection failed" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}

# Step 4: Deploy the application
Write-Host "`nStep 4: Deploying application..." -ForegroundColor Yellow

$Commands = @(
    "echo '=== AlAwael ERP Deployment Started ==='"
    "cd ~"
    "pwd"

    # Remove old version if exists
    "echo 'Removing old version...'"
    "rm -rf alawael-erp"

    # Clone from GitHub
    "echo 'Cloning from GitHub...'"
    "git clone $GitHubRepo"
    "cd alawael-erp"

    # Backend Setup
    "echo 'Setting up Backend...'"
    "cd backend"
    "npm install --production"

    # Create backend .env
    @"
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://localhost:27017/alawael-erp
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://yourdomain.com
REDIS_HOST=localhost
REDIS_PORT=6379
EOF
"@

    # Start backend with PM2
    "npm install -g pm2"
    "pm2 delete alawael-backend || true"
    "pm2 start server.js --name alawael-backend"

    # Frontend Setup
    "echo 'Setting up Frontend...'"
    "cd ../frontend"
    "npm install --production"

    # Create frontend .env
    @"
cat > .env.production << 'EOF'
REACT_APP_API_URL=http://yourdomain.com:3001
REACT_APP_ENV=production
EOF
"@

    # Build frontend
    "npm run build"

    # Start frontend with PM2
    "pm2 delete alawael-frontend || true"
    "pm2 start npm --name alawael-frontend -- start"

    # Save PM2 configuration
    "pm2 save"
    "pm2 startup"

    # Show status
    "echo '=== Deployment Complete ==='"
    "pm2 list"
    "echo ''"
    "echo 'Backend running on: http://localhost:3001'"
    "echo 'Frontend running on: http://localhost:3000'"
)

foreach ($Command in $Commands) {
    Write-Host "  Executing: $($Command.Substring(0, [Math]::Min(60, $Command.Length)))..." -ForegroundColor Gray
    try {
        $Result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Command -TimeOut 300
        if ($Result.Output) {
            $Result.Output | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        }
        if ($Result.Error) {
            $Result.Error | ForEach-Object { Write-Host "    ERROR: $_" -ForegroundColor Red }
        }
    }
    catch {
        Write-Host "    Command failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 5: Close connection
Write-Host "`nStep 5: Closing connection..." -ForegroundColor Yellow
Remove-SSHSession -SessionId $Session.SessionId | Out-Null
Write-Host "  Connection closed" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Configure your domain in Hostinger control panel" -ForegroundColor White
Write-Host "2. Point domain to your server IP: $HostingerHost" -ForegroundColor White
Write-Host "3. Setup Nginx reverse proxy (see nginx-hostinger.conf)" -ForegroundColor White
Write-Host "4. Install SSL certificate with Let's Encrypt" -ForegroundColor White
Write-Host "`nFor details, see: HOSTINGER_DEPLOYMENT.md`n" -ForegroundColor Gray
