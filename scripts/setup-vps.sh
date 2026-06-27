#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — VPS One-Command Setup Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage: sudo ./scripts/setup-vps.sh [OPTIONS]
#
# Options:
#   --domain DOMAIN     Domain name (default: alawael.org)
#   --email EMAIL       Admin email for Let's Encrypt (default: admin@alawael.org)
#   --branch BRANCH     Git branch to clone (default: main)
#   --repo URL          Git repository URL
#   --skip-ssl          Skip SSL certificate setup
#   --skip-backup       Skip backup cron setup
#   --skip-monitoring   Skip monitoring setup
#   --help              Show this help message
#
# This script is idempotent — safe to run multiple times.
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════
APP_NAME="alawael-erp"
APP_DIR="/opt/${APP_NAME}"
BACKUP_DIR="/opt/backups"
LOG_DIR="/var/log/alawael"
DOMAIN="alawael.org"
ADMIN_EMAIL="admin@alawael.org"
GIT_BRANCH="main"
GIT_REPO=""  # Set via --repo or detected
NODE_VERSION="20"

SKIP_SSL=false
SKIP_BACKUP=false
SKIP_MONITORING=false
DRY_RUN=false

# ═══════════════════════════════════════════════════════════════════════════════
# Color helpers
# ═══════════════════════════════════════════════════════════════════════════════
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}ℹ${NC}  $*"; }
log_ok()    { echo -e "${GREEN}✓${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
log_error() { echo -e "${RED}✗${NC}  $*" >&2; }
log_step()  { echo -e "${CYAN}▶${NC}  ${BOLD}$*${NC}"; }

# ═══════════════════════════════════════════════════════════════════════════════
# Parse Arguments
# ═══════════════════════════════════════════════════════════════════════════════
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --domain)
        DOMAIN="$2"
        shift 2
        ;;
      --email)
        ADMIN_EMAIL="$2"
        shift 2
        ;;
      --branch)
        GIT_BRANCH="$2"
        shift 2
        ;;
      --repo)
        GIT_REPO="$2"
        shift 2
        ;;
      --skip-ssl)
        SKIP_SSL=true
        shift
        ;;
      --skip-backup)
        SKIP_BACKUP=true
        shift
        ;;
      --skip-monitoring)
        SKIP_MONITORING=true
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --help|-h)
        sed -n '2,18p' "$0"
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        exit 1
        ;;
    esac
  done
}

# ═══════════════════════════════════════════════════════════════════════════════
# Pre-flight Checks
# ═══════════════════════════════════════════════════════════════════════════════
preflight() {
  log_step "Pre-flight checks"

  # Check if running as root
  if [[ "$EUID" -ne 0 ]]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
  fi

  # Check OS
  if [[ -f /etc/os-release ]]; then
    source /etc/os-release
    if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
      log_warn "OS '$ID' is not officially supported. Ubuntu/Debian recommended."
    fi
    log_info "OS: $NAME $VERSION"
  fi

  # Check internet connectivity
  if ! curl -fsSL https://download.docker.com >/dev/null 2>&1; then
    log_error "No internet connectivity. Please check your network."
    exit 1
  fi
  log_ok "Internet connectivity confirmed"

  # Check minimum resources
  local mem_kb=$(awk '/MemTotal:/ {print $2}' /proc/meminfo)
  local mem_gb=$((mem_kb / 1024 / 1024))
  if [[ "$mem_gb" -lt 4 ]]; then
    log_warn "System has only ${mem_gb}GB RAM. Minimum recommended is 4GB."
  fi
  log_info "Memory: ${mem_gb}GB"

  # Check disk space
  local disk_gb=$(df -BG / | tail -1 | awk '{print $1}' | tr -d 'G')
  if [[ "$disk_gb" -lt 20 ]]; then
    log_warn "Root partition has only ~${disk_gb}GB. Minimum recommended is 50GB."
  fi
  log_info "Disk: ~${disk_gb}GB available on root"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 1. Update System Packages
# ═══════════════════════════════════════════════════════════════════════════════
update_system() {
  log_step "Updating system packages"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would run: apt update && apt upgrade -y"
    return 0
  fi

  apt update -qq
  DEBIAN_FRONTEND=noninteractive apt upgrade -y -qq
  DEBIAN_FRONTEND=noninteractive apt install -y -qq \
    curl wget gnupg2 software-properties-common \
    apt-transport-https ca-certificates lsb-release \
    git jq bc ufw logrotate cron

  log_ok "System packages updated"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 2. Install Docker & Docker Compose
# ═══════════════════════════════════════════════════════════════════════════════
install_docker() {
  log_step "Installing Docker & Docker Compose"

  if command -v docker &>/dev/null && docker compose version &>/dev/null; then
    log_ok "Docker already installed: $(docker --version)"
    log_ok "Docker Compose: $(docker compose version)"
    return 0
  fi

  if $DRY_RUN; then
    log_info "[DRY RUN] Would install Docker CE"
    return 0
  fi

  # Remove old versions
  apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

  # Add Docker's official GPG key
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  # Add repository
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt update -qq
  DEBIAN_FRONTEND=noninteractive apt install -y -qq \
    docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

  # Configure Docker daemon
  mkdir -p /etc/docker
  cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
EOF

  systemctl enable docker
  systemctl restart docker

  log_ok "Docker installed: $(docker --version)"
  log_ok "Docker Compose: $(docker compose version)"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 3. Install Nginx
# ═══════════════════════════════════════════════════════════════════════════════
install_nginx() {
  log_step "Installing Nginx"

  if command -v nginx &>/dev/null; then
    log_ok "Nginx already installed: $(nginx -v 2>&1 | head -1)"
    return 0
  fi

  if $DRY_RUN; then
    log_info "[DRY RUN] Would install Nginx"
    return 0
  fi

  DEBIAN_FRONTEND=noninteractive apt install -y -qq nginx
  systemctl enable nginx
  systemctl start nginx

  # Remove default site
  rm -f /etc/nginx/sites-enabled/default

  log_ok "Nginx installed and running"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 4. Install Node.js 20
# ═══════════════════════════════════════════════════════════════════════════════
install_nodejs() {
  log_step "Installing Node.js ${NODE_VERSION}"

  if command -v node &>/dev/null; then
    local current_version
    current_version=$(node --version | sed 's/v//')
    local major_version
    major_version=$(echo "$current_version" | cut -d. -f1)
    if [[ "$major_version" -ge "$NODE_VERSION" ]]; then
      log_ok "Node.js already installed: v${current_version}"
      return 0
    fi
    log_warn "Node.js v${current_version} found, upgrading to v${NODE_VERSION}"
  fi

  if $DRY_RUN; then
    log_info "[DRY RUN] Would install Node.js ${NODE_VERSION}"
    return 0
  fi

  # Remove old NodeSource repos if they exist
  rm -f /etc/apt/sources.list.d/nodesource*.list

  # Install NodeSource setup
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  DEBIAN_FRONTEND=noninteractive apt install -y -qq nodejs

  log_ok "Node.js installed: $(node --version)"
  log_ok "npm installed: $(npm --version)"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 5. Create App Directory & Clone Repo
# ═══════════════════════════════════════════════════════════════════════════════
setup_app_directory() {
  log_step "Setting up application directory"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would create ${APP_DIR}"
    return 0
  fi

  # Create directories
  mkdir -p "$APP_DIR"
  mkdir -p "$BACKUP_DIR"
  mkdir -p "$LOG_DIR"
  mkdir -p /var/www/certbot

  # Create user if not exists
  if ! id -u alawael &>/dev/null; then
    useradd -m -s /bin/bash -d /home/alawael alawael
    usermod -aG docker alawael 2>/dev/null || true
    log_ok "Created user: alawael"
  fi

  # Set ownership
  chown -R alawael:alawael "$APP_DIR"
  chown -R alawael:alawael "$BACKUP_DIR"
  chown -R alawael:alawael "$LOG_DIR"
  chmod 750 "$APP_DIR"
  chmod 750 "$BACKUP_DIR"

  log_ok "App directory ready: ${APP_DIR}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 6. Clone or Pull Repository
# ═══════════════════════════════════════════════════════════════════════════════
clone_repo() {
  log_step "Cloning repository"

  if [[ -z "$GIT_REPO" ]]; then
    log_warn "No --repo specified. Skipping git clone."
    log_info "Please manually copy your project to ${APP_DIR}"
    return 0
  fi

  if [[ -d "${APP_DIR}/.git" ]]; then
    log_info "Repository already exists. Pulling latest changes..."
    if $DRY_RUN; then
      log_info "[DRY RUN] Would run git pull"
    else
      cd "$APP_DIR"
      sudo -u alawael git fetch origin
      sudo -u alawael git checkout "$GIT_BRANCH"
      sudo -u alawael git pull origin "$GIT_BRANCH"
    fi
  else
    if $DRY_RUN; then
      log_info "[DRY RUN] Would clone ${GIT_REPO}"
    else
      sudo -u alawael git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$APP_DIR"
    fi
  fi

  log_ok "Repository ready at ${APP_DIR}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 7. Setup .env File
# ═══════════════════════════════════════════════════════════════════════════════
setup_env() {
  log_step "Setting up environment configuration"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would create .env from .env.example"
    return 0
  fi

  cd "$APP_DIR"

  if [[ -f ".env" ]]; then
    log_warn ".env already exists. Skipping generation."
    log_info "Review your .env file manually: ${APP_DIR}/.env"
    return 0
  fi

  if [[ ! -f ".env.example" ]]; then
    log_warn ".env.example not found. Cannot auto-generate .env"
    return 1
  fi

  # Copy example
  cp .env.example .env
  chown alawael:alawael .env
  chmod 600 .env

  # Generate secrets if Node.js is available
  if command -v node &>/dev/null; then
    local jwt_secret
    jwt_secret=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    local jwt_refresh
    jwt_refresh=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    local setup_secret
    setup_secret=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    local mongo_password
    mongo_password=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    local redis_password
    redis_password=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    local session_secret
    session_secret=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    local metrics_token
    metrics_token=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

    # Update .env with generated values
    sed -i "s/^MONGO_ROOT_PASSWORD=.*/MONGO_ROOT_PASSWORD=${mongo_password}/" .env
    sed -i "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=${redis_password}/" .env
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${jwt_secret}/" .env
    sed -i "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=${jwt_refresh}/" .env
    sed -i "s/^SETUP_SECRET_KEY=.*/SETUP_SECRET_KEY=${setup_secret}/" .env
    sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=${session_secret}/" .env
    sed -i "s/^METRICS_TOKEN=.*/METRICS_TOKEN=${metrics_token}/" .env

    # Set production defaults
    sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env
    sed -i "s/^FRONTEND_URL=.*/FRONTEND_URL=https:\/\/alawael.org/" .env
    sed -i "s/^CORS_ORIGINS=.*/CORS_ORIGINS=https:\/\/alawael.org,https:\/\/www.alawael.org/" .env

    log_ok "Generated secrets and configured .env"
  else
    log_warn "Node.js not available. .env copied but secrets not generated."
    log_warn "Please edit ${APP_DIR}/.env manually and set all required secrets."
  fi

  # Always show a reminder
  echo ""
  log_warn "═══════════════════════════════════════════════════════════════"
  log_warn "  IMPORTANT: Review and update your .env file:"
  log_warn "  ${APP_DIR}/.env"
  log_warn ""
  log_warn "  Required changes:"
  log_warn "    - Set ADMIN_EMAIL and ADMIN_PASSWORD"
  log_warn "    - Set FRONTEND_URL to your domain"
  log_warn "    - Set CORS_ORIGINS to your domain(s)"
  log_warn "═══════════════════════════════════════════════════════════════"
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# 8. Build Docker Images & Start Services
# ═══════════════════════════════════════════════════════════════════════════════
start_services() {
  log_step "Building and starting Docker services"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would build and start Docker Compose services"
    return 0
  fi

  cd "$APP_DIR"

  # Check if .env exists
  if [[ ! -f ".env" ]]; then
    log_error ".env file not found. Cannot start services."
    exit 1
  fi

  # Verify required env vars are set
  local required_vars=("MONGO_ROOT_PASSWORD" "JWT_SECRET" "JWT_REFRESH_SECRET" "SETUP_SECRET_KEY")
  local missing=false
  for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=.\+" .env; then
      log_error "Required env var not set: ${var}"
      missing=true
    fi
  done
  if $missing; then
    exit 1
  fi

  # Build and start
  log_info "Building Docker images (this may take several minutes)..."
  docker compose build --no-cache

  log_info "Starting services..."
  docker compose up -d

  # Wait for services to be healthy
  log_info "Waiting for services to become healthy..."
  local max_wait=120
  local waited=0
  while [[ $waited -lt $max_wait ]]; do
    local healthy_count
    healthy_count=$(docker compose ps --format json 2>/dev/null | \
      grep -c '"Health":"healthy"' || echo "0")
    if [[ "$healthy_count" -ge 4 ]]; then
      log_ok "All services are healthy"
      break
    fi
    sleep 5
    waited=$((waited + 5))
    log_info "  Waiting... (${waited}s / ${max_wait}s)"
  done

  if [[ $waited -ge $max_wait ]]; then
    log_warn "Services may not be fully healthy yet. Check logs with: docker compose logs"
  fi

  log_ok "Docker services started"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 9. Configure Nginx Reverse Proxy
# ═══════════════════════════════════════════════════════════════════════════════
configure_nginx() {
  log_step "Configuring Nginx reverse proxy"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would configure Nginx for ${DOMAIN}"
    return 0
  fi

  # Create Nginx config for the domain
  cat > "/etc/nginx/sites-available/${APP_NAME}" <<EOF
# Al-Awael ERP — Nginx Reverse Proxy
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Health check (no redirect)
    location /health {
        access_log off;
        proxy_pass http://localhost:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    # SSL will be configured by Let's Encrypt
    # Placeholder certificates (will be replaced by certbot)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Body limits
    client_max_body_size 50M;
    client_body_buffer_size 128k;

    # Proxy to Docker services
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Error handling
    error_page 502 503 504 /502.html;
    location = /502.html {
        return 503 '{"error":"Service temporarily unavailable","status":503}\n';
        add_header Content-Type application/json always;
    }
}
EOF

  # Enable site
  ln -sf "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/${APP_NAME}"

  # Test and reload
  nginx -t && systemctl reload nginx

  log_ok "Nginx configured for ${DOMAIN}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 10. Setup Firewall (UFW)
# ═══════════════════════════════════════════════════════════════════════════════
setup_firewall() {
  log_step "Setting up firewall (UFW)"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would configure UFW"
    return 0
  fi

  # Reset UFW to known state
  ufw --force reset >/dev/null 2>&1 || true

  # Default policies
  ufw default deny incoming
  ufw default allow outgoing

  # Allow required ports
  ufw allow 22/tcp   comment 'SSH'
  ufw allow 80/tcp   comment 'HTTP'
  ufw allow 443/tcp  comment 'HTTPS'

  # Enable
  ufw --force enable

  log_ok "Firewall enabled: SSH, HTTP, HTTPS allowed"
  log_info "UFW status:"
  ufw status | sed 's/^/  /'
}

# ═══════════════════════════════════════════════════════════════════════════════
# 11. Create Systemd Service for Auto-Start
# ═══════════════════════════════════════════════════════════════════════════════
setup_systemd() {
  log_step "Creating systemd service for auto-start"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would create systemd service"
    return 0
  fi

  cat > "/etc/systemd/system/${APP_NAME}.service" <<EOF
[Unit]
Description=Al-Awael ERP (Docker Compose)
Requires=docker.service
After=docker.service network.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${APP_DIR}
Environment=COMPOSE_FILE=${APP_DIR}/docker-compose.yml
ExecStart=/usr/bin/docker compose -f ${APP_DIR}/docker-compose.yml up -d
ExecStop=/usr/bin/docker compose -f ${APP_DIR}/docker-compose.yml down
ExecReload=/usr/bin/docker compose -f ${APP_DIR}/docker-compose.yml up -d

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable "${APP_NAME}.service"

  log_ok "Systemd service created: ${APP_NAME}.service"
  log_info "  Start:   systemctl start ${APP_NAME}"
  log_info "  Stop:    systemctl stop ${APP_NAME}"
  log_info "  Status:  systemctl status ${APP_NAME}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 12. Setup SSL with Let's Encrypt
# ═══════════════════════════════════════════════════════════════════════════════
setup_ssl() {
  if $SKIP_SSL; then
    log_step "Skipping SSL setup (--skip-ssl)"
    return 0
  fi

  log_step "Setting up SSL with Let's Encrypt"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would install certbot and obtain SSL certificate"
    return 0
  fi

  # Install certbot
  DEBIAN_FRONTEND=noninteractive apt install -y -qq certbot python3-certbot-nginx

  # Obtain certificate
  if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
    --agree-tos --non-interactive --email "$ADMIN_EMAIL" 2>/dev/null; then
    log_ok "SSL certificate obtained for ${DOMAIN}"
  else
    log_warn "Could not obtain SSL certificate automatically."
    log_warn "Run manually after DNS is configured:"
    log_warn "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
  fi

  # Setup auto-renewal cron (certbot usually does this automatically)
  if ! crontab -l 2>/dev/null | grep -q certbot; then
    (crontab -l 2>/dev/null || true; echo "0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -
    log_ok "Auto-renewal cron job added"
  fi

  # Verify
  if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    log_ok "SSL certificate ready: /etc/letsencrypt/live/${DOMAIN}/"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# 13. Setup Backup Cron
# ═══════════════════════════════════════════════════════════════════════════════
setup_backups() {
  if $SKIP_BACKUP; then
    log_step "Skipping backup setup (--skip-backup)"
    return 0
  fi

  log_step "Setting up automated backups"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would add backup cron job"
    return 0
  fi

  # Ensure backup directory exists
  mkdir -p "$BACKUP_DIR"
  chown alawael:alawael "$BACKUP_DIR"

  # Add cron job for daily backup at 2:00 AM
  if ! crontab -u root -l 2>/dev/null | grep -q "backup.sh"; then
    (crontab -u root -l 2>/dev/null || true; \
      echo "0 2 * * * ${APP_DIR}/scripts/backup.sh mongo-only local >> ${LOG_DIR}/backup.log 2>&1") | \
      crontab -u root -
    log_ok "Daily backup cron added (2:00 AM)"
  else
    log_ok "Backup cron already exists"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# 14. Setup Log Rotation
# ═══════════════════════════════════════════════════════════════════════════════
setup_logrotate() {
  log_step "Setting up log rotation"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would configure logrotate"
    return 0
  fi

  # Logrotate for application logs
  cat > "/etc/logrotate.d/${APP_NAME}" <<EOF
${APP_DIR}/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 alawael alawael
    sharedscripts
}

${LOG_DIR}/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
EOF

  log_ok "Log rotation configured"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 15. Run Health Check
# ═══════════════════════════════════════════════════════════════════════════════
run_health_check() {
  if $SKIP_MONITORING; then
    log_step "Skipping health check (--skip-monitoring)"
    return 0
  fi

  log_step "Running health check"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would run health-check.sh"
    return 0
  fi

  # Wait a bit for services to fully start
  sleep 5

  if [[ -f "${APP_DIR}/scripts/health-check.sh" ]]; then
    cd "$APP_DIR"
    if ./scripts/health-check.sh; then
      log_ok "Health check passed"
    else
      log_warn "Health check detected issues. Review logs above."
    fi
  else
    log_warn "health-check.sh not found. Skipping."
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# 16. Final Summary
# ═══════════════════════════════════════════════════════════════════════════════
print_summary() {
  echo ""
  echo "═══════════════════════════════════════════════════════════════════════════════"
  echo -e "${GREEN}${BOLD}           Al-Awael ERP — VPS Setup Complete${NC}"
  echo "═══════════════════════════════════════════════════════════════════════════════"
  echo ""
  echo -e "  ${BOLD}Application Directory:${NC}  ${APP_DIR}"
  echo -e "  ${BOLD}Backup Directory:${NC}       ${BACKUP_DIR}"
  echo -e "  ${BOLD}Log Directory:${NC}          ${LOG_DIR}"
  echo -e "  ${BOLD}Domain:${NC}                 ${DOMAIN}"
  echo ""
  echo -e "  ${BOLD}Useful Commands:${NC}"
  echo -e "    ${CYAN}cd ${APP_DIR} && docker compose ps${NC}      — Check service status"
  echo -e "    ${CYAN}cd ${APP_DIR} && docker compose logs -f${NC} — View logs"
  echo -e "    ${CYAN}cd ${APP_DIR} && ./scripts/health-check.sh${NC} — Health check"
  echo -e "    ${CYAN}cd ${APP_DIR} && ./scripts/backup.sh full local${NC} — Manual backup"
  echo -e "    ${CYAN}systemctl start|stop ${APP_NAME}${NC}      — Start/stop services"
  echo -e "    ${CYAN}ufw status${NC}                             — Firewall status"
  echo ""
  echo -e "  ${BOLD}Important URLs:${NC}"
  echo -e "    ${CYAN}http://${DOMAIN}${NC}          — Application (HTTP)"
  if ! $SKIP_SSL; then
    echo -e "    ${CYAN}https://${DOMAIN}${NC}         — Application (HTTPS)"
  fi
  echo -e "    ${CYAN}http://${DOMAIN}/health${NC}    — Health endpoint"
  echo ""
  if ! $SKIP_SSL; then
    echo -e "  ${BOLD}SSL:${NC}"
    echo -e "    Auto-renewal: Enabled via cron"
    echo -e "    Test: ${CYAN}certbot renew --dry-run${NC}"
    echo ""
  fi
  echo -e "  ${BOLD}Next Steps:${NC}"
  echo -e "    1. Review ${YELLOW}${APP_DIR}/.env${NC} and update all required values"
  echo -e "    2. Set DNS A record for ${DOMAIN} → YOUR_VPS_IP"
  echo -e "    3. If SSL failed, run: ${CYAN}./scripts/letsencrypt-setup.sh${NC}"
  echo -e "    4. Test the application: ${CYAN}curl http://localhost/health${NC}"
  echo ""
  echo "═══════════════════════════════════════════════════════════════════════════════"
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════
main() {
  parse_args "$@"

  echo -e "${CYAN}"
  echo "╔══════════════════════════════════════════════════════════════════════════════╗"
  echo "║           Al-Awael ERP — VPS Setup Script                                     ║"
  echo "╚══════════════════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  if $DRY_RUN; then
    log_warn "DRY RUN MODE — No changes will be made"
    echo ""
  fi

  preflight
  update_system
  install_docker
  install_nginx
  install_nodejs
  setup_app_directory
  clone_repo
  setup_env
  start_services
  configure_nginx
  setup_firewall
  setup_systemd
  setup_ssl
  setup_backups
  setup_logrotate
  run_health_check

  print_summary

  log_ok "Setup complete!"
}

main "$@"

# ═══════════════════════════════════════════════════════════════════════════════
# Make this script executable:
#   chmod +x scripts/setup-vps.sh
# Run:
#   sudo ./scripts/setup-vps.sh --domain alawael.org --email admin@alawael.org --repo https://github.com/YOUR_ORG/alawael-erp.git
# ═══════════════════════════════════════════════════════════════════════════════
