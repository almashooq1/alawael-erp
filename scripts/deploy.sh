#!/bin/bash
# سكريبت النشر بدون توقف للخدمة — Zero-Downtime Deployment
set -euo pipefail

APP_DIR="/opt/rehab-erp"
COMPOSE_FILE="${APP_DIR}/docker-compose.yml"
LOG_FILE="/var/log/rehab-deploy.log"
MAX_HEALTH_RETRIES=10
HEALTH_CHECK_INTERVAL=5

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"; }
error() { log "ERROR: $*"; exit 1; }

health_check() {
    local url="$1"; local retries=0
    while [ $retries -lt $MAX_HEALTH_RETRIES ]; do
        if curl -sf "${url}/health" > /dev/null 2>&1; then
            log "Health check passed for ${url}"; return 0
        fi
        retries=$((retries + 1))
        log "Health check attempt ${retries}/${MAX_HEALTH_RETRIES} failed, retrying..."
        sleep $HEALTH_CHECK_INTERVAL
    done
    error "Health check failed after ${MAX_HEALTH_RETRIES} attempts"
}

check_requirements() {
    log "Checking requirements..."
    command -v docker > /dev/null || error "Docker not installed"
    [ -f "${APP_DIR}/.env" ] || error ".env file missing"
    log "Requirements OK"
}

pre_deploy_backup() {
    log "Creating pre-deployment backup..."
    cd "${APP_DIR}"
    docker compose exec -T app php artisan backup:run --only-db \
        && log "Pre-deployment backup completed" \
        || log "Warning: Pre-deployment backup failed (non-critical)"
}

pull_new_image() {
    local version="${1:-latest}"
    log "Pulling image version: ${version}"
    docker pull "rehaberp/app:${version}" || error "Failed to pull image"
    log "Image pulled successfully"
}

run_migrations() {
    local version="${1:-latest}"
    log "Running database migrations..."
    cd "${APP_DIR}"
    docker run --rm --env-file .env "rehaberp/app:${version}" \
        php artisan migrate --force \
        && log "Migrations completed" \
        || error "Migrations failed"
}

zero_downtime_deploy() {
    local version="${1:-latest}"
    log "Starting zero-downtime deployment (blue-green)..."
    cd "${APP_DIR}"

    if docker ps --format '{{.Names}}' | grep -q "rehab_app_blue"; then
        OLD_COLOR="blue"; NEW_COLOR="green"
    else
        OLD_COLOR="green"; NEW_COLOR="blue"
    fi
    log "Current: ${OLD_COLOR}, Deploying to: ${NEW_COLOR}"

    export APP_VERSION="${version}"
    docker run -d --name "rehab_app_${NEW_COLOR}" \
        --env-file .env \
        --network rehab-network \
        "rehaberp/app:${version}" \
        || error "Failed to start new container"

    sleep 10
    health_check "http://localhost:8080" || error "New container health check failed"

    docker exec rehab_nginx sh -c "
        sed -i 's/rehab_app_${OLD_COLOR}/rehab_app_${NEW_COLOR}/g' /etc/nginx/nginx.conf
        nginx -s reload
    "

    sleep 5
    docker stop "rehab_app_${OLD_COLOR}" 2>/dev/null || true
    docker rm "rehab_app_${OLD_COLOR}" 2>/dev/null || true

    log "Blue-green deployment complete: ${version} on ${NEW_COLOR}"
}

clear_caches() {
    log "Clearing application caches..."
    cd "${APP_DIR}"
    docker compose exec -T app php artisan config:cache
    docker compose exec -T app php artisan route:cache
    docker compose exec -T app php artisan view:cache
    docker compose exec -T app php artisan event:cache
    log "Caches cleared and rebuilt"
}

post_deploy_check() {
    log "Running post-deployment health checks..."
    health_check "http://localhost"
    log "Post-deployment checks passed"
}

main() {
    local version="${1:-latest}"
    log "========================================="
    log "Starting deployment: version=${version}"
    log "========================================="
    check_requirements
    pre_deploy_backup
    pull_new_image "${version}"
    run_migrations "${version}"
    zero_downtime_deploy "${version}"
    clear_caches
    post_deploy_check
    log "========================================="
    log "Deployment completed successfully!"
    log "========================================="
}

main "${@}"
