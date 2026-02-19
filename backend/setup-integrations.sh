#!/bin/bash

# Integration Setup Script
# Sets up all external integrations

set -e

echo "🚀 External Integration Setup Script"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo ""
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to prompt for input
prompt_input() {
    read -p "$1: " value
    echo "$value"
}

print_section "Step 1: Install Dependencies"

if [ -f "package.json" ]; then
    print_success "package.json found"
    echo "Installing integration packages..."
    npm install stripe paypal-rest-sdk twilio @sendgrid/mail axios jsonwebtoken googleapis
    print_success "Dependencies installed"
else
    print_error "package.json not found. Please run this script from backend directory"
    exit 1
fi

print_section "Step 2: Environment Configuration"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env created from .env.example"
        print_warning "Please update .env with your API credentials"
    else
        print_error ".env.example not found"
        exit 1
    fi
else
    print_success ".env already exists"
fi

print_section "Step 3: API Credentials Setup"

echo "Would you like to add API credentials now? (y/n)"
read -r response
if [[ "$response" == "y" || "$response" == "Y" ]]; then

    echo ""
    echo "📍 STRIPE Setup"
    read -p "Enter Stripe Secret Key (or press Enter to skip): " stripe_key
    if [ ! -z "$stripe_key" ]; then
        sed -i "s/STRIPE_SECRET_KEY=.*/STRIPE_SECRET_KEY=$stripe_key/" .env
        print_success "Stripe Secret Key configured"
    fi

    echo ""
    echo "📍 SENDGRID Setup"
    read -p "Enter SendGrid API Key (or press Enter to skip): " sendgrid_key
    if [ ! -z "$sendgrid_key" ]; then
        sed -i "s/SENDGRID_API_KEY=.*/SENDGRID_API_KEY=$sendgrid_key/" .env
        print_success "SendGrid API Key configured"
    fi

    echo ""
    echo "📍 TWILIO Setup"
    read -p "Enter Twilio Account SID (or press Enter to skip): " twilio_sid
    if [ ! -z "$twilio_sid" ]; then
        sed -i "s/TWILIO_ACCOUNT_SID=.*/TWILIO_ACCOUNT_SID=$twilio_sid/" .env
        print_success "Twilio Account SID configured"
    fi

    echo ""
    echo "📍 ZOOM Setup"
    read -p "Enter Zoom Client ID (or press Enter to skip): " zoom_client_id
    if [ ! -z "$zoom_client_id" ]; then
        sed -i "s/ZOOM_CLIENT_ID=.*/ZOOM_CLIENT_ID=$zoom_client_id/" .env
        print_success "Zoom Client ID configured"
    fi
else
    print_warning "Skipping credential setup. Manually edit .env file"
fi

print_section "Step 4: Verify Installations"

echo "Checking integration packages..."

node -e "
try {
    const pkg = require.resolve('stripe');
    console.log('✓ Stripe: installed');
} catch(e) {
    console.log('✗ Stripe: not installed');
}

try {
    const pkg = require.resolve('twilio');
    console.log('✓ Twilio: installed');
} catch(e) {
    console.log('✗ Twilio: not installed');
}

try {
    const pkg = require.resolve('@sendgrid/mail');
    console.log('✓ SendGrid: installed');
} catch(e) {
    console.log('✗ SendGrid: not installed');
}

try {
    const pkg = require.resolve('paypal-rest-sdk');
    console.log('✓ PayPal: installed');
} catch(e) {
    console.log('✗ PayPal: not installed');
}

try {
    const pkg = require.resolve('googleapis');
    console.log('✓ Google APIs: installed');
} catch(e) {
    console.log('✗ Google APIs: not installed');
}

try {
    const pkg = require.resolve('axios');
    console.log('✓ Axios: installed');
} catch(e) {
    console.log('✗ Axios: not installed');
}
" 2>/dev/null || true

echo ""

print_section "Step 5: Generate Integration Health Check"

node -e "
const services = [
    'payment-integrations.service.js',
    'email-integrations.service.js',
    'sms-integrations.service.js',
    'video-calendar-integrations.service.js'
];

console.log('Integration Services Status:');
console.log('============================');
services.forEach(service => {
    const fs = require('fs');
    if (fs.existsSync('./services/' + service)) {
        console.log('✓ ' + service);
    } else {
        console.log('✗ ' + service + ' (missing)');
    }
});
" 2>/dev/null || true

print_section "Setup Complete! 🎉"

echo "Next steps:"
echo ""
echo "1. Update .env with your API credentials:"
echo "   - STRIPE_SECRET_KEY"
echo "   - SENDGRID_API_KEY"
echo "   - TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN"
echo "   - ZOOM_CLIENT_ID & ZOOM_CLIENT_SECRET"
echo "   - GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET"
echo ""
echo "2. Start the backend server:"
echo "   npm start"
echo ""
echo "3. Test integrations:"
echo "   curl http://localhost:3001/api/v1/integrations/health"
echo ""
echo "📚 For detailed setup instructions, see:"
echo "   ./INTEGRATION_SETUP_GUIDE.js"
echo ""
echo "✅ Setup script completed successfully!"
