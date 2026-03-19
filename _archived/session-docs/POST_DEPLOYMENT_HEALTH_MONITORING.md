# POST-DEPLOYMENT HEALTH CHECK & MONITORING GUIDE

**Purpose:** Health check procedures and monitoring setup for Week 1 deployment  
**Audience:** DevOps, Deployment Engineers, Support Team  
**Timeline:** Day of deployment through 24 hours post-deployment

---

## 🏥 AUTOMATED HEALTH CHECK SCRIPT

### Create: health-check.sh

```bash
#!/bin/bash

# ALAWAEL ERP Health Check Script
# Run this script every 5-15 minutes during deployment monitoring
# Logs results to health-check.log

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="/var/log/alawael-health-check.log"
API_URL="https://api.alawael.com"  # or http://localhost:3000 for local
STATUS_FILE="/tmp/alawael-health-status.json"

echo "[$TIMESTAMP] Starting health checks..." | tee -a $LOG_FILE

# Initialize counters
CHECKS_PASSED=0
CHECKS_FAILED=0
ALERTS_TRIGGERED=0

# ==============================================
# CHECK 1: Health Endpoint
# ==============================================
echo "[$TIMESTAMP] Checking health endpoint..." | tee -a $LOG_FILE

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | head -1)

if [ "$HTTP_CODE" == "200" ]; then
  echo "[$TIMESTAMP] ✅ Health check PASS (HTTP $HTTP_CODE)" | tee -a $LOG_FILE
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "[$TIMESTAMP] ❌ Health check FAIL (HTTP $HTTP_CODE)" | tee -a $LOG_FILE
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
  ALERTS_TRIGGERED=$((ALERTS_TRIGGERED + 1))
fi

# ==============================================
# CHECK 2: Database Connection
# ==============================================
echo "[$TIMESTAMP] Checking database connection..." | tee -a $LOG_FILE

DB_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/health/db")
HTTP_CODE=$(echo "$DB_RESPONSE" | tail -1)

if [ "$HTTP_CODE" == "200" ]; then
  echo "[$TIMESTAMP] ✅ Database connection PASS" | tee -a $LOG_FILE
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "[$TIMESTAMP] ❌ Database connection FAIL" | tee -a $LOG_FILE
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
  ALERTS_TRIGGERED=$((ALERTS_TRIGGERED + 1))
fi

# ==============================================
# CHECK 3: Response Time
# ==============================================
echo "[$TIMESTAMP] Checking response time..." | tee -a $LOG_FILE

RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$API_URL/health")
RESPONSE_TIME_MS=$(printf "%.0f" "$(echo "$RESPONSE_TIME * 1000" | bc)")

# Alert if response time > 3000ms
if [ "$RESPONSE_TIME_MS" -lt 3000 ]; then
  echo "[$TIMESTAMP] ✅ Response time OK (${RESPONSE_TIME_MS}ms)" | tee -a $LOG_FILE
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "[$TIMESTAMP] ⚠️  Response time SLOW (${RESPONSE_TIME_MS}ms)" | tee -a $LOG_FILE
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi

# ==============================================
# CHECK 4: Process Running
# ==============================================
echo "[$TIMESTAMP] Checking if process running..." | tee -a $LOG_FILE

if pgrep -f "npm start" > /dev/null || docker ps | grep -q "alawael"; then
  echo "[$TIMESTAMP] ✅ Application process running" | tee -a $LOG_FILE
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "[$TIMESTAMP] ❌ Application process NOT running" | tee -a $LOG_FILE
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
  ALERTS_TRIGGERED=$((ALERTS_TRIGGERED + 1))
fi

# ==============================================
# CHECK 5: Disk Space
# ==============================================
echo "[$TIMESTAMP] Checking disk space..." | tee -a $LOG_FILE

DISK_USAGE=$(df /app | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$DISK_USAGE" -lt 90 ]; then
  echo "[$TIMESTAMP] ✅ Disk space OK (${DISK_USAGE}%)" | tee -a $LOG_FILE
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "[$TIMESTAMP] ⚠️  Disk space LOW (${DISK_USAGE}%)" | tee -a $LOG_FILE
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
  ALERTS_TRIGGERED=$((ALERTS_TRIGGERED + 1))
fi

# ==============================================
# CHECK 6: Memory Usage
# ==============================================
echo "[$TIMESTAMP] Checking memory usage..." | tee -a $LOG_FILE

MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100)}')

if [ "$MEMORY_USAGE" -lt 80 ]; then
  echo "[$TIMESTAMP] ✅ Memory usage OK (${MEMORY_USAGE}%)" | tee -a $LOG_FILE
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "[$TIMESTAMP] ⚠️  Memory usage HIGH (${MEMORY_USAGE}%)" | tee -a $LOG_FILE
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi

# ==============================================
# SUMMARY
# ==============================================
TOTAL_CHECKS=$((CHECKS_PASSED + CHECKS_FAILED))
SUCCESS_RATE=$((CHECKS_PASSED * 100 / TOTAL_CHECKS))

cat << EOF | tee -a $LOG_FILE

[$TIMESTAMP] ========================================
[$TIMESTAMP] HEALTH CHECK SUMMARY
[$TIMESTAMP] ========================================
[$TIMESTAMP] Total Checks: $TOTAL_CHECKS
[$TIMESTAMP] Passed: $CHECKS_PASSED
[$TIMESTAMP] Failed: $CHECKS_FAILED
[$TIMESTAMP] Success Rate: ${SUCCESS_RATE}%
[$TIMESTAMP] Alerts Triggered: $ALERTS_TRIGGERED
[$TIMESTAMP] ========================================

EOF

# ==============================================
# ALERT IF NEEDED
# ==============================================
if [ $ALERTS_TRIGGERED -gt 0 ]; then
  echo "[$TIMESTAMP] 🚨 ALERT: $ALERTS_TRIGGERED checks failed!" | tee -a $LOG_FILE
  # Send alert to monitoring system (Sentry, etc.)
  # Or send Slack notification
  # curl -X POST https://hooks.slack.com/... -d "Health check failed"
fi

# ==============================================
# SAVE STATUS AS JSON
# ==============================================
cat > $STATUS_FILE << EOF
{
  "timestamp": "$TIMESTAMP",
  "totalChecks": $TOTAL_CHECKS,
  "passed": $CHECKS_PASSED,
  "failed": $CHECKS_FAILED,
  "successRate": $SUCCESS_RATE,
  "alertsTriggered": $ALERTS_TRIGGERED,
  "responseTimeMs": $RESPONSE_TIME_MS,
  "diskUsage": $DISK_USAGE,
  "memoryUsage": $MEMORY_USAGE
}
EOF

echo "[$TIMESTAMP] Status saved to $STATUS_FILE" | tee -a $LOG_FILE
```

### Run Health Check

```bash
# Make script executable
chmod +x health-check.sh

# Run manually (first time)
./health-check.sh

# Or schedule with cron (every 5 minutes)
*/5 * * * * /path/to/health-check.sh

# Or use as systemd service
# Create /etc/systemd/system/alawael-health-check.service
```

---

## 📊 MONITORING DASHBOARD SETUP

### Essential Metrics to Monitor

**1. Error Rate**
```
Metric: Errors per minute
Target: < 1% of requests
Alert: If > 2%
Action: Check error logs, investigate
```

**2. Response Time**
```
Metric: API response time (P95)
Target: < 2000ms
Alert: If > 3000ms
Action: Check database, check config
```

**3. Database Latency**
```
Metric: Database query time (average)
Target: < 500ms
Alert: If > 1000ms
Action: Check MongoDB connection pool
```

**4. Active Connections**
```
Metric: Database connections in pool
Target: 5-20 connections
Alert: If > 25 or < 2
Action: Check for connection leaks or exhaustion
```

**5. Memory Usage**
```
Metric: Application memory consumption
Target: < 500MB (varies by server size)
Alert: If > 80% of allocated
Action: Check for memory leaks, restart if needed
```

**6. CPU Usage**
```
Metric: Application CPU usage
Target: < 60% average
Alert: If > 80%
Action: Check for expensive operations
```

### Platform-Specific Setup

#### For CloudWatch (AWS)
```json
{
  "MetricAlarms": [
    {
      "AlarmName": "Alawael-ErrorRate-High",
      "MetricName": "ErrorRate",
      "Threshold": 2,
      "ComparisonOperator": "GreaterThanThreshold",
      "AlarmActions": ["arn:aws:sns:..."]
    },
    {
      "AlarmName": "Alawael-ResponseTime-High",
      "MetricName": "ResponseTime",
      "Threshold": 3000,
      "ComparisonOperator": "GreaterThanThreshold",
      "AlarmActions": ["arn:aws:sns:..."]
    }
  ]
}
```

#### For DataDog
```yaml
monitors:
  - name: "API Error Rate High"
    type: "metric alert"
    query: "avg:application.error_rate{app:alawael} > 0.02"
    alert_message: "Error rate exceeded 2%"
    
  - name: "Response Time High"
    type: "metric alert"
    query: "p95:application.response_time{app:alawael} > 3000"
    alert_message: "Response time exceeds 3000ms"
```

#### For New Relic
```json
{
  "policies": [
    {
      "name": "Alawael API - Critical Alerts",
      "conditions": [
        {
          "type": "apm_app_metric",
          "metric": "error_percentage",
          "threshold": 2,
          "critical_threshold": 5
        },
        {
          "type": "apm_app_metric",
          "metric": "response_time",
          "threshold": 3000,
          "critical_threshold": 5000
        }
      ]
    }
  ]
}
```

---

## 🔍 ERROR LOG MONITORING

### Log Patterns to Watch For

```bash
# Real-time log tailing
tail -f /var/log/alawael-api/error.log

# Search for critical errors
grep "ERROR\|CRITICAL\|FATAL" /var/log/alawael-api/error.log | tail -20

# Count errors by type
grep "ERROR:" /var/log/alawael-api/error.log | cut -d'-' -f2 | sort | uniq -c

# Watch for specific patterns
grep "Connection refused\|Timeout\|Out of memory" /var/log/alawael-api/error.log
```

### Red Flags to Alert On

```
❌ CRITICAL: "Connection refused" - Database down
❌ CRITICAL: "Out of memory" - Memory leak/exhaustion
❌ WARNING: "Deprecated" - Code using old patterns
❌ WARNING: "Timeout" - Performance degradation
⚠️  INFO: "Retry attempt" - System stress
```

---

## ✅ POST-DEPLOYMENT VERIFICATION TESTS

### Test 1: User Registration & Login

```bash
#!/bin/bash

# Register new user
REGISTER=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'$(date +%s)'@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }')

echo "Registration: $REGISTER"

# Extract email
EMAIL=$(echo $REGISTER | grep -o '"email":"[^"]*' | cut -d'"' -f4)

# Login with that user
LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"TestPass123!\"
  }")

echo "Login: $LOGIN"

# Verify token returned
if echo "$LOGIN" | grep -q "token"; then
  echo "✅ Authentication flow works"
else
  echo "❌ Authentication flow FAILED"
fi
```

### Test 2: Data Operations

```bash
#!/bin/bash

# Get a valid token first
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -d '...' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Create resource
CREATE=$(curl -s -X POST http://localhost:3000/api/drivers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "...",
    "licenseNumber": "DL12345",
    "licenseExpiry": "2027-12-31"
  }')

echo "Create: $CREATE"

# Read resource
READ=$(curl -s -X GET http://localhost:3000/api/drivers \
  -H "Authorization: Bearer $TOKEN")

echo "Read: $READ"

# Verify data persisted
if echo "$READ" | grep -q "DL12345"; then
  echo "✅ Data operations work"
else
  echo "❌ Data operations FAILED"
fi
```

### Test 3: Error Handling

```bash
#!/bin/bash

# Test 404 error
RESPONSE=$(curl -s -w "\n%{http_code}" "http://localhost:3000/api/invalid")
CODE=$(echo "$RESPONSE" | tail -1)

if [ "$CODE" == "404" ]; then
  echo "✅ 404 error handling works"
else
  echo "❌ 404 error handling FAILED (got $CODE)"
fi

# Test 401 error (unauthorized)
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "http://localhost:3000/api/drivers" \
  -H "Authorization: Bearer invalid-token")
CODE=$(echo "$RESPONSE" | tail -1)

if [ "$CODE" == "401" ]; then
  echo "✅ 401 error handling works"
else
  echo "❌ 401 error handling FAILED (got $CODE)"
fi
```

---

## 📈 24-HOUR MONITORING CHECKLIST

### Hour 1 (10:30-11:30)
- [ ] Every 5 min: Health check
- [ ] Every 5 min: Error log review
- [ ] Error rate observed: ______%
- [ ] Response time observed: ______ms

### Hours 2-4 (11:30-14:30)
- [ ] Every 15 min: Health check
- [ ] Every 30 min: Error log review
- [ ] Error rate trend: ______ (stable/increasing/decreasing)
- [ ] Response time trend: ______

### Hours 5-8 (14:30-18:30)
- [ ] Every 30 min: Health check
- [ ] Database performance: ______
- [ ] Memory stable: YES / NO
- [ ] CPU usage: ______%

### Hours 9-24 (18:30-next day 09:30)
- [ ] Every hour: Spot check
- [ ] Overnight: On-call monitoring
- [ ] Morning review: All metrics

**Final Decision at 24 hours:**
- [ ] System STABLE → Declare SUCCESS
- [ ] Issues found → Continue monitoring, escalate if needed

---

**Status:** ✅ READY FOR DEPLOYMENT MONITORING

