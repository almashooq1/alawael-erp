# ═══════════════════════════════════════════════════════════════
# ALAWAEL ERP - Backend Main API
# Multi-stage Docker build for production
#
# Improvements:
#  - Deterministic layer caching (.dockerignore-aware)
#  - Security: non-root user, read-only FS, minimal attack surface
#  - Memory limits via NODE_OPTIONS
#  - Graceful shutdown with SIGTERM handling
#  - Health check with degraded state support
# ═══════════════════════════════════════════════════════════════

# Stage 1: Build Dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files first for better layer caching
COPY backend/package.json backend/package-lock.json ./

# Install production dependencies only — deterministic installs
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force && \
    # Remove unnecessary files from node_modules to reduce image size
    find node_modules -name "*.md" -o -name "*.txt" -o -name "CHANGELOG*" -o -name "LICENSE*" | head -500 | xargs rm -f 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════

# Stage 2: Production Image
FROM node:20-alpine AS production

# Install security updates + minimal runtime deps
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache tini curl dumb-init && \
    rm -rf /var/cache/apk/* /tmp/*

# Create app user (non-root)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs backend/ .

# Create necessary directories with proper permissions
RUN mkdir -p logs uploads temp .cache && \
    chown -R nodejs:nodejs logs uploads temp .cache

# Set environment
ENV NODE_ENV=production \
    PORT=3001 \
    LOG_DIR=/app/logs \
    NODE_OPTIONS="--max-old-space-size=1024 --enable-source-maps" \
    # Graceful shutdown timeout (ms)
    SHUTDOWN_TIMEOUT=15000

# Expose port
EXPOSE 3001

# Switch to non-root user
USER nodejs

# Health check — accepts both 200 (healthy) and degraded states
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -sf http://localhost:3001/health | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);process.exit(j.status==='unhealthy'?1:0)" || exit 1

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start application with explicit signal handling
CMD ["node", "server.js"]
