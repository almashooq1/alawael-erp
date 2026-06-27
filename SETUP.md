# Al-Awael ERP — Development Setup Guide
**الإعداد التطويري لنظام الأوائل ERP**

---

## Quick Start (3 Options)

### Option A: Docker (Recommended — Zero Local Install)

```bash
# Start MongoDB + Redis only (backend runs on your host)
docker-compose -f docker-compose.streamlined.yml up -d mongodb redis

# Verify
docker-compose ps
# Expected: mongodb, redis running

# Set .env
MONGODB_URI=mongodb://alawael:alawael123@localhost:27017/alawael?authSource=admin
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true

# Start backend
npm run dev
```

### Option B: Local Services (Faster, requires install)

```bash
# 1. Install MongoDB Community Server
#    https://www.mongodb.com/try/download/community
#    Windows: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-windows/

# 2. Install Redis
#    Windows: https://github.com/microsoftarchive/redis/releases
#    Or use Memurai: https://www.memurai.com/

# 3. Start services
mongod --dbpath C:\data\db
redis-server

# 4. Set .env
MONGODB_URI=mongodb://localhost:27017/alawael-erp
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true

# 5. Start backend
npm run dev
```

### Option C: In-Memory (No persistence — data lost on restart)

```bash
# No services needed — all in-memory
USE_MOCK_DB=true
REDIS_ENABLED=false

npm run dev
```

---

## Environment Variables

Create `.env` from `.env.development`:

```bash
cp backend/.env.development .env
# Edit .env with your values
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/alawael-erp` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `REDIS_ENABLED` | Enable Redis caching | `true` |
| `JWT_SECRET` | JWT signing key (min 32 chars) | `change-me-in-production-32-chars` |
| `JWT_REFRESH_SECRET` | JWT refresh key | `change-me-too-32-chars` |
| `ENCRYPTION_KEY` | Field encryption key | `dev-key-32-characters-long` |
| `SESSION_SECRET` | Session cookie secret | `dev-session-16-char` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000` |
| `ENABLE_SWAGGER` | Enable API docs | `true` |
| `USE_MOCK_DB` | Use in-memory MongoDB | `false` |

---

## Service URLs (when running)

| Service | URL | Notes |
|---------|-----|-------|
| Backend API | `http://localhost:3001` | Main API |
| Health Check | `http://localhost:3001/health` | Readiness probe |
| Swagger Docs | `http://localhost:3001/api/docs` | API documentation |
| Route Health | `http://localhost:3001/api/health/routes` | Route registry status |
| MongoDB | `mongodb://localhost:27017` | Direct connection |
| Redis | `redis://localhost:6379` | Direct connection |
| Mongo Express | `http://localhost:8081` | MongoDB GUI (dev profile) |
| Redis Commander | `http://localhost:8082` | Redis GUI (dev profile) |
| Grafana | `http://localhost:3060` | Monitoring (monitoring profile) |
| Prometheus | `http://localhost:9090` | Metrics (monitoring profile) |

---

## Troubleshooting

### MongoDB connection refused
```bash
# Check if MongoDB is running
netstat -ano | findstr :27017
# or
lsof -i :27017

# Start MongoDB (if not running)
mongod --dbpath /data/db

# If using Docker
docker-compose -f docker-compose.streamlined.yml up -d mongodb
```

### Redis connection refused
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis (if not running)
redis-server

# If using Docker
docker-compose -f docker-compose.streamlined.yml up -d redis
```

### Port already in use
```bash
# Find process on port 3001
lsof -i :3001
# or
netstat -ano | findstr :3001

# Kill it
kill -9 <PID>
# or
taskkill /PID <PID> /F
```

### USE_MOCK_DB fallback
If you see `MONGODB_URI not set — using localhost fallback` or `USE_MOCK_DB=true`, the app will use either:
- `MongoMemoryServer` (in-memory, no persistence)
- `localhost:27017` fallback

This is fine for development but **data will be lost on restart**.

---

## Useful Commands

```bash
# Development
npm run dev              # Start with nodemon (auto-reload)
npm run start            # Start without nodemon

# Testing
npm run smoke:comprehensive   # Full smoke test
npm run audit:stubs           # Check for stub controllers
npm run test:guard            # Run test guards

# Database
npm run db:setup           # Setup database indexes
npm run db:seed:all        # Seed all demo data
npm run db:backup:full     # Backup database

# Validation
npm run env:check          # Check environment variables
npm run lint               # Run ESLint
npm run typecheck          # TypeScript type check

# Setup
npm run setup              # Run setup wizard
node scripts/setup-dev.js  # Check services status
```

---

## Architecture Notes

- **Backend**: Express 4 + Mongoose 9 + Socket.IO 4
- **Frontend**: React 18 + Vite + MUI 6 + Framer Motion
- **Database**: MongoDB 7 (with Redis 7 for cache)
- **Authentication**: JWT + bcryptjs + role-based access
- **Validation**: Joi + express-validator
- **Testing**: Jest + Supertest + mongodb-memory-server
- **Docs**: Swagger (OpenAPI 3.0)
- **Monitoring**: Prometheus + Grafana + Loki + Jaeger (optional profiles)

---

*Last updated: 2026-06-26*
