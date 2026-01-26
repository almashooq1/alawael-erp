# 🔧 Integration System - Troubleshooting Guide

## 🚨 Quick Diagnostics

### Is the backend running?

```bash
curl http://localhost:3001/api/integrations/health
```

**If it fails**: Start backend with `npm start` in `/backend` directory

---

## ❌ Common Issues & Solutions

### Issue 1: "Cannot find module 'integrations.routes.js'"

**Error Message**:

```
Error: Cannot find module './routes/integrations.routes.js'
```

**Cause**: Import path issue in `server.js`

**Solution**:

1. Check `backend/server.js` line 429:
   ```javascript
   app.use('/api/integrations', require('./routes/integrations.routes'));
   ```
2. Verify `/backend/routes/integrations.routes.js` exists
3. Restart backend

---

### Issue 2: "Circuit breaker is open"

**Error Message**:

```json
{
  "success": false,
  "error": "Circuit breaker is open",
  "message": "Service temporarily unavailable"
}
```

**Cause**: Too many failures (5+) to external API

**Solution**:

1. Check external service status (government/insurance/lab API)
2. Wait 60 seconds for circuit to reset
3. Check logs for detailed error:
   ```bash
   tail -f backend/logs/*.log | grep "circuit-breaker"
   ```
4. If persistent, contact service provider

---

### Issue 3: "Invalid webhook signature"

**Error Message**:

```json
{
  "success": false,
  "error": "Webhook handling failed",
  "message": "Invalid signature"
}
```

**Cause**: Secret key mismatch

**Solution**:

1. Verify `INSURANCE_WEBHOOK_SECRET` in `.env`
   ```bash
   echo $INSURANCE_WEBHOOK_SECRET
   ```
2. Ensure webhook provider uses same secret
3. Check webhook payload hasn't been modified
4. Signature format: HMAC-SHA256

---

### Issue 4: "Idempotency key duplicate"

**Error Message**:

```json
{
  "success": false,
  "error": "Claim submission failed",
  "message": "Idempotency key duplicate"
}
```

**Cause**: Resending exact same request

**Solution**:

- Generate new idempotency key (usually auto-generated)
- OR wait before retrying same request
- Idempotency keys prevent duplicate charges

---

### Issue 5: "401 Unauthorized" / "Invalid credentials"

**Error Message**:

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Cause**: Invalid API keys or credentials

**Solution**:

1. Check `.env` variables:
   ```bash
   echo $GOV_CLIENT_ID
   echo $INSURANCE_API_KEY
   echo $LAB_API_KEY
   ```
2. Verify values are correct (check with service provider)
3. For OAuth2, check token refresh:
   ```bash
   grep "token-refreshed\|token-error" backend/logs/*.log
   ```
4. Ensure credentials have required permissions

---

### Issue 6: "Cannot POST /api/integrations/..."

**Error Message**:

```
Cannot POST /api/integrations/government/verify-citizen
404 Not Found
```

**Cause**: Routes not mounted or typo in URL

**Solution**:

1. Verify URL spelling (case-sensitive)
2. Check mount in `server.js`:
   ```javascript
   app.use('/api/integrations', require('./routes/integrations.routes'));
   ```
3. Restart backend after any code changes
4. Test health endpoint first:
   ```bash
   curl http://localhost:3001/api/integrations/health
   ```

---

### Issue 7: "Missing required fields"

**Error Message**:

```json
{
  "success": false,
  "error": "Missing required fields: nationalId, fullName, dateOfBirth"
}
```

**Cause**: Incomplete request body

**Solution**:

1. Check request body has all required fields
2. Use Postman collection as template
3. Verify JSON syntax is valid
4. Content-Type header must be `application/json`

Example:

```bash
curl -X POST http://localhost:3001/api/integrations/government/verify-citizen \
  -H "Content-Type: application/json" \
  -d '{
    "nationalId": "1234567890",
    "fullName": "محمد علي محمد",
    "dateOfBirth": "1990-01-15"
  }'
```

---

### Issue 8: Background tasks not running

**Symptom**: Health checks not running every 5 minutes

**Solution**:

1. Start background tasks:
   ```bash
   curl -X POST http://localhost:3001/api/integrations/start-background-tasks
   ```
2. Verify they started:
   ```bash
   curl http://localhost:3001/api/integrations/metrics
   ```
3. Check logs:
   ```bash
   grep "Background tasks" backend/logs/*.log
   ```

---

### Issue 9: Lab reconciliation not working

**Symptom**: Orders stuck pending after 24 hours

**Solution**:

1. Manually trigger reconciliation:
   ```bash
   curl -X POST http://localhost:3001/api/integrations/lab/reconcile
   ```
2. Check lab connector logs:
   ```bash
   grep "reconciliation" backend/logs/*.log
   ```
3. Verify lab API is responding
4. Check poison queue:
   ```bash
   grep "poison-queue" backend/logs/*.log
   ```

---

### Issue 10: CORS errors from frontend

**Error Message**:

```
Access to XMLHttpRequest at 'http://localhost:3001' blocked by CORS
```

**Cause**: Frontend URL not in CORS whitelist

**Solution**:

1. Check `server.js` CORS configuration
2. Verify frontend URL in `.env`:
   ```bash
   CORS_ORIGIN=http://localhost:3002
   ```
3. Or update `server.js`:
   ```javascript
   app.use(
     cors({
       origin: [
         'http://localhost:3002',
         'http://localhost:3000',
         'https://yourdomain.com',
       ],
     })
   );
   ```
4. Restart backend

---

## 📊 Diagnostic Commands

### Check if backend is running

```bash
curl http://localhost:3001/api/integrations/health
```

### Check all metrics

```bash
curl http://localhost:3001/api/integrations/metrics
```

### View recent logs

```bash
# Last 50 lines
tail -50 backend/logs/*.log

# Real-time logs
tail -f backend/logs/*.log

# Search for errors
grep -i "error" backend/logs/*.log

# Search for specific connector
grep "government-connector" backend/logs/*.log
grep "insurance-connector" backend/logs/*.log
grep "lab-connector" backend/logs/*.log
```

### Check environment variables

```bash
# Linux/Mac
grep "GOV_\|INSURANCE_\|LAB_" backend/.env

# Windows PowerShell
Get-Content backend/.env | Select-String "GOV_|INSURANCE_|LAB_"
```

### Test connectivity to external services

```bash
# Government API
curl -I https://api.gov.sa

# Insurance API
curl -I https://api.insurance.sa

# Lab API
curl -I https://api.labs.sa
```

---

## 🔍 Debug Mode

Enable debug logging:

```bash
# Linux/Mac
NODE_DEBUG=* npm start

# Windows PowerShell
$env:NODE_DEBUG="*"; npm start
```

Or add to `.env`:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

---

## 🧪 Testing Checklist

### Basic Connectivity

- [ ] Backend starts without errors
- [ ] Health endpoint responds
- [ ] All three connectors report healthy status

### Government Connector

- [ ] Can POST to `/government/verify-citizen`
- [ ] Can POST to `/government/request-consent`
- [ ] Can GET `/government/health-records/:id`
- [ ] Can POST to `/government/report-incident`

### Insurance Connector

- [ ] Can POST to `/insurance/verify-eligibility`
- [ ] Can POST to `/insurance/submit-claim`
- [ ] Can GET `/insurance/claim/:id`
- [ ] Can POST to `/insurance/verify-provider`
- [ ] Webhook endpoint responds to POST

### Laboratory Connector

- [ ] Can POST to `/lab/submit-order`
- [ ] Can GET `/lab/results/:id?format=json`
- [ ] Can GET `/lab/results/:id?format=hl7`
- [ ] Can GET `/lab/results/:id?format=fhir`
- [ ] Can GET `/lab/order/:id`
- [ ] Reconciliation works

### Background Tasks

- [ ] Health checks run every 5 minutes
- [ ] Metrics update continuously
- [ ] Lab reconciliation runs hourly

---

## 📝 Creating Bug Reports

When reporting issues, include:

1. **Error Message** (exact text)
2. **Request Details**:
   ```bash
   Method: POST/GET
   URL: /api/integrations/...
   Headers: Content-Type, Authorization (if any)
   Body: {...}
   ```
3. **Expected Result**
4. **Actual Result**
5. **Steps to Reproduce**
6. **Environment**:
   - OS: Windows/Linux/Mac
   - Node version: `node -v`
   - Backend status: Running/Not running
7. **Logs** (last 20 lines relevant to issue)

### Example Bug Report

```
Title: Insurance claim verification failing with 500 error

Steps to Reproduce:
1. Call POST /api/integrations/insurance/verify-eligibility
2. With body: {"policyNumber": "POL-001", "patientId": "PAT-001", "serviceType": "service"}

Expected: 200 OK with eligibility details
Actual: 500 Internal Server Error

Error Message:
{
  "success": false,
  "error": "Eligibility verification failed",
  "message": "Cannot read property 'coverage' of undefined"
}

Logs:
ERROR: insurance-connector | verifyCIEligibility | TypeError: Cannot read property...
```

---

## 📞 Getting Help

| Issue Type          | Resource                          |
| ------------------- | --------------------------------- |
| Setup/Installation  | 📖_INTEGRATION_SYSTEM_README.md   |
| API Usage           | 🚀_INTEGRATION_API_QUICK_START.md |
| Architecture/Design | 📚_INTEGRATION_SYSTEM_GUIDE.md    |
| Specific Error      | This troubleshooting guide        |
| Code/Implementation | ✅_INTEGRATION_SYSTEM_COMPLETE.md |

---

## ✅ Issue Resolution Checklist

For any issue:

1. [ ] Check if backend is running
2. [ ] Verify health endpoint: `/api/integrations/health`
3. [ ] Check `.env` configuration
4. [ ] Review relevant logs
5. [ ] Test with Postman collection
6. [ ] Check external service status
7. [ ] Verify request format
8. [ ] Try diagnostic commands
9. [ ] Restart backend
10. [ ] Contact support if still failing

---

## 🆘 Emergency Contacts

- **Support Email**: support@alawael.com
- **Technical Issues**: [Your technical contact]
- **Emergency Hotline**: [Your emergency number]
- **Status Page**: [Your status page URL]

---

**Last Updated**: January 23, 2026  
**Version**: 1.0.0  
**Status**: Active Support
