FROM node:20-alpine
RUN apk add --no-cache dumb-init curl vips-dev
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p /app/uploads/thumbnails /app/uploads/processed && \
    addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser && \
    chown -R appuser:appgroup /app/uploads
USER appuser
EXPOSE 3270
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3270/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
