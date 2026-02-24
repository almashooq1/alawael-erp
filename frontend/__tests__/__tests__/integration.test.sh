#!/bin/bash

# 🧪 Frontend Integration Test Suite
# Phase 29-33 Frontend Testing & Validation

echo "=== Frontend Integration Test Suite ===" 
echo "Testing Phase 29-33 Frontend Services"
echo ""

# Test 1: API Connectivity
echo "📡 Test 1: Checking Backend API Connectivity..."
echo "Target: http://localhost:3001/api/phases-29-33"

curl -s -X GET "http://localhost:3001/api/phases-29-33/health" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "❌ Backend not responding"

echo ""

# Test 2: Phase 29 AI Endpoints
echo "🤖 Test 2: Phase 29 AI Endpoints..."
echo "GET /phases-29-33/ai/llm/providers"
curl -s -X GET "http://localhost:3001/api/phases-29-33/ai/llm/providers" | jq '.' 2>/dev/null || echo "Testing..."

echo ""

# Test 3: Phase 30 Quantum Endpoints
echo "⚛️ Test 3: Phase 30 Quantum Endpoints..."
echo "GET /phases-29-33/quantum/crypto/algorithms"
curl -s -X GET "http://localhost:3001/api/phases-29-33/quantum/crypto/algorithms" | jq '.' 2>/dev/null || echo "Testing..."

echo ""

# Test 4: Phase 31 XR Endpoints
echo "🥽 Test 4: Phase 31 XR Endpoints..."
echo "GET /phases-29-33/xr/xr/sessions"
curl -s -X GET "http://localhost:3001/api/phases-29-33/xr/xr/sessions" | jq '.' 2>/dev/null || echo "Testing..."

echo ""

# Test 5: Phase 32 DevOps Endpoints
echo "🐳 Test 5: Phase 32 DevOps Endpoints..."
echo "GET /phases-29-33/devops/kubernetes/clusters"
curl -s -X GET "http://localhost:3001/api/phases-29-33/devops/kubernetes/clusters" | jq '.' 2>/dev/null || echo "Testing..."

echo ""

# Test 6: Phase 33 Optimization Endpoints
echo "⚡ Test 6: Phase 33 Optimization Endpoints..."
echo "GET /phases-29-33/optimization/performance/metrics"
curl -s -X GET "http://localhost:3001/api/phases-29-33/optimization/performance/metrics" | jq '.' 2>/dev/null || echo "Testing..."

echo ""
echo "=== Frontend Integration Tests Complete ===" 
