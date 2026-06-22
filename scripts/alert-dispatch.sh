#!/usr/bin/env bash
#
# Alert dispatch helper for W1437 deployment events.
#
# Usage:
#   ./scripts/alert-dispatch.sh <severity> <summary> <details>
#
# Severity: critical, warning, info
# Sends to any configured channel: Slack, Teams, PagerDuty, Sentry.
#
# Required env (at least one):
#   SLACK_WEBHOOK
#   TEAMS_WEBHOOK
#   PAGERDUTY_INTEGRATION_KEY
#   SENTRY_DSN
#

set -uo pipefail

SEVERITY="${1:-info}"
SUMMARY="${2:-W1437 alert}"
DETAILS="${3:-}"

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
HOSTNAME=$(hostname)

send_slack() {
  [[ -n "${SLACK_WEBHOOK:-}" ]] || return 0
  local color="good"
  [[ "$SEVERITY" == "warning" ]] && color="warning"
  [[ "$SEVERITY" == "critical" ]] && color="danger"

  local payload
  payload=$(cat <<EOF
{
  "attachments": [{
    "color": "$color",
    "title": "[$SEVERITY] $SUMMARY",
    "text": "$DETAILS",
    "footer": "W1437 deploy • $HOSTNAME • $TIMESTAMP"
  }]
}
EOF
)
  curl -sf -X POST -H 'Content-type: application/json' --data "$payload" "$SLACK_WEBHOOK" &>/dev/null || echo "Slack dispatch failed"
}

send_teams() {
  [[ -n "${TEAMS_WEBHOOK:-}" ]] || return 0
  local color="28a745"
  [[ "$SEVERITY" == "warning" ]] && color="ffc107"
  [[ "$SEVERITY" == "critical" ]] && color="dc3545"

  local payload
  payload=$(cat <<EOF
{
  "@type": "MessageCard",
  "@context": "https://schema.org/extensions",
  "themeColor": "$color",
  "summary": "[$SEVERITY] $SUMMARY",
  "sections": [{
    "activityTitle": "[$SEVERITY] $SUMMARY",
    "activitySubtitle": "W1437 deploy • $HOSTNAME • $TIMESTAMP",
    "text": "$DETAILS"
  }]
}
EOF
)
  curl -sf -X POST -H 'Content-type: application/json' --data "$payload" "$TEAMS_WEBHOOK" &>/dev/null || echo "Teams dispatch failed"
}

send_pagerduty() {
  [[ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ]] || return 0
  local severity_pd="info"
  [[ "$SEVERITY" == "warning" ]] && severity_pd="warning"
  [[ "$SEVERITY" == "critical" ]] && severity_pd="critical"

  local payload
  payload=$(cat <<EOF
{
  "routing_key": "$PAGERDUTY_INTEGRATION_KEY",
  "event_action": "trigger",
  "payload": {
    "summary": "[$SEVERITY] $SUMMARY",
    "severity": "$severity_pd",
    "source": "$HOSTNAME",
    "custom_details": {
      "details": "$DETAILS",
      "timestamp": "$TIMESTAMP"
    }
  }
}
EOF
)
  curl -sf -X POST -H 'Content-type: application/json' --data "$payload" "https://events.pagerduty.com/v2/enqueue" &>/dev/null || echo "PagerDuty dispatch failed"
}

send_sentry() {
  [[ -n "${SENTRY_DSN:-}" ]] || return 0
  # Sentry DSN format: https://public@host/id
  # We send a simple capture message via Sentry CLI if available, else skip.
  if command -v sentry-cli &>/dev/null; then
    SENTRY_DSN="$SENTRY_DSN" sentry-cli send-event -m "[$SEVERITY] $SUMMARY" --tag details:"$DETAILS" --tag timestamp:"$TIMESTAMP" &>/dev/null || echo "Sentry dispatch failed"
  fi
}

send_slack
send_teams
send_pagerduty
send_sentry
