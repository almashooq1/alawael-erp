#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — Let's Encrypt SSL Setup Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage: sudo ./scripts/letsencrypt-setup.sh [OPTIONS]
#
# Options:
#   --domain DOMAIN     Primary domain (default: alawael.org)
#   --email EMAIL       Contact email for Let's Encrypt (default: admin@alawael.org)
#   --staging           Use Let's Encrypt staging server (for testing)
#   --dry-run           Test the setup without making changes
#   --force             Force renewal even if not expired
#   --help              Show this help message
#
# This script is idempotent — safe to run multiple times.
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════
DOMAIN="alawael.org"
ADMIN_EMAIL="admin@alawael.org"
USE_STAGING=false
DRY_RUN=false
FORCE_RENEW=false

APP_NAME="alawael-erp"
APP_DIR="/opt/${APP_NAME}"
CERT_DIR="/etc/letsencrypt/live"
WEBROOT="/var/www/certbot"

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
      --staging)
        USE_STAGING=true
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --force)
        FORCE_RENEW=true
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

  # Check if Nginx is installed
  if ! command -v nginx &>/dev/null; then
    log_error "Nginx is not installed. Run setup-vps.sh first or install Nginx manually."
    exit 1
  fi
  log_ok "Nginx found: $(nginx -v 2>&1 | head -1)"

  # Check if domain resolves to this server (warn only)
  local server_ip
  server_ip=$(curl -fsSL https://api.ipify.org 2>/dev/null || \
    hostname -I | awk '{print $1}' || echo "unknown")
  log_info "Server IP: ${server_ip}"

  local domain_ip
  domain_ip=$(dig +short "$DOMAIN" 2>/dev/null || nslookup "$DOMAIN" 2>/dev/null | \
    awk '/^Address: / {print $2}' | head -1 || echo "unknown")

  if [[ "$domain_ip" == "unknown" || -z "$domain_ip" ]]; then
    log_warn "Cannot resolve ${DOMAIN} — DNS A record may not be configured yet."
    log_warn "Make sure ${DOMAIN} points to ${server_ip} before continuing."
    log_warn "Continuing anyway..."
  elif [[ "$domain_ip" != "$server_ip" ]]; then
    log_warn "Domain ${DOMAIN} resolves to ${domain_ip}, but this server is ${server_ip}."
    log_warn "DNS A record must point to this server for SSL to work."
    log_warn "Continuing anyway..."
  else
    log_ok "DNS verified: ${DOMAIN} → ${server_ip}"
  fi

  # Check if port 80 is accessible (needed for ACME challenge)
  if ss -tlnp | grep -q ':80 '; then
    log_ok "Port 80 is open"
  else
    log_warn "Port 80 does not appear to be listening. Nginx may need configuration."
  fi

  # Check email validity
  if [[ ! "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    log_error "Invalid email address: ${ADMIN_EMAIL}"
    exit 1
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# 1. Install Certbot
# ═══════════════════════════════════════════════════════════════════════════════
install_certbot() {
  log_step "Installing Certbot"

  if command -v certbot &>/dev/null; then
    log_ok "Certbot already installed: $(certbot --version 2>&1 | head -1)"
    return 0
  fi

  if $DRY_RUN; then
    log_info "[DRY RUN] Would install certbot and python3-certbot-nginx"
    return 0
  fi

  DEBIAN_FRONTEND=noninteractive apt update -qq
  DEBIAN_FRONTEND=noninteractive apt install -y -qq certbot python3-certbot-nginx

  log_ok "Certbot installed: $(certbot --version 2>&1 | head -1)"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 2. Prepare Webroot for ACME Challenge
# ═══════════════════════════════════════════════════════════════════════════════
prepare_webroot() {
  log_step "Preparing ACME challenge webroot"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would create ${WEBROOT}"
    return 0
  fi

  mkdir -p "$WEBROOT"
  chown -R www-data:www-data "$WEBROOT"
  chmod 755 "$WEBROOT"

  # Ensure Nginx serves the webroot
  if ! grep -q "\.well-known/acme-challenge" /etc/nginx/sites-enabled/* 2>/dev/null; then
    log_info "Adding ACME challenge location to Nginx..."

    # Create a temporary snippet
    cat > "/etc/nginx/snippets/letsencrypt.conf" <<'EOF'
# Let's Encrypt ACME challenge
location /.well-known/acme-challenge/ {
    root /var/www/certbot;
    try_files $uri =404;
}
EOF

    # Add include to the main site config if it exists
    local site_config
    site_config="/etc/nginx/sites-available/${APP_NAME}"
    if [[ -f "$site_config" ]]; then
      if ! grep -q "include.*letsencrypt.conf" "$site_config"; then
        sed -i '/server_name/i\    include /etc/nginx/snippets/letsencrypt.conf;\n' "$site_config"
        nginx -t && systemctl reload nginx
      fi
    fi
  fi

  log_ok "ACME webroot ready: ${WEBROOT}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 3. Obtain SSL Certificate
# ═══════════════════════════════════════════════════════════════════════════════
obtain_certificate() {
  log_step "Obtaining SSL certificate for ${DOMAIN}"

  local certbot_args=()
  certbot_args+=(--nginx)
  certbot_args+=(-d "$DOMAIN")
  certbot_args+=(-d "www.$DOMAIN")
  certbot_args+=(--agree-tos)
  certbot_args+=(--non-interactive)
  certbot_args+=(--email "$ADMIN_EMAIL")

  if $USE_STAGING; then
    certbot_args+=(--staging)
    log_warn "Using Let's Encrypt STAGING server (not production!)"
  fi

  if $DRY_RUN; then
    certbot_args+=(--dry-run)
    log_info "[DRY RUN] Would run: certbot ${certbot_args[*]}"
    return 0
  fi

  if $FORCE_RENEW; then
    certbot_args+=(--force-renewal)
  fi

  # Check if certificate already exists
  if [[ -f "${CERT_DIR}/${DOMAIN}/fullchain.pem" ]] && ! $FORCE_RENEW; then
    log_info "Certificate already exists for ${DOMAIN}"
    local expiry
    expiry=$(openssl x509 -noout -enddate -in "${CERT_DIR}/${DOMAIN}/fullchain.pem" 2>/dev/null | \
      cut -d= -f2)
    log_info "  Current expiry: ${expiry}"

    local days_until_expiry
    days_until_expiry=$(echo "$(openssl x509 -noout -enddate -in "${CERT_DIR}/${DOMAIN}/fullchain.pem" 2>/dev/null | \
      cut -d= -f2 | xargs -I {} date -d "{}" +%s) - $(date +%s)" | bc)
    days_until_expiry=$((days_until_expiry / 86400))
    log_info "  Days until expiry: ${days_until_expiry}"

    if [[ "$days_until_expiry" -gt 30 ]]; then
      log_ok "Certificate is valid for ${days_until_expiry} more days. No action needed."
      log_info "Use --force to renew anyway."
      return 0
    fi

    log_warn "Certificate expires in ${days_until_expiry} days. Renewing..."
    certbot_args+=(--renew-by-default)
  fi

  # Run certbot
  log_info "Running: certbot ${certbot_args[*]}"
  if certbot "${certbot_args[@]}"; then
    log_ok "SSL certificate obtained successfully"
  else
    log_error "SSL certificate issuance failed"
    log_info "Common causes:"
    log_info "  - DNS A record not pointing to this server"
    log_info "  - Port 80 blocked by firewall"
    log_info "  - Nginx not running or misconfigured"
    log_info "  - Domain already has a certificate from another CA"
    exit 1
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# 4. Verify Certificate
# ═══════════════════════════════════════════════════════════════════════════════
verify_certificate() {
  log_step "Verifying SSL certificate"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would verify certificate"
    return 0
  fi

  local cert_path="${CERT_DIR}/${DOMAIN}/fullchain.pem"
  local key_path="${CERT_DIR}/${DOMAIN}/privkey.pem"

  if [[ ! -f "$cert_path" ]]; then
    log_error "Certificate not found: ${cert_path}"
    return 1
  fi

  if [[ ! -f "$key_path" ]]; then
    log_error "Private key not found: ${key_path}"
    return 1
  fi

  # Verify certificate details
  local cert_subject
  cert_subject=$(openssl x509 -noout -subject -in "$cert_path" 2>/dev/null | sed 's/subject=//')
  local cert_issuer
  cert_issuer=$(openssl x509 -noout -issuer -in "$cert_path" 2>/dev/null | sed 's/issuer=//')
  local cert_start
  cert_start=$(openssl x509 -noout -startdate -in "$cert_path" 2>/dev/null | cut -d= -f2)
  local cert_end
  cert_end=$(openssl x509 -noout -enddate -in "$cert_path" 2>/dev/null | cut -d= -f2)
  local cert_san
  cert_san=$(openssl x509 -noout -text -in "$cert_path" 2>/dev/null | \
    grep -A1 "Subject Alternative Name" | tail -1 | xargs)

  log_info "Certificate subject: ${cert_subject}"
  log_info "Certificate issuer:  ${cert_issuer}"
  log_info "Valid from:        ${cert_start}"
  log_info "Valid until:       ${cert_end}"
  log_info "SAN:               ${cert_san}"

  # Verify certificate and key match
  local cert_md5 key_md5
  cert_md5=$(openssl x509 -noout -modulus -in "$cert_path" 2>/dev/null | md5sum | awk '{print $1}')
  key_md5=$(openssl rsa -noout -modulus -in "$key_path" 2>/dev/null | md5sum | awk '{print $1}')

  if [[ "$cert_md5" == "$key_md5" ]]; then
    log_ok "Certificate and private key match"
  else
    log_error "Certificate and private key DO NOT match!"
    return 1
  fi

  # Check chain validity
  if openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt "$cert_path" >/dev/null 2>&1; then
    log_ok "Certificate chain is valid"
  else
    log_warn "Certificate chain verification had issues (may be staging cert)"
  fi

  log_ok "Certificate verification complete"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 5. Configure Nginx for SSL
# ═══════════════════════════════════════════════════════════════════════════════
configure_nginx_ssl() {
  log_step "Configuring Nginx for SSL"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would configure Nginx SSL settings"
    return 0
  fi

  # The certbot --nginx plugin already updated the Nginx config.
  # We just need to ensure the SSL settings are optimal.

  local site_config
  site_config="/etc/nginx/sites-available/${APP_NAME}"

  if [[ ! -f "$site_config" ]]; then
    log_warn "Site config not found: ${site_config}"
    log_info "Certbot may have created a different config. Checking..."
    site_config=$(find /etc/nginx/sites-enabled -type f | head -1)
    if [[ -z "$site_config" ]]; then
      log_error "No Nginx site config found. Cannot configure SSL."
      return 1
    fi
  fi

  # Add or update SSL security settings
  if ! grep -q "ssl_session_cache" "$site_config"; then
    log_info "Adding SSL hardening settings to Nginx..."

    # Create SSL snippet
    cat > /etc/nginx/snippets/ssl-params.conf <<'EOF'
# Modern SSL parameters (A+ rating on SSL Labs)
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:20m;
ssl_session_timeout 1d;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
resolver 1.1.1.1 8.8.8.8 valid=300s;
resolver_timeout 5s;

# HSTS
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
EOF

    # Add include to site config
    if ! grep -q "include.*ssl-params.conf" "$site_config"; then
      sed -i '/listen 443/a\\n    # SSL parameters\n    include /etc/nginx/snippets/ssl-params.conf;' "$site_config"
    fi

    nginx -t && systemctl reload nginx
    log_ok "SSL hardening settings applied"
  else
    log_ok "SSL settings already configured"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# 6. Setup Auto-Renewal (Cron)
# ═══════════════════════════════════════════════════════════════════════════════
setup_auto_renewal() {
  log_step "Setting up auto-renewal"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would add auto-renewal cron job"
    return 0
  fi

  # Certbot installs a systemd timer by default, but we also add a cron for safety
  if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null || true; echo "0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -
    log_ok "Auto-renewal cron added (daily at 3:00 AM)"
  else
    log_ok "Auto-renewal cron already exists"
  fi

  # Verify systemd timer (if available)
  if systemctl list-timers --no-pager 2>/dev/null | grep -q certbot; then
    log_ok "Certbot systemd timer is active"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# 7. Test HTTPS
# ═══════════════════════════════════════════════════════════════════════════════
test_https() {
  log_step "Testing HTTPS connectivity"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would test HTTPS"
    return 0
  fi

  # Wait a moment for Nginx to reload
  sleep 2

  # Test via localhost (bypass DNS, but test SSL config)
  local local_test
  local_test=$(echo | openssl s_client -connect localhost:443 -servername "$DOMAIN" 2>/dev/null | \
    openssl x509 -noout -subject 2>/dev/null || echo "")

  if [[ -n "$local_test" ]]; then
    log_ok "SSL handshake successful on localhost:443"
    log_info "  Certificate: ${local_test}"
  else
    log_warn "Local SSL test inconclusive. Nginx may still be reloading."
  fi

  # Test from the internet (if DNS is configured)
  if curl -fsSL "https://${DOMAIN}/health" --max-time 10 >/dev/null 2>&1; then
    log_ok "HTTPS test passed: https://${DOMAIN}/health → 200 OK"
  elif curl -fsSL "https://${DOMAIN}" --max-time 10 >/dev/null 2>&1; then
    log_ok "HTTPS test passed: https://${DOMAIN} → 200 OK"
  else
    log_warn "Could not verify HTTPS from the internet."
    log_info "This is normal if DNS is not yet configured."
    log_info "After DNS propagates, verify with:"
    log_info "  curl -I https://${DOMAIN}"
  fi

  # Test SSL rating (using openssl)
  local ssl_proto
  ssl_proto=$(echo | openssl s_client -connect localhost:443 -servername "$DOMAIN" 2>/dev/null | \
    grep "Protocol" | head -1 | xargs || echo "unknown")
  if [[ -n "$ssl_proto" && "$ssl_proto" != "unknown" ]]; then
    log_info "SSL protocol: ${ssl_proto}"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# 8. Final Summary
# ═══════════════════════════════════════════════════════════════════════════════
print_summary() {
  echo ""
  echo "═══════════════════════════════════════════════════════════════════════════════"
  echo -e "${GREEN}${BOLD}           SSL Setup Complete for ${DOMAIN}${NC}"
  echo "═══════════════════════════════════════════════════════════════════════════════"
  echo ""
  echo -e "  ${BOLD}Certificate path:${NC}  ${CERT_DIR}/${DOMAIN}/"
  echo -e "  ${BOLD}Full chain:${NC}        ${CERT_DIR}/${DOMAIN}/fullchain.pem"
  echo -e "  ${BOLD}Private key:${NC}       ${CERT_DIR}/${DOMAIN}/privkey.pem"
  echo ""
  echo -e "  ${BOLD}Useful Commands:${NC}"
  echo -e "    ${CYAN}certbot certificates${NC}              — List all certificates"
  echo -e "    ${CYAN}certbot renew --dry-run${NC}           — Test auto-renewal"
  echo -e "    ${CYAN}certbot revoke --cert-name ${DOMAIN}${NC} — Revoke certificate"
  echo -e "    ${CYAN}openssl x509 -in ${CERT_DIR}/${DOMAIN}/fullchain.pem -noout -text${NC} — View cert"
  echo ""
  echo -e "  ${BOLD}Verification:${NC}"
  echo -e "    ${CYAN}curl -I https://${DOMAIN}${NC}"
  echo -e "    ${CYAN}echo | openssl s_client -connect ${DOMAIN}:443 -servername ${DOMAIN}${NC}"
  echo ""
  if $USE_STAGING; then
    echo -e "  ${YELLOW}${BOLD}WARNING: Using STAGING certificate!${NC}"
    echo -e "  ${YELLOW}Run again without --staging for production.${NC}"
    echo ""
  fi
  echo -e "  ${BOLD}Auto-renewal:${NC} Enabled via cron (3:00 AM daily)"
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
  echo "║           Al-Awael ERP — Let's Encrypt SSL Setup                              ║"
  echo "╚══════════════════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  if $DRY_RUN; then
    log_warn "DRY RUN MODE — No changes will be made"
    echo ""
  fi

  if $USE_STAGING; then
    log_warn "STAGING MODE — Certificate will NOT be trusted by browsers"
    echo ""
  fi

  preflight
  install_certbot
  prepare_webroot
  obtain_certificate
  verify_certificate
  configure_nginx_ssl
  setup_auto_renewal
  test_https
  print_summary

  log_ok "SSL setup complete!"
}

main "$@"

# ═══════════════════════════════════════════════════════════════════════════════
# Make this script executable:
#   chmod +x scripts/letsencrypt-setup.sh
# Run:
#   sudo ./scripts/letsencrypt-setup.sh --domain alawael.org --email admin@alawael.org
# Test with staging:
#   sudo ./scripts/letsencrypt-setup.sh --domain alawael.org --staging
# ═══════════════════════════════════════════════════════════════════════════════
