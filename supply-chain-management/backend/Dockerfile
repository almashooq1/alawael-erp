# Backend Service - Supply Chain Management

FROM node:18-alpine AS builder

WORKDIR /app

# Install build tools required for native modules (canvas, etc.)
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev jpeg-dev giflib-dev pixman-dev

# Copy package files
COPY package*.json ./

# Install all dependencies (some required packages missing from package.json)
RUN npm install && \
    npm install helmet bcryptjs --save 2>/dev/null || true && \
    npm cache clean --force

# ===== Production Image =====
FROM node:18-alpine

WORKDIR /app

# Install runtime dependencies for canvas
RUN apk add --no-cache dumb-init cairo pango jpeg giflib pixman

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 4000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "server-clean.js"]
