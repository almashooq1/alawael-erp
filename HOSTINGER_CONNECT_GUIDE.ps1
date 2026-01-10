# AlAwael ERP - Hostinger Deployment Guide
# Follow these steps manually in PowerShell

Write-Host @"

========================================
  HOSTINGER DEPLOYMENT - Step by Step
========================================

Connection Details:
  Host: 82.25.96.160
  Port: 65002
  User: u799444911
  Password: Be@101010

========================================

OPTION 1: Using PuTTY (Recommended for Windows)
------------------------------------------------

1. Download PuTTY from: https://www.putty.org/
2. Open PuTTY and configure:
   - Host Name: 82.25.96.160
   - Port: 65002
   - Connection Type: SSH
3. Click "Open"
4. Login with: u799444911
5. Password: Be@101010

Once connected, run these commands:

# Check environment
node --version
npm --version
git --version

# Clone project
cd ~
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp

# Setup Backend
cd backend
npm install --production

# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://localhost:27017/alawael-erp
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://yourdomain.com
EOF

# Install PM2 globally
npm install -g pm2

# Start Backend
pm2 start server.js --name alawael-backend
pm2 save
pm2 startup

# Setup Frontend
cd ../frontend
npm install --production

# Create frontend .env
cat > .env.production << 'EOF'
REACT_APP_API_URL=http://yourdomain.com:3001
REACT_APP_ENV=production
EOF

# Build frontend
npm run build

# Start frontend
pm2 start npm --name alawael-frontend -- start
pm2 save

# Check status
pm2 list

========================================

OPTION 2: Using PowerShell with Posh-SSH
-----------------------------------------

Run these commands in PowerShell:

"@ -ForegroundColor Cyan

Write-Host @"
# Install Posh-SSH
Install-Module -Name Posh-SSH -Force -Scope CurrentUser -AllowClobber

# Import module
Import-Module Posh-SSH

# Create credentials
`$password = ConvertTo-SecureString 'Be@101010' -AsPlainText -Force
`$credential = New-Object System.Management.Automation.PSCredential ('u799444911', `$password)

# Connect
`$session = New-SSHSession -ComputerName '82.25.96.160' -Port 65002 -Credential `$credential -AcceptKey

# Run commands
Invoke-SSHCommand -SessionId `$session.SessionId -Command 'pwd'
Invoke-SSHCommand -SessionId `$session.SessionId -Command 'ls -la'
Invoke-SSHCommand -SessionId `$session.SessionId -Command 'node --version'

# Close when done
Remove-SSHSession -SessionId `$session.SessionId

"@ -ForegroundColor Gray

Write-Host @"

========================================

OPTION 3: Automated Script (If Environment is Ready)
----------------------------------------------------

If Node.js, npm, and git are installed on Hostinger:
Run: .\deploy-to-hostinger.ps1

========================================

TROUBLESHOOTING:
----------------

If Node.js is not found:
  - Check Hostinger control panel for Node.js activation
  - Enable Node.js selector in cPanel

If git is not found:
  - Contact Hostinger support to enable git

If port 3001 is blocked:
  - Use Hostinger's assigned port from control panel
  - Update backend PORT in .env

========================================

"@ -ForegroundColor Yellow

Write-Host "Choose your preferred method and follow the steps above." -ForegroundColor Green
Write-Host "For detailed guide, see: HOSTINGER_DEPLOYMENT.md`n" -ForegroundColor Gray
