#!/bin/bash
# ===================================
# Kubernetes Deployment Script
# ===================================

set -e

echo "☸️  Deploying ERP System to Kubernetes..."

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster"
    exit 1
fi

# Create namespace
echo "📦 Creating namespace..."
kubectl create namespace erp-system --dry-run=client -o yaml | kubectl apply -f -

# Apply ConfigMaps and Secrets
echo "🔧 Applying ConfigMaps and Secrets..."
kubectl apply -f k8s/configmap-secrets.yaml -n erp-system

# Deploy MongoDB
echo "🗄️  Deploying MongoDB..."
kubectl apply -f k8s/mongodb-statefulset.yaml -n erp-system

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB..."
kubectl wait --for=condition=ready pod -l app=mongodb -n erp-system --timeout=180s

# Deploy Backend
echo "🔧 Deploying Backend..."
kubectl apply -f k8s/backend-deployment.yaml -n erp-system

# Wait for Backend
echo "⏳ Waiting for Backend..."
kubectl wait --for=condition=ready pod -l app=erp-backend -n erp-system --timeout=180s

# Deploy Frontend
echo "🎨 Deploying Frontend..."
kubectl apply -f k8s/frontend-deployment.yaml -n erp-system

# Wait for Frontend
echo "⏳ Waiting for Frontend..."
kubectl wait --for=condition=ready pod -l app=erp-frontend -n erp-system --timeout=180s

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📍 Get service information:"
echo "   kubectl get services -n erp-system"
echo ""
echo "📊 View pods:"
echo "   kubectl get pods -n erp-system"
echo ""
echo "📜 View logs:"
echo "   kubectl logs -f deployment/erp-backend -n erp-system"
echo "   kubectl logs -f deployment/erp-frontend -n erp-system"
echo ""
echo "🔍 Describe resources:"
echo "   kubectl describe deployment/erp-backend -n erp-system"
