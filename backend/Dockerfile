FROM node:18-alpine

LABEL maintainer="ERP System"
LABEL version="1.0"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with npm ci for production
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application files
COPY . .

# Expose main application ports (3001 for API, 3002 for SSO)
EXPOSE 3001 3002

# Health check - adaptive to port or endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "try { require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }); } catch(e) { process.exit(1); }"

# Start server based on SERVICE_TYPE environment variable
CMD ["sh", "-c", "if [ \"$SERVICE_TYPE\" = \"sso\" ]; then node sso-server.js; else node server.js; fi"]
