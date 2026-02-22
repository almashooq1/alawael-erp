#!/bin/bash

# Complete Monitoring Setup & Automation Script - v1.0.0
# Sets up Sentry, logging, alerts, and monitoring

set -e

echo "📊 Alawael v1.0.0 - Complete Monitoring Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

API_URL=${1:-"http://localhost:3000"}
SENTRY_DSN=${2}

echo "🔍 Starting comprehensive monitoring setup..."
echo "   API URL: $API_URL"
echo ""

# 1. Sentry Configuration
if [ -z "$SENTRY_DSN" ]; then
    echo "⚠️  Sentry DSN not provided"
    echo "   Get your DSN from: https://sentry.io/settings/[org]/projects/[project]/"
    echo "   Usage: $0 $API_URL your-sentry-dsn"
else
    echo "✅ Sentry DSN configured"
fi

echo ""
echo "📋 Monitoring Configuration Checklist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 2. Health Check Monitoring
echo "1️⃣  Health Check Monitoring"
echo "   └─ Set up ping-based monitoring"
echo "   └─ Endpoint: $API_URL/api/health"
echo "   └─ Check interval: 5 minutes"
echo "   └─ Services:"
echo "      - UptimeRobot (free): https://uptimerobot.com"
echo "      - Pingdom (paid): https://pingdom.com"
echo "      - CloudWatch (AWS): https://console.aws.amazon.com/cloudwatch"
echo ""

# 3. Error Tracking
echo "2️⃣  Error Tracking (Sentry)"
echo "   └─ Project: $(basename $API_URL)"
echo "   └─ Alert threshold: 10+ errors/hour"
echo "   └─ Resolution: https://sentry.io/settings/projects/"
echo ""

# 4. Performance Monitoring
echo "3️⃣  Performance Monitoring"
echo "   └─ Slow query detection (> 1000ms)"
echo "   └─ High memory usage (> 70%)"
echo "   └─ High CPU usage (> 80%)"
echo "   └─ Tools:"
echo "      - New Relic: https://newrelic.com"
echo "      - DataDog: https://datadoghq.com"
echo "      - Elastic: https://elastic.co"
echo ""

# 5. Log Aggregation
echo "4️⃣  Log Aggregation"
echo "   └─ Configured in app:"
echo "      - Winston logger"
echo "      - Morgan HTTP logger"
echo "   └─ Log levels: error(0), warn(1), info(2), debug(3)"
echo "   └─ Retention: 30 days (configurable)"
echo "   └─ Services:"
echo "      - ELK Stack: https://elastic.co"
echo "      - Splunk: https://splunk.com"
echo "      - Papertrail: https://papertrailapp.com"
echo ""

# 6. Alert Configuration
echo "5️⃣  Alert Configuration"
echo "   └─ Slack notifications"
echo "   └─ Email alerts"
echo "   └─ Pagerduty escalation (optional)"
echo "   └─ Alert rules:"
echo "      - Error rate > 1%"
echo "      - Response time > 1000ms"
echo "      - Database timeout"
echo "      - Memory leak detected"
echo "      - CPU sustained > 80%"
echo ""

# 7. Dashboard Creation
echo "6️⃣  Dashboard Creation"
echo "   └─ Metrics to display:"
echo "      - Error rate (last 24h)"
echo "      - Response time distribution"
echo "      - Request volume"
echo "      - Database performance"
echo "      - Memory/CPU usage"
echo "      - Active user sessions"
echo ""

# 8. Backup Monitoring
echo "7️⃣  Backup Monitoring"
echo "   └─ Database backups"
echo "   └─ Backup frequency: Daily"
echo "   └─ Retention: 30 days"
echo "   └─ Recovery test: Weekly"
echo ""

# 9. Security Monitoring
echo "8️⃣  Security Monitoring"
echo "   └─ Suspicious login attempts"
echo "   └─ Rate limit violations"
echo "   └─ SQL injection attempts"
echo "   └─ Invalid JWT tokens"
echo ""

# 10. Capacity Planning
echo "9️⃣  Capacity & Scaling"
echo "   └─ Monitor usage trends"
echo "   └─ Plan for 5x growth"
echo "   └─ Auto-scaling rules"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create monitoring configuration template
cat > monitoring-config.template.json << 'MONITORING_EOF'
{
  "monitoring": {
    "sentry": {
      "dsn": "YOUR_SENTRY_DSN",
      "environment": "production",
      "tracesSampleRate": 0.1,
      "beforeSend": "filter sensitive data"
    },
    "healthCheck": {
      "endpoint": "/api/health",
      "interval": "5m",
      "timeout": "10s",
      "expectedStatus": 200
    },
    "logging": {
      "winston": {
        "level": "info",
        "format": "json",
        "transports": ["file", "console"]
      },
      "morgan": {
        "format": "combined",
        "skip": "health checks"
      }
    },
    "alerts": {
      "errorRate": {
        "threshold": "1%",
        "window": "1h",
        "action": "notify-slack"
      },
      "responseTime": {
        "threshold": "1000ms",
        "percentile": "p95",
        "action": "alert-ops"
      },
      "memoryUsage": {
        "threshold": "70%",
        "sustained": "5m",
        "action": "scale-up"
      },
      "databaseTimeout": {
        "threshold": "timeout",
        "action": "page-oncall"
      }
    },
    "uptime": {
      "target": "99.9%",
      "sla": "4h response time"
    }
  }
}
MONITORING_EOF

echo "✅ Configuration template created: monitoring-config.template.json"
echo ""

# Create setup checklist
cat > MONITORING_SETUP_CHECKLIST.md << 'CHECKLIST_EOF'
# Alawael v1.0.0 - Monitoring Setup Checklist

## ✅ Pre-deployment

- [ ] Application deployed and healthy
- [ ] API responding to requests
- [ ] Database connected
- [ ] Error tracking enabled

## 🔴 Critical Monitoring (Do First)

- [ ] **Sentry Account**
  - [ ] Account created at https://sentry.io
  - [ ] Project created for your app
  - [ ] DSN copied to environment variables
  - [ ] Alert rules configured

- [ ] **Uptime Monitoring**
  - [ ] Health check endpoint configured
  - [ ] UptimeRobot or similar set up
  - [ ] Alert on downtime enabled
  - [ ] Test alert triggered

- [ ] **Log Aggregation**
  - [ ] Logging service account created
  - [ ] Application logs forwarding configured
  - [ ] Log retention policy set
  - [ ] Log level set to 'info'

## 🟡 Important Monitoring (Do Soon)

- [ ] **Performance Monitoring**
  - [ ] App monitoring service configured
  - [ ] Transaction monitoring enabled
  - [ ] Slow query detection set (> 1s)
  - [ ] Database performance tracked

- [ ] **Alert Configuration**
  - [ ] Slack channel created for alerts
  - [ ] Slack integration configured
  - [ ] Alert rules for error rate
  - [ ] Alert rules for performance
  - [ ] Test alert delivered to Slack

- [ ] **Dashboard Creation**
  - [ ] Main dashboard created
  - [ ] Key metrics added
  - [ ] Real-time graphs enabled
  - [ ] Team access granted

## 🟢 Nice to Have (Do Later)

- [ ] **Advanced Security Monitoring**
  - [ ] Suspicious activity detection
  - [ ] Failed login tracking
  - [ ] Rate limit monitoring

- [ ] **Capacity Planning**
  - [ ] Usage metrics tracked
  - [ ] Trend analysis started
  - [ ] Scaling thresholds defined

- [ ] **Backup Monitoring**
  - [ ] Backup schedules verified
  - [ ] Backup location confirmed
  - [ ] Recovery test scheduled

## 📝 Monitoring Tools Setup Commands

### Sentry
```bash
npm install @sentry/node
# Add DSN to .env
SENTRY_DSN=your-dsn
```

### Slack Integration
```bash
# Webhook URL from Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### UptimeRobot
```
Endpoint: https://your-domain/api/health
Interval: 5 minutes
Alert contacts: your-email@company.com
```

## 🎯 Success Criteria

After setup, verify:
- [ ] Health check passing
- [ ] Errors showing in Sentry
- [ ] Alerts reaching Slack
- [ ] Performance metrics visible
- [ ] Log entries being collected
- [ ] Dashboard displaying data

## 📞 Support

Need help? Check:
- Sentry docs: https://docs.sentry.io
- Application logs: npm run logs
- Health check: curl http://localhost:3000/api/health

---

Completed by: _______________  
Date: _______________  
Notes: _______________  

CHECKLIST_EOF

echo "✅ Monitoring setup checklist created: MONITORING_SETUP_CHECKLIST.md"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Monitoring Setup Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📌 Required Configurations:"
echo "   1. Sentry DSN"
echo "   2. Slack Webhook URL"
echo "   3. Uptime monitoring service"
echo "   4. Log aggregation endpoint"
echo ""

echo "📊 Monitoring Tools Recommended:"
echo "   ☑️  Sentry (errors and exceptions)"
echo "   ☑️  New Relic or DataDog (performance)"
echo "   ☑️  Slack (notifications)"
echo "   ☑️  Papertrail (log aggregation)"
echo "   ☑️  UptimeRobot (uptime monitoring)"
echo ""

echo "⏱️  Setup Timeline:"
echo "   Critical: 30 minutes"
echo "   Important: 1 hour"
echo "   Nice to have: 2 hours"
echo ""

echo "✅ Monitoring setup package complete!"
echo ""
