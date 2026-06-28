#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  Al-Awael ERP — Complete VPS Setup Script (Copy-Paste Ready)
#  يُشغَّل مرة واحدة على VPS Ubuntu 22.04/24.04 fresh
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log_info()  { echo -e "${BLUE}ℹ${NC}  $*"; }
log_ok()    { echo -e "${GREEN}✓${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
log_error() { echo -e "${RED}✗${NC}  $*" >&2; }
log_step()  { echo -e "${CYAN}▶${NC}  ${BOLD}$*${NC}"; }

# ─── Config ───────────────────────────────────────────────────────────────────
APP_USER="alawael"
APP_DIR="/opt/alawael-erp"
REPO_URL="https://github.com/almashooq1/alawael-erp.git"
SSH_KEY_FILE="/home/${APP_USER}/.ssh/github_deploy"

# ─── Banner ───────────────────────────────────────────────────────────────────
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║           Al-Awael ERP — VPS Complete Setup Script                          ║"
echo "║           يُشغَّل مرة واحدة على VPS Ubuntu 22.04/24.04                        ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── 1. Check if running as root ──────────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
    log_error "This script must be run as root (sudo)"
    log_info "Usage: sudo bash setup-vps-full.sh"
    exit 1
fi

# ─── 2. Update system & install basics ──────────────────────────────────────
log_step "Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y curl wget gnupg2 software-properties-common \
    apt-transport-https ca-certificates lsb-release git nano ufw
log_ok "System updated"

# ─── 3. Set timezone ──────────────────────────────────────────────────────────
log_step "Setting timezone to Asia/Riyadh..."
timedatectl set-timezone Asia/Riyadh
log_ok "Timezone set: $(date)"

# ─── 4. Install Docker ────────────────────────────────────────────────────────
log_step "Installing Docker Engine..."
if command -v docker &>/dev/null; then
    log_ok "Docker already installed: $(docker --version)"
else
    curl -fsSL https://get.docker.com | sh
    log_ok "Docker installed"
fi

# Enable and start Docker
systemctl enable docker
systemctl start docker
log_ok "Docker service enabled & started"

# ─── 5. Install Docker Compose Plugin ─────────────────────────────────────────
log_step "Installing Docker Compose plugin..."
if docker compose version &>/dev/null; then
    log_ok "Docker Compose already installed: $(docker compose version --short)"
else
    apt-get install -y docker-compose-plugin
    log_ok "Docker Compose installed"
fi

# ─── 6. Create deployment user ────────────────────────────────────────────────
log_step "Creating deployment user '${APP_USER}'..."
if id "$APP_USER" &>/dev/null; then
    log_ok "User '${APP_USER}' already exists"
else
    adduser --disabled-password --gecos "" "$APP_USER"
    usermod -aG sudo "$APP_USER"
    log_ok "User '${APP_USER}' created and added to sudo group"
fi

# Add user to docker group
usermod -aG docker "$APP_USER"
log_ok "User '${APP_USER}' added to docker group"

# ─── 7. Clone repository ────────────────────────────────────────────────────
log_step "Cloning repository..."
if [ -d "$APP_DIR/.git" ]; then
    log_ok "Repository already cloned at ${APP_DIR}"
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
    log_ok "Code updated to latest main"
else
    mkdir -p "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    chown -R "${APP_USER}:${APP_USER}" "$APP_DIR"
    log_ok "Repository cloned to ${APP_DIR}"
fi

# ─── 8. Generate secrets ──────────────────────────────────────────────────────
log_step "Generating secrets..."

generate_secret() {
    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 2>/dev/null || \
    openssl rand -hex 64
}

MONGO_ROOT_PASSWORD=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=$(generate_secret)
JWT_REFRESH_SECRET=$(generate_secret)
SETUP_SECRET_KEY=$(generate_secret)
ADMIN_PASSWORD=$(openssl rand -hex 16)

log_ok "Secrets generated"

# ─── 9. Create .env file ───────────────────────────────────────────────────────
log_step "Creating .env file..."

ENV_FILE="${APP_DIR}/.env"
if [ -f "$ENV_FILE" ]; then
    log_warn ".env already exists — backing up to .env.backup.$(date +%Y%m%d-%H%M%S)"
    cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d-%H%M%S)"
fi

cat > "$ENV_FILE" <<EOF
# ═══════════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — Production Environment Variables
# Generated automatically by setup-vps-full.sh on $(date)
# ═══════════════════════════════════════════════════════════════════════════════

# ─── REQUIRED SECRETS ───────────────────────────────────────────────────────
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
SETUP_SECRET_KEY=${SETUP_SECRET_KEY}
ADMIN_EMAIL=admin@alawael.com
ADMIN_PASSWORD=${ADMIN_PASSWORD}

# ─── Environment ────────────────────────────────────────────────────────────
NODE_ENV=production
TZ=Asia/Riyadh
LOG_LEVEL=warn

# ─── Ports ──────────────────────────────────────────────────────────────────
BACKEND_PORT=3001
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

# ─── CORS ───────────────────────────────────────────────────────────────────
# ⚠️  IMPORTANT: Replace YOUR_VPS_IP with your actual VPS IP address!
#    You can find it with: curl -4 icanhazip.com
CORS_ORIGINS=http://localhost,http://YOUR_VPS_IP
FRONTEND_URL=http://YOUR_VPS_IP

# ─── JWT ────────────────────────────────────────────────────────────────────
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ─── Redis ──────────────────────────────────────────────────────────────────
REDIS_ENABLED=true
DISABLE_REDIS=false

# ─── MongoDB Connection (auto-built from secrets above) ─────────────────────
MONGODB_URI=mongodb://admin:${MONGO_ROOT_PASSWORD}@mongodb:27017/alawael-erp?authSource=admin&directConnection=true

# ─── Redis Connection (auto-built from secrets above) ───────────────────────
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# ─── Build Info ─────────────────────────────────────────────────────────────
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
GIT_SHA=setup-vps-full
EOF

chown "${APP_USER}:${APP_USER}" "$ENV_FILE"
chmod 600 "$ENV_FILE"
log_ok ".env created at ${ENV_FILE}"

# ─── 10. Generate SSH Key for GitHub Actions ─────────────────────────────────
log_step "Generating SSH key for GitHub Actions..."

# Switch to app user to generate key in their home directory
su - "$APP_USER" -c "
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    if [ -f ${SSH_KEY_FILE} ]; then
        echo 'SSH key already exists'
    else
        ssh-keygen -t ed25519 -f ${SSH_KEY_FILE} -C 'github-actions-deploy' -N ''
        cat ${SSH_KEY_FILE}.pub >> ~/.ssh/authorized_keys
        chmod 600 ~/.ssh/authorized_keys
    fi
"

log_ok "SSH key generated"

# ─── 11. Fix permissions ────────────────────────────────────────────────────
log_step "Fixing permissions..."
chown -R "${APP_USER}:${APP_USER}" "$APP_DIR"
find "$APP_DIR" -type f -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
log_ok "Permissions fixed"

# ─── 12. Configure Firewall (UFW) ─────────────────────────────────────────────
log_step "Configuring firewall..."
if command -v ufw &>/dev/null; then
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    # Allow backend port directly (for health checks)
    ufw allow 3001/tcp comment 'Backend API'
    
    # Enable UFW if not already enabled
    if ! ufw status | grep -q "Status: active"; then
        echo "y" | ufw enable
    fi
    log_ok "Firewall configured: ports 22, 80, 443, 3001 allowed"
else
    log_warn "UFW not installed — skipping firewall setup"
fi

# ─── 13. Print summary ────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅ VPS Setup Complete!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

EXTERNAL_IP=$(curl -sf -4 icanhazip.com 2>/dev/null || curl -sf -4 ifconfig.me 2>/dev/null || echo "YOUR_VPS_IP")

log_info "App Directory: ${APP_DIR}"
log_info "App User:      ${APP_USER}"
log_info "VPS IP:        ${EXTERNAL_IP}"
echo ""

log_info "🔑 IMPORTANT: Update .env with your VPS IP:"
echo "   sed -i 's/YOUR_VPS_IP/${EXTERNAL_IP}/g' ${APP_DIR}/.env"
echo ""

log_info "🔑 SSH Private Key for GitHub Actions (copy this ENTIRE block):"
echo -e "${YELLOW}───────────────────────────────────────────────────────────────────────────────${NC}"
cat "${SSH_KEY_FILE}"
echo -e "${YELLOW}───────────────────────────────────────────────────────────────────────────────${NC}"
echo ""

log_info "📋 Next steps:"
echo "   1. Copy the SSH key above to GitHub Secrets → VPS_SSH_KEY"
echo "   2. Add these secrets to GitHub:"
echo "      • VPS_HOST     = ${EXTERNAL_IP}"
echo "      • VPS_USER     = ${APP_USER}"
echo "      • VPS_SSH_KEY  = (the entire key above)"
echo ""
echo "   3. Test deployment:"
echo "      cd ${APP_DIR}"
echo "      docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build"
echo ""
echo "   4. Verify:"
echo "      curl http://${EXTERNAL_IP}:3001/health"
echo ""
echo "   5. Then push to main to trigger automatic deployment:"
echo "      git push origin main"
echo ""

log_warn "⚠️  Save these secrets somewhere safe (password manager):"
echo "   MONGO_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}"
echo "   REDIS_PASSWORD:      ${REDIS_PASSWORD}"
echo "   ADMIN_PASSWORD:      ${ADMIN_PASSWORD}"
echo ""

log_info "📝 Admin login after first deploy:"
echo "   Email:    admin@alawael.com"
echo "   Password: ${ADMIN_PASSWORD}"
echo ""

log_info "📖 Full guide: ${APP_DIR}/DEPLOYMENT_SETUP.md"

# ─── Save secrets to a file for the user ──────────────────────────────────────
SECRETS_FILE="${APP_DIR}/.secrets-backup-$(date +%Y%m%d-%H%M%S).txt"
cat > "$SECRETS_FILE" <<EOF
Al-Awael ERP — Secrets Backup ($(date))
═══════════════════════════════════════════════════════════════════════════════
VPS IP: ${EXTERNAL_IP}
Admin Email: admin@alawael.com
Admin Password: ${ADMIN_PASSWORD}
MONGO_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
REDIS_PASSWORD: ${REDIS_PASSWORD}
JWT_SECRET: ${JWT_SECRET}
JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
SETUP_SECRET_KEY: ${SETUP_SECRET_KEY}
═══════════════════════════════════════════════════════════════════════════════
⚠️  IMPORTANT: Store this file securely and delete it after saving to password manager!
EOF
chmod 600 "$SECRETS_FILE"
chown "${APP_USER}:${APP_USER}" "$SECRETS_FILE"
log_warn "Secrets saved to: ${SECRETS_FILE} (secure this file!)"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
