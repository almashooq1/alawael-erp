# ═══════════════════════════════════════════════════════════════
# ALAWAEL ERP - Backend Main API
# Multi-stage Docker build for production
# ═══════════════════════════════════════════════════════════════

# Stage 1: Build Dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# ═══════════════════════════════════════════════════════════════

# Stage 2: Production Image
FROM node:20-alpine AS production

# Install security updates
RUN apk update && \
    apk upgrade && \
    apk add --no-cache tini curl && \
    rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs backend/ .

# Create necessary directories
RUN mkdir -p logs uploads temp && \
    chown -R nodejs:nodejs logs uploads temp

# Set environment
ENV NODE_ENV=production \
    PORT=3001 \
    LOG_DIR=/app/logs

# Expose port
EXPOSE 3001

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "server.js"]
