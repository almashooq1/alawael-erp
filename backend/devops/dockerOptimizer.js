/**
 * 🐳 Docker Optimization & Multi-Stage Builds
 *
 * Production-ready Docker configurations
 * - Multi-stage builds for size optimization
 * - Layer caching optimization
 * - Security hardening
 * - Health checks
 */

// This file documents the Dockerfile configuration
const dockerConfig = {
  // Dockerfile for production
  dockerfile: `
# ============================================
# STAGE 1: Builder
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# ============================================
# STAGE 2: Development
# ============================================
FROM node:18-alpine AS development

WORKDIR /app

# Install development dependencies
COPY package*.json ./
RUN npm ci

COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "run", "dev"]

# ============================================
# STAGE 3: Production
# ============================================
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only production dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Use non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start"]
  `,

  // .dockerignore file
  dockerignore: `
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
.env.*.local
dist
build
coverage
.vscode
.DS_Store
logs
*.log
  `,

  // docker-compose.yml
  dockerCompose: `
version: '3.8'

services:
  # Application service
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: alawael-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongo:27017/alawael
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
    networks:
      - alawael-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  # MongoDB service
  mongo:
    image: mongo:6.0-alpine
    container_name: alawael-mongo
    volumes:
      - mongo-data:/data/db
      - mongo-config:/data/configdb
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    networks:
      - alawael-network
    restart: unless-stopped
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis service
  redis:
    image: redis:7-alpine
    container_name: alawael-redis
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - alawael-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Nginx reverse proxy (optional)
  nginx:
    image: nginx:alpine
    container_name: alawael-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - alawael-network
    restart: unless-stopped

volumes:
  mongo-data:
    driver: local
  mongo-config:
    driver: local
  redis-data:
    driver: local

networks:
  alawael-network:
    driver: bridge
  `,
};

/**
 * Docker utility functions
 */
class DockerOptimizer {
  /**
   * Get optimized Dockerfile content
   */
  static getDockerfile() {
    return dockerConfig.dockerfile;
  }

  /**
   * Get .dockerignore content
   */
  static getDockerignore() {
    return dockerConfig.dockerignore;
  }

  /**
   * Get docker-compose.yml content
   */
  static getDockerCompose() {
    return dockerConfig.dockerCompose;
  }

  /**
   * Get image size optimization tips
   */
  static getOptimizationTips() {
    return [
      '1. Use multi-stage builds to reduce final image size',
      '2. Use alpine Linux variants for smaller base images',
      '3. Combine RUN commands to reduce layers',
      '4. Order Dockerfile commands from least to most likely to change',
      '5. Use .dockerignore to exclude unnecessary files',
      '6. Use non-root user for security',
      '7. Add health checks for container orchestration',
      '8. Use docker-slim to further optimize images',
      '9. Cache dependencies separately from code',
      '10. Use read-only root filesystem when possible',
    ];
  }

  /**
   * Get build commands
   */
  static getBuildCommands() {
    return {
      dev: 'docker-compose -f docker-compose.yml up --build',
      prod: 'docker build -t alawael:latest --target production .',
      push: 'docker push your-registry/alawael:latest',
      test: 'docker-compose -f docker-compose.test.yml up --abort-on-container-exit',
    };
  }
}

module.exports = { DockerOptimizer, dockerConfig };
