#!/bin/bash

# Google Cloud Run Deployment Script - v1.0.0

set -e

echo "🟡 Google Cloud Run Deployment - v1.0.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PROJECT_ID=${1}
SERVICE_NAME=${2:-"alawael-api"}
REGION=${3:-"us-central1"}

# Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK not installed"
    echo "   Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "✅ Google Cloud SDK installed"
echo ""

# Check if project ID is provided
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID required"
    echo "Usage: $0 <project-id> [service-name] [region]"
    exit 1
fi

# Check authentication
echo "🔑 Checking GCP authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "❌ Not authenticated with GCP"
    echo "   Run: gcloud auth login"
    exit 1
fi

ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo "✅ Authenticated as: $ACCOUNT"
echo ""

# Set project
echo "📋 Setting project..."
gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION

echo "✅ Project set to: $PROJECT_ID"
echo ""

# Create Dockerfile if not exists
if [ ! -f "Dockerfile" ]; then
    echo "📝 Creating Dockerfile..."
    cat > Dockerfile << 'DOCKER_EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD [ "node", "app.js" ]
DOCKER_EOF

    echo "✅ Dockerfile created"
fi

# Create .dockerignore if not exists
if [ ! -f ".dockerignore" ]; then
    echo "📝 Creating .dockerignore..."
    cat > .dockerignore << 'DOCKERIGNORE_EOF'
node_modules
npm-debug.log
.git
.github
tests
docs
*.md
.env
.DS_Store
DOCKERIGNORE_EOF

    echo "✅ .dockerignore created"
fi

echo ""
echo "🐳 Building and deploying Docker image to Cloud Run..."
echo "   Service: $SERVICE_NAME"
echo "   Region: $REGION"
echo "   Project: $PROJECT_ID"
echo ""

# Build and deploy
gcloud run deploy $SERVICE_NAME \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 3000 \
    --memory 512Mi \
    --cpu 1 \
    --timeout 3600 \
    --set-env-vars \
        NODE_ENV=production,\
        PORT=3000

echo ""
echo "✅ Deployment complete!"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')

echo "📌 Service Details:"
echo "   URL: $SERVICE_URL"
echo "   Service: $SERVICE_NAME"
echo "   Region: $REGION"
echo "   Project: $PROJECT_ID"
echo ""

echo "🔧 Set environment variables:"
echo "   gcloud run services update $SERVICE_NAME \\"
echo "     --set-env-vars=DATABASE_URL=your-url,JWT_SECRET=your-secret \\"
echo "     --region $REGION"
echo ""

echo "🔗 Useful gcloud commands:"
echo "   View logs:       gcloud run logs read ---service=$SERVICE_NAME --region=$REGION"
echo "   List services:   gcloud run services list --region=$REGION"
echo "   Delete service:  gcloud run services delete $SERVICE_NAME --region=$REGION"
echo "   Get service URL: gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'"
echo "   Update service:  gcloud run services update $SERVICE_NAME --region=$REGION --set-env-vars=KEY=VALUE"
echo ""

echo "🎯 Next Steps:"
echo "   1. Set environment variables:"
echo "      DATABASE_URL - MongoDB connection string"
echo "      JWT_SECRET - 32+ character random secret"
echo "      FRONTEND_URL - Your frontend domain"
echo "   2. Test the service: curl $SERVICE_URL/api/health"
echo "   3. Monitor logs:    gcloud run logs read --service=$SERVICE_NAME --region=$REGION"
echo ""

echo "📌 Cost Information:"
echo "   Cloud Run is serverless and costs based on:"
echo "   - Invocation count"
echo "   - Compute time"
echo "   - Network egress"
echo "   Learn more: https://cloud.google.com/run/pricing"
echo ""
