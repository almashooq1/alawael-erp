FROM node:20-alpine
RUN apk add --no-cache tini curl
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY . .
RUN mkdir -p uploads logs temp
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 CMD curl -sf http://localhost:3001/health || exit 1
ENV PORT=3001 NODE_ENV=production
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
