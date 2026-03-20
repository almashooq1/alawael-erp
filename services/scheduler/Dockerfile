FROM node:20-alpine
RUN apk add --no-cache dumb-init curl
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser
USER appuser
EXPOSE 3260
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3260/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
