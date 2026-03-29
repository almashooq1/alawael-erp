FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init curl && rm -rf /var/cache/apk/*
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force
COPY --chown=nodejs:nodejs . .
ENV NODE_ENV=production PORT=3080
EXPOSE 3080
USER nodejs
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -sf http://localhost:3080/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "worker.js"]
