FROM mongo:7.0 AS mongodump

FROM node:20-alpine

# Copy mongodump from mongo image
COPY --from=mongodump /usr/bin/mongodump /usr/bin/mongodump
COPY --from=mongodump /usr/bin/mongorestore /usr/bin/mongorestore

RUN apk add --no-cache dumb-init curl && \
    addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    mkdir -p /backups && chown appuser:appgroup /backups

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .

RUN chown -R appuser:appgroup /app
USER appuser

VOLUME ["/backups"]
EXPOSE 3090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3090/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
