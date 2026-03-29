# Frontend Dockerfile - React production build

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY dashboard/client/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY dashboard/client/ ./

# Build optimized React app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY dashboard/client/nginx.conf /etc/nginx/conf.d/

# Copy built app from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Expose port
EXPOSE 80

LABEL maintainer="ALAWAEL Team"
LABEL description="ALAWAEL Quality Dashboard Frontend React App v2.0"
LABEL version="2.0.0"

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
