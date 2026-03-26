# Multi-stage build for production optimization
# Stage 1: Builder — install all deps + compile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (layer caching)
COPY package*.json ./

# Install all dependencies (including devDependencies for build step)
RUN npm ci --legacy-peer-deps

# Copy application code
COPY . .

# Stage 2: Production runtime — lean image
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper PID 1 signal handling, and mongodump for backups
RUN apk add --no-cache dumb-init mongodb-tools

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only (no dev)
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Copy application from builder stage with correct ownership
COPY --from=builder --chown=nodejs:nodejs /app .

# Create required directories with proper permissions
RUN mkdir -p /backups/auto /app/uploads /app/logs && chown -R nodejs:nodejs /backups /app/uploads /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)});"

# Environment variables (can be overridden at runtime)
# NOTE: USE_MOCK_DB, DISABLE_REDIS, SKIP_SOCKET_IO default to false
# so the production image connects to real services by default.
ENV PORT=3001 \
    NODE_ENV=production \
    USE_MOCK_DB=false \
    SKIP_SOCKET_IO=false \
    DISABLE_REDIS=false

# Use dumb-init as PID 1 to handle signals properly
# (forwards SIGTERM/SIGINT to Node.js for graceful shutdown)
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application with source maps for better error traces
CMD ["node", "--enable-source-maps", "server.js"]
