#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  Al-Awael ERP — Pre-Deployment Checks
#  فحوصات ما قبل النشر
#
#  Usage: bash pre-deploy-checks.sh [--fix] [--verbose]
#  Run from: VPS at /home/alawael/app
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

APP_DIR="${APP_DIR:-/home/alawael/app}"
BACKEND_DIR="$APP_DIR/backend"
LOG_DIR="/home/alawael/logs"
PASSED=0
FAILED=0
WARNINGS=0

# ── Colors ─────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── Args ────────────────────────────────────────────────────────────
FIX_MODE=false
VERBOSE=false
for arg in "$@"; do
  [ "$arg" = "--fix" ]     && FIX_MODE=true
  [ "$arg" = "--verbose" ] && VERBOSE=true
done

# ── Helpers ─────────────────────────────────────────────────────────
banner() {
  echo -e "\n${CYAN}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║  $1$(printf '%*s' $((44 - ${#1})) '')║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
}
pass()  { echo -e "  ${GREEN}✅ $1${NC}"; ((PASSED++)); }
fail()  { echo -e "  ${RED}❌ $1${NC}"; ((FAILED++)); }
warn()  { echo -e "  ${YELLOW}⚠️  $1${NC}"; ((WARNINGS++)); }
info()  { $VERBOSE && echo -e "  ${BLUE}ℹ️  $1${NC}" || true; }
check() { echo -e "\n  ${CYAN}▶ $1${NC}"; }

# ══════════════════════════════════════════════════════════════════
# 1. System Requirements
# ══════════════════════════════════════════════════════════════════
banner "Al-Awael ERP — Pre-Deploy Checks"
echo -e "  Environment: ${YELLOW}production${NC}"
echo -e "  App Dir:     $APP_DIR"
echo -e "  Time:        $(date '+%Y-%m-%d %H:%M:%S %Z')"

check "System Requirements"

# Node.js version
if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v\([0-9]*\).*/\1/')
  if [ "$NODE_MAJOR" -ge 18 ]; then
    pass "Node.js $NODE_VER (≥18 required)"
  else
    fail "Node.js $NODE_VER — needs ≥18"
  fi
else
  fail "Node.js not installed"
fi

# npm
if command -v npm &>/dev/null; then
  pass "npm $(npm --version)"
else
  fail "npm not installed"
fi

# PM2
if command -v pm2 &>/dev/null; then
  pass "PM2 $(pm2 --version)"
else
  warn "PM2 not installed (needed for app management)"
fi

# mongosh / mongo
if command -v mongosh &>/dev/null; then
  pass "mongosh $(mongosh --version 2>/dev/null | head -1)"
elif command -v mongo &>/dev/null; then
  pass "mongo client available"
else
  warn "MongoDB client not found (needed for db:setup)"
fi

# Nginx
if command -v nginx &>/dev/null; then
  pass "Nginx $(nginx -v 2>&1 | sed 's/.*\///' )"
else
  warn "Nginx not found"
fi

# Disk space (need at least 500MB free)
FREE_MB=$(df -m "$APP_DIR" 2>/dev/null | tail -1 | awk '{print $4}' || echo 0)
if [ "$FREE_MB" -ge 500 ]; then
  pass "Disk space: ${FREE_MB}MB free"
else
  fail "Low disk space: ${FREE_MB}MB (need ≥500MB)"
fi

# Memory (need at least 512MB free)
FREE_RAM=$(free -m 2>/dev/null | awk '/^Mem:/{print $7}' || echo 0)
if [ "$FREE_RAM" -ge 512 ]; then
  pass "Free RAM: ${FREE_RAM}MB"
else
  warn "Low RAM: ${FREE_RAM}MB free (may affect performance)"
fi

# ══════════════════════════════════════════════════════════════════
# 2. File Structure
# ══════════════════════════════════════════════════════════════════
check "File Structure"

REQUIRED_DIRS=(
  "$BACKEND_DIR"
  "$BACKEND_DIR/scripts"
  "$BACKEND_DIR/database"
  "$BACKEND_DIR/seeds"
  "$APP_DIR/frontend/build"
  "$LOG_DIR"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    info "Found: $dir"
    pass "Directory exists: $(basename $dir)"
  else
    if $FIX_MODE; then
      mkdir -p "$dir"
      warn "Created missing directory: $dir"
    else
      fail "Missing directory: $dir"
    fi
  fi
done

REQUIRED_FILES=(
  "$BACKEND_DIR/server.js"
  "$BACKEND_DIR/package.json"
  "$BACKEND_DIR/.env"
  "$BACKEND_DIR/scripts/setup-database.js"
  "$BACKEND_DIR/database/index.js"
  "$APP_DIR/ecosystem.config.js"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    info "Found: $file"
    pass "File exists: $(basename $file)"
  else
    fail "Missing required file: $file"
  fi
done

# ══════════════════════════════════════════════════════════════════
# 3. Environment Variables
# ══════════════════════════════════════════════════════════════════
check "Environment Variables"

ENV_FILE="$BACKEND_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  # Check required keys
  REQUIRED_VARS=(
    "NODE_ENV"
    "PORT"
    "MONGODB_URI"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
  )

  OPTIONAL_VARS=(
    "REDIS_HOST"
    "REDIS_PORT"
    "FRONTEND_URL"
    "CORS_ORIGINS"
  )

  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" "$ENV_FILE" && [ -n "$(grep "^${var}=" "$ENV_FILE" | cut -d= -f2-)" ]; then
      info "Found: $var"
      pass "Required env: $var"
    else
      fail "Missing required env: $var in .env"
    fi
  done

  for var in "${OPTIONAL_VARS[@]}"; do
    if grep -q "^${var}=" "$ENV_FILE"; then
      info "Optional env: $var ✓"
    else
      warn "Optional env not set: $var"
    fi
  done

  # Check NODE_ENV is production
  ENV_VALUE=$(grep "^NODE_ENV=" "$ENV_FILE" | cut -d= -f2 | tr -d '"' | tr -d "'")
  if [ "$ENV_VALUE" = "production" ]; then
    pass "NODE_ENV=production ✓"
  else
    warn "NODE_ENV=$ENV_VALUE (expected: production)"
  fi

  # Check JWT_SECRET length (should be at least 32 chars)
  JWT_LEN=$(grep "^JWT_SECRET=" "$ENV_FILE" | cut -d= -f2 | wc -c)
  if [ "$JWT_LEN" -gt 32 ]; then
    pass "JWT_SECRET length OK (${JWT_LEN} chars)"
  else
    fail "JWT_SECRET too short (${JWT_LEN} chars, need ≥32)"
  fi

else
  fail ".env file missing at $ENV_FILE"
fi

# ══════════════════════════════════════════════════════════════════
# 4. MongoDB Connectivity
# ══════════════════════════════════════════════════════════════════
check "MongoDB Connectivity"

if [ -f "$ENV_FILE" ]; then
  MONGO_URI=$(grep "^MONGODB_URI=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")

  if [ -n "$MONGO_URI" ]; then
    # Test MongoDB connection
    if command -v mongosh &>/dev/null; then
      MONGO_RESULT=$(timeout 10 mongosh "$MONGO_URI" --eval "db.runCommand({ping:1})" --quiet 2>/dev/null || echo "FAILED")
      if echo "$MONGO_RESULT" | grep -q '"ok".*1\|ok.*1'; then
        pass "MongoDB connection OK"
      else
        fail "MongoDB connection FAILED"
      fi
    else
      # Fallback: try with node
      MONGO_CHECK=$(cd "$BACKEND_DIR" && timeout 10 node -e "
        const mongoose = require('mongoose');
        mongoose.connect('$MONGO_URI', {serverSelectionTimeoutMS: 5000})
          .then(() => { console.log('OK'); process.exit(0); })
          .catch(e => { console.log('FAIL: ' + e.message); process.exit(1); });
      " 2>/dev/null || echo "FAIL")
      if echo "$MONGO_CHECK" | grep -q "^OK"; then
        pass "MongoDB connection OK (via Node)"
      else
        fail "MongoDB connection FAILED: $MONGO_CHECK"
      fi
    fi
  else
    fail "MONGODB_URI is empty in .env"
  fi
else
  warn "Skipping MongoDB check (no .env)"
fi

# ══════════════════════════════════════════════════════════════════
# 5. Node Dependencies
# ══════════════════════════════════════════════════════════════════
check "Node Dependencies"

if [ -d "$BACKEND_DIR/node_modules" ]; then
  MOD_COUNT=$(ls "$BACKEND_DIR/node_modules" | wc -l)
  if [ "$MOD_COUNT" -gt 100 ]; then
    pass "node_modules present ($MOD_COUNT packages)"
  else
    warn "node_modules has only $MOD_COUNT packages (needs npm ci?)"
  fi
else
  fail "node_modules not found — run: cd backend && npm ci --production"
fi

# Check key dependencies
KEY_DEPS=("mongoose" "express" "ioredis" "jsonwebtoken" "bcryptjs")
for dep in "${KEY_DEPS[@]}"; do
  if [ -d "$BACKEND_DIR/node_modules/$dep" ]; then
    info "Found dep: $dep"
  else
    fail "Missing critical package: $dep"
  fi
done

# ══════════════════════════════════════════════════════════════════
# 6. Frontend Build
# ══════════════════════════════════════════════════════════════════
check "Frontend Build"

FRONTEND_BUILD="$APP_DIR/frontend/build"
if [ -d "$FRONTEND_BUILD" ]; then
  # Check for index.html
  if [ -f "$FRONTEND_BUILD/index.html" ]; then
    pass "Frontend build: index.html exists"
  else
    fail "Frontend build: missing index.html"
  fi

  # Check for static assets
  if [ -d "$FRONTEND_BUILD/static" ]; then
    JS_COUNT=$(find "$FRONTEND_BUILD/static/js" -name "*.js" 2>/dev/null | wc -l)
    CSS_COUNT=$(find "$FRONTEND_BUILD/static/css" -name "*.css" 2>/dev/null | wc -l)
    pass "Frontend assets: $JS_COUNT JS files, $CSS_COUNT CSS files"
  else
    warn "Frontend build: no static/ directory"
  fi

  # Build age check (warn if older than 7 days)
  BUILD_AGE=$(find "$FRONTEND_BUILD/index.html" -mtime +7 2>/dev/null | wc -l)
  if [ "$BUILD_AGE" -gt 0 ]; then
    warn "Frontend build is older than 7 days — consider rebuilding"
  else
    info "Frontend build age OK"
  fi
else
  fail "Frontend build directory not found: $FRONTEND_BUILD"
fi

# ══════════════════════════════════════════════════════════════════
# 7. Nginx Configuration
# ══════════════════════════════════════════════════════════════════
check "Nginx Configuration"

if command -v nginx &>/dev/null; then
  NGINX_TEST=$(nginx -t 2>&1)
  if echo "$NGINX_TEST" | grep -q "syntax is ok"; then
    pass "Nginx config: syntax OK"
  else
    fail "Nginx config: syntax error — $NGINX_TEST"
  fi

  # Check nginx is running
  if systemctl is-active nginx &>/dev/null; then
    pass "Nginx service: running"
  else
    warn "Nginx is not running"
    if $FIX_MODE; then
      systemctl start nginx && pass "Nginx started" || fail "Failed to start Nginx"
    fi
  fi
else
  warn "Nginx not installed"
fi

# ══════════════════════════════════════════════════════════════════
# 8. SSL Certificate
# ══════════════════════════════════════════════════════════════════
check "SSL Certificate"

CERT_DIR="/etc/letsencrypt/live"
if [ -d "$CERT_DIR" ]; then
  DOMAIN_CERT=$(ls "$CERT_DIR" 2>/dev/null | head -1)
  if [ -n "$DOMAIN_CERT" ]; then
    CERT_FILE="$CERT_DIR/$DOMAIN_CERT/fullchain.pem"
    if [ -f "$CERT_FILE" ]; then
      # Check expiry
      EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" 2>/dev/null | cut -d= -f2)
      EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo 0)
      NOW_EPOCH=$(date +%s)
      DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

      if [ "$DAYS_LEFT" -gt 30 ]; then
        pass "SSL cert valid: ${DAYS_LEFT} days remaining"
      elif [ "$DAYS_LEFT" -gt 7 ]; then
        warn "SSL cert expiring soon: ${DAYS_LEFT} days left"
      else
        fail "SSL cert critical: ${DAYS_LEFT} days left — renew immediately!"
      fi
    else
      warn "SSL cert file not found for $DOMAIN_CERT"
    fi
  else
    warn "No SSL certificates found in $CERT_DIR"
  fi
else
  warn "Let's Encrypt directory not found — SSL may not be configured"
fi

# ══════════════════════════════════════════════════════════════════
# 9. Firewall Rules
# ══════════════════════════════════════════════════════════════════
check "Firewall (UFW)"

if command -v ufw &>/dev/null; then
  UFW_STATUS=$(ufw status 2>/dev/null)
  if echo "$UFW_STATUS" | grep -q "Status: active"; then
    pass "UFW firewall: active"
    # Check essential ports
    for port in "22" "80" "443"; do
      if echo "$UFW_STATUS" | grep -q "$port"; then
        info "Port $port: allowed"
      else
        warn "Port $port may not be open in UFW"
      fi
    done
    # Check that app port (3001/5000) is NOT exposed directly
    if echo "$UFW_STATUS" | grep -qE "3001|5000"; then
      warn "App port (3001/5000) is exposed directly — should only be via Nginx"
    else
      pass "App ports not directly exposed (good)"
    fi
  else
    warn "UFW firewall not active"
  fi
else
  warn "UFW not installed"
fi

# ══════════════════════════════════════════════════════════════════
# 10. Log Directory
# ══════════════════════════════════════════════════════════════════
check "Log Directory"

if [ -d "$LOG_DIR" ]; then
  # Check writable
  if [ -w "$LOG_DIR" ]; then
    pass "Log dir writable: $LOG_DIR"
  else
    fail "Log dir not writable: $LOG_DIR"
    if $FIX_MODE; then
      chown -R alawael:alawael "$LOG_DIR" && pass "Fixed log dir ownership"
    fi
  fi

  # Check disk usage of logs
  LOG_SIZE=$(du -sm "$LOG_DIR" 2>/dev/null | cut -f1 || echo 0)
  if [ "$LOG_SIZE" -gt 1000 ]; then
    warn "Log directory is ${LOG_SIZE}MB — consider rotation"
  else
    pass "Log dir size: ${LOG_SIZE}MB OK"
  fi
else
  if $FIX_MODE; then
    mkdir -p "$LOG_DIR" && chown -R alawael:alawael "$LOG_DIR"
    pass "Created log directory: $LOG_DIR"
  else
    fail "Log directory missing: $LOG_DIR"
  fi
fi

# ══════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "  Pre-Deploy Check Summary"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}✅ Passed:   $PASSED${NC}"
echo -e "  ${RED}❌ Failed:   $FAILED${NC}"
echo -e "  ${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

if [ "$FAILED" -gt 0 ]; then
  echo -e "  ${RED}❌ DEPLOYMENT BLOCKED: $FAILED check(s) failed${NC}"
  echo -e "  ${YELLOW}   Run with --fix to attempt auto-repair${NC}"
  echo ""
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "  ${YELLOW}⚠️  PROCEED WITH CAUTION: $WARNINGS warning(s)${NC}"
  echo ""
  exit 0
else
  echo -e "  ${GREEN}✅ ALL CHECKS PASSED — Ready to deploy!${NC}"
  echo ""
  exit 0
fi
