# ═══════════════════════════════════════════════════════════════
# ALAWAEL ERP - Backend Standalone Dockerfile
# Optimized multi-stage build: deps → production
# ═══════════════════════════════════════════════════════════════

# Stage 1: Install production dependencies only
FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package*.json ./

# Production-only deps, deterministic install, clean cache
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force && \
    find node_modules \( -name "*.md" -o -name "*.txt" -o -name "CHANGELOG*" \
      -o -name "LICENSE*" -o -name "*.map" -o -name ".npmignore" \) \
      -type f -delete 2>/dev/null || true

# Stage 2: Production runtime — lean image
FROM node:20-alpine

# tini for proper PID 1 signal handling + curl for health checks
RUN apk add --no-cache tini curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production node_modules from dependencies stage
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application source (filtered by .dockerignore)
COPY --chown=nodejs:nodejs . .

# Create required directories with proper permissions
RUN mkdir -p uploads logs temp && \
    chown -R nodejs:nodejs uploads logs temp

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check using curl (faster than node -e)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -sf http://localhost:${PORT:-3001}/health || exit 1

# Environment variables (runtime-overridable)
ENV PORT=3001 \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=1024 --enable-source-maps"

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "server.js"]
