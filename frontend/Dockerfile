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

# Custom Nginx config to handle React Router
RUN echo 'server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
