# ALAWAEL Monitoring Stack

## Overview

Complete monitoring solution with Prometheus, Grafana, and AlertManager for the ALAWAEL ERP system.

## Stack Components

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and management
- **Node Exporter**: System metrics collection

## Quick Start

### 1. Prerequisites

- Docker and Docker Compose installed
- Dashboard server running on port 3001
- Services configured to expose metrics

### 2. Start Monitoring Stack

```bash
cd monitoring
docker-compose up -d
```

### 3. Access Interfaces

- **Grafana**: http://localhost:3000
  - Username: `admin`
  - Password: `admin` (change on first login)

- **Prometheus**: http://localhost:9090
  - Query interface and metrics explorer

- **AlertManager**: http://localhost:9093
  - Alert management interface

- **Node Exporter**: http://localhost:9100/metrics
  - System metrics endpoint

## Configuration

### Environment Variables

Create a `.env` file in the monitoring directory:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

### Prometheus Configuration

Edit `prometheus/prometheus.yml` to add or modify scrape targets.

**Current Targets:**
- Dashboard API (port 3001)
- Backend (port 5000)
- GraphQL (port 4000)
- Frontend (port 3002)
- Node Exporter (port 9100)

### Alert Rules

Alert rules are defined in `prometheus/alert.rules.yml`.

**Alert Categories:**
- Quality Alerts (test failures, coverage)
- Infrastructure Alerts (CPU, memory, disk)
- Performance Alerts (response times)
- Business Metrics (deployments, trends)

### AlertManager Routing

Configured in `alertmanager/alertmanager.yml`:

- **Critical alerts** → Immediate notification to #critical-alerts
- **Quality alerts** → Quality team via #quality-alerts
- **Infrastructure alerts** → Ops team via #ops-alerts
- **Performance alerts** → Performance channel

## Grafana Dashboards

### Import Pre-built Dashboards

1. Open Grafana: http://localhost:3000
2. Navigate to **Dashboards** → **Import**
3. Import the following dashboard IDs:

#### Recommended Dashboards:

**System Overview:**
- Dashboard ID: `1860` - Node Exporter Full
- Shows: CPU, Memory, Disk, Network metrics

**Docker Monitoring:**
- Dashboard ID: `893` - Docker and System Monitoring
- Shows: Container stats, resource usage

**Prometheus Stats:**
- Dashboard ID: `3662` - Prometheus 2.0 Stats
- Shows: Prometheus performance metrics

### Create Custom Quality Dashboard

1. **Create New Dashboard**
   - Name: "ALAWAEL Quality Metrics"
   - Time Range: Last 24 hours

2. **Add Panels:**

**Panel 1: Test Success Rate**
```promql
(quality_tests_passed / quality_tests_total) * 100
```

**Panel 2: Total Tests**
```promql
sum(quality_tests_total) by (service)
```

**Panel 3: Test Coverage**
```promql
quality_test_coverage
```

**Panel 4: Test Duration**
```promql
quality_test_duration_seconds
```

**Panel 5: System Health Score**
```promql
quality_system_health_score
```

**Panel 6: Services Status**
```promql
up{job=~"backend|graphql|dashboard-api"}
```

**Panel 7: Alert Status**
```promql
ALERTS{alertstate="firing"}
```

**Panel 8: Failed Tests Over Time**
```promql
rate(quality_tests_failed_total[5m])
```

3. **Configure Alerts:**
   - Add alert rules to panels
   - Set notification channels
   - Define thresholds

## Setting Up Metrics in Dashboard

To expose metrics from the Dashboard API, add Prometheus client:

### 1. Install Dependencies

```bash
cd dashboard/server
npm install prom-client
```

### 2. Create Metrics Module

Create `dashboard/server/services/metrics.js`:

```javascript
const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const testsTotalGauge = new promClient.Gauge({
  name: 'quality_tests_total',
  help: 'Total number of tests',
  labelNames: ['service'],
  registers: [register]
});

const testsPassedGauge = new promClient.Gauge({
  name: 'quality_tests_passed',
  help: 'Number of passed tests',
  labelNames: ['service'],
  registers: [register]
});

const testsFailedGauge = new promClient.Gauge({
  name: 'quality_tests_failed',
  help: 'Number of failed tests',
  labelNames: ['service'],
  registers: [register]
});

const testCoverageGauge = new promClient.Gauge({
  name: 'quality_test_coverage',
  help: 'Test coverage percentage',
  labelNames: ['service'],
  registers: [register]
});

const testDurationGauge = new promClient.Gauge({
  name: 'quality_test_duration_seconds',
  help: 'Test duration in seconds',
  labelNames: ['service'],
  registers: [register]
});

const systemHealthGauge = new promClient.Gauge({
  name: 'quality_system_health_score',
  help: 'Overall system health score',
  registers: [register]
});

module.exports = {
  register,
  testsTotalGauge,
  testsPassedGauge,
  testsFailedGauge,
  testCoverageGauge,
  testDurationGauge,
  systemHealthGauge
};
```

### 3. Add Metrics Endpoint

Add to `dashboard/server/routes/api.js`:

```javascript
const metrics = require('../services/metrics');

// Prometheus metrics endpoint
router.get('/metrics/prometheus', async (req, res) => {
  res.set('Content-Type', metrics.register.contentType);
  res.end(await metrics.register.metrics());
});
```

### 4. Update Metrics

In `dashboard/server/services/quality.js`, update metrics after test runs:

```javascript
const metrics = require('./metrics');

// After test completion
metrics.testsTotalGauge.set({ service: service.name }, results.total);
metrics.testsPassedGauge.set({ service: service.name }, results.passed);
metrics.testsFailedGauge.set({ service: service.name }, results.failed);
metrics.testCoverageGauge.set({ service: service.name }, results.coverage || 0);
metrics.testDurationGauge.set({ service: service.name }, duration / 1000);
```

## Monitoring Best Practices

### 1. Set Up Alerts

- Configure Slack/Email notifications
- Define escalation policies
- Set appropriate thresholds

### 2. Regular Review

- Check dashboards daily
- Review trends weekly
- Analyze patterns monthly

### 3. Alert Fatigue Prevention

- Adjust alert thresholds
- Use inhibition rules
- Group related alerts

### 4. Performance Optimization

- Monitor Prometheus disk usage
- Configure retention policies
- Use recording rules for complex queries

## Troubleshooting

### Prometheus Not Scraping Targets

**Check:**
1. Target service is running
2. Firewall allows connection
3. Metrics endpoint returns data
4. Check Prometheus logs: `docker logs alawael-prometheus`

### Grafana Can't Connect to Prometheus

**Check:**
1. Prometheus is running: `docker ps | grep prometheus`
2. Datasource URL is correct
3. Both containers in same network
4. Check Grafana logs: `docker logs alawael-grafana`

### Alerts Not Firing

**Check:**
1. Alert rules are loaded in Prometheus
2. Check Prometheus /rules page
3. AlertManager is receiving alerts
4. Notification channels are configured

### High Resource Usage

**Solutions:**
1. Reduce scrape frequency
2. Limit retention period
3. Use recording rules
4. Optimize queries

## Backup and Maintenance

### Backup Grafana Dashboards

```bash
# Export dashboards
docker exec alawael-grafana grafana-cli admin export-dashboards backup/
```

### Backup Prometheus Data

```bash
# Stop Prometheus
docker-compose stop prometheus

# Backup data directory
docker run --rm -v monitoring_prometheus-data:/data -v $(pwd)/backup:/backup alpine \
  tar czf /backup/prometheus-data.tar.gz -C /data .

# Start Prometheus
docker-compose start prometheus
```

### Update Stack

```bash
# Pull latest images
docker-compose pull

# Restart services
docker-compose up -d
```

## Advanced Configuration

### Recording Rules

Add to `prometheus/recording.rules.yml`:

```yaml
groups:
  - name: quality_recording_rules
    interval: 30s
    rules:
      - record: job:quality_success_rate:avg
        expr: avg by (job) (quality_tests_passed / quality_tests_total)

      - record: service:test_trend:1h
        expr: rate(quality_tests_passed_total[1h])
```

### Federation

For multi-cluster setups, configure Prometheus federation in `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'federate'
    scrape_interval: 15s
    honor_labels: true
    metrics_path: '/federate'
    params:
      'match[]':
        - '{job="quality-metrics"}'
    static_configs:
      - targets:
        - 'other-prometheus:9090'
```

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Prometheus documentation: https://prometheus.io/docs/
- Grafana documentation: https://grafana.com/docs/
- AlertManager documentation: https://prometheus.io/docs/alerting/

---

**Last Updated:** March 2, 2026
**Maintainer:** ALAWAEL ERP Team
