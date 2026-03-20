# ═══════════════════════════════════════════════════════════════
# ALAWAEL ERP — GraphQL Apollo Server
# Multi-stage Docker build for production
# ═══════════════════════════════════════════════════════════════

# Stage 1: Install Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production
FROM node:20-alpine

RUN apk add --no-cache dumb-init curl && rm -rf /var/cache/apk/*

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

RUN mkdir -p logs && chown -R nodejs:nodejs logs

ENV NODE_ENV=production \
    GRAPHQL_PORT=4000

EXPOSE 4000

USER nodejs

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/.well-known/apollo/server-health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
