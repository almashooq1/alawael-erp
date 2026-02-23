# ALAWAEL v1.0.0 - Team Operational Playbooks

**How to Use This Document:**
Each playbook describes a specific operational scenario with:
1. **Recognition:** How to identify the issue
2. **Impact:** What users experience
3. **Investigation:** Steps to diagnose
4. **Resolution:** How to fix it
5. **Prevention:** How to avoid next time

---

## 🔧 Playbook 1: High Response Time (P99 > 500ms)

### 🎯 Recognition
- GraphQL alerts: "Response Time P99 critical"
- Customer reports: "Site feels slow"
- Dashboard: P99 bar above red line (500ms)

### 📊 Impact
- Users experience slow page loads
- API timeouts possible if > 2000ms
- Checkout process at risk (if > 3s, users abandon)
- SLA breach if sustained > 5 min

### 🔍 Investigation Steps

**Step 1: Identify the bottleneck (5 min)**
```bash
# Check what's causing the slowness
curl -H "X-Request-ID: trace-123" https://api.alawael.company/api/health

# Check slowest endpoints
# Grafana: Dashboard → API Performance → Top 10 Slowest Endpoints
```

**Step 2: Check database (if query-heavy)**
```sql
-- Check for slow queries
SELECT query, avg_time, call_count 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check replication lag
SELECT * FROM pg_stat_replication;
```

**Step 3: Check infrastructure (if resource-heavy)**
```bash
# Check CPU/Memory on instances
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-xxx \
  --start-time 2026-02-22T10:00:00Z \
  --end-time 2026-02-22T10:15:00Z \
  --period 60 --statistics Average

# Expected: CPU < 80%, Memory < 85%
```

**Step 4: Check cache efficiency**
```bash
# Redis cache hit rate
redis-cli INFO stats

# Expected: hit_ratio > 90%
# If < 85%: Cache invalidation issue
```

### ✅ Resolution

**If Database Query Issue:**
```
1. Identify slow query (from step 2)
2. Add missing index:
   CREATE INDEX idx_users_email ON users(email);
3. Monitor for 5 min (should improve within 30s of index creation)
4. Create Jira ticket for permanent fix in v1.0.1
```

**If Infrastructure Issue:**
```
1. Check if auto-scaling triggered:
   aws autoscaling describe-auto-scaling-groups
   
2. If scaling in progress: Wait 2-3 min for new instances
3. If NOT scaling:
   - Force manual scale: aws autoscaling set-desired-capacity
   - Operator error? Check auto-scaling rules
   - Need capacity increase? Alert VP Ops for RI purchase

4. Monitor metrics return to normal (<475ms P99)
```

**If Cache Issue:**
```
1. Check cache hit rate trending
2. If dropping: Invalidation logic broken
   - Review recent code changes
   - Check cache keys in app logs
   - Clear cache manually: FLUSHDB (temporary)
3. Engage backend team for permanent fix
4. Monitor recovery (should improve in next 5-10 min)
```

### 🛡️ Prevention

1. **Set up alerts:**
   - Alert: Response time P99 > 450ms (warning)
   - Alert: Response time P99 > 500ms (critical)
   
2. **Weekly review:**
   - Top 10 slowest endpoints
   - Database slow query log
   - Cache hit rate trends

3. **Load test before release:**
   - Simulate 3,000 concurrent users
   - Monitor P99 (should stay < 475ms)
   - Approve release only if SLA met

---

## 🔧 Playbook 2: High Error Rate (> 0.05%)

### 🎯 Recognition
- Alert: "Error Rate Critical (> 0.05%)"
- Dashboard: Error rate line going up (red zone)
- Customer tickets: "Getting errors on checkout"

### 📊 Impact
- Some API calls failing
- Partial service degradation
- User might need to retry
- If > 1%: Likely incident

### 🔍 Investigation Steps

**Step 1: Confirm the error rate (2 min)**
```bash
# Check actual error rate from logs
cat /var/log/alawael-api.log | grep "ERROR" | wc -l
# Divide by total requests to get percentage

# Grafana: Dashboard → Error Analysis → Error Rate by Endpoint
```

**Step 2: Identify which endpoint (2 min)**
```sql
-- Check error logs
SELECT endpoint, error_code, error_count, timestamp
FROM errors 
WHERE timestamp > NOW() - INTERVAL '10 minutes'
ORDER BY error_count DESC;
```

**Step 3: Identify error type (3 min)**
```
Common errors:
  - 500 Internal Server Error: Application crash
  - 503 Service Unavailable: Scaling issue
  - 502 Bad Gateway: Load balancer issue
  - 429 Too Many Requests: Rate limiting triggered
  - 401 Unauthorized: Auth service issue
```

**Step 4: Check logs for stack traces**
```bash
# Tail error logs
tail -100 /var/log/alawael-api.log | grep "ERROR\|Exception"

# Search logs in ELK:
# Kibana → Discover → Filter: level:ERROR AND timestamp:last_15m
```

### ✅ Resolution

**If 500 Internal Server Error:**
```
1. Check application logs for exception
2. If recent code deploy: Rollback immediately
   bash alawael-phase4-production-rollback.sh
3. If not recent deploy:
   - Restart affected service
   - Monitor error rate (should drop)
   - Post-mortem after stabilization
```

**If 503 Service Unavailable:**
```
1. Check if all instances healthy
   aws ec2 describe-instance-status \
     --filters Name=instance-state-name,Values=running
2. Check if scaling in progress
   aws autoscaling describe-auto-scaling-groups
3. Manually add instance if needed:
   aws autoscaling set-desired-capacity \
     --auto-scaling-group-name alawael-green-asg \
     --desired-capacity 6
```

**If 429 Too Many Requests:**
```
1. Check rate limits:
   redis-cli INFO stats | grep commands_processed
2. If legitimate spike:
   - Increase rate limit cap
   - Notify customers
3. If DDoS attack:
   - Enable WAF rules
   - Alert security team
```

**If 401 Unauthorized:**
```
1. Check auth service status
   curl https://auth.alawael.company/health
2. Check if JWT tokens expired/rotated
   Check /var/log/auth-service.log
3. If auth service down:
   - Restart auth service
   - Check database connectivity
4. Monitor error rate recovery
```

### 🛡️ Prevention

1. **Set up alerts:**
   - Alert: Error rate > 0.03% (warning)
   - Alert: Error rate > 0.05% (critical)
   
2. **Code review process:**
   - All PRs reviewed before merge
   - Staging testing required (all error scenarios)
   
3. **Monitoring:**
   - Error rate by endpoint dashboard
   - Stack trace tracking
   - Weekly error analysis meeting

---

## 🔧 Playbook 3: Database Connection Pool Exhausted

### 🎯 Recognition
- Alert: "Database Connection Pool High (>140/150)"
- Users get: "Connection pool exhausted" error
- Application logs show: "Could not get connection from pool"

### 📊 Impact
- New API requests fail immediately
- Existing connections work
- Manifests as 503 Service Unavailable
- Can cascade to full service outage

### 🔍 Investigation Steps

**Step 1: Check current pool usage (1 min)**
```sql
-- Check connection count
SELECT count(*) as active_connections
FROM pg_stat_activity;

-- Check pool settings
SHOW max_connections;  -- Server max (usually 200)
-- App pool size: 150 (configured in v1.0.0)
```

**Step 2: Identify idle connections (2 min)**
```sql
-- Find long-running idle connections
SELECT pid, query_start, state_change, query
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < NOW() - INTERVAL '5 minutes'
ORDER BY query_start;
```

**Step 3: Check for connection leaks (3 min)**
```bash
# Recently deployed?
git log --oneline -5

# Check if backend handles connection.close() properly
grep -r "connection.release()\|connection.close()" \
  /app/backend/src --include="*.js" | head -20
```

### ✅ Resolution

**If Idle Connections Holding Resources:**
```
1. Terminate idle connections:
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND query_start < NOW() - INTERVAL '10 minutes';

2. Monitor recovery:
   SELECT count(*) as active_connections FROM pg_stat_activity;
   
3. Should drop significantly (expect < 100 connections)
4. Create Jira ticket: "Investigate connection leak"
```

**If Pool Undersized for Current Traffic:**
```
1. Current pool size: 150 connections
2. Check peak usage: 140/150 = 93% utilization
3. Increase pool size:
   Connection Pool Size = 150 → 200
   (Update in environment: DATABASE_POOL_SIZE=200)

4. Deploy change to production (Phase 4 blue-green)
5. Monitor for 30 min (should improve)
6. Adjust further if needed (target: <70% utilization)
```

**If Connection Leak in Application:**
```
1. Identify app version with leak:
   git diff v1.0.0...HEAD -- backend/src/database

2. If leak introduced in recent code:
   git revert [commit-hash]
   Deploy fix via Phase 4

3. If leak is in v1.0.0:
   - Urgent hotfix required
   - Create v1.0.1 with connection fix
   - Deploy via Phase 4

4. Meanwhile: Terminate idle connections (temporary fix)
```

### 🛡️ Prevention

1. **Code review:**
   - All database code reviewed
   - Check: connection.release() called in finally block
   - Check: No orphaned connections in error paths

2. **Connection pool monitoring:**
   - Alert: Connection usage > 80% (planning alert)
   - Alert: Connection usage > 90% (critical)
   
3. **Load testing:**
   - Test with 2x expected concurrent users
   - Monitor peak connection usage
   - Verify all connections released after test

---

## 🔧 Playbook 4: Replication Lag Detected

### 🎯 Recognition
- Alert: "Database Replication Lag > 1 second"
- Dashboard: Replication tab shows lag
- Users might see stale data (read from replica)

### 📊 Impact
- Read replicas 1-5 seconds behind primary
- Users see "old" data if reading from replica
- Typically not critical (most reads written recently)
- If > 30s: Possible network or replica issue

### 🔍 Investigation Steps

**Step 1: Check replication status (2 min)**
```sql
-- Check replication lag
SELECT 
  application_name,
  EXTRACT(EPOCH FROM (NOW() - pg_last_wal_receive_lsn())) AS lag_seconds
FROM pg_stat_replication;

-- Expected: lag < 1 second
-- Warning: lag > 5 seconds
-- Critical: lag > 30 seconds
```

**Step 2: Identify if temporary or sustained (3 min)**
```bash
# Graph lag over 5 minutes
# Grafana: Database Dashboard → Replication Lag (trending)

# If spike: Likely temporary (write-heavy operation)
# If sustained: Possible network issue
```

**Step 3: Check replica server resources (2 min)**
```sql
-- Connect to replica and check:
SELECT 
  setting,
  current_setting(setting) AS current_value
FROM pg_settings
WHERE name IN ('max_parallel_workers_per_gather', 'wal_receiver_status_interval');

-- Check CPU/memory on replica instance
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-replica1 \
  --start-time 2026-02-22T10:00:00Z \
  --end-time 2026-02-22T10:10:00Z
```

### ✅ Resolution

**If Temporary Write Spike (Expected):**
```
1. This is normal during high-traffic periods
2. Nothing to do - replication will catch up
3. Monitor lag returns to < 1s within 2-5 min
4. After traffic spike: Lag should normalize
5. No action required (expected behavior)
```

**If Sustained Lag > 5 Seconds:**
```
1. Check replica server CPU:
   - If CPU high: Upgrade replica instance
   - If CPU low: Check network bandwidth
   
2. Check network connectivity:
   ping -c 10 replica-endpoint.rds.amazonaws.com
   
3. If network issue:
   - Contact AWS Support
   - Failover to another replica (temporary)
   - Plan instance replacement
```

**If Network Issue (Suspected):**
```
1. Failover to other replica as reader:
   Update app connection: read_replica=replica2
   
2. Leave affected replica unconnected
3. AWS will auto-redirect reads to healthy replica
4. Contact AWS for root cause
5. Expect resolution within 1-2 hours
```

### 🛡️ Prevention

1. **Monitor closely:**
   - Alert: Lag > 2 seconds (planning)
   - Alert: Lag > 5 seconds (critical)
   
2. **Baseline understanding:**
   - Normal lag: < 500ms
   - During traffic spike: < 2s acceptable
   - Sustained lag: Investigate

3. **Capacity planning:**
   - Monitor replica CPU/memory trends
   - Plan upgrades if trending up
   - Load test before capacity changes

---

## 🔧 Playbook 5: Memory Pressure on Instances

### 🎯 Recognition
- Alert: "Memory Usage > 85%"
- Dashboard: Memory bar in red zone
- Some services might get OOMKilled (Out of Memory Killed)

### 📊 Impact
- Server might start swapping (very slow)
- Services getting killed by kernel
- New instances might fail to start

### 🔍 Investigation Steps

**Step 1: Check which process using memory (2 min)**
```bash
# SSH to instance
ssh ec2-user@instance-ip

# Check memory by process
ps aux --sort=-%mem | head -10

# Expected top processes:
#   - Node.js API server: ~45%
#   - PostgreSQL client: ~20%
#   - Others: < 10%
```

**Step 2: Check for memory leaks (3 min)**
```bash
# Node.js heap memory
node -e "console.log(Math.round(require('os').freemem() / 1024 / 1024)) + 'MB free'"

# Docker memory stats (if containerized)
docker stats --no-stream

# Check for growing processes
watch 'ps aux | grep node | grep -v grep'
```

**Step 3: Check if cache layer is bloated (2 min)**
```bash
# Redis memory usage
redis-cli INFO memory | grep used_memory_human

# Expected: < 2GB (have 8GB total)
# If > 3GB: Cache invalidation issue
```

### ✅ Resolution

**If Cache Too Large (Most Common):**
```
1. Check Redis memory usage:
   redis-cli INFO memory
   
2. Clear cache (temporary fix):
   redis-cli FLUSHDB
   
3. Monitor recovery:
   - System memory should drop to < 70%
   - Cache hit rate will drop initially (warm-up)
   - Should recover in 5-10 minutes
   
4. Implement permanent fix:
   - Review cache expiration policies
   - Reduce cache TTL
   - Create Jira for optimization

5. Monitor trending:
   Check daily: Does cache size keep growing?
```

**If NodeJS Server Has Memory Leak:**
```
1. Check running time:
   ps aux | grep node
   # Look at start time and memory
   
2. If started today with high memory:
   - Restart application server
   - Monitor memory after restart
   
3. If still high after restart:
   - Likely code issue
   - Check recent code changes:
     git log -p --follow -- src/api.js | head -100
   - May need rollback or hotfix
```

**If PostgreSQL Client Connection Leak:**
```
1. Check connection count:
   SELECT count(*) FROM pg_stat_activity;
   
2. If > 100 connections:
   - Restart app servers
   - Monitor connection count drop
   
3. If doesn't drop:
   - Investigate connection pool code
   - May need code change + deploy
```

### 🛡️ Prevention

1. **Monitor memory:**
   - Alert: Memory > 75% (planning)
   - Alert: Memory > 85% (critical)
   
2. **Code review:**
   - Check for memory leaks in code review
   - Ensure proper cleanup in destructors
   
3. **Load testing:**
   - Test for 2+ hours at peak load
   - Check memory trending (should stabilize)
   - Approve if memory stable after 1 hour

---

## 🔧 Playbook 6: Auto-Scaling Not Triggering

### 🎯 Recognition
- High traffic but no new instances spinning up
- CPU 85%+ on existing instances
- Scaling should have triggered but didn't

### 📊 Impact
- Performance degrades under load
- May not recover after spike (no new capacity)
- Users experience increased latency

### 🔍 Investigation Steps

**Step 1: Check auto-scaling status (2 min)**
```bash
# Check ASG desired vs actual capacity
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names alawael-green-asg

# Check: DesiredCapacity vs Instances list
# Should be equal (if not, scaling in progress)
```

**Step 2: Check scaling policies (2 min)**
```bash
# List all scaling policies
aws autoscaling describe-policies \
  --auto-scaling-group-name alawael-green-asg

# Check: Target CPU and threshold
# Expected: Target 75% CPU
```

**Step 3: Check scaling activity log (3 min)**
```bash
# See recent scaling events
aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name alawael-green-asg \
  --max-records 20

# Look for: "Launch" activities in last 15 min
# If none found: Scaling didn't trigger
```

**Step 4: Check CloudWatch metrics (2 min)**
```bash
# Get current CPU across all instances
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=AutoScalingGroupName,Value=alawael-green-asg \
  --start-time 2026-02-22T10:00:00Z \
  --end-time 2026-02-22T10:15:00Z \
  --period 60 --statistics Average

# Expected: > 75% if scaling should trigger
```

### ✅ Resolution

**If Auto-Scaling Is At Max Capacity:**
```
1. Check current capacity:
   aws autoscaling describe-auto-scaling-groups
   
2. If DesiredCapacity = max (12 instances):
   - Already at max
   - Can't scale further
   - Alert VP Ops: Need RI/cost discussion
   
3. Temporary options:
   - Increase max capacity (costs more)
   - Reduce traffic (talk to product team)
   
4. Long-term: Reserved instances upgrade
```

**If Scaling Policy Disabled:**
```
1. Check scaling policies:
   aws autoscaling describe-policies
   
2. If no policies found or disabled:
   - Re-enable: aws autoscaling enable-metrics-collection
   - Recreate policy if missing
   
3. Verify policy:
   - Target CPU: 75%
   - Duration: 2 minutes
   - Adjustment: +1 instance
```

**If CloudWatch Metrics Not Reporting:**
```
1. Check metrics collection:
   aws autoscaling describe-auto-scaling-groups \
     --query '*.EnabledMetrics'
     
2. If empty: Enable metrics:
   aws autoscaling enable-metrics-collection \
     --auto-scaling-group-name alawael-green-asg \
     --granularity "1Minute"
     
3. Wait 2-3 minutes for metrics to appear
4. Retry scaling policy trigger
```

### 🛡️ Prevention

1. **Regular testing:**
   - Monthly load test to verify scaling works
   - Check new instances become available
   - Verify metrics drop after scaling

2. **Alerting:**
   - Alert if no scaling for 10+ min during high CPU
   - Alert if ASG at max capacity

3. **Documentation:**
   - Keep scaling policy updated
   - Test after any policy changes
   - Document expected behavior each quarter

---

## 🎯 Quick Reference: Which Playbook to Use

| Symptom | Playbook |
|---------|----------|
| Site feels slow | Playbook 1: High Response Time |
| Getting 500 errors | Playbook 2: High Error Rate |
| "Connection pool exhausted" error | Playbook 3: Connection Pool |
| Reading stale data | Playbook 4: Replication Lag |
| Server running out of memory | Playbook 5: Memory Pressure |
| Traffic high but no scaling | Playbook 6: Auto-Scaling Not Triggering |

---

## 📞 When to Escalate

| Issue | Level 1 (On-Call) | Level 2 (Lead) | Level 3 (CTO) |
|-------|-------------------|---|---|
| P99 > 500ms (< 5 min) | Fix | - | - |
| Error rate > 1% | Fix | Notify if can't resolve | - |
| Connection pool > 150 | Fix | - | - |
| Replication lag > 5s | Investigate | Escalate if > 30s | - |
| Memory > 90% | Restart | - | - |
| Scaling not working | Fix | Escalate if can't fix | Major incident |
| Data loss suspected | Notify immediately | Immediate | Immediate |

---

**Last Updated:** February 22, 2026  
**Status:** ✅ Ready for use in production operations
