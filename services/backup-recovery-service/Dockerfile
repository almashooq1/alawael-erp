FROM node:20-alpine
RUN apk add --no-cache dumb-init curl mongodb-tools
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 1001
WORKDIR /app
RUN mkdir -p /app/backups && chown -R appuser:appgroup /app/backups
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3650
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:3650/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
