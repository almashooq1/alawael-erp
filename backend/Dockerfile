###############################################################################
# Al-Awael ERP v3.5.0 — Backend Dockerfile
# Node.js 20 Alpine, multi-stage, production-ready, non-root
###############################################################################

# ───────────────────────────────────────────────────────────
# Stage 1: Dependencies
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

# Install build dependencies for native modules (if any)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package manifests first for optimal layer caching
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# ───────────────────────────────────────────────────────────
# Stage 2: Development (hot reload target)
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

# Install dev dependencies for hot reload / testing
COPY package.json package-lock.json* ./
RUN npm install && npm cache clean --force

# Install nodemon globally for hot reload
RUN npm install -g nodemon

COPY . .

EXPOSE 3001
CMD ["npm", "run", "dev"]

# ───────────────────────────────────────────────────────────
# Stage 3: Production Runtime
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application source code (only required files)
COPY --chown=nodejs:nodejs package.json package-lock.json* ./
COPY --chown=nodejs:nodejs server.js ./
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs config/ ./config/
COPY --chown=nodejs:nodejs models/ ./models/
COPY --chown=nodejs:nodejs routes/ ./routes/
COPY --chown=nodejs:nodejs services/ ./services/
COPY --chown=nodejs:nodejs middleware/ ./middleware/
COPY --chown=nodejs:nodejs utils/ ./utils/

# Create logs directory with correct ownership
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
