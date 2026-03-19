# ALAWAEL Quality System - Slack Integration Guide
# Advanced Notifications and Real-time Alerts

## Overview

Integrate ALAWAEL Quality System with Slack for:
- ✅ Real-time quality check notifications
- ✅ Daily summary reports
- ✅ Failure alerts with debugging guidance
- ✅ Performance trend tracking
- ✅ Actionable team workflows

---

## Quick Setup (5 minutes)

### Step 1: Create Slack Webhook

1. Go to https://api.slack.com/messaging/webhooks
2. Click "Create New App" → "From scratch"
3. Name: `ALAWAEL Quality Bot`
4. Select workspace
5. Enable Incoming Webhooks
6. Click "Add New Webhook to Workspace"
7. Select notification channel (e.g., `#quality-alerts`)
8. Copy Webhook URL

### Step 2: Store Webhook URL

```bash
# Create environment file
cat > .env.slack << 'EOF'
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
SLACK_CHANNEL="#quality-alerts"
SLACK_BOT_NAME="ALAWAEL Quality"
EOF

# Add to .gitignore
echo ".env.slack" >> .gitignore
```

### Step 3: Test Integration

```bash
# Test webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"✅ ALAWAEL Quality System Connected"}' \
  $SLACK_WEBHOOK_URL
```

---

## Automated Notifications

### Quality Check Success

```bash
#!/bin/bash

send_slack_success() {
  local service=$1
  local duration=$2
  local tests=$3

  curl -X POST -H 'Content-type: application/json' \
    --data "{
      \"blocks\": [
        {
          \"type\": \"section\",
          \"text\": {
            \"type\": \"mrkdwn\",
            \"text\": \"✅ *$service* Quality Check Passed\n*Duration:* ${duration}s | *Tests:* $tests\"
          }
        }
      ]
    }" \
    $SLACK_WEBHOOK_URL
}

# Usage
send_slack_success "Backend" "32" "894"
```

### Quality Check Failure

```bash
#!/bin/bash

send_slack_failure() {
  local service=$1
  local error=$2
  local suggestions=$3

  curl -X POST -H 'Content-type: application/json' \
    --data "{
      \"blocks\": [
        {
          \"type\": \"header\",
          \"text\": {
            \"type\": \"plain_text\",
            \"text\": \"❌ Quality Check Failed\",
            \"emoji\": true
          }
        },
        {
          \"type\": \"section\",
          \"fields\": [
            {
              \"type\": \"mrkdwn\",
              \"text\": \"*Service:*\n$service\"
            },
            {
              \"type\": \"mrkdwn\",
              \"text\": \"*Status:*\nFAILED\"
            }
          ]
        },
        {
          \"type\": \"section\",
          \"text\": {
            \"type\": \"mrkdwn\",
            \"text\": \"*Error:*\n\`\`\`$error\`\`\`\"
          }
        },
        {
          \"type\": \"section\",
          \"text\": {
            \"type\": \"mrkdwn\",
            \"text\": \"*Next Steps:*\n$suggestions\"
          }
        },
        {
          \"type\": \"actions\",
          \"elements\": [
            {
              \"type\": \"button\",
              \"text\": {
                \"type\": \"plain_text\",
                \"text\": \"View Report\"
              },
              \"url\": \"https://github.com/YOUR/REPO/actions\"
            }
          ]
        }
      ]
    }" \
    $SLACK_WEBHOOK_URL
}

# Usage
send_slack_failure "Backend" "Test suite timeout" \
  "1. Check .quality-reports/latest.txt\n2. Run: npm run quality:ci\n3. Review: DEVELOPER_WORKFLOW_GUIDE.md"
```

### Daily Summary Report

```bash
#!/bin/bash

send_daily_summary() {
  local timestamp=$(date +%Y-%m-%d)
  local total_checks=$(ls -1 .quality-reports/report_*.txt 2>/dev/null | wc -l)
  local passed=$(grep -c "PASSED" .quality-reports/report_* 2>/dev/null || echo 0)
  local failed=$((total_checks - passed))

  curl -X POST -H 'Content-type: application/json' \
    --data "{
      \"blocks\": [
        {
          \"type\": \"header\",
          \"text\": {
            \"type\": \"plain_text\",
            \"text\": \"📊 Daily Quality Summary - $timestamp\",
            \"emoji\": true
          }
        },
        {
          \"type\": \"section\",
          \"fields\": [
            {
              \"type\": \"mrkdwn\",
              \"text\": \"*Total Checks:*\n$total_checks\"
            },
            {
              \"type\": \"mrkdwn\",
              \"text\": \"*Passed:*\n✅ $passed\"
            },
            {
              \"type\": \"mrkdwn\",
              \"text\": \"*Failed:*\n❌ $failed\"
            },
            {
              \"type\": \"mrkdwn\",
              \"text\": \"*Success Rate:*\n$((passed * 100 / total_checks))%\"
            }
          ]
        }
      ]
    }" \
    $SLACK_WEBHOOK_URL
}

# Usage (schedule with cron)
send_daily_summary
```

---

## GitHub Actions Integration

### Add to Workflow

```yaml
# .github/workflows/slack-notifications.yml

name: Quality Slack Notifications

on:
  workflow_run:
    workflows:
      - "Backend Quality Push"
      - "Backend Quality Gate"
      - "GraphQL Quality Gate"
      - "Finance Quality Gate"
      - "Supply Chain Quality Gate"
    types:
      - completed

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Notify Success
        if: github.event.workflow_run.conclusion == 'success'
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "✅ *Quality Check Passed*\nWorkflow: ${{ github.event.workflow_run.name }}\nBranch: ${{ github.event.workflow_run.head_branch }}"
                  }
                }
              ]
            }

      - name: Notify Failure
        if: github.event.workflow_run.conclusion == 'failure'
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "❌ *Quality Check Failed*\n*Workflow:* ${{ github.event.workflow_run.name }}\n*Branch:* ${{ github.event.workflow_run.head_branch }}\n<${{ github.event.workflow_run.html_url }}|View Details>"
                  }
                }
              ]
            }
```

### Setup GitHub Secret

```bash
# Add SLACK_WEBHOOK to GitHub repository secrets:
# 1. Go to Settings → Secrets and variables → Actions
# 2. New repository secret
# 3. Name: SLACK_WEBHOOK
# 4. Value: Your Webhook URL
```

---

## Advanced Slack Commands

### Performance Alerts

```bash
send_performance_alert() {
  local service=$1
  local current_duration=$2
  local baseline=$3
  local threshold=$((baseline + 60))  # +1 minute

  if [ "$current_duration" -gt "$threshold" ]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{
        \"blocks\": [
          {
            \"type\": \"section\",
            \"text\": {
              \"type\": \"mrkdwn\",
              \"text\": \"⚠️  *Performance Degradation Detected*\n*Service:* $service\n*Baseline:* ${baseline}s\n*Current:* ${current_duration}s\n*Increase:* +$((current_duration - baseline))s\"
            }
          }
        ]
      }" \
      $SLACK_WEBHOOK_URL
  fi
}
```

### Coverage Regression Alerts

```bash
send_coverage_alert() {
  local service=$1
  local current=$2
  local baseline=$3

  if (( $(echo "$current < $baseline" | bc -l) )); then
    curl -X POST -H 'Content-type: application/json' \
      --data "{
        \"blocks\": [
          {
            \"type\": \"section\",
            \"text\": {
              \"type\": \"mrkdwn\",
              \"text\": \"📉 *Coverage Regression*\n*Service:* $service\n*Baseline:* ${baseline}%\n*Current:* ${current}%\"
            }
          }
        ]
      }" \
      $SLACK_WEBHOOK_URL
  fi
}
```

---

## Multi-Channel Distribution

```bash
# .env.slack (extended)
SLACK_WEBHOOK_ALERTS="#quality-alerts"
SLACK_WEBHOOK_REPORTS="#quality-reports"
SLACK_WEBHOOK_DEVTEAM="#dev-quality"
SLACK_WEBHOOK_LEADERSHIP="#exec-dashboards"

send_to_channel() {
  local channel=$1
  local message=$2

  case "$channel" in
    alerts)
      WEBHOOK=$SLACK_WEBHOOK_ALERTS
      ;;
    reports)
      WEBHOOK=$SLACK_WEBHOOK_REPORTS
      ;;
    dev)
      WEBHOOK=$SLACK_WEBHOOK_DEVTEAM
      ;;
    exec)
      WEBHOOK=$SLACK_WEBHOOK_LEADERSHIP
      ;;
  esac

  curl -X POST -H 'Content-type: application/json' \
    --data "$message" \
    "$WEBHOOK"
}
```

---

## Webhook URL Security

### Best Practices

1. **Never commit webhook URLs**
```bash
echo ".env.slack" >> .gitignore
echo ".env.*.local" >> .gitignore
```

2. **Rotate webhooks regularly**
   - Delete old webhook URLs
   - Create new ones monthly
   - Update GitHub secrets

3. **Use GitHub Secrets**
```yaml
# In workflows
webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
```

4. **Separate webhooks per environment**
```bash
SLACK_WEBHOOK_DEV="https://hooks.slack.com/..."
SLACK_WEBHOOK_PROD="https://hooks.slack.com/..."
```

---

## Troubleshooting

### Webhook Not Working

```bash
# Test webhook directly
curl -X POST -H 'Content-type: application/json' \
  -d '{"text":"Test message"}' \
  $SLACK_WEBHOOK_URL

# Check response
# Expected: {"ok":true}
# Error: Message not formatted correctly
```

### Authorization Issues

```bash
# Verify webhook still active
# Go to: https://api.slack.com/messaging/webhooks
# Check "Incoming Webhooks" are enabled
# Confirm webhook URL matches
```

### Message Not Appearing

1. Check channel spelling (must match webhook target)
2. Verify bot has posted to channel before
3. Review Slack workflow rules (may be blocking)
4. Check message formatting (valid JSON)

---

## Template Library

### Service Deployment Notification

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "🚀 Service Deployed"}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Service:*\nBackend"},
        {"type": "mrkdwn", "text": "*Version:*\n2.0.0"},
        {"type": "mrkdwn", "text": "*Environment:*\nProduction"},
        {"type": "mrkdwn", "text": "*Quality Score:*\n95/100"}
      ]
    }
  ]
}
```

### Team Quality Metrics

```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*ALAWAEL Quality Metrics*\n*Backend:* 894/894 ✅\n*GraphQL:* 120/120 ✅\n*Finance:* 85/85 ✅\n*Supply Chain:* 156/156 + 280/280 ✅"
      }
    }
  ]
}
```

---

## Integration Checklist

- [ ] Create Slack app and webhook
- [ ] Store webhook URL securely
- [ ] Add to GitHub Secrets
- [ ] Test webhook manually
- [ ] Deploy GitHub Actions workflow
- [ ] Configure notification channels
- [ ] Set up daily summary schedule (cron)
- [ ] Document team notification preferences
- [ ] Train team on alert meanings
- [ ] Monitor webhook usage

---

## Next Steps

1. **Setup Complete**: Slack integration ready
2. **Configure Channels**: Customize per team needs
3. **Enable Automations**: Cron jobs for daily summaries
4. **Monitor Usage**: Track notification frequency
5. **Gather Feedback**: Team preferences and insights

For questions or additional integrations, refer to:
- [Slack API Documentation](https://api.slack.com)
- [Slack Messaging Webhooks](https://api.slack.com/messaging/webhooks)
- SYSTEM_QUALITY_GUIDE.md (Advanced section)
