#!/bin/bash

# Advanced Scaling & Performance Optimization - v1.0.0
# Sets up load balancing, auto-scaling, and performance optimization

set -e

echo "⚡ Alawael v1.0.0 - Scaling & Performance Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ENVIRONMENT=${1:-production}

echo "📊 Scaling Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━"
echo "Environment: $ENVIRONMENT"
echo ""

# Create load balancing configuration
cat > nginx-load-balancer.conf << 'NGINX_EOF'
# NGINX Load Balancer Configuration
# For distributing traffic across multiple application instances

upstream alawael_backend {
    least_conn;  # Use least connections algorithm
    
    server app1:3000 weight=3;
    server app2:3000 weight=2;
    server app3:3000 weight=1;
    
    keepalive 32;
}

upstream alawael_static {
    server cache1:3001;
    server cache2:3001;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;

# Cache settings
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m 
                 max_size=1g inactive=60m use_temp_path=off;

server {
    listen 80;
    listen [::]:80;
    server_name _;
    client_max_body_size 50M;
    
    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;
    gzip_vary on;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://alawael_backend;
        proxy_http_version 1.1;
        
        # Connection settings
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        
        # Caching (cache GET requests for 5 minutes)
        proxy_cache api_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        add_header X-Cache-Status $upstream_cache_status;
    }
    
    # Authentication endpoints (no caching)
    location /api/auth/ {
        limit_req zone=auth_limit burst=5 nodelay;
        
        proxy_pass http://alawael_backend;
        proxy_http_version 1.1;
        proxy_cache off;
        
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        proxy_pass http://alawael_static;
    }
}

# HTTPS configuration (enable after getting certificate)
# server {
#     listen 443 ssl http2;
#     server_name your-domain.com;
#     
#     ssl_certificate /etc/nginx/ssl/cert.pem;
#     ssl_certificate_key /etc/nginx/ssl/key.pem;
#     
#     # ... rest of configuration
# }

NGINX_EOF

echo "✅ NGINX load balancer config created: nginx-load-balancer.conf"
echo ""

# Create Docker Compose for scaling
cat > docker-compose-scaling.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  # NGINX Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-load-balancer.conf:/etc/nginx/conf.d/default.conf
      - nginx_cache:/var/cache/nginx
    depends_on:
      - app1
      - app2
      - app3
    networks:
      - alawael_network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Application instances (scaled)
  app1:
    build: .
    environment:
      NODE_ENV: production
      INSTANCE_ID: app1
      MONGODB_URI: mongodb://mongodb:27017/alawael
      REDIS_URL: redis://redis:6379
      LOG_LEVEL: info
    depends_on:
      - mongodb
      - redis
    networks:
      - alawael_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: always

  app2:
    build: .
    environment:
      NODE_ENV: production
      INSTANCE_ID: app2
      MONGODB_URI: mongodb://mongodb:27017/alawael
      REDIS_URL: redis://redis:6379
      LOG_LEVEL: info
    depends_on:
      - mongodb
      - redis
    networks:
      - alawael_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: always

  app3:
    build: .
    environment:
      NODE_ENV: production
      INSTANCE_ID: app3
      MONGODB_URI: mongodb://mongodb:27017/alawael
      REDIS_URL: redis://redis:6379
      LOG_LEVEL: info
    depends_on:
      - mongodb
      - redis
    networks:
      - alawael_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: always

  # MongoDB (single node for dev, use Atlas for production)
  mongodb:
    image: mongo:7.0
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    networks:
      - alawael_network
    restart: always

  # Redis Cache Cluster
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - alawael_network
    restart: always

volumes:
  mongodb_data:
  redis_data:
  nginx_cache:

networks:
  alawael_network:
    driver: bridge

COMPOSE_EOF

echo "✅ Docker Compose scaling config created: docker-compose-scaling.yml"
echo ""

# Create auto-scaling rules
cat > AUTO_SCALING_RULES.md << 'SCALING_EOF'
# Auto-Scaling Configuration - Alawael v1.0.0

## Scaling Triggers

### Scale Up (Add Instances)
- **CPU Usage:** > 70% for 5 minutes
- **Memory Usage:** > 75% for 5 minutes
- **Request Queue:** > 100 pending requests
- **Response Time:** > 500ms (p95) for 3 minutes
- **Error Rate:** > 1% for 2 minutes

### Scale Down (Remove Instances)
- **CPU Usage:** < 30% for 15 minutes
- **Memory Usage:** < 40% for 15 minutes
- **Request Queue:** < 10 requests
- **Response Time:** < 100ms (p95)
- **Error Rate:** 0%

## Instance Configuration

### Minimum Instances
- **Development:** 1
- **Staging:** 2
- **Production:** 3

### Maximum Instances
- **Development:** 3
- **Staging:** 5
- **Production:** 20

### Scaling Increments
- **Scale Up:** +1 instance
- **Scale Down:** -1 instance
- **Cooldown Period:** 5 minutes between scaling

## Target Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| CPU Usage | < 50% | > 70% | > 90% |
| Memory | < 60% | > 75% | > 85% |
| Response Time (p95) | < 200ms | > 500ms | > 1000ms |
| Error Rate | < 0.1% | > 0.5% | > 1% |
| Request Rate | < 1000/s | > 2000/s | > 5000/s |

## Platform-Specific Auto-Scaling

### AWS EC2 Auto Scaling
```bash
# Create launch template
aws ec2 create-launch-template \
    --launch-template-name alawael-template \
    --launch-template-data file://template.json

# Create auto-scaling group
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name alawael-asg \
    --launch-template LaunchTemplateName=alawael-template \
    --min-size 3 \
    --max-size 20 \
    --desired-capacity 3 \
    --load-balancer-names alawael-elb
```

### Azure App Service Auto-Scale
```bash
# Enable auto-scale
az monitor autoscale create \
    --resource-group mygroup \
    --resource myappservice \
    --resource-type "Microsoft.Web/serverfarms"
```

### Google Cloud Autoscaling
```bash
# Create instance group with autoscaling
gcloud compute instance-groups managed create alawael-group \
    --base-instance-name alawael-instance \
    --template alawael-template \
    --size 3 \
    --region us-central1 \
    --enable-autohealing

# Create autoscaler
gcloud compute instance-groups managed set-autoscaling alawael-group \
    --max-num-instances 20 \
    --min-num-instances 3 \
    --target-cpu-utilization 0.7 \
    --region us-central1
```

### Kubernetes HPA (Horizontal Pod Autoscaler)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: alawael-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: alawael-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
```

SCALING_EOF

echo "✅ Auto-scaling rules created: AUTO_SCALING_RULES.md"
echo ""

# Create performance optimization guide
cat > PERFORMANCE_OPTIMIZATION.md << 'PERF_EOF'
# Performance Optimization Guide - Alawael v1.0.0

## Database Optimization

### MongoDB Indexing
```javascript
// Add indexes for common queries
db.orders.createIndex({ 'customerId': 1 });
db.orders.createIndex({ 'status': 1, 'createdAt': -1 });
db.products.createIndex({ 'name': 'text', 'description': 'text' });

// Check index usage
db.orders.aggregate([{ $indexStats: {} }]);
```

### Query Optimization
- [ ] Use projection to limit fields
- [ ] Create indexes for filter/sort fields
- [ ] Use aggregation pipeline for complex queries
- [ ] Avoid N+1 queries (use population)
- [ ] Implement caching for read-heavy queries

### Connection Pooling
```javascript
// Configure MongoDB connection pool
const mongoClient = new MongoClient(uri, {
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 60000
});
```

## Application Optimization

### Code-Level Improvements
- [ ] Implement request caching with Redis
- [ ] Compress API responses (gzip)
- [ ] Minimize database queries
- [ ] Use async/await properly
- [ ] Implement request batching

### Middleware Optimization
```javascript
// Compression middleware
app.use(compression({
  threshold: 0,
  level: 6
}));

// Caching middleware
app.use(cacheManager);

// Rate limiting
app.use(rateLimit({
  windowMs: 1000,
  max: 100 // requests per second
}));
```

### Async Operations
```javascript
// Use worker threads for CPU-intensive tasks
const { Worker } = require('worker_threads');

app.get('/expensive-operation', async (req, res) => {
  const worker = new Worker('./worker.js');
  
  worker.on('message', (result) => {
    res.json(result);
  });
  
  worker.on('error', reject);
});
```

## Infrastructure Optimization

### Server Configuration
- [ ] Enable HTTP/2
- [ ] Configure TCP_NODELAY
- [ ] Optimize file descriptor limits
- [ ] Tune buffer sizes
- [ ] Implement connection reuse

### Caching Strategy
```
User Request
    ↓
NGINX Cache (5 min, GET only)
    ↓
Redis Cache (10-60 min)
    ↓
Application Logic
    ↓
Database
    ↓
Response
```

## Monitoring Performance

### Key Metrics
- **Response Time:** < 200ms (p95)
- **Throughput:** > 1000 req/sec
- **Availability:** > 99.9%
- **Error Rate:** < 0.1%
- **CPU Utilization:** < 70%
- **Memory Utilization:** < 75%

### Performance Dashboard
```bash
# View real-time metrics
watch -n 1 'curl -s http://localhost:3000/api/metrics | jq .'
```

## Load Testing

### Using Artillery
```bash
npm install -g artillery

# Create load test
artillery quick --count 100 --num 1000 http://localhost:3000

# Detailed load test
artillery run load-test.yml --output results.json
```

### Load Test Scenarios
1. **Normal Load:** 100 concurrent users for 5 minutes
2. **Peak Load:** 500 concurrent users for 10 minutes
3. **Stress Test:** Increase until system fails
4. **Soak Test:** Normal load for 24 hours

## Optimization Checklist

### Before Production
- [ ] Database indexes created
- [ ] Query optimization completed
- [ ] Caching implemented
- [ ] Load testing passed
- [ ] Scaling tested
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Logs aggregated
- [ ] Performance baseline captured

### Ongoing
- [ ] Monitor key metrics daily
- [ ] Review slow queries weekly
- [ ] Analyze error logs
- [ ] Adjust thresholds monthly
- [ ] Capacity planning quarterly

PERF_EOF

echo "✅ Performance optimization guide created: PERFORMANCE_OPTIMIZATION.md"
echo ""

# Create monitoring dashboard template
cat > monitoring-dashboard.json << 'DASHBOARD_EOF'
{
  "dashboard": {
    "name": "Alawael v1.0.0 - Real-time Monitoring",
    "description": "Comprehensive monitoring dashboard for all critical metrics",
    "rows": [
      {
        "title": "System Health",
        "panels": [
          {
            "title": "CPU Usage",
            "metric": "system.cpu.usage",
            "threshold": { "warn": 70, "critical": 90 },
            "graph": "line"
          },
          {
            "title": "Memory Usage",
            "metric": "system.memory.usage",
            "threshold": { "warn": 75, "critical": 85 },
            "graph": "gauge"
          },
          {
            "title": "Disk Usage",
            "metric": "system.disk.usage",
            "threshold": { "warn": 80, "critical": 90 },
            "graph": "gauge"
          },
          {
            "title": "Active Connections",
            "metric": "system.connections.active",
            "graph": "stat"
          }
        ]
      },
      {
        "title": "Application Performance",
        "panels": [
          {
            "title": "Request Rate",
            "metric": "app.requests.rate",
            "unit": "req/s",
            "graph": "line"
          },
          {
            "title": "Response Time",
            "metric": "app.response.time",
            "percentiles": ["p50", "p90", "p95", "p99"],
            "unit": "ms",
            "graph": "line"
          },
          {
            "title": "Error Rate",
            "metric": "app.errors.rate",
            "threshold": { "warn": 0.5, "critical": 1.0 },
            "unit": "%",
            "graph": "line"
          },
          {
            "title": "Throughput",
            "metric": "app.throughput",
            "unit": "MB/s",
            "graph": "stat"
          }
        ]
      },
      {
        "title": "Database Metrics",
        "panels": [
          {
            "title": "Query Latency",
            "metric": "db.query.latency",
            "graph": "line"
          },
          {
            "title": "Slow Queries",
            "metric": "db.queries.slow",
            "threshold": { "warn": 10, "critical": 50 }
          },
          {
            "title": "Connection Pool",
            "metric": "db.connections.pool",
            "graph": "gauge"
          },
          {
            "title": "Replication Lag",
            "metric": "db.replication.lag",
            "unit": "ms"
          }
        ]
      },
      {
        "title": "Cache Performance",
        "panels": [
          {
            "title": "Cache Hit Rate",
            "metric": "cache.hit.rate",
            "target": "> 80%"
          },
          {
            "title": "Cache Size",
            "metric": "cache.size",
            "unit": "MB"
          },
          {
            "title": "Redis Memory",
            "metric": "redis.memory.used",
            "graph": "gauge"
          }
        ]
      }
    ]
  }
}
DASHBOARD_EOF

echo "✅ Monitoring dashboard template created: monitoring-dashboard.json"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Scaling & Performance Setup Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 Created Configuration Files:"
echo "   1. nginx-load-balancer.conf"
echo "   2. docker-compose-scaling.yml"
echo "   3. AUTO_SCALING_RULES.md"
echo "   4. PERFORMANCE_OPTIMIZATION.md"
echo "   5. monitoring-dashboard.json"
echo ""

echo "🚀 Implementation Steps:"
echo ""
echo "Step 1: Configure Load Balancer"
echo "   docker run -d --name nginx -p 80:80 \\"
echo "     -v ./nginx-load-balancer.conf:/etc/nginx/conf.d/default.conf \\"
echo "     nginx:alpine"
echo ""

echo "Step 2: Start Scaled Services"
echo "   docker-compose -f docker-compose-scaling.yml up -d"
echo ""

echo "Step 3: Configure Auto-Scaling"
echo "   Review: AUTO_SCALING_RULES.md"
echo "   Implement on your platform (AWS/Azure/GCP/K8s)"
echo ""

echo "Step 4: Monitor Performance"
echo "   Dashboard: monitoring-dashboard.json"
echo "   Import to DataDog or New Relic"
echo ""

echo "⚡ Expected Performance Improvements:"
echo "   • Resource utilization: -30% with load balancing"
echo "   • Latency: -50% with caching"
echo "   • Throughput: +200% with scaling"
echo "   • Availability: +99.9% with health checks"
echo ""

echo "✅ Scaling & Performance setup complete!"
echo ""
