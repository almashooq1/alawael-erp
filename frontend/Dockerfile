FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY . .
# استخدام URL نسبي (/api) بدل IP مُضمَّن — يعمل مع كل الأجهزة والـ domains
ARG REACT_APP_API_URL=/api
ARG REACT_APP_API_V1_URL=/api/v1
ARG REACT_APP_WS_URL=
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_API_V1_URL=$REACT_APP_API_V1_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV REACT_APP_ENVIRONMENT=production
RUN npm run build
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
