#!/bin/bash
# سكريبت التراجع عن آخر نشر
set -euo pipefail

APP_DIR="/opt/rehab-erp"
LOG_FILE="/var/log/rehab-rollback.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"; }
error() { log "ERROR: $*"; exit 1; }

get_previous_version() {
    cd "${APP_DIR}"
    docker compose exec -T db mysql -u"${DB_USERNAME}" -p"${DB_PASSWORD}" "${DB_DATABASE}" \
        -se "SELECT version FROM deployments WHERE status='success' AND environment='production' ORDER BY completed_at DESC LIMIT 1 OFFSET 1;" \
        2>/dev/null || echo ""
}

main() {
    log "========================================="
    log "Starting rollback..."
    log "========================================="

    source "${APP_DIR}/.env" 2>/dev/null || true

    local prev_version
    prev_version=$(get_previous_version)

    if [ -z "${prev_version}" ]; then
        error "No previous version found to rollback to"
    fi

    log "Rolling back to version: ${prev_version}"
    bash "${APP_DIR}/scripts/deploy.sh" "${prev_version}"

    log "Rollback to ${prev_version} completed successfully!"
}

main "${@}"
