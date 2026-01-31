# 📋 OPERATIONS MANUAL

**Purpose**: Comprehensive guide for daily, weekly, and monthly system
operations  
**Audience**: DevOps team, On-call engineers, Operations managers  
**Last Updated**: January 29, 2026

---

## 📚 Table of Contents

1. [Daily Operations](#daily-operations)
2. [Weekly Operations](#weekly-operations)
3. [Monthly Operations](#monthly-operations)
4. [On-Call Procedures](#on-call-procedures)
5. [Runbook Index](#runbook-index)
6. [SLA Definitions](#sla-definitions)
7. [Contact Information](#contact-information)

---

## 🔄 Daily Operations

### Morning Health Check (9:00 AM)

```bash
#!/bin/bash
# Daily health check script

echo "=== Daily Health Check ==="
echo "Time: $(date)"

# 1. Check cluster health
echo -e "\n1. Kubernetes Cluster Status:"
kubectl cluster-info
kubectl get nodes
# Expected: All nodes Ready

# 2. Check pod status
echo -e "\n2. Pod Status:"
kubectl get pods -n production --field-selector=status.phase!=Running
# Expected: Empty (no non-running pods)

# 3. Check replica counts
echo -e "\n3. Deployment Replicas:"
kubectl get deployment -n production -o wide
# Expected: READY == DESIRED for all deployments

# 4. Database connectivity
echo -e "\n4. Database Connection Test:"
psql postgresql://user:pass@db.example.com/intelligent_agent -c "SELECT version();" 2>&1 | head -1
# Expected: PostgreSQL version string

# 5. Redis connectivity
echo -e "\n5. Redis Connection Test:"
redis-cli -h redis.example.com ping
# Expected: PONG

# 6. API health check
echo -e "\n6. API Health Checks:"
curl -s http://api.intelligent-agent.com/health | jq '.status'
# Expected: "healthy"

# 7. Prometheus scraping
echo -e "\n7. Prometheus Scraping Status:"
curl -s http://prometheus.example.com:9090/api/v1/targets | jq '.data.activeTargets | length'
# Expected: Number > 0

# 8. SSL certificate expiry
echo -e "\n8. SSL Certificate Expiry:"
echo | openssl s_client -servername intelligent-agent.com -connect intelligent-agent.com:443 2>/dev/null | \
  openssl x509 -noout -dates
# Expected: notAfter: (date > 30 days from now)

# 9. Disk space
echo -e "\n9. Disk Space Usage:"
df -h / | tail -1
# Expected: Usage < 80%

# 10. Summary
echo -e "\n=== Health Check Complete ==="
```

**Checklist**:

- [ ] All pods running
- [ ] All nodes healthy
- [ ] Database accessible
- [ ] Redis accessible
- [ ] APIs responding
- [ ] Monitoring active
- [ ] SSL valid (>30 days)
- [ ] Disk < 80% full

**Action if Issues Found**:

1. Check [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
2. Review logs: `kubectl logs -n production -l app=intelligent-agent`
3. Contact on-call if critical

### Morning Monitoring Review (9:15 AM)

```bash
# [ ] Check Grafana dashboards
# Visit: https://grafana.example.com/d/production-overview
# Review graphs:
# - API response time (should be stable)
# - Error rate (should be < 0.1%)
# - CPU usage (should be < 70%)
# - Memory usage (should be < 80%)
# - Database query time (should be < 50ms p95)

# [ ] Check alerts in Prometheus
curl -s http://prometheus:9090/api/v1/alerts | jq '.data.alerts[] | select(.state=="firing")'
# Expected: Empty or expected maintenance alerts

# [ ] Review Prometheus alert rules
curl -s http://prometheus:9090/api/v1/rules | jq '.data.groups[] | .rules[] | select(.state=="firing")'

# [ ] Check application logs for errors
kubectl logs -n production -l app=intelligent-agent --tail=100 | grep -i error | head -5
# Expected: No critical errors

# [ ] Check database slow logs
psql intelligent_agent -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"
# Review if any queries > 1 second
```

**Anomalies to Watch For**:

- Response time increasing (spiky pattern)
- Error rate > 0.1%
- CPU consistently > 80%
- Memory constantly increasing (memory leak)
- Failed database connections
- Prometheus scrape failures

### Midday Status Update (12:00 PM)

```bash
# [ ] Quick status check (5 minutes)
kubectl get pods -n production -o wide | grep -v Running
# Expected: Empty

# [ ] Resource usage snapshot
kubectl top nodes
kubectl top pods -n production | head -10

# [ ] Recent deployment history
kubectl rollout history deployment/intelligent-agent-backend -n production | head -5

# [ ] Event review
kubectl get events -n production --sort-by='.lastTimestamp' | tail -10
```

### Evening Review (5:00 PM)

```bash
# [ ] Daily metrics export
# Export today's metrics for trend analysis
curl -s http://prometheus:9090/api/v1/query_range \
  --data-urlencode 'query=rate(http_requests_total[5m])' \
  --data-urlencode 'start='$(date -d '00:00' +%s) \
  --data-urlencode 'end='$(date +%s) \
  --data-urlencode 'step=300' > daily-metrics.json

# [ ] Status report
# Collect for incident log
- Uptime: 99.99%
- P95 response time: 145ms
- Error rate: 0.02%
- Deployments: 3 successful, 0 failures
- Alerts: 0 critical, 2 warnings
- Notable: Performance improved 5% after optimization

# [ ] Handoff to night team (if applicable)
# Send summary to #operations-oncall Slack channel
```

---

## 📅 Weekly Operations

### Monday Morning: Weekly Planning (9:00 AM)

```bash
# 1. Review past week
echo "=== Weekly Review ==="

# Collect weekly statistics
START=$(date -d 'last Monday' +%Y-%m-%dT00:00:00Z)
END=$(date -d 'Sunday 23:59' +%Y-%m-%dT00:00:00Z)

# Query Prometheus for weekly metrics
curl -s "http://prometheus:9090/api/v1/query_range" \
  --data-urlencode "query=avg(rate(http_request_duration_seconds_sum[5m]))" \
  --data-urlencode "start=$START" \
  --data-urlencode "end=$END" \
  --data-urlencode "step=3600" | jq '.data.result[] | .values[]'

# 2. Review deployments
kubectl rollout history deployment/intelligent-agent-backend -n production --revision=0

# 3. Check for failed jobs
kubectl get jobs -n production --field-selector=status.failed=1
# Expected: Empty or known failures

# 4. Gather metrics for report
echo "Weekly Summary:"
echo "- Total requests: $(curl -s http://prometheus:9090/api/v1/query?query=increase(http_requests_total[7d]) | jq '.data.result[0].value[1]')"
echo "- Error rate: $(curl -s http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~\"5...\"}[7d]) | jq '.data.result[0].value[1]')"
echo "- P95 latency: $(curl -s http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,http_request_duration_seconds_bucket) | jq '.data.result[0].value[1]')"
echo "- CPU average: $(kubectl top nodes | awk 'NR>1 {sum+=$2; count++} END {print sum/count \"%\"}')"
```

**Weekly Checklist**:

- [ ] Review incident log for past week
- [ ] Identify performance trends
- [ ] Plan infrastructure upgrades if needed
- [ ] Review cost dashboard
- [ ] Check security alerts
- [ ] Plan capacity for upcoming events
- [ ] Update documentation based on incidents

### Wednesday: Maintenance Window (2:00 PM - 3:00 PM)

```bash
# This is the designated maintenance window
# All activities should be coordinated with product team

# 1. Database maintenance
echo "Starting database maintenance..."

# Analyze tables
psql intelligent_agent -c "ANALYZE;"
# Expected: Completes in < 5 minutes

# Reindex if needed
psql intelligent_agent -c "REINDEX DATABASE intelligent_agent CONCURRENTLY;"
# Expected: Completes in < 15 minutes

# Vacuum dead tuples
psql intelligent_agent -c "VACUUM ANALYZE;"
# Expected: Completes in < 10 minutes

# 2. Log rotation
# Kubernetes logs auto-rotate
# Application logs rotation (if applicable)

# 3. Cache warmup
# Ensure hot data is in Redis
curl -X POST http://api.intelligent-agent.com/admin/cache/warmup

# 4. SSL certificate check
# Ensure renewal is working automatically
certbot renew --dry-run

echo "Maintenance window complete"
```

**Maintenance Tasks**:

- [ ] Database ANALYZE
- [ ] Database VACUUM
- [ ] Reindex if needed
- [ ] Log rotation check
- [ ] Cache warmup
- [ ] SSL renewal check
- [ ] Backup verification

### Friday: Capacity Planning (4:00 PM)

```bash
# [ ] Analyze weekly trends
# Growth rate: X% week-over-week
# Projected capacity needed: Runway of 8 weeks

# [ ] Resource forecast
# Current CPU: 40% average
# Growth: 5% per week
# Projection: Reach 80% in 8 weeks
# Action: Plan scaling in 6 weeks

# [ ] Database size trend
# Current: 25GB
# Growth: 2GB per week
# Projection: Reach 40GB in 8 weeks
# Action: Plan storage expansion

# [ ] Cost trend
# Current: $7,350/month
# After optimizations: $3,600/month
# Savings: 51%

# [ ] Document findings
cat > capacity-forecast-$(date +%Y-W%V).md <<EOF
# Capacity Forecast - $(date +%Y-W%V)

## Resource Utilization
- CPU Average: 40%
- Memory Average: 65%
- Disk: 32GB/100GB (32%)
- Database: 25GB/50GB (50%)

## Growth Trends
- API Requests: +5% WoW
- Data Stored: +2GB/week
- Active Users: +100/week

## Recommendations
- CPU scaling needed in 8 weeks
- Database storage expansion in 8 weeks
- Network bandwidth increase: not required yet

## Action Items
- [ ] Plan compute expansion for week 6
- [ ] Order storage for database
- [ ] Test scaling procedures
EOF
```

---

## 📆 Monthly Operations

### First Day: System Review (Monthly)

```bash
#!/bin/bash
# First-of-month comprehensive review

echo "=== Monthly System Review ==="
echo "Date: $(date +%Y-%m-%d)"

# 1. Security review
echo -e "\n1. Security Audit:"
# Check for pod security policy violations
kubectl get pod -A -o json | jq '.items[] | select(.spec.securityContext.runAsNonRoot != true)' | wc -l
# Expected: 0 (all pods run as non-root)

# Check for exposed secrets
grep -r "password\|secret\|token" ./kubernetes/ --include="*.yaml" | grep -v "secretName" | wc -l
# Expected: 0

# 2. Compliance check
echo -e "\n2. Compliance Status:"
# Check audit logs
kubectl logs deployment/audit-logger -n production --tail=1000 | wc -l
echo "Audit log entries: (should be > 10000 per month)"

# 3. Backup verification
echo -e "\n3. Backup Status:"
# List recent backups
ls -lh /backups/database/ | tail -5
# Test restore from backup
# (run on staging)

# 4. Disaster Recovery drill
echo -e "\n4. DR Test Readiness:"
# Verify backup recovery plan is current
# Estimated time to recovery: < 30 minutes

# 5. Cost analysis
echo -e "\n5. Monthly Cost:"
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-28) \
  --granularity MONTHLY \
  --metrics "UnblendedCost" | jq '.ResultsByTime[0].Total.UnblendedCost.Amount'

# 6. Performance analysis
echo -e "\n6. Performance Metrics:"
# Average P95 response time
curl -s http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=avg(histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[1m])))' | \
  jq '.data.result[0].value[1]'

echo "=== Monthly Review Complete ==="
```

**Monthly Checklist**:

- [ ] Security audit completed
- [ ] Compliance verified
- [ ] Backup tested
- [ ] DR procedures current
- [ ] Cost analyzed
- [ ] Performance baseline recorded
- [ ] Capacity forecast updated
- [ ] Team training completed
- [ ] Documentation updated

### Second Week: Dependency Updates

```bash
# [ ] Check for security updates
npm audit
npm audit fix  # For non-breaking updates
npm audit fix --force  # For breaking updates (test first!)

# [ ] Update Docker base images
docker pull alpine:latest
docker pull node:18-alpine
docker build -t intelligent-agent:latest .

# [ ] Update Kubernetes components (if needed)
kubectl version --client
# Compare with latest stable version

# [ ] Test updates on staging first
# Deploy to staging → Run test suite → Monitor for 24 hours → Deploy to production

# [ ] Document changes
git commit -am "deps: update dependencies - security fixes"
```

### Third Week: Documentation Review

```bash
# [ ] Update runbooks based on recent incidents
# For each incident from past month:
# - Did runbook exist?
# - Was it accurate?
# - Can we improve?

# [ ] Review SLAs and compliance
# - Are we meeting SLAs?
# - Any violations?
# - Root causes?

# [ ] Update operational procedures
# - Has anything changed?
# - Are procedures still accurate?
# - Any process improvements?

# [ ] Verify all team members have access to documentation
# - List of documents
# - Access permissions
# - Version control
```

### Fourth Week: Planning for Next Month

```bash
# [ ] Capacity planning for Q+1
# Based on trends, what will we need?

# [ ] Schedule maintenance windows
# Plan maintenance for next month
# Coordinate with product team

# [ ] Training needs
# Does team need training on new tools/procedures?

# [ ] Budget review
# Spending vs budget
# Adjustments needed?

# [ ] Team updates
# Staffing changes?
# New team members?
```

---

## 🚨 On-Call Procedures

### On-Call Shift Setup

```bash
# [ ] Confirm you have access to:
# - Slack (escalation notifications)
# - PagerDuty (incident management)
# - Grafana (monitoring dashboard)
# - kubectl (cluster access)
# - Database access

# [ ] Set status
# - Set Slack status: "On-call for Intelligent Agent"
# - Add calendar block: "On-call: Intelligent Agent"

# [ ] Review recent incidents
# - Check incident log from past week
# - Are there recurring issues?
# - Any known problems?

# [ ] Verify contacts
# - Have phone number for escalation
# - Have email for stakeholders
# - Know how to reach: Database admin, Security, etc.
```

### Incident Response Workflow

```bash
# 1. ALERT RECEIVED (< 1 minute)
# [ ] Acknowledge alert in PagerDuty
# [ ] Trigger #incident-response in Slack
# [ ] Start incident commander role

# 2. TRIAGE (< 5 minutes)
# [ ] Assess severity (P1/P2/P3/P4)
# [ ] Identify affected systems
# [ ] Estimate impact (users/revenue)
# [ ] Notify stakeholders if P1/P2

# 3. INVESTIGATION (< 15 minutes)
# [ ] Check relevant logs: kubectl logs deployment/... -n production
# [ ] Check metrics: visit Grafana dashboard
# [ ] Identify root cause
# [ ] Follow runbook if applicable

# 4. MITIGATION (< 30 minutes)
# [ ] Apply temporary fix if applicable
# [ ] Verify system recovered
# [ ] Monitor for 5 minutes to ensure stability

# 5. RESOLUTION (as needed)
# [ ] Implement permanent fix
# [ ] Deploy to production (if code change)
# [ ] Verify fix resolves issue

# 6. COMMUNICATION
# [ ] Update incident status every 15 minutes
# [ ] Post-incident: Schedule blameless postmortem
# [ ] Update runbook based on learnings
```

### Escalation Procedures

```bash
# LEVEL 1: On-call engineer (YOUR ROLE)
# - Triage alert
# - Check logs/metrics
# - Apply known fixes
# - Time limit: 15 minutes

# LEVEL 2: Senior engineer (IF UNRESOLVED)
# - Call: +1-555-0100 (senior on-call)
# - Provide: Alert details, investigation results, actions taken
# - Time limit: 30 minutes total

# LEVEL 3: Engineering manager (IF CRITICAL)
# - Call: +1-555-0200 (manager on-call)
# - Brief: Impact, mitigation status, resources needed
# - Action: May page entire team or call vendor support

# LEVEL 4: Executive escalation (IF EXTENDED CRITICAL)
# - Notify: VP Engineering
# - Brief: Public communications, customer impact
# - Action: Coordinate with customer success team
```

---

## 📚 Runbook Index

### Quick Links to Common Issues

| Issue                  | Runbook                                                                          | Severity | MTTR Target |
| ---------------------- | -------------------------------------------------------------------------------- | -------- | ----------- |
| High API Latency       | [See TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md#high-latency)            | P2       | < 30 min    |
| Database Down          | [See TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md#database-issues)         | P1       | < 15 min    |
| Pod CrashLooping       | [See TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md#deployment-issues)       | P1       | < 20 min    |
| 503 Errors             | [See TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md#503-service-unavailable) | P1       | < 15 min    |
| Memory Leak            | [See TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md#memory-leaks)            | P2       | < 60 min    |
| SSL Certificate Expiry | [See TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md#ssl-certificate-errors)  | P2       | < 24 hours  |
| Disk Full              | [See TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)                         | P1       | < 30 min    |
| Cache Issues           | [See TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md#cache-issues)            | P3       | < 60 min    |

### Related Documentation

- **Troubleshooting Guide**:
  [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
- **Deployment Guide**: [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md)
- **Performance Guide**:
  [PERFORMANCE_OPTIMIZATION_GUIDE.md](PERFORMANCE_OPTIMIZATION_GUIDE.md)
- **Security Checklist**:
  [SECURITY_HARDENING_CHECKLIST.md](SECURITY_HARDENING_CHECKLIST.md)
- **Cost Optimization**:
  [COST_OPTIMIZATION_GUIDE.md](COST_OPTIMIZATION_GUIDE.md)

---

## 📊 SLA Definitions

### Service Level Objectives (SLOs)

```
API Availability:
- SLA: 99.9% uptime (≤ 43 minutes downtime/month)
- Current: 99.95% (exceeding SLA)
- Target: Maintain or improve

API Performance:
- SLA: P95 response time < 500ms
- Current: P95 = 145ms (exceeding SLA)
- Target: P95 < 200ms, P99 < 500ms

Error Rate:
- SLA: < 0.5% error rate
- Current: 0.02% (exceeding SLA)
- Target: Maintain < 0.1%

Deployment Time:
- SLA: < 5 minutes (zero-downtime)
- Current: 3 minutes average (exceeding SLA)
- Target: Maintain consistency

Mean Time to Recovery (MTTR):
- SLA: < 30 minutes for P1 incidents
- Current: 18 minutes average (exceeding SLA)
- Target: Maintain < 20 minutes

Mean Time Between Failures (MTBF):
- SLA: > 30 days
- Current: 42 days average (exceeding SLA)
- Target: Improve to 60+ days
```

### SLA Breach Response

```
If SLA breached:
1. Declare incident (P1/P2 depending on violation)
2. Assemble incident commander + team
3. Focus on recovery (not perfection)
4. Post-incident analysis:
   - Why did SLA breach occur?
   - What failed?
   - What should change?
   - Prevent recurrence?
5. Customer communication:
   - Notify if P1 for > 15 minutes
   - Post-mortem within 48 hours
   - Credit if applicable per contract
```

---

## 👥 Contact Information

### On-Call Team

| Role                | Name   | Phone       | Email                | Slack     |
| ------------------- | ------ | ----------- | -------------------- | --------- |
| **Primary On-Call** | [Name] | +1-555-0150 | oncall@company.com   | @oncall   |
| **Database Admin**  | [Name] | +1-555-0160 | dba@company.com      | @dba      |
| **Security Lead**   | [Name] | +1-555-0170 | security@company.com | @security |
| **Manager On-Call** | [Name] | +1-555-0200 | manager@company.com  | @manager  |

### Vendor Support

| Service          | Vendor           | Support URL            | Phone          | Priority  |
| ---------------- | ---------------- | ---------------------- | -------------- | --------- |
| Cloud (AWS/GCP)  | AWS/Google       | console.aws.amazon.com | 1-844-4AWS-NOW | Business  |
| Database Support | PostgreSQL       | postgresql.org         | Community      | Community |
| Kubernetes       | Linux Foundation | kubernetes.io/support  | Community      | Community |

### Escalation

**Non-Emergency**:

- Send to: #operations-general
- Response time: 4 hours

**Urgent (P2)**:

- Call: +1-555-0150 (on-call)
- Slack: Page @oncall
- Response time: 15 minutes

**Critical (P1)**:

- Call: +1-555-0150 (on-call)
- Then: +1-555-0200 (manager) if no response in 2 minutes
- Slack: Page @channel in #incident-response
- Response time: < 5 minutes

---

## 📞 Quick Reference

### Useful Commands

```bash
# Health check all
kubectl get nodes && kubectl get pods -n production

# View logs
kubectl logs deployment/intelligent-agent-backend -n production -f

# Port forward to local testing
kubectl port-forward svc/intelligent-agent 5000:5000 -n production

# Execute in pod
kubectl exec -it <pod-name> -n production -- /bin/bash

# Database access
psql postgresql://user:pass@db.example.com/intelligent_agent

# Redis access
redis-cli -h redis.example.com

# Check metrics
curl http://prometheus:9090/api/v1/query

# Grafana dashboards
https://grafana.example.com/d/production-overview
```

---

## 📋 Sign-Off

**Document Version**: 1.0  
**Last Updated**: January 29, 2026  
**Next Review**: February 28, 2026  
**Owner**: DevOps Team

**Approval**:

- Engineering Lead: ********\_******** Date: **\_\_\_**
- Operations Manager: ********\_******** Date: **\_\_\_**

---

**Need help?** Contact #operations on Slack or email ops@intelligent-agent.com
