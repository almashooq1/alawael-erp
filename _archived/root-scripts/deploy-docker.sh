#!/bin/bash

# Deploy to Docker - v1.0.0
# Complete Docker deployment automation

set -e

echo "🐳 Docker Deployment - Alawael v1.0.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration
DOCKER_IMAGE="alawael-backend:1.0.0"
CONTAINER_NAME="alawael-api"
PORT=3000
DB_PORT=27017
REDIS_PORT=6379

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not installed. Install from https://www.docker.com"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Create docker-compose.yml if not exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "📝 Creating docker-compose.prod.yml..."
    cat > docker-compose.prod.yml << 'DOCKER_EOF'
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    image: alawael-backend:1.0.0
    container_name: alawael-api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - FRONTEND_URL=${FRONTEND_URL}
      - SENTRY_DSN=${SENTRY_DSN}
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
    networks:
      - alawael-network

  mongodb:
    image: mongo:7.0
    container_name: alawael-mongodb
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
      - MONGO_INITDB_DATABASE=alawael
    volumes:
      - mongodb-data:/data/db
    restart: unless-stopped
    networks:
      - alawael-network

  redis:
    image: redis:7-alpine
    container_name: alawael-redis
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - alawael-network

volumes:
  mongodb-data:

networks:
  alawael-network:
    driver: bridge
DOCKER_EOF

    echo "✅ docker-compose.prod.yml created"
fi

# Create .env.production if not exists
if [ ! -f ".env.production" ]; then
    echo ""
    echo "📝 Creating .env.production..."
    echo "⚠️  You need to fill in the values:"
    cat > .env.production << 'ENV_EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/alawael
REDIS_URL=redis://redis:6379
JWT_SECRET=$(openssl rand -base64 32)
FRONTEND_URL=https://your-domain.com
SENTRY_DSN=your-sentry-dsn-here
SENDGRID_API_KEY=your-sendgrid-key
MONGO_PASSWORD=your-mongodb-password
ENV_EOF

    echo "✅ .env.production created (EDIT WITH YOUR VALUES)"
    echo "📍 File: .env.production"
    exit 1
else
    echo "✅ .env.production exists"
fi

echo ""
echo "🔨 Building Docker image..."
docker build -t $DOCKER_IMAGE .
echo "✅ Image built successfully"

echo ""
echo "🚀 Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Containers started"
echo ""

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "🔍 Checking health..."
if curl -s http://localhost:$PORT/api/health > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check not responding yet, checking logs..."
    docker-compose -f docker-compose.prod.yml logs --tail 20 backend
fi

echo ""
echo "🎉 Docker deployment complete!"
echo ""
echo "📌 Service URLs:"
echo "   API: http://localhost:$PORT"
echo "   Health: http://localhost:$PORT/api/health"
echo "   MongoDB: mongodb://localhost:$DB_PORT"
echo "   Redis: redis://localhost:$REDIS_PORT"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker logs alawael-api"
echo "   Follow logs: docker logs -f alawael-api"
echo "   Stop services: docker-compose -f docker-compose.prod.yml down"
echo "   Restart services: docker-compose -f docker-compose.prod.yml restart"
echo ""
