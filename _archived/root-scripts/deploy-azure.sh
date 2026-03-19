#!/bin/bash

# Azure App Service Deployment Script - v1.0.0

set -e

echo "🔵 Azure App Service Deployment - v1.0.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RESOURCE_GROUP=${1:-"alawael-rg"}
APP_SERVICE_PLAN=${2:-"alawael-plan"}
APP_NAME=${3:-"alawael-api"}
LOCATION=${4:-"eastus"}

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not installed"
    echo "   Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

echo "✅ Azure CLI installed"
echo ""

# Check authentication
echo "🔑 Checking Azure authentication..."
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure"
    echo "   Run: az login"
    exit 1
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
echo "✅ Logged in to: $SUBSCRIPTION"
echo ""

# Create resource group
echo "📦 Creating/Checking resource group..."
if az group exists --name $RESOURCE_GROUP | grep -q true; then
    echo "✅ Resource group exists: $RESOURCE_GROUP"
else
    echo "   Creating resource group: $RESOURCE_GROUP"
    az group create --name $RESOURCE_GROUP --location $LOCATION
    echo "✅ Resource group created"
fi

echo ""
echo "🏢 Creating/Checking App Service Plan..."
if az appservice plan show --name $APP_SERVICE_PLAN --resource-group $RESOURCE_GROUP &>/dev/null; then
    echo "✅ App Service Plan exists: $APP_SERVICE_PLAN"
else
    echo "   Creating App Service Plan: $APP_SERVICE_PLAN"
    az appservice plan create \
        --name $APP_SERVICE_PLAN \
        --resource-group $RESOURCE_GROUP \
        --sku B1 \
        --is-linux
    echo "✅ App Service Plan created"
fi

echo ""
echo "🌐 Creating/Checking Web App..."
if az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
    echo "✅ Web App exists: $APP_NAME"
else
    echo "   Creating Web App: $APP_NAME"
    az webapp create \
        --resource-group $RESOURCE_GROUP \
        --plan $APP_SERVICE_PLAN \
        --name $APP_NAME \
        --runtime "NODE|18-lts"
    echo "✅ Web App created"
fi

echo ""
echo "🔧 Configuring application settings..."

# Create new settings
az webapp config appsettings set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        NODE_ENV=production \
        PORT=3000 \
        CONFIG_SOURCED_BY_ENV=true

echo "✅ Basic settings configured"
echo ""

echo "📝 You need to set these variables:"
echo "   DATABASE_URL - MongoDB connection string"
echo "   JWT_SECRET - 32+ character random secret"
echo "   FRONTEND_URL - Your frontend domain"
echo "   SENTRY_DSN - Error tracking (optional)"
echo ""
echo "   Command:"
echo "   az webapp config appsettings set --settings \\"
echo "     DATABASE_URL=your-url \\"
echo "     JWT_SECRET=your-secret \\"
echo "     FRONTEND_URL=your-domain \\"
echo "     -n $APP_NAME -g $RESOURCE_GROUP"
echo ""

# Enable logging
echo "📋 Enabling logging..."
az webapp log config \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --application-logging azureblobstorage \
    --level verbose

echo "✅ Logging enabled"
echo ""

# GitHub integration info
echo "🔗 GitHub Integration:"
echo "   Deployment Center: https://portal.azure.com/#@/resource/subscriptions/[subscription]/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME"
echo "   Or use:"
echo "   - Authorization: GitHub OAuth"
echo "   - Repository: almashooq1/alawael-backend"
echo "   - Branch: main"
echo ""

echo "🔗 Useful Azure commands:"
echo "   View logs:           az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "   Restart app:         az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "   Set variables:       az webapp config appsettings set --settings key=value -n $APP_NAME -g $RESOURCE_GROUP"
echo "   Get deployment URL:  az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName"
echo "   SSH to container:    az webapp ssh --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""

APP_URL=$(az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName -o tsv)

echo "✅ Azure App Service setup complete!"
echo ""
echo "📌 App Details:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   App Service Plan: $APP_SERVICE_PLAN"
echo "   App Name: $APP_NAME"
echo "   URL: https://$APP_URL"
echo ""

echo "🎯 Next Steps:"
echo "   1. Set environment variables (see below)"
echo "   2. Configure GitHub deployment or manual deploy"
echo "   3. Monitor logs: az webapp log tail"
echo ""
