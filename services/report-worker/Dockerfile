FROM node:20-alpine
RUN apk add --no-cache dumb-init curl fontconfig ttf-freefont && \
    addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup && \
    mkdir -p /tmp/reports && chown appuser:appgroup /tmp/reports
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3220
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3220/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
