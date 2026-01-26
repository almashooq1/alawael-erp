# 🚀 Production Deployment Configuration

## Docker Compose for Production

```yaml
version: '3.8'

services:
  # Frontend - React Application
  alaweal-client-prod:
    image: alaweal/client:latest
    container_name: alaweal-client-prod
    ports:
      - '443:443'
      - '80:80'
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=https://api.alaweal.com/api
      - REACT_APP_PUBLIC_URL=https://www.alaweal.com
    restart: always
    networks:
      - alaweal-network
    healthcheck:
      test: ['CMD', 'curl', '-f', 'https://localhost']
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - /etc/letsencrypt/live/alaweal.com/fullchain.pem:/etc/nginx/ssl/cert.pem
      - /etc/letsencrypt/live/alaweal.com/privkey.pem:/etc/nginx/ssl/key.pem

  # Backend API - Node.js/Express
  alaweal-api-prod:
    image: alaweal/api:latest
    container_name: alaweal-api-prod
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MONGODB_URI=mongodb://admin:${PROD_MONGO_PASSWORD}@mongo-prod:27017/alaweal_db_prod?authSource=admin
      - REDIS_URL=redis://:${PROD_REDIS_PASSWORD}@redis-prod:6379
      - JWT_SECRET=${PROD_JWT_SECRET}
      - JWT_EXPIRY=7d
      - LOG_LEVEL=info
    restart: always
    networks:
      - alaweal-network
    depends_on:
      - mongo-prod
      - redis-prod
    healthcheck:
      test:
        [
          'CMD',
          'curl',
          '-f',
          'http://localhost:3001/api/disability-rehabilitation/info',
        ]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - /var/log/alaweal:/app/logs

  # MongoDB - Production Database
  mongo-prod:
    image: mongo:7.0
    container_name: mongo-prod
    ports:
      - '27017:27017'
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${PROD_MONGO_PASSWORD}
      - MONGO_INITDB_DATABASE=alaweal_db_prod
    restart: always
    networks:
      - alaweal-network
    volumes:
      - mongo-prod-data:/data/db
      - mongo-prod-config:/data/configdb
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/init.js
    healthcheck:
      test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis - Production Cache
  redis-prod:
    image: redis:7.2
    container_name: redis-prod
    ports:
      - '6379:6379'
    command:
      redis-server --requirepass ${PROD_REDIS_PASSWORD} --appendonly yes
      --appendfsync everysec
    restart: always
    networks:
      - alaweal-network
    volumes:
      - redis-prod-data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx Reverse Proxy & SSL Termination
  nginx-prod:
    image: nginx:latest
    container_name: nginx-prod
    ports:
      - '80:80'
      - '443:443'
    restart: always
    networks:
      - alaweal-network
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt/live/alaweal.com/fullchain.pem:/etc/nginx/ssl/cert.pem
      - /etc/letsencrypt/live/alaweal.com/privkey.pem:/etc/nginx/ssl/key.pem
    depends_on:
      - alaweal-api-prod
      - alaweal-client-prod

  # Monitoring - Prometheus
  prometheus-prod:
    image: prom/prometheus:latest
    container_name: prometheus-prod
    ports:
      - '9090:9090'
    restart: always
    networks:
      - alaweal-network
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-prod-data:/prometheus

  # Monitoring - Grafana
  grafana-prod:
    image: grafana/grafana:latest
    container_name: grafana-prod
    ports:
      - '3003:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${PROD_GRAFANA_PASSWORD}
      - GF_INSTALL_PLUGINS=redis-datasource
    restart: always
    networks:
      - alaweal-network
    volumes:
      - grafana-prod-data:/var/lib/grafana

  # Logging - ELK Stack (Elasticsearch)
  elasticsearch-prod:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch-prod
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - '9200:9200'
    restart: always
    networks:
      - alaweal-network
    volumes:
      - elasticsearch-prod-data:/usr/share/elasticsearch/data

  # Logging - Kibana
  kibana-prod:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kibana-prod
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch-prod:9200
    ports:
      - '5601:5601'
    restart: always
    networks:
      - alaweal-network
    depends_on:
      - elasticsearch-prod

networks:
  alaweal-network:
    driver: bridge

volumes:
  mongo-prod-data:
    driver: local
  mongo-prod-config:
    driver: local
  redis-prod-data:
    driver: local
  prometheus-prod-data:
    driver: local
  grafana-prod-data:
    driver: local
  elasticsearch-prod-data:
    driver: local
```

## Environment Variables (.env.production)

```bash
# Node Environment
NODE_ENV=production
PORT=3001

# Database
MONGODB_URI=mongodb://admin:${PROD_MONGO_PASSWORD}@mongo-prod:27017/alaweal_db_prod?authSource=admin
MONGO_PASSWORD=${PROD_MONGO_PASSWORD}

# Cache
REDIS_URL=redis://:${PROD_REDIS_PASSWORD}@redis-prod:6379
REDIS_PASSWORD=${PROD_REDIS_PASSWORD}

# JWT
JWT_SECRET=${PROD_JWT_SECRET}
JWT_EXPIRY=7d

# Application
APP_NAME=Alaweal Disability Rehabilitation
APP_URL=https://www.alaweal.com
API_URL=https://api.alaweal.com/api

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
KIBANA_ENABLED=true

# Security
CORS_ORIGIN=https://www.alaweal.com
HTTPS_REDIRECT=true
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 3 * * * # Daily at 3 AM
BACKUP_RETENTION=30 # Days

# Email
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=${PROD_MAIL_USERNAME}
MAIL_PASSWORD=${PROD_MAIL_PASSWORD}
MAIL_FROM_ADDRESS=noreply@alaweal.com
```

## SSL/TLS Setup

### Using Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --standalone -d alaweal.com -d www.alaweal.com -d api.alaweal.com

# Auto-renewal setup
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Renew certificate (manual)
sudo certbot renew --dry-run
```

## Nginx Configuration

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name alaweal.com www.alaweal.com api.alaweal.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Frontend
server {
    listen 443 ssl http2;
    server_name alaweal.com www.alaweal.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://alaweal-client-prod:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Caching for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://alaweal-client-prod:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# HTTPS - API
server {
    listen 443 ssl http2;
    server_name api.alaweal.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://alaweal-api-prod:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 90;
    }
}
```

## Deployment Steps

### 1. Server Setup

```bash
# Update system
sudo apt-get update && apt-get upgrade -y

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Create app directory
sudo mkdir -p /app/alaweal
cd /app/alaweal
```

### 2. Deploy Services

```bash
# Clone repository
git clone https://github.com/yourorg/alaweal-rehab.git .

# Set production environment
cp .env.example .env.production
# Edit .env.production with production values

# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Verify health
docker-compose -f docker-compose.prod.yml ps
```

### 3. Database Initialization

```bash
# Initialize MongoDB
docker-compose -f docker-compose.prod.yml exec mongo-prod mongosh admin -u admin -p ${PROD_MONGO_PASSWORD} < init.js

# Run migrations
docker-compose -f docker-compose.prod.yml exec alaweal-api-prod npm run migrate
```

### 4. Monitor Deployment

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Monitor metrics
# Prometheus: http://server-ip:9090
# Grafana: http://server-ip:3003
# Kibana: http://server-ip:5601
```

## Post-Deployment Verification

### Health Checks

```bash
# Frontend
curl -I https://www.alaweal.com

# API
curl -H "Authorization: Bearer $TOKEN" https://api.alaweal.com/api/disability-rehabilitation/info

# Database
docker-compose -f docker-compose.prod.yml exec mongo-prod mongosh --eval "db.adminCommand('ping')"

# Redis
docker-compose -f docker-compose.prod.yml exec redis-prod redis-cli ping
```

### Performance Monitoring

- Prometheus metrics: http://server-ip:9090
- Grafana dashboards: http://server-ip:3003
- Kibana logs: http://server-ip:5601

## Backup & Recovery

### Automated Backups

```bash
# MongoDB backup
docker-compose -f docker-compose.prod.yml exec mongo-prod \
  mongodump --out /backup --username admin --password $PROD_MONGO_PASSWORD --authenticationDatabase admin

# Redis backup
docker-compose -f docker-compose.prod.yml exec redis-prod \
  redis-cli BGSAVE
```

### Recovery Procedure

```bash
# Restore MongoDB
docker-compose -f docker-compose.prod.yml exec mongo-prod \
  mongorestore /backup --username admin --password $PROD_MONGO_PASSWORD --authenticationDatabase admin

# Restore Redis
# Redis will automatically load from dump.rdb on startup
```

## Maintenance & Monitoring

### Log Aggregation

All logs are collected in Kibana for centralized monitoring.

### Alert Setup

Configure alerts in Prometheus/Grafana for:

- High CPU usage
- High memory usage
- Database connection failures
- API response time > 5s
- Error rate > 1%

### Updates & Patches

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Restart services with new images
docker-compose -f docker-compose.prod.yml up -d
```
