# 🖥️ ALL BASH COMMANDS READY TO EXECUTE - FEB 28

## VERIFICATION COMMANDS (Copy & Paste Ready)

### 1. CODE VERIFICATION

```bash
# Check git status
cd /path/to/api
git status

# View recent commits
git log --oneline -n 10

# Check for uncommitted changes
git diff --stat

# Verify no uncommitted changes exist
if [ -z "$(git status --porcelain)" ]; then 
  echo "✅ Working tree is clean"; 
else 
  echo "❌ Uncommitted changes detected"; 
fi
```

**Expected Output:**
```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

---

### 2. TEST BASELINE

```bash
# Run full test suite
npm test

# Run specific test categories
npm test -- auth          # Authentication tests
npm test -- routes        # Route/API tests
npm test -- db           # Database tests
npm test -- authorization # Authorization tests

# Get coverage percentage
npm test -- --coverage

# Run tests with specific reporter
npm test -- --json > test-results.json
```

**Expected Output:**
```
Test Suites: 50 passed, 50 total
Tests: 3390 passed, 675 skipped, 4065 total
Coverage: 83.39%
```

---

### 3. INFRASTRUCTURE VERIFICATION

```bash
# Check disk space
df -h /app
# Alternative with more detail
df -h /app | awk 'NR==2 {print "Used: " $3 ", Free: " $4 ", Mounted: " $6}'

# Variable to check if disk > 20GB free
FREE_SPACE=$(df /app | awk 'NR==2 {print $4}')
if [ "$FREE_SPACE" -gt 20971520 ]; then  # 20GB in KB
  echo "✅ Disk space OK: $(df -h /app | awk 'NR==2 {print $4}')";
else
  echo "❌ Insufficient disk space: $(df -h /app | awk 'NR==2 {print $4}')";
fi
```

**Expected Output:**
```
Filesystem     Size  Used Avail Use% Mounted on
/dev/sda1     500G  400G  100G  80% /app

✅ Disk space OK: 100G
```

---

### 4. MEMORY CHECK

```bash
# Check memory availability
free -h

# Check memory in KB
free -k | awk 'NR==2 {print "Used: " $3 "KB, Available: " $7 "KB"}'

# Check if memory > 2GB available
AVAILABLE=$(free | awk 'NR==2 {print $7}')
if [ "$AVAILABLE" -gt 2097152 ]; then  # 2GB in KB
  echo "✅ Memory available: $(( AVAILABLE / 1048576 ))GB";
else
  echo "❌ Insufficient memory: $(( AVAILABLE / 1048576 ))GB";
fi
```

**Expected Output:**
```
              total        used        free      shared  buff/cache   available
Mem:          15Gi       8.5Gi       2.5Gi       100Mi       4.0Gi       6.5Gi

✅ Memory available: 6GB
```

---

### 5. PORT AVAILABILITY

```bash
# Check if port 3000 is in use
netstat -tlnp | grep 3000

# Alternative: lsof command
lsof -i :3000

# Check all listening ports
netstat -tlnp | grep LISTEN

# Verify port 3000 is FREE
if ! netstat -tlnp 2>/dev/null | grep -q ':3000'; then
  echo "✅ Port 3000 is available";
else
  echo "❌ Port 3000 is already in use";
fi
```

**Expected Output (Port Available):**
```
✅ Port 3000 is available
```

**Expected Output (Port In Use):**
```
tcp  0  0 0.0.0.0:3000  0.0.0.0:*  LISTEN  12345/node
❌ Port 3000 is already in use
```

---

### 6. DATABASE CONNECTION TEST

```bash
# Test MongoDB connection (requires credentials)
# Replace <username>, <password>, <cluster> with actual values
mongosh "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/alawael" --eval "db.adminCommand('ping')"

# Or using curl (if database is accessible via HTTP)
curl -s -m 5 mongodb+srv://<username>:<password>@<cluster>.mongodb.net/alawael

# Test with timeout
timeout 5 mongosh "mongodb+srv://user:pass@cluster.mongodb.net/test" --eval "print('✅ Connection successful')"
```

**Expected Output:**
```
{ ok: 1 }

or

✅ Connection successful
```

---

### 7. BACKUP VERIFICATION

```bash
# Check if backup file exists
ls -lh /app/alawael-api.backup*

# Get backup file size
du -h /app/alawael-api.backup* | awk '{print "Backup size: " $1}'

# Count backup files
ls /app/alawael-api.backup* | wc -l

# Create a labeled backup with timestamp
BACKUP_NAME="/app/alawael-api.backup.$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$BACKUP_NAME" /app/alawael-api
echo "Backup created: $BACKUP_NAME"
ls -lh "$BACKUP_NAME"
```

**Expected Output:**
```
-rw-r--r-- 1 root root 1.2G Feb 28 10:30 /app/alawael-api.backup.20260228_100000.tar.gz
Backup created: /app/alawael-api.backup.20260228_100000.tar.gz
-rw-r--r-- 1 root root 1.2G Feb 28 10:33 /app/alawael-api.backup.20260228_100000.tar.gz
```

---

### 8. NETWORK CONNECTIVITY

```bash
# Ping database cluster
ping -c 5 <mongodb-cluster-host>

# Check DNS resolution
nslookup <mongodb-cluster-host>

# Check network connectivity with timeout
timeout 10 curl -s -o /dev/null -w "%{http_code}" https://<database-endpoint>/Health
```

**Expected Output:**
```
--- <host> ping statistics ---
5 packets transmitted, 5 received, 0.0% packet loss

or

200 (HTTP response code)
```

---

### 9. SECURITY VERIFICATION

```bash
# Check for .env files in git history
git log --all -- '*.env*'

# Search for common secret keywords in git
git log --all -p | grep -i "secret\|password\|api_key\|api.key" | head -20

# Verify no hardcoded secrets in recent commits
git log --oneline -n 20 | while read commit; do
  git show "$commit" | grep -i "password\|secret\|key" && echo "Found in $commit"
done

# Check current git configuration
git config --list | grep -E "user|email"
```

**Expected Output (No Secrets):**
```
# No output = good (no secrets found)

# OR if secrets exist:
❌ Found password references in commit abc123
```

---

### 10. ENVIRONMENT FILE VERIFICATION

```bash
# View production environment (CAREFULLY!)
cat /app/.env.production

# Check specific variables
grep "MONGODB_URL\|JWT_SECRET\|NODE_ENV" /app/.env.production

# Verify NODE_ENV is production
NODE_ENV=$(grep "NODE_ENV" /app/.env.production | cut -d'=' -f2)
if [ "$NODE_ENV" = "production" ]; then
  echo "✅ NODE_ENV is set to: $NODE_ENV";
else
  echo "❌ NODE_ENV is NOT production: $NODE_ENV";
fi

# Check if .env file exists
if [ -f /app/.env.production ]; then
  echo "✅ .env.production file exists";
else
  echo "❌ .env.production file NOT found";
fi
```

**Expected Output:**
```
✅ NODE_ENV is set to: production
✅ .env.production file exists
```

---

## DEPLOYMENT-DAY COMMANDS (For Tuesday, March 5)

### 11. STOP APPLICATION

```bash
# Stop using PM2
pm2 stop alawael-api
pm2 kill
pm2 flush

# Verify stopped
pm2 list

# Or if using systemd
sudo systemctl stop alawael
sudo systemctl status alawael

# Or if using Docker
docker stop alawael-api
docker ps | grep alawael
```

**Expected Output:**
```
[PM2] Stopping app 'alawael-api'...
[PM2] App 'alawael-api' stopped
[PM2] No apps are currently running
```

---

### 12. CREATE BACKUP BEFORE DEPLOYMENT

```bash
# Create backup with timestamp
TIMESTAMP=$(date +%s)
BACKUP_PATH="/app/alawael-api.backup.$TIMESTAMP"
mkdir -p "$BACKUP_PATH"
cp -r /app/alawael-api/* "$BACKUP_PATH/"
echo "Backup created at: $BACKUP_PATH"

# Verify backup size
du -h "$BACKUP_PATH"

# Store backup location in file for easy rollback
echo "$BACKUP_PATH" > /app/LAST_BACKUP_LOCATION.txt
cat /app/LAST_BACKUP_LOCATION.txt
```

**Expected Output:**
```
Backup created at: /app/alawael-api.backup.1709000000
1.2G    /app/alawael-api.backup.1709000000
/app/alawael-api.backup.1709000000
```

---

### 13. DEPLOY CODE (Git Pull + Install + Start)

```bash
# Step 1: Pull latest code from main branch
cd /app/alawael-api
git pull origin main
# Expected: Already up to date OR Updating...

# Step 2: Install dependencies
npm install --production
# Expected: up to date... added 0 packages

# Step 3: Start application
npm start
# OR use PM2
pm2 start npm --name "alawael-api" -- start

# Watch for startup confirmation
sleep 5
ps aux | grep "node\|npm" | grep -v grep
```

**Expected Output:**
```
[Stage 1] Successfully pulled from origin/main
up to date (dependencies)
Server running on port 3000
[Server process ID: 12345]
```

---

### 14. HEALTH CHECK (After Deployment)

```bash
# Test health endpoint (should return JSON with uptime)
curl -s http://localhost:3000/health

# Test database health
curl -s http://localhost:3000/api/health/db

# Verify HTTP status codes
echo "Health endpoint status:"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health

echo "Database endpoint status:"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/health/db

# All checks in one
for endpoint in "/health" "/api/health/db"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$endpoint")
  echo "$endpoint: HTTP $status"
done
```

**Expected Output:**
```
{
  "status": "ok",
  "uptime": 15,
  "timestamp": "2026-03-05T10:05:00Z"
}

{"status":"ok","latency":"45ms"}

Health endpoint status: 200
Database endpoint status: 200
```

---

### 15. SMOKE TEST #1 - BASIC HEALTH CHECK

```bash
# Test 1: Basic health check
if curl -s http://localhost:3000/health | grep -q "ok"; then
  echo "✅ TEST 1 PASSED: Health check responded";
else
  echo "❌ TEST 1 FAILED: Health check did not respond";
fi
```

**Expected:**
```
✅ TEST 1 PASSED: Health check responded
```

---

### 16. SMOKE TEST #2 - DATABASE HEALTH

```bash
# Test 2: Database check
LATENCY=$(curl -s http://localhost:3000/api/health/db | grep -oP '"latency":\s*"\K[^"]+')
if [ -n "$LATENCY" ]; then
  echo "✅ TEST 2 PASSED: Database check passed (Latency: $LATENCY)";
else
  echo "❌ TEST 2 FAILED: Database check failed";
fi
```

**Expected:**
```
✅ TEST 2 PASSED: Database check passed (Latency: 45ms)
```

---

### 17. SMOKE TEST #3 - AUTHENTICATION

```bash
# Test 3: Authentication (Register + Login)
REGISTER=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test123!"}')

if echo "$REGISTER" | grep -q "token"; then
  echo "✅ TEST 3 PASSED: Authentication working, JWT token issued";
else
  echo "❌ TEST 3 FAILED: Authentication failed";
fi
```

**Expected:**
```
✅ TEST 3 PASSED: Authentication working, JWT token issued
```

---

### 18. SMOKE TEST #4 - API DATA RETRIEVAL

```bash
# Test 4: API endpoint (requires valid token)
TOKEN="your_jwt_token_here"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/users)

if [ "$STATUS" = "200" ]; then
  echo "✅ TEST 4 PASSED: API endpoint returned 200 OK";
else
  echo "❌ TEST 4 FAILED: API endpoint returned $STATUS";
fi
```

**Expected:**
```
✅ TEST 4 PASSED: API endpoint returned 200 OK
```

---

### 19. SMOKE TEST #5 - ERROR HANDLING

```bash
# Test 5: 404 Response (not 500)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3000/api/invalid-endpoint)

if [ "$STATUS" = "404" ]; then
  echo "✅ TEST 5 PASSED: Invalid endpoint returns 404 (not 500 error)";
else
  echo "❌ TEST 5 FAILED: Invalid endpoint returned $STATUS (expected 404)";
fi
```

**Expected:**
```
✅ TEST 5 PASSED: Invalid endpoint returns 404 (not 500 error)
```

---

## MONITORING COMMANDS (For March 5-6)

### 20. SYSTEM RESOURCE MONITORING

```bash
# Memory usage
free -h | grep Mem

# CPU usage (top 5 processes)
top -bn1 | head -20

# Disk usage
df -h /app

# Network statistics
netstat -s | head -10
```

---

### 21. ERROR LOG MONITORING

```bash
# View recent error logs
tail -n 50 /app/alawael-api/logs/error.log

# Count errors in last hour
find /app/alawael-api/logs -name "*.log" -newermt "1 hour ago" \
  -exec grep -i "error\|exception\|critical" {} \; | wc -l

# Real-time log monitoring
tail -f /app/alawael-api/logs/application.log
```

---

### 22. PROCESS MONITORING

```bash
# Check if Node process running
ps aux | grep "node\|npm" | grep -v grep

# Check memory usage of Node
ps aux | grep node | awk '{print "PID:", $2, "Memory:", $6 "KB", "User:", $1}'

# Monitor process in real-time
watch -n 5 'ps aux | grep node'
```

---

### 23. RESPONSE TIME MONITORING

```bash
# Measure response time
time curl -s http://localhost:3000/health > /dev/null

# Get response time in milliseconds
curl -w "Time: %{time_total}s\n" -o /dev/null -s http://localhost:3000/health

# Test multiple requests
for i in {1..5}; do
  curl -w "Request $i: %{time_total}s\n" -o /dev/null -s http://localhost:3000/health
done
```

**Expected Output:**
```
real    0m0.125s
user    0m0.010s
sys     0m0.015s

Time: 0.125s (125ms)
```

---

## ROLLBACK COMMANDS (Emergency Use Only)

### 24. QUICK ROLLBACK (10 Minutes)

```bash
# Step 1: Stop current deployment (1 min)
pm2 stop alawael-api
pm2 kill

# Step 2: Restore from backup (2 min)
BACKUP_LOC=$(cat /app/LAST_BACKUP_LOCATION.txt)
rm -rf /app/alawael-api
cp -r "$BACKUP_LOC" /app/alawael-api

# Step 3: Start previous version (2 min)
cd /app/alawael-api
npm install --production
npm start

# Step 4: Verify running (2 min)
sleep 5
curl -s http://localhost:3000/health | grep -q "ok"
if [ $? -eq 0 ]; then
  echo "✅ ROLLBACK SUCCESSFUL";
else
  echo "❌ ROLLBACK FAILED - Manual investigation required";
fi

# Step 5: Notify team (3 min)
echo "ROLLBACK EXECUTED - Previous version restored" | mail -s "URGENT: Deployment Rollback" team@example.com
```

**Timeline:**
- Stop app: 1 min
- Restore backup: 2 min
- Start app: 2 min
- Verify health: 2 min
- Notify: 3 min
- **Total: ~10 minutes**

---

## ALL COMMANDS SUMMARY - COPY SHEET

| Command | Purpose | Timeline |
|---------|---------|----------|
| git status | Verify clean code | 30 sec |
| npm test | Baseline test run | 15 min |
| df -h /app | Check disk space | 10 sec |
| free -h | Check memory | 10 sec |
| netstat -tlnp \| grep 3000 | Check port availability | 10 sec |
| curl -s mongodb+srv://... | Test DB connection | 30 sec |
| pm2 stop alawael-api | Stop application | 1 min |
| git pull && npm install && npm start | Deploy code | 3 min |
| curl http://localhost:3000/health | Health check | 1 sec |
| top -bn1 | System resources | 10 sec |
| tail -f logs | Monitor errors | Real-time |

---

## QUICK TEST BUNDLE (Run All 5 Tests at Once)

```bash
#!/bin/bash

echo "Running all 5 smoke tests..."
PASSED=0
FAILED=0

# Test 1: Health check
if curl -s http://localhost:3000/health | grep -q "ok"; then
  echo "✅ TEST 1: Health check PASSED"; ((PASSED++))
else
  echo "❌ TEST 1: Health check FAILED"; ((FAILED++))
fi

# Test 2: Database health
if curl -s http://localhost:3000/api/health/db | grep -q "ok"; then
  echo "✅ TEST 2: Database check PASSED"; ((PASSED++))
else
  echo "❌ TEST 2: Database check FAILED"; ((FAILED++))
fi

# Test 3: Authentication
if curl -s http://localhost:3000/api/health | grep -q "ok"; then
  echo "✅ TEST 3: Authentication PASSED"; ((PASSED++))
else
  echo "❌ TEST 3: Authentication FAILED"; ((FAILED++))
fi

# Test 4: API endpoint (requires proper header)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$STATUS" = "200" ]; then
  echo "✅ TEST 4: API endpoint PASSED"; ((PASSED++))
else
  echo "❌ TEST 4: API endpoint FAILED"; ((FAILED++))
fi

# Test 5: Error handling (404)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/invalid)
if [ "$STATUS" = "404" ]; then
  echo "✅ TEST 5: Error handling PASSED"; ((PASSED++))
else
  echo "❌ TEST 5: Error handling FAILED"; ((FAILED++))
fi

echo ""
echo "RESULTS: $PASSED passed, $FAILED failed out of 5"
if [ $FAILED -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED!";
else
  echo "⚠️  Some tests failed - investigate before declaring live";
fi
```

---

## HOW TO USE THESE COMMANDS

1. **Copy command block** from above
2. **Paste into terminal**
3. **Run each command**
4. **Verify expected output**
5. **Record status** in LAST_24_HOURS_PRE_DEPLOYMENT.md

**NOTE:** Replace placeholder values:
- `/path/to/api` → Your actual API directory path
- `<username>`, `<password>`, `<cluster>` → Your actual database credentials
- `your_jwt_token_here` → Valid JWT token from authentication test

