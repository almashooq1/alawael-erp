###############################################################################
# Al-Awael ERP v3.5.0 — Frontend Dockerfile
# Multi-stage: Node.js 20 build → Nginx serve
###############################################################################

# ───────────────────────────────────────────────────────────
# Stage 1: Build (Node.js + Vite)
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copy package manifests for layer caching
COPY package.json package-lock.json* ./
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Build the React application (outputs to /app/dist)
RUN npm run build

# ───────────────────────────────────────────────────────────
# Stage 2: Development (Vite dev server with HMR)
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install && npm cache clean --force

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

# ───────────────────────────────────────────────────────────
# Stage 3: Production (Nginx serve static files)
# ───────────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS production

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create non-root user for nginx (optional security hardening)
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /usr/share/nginx/html /var/cache/nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
