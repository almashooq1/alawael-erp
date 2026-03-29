# Backend Dockerfile - Single-stage build (needed for sqlite3 native compilation)

FROM node:22-alpine

WORKDIR /app

# Install build tools + runtime libs for sqlite3 (single stage = no copy issues)
# py3-setuptools provides 'distutils' needed by node-gyp (removed in Python 3.12)
RUN apk add --no-cache dumb-init python3 py3-setuptools make g++ sqlite-dev

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY dashboard/server/package*.json ./

# Install dependencies and compile sqlite3 from source
RUN npm install --only=production --build-from-source=sqlite3 && \
    npm cache clean --force

# Copy application code
COPY dashboard/server/ ./

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "index.js"]

EXPOSE 3001

LABEL maintainer="ALAWAEL Team"
LABEL description="ALAWAEL Quality Dashboard Backend API v2.0"
LABEL version="2.0.0"
