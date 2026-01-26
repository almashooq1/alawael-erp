# 🔗 AlAwael Integration System - Complete Setup Guide

## 📚 Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [API Endpoints](#api-endpoints)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)
7. [Security](#security)

---

## 🎯 Overview

The AlAwael Integration System provides seamless connectivity with:

- 🏛️ **Government Services** - Identity verification, health records, compliance
- 🛡️ **Insurance Providers** - Eligibility verification, claims management
- 🧪 **Laboratory Systems** - Order submission, results retrieval
  (JSON/HL7/FHIR)

### Features

✅ **Reliability**: Circuit breaker pattern, automatic retries  
✅ **Security**: HMAC signing, OAuth2, certificate-based auth  
✅ **Monitoring**: Health checks, metrics, audit logging  
✅ **Flexibility**: Multiple data formats (JSON, HL7 v2.5, FHIR R4)  
✅ **Scalability**: Event-driven architecture, background tasks

---

## 📦 Installation

### Prerequisites

```bash
Node.js >= 16.0.0
npm >= 8.0.0
Express >= 4.17.0
Pino >= 7.0.0 (logging)
Axios >= 0.27.0 (HTTP client)
```

### Step 1: Copy Connector Files

All integration files are located in `/backend/routes/integrations/`:

```
backend/routes/integrations/
├── government-connector.js      # ~280 lines
├── insurance-connector.js       # ~320 lines
├── lab-connector.js            # ~420 lines
└── integration-manager.js      # ~180 lines
```

### Step 2: Update integrations.routes.js

The main integration routes file is already in place:

```
backend/routes/integrations.routes.js  # ~1200 lines
```

### Step 3: Verify server.js Configuration

Ensure this line exists in `backend/server.js` (around line 429):

```javascript
app.use('/api/integrations', require('./routes/integrations.routes'));
```

### Step 4: Install Dependencies

```bash
cd backend
npm install axios pino pino-pretty  # If not already installed
npm install
```

---

## ⚙️ Configuration

### Step 1: Create .env File

```bash
cp .env.example .env
```

### Step 2: Configure Government Integration

```env
GOV_API_URL=https://api.gov.sa
GOV_CLIENT_ID=your_client_id_here
GOV_CLIENT_SECRET=your_client_secret_here
```

### Step 3: Configure Insurance Integration

```env
INSURANCE_API_URL=https://api.insurance.sa
INSURANCE_API_KEY=your_api_key_here
INSURANCE_CLIENT_ID=your_client_id_here
INSURANCE_CLIENT_SECRET=your_client_secret_here
INSURANCE_WEBHOOK_URL=https://yourdomain.com/webhooks/insurance
```

### Step 4: Configure Laboratory Integration

```env
LAB_API_URL=https://api.labs.sa
LAB_API_KEY=your_api_key_here
LAB_FORMAT=json  # or 'hl7' or 'fhir'
LAB_CLIENT_CERT=/path/to/cert.pem  # For mutual TLS
LAB_CLIENT_KEY=/path/to/key.pem    # For mutual TLS
```

### Step 5: Start Backend

```bash
npm start
# or for development
npm run dev
```

---

## 🔌 API Endpoints

### Health Check

```bash
GET /api/integrations/health
```

### Government Services

```bash
POST /api/integrations/government/verify-citizen
POST /api/integrations/government/request-consent
GET  /api/integrations/government/health-records/:nationalId
POST /api/integrations/government/report-incident
```

### Insurance Services

```bash
POST /api/integrations/insurance/verify-eligibility
POST /api/integrations/insurance/submit-claim
GET  /api/integrations/insurance/claim/:claimId
POST /api/integrations/insurance/verify-provider
POST /api/integrations/insurance/register-webhook
POST /api/integrations/insurance/webhook
```

### Laboratory Services

```bash
POST /api/integrations/lab/submit-order
GET  /api/integrations/lab/results/:orderId
GET  /api/integrations/lab/order/:orderId
POST /api/integrations/lab/cancel-order
POST /api/integrations/lab/reconcile
```

### Management

```bash
GET  /api/integrations/metrics
POST /api/integrations/reset-metrics
POST /api/integrations/start-background-tasks
POST /api/integrations/stop-background-tasks
```

---

## 🧪 Testing

### Using curl

```bash
# Health check
curl http://localhost:3001/api/integrations/health

# Verify citizen
curl -X POST http://localhost:3001/api/integrations/government/verify-citizen \
  -H "Content-Type: application/json" \
  -d '{
    "nationalId": "1234567890",
    "fullName": "محمد علي محمد",
    "dateOfBirth": "1990-01-15"
  }'

# Submit insurance claim
curl -X POST http://localhost:3001/api/integrations/insurance/submit-claim \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PAT-123",
    "policyNumber": "POL-2026-001",
    "serviceDetails": {
      "type": "service",
      "code": "PT001",
      "description": "Physiotherapy",
      "date": "2026-01-23",
      "provider": "AlAwael",
      "grossAmount": 500,
      "copayAmount": 50,
      "documents": []
    }
  }'
```

### Using Postman

1. Import `AlAwael-Integration-API.postman_collection.json`
2. Set environment variables:
   - `base_url = http://localhost:3001`
   - `api_key = your_api_key`
3. Run requests from the collection

### Using npm Scripts

```bash
# If test scripts are configured
npm test
npm run test:integration
npm run test:connectors
```

---

## 🐛 Troubleshooting

### Issue: 404 on /api/integrations/health

**Solution**: Ensure `integrations.routes.js` is mounted in `server.js`:

```javascript
app.use('/api/integrations', require('./routes/integrations.routes'));
```

### Issue: "Circuit breaker is open"

**Cause**: Too many failures to external API  
**Solution**:

1. Check external service status
2. Wait for circuit breaker timeout (60 seconds default)
3. Check logs for detailed error

### Issue: "Invalid webhook signature"

**Cause**: Secret key mismatch  
**Solution**:

1. Verify `INSURANCE_WEBHOOK_SECRET` in .env
2. Ensure webhook payload hasn't been modified

### Issue: "Idempotency key duplicate"

**Cause**: Resending same request  
**Solution**: Generate new request ID or use different timestamp

### Common Errors

| Error                 | Cause               | Solution           |
| --------------------- | ------------------- | ------------------ |
| 400 Bad Request       | Missing fields      | Check request body |
| 401 Unauthorized      | Invalid credentials | Verify API keys    |
| 403 Forbidden         | No permission       | Check scope/access |
| 404 Not Found         | Endpoint not found  | Verify URL path    |
| 429 Too Many Requests | Rate limited        | Wait and retry     |
| 500 Server Error      | Internal error      | Check logs         |

### Checking Logs

```bash
# Check recent logs
tail -f backend/logs/*.log

# Or if using Pino
NODE_DEBUG=* npm start

# Check specific connector logs
grep "government-connector" backend/logs/*.log
grep "insurance-connector" backend/logs/*.log
grep "lab-connector" backend/logs/*.log
```

---

## 🔐 Security

### API Key Management

```env
✅ Store in .env (never commit)
✅ Rotate regularly
✅ Use strong, random keys
❌ Don't hardcode in source
❌ Don't share in emails/chats
```

### HTTPS in Production

```javascript
// Use environment variable to enable HTTPS
if (process.env.NODE_ENV === 'production') {
  // Redirect HTTP to HTTPS
  // Use SSL certificates
}
```

### Webhook Signature Verification

```javascript
// All webhooks are automatically verified
// Signature: HMAC-SHA256(body, secret)
// Header: X-Signature
```

### PII Masking

All sensitive data (nationalId, policyNumber, etc.) is masked in logs:

```
nationalId: "masked"
Authorization: "Bearer abc...***"
```

### Circuit Breaker

Protects against cascading failures:

```
- Threshold: 5 failures
- Timeout: 60 seconds
- After timeout: Half-open state (test recovery)
```

### Rate Limiting

Built-in per-connector rate limiting and exponential backoff:

```
Attempt 1: 1-2 seconds
Attempt 2: 2-4 seconds
Attempt 3: 4-8 seconds
```

---

## 📊 Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3001/api/integrations/health
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-01-23T12:00:00Z",
  "health": {
    "government": { "healthy": true, "status": 200 },
    "insurance": { "healthy": true, "status": 200 },
    "laboratory": { "healthy": true, "status": 200 },
    "overallStatus": "healthy"
  }
}
```

### Metrics Endpoint

```bash
curl http://localhost:3001/api/integrations/metrics
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-01-23T12:00:00Z",
  "metrics": {
    "government": { "requests": 1234, "failures": 5, "uptime": 99.59 },
    "insurance": { "requests": 5678, "failures": 12, "uptime": 99.79 },
    "laboratory": { "requests": 8901, "failures": 3, "uptime": 99.97 }
  }
}
```

### Background Tasks

- **Health Check**: Every 5 minutes
- **Lab Reconciliation**: Every 1 hour
- **Auto-cleanup**: Failed orders after 24 hours

---

## 📞 Support & Documentation

- **Quick Start**: 🚀_INTEGRATION_API_QUICK_START.md
- **System Guide**: 📚_INTEGRATION_SYSTEM_GUIDE.md
- **Postman Collection**: AlAwael-Integration-API.postman_collection.json
- **Email Support**: support@alawael.com

---

## 🚀 Next Steps

1. ✅ Installation and configuration
2. ✅ Test all endpoints with Postman
3. ✅ Monitor health checks
4. ✅ Set up webhook handlers
5. ✅ Configure background tasks
6. ✅ Deploy to production

---

**Last Updated**: January 23, 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅
