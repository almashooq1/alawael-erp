# 🔧 API GATEWAY & SERVICE ROUTING CONFIGURATION GUIDE

**Phase IV Implementation**  
**Date**: February 20, 2026  
**Objective**: Unified API routing for all enterprise services  
**Status**: 🟡 **Configuration Ready**

---

## 🎯 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│              CLIENT APPLICATIONS                         │
│  (Web, Mobile, Desktop, Third-party API Consumers)      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
        ┌─────────────────────────────┐
        │   API GATEWAY (Port 8080)    │
        │  - Request Routing           │
        │  - Rate Limiting             │
        │  - Circuit Breaker           │
        │  - Compression               │
        │  - Authentication Proxy      │
        │  - Monitoring & Logging      │
        └──────┬──────────┬─────────┬──────────────┐
               │          │         │              │
        ┌──────▼──┐  ┌────▼───┐  ┌─▼────────┐  ┌─▼──────────┐
        │ ERP Core│  │GraphQL │  │ SCM      │  │ AI Agent   │
        │(3001)   │  │(4000)  │  │ (3006)   │  │ (3007)     │
        └─────────┘  └────────┘  └──────────┘  └────────────┘
               │          │         │              │
        ┌──────▼──┬──────▼─────┬───▼────────┬────▼──────────┐
        │Database │  Apollo    │ SCM DB     │ TensorFlow   │
        │Services │  Server    │ Services   │ Services     │
        └─────────┴────────────┴────────────┴──────────────┘
```

---

## 📋 SERVICE ROUTING CONFIGURATION

### Current Configuration (gateway/server.js)

```javascript
services: {
  auth: 'http://localhost:3001',         // ERP Main Service
  hr: 'http://localhost:3002',           // HR Module  
  finance: 'http://localhost:3003',      // Finance Module
  reports: 'http://localhost:3004',      // Reports Service
  notifications: 'http://localhost:3005' // Notifications
}
```

### Enhanced Configuration (Recommended)

```javascript
services: {
  // Core ERP Services
  'erp': 'http://localhost:3001',              // Main ERP system
  'auth': 'http://localhost:3001/api/auth',   // Authentication
  'users': 'http://localhost:3001/api/users', // User Management
  
  // Specialized Services
  'hr': 'http://localhost:3002',        // HR Module
  'finance': 'http://localhost:3003',   // Finance Module
  'reports': 'http://localhost:3004',   // Reports Service
  'notifications': 'http://localhost:3005', // Notifications
  
  // Advanced Modules
  'scm': 'http://localhost:3006',       // Supply Chain Management
  'graphql': 'http://localhost:4000',   // GraphQL API
  'ai-agent': 'http://localhost:3007',  // Intelligent Agent
  
  // Optional Services
  'mobile-api': 'http://localhost:3008', // Mobile Backend
  'analytics': 'http://localhost:3009'   // Analytics Service
}
```

---

## 🚀 DEPLOYMENT CONFIGURATION

### Environment Variables (.env for Gateway)

```bash
# Gateway Configuration
GATEWAY_PORT=8080
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
HR_SERVICE_URL=http://localhost:3002
FINANCE_SERVICE_URL=http://localhost:3003
REPORTS_SERVICE_URL=http://localhost:3004
NOTIFICATIONS_SERVICE_URL=http://localhost:3005
SCM_SERVICE_URL=http://localhost:3006
GRAPHQL_SERVICE_URL=http://localhost:4000
AI_AGENT_SERVICE_URL=http://localhost:3007

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/gateway.log
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  # Main ERP Service
  erp-backend:
    image: node:22-alpine
    container_name: erp-backend
    working_dir: /app
    volumes:
      - ./erp_new_system/backend:/app
    environment:
      - PORT=3001
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/erp_system
      - POSTGRES_HOST=postgres
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
      - mongodb

  # API Gateway
  api-gateway:
    image: node:22-alpine
    container_name: api-gateway
    working_dir: /app
    volumes:
      - ./gateway:/app
    environment:
      - GATEWAY_PORT=8080
      - AUTH_SERVICE_URL=http://erp-backend:3001
      - HR_SERVICE_URL=http://erp-backend:3002
      - FINANCE_SERVICE_URL=http://erp-backend:3003
      - REPORTS_SERVICE_URL=http://erp-backend:3004
      - NOTIFICATIONS_SERVICE_URL=http://erp-backend:3005
      - GRAPHQL_SERVICE_URL=http://graphql-server:4000
      - SCM_SERVICE_URL=http://scm-backend:3006
    ports:
      - "8080:8080"
    depends_on:
      - erp-backend
      - graphql-server

  # GraphQL Server
  graphql-server:
    image: node:22-alpine
    container_name: graphql-server
    working_dir: /app
    volumes:
      - ./graphql:/app
    environment:
      - APOLLO_PORT=4000
      - BACKEND_SERVICE_URL=http://erp-backend:3001
    ports:
      - "4000:4000"
    depends_on:
      - erp-backend

  # Supply Chain Management
  scm-backend:
    image: node:22-alpine
    container_name: scm-backend
    working_dir: /app
    volumes:
      - ./supply-chain-management/backend:/app
    environment:
      - PORT=3006
      - MONGODB_URI=mongodb://mongodb:27017/scm_system
    ports:
      - "3006:3006"
    depends_on:
      - mongodb

  # Database Services
  postgres:
    image: postgres:16-alpine
    container_name: postgres-db
    environment:
      POSTGRES_USER: erp_admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: erp_system
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: redis-cache
    ports:
      - "6379:6379"

  mongodb:
    image: mongo:7-alpine
    container_name: mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: erp_system
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  postgres_data:
  mongo_data:

networks:
  default:
    name: erp-network
    driver: bridge
```

---

## 🔐 SECURITY CONFIGURATION

### Gateway Security Headers

```javascript
const securityConfig = {
  // Helmet configuration (already set)
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                   // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
  },

  // JWT verification (for proxied requests)
  jwt: {
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256'],
  },
};
```

---

## 🧪 SERVICE INTEGRATION TESTING

### Health Check Endpoints

```bash
# Gateway Health
curl http://localhost:8080/health

# Individual Service Status
curl http://localhost:8080/health/services
curl http://localhost:8080/health/erp
curl http://localhost:8080/health/graphql
curl http://localhost:8080/health/scm
```

### Integration Test Script

```bash
#!/bin/bash
echo "🧪 INTEGERATION TEST SUITE"
echo "==========================\n"

# Test 1: Gateway Health
echo "1️⃣ Testing Gateway Health..."
curl -s http://localhost:8080/health | jq '.'

# Test 2: ERP Service Routing
echo "\n2️⃣ Testing ERP Service Routing..."
curl -s http://localhost:8080/api/erp/health | jq '.'

# Test 3: GraphQL API
echo "\n3️⃣ Testing GraphQL API..."
curl -s -X POST http://localhost:8080/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id name } }"}' | jq '.'

# Test 4: SCM Service
echo "\n4️⃣ Testing SCM Service..."
curl -s http://localhost:8080/api/scm/health | jq '.'

# Test 5: Rate Limiting
echo "\n5️⃣ Testing Rate Limiting..."
for i in {1..105}; do
  curl -s http://localhost:8080/api/erp/test > /dev/null
  if [ $((i % 20)) -eq 0 ]; then echo "  Request $i"; fi
done

echo "\n✅ Integration Tests Complete"
```

---

## 📊 PERFORMANCE TUNING

### Load Balancing Configuration

```javascript
// Multiple instances of each service (recommended for production)
const serviceInstances = {
  'erp': [
    'http://erp-1:3001',
    'http://erp-2:3001',
    'http://erp-3:3001',
  ],
  'graphql': [
    'http://graphql-1:4000',
    'http://graphql-2:4000',
  ],
};

// Round-robin load balancing
let requestIndex = 0;
const getServiceUrl = (serviceName) => {
  const instances = serviceInstances[serviceName] || [config.services[serviceName]];
  const url = instances[requestIndex % instances.length];
  requestIndex++;
  return url;
};
```

### Caching Strategy

```javascript
// Redis-based caching for gateway responses
const cacheMiddleware = (cacheDuration = 300) => {
  return async (req, res, next) => {
    const key = `gateway:${req.method}:${req.path}`;
    
    // Check cache
    const cached = await redisClient.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    // Continue to proxy...
    const originalJson = res.json;
    res.json = function(data) {
      // Cache successful responses
      if (res.statusCode === 200) {
        redisClient.setex(key, cacheDuration, JSON.stringify(data));
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
};
```

---

## 🎯 MONITORING & OBSERVABILITY

### Logging Configuration

```javascript
{
  level: 'info',
  format: 'json',
  transports: [
    {
      type: 'file',
      filename: 'logs/gateway.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    },
    {
      type: 'file',
      filename: 'logs/gateway-errors.log',
      level: 'error',
    },
    {
      type: 'console',
      colorize: true,
    },
  ],
}
```

### Metrics Collection

```javascript
// Prometheus-compatible metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Send metrics to Prometheus
    metrics.recordRequest({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      timestamp: new Date(),
    });
  });
  
  next();
};
```

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Update gateway configuration for all 8 modules
- [ ] Configure Docker Compose with new service mappings
- [ ] Set environment variables for all services
- [ ] Test health check endpoints
- [ ] Verify service-to-service routing
- [ ] Implement load balancing (if multiple instances)
- [ ] Set up Redis caching
- [ ] Configure monitoring/logging
- [ ] Run integration tests
- [ ] Validate performance under load
- [ ] Deploy to staging environment
- [ ] Run production readiness checks

---

**Status**: Configuration ready for implementation  
**Next**: Deploy enhanced gateway configuration  
**Effort**: 2-3 hours for complete setup & testing

