FROM node:20-alpine
RUN apk add --no-cache dumb-init curl && \
    addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force
COPY . .
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3230
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3230/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
