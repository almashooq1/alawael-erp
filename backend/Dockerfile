# Stage 1: Build & Dependencies
FROM node:18-alpine

WORKDIR /app

# Install system dependencies (for potential native modules)
RUN apk add --no-cache python3 make g++

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose API port
EXPOSE 3001

# Start command
# Using 'node server.js' as identified from analysis
CMD ["node", "server.js"]
