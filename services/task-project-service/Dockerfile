FROM node:20-alpine

RUN apk add --no-cache dumb-init curl \
    && addgroup -g 1001 appgroup \
    && adduser -u 1001 -G appgroup -s /bin/sh -D appuser

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 3700

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3700/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
