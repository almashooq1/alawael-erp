# Multi-stage build for production optimization
# Stage 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Stage 2: Production runtime
FROM node:18-alpine

WORKDIR /app


# Install dumb-init for proper signal handling and mongodump for MongoDB backup
RUN apk add --no-cache dumb-init mongodb-tools

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies (without dev)
RUN npm install --production --legacy-peer-deps && npm cache clean --force

# Copy entire application from builder stage with correct ownership
COPY --from=builder --chown=nodejs:nodejs /app . .

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
ENV PORT=3001 \
    NODE_ENV=production \
    USE_MOCK_DB=true \
    SKIP_SOCKET_IO=true \
    DISABLE_REDIS=true \
    SKIP_PHASE17=true

# Use dumb-init to handle signals properly (optional)
# ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start application
CMD ["node", "server.js"]
