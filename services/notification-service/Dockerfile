FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init curl && rm -rf /var/cache/apk/*
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY package*.json ./
RUN npm install --only=production && \
    npm install @bull-board/api @bull-board/express --save-prod 2>/dev/null || true && \
    npm cache clean --force
COPY --chown=nodejs:nodejs . .
RUN mkdir -p logs && chown -R nodejs:nodejs logs
ENV NODE_ENV=production PORT=3070
EXPOSE 3070
USER nodejs
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -sf http://localhost:3070/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
