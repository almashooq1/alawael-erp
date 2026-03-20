FROM node:20-alpine

RUN apk add --no-cache dumb-init curl \
    && addgroup -g 1001 appgroup \
    && adduser -u 1001 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3690

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -fs http://localhost:3690/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
