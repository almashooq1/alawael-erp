#!/bin/sh
# ════════════════════════════════════════════════════════════════
#  Alertmanager — entrypoint with env-var substitution
#  Replaces ${VAR} placeholders in the template before launching.
# ════════════════════════════════════════════════════════════════
set -e

TEMPLATE="/etc/alertmanager/alertmanager.yml.tmpl"
CONFIG="/tmp/alertmanager.yml"

if [ ! -f "$TEMPLATE" ]; then
  echo "ERROR: Template not found at $TEMPLATE"
  exit 1
fi

cp "$TEMPLATE" "$CONFIG"

# Replace each placeholder with its env-var value (empty string if unset)
sed -i \
  -e 's|${SLACK_WEBHOOK_URL}|'"${SLACK_WEBHOOK_URL:-}"'|g' \
  -e 's|${MAIL_USERNAME}|'"${MAIL_USERNAME:-}"'|g' \
  -e 's|${MAIL_PASSWORD}|'"${MAIL_PASSWORD:-}"'|g' \
  "$CONFIG"

echo "✅ Alertmanager config rendered from template"

exec /bin/alertmanager --config.file="$CONFIG" --storage.path=/alertmanager "$@"
