# 🚀 Quick Start Guide - Intelligent Agent Platform

## ⚡ Fast Setup (5 minutes)

### Step 1: Install Dependencies

```bash
# Navigate to project directory
cd intelligent-agent

# Install backend dependencies
npm install

# Install frontend dependencies (if needed)
cd frontend && npm install && cd ..
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
# Minimum required: JWT_SECRET
```

### Step 3: Start Redis (Required)

**Option A: Using Docker (Recommended)**

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Option B: Local Redis**

```bash
# Windows (if installed)
redis-server

# Linux/Mac
sudo service redis start
```

### Step 4: Build & Start Server

```bash
# Build TypeScript
npm run build

# Start server
npm start

# OR for development with auto-reload
npm run dev
```

### Step 5: Verify Installation

Open your browser and check:

- **Health Check**: http://localhost:3001/health
- **GraphQL Playground**: http://localhost:3001/graphql
- **API Info**: http://localhost:3001/api
- **Analytics**: http://localhost:3001/api/analytics/overview

---

## 🎯 Test Advanced Features

### 1. Test GraphQL API

Open http://localhost:3001/graphql and try:

```graphql
# Query: Get API version info
query {
  __schema {
    queryType {
      name
    }
  }
}

# Mutation: Register user
mutation {
  register(
    input: {
      email: "test@example.com"
      username: "testuser"
      password: "password123"
    }
  ) {
    token
    user {
      id
      username
      email
    }
  }
}

# Subscription: Real-time notifications
subscription {
  systemNotification {
    type
    message
    timestamp
  }
}
```

### 2. Test WebSocket

```javascript
// In browser console or Node.js
const io = require('socket.io-client');
const socket = io('http://localhost:3001', {
  path: '/ws',
  auth: {
    token: 'your_jwt_token_here',
  },
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
});

socket.on('notification:new', data => {
  console.log('📬 New notification:', data);
});
```

### 3. Test Analytics API

```bash
# Overview
curl http://localhost:3001/api/analytics/overview

# Real-time metrics
curl http://localhost:3001/api/analytics/real-time

# Trends
curl "http://localhost:3001/api/analytics/trends?metric=users&period=7d"
```

### 4. Test Rate Limiting

```bash
# Check rate limit headers
curl -I http://localhost:3001/api/analytics/overview

# Headers you'll see:
# X-RateLimit-Limit: 1000
# X-RateLimit-Remaining: 999
# X-RateLimit-Reset: 1643723400
```

### 5. Test Caching

```bash
# First request (cache miss)
time curl http://localhost:3001/api/analytics/overview

# Second request (cache hit - should be faster)
time curl http://localhost:3001/api/analytics/overview
```

---

## 📊 Monitor Services

### Check Queue Status

```bash
# In another terminal
node -e "
const { queueService, JobType } = require('./dist/services/queue');
queueService.getAllQueueStats().then(stats => {
  console.log('📊 Queue Stats:', JSON.stringify(stats, null, 2));
});
"
```

### Check Cache Status

```bash
# In Node.js console
const { cacheService } = require('./dist/services/cache');
console.log('Cache Stats:', cacheService.getStats());
```

### Check Connected WebSocket Users

```bash
# Will be available through WebSocket service
```

---

## 🐛 Troubleshooting

### Problem: Server won't start

**Solution 1: Check if port is in use**

```bash
# Windows
netstat -ano | findstr :3001

# Linux/Mac
lsof -i :3001

# Kill process if needed
taskkill /PID <PID> /F  # Windows
kill -9 <PID>           # Linux/Mac
```

**Solution 2: Check Redis connection**

```bash
# Test Redis connection
redis-cli ping
# Should return: PONG

# Or using Node.js
node -e "const Redis = require('ioredis'); const redis = new Redis(); redis.ping().then(r => console.log('Redis:', r));"
```

**Solution 3: Check environment variables**

```bash
# Make sure .env file exists
cat .env

# Verify JWT_SECRET is set
echo $JWT_SECRET
```

### Problem: GraphQL endpoint not working

**Check:**

1. Server started successfully (check console logs)
2. Visit http://localhost:3001/health (should return JSON)
3. GraphQL is enabled in .env: `ENABLE_GRAPHQL=true`
4. No TypeScript compilation errors: `npm run build`

### Problem: WebSocket connection fails

**Check:**

1. CORS configuration allows your frontend URL
2. JWT token is valid (if using authentication)
3. WebSocket path is correct: `/ws`
4. Browser supports WebSocket (all modern browsers do)

### Problem: Queue jobs not processing

**Check:**

1. Redis is running: `redis-cli ping`
2. Queue workers started (they start with server)
3. Check Redis connection settings in .env
4. Monitor queue stats (see "Monitor Services" above)

---

## 📚 API Documentation

### REST API Endpoints

```
GET  /health                          # Health check
GET  /api                             # API info
GET  /api/versions                    # Available API versions
GET  /api/versions/:version/changelog # Version changelog

# Analytics
GET  /api/analytics/overview          # System overview
GET  /api/analytics/real-time         # Real-time metrics
GET  /api/analytics/trends            # Trend analysis
GET  /api/analytics/user/:id          # User analytics
GET  /api/analytics/project/:id       # Project analytics
GET  /api/analytics/export            # Export data
```

### GraphQL Schema

See full schema at: http://localhost:3001/graphql

**Main Types:**

- User, Project, Dataset, Model, Prediction
- Analytics (Overview, Trends, Performance)

**Queries:** 15+ (users, projects, datasets, models, predictions, analytics,
search)

**Mutations:** 20+ (register, login, createProject, trainModel, predict, etc.)

**Subscriptions:** 5 (modelTrainingProgress, modelStatusChanged, projectUpdated,
newPrediction, systemNotification)

### WebSocket Events

**Server → Client:**

```javascript
'connected'; // Welcome message
'project:updated'; // Project changes
'model:training-progress'; // Training updates
'model:status-changed'; // Model status
'chat:new-message'; // Chat messages
'user:status'; // User online/offline
'notification:new'; // New notifications
```

**Client → Server:**

```javascript
'project:join'; // Join project room
'project:leave'; // Leave project room
'chat:message'; // Send chat message
'chat:typing'; // Typing indicator
'chat:stop-typing'; // Stop typing
```

---

## 🎓 Next Steps

1. **Read Full Documentation**: See `_ADVANCED_FEATURES_GUIDE.md`
2. **Explore GraphQL Schema**: Open GraphQL Playground
3. **Test Real-time Features**: Try WebSocket chat example
4. **Monitor Performance**: Check analytics dashboard
5. **Configure Multi-tenancy**: Set up tenant isolation
6. **Deploy to Production**: Use Docker/Kubernetes configs

---

## 💡 Useful Commands

```bash
# Development
npm run dev              # Start with auto-reload
npm run build            # Compile TypeScript
npm run lint             # Check code style
npm run format           # Format code
npm test                 # Run tests

# Production
npm start                # Start compiled server
npm run clean            # Clean build files

# Docker
docker-compose up -d     # Start all services
docker-compose down      # Stop all services
docker-compose logs -f   # View logs

# Kubernetes (if deployed)
kubectl get pods         # View running pods
kubectl logs <pod>       # View pod logs
kubectl port-forward     # Access services
```

---

## 🆘 Support

For issues or questions:

1. Check logs: `docker-compose logs backend`
2. Review documentation: `_ADVANCED_FEATURES_GUIDE.md`
3. Verify environment: `.env` file configured correctly
4. Check Redis: `redis-cli ping`

---

## ✅ Checklist

Before reporting issues, verify:

- [ ] Node.js >= 18.0.0 installed (`node --version`)
- [ ] npm >= 9.0.0 installed (`npm --version`)
- [ ] Redis server running (`redis-cli ping`)
- [ ] Dependencies installed (`npm install`)
- [ ] .env file configured (`cp .env.example .env`)
- [ ] TypeScript compiled (`npm run build`)
- [ ] Port 3001 available (not in use)
- [ ] CORS configured for your frontend URL

---

**🎉 You're all set! Start building amazing AI applications!**
