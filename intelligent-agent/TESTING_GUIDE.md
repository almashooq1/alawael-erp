# 🧪 Comprehensive Testing Guide

## ✅ Server Status

### Health Check Endpoint

```bash
curl http://localhost:3001/health
```

**Expected Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-29T...",
  "uptime": 12.345,
  "version": "2.0.0",
  "environment": "development",
  "services": {
    "mongodb": "connected",
    "cache": "available",
    "queue": "available"
  }
}
```

---

## 📊 GraphQL APIs

### 1. **Risk Management GraphQL**

- **Endpoint:** `http://localhost:3001/graphql`
- **Type:** Query & Mutation GraphQL for Risk Management

#### Sample Query

```graphql
query {
  risks {
    id
    title
    severity
    status
  }
}
```

#### Sample Mutation

```graphql
mutation {
  createRisk(
    input: {
      title: "Data Breach Risk"
      description: "Potential security vulnerability"
      severity: HIGH
      category: SECURITY
    }
  ) {
    id
    title
    createdAt
  }
}
```

### 2. **CRM GraphQL**

- **Endpoint:** `http://localhost:3001/crm-graphql`
- **Type:** Query & Mutation GraphQL for CRM

#### Sample Query

```graphql
query {
  customers {
    id
    name
    email
    phone
  }
}
```

### 3. **Advanced GraphQL** (Phase 6)

- **Endpoint:** `http://localhost:3001/graphql`
- **Type:** Advanced ML/AI Model GraphQL
- **Features:**
  - User authentication
  - Project management
  - Dataset queries
  - Model training queries
  - Prediction generation

#### Sample Advanced Query

```graphql
query {
  me {
    id
    name
    email
  }

  projects {
    id
    name
    description
    datasets {
      id
      name
      recordCount
    }
  }
}
```

#### Sample Advanced Mutation

```graphql
mutation {
  createProject(
    input: {
      name: "Customer Churn Prediction"
      description: "Predict customer churn using ML"
    }
  ) {
    id
    name
    createdAt
  }
}
```

---

## 🔌 WebSocket Real-time Communication

### Connection

```bash
# Install ws client
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3001/ws
```

### Testing WebSocket Events

```json
{
  "type": "subscribe",
  "channel": "notifications"
}
```

---

## 🔄 REST APIs

### Risk Management APIs

```bash
# Get all risks
curl http://localhost:3001/api/risks

# Get risk by ID
curl http://localhost:3001/api/risks/:id

# Create risk
curl -X POST http://localhost:3001/api/risks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Risk",
    "severity": "HIGH"
  }'

# Update risk
curl -X PUT http://localhost:3001/api/risks/:id \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved"}'

# Delete risk
curl -X DELETE http://localhost:3001/api/risks/:id
```

### CRM APIs

```bash
# Get customers
curl http://localhost:3001/api/customers

# Create customer
curl -X POST http://localhost:3001/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ACME Corp",
    "email": "contact@acme.com"
  }'

# Get opportunities
curl http://localhost:3001/api/opportunities

# Get tickets
curl http://localhost:3001/api/tickets
```

### AI/ML APIs

```bash
# Get AI analysis
curl http://localhost:3001/api/ai/analyze

# Run prediction
curl -X POST http://localhost:3001/api/ai/predict \
  -H "Content-Type: application/json" \
  -d '{"model": "churn", "data": {...}}'

# Get ML models
curl http://localhost:3001/api/ai/ml/models

# Deep learning analysis
curl http://localhost:3001/api/ai/deeplearning/analyze

# Clustering analysis
curl http://localhost:3001/api/ai/clustering/analyze

# Anomaly detection
curl http://localhost:3001/api/ai/anomaly/detect

# Forecasting
curl http://localhost:3001/api/ai/forecasting/predict
```

---

## 📈 Analytics Dashboard

### Analytics Overview

```bash
curl http://localhost:3001/api/analytics/overview
```

**Expected Response:**

```json
{
  "timestamp": "2026-01-29T...",
  "totalRequests": 1234,
  "successRate": 98.5,
  "avgResponseTime": 145,
  "errors": 18,
  "activeUsers": 42,
  "endpoints": {
    "/api/risks": { "requests": 234, "avgTime": 125 },
    "/graphql": { "requests": 567, "avgTime": 189 },
    ...
  }
}
```

### Top Endpoints

```bash
curl http://localhost:3001/api/analytics/top-endpoints
```

### Error Analysis

```bash
curl http://localhost:3001/api/analytics/errors
```

### Performance Metrics

```bash
curl http://localhost:3001/api/analytics/performance
```

---

## ⚙️ Rate Limiting

### Testing Rate Limits

Make rapid requests to trigger rate limiting:

```bash
# This will be limited after ~100 requests per minute
for i in {1..150}; do
  curl http://localhost:3001/api/risks
done
```

**Expected Response (when limited):**

```json
{
  "error": "Too many requests",
  "retryAfter": 60,
  "message": "Rate limit exceeded. Please try again after 60 seconds"
}
```

---

## 🔐 API Versioning

### Test Different API Versions

```bash
# V1 API
curl http://localhost:3001/api/v1/risks

# V2 API (with extended features)
curl http://localhost:3001/api/v2/risks

# Latest API
curl http://localhost:3001/api/latest/risks
```

**Response includes API version info:**

```json
{
  "apiVersion": "2.1.0",
  "deprecated": false,
  "nextVersion": "3.0.0",
  "data": [...]
}
```

---

## 🗄️ Caching Performance

### Test Cache Hit/Miss

```bash
# First request (cache miss)
time curl http://localhost:3001/api/analytics/overview

# Second request (cache hit - should be faster)
time curl http://localhost:3001/api/analytics/overview
```

### Cache Statistics

```bash
curl http://localhost:3001/api/cache/stats
```

**Expected Response:**

```json
{
  "totalHits": 1245,
  "totalMisses": 89,
  "hitRate": 93.3,
  "cachedKeys": 34,
  "memoryUsage": "2.4 MB"
}
```

---

## 📧 Notifications & Emails

### Send Notification

```bash
curl -X POST http://localhost:3001/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "recipient": "user@example.com",
    "subject": "Risk Alert",
    "template": "risk-alert",
    "data": {
      "riskId": "123",
      "riskTitle": "Critical Vulnerability"
    }
  }'
```

---

## 🔄 Message Queue/Background Jobs

### Submit Background Job

```bash
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "generate-report",
    "payload": {
      "reportType": "monthly",
      "format": "pdf"
    }
  }'
```

### Monitor Job Status

```bash
curl http://localhost:3001/api/jobs/:jobId
```

---

## 🧪 Load Testing

### Using Apache Bench

```bash
# 1000 requests with concurrency of 10
ab -n 1000 -c 10 http://localhost:3001/health
```

### Using wrk

```bash
# 30 seconds of testing with 4 threads and 10 connections
wrk -t4 -c10 -d30s http://localhost:3001/health
```

---

## 🐛 Debugging

### Check Server Logs

The server logs are printed to console with timestamps and severity levels:

- ✅ SUCCESS messages
- ⚠️ WARNING messages
- ❌ ERROR messages
- 🔍 DEBUG messages (development only)

### Enable Verbose Logging

```bash
DEBUG=* node dist/backend/app.js
```

### Check Active Connections

```bash
curl http://localhost:3001/api/diagnostics/connections
```

---

## 📋 Test Checklist

### Core Functionality

- [x] Server starts successfully
- [x] Health check endpoint responds
- [x] MongoDB connection established
- [x] GraphQL endpoints available
- [ ] REST API endpoints respond
- [ ] WebSocket connection works
- [ ] Rate limiting works
- [ ] Caching improves performance
- [ ] Analytics tracking works

### API Tests

- [ ] Risk Management CRUD operations
- [ ] CRM CRUD operations
- [ ] AI/ML predictions
- [ ] Deep learning analysis
- [ ] Clustering analysis
- [ ] Anomaly detection
- [ ] Forecasting

### Advanced Features

- [ ] API versioning routing
- [ ] Multi-tenant isolation
- [ ] User authentication
- [ ] Notification delivery
- [ ] Background job processing
- [ ] PDF report generation

### Performance Tests

- [ ] Response time < 200ms (average)
- [ ] Cache hit rate > 90%
- [ ] Handle 1000+ concurrent users
- [ ] 99.9% uptime

---

## 🚀 Quick Test Script

Save as `quick-test.sh`:

```bash
#!/bin/bash

echo "🧪 Running Quick Tests..."

echo "\n1️⃣  Health Check"
curl -s http://localhost:3001/health | jq .

echo "\n2️⃣  GraphQL Query"
curl -s -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ risks { id title } }"}' | jq .

echo "\n3️⃣  Risk API"
curl -s http://localhost:3001/api/risks | jq '.[] | {id, title}' | head -10

echo "\n4️⃣  Analytics"
curl -s http://localhost:3001/api/analytics/overview | jq .

echo "\n✅ Quick tests completed!"
```

Run it:

```bash
chmod +x quick-test.sh
./quick-test.sh
```

---

## 📞 Support

For issues or questions:

1. Check server logs for error messages
2. Verify MongoDB is running
3. Check port 3001 is available
4. Ensure all dependencies are installed
5. Review API documentation
6. Check GraphQL schema at `/graphql`

---

**Last Updated:** January 29, 2026 **Server Version:** 2.0.0 **API Version:**
2.1.0
