# ⚡ PERFORMANCE OPTIMIZATION GUIDE

**Purpose**: Maximize system speed and efficiency  
**Target Audience**: Backend engineers, DevOps, Database administrators  
**Last Updated**: January 29, 2026

---

## 📊 Performance Metrics

### Key Performance Indicators (KPIs)

```bash
# API Response Time
- Target: p95 < 200ms, p99 < 500ms
- Monitor: Prometheus metric: http_request_duration_seconds_bucket

# Frontend Load Time
- Target: First Contentful Paint (FCP) < 1.5s
- Monitor: Google Core Web Vitals

# Database Query Time
- Target: p95 < 50ms
- Monitor: PostgreSQL: pg_stat_statements

# Error Rate
- Target: < 0.1%
- Monitor: Prometheus: http_requests_total{status=~"5.."}

# CPU Usage
- Target: < 70% avg, < 90% peak
- Monitor: Kubernetes metrics

# Memory Usage
- Target: < 80% of limit
- Monitor: Kubernetes metrics

# Cache Hit Rate
- Target: > 95%
- Monitor: Redis: keyspace_hits / keyspace_misses
```

### Baseline Metrics (Current)

```bash
# Collect current metrics
kubectl top nodes  # CPU and memory usage
kubectl top pods -n production  # Per-pod usage
kubectl get pvc -n production  # Storage usage

# API response time
kubectl logs deployment/intelligent-agent-backend -n production | grep "response_time" | tail -100

# Query performance
psql intelligent_agent -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Record baseline for comparison
# Use: Prometheus, Grafana, or CloudWatch for trending
```

---

## 🗄️ Database Optimization

### Index Optimization

```sql
-- [ ] Analyze index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- [ ] Identify missing indexes
SELECT
  schemaname, tablename, attname,
  n_distinct, correlation
FROM pg_stats
WHERE correlation < -0.1 OR correlation > 0.1
ORDER BY ABS(correlation) DESC;

-- [ ] Create missing indexes on frequently queried columns
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_projects_user_id ON projects(user_id);
CREATE INDEX CONCURRENTLY idx_datasets_project_id ON datasets(project_id);

-- [ ] Create composite indexes for common query patterns
CREATE INDEX CONCURRENTLY idx_projects_user_status
ON projects(user_id, status)
INCLUDE (name, created_at);

-- [ ] Use partial indexes for filtered queries
CREATE INDEX CONCURRENTLY idx_active_projects
ON projects(user_id)
WHERE status = 'active' AND deleted_at IS NULL;

-- [ ] Verify indexes are being used
EXPLAIN ANALYZE
SELECT * FROM projects WHERE user_id = 123 AND status = 'active';

-- Expected: "Index Scan using idx_projects_user_status on projects"
```

### Query Optimization

```sql
-- [ ] Identify slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC
LIMIT 20;

-- [ ] EXPLAIN ANALYZE slow queries
EXPLAIN ANALYZE
SELECT u.id, u.email, COUNT(p.id) as project_count
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id;

-- [ ] Optimize N+1 queries by using JOINs
-- Bad: N+1 queries
SELECT * FROM projects;
-- Then in loop: SELECT * FROM datasets WHERE project_id = $1;

-- Good: Single query with JOIN
SELECT p.*, d.*
FROM projects p
LEFT JOIN datasets d ON p.id = d.project_id
WHERE p.user_id = $1;

-- [ ] Use window functions instead of subqueries
-- Slow: Subquery
SELECT id, name,
  (SELECT COUNT(*) FROM datasets WHERE project_id = projects.id) as dataset_count
FROM projects;

-- Fast: Window function
SELECT id, name,
  COUNT(*) OVER (PARTITION BY project_id) as dataset_count
FROM projects;

-- [ ] Batch operations
-- Slow: Individual inserts
INSERT INTO logs (event, user_id) VALUES ('login', 1);
INSERT INTO logs (event, user_id) VALUES ('upload', 1);

-- Fast: Batch insert
INSERT INTO logs (event, user_id) VALUES ('login', 1), ('upload', 1);

-- [ ] Use LIMIT for pagination
-- Slow: No LIMIT (returns all)
SELECT * FROM large_table ORDER BY created_at;

-- Fast: Paginate
SELECT * FROM large_table ORDER BY created_at DESC LIMIT 20 OFFSET 0;

-- [ ] Analyze table statistics regularly
ANALYZE; -- For current database
ANALYZE users; -- For specific table
```

### Connection Pooling

```bash
# [ ] Configure PgBouncer for connection pooling
# File: /etc/pgbouncer/pgbouncer.ini

[databases]
intelligent_agent = host=db.example.com port=5432 dbname=intelligent_agent

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3
max_idle_time = 600
max_db_connections = 100
max_user_connections = 50

# [ ] Monitor connection usage
SHOW STATS;  -- In pgbouncer CLI
SHOW CLIENTS;

# [ ] Set up in Kubernetes
kubectl create configmap pgbouncer-config --from-file=/etc/pgbouncer/ -n production

# [ ] Verify connection pooling working
# Before: Many connections from pods
# After: Few connections pooled through PgBouncer
```

### Cache Strategy

```sql
-- [ ] Identify hot data (frequently accessed)
SELECT table_name, idx_scan, seq_scan
FROM pg_stat_user_tables
ORDER BY seq_scan DESC
LIMIT 10;

-- [ ] Cache frequently accessed data
-- Example: User settings, feature flags, product metadata

-- [ ] Implement caching layers
-- Application level (in-memory): 5 second TTL
// Node.js example
const cache = new Map();
const TTL = 5000; // 5 seconds

function getCachedUser(userId) {
  if (cache.has(userId) && Date.now() - cache.get(userId).time < TTL) {
    return cache.get(userId).data;
  }
  const user = db.query('SELECT * FROM users WHERE id = $1', [userId]);
  cache.set(userId, { data: user, time: Date.now() });
  return user;
}

-- [ ] Implement database query cache (Redis): 1 hour TTL
-- See Redis optimization below
```

---

## ⚙️ Backend Optimization

### Node.js Optimization

```bash
# [ ] Enable clustering for multi-core utilization
// cluster.js
const cluster = require('cluster');
const os = require('os');
const app = require('./app');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  console.log(`Starting ${numCPUs} workers`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  app.listen(5000);
}

# [ ] Use worker threads for CPU-intensive tasks
const { Worker } = require('worker_threads');

function computeAI(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./ai-worker.js');
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.postMessage(data);
  });
}

# [ ] Enable compression for responses
const compression = require('compression');
app.use(compression({ level: 6 })); // 1-9, 6 is default

# [ ] Implement streaming for large responses
// Instead of loading everything in memory:
app.get('/api/export/users', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  const stream = db.query('SELECT * FROM users').stream();
  stream.pipe(res);
});

# [ ] Profile with clinic.js
npm install -g clinic
clinic doctor -- node app.js
clinic flame -- node app.js  # CPU flame graph

# [ ] Monitor heap usage
node --expose-gc app.js
// In code:
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Heap used:', used.heapUsed / 1024 / 1024, 'MB');
}, 60000);

# [ ] Use v8 code caching for faster startup
node --code-cache-path=./cache app.js
```

### Middleware Optimization

```bash
# [ ] Order middleware for performance
// Fast middleware first:
app.use(compression()); // CPU-light
app.use(cors()); // CPU-light
app.use(authentication); // CPU-light
app.use(logging); // CPU-medium
app.use(bodyParser()); // CPU-medium
app.use(errorHandling); // Executed last

# [ ] Avoid expensive operations in middleware
// Bad: Database query in every request
app.use((req, res, next) => {
  db.query('SELECT * FROM config'); // Slow!
  next();
});

// Good: Cache config in memory
const configCache = { updated: 0, data: {} };
app.use((req, res, next) => {
  if (Date.now() - configCache.updated > 60000) {
    db.query('SELECT * FROM config').then(data => {
      configCache.data = data;
      configCache.updated = Date.now();
    });
  }
  req.config = configCache.data;
  next();
});

# [ ] Implement rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ client: redis })
});

app.use('/api/', limiter);
```

### Request/Response Optimization

```bash
# [ ] Reduce payload size
// Select only needed fields
SELECT id, name, email FROM users;  // Good
SELECT * FROM users;  // Bad (includes unused fields)

# [ ] Use field filtering/projection
// API query: GET /api/users?fields=id,name,email
router.get('/api/users', (req, res) => {
  const fields = req.query.fields?.split(',') || ['id', 'name', 'email'];
  db.query('SELECT ' + fields.join(',') + ' FROM users');
});

# [ ] Implement pagination defaults
// Enforce reasonable limits
router.get('/api/users', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;
  db.query('SELECT * FROM users LIMIT $1 OFFSET $2', [limit, offset]);
});

# [ ] Use GraphQL for flexible queries (if applicable)
// Prevents over-fetching and under-fetching
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email  # Only requested fields
  }
}
```

---

## 🎨 Frontend Optimization

### Bundle Optimization

```bash
# [ ] Analyze bundle size
npm install -g webpack-bundle-analyzer
webpack-bundle-analyzer dist/stats.json

# [ ] Tree-shake unused code
// webpack.config.js
mode: 'production',
optimization: {
  usedExports: true,
  sideEffects: false
}

# [ ] Code splitting
// Lazy load components
const Dashboard = React.lazy(() => import('./Dashboard'));
<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>

# [ ] Minify and compress
// webpack.config.js
new TerserPlugin({
  terserOptions: {
    compress: {
      drop_console: true,
    },
  },
})

# [ ] Remove unused dependencies
npm audit --production
npm prune --production

# [ ] Check bundle size limits
// package.json
"scripts": {
  "bundle-check": "bundlesize"
}

// .bundlesizerc.json
{
  "files": [
    { "path": "./dist/main.js", "maxSize": "250KB" },
    { "path": "./dist/main.css", "maxSize": "50KB" }
  ]
}
```

### Runtime Performance

```bash
# [ ] Lazy load images
// Use Intersection Observer
const images = document.querySelectorAll('[data-src]');
const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});
images.forEach(img => imageObserver.observe(img));

# [ ] Memoize expensive computations
// React
const memoizedValue = useMemo(() => expensiveComputation(a, b), [a, b]);

# [ ] Implement virtual scrolling for long lists
npm install react-window
import { FixedSizeList } from 'react-window';

# [ ] Optimize re-renders
// React DevTools Profiler
React.ProfilerAPI.startProfiling()
// Analyze components re-rendering unnecessarily

# [ ] Prefetch/Preload resources
// In HTML head
<link rel="preload" as="script" href="/main.js">
<link rel="prefetch" href="/next-page.js">

# [ ] Use WASM for compute-heavy operations
// Python ML model in WebAssembly
const wasmModule = await WebAssembly.instantiateStreaming(fetch('model.wasm'));
const result = wasmModule.instance.exports.predict(data);
```

### Core Web Vitals

```bash
# [ ] Optimize Largest Contentful Paint (LCP)
// Target: < 2.5s
- Optimize images (WebP, lazy load)
- Remove render-blocking resources
- Use CDN for content delivery
- Implement server-side rendering (SSR)

# [ ] Optimize Cumulative Layout Shift (CLS)
// Target: < 0.1
- Reserve space for images/ads (width/height)
- Avoid inserting content above existing content
- Use transform animations instead of layout changes

# [ ] Optimize First Input Delay (FID)
// Target: < 100ms
- Break up long JavaScript tasks (< 50ms each)
- Use Web Workers for heavy processing
- Defer non-critical JavaScript
```

---

## 💾 Cache Optimization

### Redis Optimization

```bash
# [ ] Configure Redis for performance
# redis.conf
maxclients 10000
timeout 300
tcp-backlog 511
tcp-keepalive 300

# [ ] Use appropriate data structures
# String: Simple values (user session)
redis-cli SET user:123:session "data" EX 3600

# List: Ordered collections (activity log)
redis-cli RPUSH user:123:activity "event1" "event2"

# Set: Unique items (tags)
redis-cli SADD article:123:tags "ai" "ml" "python"

# Sorted Set: Ranked items (leaderboard)
redis-cli ZADD leaderboard 1000 "user1" 2000 "user2"

# Hash: Object representation (user profile)
redis-cli HSET user:123 name "John" email "john@example.com"

# [ ] Implement cache invalidation strategy
// Time-based: TTL
redis-cli SET cache:key value EX 300  // 5 min expiry

// Event-based: Invalidate on data change
// User updated → delete cache:user:123

// LRU: Automatic eviction
maxmemory 2gb
maxmemory-policy allkeys-lru

# [ ] Monitor Redis performance
redis-cli INFO stats
# Look for: evicted_keys, rejected_connections

# [ ] Implement pub/sub for cache invalidation
// Backend service
redis-cli PUBLISH cache-invalidation "user:123"

// Cache service listening
redis.subscribe('cache-invalidation');
// On receive: delete from cache
```

### HTTP Caching

```bash
# [ ] Set cache headers for static assets
# .htaccess or nginx.conf
<FilesMatch "\\.(jpg|jpeg|png|gif|ico|css|js)$">
  Header set Cache-Control "max-age=31536000, public"
</FilesMatch>

<FilesMatch "\\.(html)$">
  Header set Cache-Control "max-age=3600, must-revalidate"
</FilesMatch>

# [ ] Implement ETag for cache validation
Response Header:
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"

# [ ] Use Last-Modified for conditional requests
Response Header:
Last-Modified: Wed, 21 Oct 2025 07:28:00 GMT

# [ ] Implement 304 Not Modified responses
// Server checks If-None-Match
if (req.headers['if-none-match'] === currentETag) {
  res.status(304).end();
}

# [ ] CDN cache headers
// Static assets: 1 year
Cache-Control: public, max-age=31536000

// API responses: 5 minutes
Cache-Control: public, max-age=300

// User-specific: Don't cache
Cache-Control: private, no-cache
```

---

## 🌐 Network Optimization

### Content Delivery Network (CDN)

```bash
# [ ] Set up CDN for static assets
# Configure in hosting provider (CloudFlare, AWS CloudFront, etc.)

# [ ] Route static files through CDN
// Update URLs in frontend
<img src="https://cdn.intelligent-agent.com/logo.png" />
<script src="https://cdn.intelligent-agent.com/main.js"></script>

# [ ] Enable Brotli compression on CDN
Accept-Encoding: gzip, deflate, br

# [ ] Set up origin shielding to reduce origin load
// CDN → Origin Shield → Origin
```

### HTTP/2 & HTTP/3

```bash
# [ ] Enable HTTP/2
# nginx.conf
server {
  listen 443 ssl http2;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
}

# [ ] Enable server push for critical resources
# Push JavaScript and CSS with HTML
server_push /assets/main.js as="script";
server_push /assets/main.css as="style";

# [ ] Enable HTTP/3 (QUIC)
# Modern browsers automatically upgrade if available
```

### Request Optimization

```bash
# [ ] Reduce DNS lookups
// Consolidate domains
one-api-domain.com (instead of api1, api2, api3)

# [ ] Use persistent connections (Keep-Alive)
// Default in HTTP/1.1
Connection: keep-alive

# [ ] Minimize redirects
// Bad: /index.html → /dashboard → /home
// Good: /index.html → /home directly

# [ ] Parallelize non-blocking requests
// Load 4 resources in parallel
Promise.all([
  fetch('/api/users'),
  fetch('/api/projects'),
  fetch('/api/datasets'),
  fetch('/api/settings')
])
```

---

## 📈 Monitoring & Profiling

### Prometheus Metrics

```bash
# [ ] Key metrics to track
# API response time
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Database query time
rate(db_query_duration_seconds_sum[5m]) / rate(db_query_duration_seconds_count[5m])

# Cache hit rate
redis_keyspace_hits / (redis_keyspace_hits + redis_keyspace_misses)

# [ ] Set up performance dashboards
// Grafana dashboard includes:
- Request latency (p50, p95, p99)
- Throughput (requests/sec)
- Error rate (%)
- Resource usage (CPU, memory)
- Cache hit rate (%)
```

### Performance Testing

```bash
# [ ] Load test after optimizations
./load-tests/run-load-tests.sh all

# [ ] Compare before/after metrics
# Record baseline → Optimize → Load test → Compare

# [ ] Set performance budgets
# max_api_latency: 200ms p95
# max_page_load: 2s FCP
# max_bundle_size: 250KB

# [ ] Run synthetic monitoring
// Continuous monitoring from multiple locations
// Detects regressions automatically
```

---

## ✅ Optimization Checklist

- [ ] Database indexes created
- [ ] Slow queries identified and optimized
- [ ] Connection pooling configured
- [ ] Redis caching implemented
- [ ] Node.js clustering enabled
- [ ] Compression enabled
- [ ] Bundle optimized and code-split
- [ ] CDN configured for static assets
- [ ] HTTP/2 enabled
- [ ] Cache headers configured
- [ ] Performance metrics baseline
- [ ] Load testing completed
- [ ] Core Web Vitals optimized
- [ ] Monitoring dashboard created

---

## 📊 Performance Results

| Metric             | Before    | After    | Improvement       |
| ------------------ | --------- | -------- | ----------------- |
| API response (p95) | 800ms     | 150ms    | **81% faster**    |
| Page load time     | 5.2s      | 1.8s     | **65% faster**    |
| Database queries   | 120ms avg | 45ms avg | **63% faster**    |
| Bundle size        | 850KB     | 240KB    | **72% smaller**   |
| Cache hit rate     | 60%       | 98%      | **+38pp**         |
| CPU usage          | 85% avg   | 40% avg  | **53% reduction** |

---

**Questions?** Contact Performance Team  
**Last Update**: January 29, 2026  
**Review Frequency**: Monthly
