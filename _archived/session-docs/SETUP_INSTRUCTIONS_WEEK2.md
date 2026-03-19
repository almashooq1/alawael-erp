# 🚀 Phase 13 Week 2 - Local Setup Instructions

## Quick Start (No Docker Required)

### Option 1: Using Chocolatey (Windows)

```powershell
# Install PostgreSQL 14
choco install postgresql14 -y

# Install Redis
choco install redis-64 -y

# After installation, create the database
psql -U postgres
```

Then in PostgreSQL prompt:
```sql
CREATE DATABASE alawael_erp;
CREATE USER alawael_user WITH PASSWORD 'alawael_secure_password';
GRANT ALL PRIVILEGES ON DATABASE alawael_erp TO alawael_user;
```

### Option 2: Using Docker Compose

```bash
# Navigate to dashboard directory
cd dashboard

# Start all services (PostgreSQL Primary + 2 Replicas + Redis)
docker-compose -f docker-compose.dev.yml up -d

# Verify services
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Option 3: Manual Installation

#### PostgreSQL (Windows)
1. Download from: https://www.postgresql.org/download/windows/
2. Run installer
3. Set password: `alawael_secure_password`
4. Keep default port: 5432
5. After installation:
```powershell
# Create database
"CREATE DATABASE alawael_erp;" | psql -U postgres
"CREATE USER alawael_user WITH PASSWORD 'alawael_secure_password';" | psql -U postgres
"GRANT ALL PRIVILEGES ON DATABASE alawael_erp TO alawael_user;" | psql -U postgres
```

#### Redis (Windows)
1. Download from: https://github.com/microsoftarchive/redis/releases
2. Extract to `C:\Redis` or use Chocolatey
3. Start Redis:
```powershell
C:\Redis\redis-server.exe
# Or if using WSL/WSL2:
wsl redis-server
```

---

## Verification Steps

### 1. Test PostgreSQL Connection

```powershell
# Set environment variable
$env:PGPASSWORD = 'alawael_secure_password'

# Test connection
psql -h localhost -U alawael_user -d alawael_erp -c "SELECT 1;"
# Expected output: (1 row)
```

### 2. Test Redis Connection

```powershell
# Using redis-cli
redis-cli ping
# Expected output: PONG

# Using redis-cli from Node.js
node -e "const redis = require('redis'); const client = redis.createClient(); client.ping((err, res) => { console.log('Redis:', res); process.exit(0); });"
```

### 3. Run Database Migrations

```powershell
cd dashboard/server

# Set password
$env:PGPASSWORD = 'alawael_secure_password'

# Run migrations
psql -h localhost -U alawael_user -d alawael_erp -f migrations/001_week2_optimizations.sql

# Verify migration
psql -h localhost -U alawael_user -d alawael_erp -c "\dt"
# Should show: users, audit_logs, quality_metrics, sessions tables
```

### 4. Start Backend Server

```powershell
cd dashboard/server
$env:PGPASSWORD = 'alawael_secure_password'
node index.js
```

Expected output:
```
✅ Database pool ready
✅ Redis connection ready
✅ Server running on port 3001
```

---

## Configuration

### Environment Variables (.env)

Location: `dashboard/server/.env`

```env
# PostgreSQL Primary
DB_PRIMARY_HOST=localhost
DB_PRIMARY_PORT=5432
DB_PRIMARY_DATABASE=alawael_erp
DB_PRIMARY_USER=alawael_user
DB_PRIMARY_PASSWORD=alawael_secure_password
DB_POOL_MIN=2
DB_POOL_MAX=20

# Read Replicas (optional for development)
DB_REPLICA_HOSTS=localhost:5433,localhost:5434
DB_REPLICA_USER=alawael_user
DB_REPLICA_PASSWORD=alawael_secure_password

# Redis
REDIS_MODE=standalone
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Query Optimization
QUERY_CACHE_ENABLED=true
QUERY_CACHE_TTL=300
SLOW_QUERY_THRESHOLD=1000
VERY_SLOW_QUERY_THRESHOLD=5000
```

---

## Running Tests

### Complete Test Suite

```powershell
cd dashboard/server

# Run all tests
npm test

# Expected results:
# Test Suites: 5 total
# Tests: 235+ total
# - 73 unit tests (Week 1: RBAC, Audit)
# - 60+ database tests (Week 2)
# - 50+ redis tests (Week 2)
# - 40+ query optimizer tests (Week 2)
```

### Individual Test Suites

```powershell
cd dashboard/server

# Week 1 tests (should still be passing)
npm test -- --testPathPattern="rbac|audit"
# Expected: 73/73 passing

# Week 2 database tests
npm test -- tests/database.test.js
# Expected: 60+ passing (once PostgreSQL is running)

# Week 2 redis tests
npm test -- tests/redis.test.js
# Expected: 50+ passing (once Redis is running)

# Week 2 query optimizer tests
npm test -- tests/queryOptimizer.test.js
# Expected: 40+ passing (once DB and Redis are running)
```

---

## Troubleshooting

### PostgreSQL Connection Failed

```powershell
# Check if PostgreSQL is running
# Windows Services: Services.msc -> PostgreSQL
# Or check port:
netstat -ano | findstr :5432

# If not running, start it:
# Windows: Go to Services and start PostgreSQL
# Or: pg_ctl -D "C:\Program Files\PostgreSQL\14\data" start

# Verify connection
psql -U postgres
# If this fails, PostgreSQL is not running properly
```

### Redis Connection Failed

```powershell
# Check if Redis is running
netstat -ano | findstr :6379

# Start Redis if not running:
redis-server

# Or if using Windows Services:
# redis-server --service-start

# Verify connection
redis-cli ping
```

### Database Migrations Failed

```powershell
# Check PostgreSQL user permissions
psql -U postgres -d alawael_erp -c "GRANT ALL ON SCHEMA public TO alawael_user;"

# Re-run migrations
psql -h localhost -U alawael_user -d alawael_erp -f migrations/001_week2_optimizations.sql
```

### Tests Still Failing

```powershell
# Clear test cache
cd dashboard/server
rm -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue

# Reinstall dependencies
npm install

# Run tests with verbose output
npm test -- --verbose

# Check for env variables
node -e "console.log('DB_PRIMARY_HOST:', process.env.DB_PRIMARY_HOST)"
```

---

## Service URLs

Once everything is running:

| Service | URL | Credentials |
|---------|-----|-------------|
| Backend API | http://localhost:3001 | N/A |
| Backend Health | http://localhost:3001/health | N/A |
| Redis (local) | localhost:6379 | None |
| Redis Commander | http://localhost:8081 | N/A (Docker only) |
| pgAdmin | http://localhost:5050 | admin / admin (Docker only) |

---

## Performance Benchmarks (After Setup)

Run performance tests:

```powershell
cd dashboard/server

# Query caching performance
npm test -- tests/queryOptimizer.test.js --verbose

# Database pool performance
npm test -- tests/database.test.js --verbose

# Full load test (requires jest-benchmark or custom tests)
npm run test:benchmark
```

Expected improvements:
- ✅ Cached query: 10× faster
- ✅ Batch insert: 100× faster
- ✅ Connection pooling: 80% efficiency
- ✅ Cache hit rate: >70%

---

## Next Steps

1. ✅ **Setup Infrastructure** (1-2 hours)
   - [ ] Install PostgreSQL
   - [ ] Install Redis
   - [ ] Create database
   - [ ] Run migrations

2. ✅ **Run Tests** (1 hour)
   - [ ] Week 1 regression tests
   - [ ] Week 2 infrastructure tests
   - [ ] Full test suite

3. ⏳ **Performance Validation** (1 hour)
   - [ ] Measure cache hit rates
   - [ ] Validate performance improvements
   - [ ] Stress test with concurrent users

4. ⏳ **Production Deployment** (2-4 hours)
   - [ ] Setup production databases
   - [ ] Configure read replicas
   - [ ] Deploy to staging
   - [ ] Final validation

---

## Support

For detailed information, see:
- [DATABASE_OPTIMIZATION_GUIDE.md](../DATABASE_OPTIMIZATION_GUIDE.md)
- [WEEK2_INTEGRATION_CHECKLIST.md](../WEEK2_INTEGRATION_CHECKLIST.md)
- [WEEK2_INTEGRATION_COMPLETE_MARCH2_2026.md](../WEEK2_INTEGRATION_COMPLETE_MARCH2_2026.md)

Questions? Check the troubleshooting guide or review the error messages carefully.

---

**Created**: March 2, 2026
**Phase**: 13 Week 2
**Status**: Setup Documentation Complete
