# MONITORING DASHBOARD SETUP GUIDE
# ALAWAEL ERP Production Environment
# Complete Setup for Prometheus + Grafana or DataDog
# Version: 1.0.0 | Date: February 28, 2026

---

## TABLE OF CONTENTS
1. [Option 1: Prometheus + Grafana (Open Source)](#option-1-prometheus--grafana)
2. [Option 2: DataDog (Enterprise)](#option-2-datadog)
3. [Option 3: New Relic (Enterprise)](#option-3-new-relic)
4. [Alert Rules & Thresholds](#alert-rules--thresholds)
5. [Dashboard Templates](#dashboard-templates)
6. [Integration Steps](#integration-steps)

---

## OPTION 1: PROMETHEUS + GRAFANA

### Step 1: Install Prometheus

**Windows Installation:**
```powershell
# Download Prometheus
$version = "2.50.0"
$url = "https://github.com/prometheus/prometheus/releases/download/v$version/prometheus-$version.windows-amd64.zip"
Invoke-WebRequest -Uri $url -OutFile prometheus-$version.zip

# Extract and setup
Expand-Archive prometheus-$version.zip
cd prometheus-$version.windows-amd64

# Create data directory
mkdir -Force data

# Start Prometheus
.\prometheus.exe --config.file=prometheus.yml --storage.tsdb.path=data
```

**Linux/macOS Installation:**
```bash
# Using package manager
# Ubuntu/Debian
sudo apt-get install prometheus-node-exporter

# macOS
brew install prometheus
```

### Step 2: Configure Prometheus (prometheus.yml)

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'alawael-prod'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - localhost:9093

# Load rules once and periodically evaluate them
rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node Exporter (system metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  # PM2 Metrics (application)
  - job_name: 'alawael-backend'
    scrape_interval: 5s
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'

  # MongoDB Exporter
  - job_name: 'mongodb'
    static_configs:
      - targets: ['localhost:9216']

  # Windows Exporter (if on Windows)
  - job_name: 'windows'
    static_configs:
      - targets: ['localhost:9182']
```

### Step 3: Install Grafana

**Windows:**
```powershell
# Download Grafana
$url = "https://grafana.com/grafana/download"
# Follow download link to get .zip

# Extract and run
cd grafana
.\bin\grafana-server.exe

# Access at http://localhost:3000
# Default: admin / admin
```

**Linux/macOS:**
```bash
brew install grafana
# or
sudo apt-get install grafana-server

# Start
sudo systemctl start grafana-server
```

### Step 4: Add Data Source to Grafana

1. Open Grafana (http://localhost:3000)
2. Login with admin/admin
3. Go to **Configuration → Data Sources**
4. Click **Add data source**
5. Select **Prometheus**
6. Set URL: `http://localhost:9090`
7. Click **Save & Test**

### Step 5: Import Dashboards

**Pre-built Dashboard IDs:**
- Node Exporter Metrics: `1860`
- Prometheus 2.0: `3662`
- PM2 Monitoring: `5629`
- MongoDB: `14379`

**Import Steps:**
1. Click **+** icon → **Import**
2. Enter dashboard ID
3. Select Prometheus as data source
4. Click **Import**

---

## OPTION 2: DATADOG

### Prerequisites
- DataDog account (https://www.datadoghq.com/)
- API key from DataDog

### Step 1: Install DataDog Agent

**Windows:**
```powershell
# Download DataDog Agent installer
$url = "https://s3.amazonaws.com/ddagent-windows/stable/mswin/ddagent.msi"
Invoke-WebRequest -Uri $url -OutFile ddagent.msi

# Install with API key
msiexec /i ddagent.msi API_KEY=<your_api_key>

# Verify installation
Get-Service DatadogAgent
Start-Service DatadogAgent
```

**Linux:**
```bash
# Install agent
DD_AGENT_MAJOR_VERSION=7 \
DD_API_KEY=<your_api_key> \
DD_SITE="datadoghq.com" \
bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_agent.sh)"

# Start agent
sudo systemctl restart datadog-agent
```

### Step 2: Configure DataDog Agent (datadog.yaml)

**Windows:** `C:\ProgramData\Datadog\datadog.yaml`  
**Linux:** `/etc/datadog-agent/datadog.yaml`

```yaml
# Datadog Configuration
api_key: <your_api_key>
site: datadoghq.com

# Logs collection
logs_enabled: true
logs_config:
  container_collect_all: true

# APM (Application Performance Monitoring)
apm_enabled: true
apm_config:
  enabled: true
  apm_non_local_traffic: true

# System metrics
system_probe_config:
  enabled: true

# Process monitoring
process_config:
  enabled: true

# Tags
tags:
  - env:production
  - service:alawael-backend
  - team:operations
```

### Step 3: Enable Integration

**MongoDB:**
```yaml
# /etc/datadog-agent/conf.d/mongo.d/conf.yaml
init_config:

instances:
  - server: mongodb://localhost:27017
    username: admin
    password: <password>
    database: alawael-erp
    additional_metrics:
      - replica_set
      - replication_lag
      - collection_metrics
```

**Application Logs:**
```yaml
# Log collection for Node.js
logs:
  - type: file
    path: /path/to/backend/logs/*.log
    service: alawael-backend
    source: nodejs
    tags:
      - env:production
```

### Step 4: Create DataDog Dashboard

1. Go to **Dashboards → New Dashboard**
2. Add widgets:
   - System metrics (CPU, Memory)
   - Application metrics (Response time, Throughput)
   - Error rate and logs
   - Database metrics
3. Save as "ALAWAEL ERP - Production"

### Step 5: Setup Alerts

1. Go to **Monitors → New Monitor**
2. Select **Metric Alert**
3. Configure:
   - Metric: `system.cpu.user`
   - Alert condition: `> 0.80` (80%)
   - Duration: `5m`
   - Notify: Email or Slack

---

## OPTION 3: NEW RELIC

### Step 1: Create New Relic Account
Visit: https://newrelic.com/signup

### Step 2: Install Node.js Agent

```bash
npm install newrelic

# At the very top of your app.js
require('newrelic');
// ... rest of requires
```

### Step 3: Configuration (newrelic.js)

```javascript
exports.config = {
  app_name: ['ALAWAEL ERP'],
  license_key: 'YOUR_LICENSE_KEY',
  logging: {
    level: 'info'
  },
  agent_enabled: true,

  // Monitor HTTP requests
  browser_monitoring: {
    enabled: true
  },

  // Custom metrics
  custom_insights_events: {
    enabled: true
  },

  // Error collection
  error_collector: {
    enabled: true
  },

  // Database monitoring
  slow_sql: {
    enabled: true,
    threshold: 500 // ms
  },

  // Transaction tracer
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    top_n: 20
  }
};
```

### Step 4: Deploy

```bash
# Run application with New Relic agent
# Linux/macOS
NEW_RELIC_LOG=stdout npm start

# Windows
set NEW_RELIC_LOG=stdout
npm start
```

### Step 5: View Application Performance

Access New Relic dashboard at: https://one.newrelic.com/

---

## ALERT RULES & THRESHOLDS

### Creating Alert Rules (Prometheus Format)

**File: alert_rules.yml**

```yaml
groups:
  - name: alawael_production
    interval: 30s
    rules:
      # CPU Alert
      - alert: HighCPUUsage
        expr: node_cpu_seconds_total > 0.8
        for: 5m
        labels:
          severity: warning
          service: alawael-backend
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ $value }}% on {{ $labels.instance }}"

      # Memory Alert
      - alert: HighMemoryUsage
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) > 0.85
        for: 5m
        labels:
          severity: critical
          service: alawael-backend
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value }}% on {{ $labels.instance }}"

      # Response Time Alert
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, http_request_duration_ms) > 500
        for: 2m
        labels:
          severity: warning
          service: alawael-backend
        annotations:
          summary: "Slow API response time"
          description: "P95 response time is {{ $value }}ms"

      # Error Rate Alert
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
          service: alawael-backend
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}"

      # Database Connection Alert
      - alert: DatabaseConnectionIssue
        expr: mongodb_connections <= 0
        for: 1m
        labels:
          severity: critical
          service: mongodb
        annotations:
          summary: "Database connection lost"
          description: "Cannot connect to MongoDB"

      # Disk Space Alert
      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.10
        for: 5m
        labels:
          severity: warning
          service: system
        annotations:
          summary: "Low disk space"
          description: "{{ $value }}% disk space remaining"

      # PM2 Process Down
      - alert: PM2ProcessDown
        expr: up{job="alawael-backend"} == 0
        for: 1m
        labels:
          severity: critical
          service: alawael-backend
        annotations:
          summary: "PM2 process is down"
          description: "Process is not responding"
```

---

## DASHBOARD TEMPLATES

### Grafana Dashboard JSON (Simplified)

```json
{
  "dashboard": {
    "title": "ALAWAEL ERP - Production",
    "tags": ["production", "alawael"],
    "timezone": "browser",
    "panels": [
      {
        "title": "API Response Time (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_ms)"
          }
        ],
        "fieldConfig": {
          "unit": "ms",
          "thresholds": {
            "steps": [
              {"color": "green", "value": 0},
              {"color": "yellow", "value": 100},
              {"color": "red", "value": 500}
            ]
          }
        }
      },
      {
        "title": "CPU Usage",
        "targets": [
          {"expr": "100 - (avg(node_cpu_seconds_total) * 100)"}
        ],
        "fieldConfig": {
          "unit": "percent",
          "thresholds": {
            "steps": [
              {"color": "green", "value": 0},
              {"color": "yellow", "value": 70},
              {"color": "red", "value": 85}
            ]
          }
        }
      },
      {
        "title": "Memory Usage",
        "targets": [
          {"expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"}
        ],
        "fieldConfig": {
          "unit": "percent",
          "thresholds": {
            "steps": [
              {"color": "green", "value": 0},
              {"color": "yellow", "value": 75},
              {"color": "red", "value": 90}
            ]
          }
        }
      },
      {
        "title": "Requests per Second",
        "targets": [
          {"expr": "rate(http_requests_total[1m])"}
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {"expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])"}
        ],
        "fieldConfig": {"unit": "percent"}
      },
      {
        "title": "MongoDB Connections",
        "targets": [
          {"expr": "mongodb_connections"}
        ]
      }
    ]
  }
}
```

---

## INTEGRATION STEPS

### Step 1: Choose Your Monitoring Solution

| Factor | Prometheus+Grafana | DataDog | New Relic |
|--------|---|---|---|
| **Cost** | Free | $0.10-0.30/host/month | $50-200/month |
| **Setup Time** | 30 min | 10 min | 5 min |
| **Learning Curve** | Medium | Easy | Easy |
| **Features** | Comprehensive | All-in-one | APM-focused |
| **Recommendation** | Best for cost-conscious | Best for enterprises | Best for APM |

### Step 2: Install Chosen Solution

See detailed installation steps above for each option.

### Step 3: Configure Alerting

1. Define alert thresholds (see Alert Rules section)
2. Setup notification channels:
   - Email
   - Slack
   - PagerDuty
3. Test alerts (artificially trigger one alert)

### Step 4: Create Dashboards

1. Import pre-built dashboards
2. Customize with company branding
3. Add custom metrics specific to ALAWAEL
4. Set dashboard as default/homepage

### Step 5: Verify Integration

```bash
# Check if metrics are being collected
curl http://localhost:9090/api/v1/query?query=up

# Expected response: All targets should show 1 (up)
```

### Step 6: Team Training

Ensure team knows:
- How to access dashboard
- How to interpret key metrics
- How to acknowledge and respond to alerts
- Escalation procedures

---

## MONITORING METRICS TO TRACK

### Application Metrics
- Request rate (req/sec)
- Response time (P50, P95, P99)
- Error rate (% of 5xx responses)
- Active connections
- Queue depth

### Infrastructure Metrics
- CPU usage (per instance)
- Memory usage (per instance)
- Disk I/O
- Network I/O
- Disk space remaining

### Database Metrics
- Connection count
- Query execution time
- Replication lag (if applicable)
- Index fragmentation
- Lock wait time

### Business Metrics
- Active users
- Transaction count
- Revenue
- API key usage

---

## TROUBLESHOOTING

### Prometheus Metrics Not Appearing
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Look for errors in status

# Restart Prometheus with debug logging
prometheus --log.level=debug
```

### Grafana Dashboard Empty
1. Verify data source connection
2. Check time range selector
3. Verify PromQL query syntax
4. Check data is actually being collected

### DataDog Agent Not Sending Data
```powershell
# Check agent status
Get-Service DatadogAgent | Select Status

# View agent logs
Get-Content "C:\ProgramData\Datadog\Logs\agent.log" -Tail 50

# Restart agent
Restart-Service DatadogAgent
```

---

## NEXT STEPS

1. **This Week:** Deploy chosen monitoring solution (1-2 hours)
2. **Next Week:** Fine-tune alert thresholds based on baseline
3. **Month 2:** Add advanced monitoring (custom metrics, traces)
4. **Month 3:** Implement automated remediation (auto-scale, restarts)

---

*Last Updated: February 28, 2026*
