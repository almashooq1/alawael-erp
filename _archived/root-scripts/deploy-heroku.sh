#!/bin/bash

# Heroku Deployment Script - v1.0.0
# Complete Heroku deployment automation

set -e

echo "🔴 Heroku Deployment - Alawael v1.0.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

APP_NAME=${1:-"alawael-api"}
REGION=${2:-"us"}

# Check Heroku CLI
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not installed"
    echo "   Install from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

echo "✅ Heroku CLI installed"
echo ""

# Check authentication
echo "🔑 Checking Heroku authentication..."
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Not logged in to Heroku"
    echo "   Run: heroku login"
    exit 1
fi

HEROKU_USER=$(heroku auth:whoami)
echo "✅ Logged in as: $HEROKU_USER"
echo ""

# Create Heroku app
echo "📦 Creating Heroku application..."
if heroku apps:info --app=$APP_NAME &> /dev/null; then
    echo "✅ App already exists: $APP_NAME"
else
    echo "   Creating new app: $APP_NAME"
    heroku create $APP_NAME --region=$REGION
    echo "✅ App created"
fi

echo ""
echo "🔧 Setting environment variables..."

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo "   Generated JWT_SECRET"
fi

# Set config variables
heroku config:set \
    NODE_ENV=production \
    APP_NAME=$APP_NAME \
    --app=$APP_NAME

echo "📝 Configure these variables in Heroku Dashboard:"
echo "   DATABASE_URL - MongoDB Atlas connection string"
echo "   JWT_SECRET - Random 32+ character string"
echo "   FRONTEND_URL - Your frontend domain"
echo "   SENTRY_DSN - Sentry error tracking (optional)"
echo ""

# Add MongoDB Atlas add-on (if available)
echo "🗄️  Setting up database..."
echo "   Note: Using external MongoDB Atlas"
echo "   Configure DATABASE_URL in Heroku config"
echo ""

# Deploy from Git
echo "🚀 Deploying application..."
echo "   Repository: GitHub (almashooq1/alawael-backend)"
echo "   Branch: main (v1.0.0)"
echo ""

echo "📝 To deploy manually:"
echo "   git push heroku main"
echo ""

echo "🔗 Useful Heroku commands:"
echo "   View logs:     heroku logs --tail --app=$APP_NAME"
echo "   Check status:  heroku ps --app=$APP_NAME"
echo "   Run bash:      heroku run bash --app=$APP_NAME"
echo "   Restart app:   heroku restart --app=$APP_NAME"
echo "   Config vars:   heroku config --app=$APP_NAME"
echo ""

echo "✅ Heroku setup complete!"
echo ""
echo "📌 Next Steps:"
echo "   1. Add MongoDB Atlas DATABASE_URL"
echo "   2. Set JWT_SECRET and other secrets"
echo "   3. Push code: git push heroku main"
echo "   4. Monitor: heroku logs --tail"
echo ""
echo "🌐 Your app will be available at:"
echo "   https://$APP_NAME.herokuapp.com"
echo ""
