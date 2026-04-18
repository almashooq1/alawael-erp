FROM node:20-alpine
RUN apk add --no-cache tini curl
WORKDIR /app
# Build-time identity — surfaced at runtime via /api/build-info
ARG GIT_SHA=unknown
ARG BUILD_TIME=unknown
COPY package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY . .
RUN mkdir -p uploads logs temp
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 CMD curl -sf http://localhost:3001/health || exit 1
ENV PORT=3001 NODE_ENV=production GIT_SHA=${GIT_SHA} BUILD_TIME=${BUILD_TIME}
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
