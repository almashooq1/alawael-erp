#!/bin/bash

# AWS Elastic Beanstalk Deployment Script - v1.0.0

set -e

echo "🟠 AWS Elastic Beanstalk Deployment - v1.0.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

APP_NAME=${1:-"alawael-api"}
ENV_NAME=${2:-"alawael-prod"}
REGION=${3:-"us-east-1"}

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not installed"
    echo "   Install from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check EB CLI
if ! command -v eb &> /dev/null; then
    echo "❌ EB CLI not installed"
    echo "   Install from: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html"
    exit 1
fi

echo "✅ AWS CLI and EB CLI installed"
echo ""

# Check AWS credentials
echo "🔑 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    echo "   Run: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ AWS Account: $ACCOUNT_ID"
echo ""

# Create .ebignore if not exists
if [ ! -f ".ebignore" ]; then
    echo "📝 Creating .ebignore..."
    cat > .ebignore << 'EBIGNORE_EOF'
node_modules
*.log
.git
.github
tests
docs
*.md
.env
.DS_Store
EBIGNORE_EOF
    echo "✅ .ebignore created"
fi

# Create .elasticbeanstalk/config.yml if not exists
if [ ! -d ".elasticbeanstalk" ]; then
    echo "📁 Creating .elasticbeanstalk directory..."
    mkdir -p .elasticbeanstalk
    
    cat > .elasticbeanstalk/config.yml << CONFIG_EOF
branch-defaults:
  main:
    environment: $ENV_NAME

environment-defaults:
  $ENV_NAME:
    branch: main
    repository: origin

global:
  application_name: $APP_NAME
  default_region: $REGION
  include_git_submodules: true
  instance_profile: null
  platform_name: null
  platform_version: null
  sc: git
  workspace_type: Application

Config_EOF

    echo "✅ .elasticbeanstalk/config.yml created"
fi

echo ""
echo "🚀 Initializing Elastic Beanstalk environment..."

# Initialize EB if needed
if [ ! -d ".elasticbeanstalk" ]; then
    eb init -p node.js-18 $APP_NAME --region=$REGION
fi

echo ""
echo "📦 Creating environment..."
echo "   Application: $APP_NAME"
echo "   Environment: $ENV_NAME"
echo "   Region: $REGION"
echo ""

if eb list 2>/dev/null | grep -q $ENV_NAME; then
    echo "✅ Environment already exists"
else
    echo "   Creating new environment (this may take 5-10 minutes)..."
    eb create $ENV_NAME \
        --instance-type t3.medium \
        --envvars NODE_ENV=production,PORT=3000
    echo "✅ Environment created"
fi

echo ""
echo "🔧 Setting environment variables..."
echo "   Configure these in AWS Elastic Beanstalk console:"
echo "   - DATABASE_URL (MongoDB connection string)"
echo "   - JWT_SECRET (32+ character random string)"
echo "   - FRONTEND_URL (Your frontend domain)"
echo "   - SENTRY_DSN (Error tracking service)"
echo ""

echo "📝 To deploy:"
echo "   git push origin main"
echo "   eb deploy"
echo ""

echo "🔗 Useful EB commands:"
echo "   View logs:      eb logs"
echo "   SSH to instance: eb ssh"
echo "   Set config:     eb config"
echo "   Health check:   eb health"
echo "   Open app:       eb open"
echo "   View status:    eb status"
echo ""

echo "✅ AWS Elastic Beanstalk setup complete!"
echo ""
echo "📌 Environment details:"
EB_URL=$(eb open --print-url 2>/dev/null || echo "Pending...")
echo "   URL: $EB_URL"
echo ""

echo "🎯 Next Steps:"
echo "   1. Set environment variables in EB console"
echo "   2. Deploy: git push origin main && eb deploy"
echo "   3. Monitor: eb logs -f"
echo ""
