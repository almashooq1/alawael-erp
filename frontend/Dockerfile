FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY . .
ARG REACT_APP_API_URL=http://72.60.84.56:8888/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } location /health { return 200 "ok"; add_header Content-Type text/plain; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
