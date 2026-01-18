# 📊 MONITORING & DASHBOARD SETUP GUIDE

**System:** Alawael ERP - 5 Advanced Features  
**Created:** January 16, 2026  
**Purpose:** Production Monitoring & Real-time Dashboards

---

## 🎯 MONITORING ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                   ALAWAEL ERP MONITORING                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Backend    │    │   Frontend   │    │  Database    │  │
│  │   (Flask)    │    │  (Vue.js)    │    │  (MongoDB)   │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                    │          │
│         └───────────────────┼────────────────────┘          │
│                             │                               │
│                      ┌──────▼───────┐                       │
│                      │  Prometheus  │  (Metrics Collection) │
│                      └──────┬───────┘                       │
│                             │                               │
│          ┌──────────────────┼──────────────────┐            │
│          │                  │                  │            │
│     ┌────▼─────┐    ┌──────▼──────┐    ┌─────▼────┐       │
│     │  Grafana │    │  ELK Stack  │    │ AlertMgr │       │
│     │ Dashbrd  │    │(Logs/Search)│    │(Alerts)  │       │
│     └──────────┘    └─────────────┘    └──────────┘       │
│          │                  │                  │            │
│          └──────────────────┼──────────────────┘            │
│                             │                               │
│                      ┌──────▼───────┐                       │
│                      │  SLA/Metrics │                       │
│                      │   Dashboard  │                       │
│                      └──────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 PROMETHEUS SETUP

### 1. Installation

```bash
# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz

# Extract
tar xvfz prometheus-2.40.0.linux-amd64.tar.gz
cd prometheus-2.40.0.linux-amd64

# Copy configuration
cp prometheus.yml prometheus.yml.backup
```

### 2. Configuration (prometheus.yml)

```yaml
# Global settings
global:
  scrape_interval: 15s # Default scrape interval
  evaluation_interval: 15s # How often to evaluate rules
  external_labels:
    environment: 'production'
    system: 'alawael-erp'

# Alertmanager config
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - localhost:9093

# Load rules
rule_files:
  - 'alert_rules.yml'

# Scrape configs
scrape_configs:
  # Flask Backend
  - job_name: 'flask-backend'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
    scrape_interval: 15s

  # Database Metrics
  - job_name: 'mongodb'
    static_configs:
      - targets: ['localhost:27017']
    scrape_interval: 30s

  # Node Exporter (System metrics)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
    scrape_interval: 15s

  # Prometheus Self
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

### 3. Alert Rules (alert_rules.yml)

```yaml
groups:
  - name: alawael-alerts
    interval: 1m
    rules:
      # API Response Time Alert
      - alert: HighAPIResponseTime
        expr: rate(api_request_duration_seconds_sum[5m]) / rate(api_request_duration_seconds_count[5m]) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High API response time detected'
          description: 'API average response time > 1 second'

      # High Error Rate Alert
      - alert: HighErrorRate
        expr: rate(api_request_total{status="5xx"}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High API error rate'
          description: 'Error rate > 5%'

      # Database Connection Alert
      - alert: DatabaseConnectionFailed
        expr: mongodb_connection_successful == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Database connection failed'
          description: 'Cannot connect to MongoDB'

      # High Memory Usage Alert
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage'
          description: 'Memory usage > 85%'

      # High CPU Alert
      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High CPU usage'
          description: 'CPU usage > 80%'
```

### 4. Start Prometheus

```bash
# Run Prometheus
./prometheus --config.file=prometheus.yml

# Access at http://localhost:9090

# Verify metrics
curl http://localhost:5000/metrics
```

---

## 📊 GRAFANA DASHBOARDS

### 1. Installation

```bash
# Ubuntu/Debian
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
sudo apt-get update
sudo apt-get install grafana-server

# Start service
sudo systemctl start grafana-server
sudo systemctl enable grafana-server

# Access at http://localhost:3000
# Default: admin/admin
```

### 2. Dashboard 1: API Performance

```json
{
  "dashboard": {
    "title": "API Performance Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(api_request_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Response Time (95th percentile)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(api_request_duration_seconds_bucket[5m]))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(api_request_total{status=~\"5..\"}[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Active Connections",
        "targets": [
          {
            "expr": "api_active_connections"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

### 3. Dashboard 2: System Health

```json
{
  "dashboard": {
    "title": "System Health Dashboard",
    "panels": [
      {
        "title": "CPU Usage",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
          }
        ],
        "type": "gauge",
        "thresholds": [70, 85]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100"
          }
        ],
        "type": "gauge",
        "thresholds": [75, 90]
      },
      {
        "title": "Disk Usage",
        "targets": [
          {
            "expr": "100 - (node_filesystem_avail_bytes{fstype!=\"tmpfs\"} / node_filesystem_size_bytes * 100)"
          }
        ],
        "type": "gauge",
        "thresholds": [80, 95]
      },
      {
        "title": "Network I/O",
        "targets": [
          {
            "expr": "rate(node_network_transmit_bytes_total[5m])"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

### 4. Dashboard 3: Application Metrics

```json
{
  "dashboard": {
    "title": "Application Metrics",
    "panels": [
      {
        "title": "Predictions Generated",
        "targets": [
          {
            "expr": "increase(predictions_total[1h])"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Reports Generated",
        "targets": [
          {
            "expr": "increase(reports_total[1h])"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Notifications Sent",
        "targets": [
          {
            "expr": "increase(notifications_total[1h])"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Support Tickets",
        "targets": [
          {
            "expr": "support_tickets_open"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Database Query Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

---

## 🔔 ALERTMANAGER SETUP

### 1. Configuration (alertmanager.yml)

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  receiver: 'default-receiver'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h

  routes:
    - match:
        severity: critical
      receiver: 'critical-receiver'
      group_wait: 0s
      repeat_interval: 4h

    - match:
        severity: warning
      receiver: 'warning-receiver'
      group_wait: 30s

receivers:
  - name: 'default-receiver'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'

  - name: 'critical-receiver'
    slack_configs:
      - channel: '#critical-alerts'
        title: '🔴 CRITICAL: {{ .GroupLabels.alertname }}'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'

  - name: 'warning-receiver'
    slack_configs:
      - channel: '#warnings'
        title: '⚠️ WARNING: {{ .GroupLabels.alertname }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
```

### 2. Start Alertmanager

```bash
./alertmanager --config.file=alertmanager.yml
# Access at http://localhost:9093
```

---

## 📝 ELK STACK (Elasticsearch, Logstash, Kibana)

### 1. Docker Compose Setup

```yaml
version: '3'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.16.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - '9200:9200'
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:7.16.0
    ports:
      - '5601:5601'
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200

  logstash:
    image: docker.elastic.co/logstash/logstash:7.16.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - '5000:5000'
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200

volumes:
  elasticsearch-data:
```

### 2. Logstash Configuration (logstash.conf)

```
input {
  tcp {
    port => 5000
    codec => json
  }
  file {
    path => "/var/log/alawael/app.log"
    start_position => "beginning"
  }
}

filter {
  if [type] == "json" {
    json {
      source => "message"
    }
  }

  date {
    match => [ "timestamp", "ISO8601" ]
    target => "@timestamp"
  }

  grok {
    match => { "message" => "%{LOGLEVEL:level} \[%{DATA:component}\] %{GREEDYDATA:content}" }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "alawael-%{+YYYY.MM.dd}"
  }
  stdout {
    codec => rubydebug
  }
}
```

### 3. Access Kibana

```
http://localhost:5601

# Create index pattern: alawael-*
# Create dashboards for log analysis
```

---

## 🎯 KEY METRICS TO MONITOR

### Backend Metrics

```
# API Performance
api_request_total                      # Total requests
api_request_duration_seconds           # Request duration
api_request_errors_total               # Error count
api_active_connections                 # Active connections

# Database
db_query_duration_seconds              # Query duration
db_connection_pool_size                # Connection pool
db_connection_active                   # Active connections

# Business Logic
predictions_total                      # Predictions generated
reports_total                          # Reports generated
notifications_total                    # Notifications sent
support_tickets_open                   # Open tickets

# System
process_cpu_seconds_total              # CPU time
process_resident_memory_bytes          # Memory usage
process_virtual_memory_bytes           # Virtual memory
```

### Frontend Metrics

```
# Performance
page_load_time_seconds                 # Page load time
component_render_time_seconds          # Component render time
api_call_duration_seconds              # API call latency

# User Interactions
button_clicks_total                    # Click count
form_submissions_total                 # Form submissions
modal_open_count                       # Modal opens

# Errors
javascript_errors_total                # JS errors
api_errors_total                       # API errors
component_errors_total                 # Component errors
```

---

## 🔍 MONITORING BEST PRACTICES

### 1. Alert Thresholds

```
API Response Time:
  - Warning: > 500ms
  - Critical: > 1000ms

Error Rate:
  - Warning: > 1%
  - Critical: > 5%

CPU Usage:
  - Warning: > 70%
  - Critical: > 85%

Memory Usage:
  - Warning: > 75%
  - Critical: > 90%

Disk Usage:
  - Warning: > 80%
  - Critical: > 95%

Database Connections:
  - Warning: > 80% of pool
  - Critical: Connection failed
```

### 2. SLA Definitions

```
Service Level Objectives:
- API Availability: 99.9%
- API Response Time: < 200ms (p95)
- Error Rate: < 0.1%
- Database Uptime: 99.99%

Incident Response Time:
- Critical: < 5 minutes
- High: < 15 minutes
- Medium: < 1 hour
- Low: < 1 day
```

### 3. Notification Channels

- **Critical:** Slack #critical-alerts, PagerDuty, Email
- **High:** Slack #alerts, Email
- **Medium:** Slack #warnings
- **Low:** Prometheus Dashboard only

---

## 📊 DASHBOARDS QUICK SETUP

### Quick Start (Docker)

```bash
# Run monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)
- Kibana: http://localhost:5601
- Alertmanager: http://localhost:9093
```

### Docker Compose File

```yaml
version: '3'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert_rules.yml:/etc/prometheus/alert_rules.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - '3000:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - '9093:9093'
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - '9100:9100'

volumes:
  grafana-storage:
```

---

## ✅ MONITORING CHECKLIST

- [ ] Prometheus installed and running
- [ ] Grafana configured with Prometheus datasource
- [ ] Dashboards created (API, System, Application)
- [ ] Alert rules configured
- [ ] Alertmanager connected to Slack/PagerDuty
- [ ] Logs collected to ELK stack
- [ ] Health checks configured
- [ ] SLA metrics tracked
- [ ] Incident response plan documented
- [ ] Team trained on dashboards

---

## 🎊 DEPLOYMENT MONITORING READINESS

**Status:** ✅ READY FOR PRODUCTION MONITORING

All monitoring components are configured and ready to deploy.

---

**Next Step:** Deploy monitoring stack and verify metrics collection
