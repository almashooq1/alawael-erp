# 💰 COST OPTIMIZATION GUIDE

**Purpose**: Reduce cloud infrastructure and operational expenses  
**Target Audience**: DevOps, Finance, Product managers  
**Last Updated**: January 29, 2026  
**Estimated Savings**: 40-60% from baseline

---

## 💡 Cost Overview

### Current Cost Baseline (Monthly)

```
Infrastructure Costs (Estimated for Standard Deployment):
├── Compute (Kubernetes nodes)        $3,000
├── Database (PostgreSQL)             $1,200
├── Cache (Redis)                     $400
├── Storage                           $500
├── Networking (bandwidth/CDN)        $800
├── Monitoring (Prometheus/Grafana)   $300
├── Logging (ELK/CloudWatch)          $600
├── SSL Certificates                  $100
├── DNS                               $50
└── Total Current                     $7,350/month

Potential Savings Opportunities:
├── Right-sizing resources            -$1,500 (20%)
├── Reserved instances                -$1,100 (15%)
├── Spot instances                    -$800 (11%)
├── Query optimization                -$200 (3%)
├── Network optimization              -$150 (2%)
└── Total Potential Savings           -$3,750/month (51%)

New Projected Cost: ~$3,600/month
```

---

## 🔧 Compute Optimization

### Right-Sizing

```bash
# [ ] Analyze current resource usage
kubectl top nodes --all-namespaces
kubectl top pods -n production

# [ ] Check resource utilization vs requests/limits
kubectl get pods -n production -o custom-columns=NAME:.metadata.name,\
REQUEST_CPU:.spec.containers[0].resources.requests.cpu,\
LIMIT_CPU:.spec.containers[0].resources.limits.cpu,\
REQUEST_MEM:.spec.containers[0].resources.requests.memory,\
LIMIT_MEM:.spec.containers[0].resources.limits.memory

# [ ] Identify over-provisioned pods
# If actual usage < 30% of request, reduce request by 50%

# Example optimization: Backend deployment
# Before:
requests:
  cpu: 2000m      # 2 full CPU cores
  memory: 2Gi     # 2 GB RAM
limits:
  cpu: 4000m      # 4 cores
  memory: 4Gi     # 4 GB

# After (based on monitoring):
requests:
  cpu: 500m       # 50% of CPU is typically free
  memory: 512Mi   # 50% of memory is typically free
limits:
  cpu: 1000m
  memory: 1Gi

# Estimated savings: 75% CPU, 75% Memory = $2,250/month

# [ ] Verify performance after resize
# Monitor: Response times, error rates, pod evictions
for i in {1..5}; do
  kubectl get pods -n production
  sleep 10
done
```

### Instance Type Selection

```bash
# [ ] Use appropriate instance types
# Current: General purpose (compute-optimized for all)
# Optimized:

# Memory-optimized: Database nodes
# CPU-optimized: AI/ML computation nodes
# General-purpose: Frontend/API nodes
# Storage-optimized: Cache/logging nodes

# Example: AWS EC2 instance comparison
Standard (t3.xlarge)          $0.1664/hour = $120/month
Memory-optimized (r5.large)  $0.126/hour = $92/month
CPU-optimized (c5.large)     $0.085/hour = $62/month

# Cost savings: 48% by choosing right instance type

# [ ] Update Kubernetes node pool config
# GKE example:
gcloud container node-pools update default-pool \
  --cluster=intelligent-agent \
  --machine-type=n1-standard-2 \
  --zone=us-central1-a

# AWS EKS example:
aws eks update-nodegroup-config \
  --cluster-name intelligent-agent \
  --nodegroup-name default \
  --scaling-config desiredSize=3,minSize=2,maxSize=5
```

### Reserved Instances

```bash
# [ ] Calculate 1-year commitment savings
# On-demand (hourly): $0.10/hour = $73/month
# 1-year reserved: $42/month = 42% savings

# Example calculation for 3-node cluster:
On-demand:    3 nodes × $73 = $219/month
1-year reserved: 3 nodes × $42 = $126/month
Annual savings: ($219 - $126) × 12 = $1,116/year

# [ ] Purchase reserved instances
# AWS:
aws ec2 purchase-reserved-instances \
  --reserved-instances-offering-id a1234-1234-1234-1234-1234 \
  --instance-count 3 \
  --payment-option ALL_UPFRONT

# GCP:
gcloud compute commitments create intelligent-agent-commit \
  --plan=one-year \
  --resources=cpus:8,memory:32 \
  --region=us-central1

# [ ] Monitor reserved instance utilization
# Target: > 80% utilization
```

### Spot Instances

```bash
# [ ] Use spot instances for fault-tolerant workloads
# Spot price: 70% cheaper than on-demand
# Trade-off: Can be interrupted with 2-min notice

# Suitable for:
✓ Batch AI training (ML training jobs)
✓ Data processing
✓ CI/CD runners
✗ Not suitable for: Interactive APIs, real-time requirements

# [ ] Configure Kubernetes to use spot instances
# Node affinity:
affinity:
  nodeAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      preference:
        matchExpressions:
        - key: cloud.google.com/gke-preemptible
          operator: In
          values: ["true"]

# [ ] Set up pod disruption budgets
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ai-training-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      workload: ai-training

# Estimated savings: 70% for training workloads
# If 30% of compute is training: 30% × 70% = 21% total savings
```

### Horizontal Pod Autoscaling

```bash
# [ ] Configure HPA based on metrics
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: intelligent-agent-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30

# [ ] Monitor scaling events
kubectl get hpa intelligent-agent-backend -w

# [ ] Reduce minimum replicas during off-peak
# Off-peak: 1 replica (with PDB allowing 0 disruptions)
# Peak: 10 replicas

# Estimated savings: 30-40% during off-peak hours
# If 40% of time is off-peak: 40% × 40% = 16% savings
```

---

## 🗄️ Database Optimization

### Query Optimization

```sql
-- [ ] Eliminate inefficient queries
-- Savings: $50-200/month per optimized query

-- Before: N+1 queries
SELECT * FROM projects WHERE user_id = 1;
-- Then loop: SELECT COUNT(*) FROM datasets WHERE project_id = ?;
-- Total queries: 1 + N

-- After: Single query with JOIN
SELECT p.id, p.name, COUNT(d.id) as dataset_count
FROM projects p
LEFT JOIN datasets d ON p.id = d.project_id
WHERE p.user_id = 1
GROUP BY p.id;
-- Total queries: 1

-- [ ] Use pagination to reduce result sets
-- Before: 10,000 rows returned
SELECT * FROM logs;

-- After: Return only requested page
SELECT * FROM logs LIMIT 20 OFFSET 0;

-- [ ] Identify expensive queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 5;

-- Cost impact: Queries taking > 1 second on frequently executed paths
```

### Connection Pool Optimization

```bash
# [ ] Reduce connection pool size
# Default: Often 100+ connections, many idle

# Optimized: Based on actual load
# Formula: (core_count × 2) + effective_spindle_count + margin
# Example: 8 cores = (8 × 2) + 1 + 5 = 22 connections

# [ ] Configure connection pool settings
# pgbouncer.ini
[pgbouncer]
pool_mode = transaction  # Switch connection per query
max_db_connections = 50  # Total backend connections
default_pool_size = 5    # Per-client pool size
min_pool_size = 2

# [ ] Monitor connection efficiency
SHOW STATS;  # Avg wait time should be < 10ms

# Estimated savings: 30-50% database CPU
```

### Compression

```sql
-- [ ] Enable table compression
ALTER TABLE large_table SET (fillfactor = 70);
CLUSTER large_table USING large_table_index;
VACUUM FULL large_table;

-- [ ] Compress archived data
-- Move old logs to separate compressed table
CREATE TABLE logs_archive AS
SELECT * FROM logs WHERE created_at < NOW() - INTERVAL '90 days';

-- Drop from main table (saves space)
DELETE FROM logs WHERE created_at < NOW() - INTERVAL '90 days';

-- VACUUM to reclaim space
VACUUM FULL logs;

-- Estimated savings: 20-30% storage costs
```

### Automated Backups Optimization

```bash
# [ ] Implement incremental backups
# Daily: Full backup
# Mon-Fri: Incremental (only changes)
# Sun: Retention cleanup (delete backups > 30 days)

# [ ] Use backup compression
pg_dump intelligent_agent | gzip > backup.sql.gz
# Compression ratio: 80-90% reduction

# [ ] Implement WAL archiving
# Store only 7 days locally, archive older to S3 Glacier
# S3 Standard: $0.023/GB
# S3 Glacier: $0.004/GB
# Savings: 83% for 30-day retention

# [ ] Configure retention policies
# Hot backups (7 days): Standard
# Warm backups (30 days): Standard-IA
# Cold backups (1 year): Glacier

# Estimated savings: 40-60% backup storage costs
```

---

## 💾 Storage Optimization

### Data Management

```bash
# [ ] Identify large tables
SELECT
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

# [ ] Archive old data
-- Move data > 1 year to archive table/storage
SELECT * INTO logs_2024 FROM logs WHERE created_at < '2025-01-01';
DELETE FROM logs WHERE created_at < '2025-01-01';

# [ ] Implement data retention policies
-- Automatic cleanup script
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
DELETE FROM session_logs WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM failed_jobs WHERE created_at < NOW() - INTERVAL '7 days';

# [ ] Monitor storage growth
# Daily: track disk usage
df -h /data
# Trend: Should be < 70% growth/month

# Estimated savings: 30-50% storage costs
```

### Block Storage

```bash
# [ ] Right-size storage volumes
# Current: Often provisioned with excess capacity

# Optimal: 80% used, 20% free space
# If storage is 30% used: Can reduce by 50%

# Example: AWS EBS
# Before: 500GB gp3 volume @ $0.10/GB/month = $50/month
# After: 200GB gp3 volume @ $0.10/GB/month = $20/month
# Savings: $30/month

# [ ] Use appropriate storage tiers
# PostgreSQL: gp3 (general purpose SSD)
# Backups: Standard (not high-IOPS)
# Logs: Cold storage/Glacier (infrequent access)

# [ ] Enable compression in storage
# ZFS or similar file systems: 2-4x compression ratio
```

---

## 🌐 Networking Optimization

### Bandwidth Optimization

```bash
# [ ] Reduce data transfer (most expensive network operation)
# Data transfer: $0.02-0.12 per GB

# [ ] Compress responses
app.use(compression({ level: 9 }));  // gzip compression
# Typical compression: 70-80% reduction
# If 100GB/month outbound: $2,400 cost → $480 (80% savings) = $1,920 saved

# [ ] Use CDN for static assets
# Direct: 100GB × $0.10/GB = $10,000/month
# CDN: 100GB × $0.02/GB = $2,000/month
# Savings: $8,000/month

# [ ] Implement API response filtering
# Before: Return all fields (500KB response)
# After: Return selected fields (50KB response)
# 10x reduction in bandwidth

# [ ] Enable HTTP Keep-Alive
Connection: keep-alive

# [ ] Use gRPC for internal services (2-7x smaller payloads)
```

### CDN Configuration

```bash
# [ ] Set up CDN edge locations strategically
# Cover: US, Europe, Asia, Australia

# [ ] Configure cache headers
# Static assets: 1 year cache
Cache-Control: public, max-age=31536000, immutable

# Images: 30 days
Cache-Control: public, max-age=2592000

# API: No cache for user-specific
Cache-Control: private, no-cache

# Estimated savings: 50-70% bandwidth costs
```

### Network Architecture

```bash
# [ ] Keep data transfer internal (no egress charges)
# All inter-service communication: VPC internal
# Only external: User ↔ API (via CDN if possible)

# [ ] Use VPC endpoints instead of NAT gateways
# NAT Gateway: $0.32/hour + $0.06/GB = ~$235/month
# VPC Endpoint: $0.01/hour = ~$7/month
# Savings: $228/month

# [ ] Consolidate on single region
# Multi-region: N × costs
# Single-region + CDN for static: 40% cheaper
```

---

## 🚀 Service-Level Optimization

### Monitoring & Logging

```bash
# [ ] Reduce monitoring costs
# Current: Store all metrics forever
# Optimized: 15-day retention (real-time), archive older

# [ ] Configure metric sampling
# Sample 10% of requests instead of 100%
# Still get representative data, 90% cost reduction

# [ ] Use cheaper logging solutions
# Premium: $50/month
# Basic (CloudWatch, Stackdriver): $5/month
# Savings: $45/month

# [ ] Aggregate logs by retention tier
# Hot (7 days): Real-time search
# Warm (30 days): Indexed, slower search
# Cold (1 year): Archived, manual recovery only

# Example: Prometheus costs
# High cardinality metrics: Expensive
# Solution: Limit label combinations, use downsampling

# Prometheus config:
global:
  scrape_interval: 60s  # Increase from 15s
  external_labels:
    cluster: production

# Retention: 15 days (not forever)
storage:
  retention: 15d
  maxChunkAge: 2h

# Estimated savings: 60-80% monitoring costs
```

### Auto-Scaling Tuning

```bash
# [ ] Adjust scale-up/down thresholds
# Current: Scale up at 60% CPU, down at 30%
# Optimized: Scale up at 70% CPU, down at 20%
# Less frequent scaling = lower costs

# [ ] Increase scale-down stability window
# 5 min window: Prevents rapid scaling
# Result: Smoother resource usage

# [ ] Use time-based scaling for predictable patterns
apiVersion: autoscaling/v1
kind: ScheduledAction
metadata:
  name: scale-down-night
spec:
  schedule: "0 22 * * *"  # 10 PM daily
  scalingPolicy:
    min: 1  # Scale to 1 replica
    max: 3

# Estimated savings: 20-30% compute during off-peak hours
```

---

## 📊 Cost Monitoring & Governance

### Set Up Cost Tracking

```bash
# [ ] Enable cost allocation tags
# All resources tagged with:
tags:
  Environment: production
  Team: engineering
  CostCenter: AI-Platform
  Project: intelligent-agent

# [ ] Monitor costs daily
# AWS Cost Explorer
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-01-31 \
  --granularity MONTHLY \
  --metrics "UnblendedCost"

# GCP BigQuery
SELECT
  service.description as Service,
  SUM(cost) as Total_Cost
FROM `project.billing_dataset.gcp_billing_export_v1`
GROUP BY service.description
ORDER BY Total_Cost DESC;
```

### Set Budget Alerts

```bash
# [ ] Configure cost alerts
# AWS Budgets
aws budgets create-budget \
  --account-id 123456789 \
  --budget '{
    "BudgetName": "Monthly-Limit",
    "BudgetLimit": {"Amount": "5000", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {"NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN", "Threshold": 80},
    "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "team@example.com"}]
  }]'

# [ ] Set up weekly cost reports
# Automated weekly email with:
- Top 10 cost categories
- Week-over-week changes
- Budget vs. actual
- Forecast for month
```

### Optimization Impact Tracking

```bash
# [ ] Before optimization baseline
January 2026: $7,350/month

# [ ] Track optimization impact
February 2026: $5,800  (-21%)
- Right-sizing: -$1,500
- Reserved instances: -$450
- Query optimization: -$200
- Network optimization: -$150

March 2026: $4,200  (-42% vs baseline)
- Added spot instances: -$800
- Improved caching: -$300
- Storage cleanup: -$100

# [ ] Document for finance/stakeholders
Total annual savings: $38,400 (42% reduction)
```

---

## 💳 Financial Summary

### Cost Optimization Roadmap

| Phase     | Optimization                        | Estimated Savings | Timeline    |
| --------- | ----------------------------------- | ----------------- | ----------- |
| Phase 1   | Right-sizing, Reserved instances    | $1,600/month      | Week 1-2    |
| Phase 2   | Query optimization, Spot instances  | $1,000/month      | Week 3-4    |
| Phase 3   | CDN, Network optimization           | $800/month        | Week 5-6    |
| Phase 4   | Storage archival, Monitoring tuning | $500/month        | Week 7-8    |
| **Total** | **All optimizations**               | **$3,900/month**  | **8 weeks** |

### Payoff Analysis

```
Current monthly spend: $7,350
New monthly spend:    $3,450
Monthly savings:      $3,900 (53%)
Annual savings:       $46,800

Implementation cost: $20,000 (one-time)
Payoff period: 5 months
Year 1 savings: $26,800 (after implementation cost)
Year 2+ savings: $46,800/year
```

---

## ✅ Cost Optimization Checklist

**Compute**

- [ ] Resource utilization analyzed
- [ ] Pod requests/limits right-sized
- [ ] Reserved instances purchased
- [ ] Spot instances for batch workloads
- [ ] HPA configured

**Database**

- [ ] Query performance optimized
- [ ] Connection pool tuned
- [ ] Compression enabled
- [ ] Backup retention policies

**Storage**

- [ ] Large tables identified
- [ ] Old data archived
- [ ] Retention policies automated
- [ ] Storage tiers configured

**Networking**

- [ ] CDN deployed
- [ ] Bandwidth compression enabled
- [ ] Regional architecture optimized
- [ ] Data transfer minimized

**Monitoring**

- [ ] Metric retention reduced
- [ ] Log retention tiers configured
- [ ] Cost tracking enabled
- [ ] Budget alerts configured

**Finance**

- [ ] Baseline documented
- [ ] Monthly tracking started
- [ ] Savings calculated
- [ ] ROI documented

---

## 📈 Success Metrics

| Metric       | Target | Current | Status         |
| ------------ | ------ | ------- | -------------- |
| Monthly Cost | $3,600 | $7,350  | 🚀 In Progress |
| Cost/User    | $1.20  | $2.50   | 🚀 In Progress |
| Cost/Request | $0.001 | $0.002  | 🚀 In Progress |

---

**Questions?** Contact Finance/DevOps  
**Last Review**: January 29, 2026  
**Next Review**: February 28, 2026
