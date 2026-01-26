# Stage 1: Build
FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies (cache optimized)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Copy build artifacts
COPY --from=builder /app/build /usr/share/nginx/html

# Custom Nginx config to handle React Router (fixed)
RUN mkdir -p /etc/nginx/conf.d && \
    echo 'server { \
    listen 80; \
    server_name _; \
    \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/ { \
    proxy_pass http://api:3001; \
    proxy_http_version 1.1; \
    proxy_set_header Upgrade $http_upgrade; \
    proxy_set_header Connection "upgrade"; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
    proxy_cache_bypass $http_upgrade; \
    } \
    }' > /etc/nginx/conf.d/default.conf

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf.bak

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
