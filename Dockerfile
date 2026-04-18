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
    find node_modules \( -name "*.md" -o -name "*.txt" -o -name "CHANGELOG*" -o -name "LICENSE*" -o -name "*.map" -o -name ".npmignore" \) -type f -delete 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════

# Stage 2: Production Image
FROM node:20-alpine AS production

# Install security updates + minimal runtime deps
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache tini curl && \
    rm -rf /var/cache/apk/* /tmp/*

# Create app user (non-root)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Build-time identity — passed via `docker build --build-arg GIT_SHA=...
# --build-arg BUILD_TIME=...`. Surfaced at runtime via /api/build-info
# so operators can tell which commit is serving a given request without
# needing to exec into the container.
ARG GIT_SHA=unknown
ARG BUILD_TIME=unknown

# Copy dependencies from previous stage
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs backend/ .

# Create necessary directories with proper permissions
RUN mkdir -p logs uploads temp .cache && \
    chown -R nodejs:nodejs logs uploads temp .cache

# Set environment (no secrets here — use .env or orchestrator secrets)
ENV NODE_ENV=production \
    PORT=3001 \
    LOG_DIR=/app/logs \
    NODE_OPTIONS="--max-old-space-size=1024 --enable-source-maps" \
    SHUTDOWN_TIMEOUT=15000 \
    NPM_CONFIG_LOGLEVEL=warn \
    GIT_SHA=${GIT_SHA} \
    BUILD_TIME=${BUILD_TIME}

# Expose port
EXPOSE 3001

# Switch to non-root user
USER nodejs

# Health check — accepts both 200 (healthy) and degraded states
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -sf http://localhost:3001/health || exit 1

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start application with explicit signal handling
CMD ["node", "server.js"]
