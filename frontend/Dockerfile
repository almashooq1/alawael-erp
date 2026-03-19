# ═══════════════════════════════════════════════════════════════
# ALAWAEL ERP - Frontend (React)
# Multi-stage Docker build for production
# ═══════════════════════════════════════════════════════════════

# Stage 1: Install Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force

# ═══════════════════════════════════════════════════════════════

# Stage 2: Build the React App
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time environment variables (safe — bundled into static JS)
ARG REACT_APP_API_URL
ARG REACT_APP_SENTRY_DSN
ARG REACT_APP_VERSION

ENV REACT_APP_API_URL=${REACT_APP_API_URL} \
    REACT_APP_SENTRY_DSN=${REACT_APP_SENTRY_DSN} \
    REACT_APP_VERSION=${REACT_APP_VERSION} \
    GENERATE_SOURCEMAP=false \
    NODE_OPTIONS="--max_old_space_size=4096"

RUN npm run build

# ═══════════════════════════════════════════════════════════════

# Stage 3: Production — Nginx serving static files
FROM nginx:1.27-alpine AS production

RUN apk add --no-cache tini curl && rm -rf /var/cache/apk/*

# Remove default content
RUN rm -rf /usr/share/nginx/html/*

# Copy build output
COPY --from=builder /app/build /usr/share/nginx/html

# Nginx SPA config with security headers, gzip, and caching
RUN mkdir -p /etc/nginx/conf.d && \
    cat > /etc/nginx/conf.d/default.conf <<'NGINX'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # CRA hashed static assets — long cache
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker — never cache
    location /service-worker.js {
        expires off;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /healthz {
        access_log off;
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
NGINX

# Non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["nginx", "-g", "daemon off;"]
