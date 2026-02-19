# Integration Setup Script for Windows PowerShell
# Sets up all external integrations

Write-Host "rn🚀 External Integration Setup Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

function Print-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "═══════════════════════════════════════" -ForegroundColor Blue
    Write-Host "  $Title" -ForegroundColor Blue
    Write-Host "═══════════════════════════════════════" -ForegroundColor Blue
    Write-Host ""
}

function Print-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# Step 1: Check if we're in the right directory
Print-Section "Step 1: Verify Setup"

if (!(Test-Path "package.json")) {
    Print-Error "package.json not found. Please run this script from the backend directory"
    exit 1
}

Print-Success "package.json found"

# Step 2: Install Dependencies
Print-Section "Step 2: Install Dependencies"

Write-Host "Installing integration packages..."
npm install stripe paypal-rest-sdk twilio @sendgrid/mail axios jsonwebtoken googleapis

Print-Success "Dependencies installed"

# Step 3: Setup .env file
Print-Section "Step 3: Environment Configuration"

if (!(Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Print-Success ".env created from .env.example"
        Print-Warning "Please update .env with your API credentials"
    }
    else {
        Print-Error ".env.example not found"
        exit 1
    }
}
else {
    Print-Success ".env already exists"
}

# Step 4: Verify Services
Print-Section "Step 4: Verify Integration Services"

$services = @(
    "services\payment-integrations.service.js",
    "services\email-integrations.service.js",
    "services\sms-integrations.service.js",
    "services\video-calendar-integrations.service.js",
    "routes\integrations.v1.js",
    "INTEGRATION_SETUP_GUIDE.js"
)

Write-Host "Integration Files Status:" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

foreach ($service in $services) {
    if (Test-Path $service) {
        Print-Success $service
    }
    else {
        Print-Warning "$service (missing)"
    }
}

# Step 5: Optional - Add credentials
Print-Section "Step 5: API Credentials (Optional)"

$response = Read-Host "Would you like to add API credentials now? (y/n)"

if ($response -eq "y" -or $response -eq "Y") {

    Write-Host ""
    Write-Host "📍 STRIPE Setup" -ForegroundColor Yellow
    $stripeKey = Read-Host "Enter Stripe Secret Key (or press Enter to skip)"
    if ($stripeKey) {
        (Get-Content ".env") -replace 'STRIPE_SECRET_KEY=.*', "STRIPE_SECRET_KEY=$stripeKey" | Set-Content ".env"
        Print-Success "Stripe Secret Key configured"
    }

    Write-Host ""
    Write-Host "📍 SENDGRID Setup" -ForegroundColor Yellow
    $sendgridKey = Read-Host "Enter SendGrid API Key (or press Enter to skip)"
    if ($sendgridKey) {
        (Get-Content ".env") -replace 'SENDGRID_API_KEY=.*', "SENDGRID_API_KEY=$sendgridKey" | Set-Content ".env"
        Print-Success "SendGrid API Key configured"
    }

    Write-Host ""
    Write-Host "📍 TWILIO Setup" -ForegroundColor Yellow
    $twilioSid = Read-Host "Enter Twilio Account SID (or press Enter to skip)"
    if ($twilioSid) {
        (Get-Content ".env") -replace 'TWILIO_ACCOUNT_SID=.*', "TWILIO_ACCOUNT_SID=$twilioSid" | Set-Content ".env"
        Print-Success "Twilio Account SID configured"
    }

    $twilioToken = Read-Host "Enter Twilio Auth Token (or press Enter to skip)"
    if ($twilioToken) {
        (Get-Content ".env") -replace 'TWILIO_AUTH_TOKEN=.*', "TWILIO_AUTH_TOKEN=$twilioToken" | Set-Content ".env"
        Print-Success "Twilio Auth Token configured"
    }

    Write-Host ""
    Write-Host "📍 ZOOM Setup" -ForegroundColor Yellow
    $zoomClientId = Read-Host "Enter Zoom Client ID (or press Enter to skip)"
    if ($zoomClientId) {
        (Get-Content ".env") -replace 'ZOOM_CLIENT_ID=.*', "ZOOM_CLIENT_ID=$zoomClientId" | Set-Content ".env"
        Print-Success "Zoom Client ID configured"
    }

    $zoomClientSecret = Read-Host "Enter Zoom Client Secret (or press Enter to skip)"
    if ($zoomClientSecret) {
        (Get-Content ".env") -replace 'ZOOM_CLIENT_SECRET=.*', "ZOOM_CLIENT_SECRET=$zoomClientSecret" | Set-Content ".env"
        Print-Success "Zoom Client Secret configured"
    }

    Write-Host ""
    Write-Host "📍 GOOGLE Setup" -ForegroundColor Yellow
    $googleClientId = Read-Host "Enter Google Client ID (or press Enter to skip)"
    if ($googleClientId) {
        (Get-Content ".env") -replace 'GOOGLE_CLIENT_ID=.*', "GOOGLE_CLIENT_ID=$googleClientId" | Set-Content ".env"
        Print-Success "Google Client ID configured"
    }
}
else {
    Print-Warning "Skipping credential setup. Manually edit .env file"
}

# Step 6: Summary
Print-Section "Setup Complete! 🎉"

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Update .env with your API credentials:"
Write-Host "   - STRIPE_SECRET_KEY"
Write-Host "   - SENDGRID_API_KEY"
Write-Host "   - TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN"
Write-Host "   - ZOOM_CLIENT_ID & ZOOM_CLIENT_SECRET"
Write-Host "   - GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET"
Write-Host ""
Write-Host "2. Start the backend server:"
Write-Host "   npm start"
Write-Host ""
Write-Host "3. Test integrations:"
Write-Host "   curl http://localhost:3001/api/v1/integrations/health"
Write-Host ""
Write-Host "📚 For detailed setup instructions, see:"
Write-Host "   ./INTEGRATION_SETUP_GUIDE.js"
Write-Host ""
Write-Host "✅ Setup script completed successfully!" -ForegroundColor Green
