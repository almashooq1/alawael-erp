FROM node:20-alpine
RUN apk add --no-cache dumb-init curl
RUN addgroup -g 1001 appgroup && adduser -D -u 1001 -G appgroup appuser
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3380
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3380/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
