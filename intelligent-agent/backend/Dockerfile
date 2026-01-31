# Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including devDependencies for build
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine-slim AS production

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Add non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G appuser -g appuser appuser && \
    chown -R appuser:appuser /app

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1);})"

# Switch to non-root user
USER appuser

# Labels for metadata
LABEL maintainer="Intelligent Agent Team"
LABEL version="1.0.0"
LABEL description="Intelligent Agent Backend - Production Build"

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start application
CMD ["node", "dist/index.js"]
