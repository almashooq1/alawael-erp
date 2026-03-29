#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# سكربت إعداد Hostinger VPS من الصفر - نظام الأوائل ERP
# Setup Script for Hostinger VPS - Al-Awael ERP System
# ═══════════════════════════════════════════════════════════════════════════════
# الاستخدام / Usage:
#   chmod +x setup-vps-fresh.sh
#   ./setup-vps-fresh.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ─── Variables ────────────────────────────────────────────────────────────────
PROJECT_NAME="alawael-erp"
PROJECT_DIR="/opt/${PROJECT_NAME}"
GITHUB_REPO="https://github.com/almashooq1/alawael-erp.git"
DOCKER_COMPOSE_VERSION="2.24.0"

# ─── Functions ────────────────────────────────────────────────────────────────
log_info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; }
log_error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }

print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║         نظام الأوائل ERP - إعداد Hostinger VPS             ║"
    echo "║         Al-Awael ERP - Hostinger VPS Setup                  ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "يجب تشغيل السكربت كـ root. Run as root: sudo ./setup-vps-fresh.sh"
    fi
    log_success "Running as root"
}

# ─── Step 1: Update System ────────────────────────────────────────────────────
update_system() {
    log_info "📦 Updating system packages..."
    apt-get update -qq
    apt-get upgrade -y -qq
    apt-get install -y -qq \
        curl \
        wget \
        git \
        unzip \
        htop \
        nano \
        ufw \
        fail2ban \
        certbot \
        python3-certbot-nginx \
        nginx \
        openssl
    log_success "System packages updated"
}

# ─── Step 2: Install Docker ───────────────────────────────────────────────────
install_docker() {
    if command -v docker &> /dev/null; then
        log_warning "Docker already installed: $(docker --version)"
        return
    fi

    log_info "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    # Add current user to docker group
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker "$SUDO_USER"
    fi

    log_success "Docker installed: $(docker --version)"
}

# ─── Step 3: Install Docker Compose ──────────────────────────────────────────
install_docker_compose() {
    if docker compose version &> /dev/null; then
        log_warning "Docker Compose already installed: $(docker compose version)"
        return
    fi

    log_info "🐳 Installing Docker Compose plugin..."
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    log_success "Docker Compose installed: $(docker compose version)"
}

# ─── Step 4: Configure Firewall ───────────────────────────────────────────────
configure_firewall() {
    log_info "🔒 Configuring firewall (UFW)..."

    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH
    ufw allow 22/tcp comment 'SSH'

    # Allow HTTP/HTTPS
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'

    # Allow app ports (only if needed externally)
    # ufw allow 3001/tcp comment 'Backend API'
    # ufw allow 8080/tcp comment 'API Gateway'

    ufw --force enable
    log_success "Firewall configured"
}

# ─── Step 5: Clone Repository ─────────────────────────────────────────────────
clone_repository() {
    log_info "📥 Cloning repository..."

    if [ -d "$PROJECT_DIR" ]; then
        log_warning "Project directory already exists. Pulling latest changes..."
        cd "$PROJECT_DIR"
        git fetch origin
        git reset --hard origin/main || git reset --hard origin/master
    else
        mkdir -p "$PROJECT_DIR"
        git clone "$GITHUB_REPO" "$PROJECT_DIR"
        cd "$PROJECT_DIR"
    fi

    log_success "Repository ready at $PROJECT_DIR"
}

# ─── Step 6: Setup Environment ────────────────────────────────────────────────
setup_environment() {
    log_info "⚙️  Setting up environment variables..."

    cd "$PROJECT_DIR"

    if [ ! -f .env ]; then
        cp .env.example .env
        log_warning "Created .env from .env.example"
        log_warning "⚠️  IMPORTANT: Edit .env file with your values!"
        log_warning "   nano ${PROJECT_DIR}/.env"
    else
        log_success ".env file already exists"
    fi

    # Generate secrets if they're empty
    if grep -q "JWT_SECRET=your_jwt_secret_here" .env 2>/dev/null || grep -q "JWT_SECRET=$" .env 2>/dev/null; then
        JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
        log_success "Generated JWT_SECRET"
    fi

    if grep -q "MONGO_ROOT_PASSWORD=$" .env 2>/dev/null || grep -q "MONGO_ROOT_PASSWORD=your" .env 2>/dev/null; then
        MONGO_PASSWORD=$(openssl rand -base64 32 | tr -d '\n/+=' | head -c 20)
        sed -i "s|MONGO_ROOT_PASSWORD=.*|MONGO_ROOT_PASSWORD=${MONGO_PASSWORD}|" .env
        log_success "Generated MongoDB password"
    fi

    if grep -q "REDIS_PASSWORD=$" .env 2>/dev/null || grep -q "REDIS_PASSWORD=your" .env 2>/dev/null; then
        REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '\n/+=' | head -c 20)
        sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=${REDIS_PASSWORD}|" .env
        log_success "Generated Redis password"
    fi
}

# ─── Step 7: Setup Nginx Reverse Proxy ───────────────────────────────────────
setup_nginx() {
    log_info "🌐 Configuring Nginx..."

    read -r -p "Enter your domain name (e.g., erp.yourdomain.com) or press Enter to skip: " DOMAIN

    if [ -n "$DOMAIN" ]; then
        cat > /etc/nginx/sites-available/alawael-erp << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Frontend
    location / {
        proxy_pass http://localhost:3004;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # API Gateway
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8080/health;
    }
}
EOF

        ln -sf /etc/nginx/sites-available/alawael-erp /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default

        nginx -t && systemctl reload nginx
        log_success "Nginx configured for domain: $DOMAIN"

        # Setup SSL
        read -r -p "Setup SSL with Let's Encrypt? (y/n): " SSL_CHOICE
        if [ "$SSL_CHOICE" = "y" ]; then
            read -r -p "Enter your email for SSL certificate: " SSL_EMAIL
            certbot --nginx -d "$DOMAIN" -d "www.${DOMAIN}" --email "$SSL_EMAIL" --agree-tos --non-interactive
            log_success "SSL certificate installed"
        fi
    else
        log_warning "Skipping domain/SSL setup. You can configure it later."
    fi
}

# ─── Step 8: Start Services ───────────────────────────────────────────────────
start_services() {
    log_info "🚀 Starting Al-Awael ERP services..."
    cd "$PROJECT_DIR"

    # Build and start core services first
    log_info "Starting infrastructure services..."
    docker compose up -d mongodb redis nats minio elasticsearch postgres

    log_info "Waiting for infrastructure to be ready (30s)..."
    sleep 30

    # Start all services
    log_info "Starting all application services..."
    docker compose up -d --build

    log_success "Services started!"
}

# ─── Step 9: Setup Auto-restart & Monitoring ─────────────────────────────────
setup_autostart() {
    log_info "⚙️  Setting up auto-start on boot..."

    cat > /etc/systemd/system/alawael-erp.service << EOF
[Unit]
Description=Al-Awael ERP Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${PROJECT_DIR}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable alawael-erp
    log_success "Auto-start service configured"
}

# ─── Step 10: Setup Log Rotation ──────────────────────────────────────────────
setup_log_rotation() {
    cat > /etc/logrotate.d/alawael-erp << EOF
${PROJECT_DIR}/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF
    log_success "Log rotation configured"
}

# ─── Print Summary ─────────────────────────────────────────────────────────────
print_summary() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ Setup Completed Successfully!                ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📁 Project Directory:${NC} $PROJECT_DIR"
    echo -e "${CYAN}🔧 Environment File:${NC}  $PROJECT_DIR/.env"
    echo ""
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "   1. Edit environment variables: nano $PROJECT_DIR/.env"
    echo "   2. Check services: docker compose -f $PROJECT_DIR/docker-compose.yml ps"
    echo "   3. View logs: docker compose -f $PROJECT_DIR/docker-compose.yml logs -f"
    echo ""
    echo -e "${CYAN}🌐 Access Points:${NC}"
    VPS_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    echo "   Frontend:   http://${VPS_IP}:3004"
    echo "   API Gateway: http://${VPS_IP}:8080"
    echo "   Backend:    http://${VPS_IP}:3001"
    echo ""
    echo -e "${YELLOW}🔑 GitHub Actions Secrets Required:${NC}"
    echo "   VPS_HOST:    ${VPS_IP}"
    echo "   VPS_USER:    $(whoami)"
    echo "   VPS_SSH_KEY: [Your private SSH key]"
    echo ""
}

# ─── Main Execution ────────────────────────────────────────────────────────────
main() {
    print_banner
    check_root
    update_system
    install_docker
    install_docker_compose
    configure_firewall
    clone_repository
    setup_environment
    setup_nginx
    start_services
    setup_autostart
    setup_log_rotation
    print_summary
}

main "$@"
