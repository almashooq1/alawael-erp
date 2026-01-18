# 💾 **Phase 6.1: Advanced Caching Strategies**

**التاريخ:** 14 يناير 2026  
**المدة:** 2-3 ساعات  
**المستوى:** متقدم جداً

---

## 📋 **جدول المحتويات**

1. [المقدمة](#المقدمة)
2. [Multi-Level Caching](#multi-level-caching)
3. [Cache Invalidation](#cache-invalidation)
4. [TTL Optimization](#ttl-optimization)
5. [Cache Warming](#cache-warming)
6. [Implementation Guide](#implementation-guide)

---

## 🎯 **المقدمة**

### الهدف:

تطبيق استراتيجيات caching متقدمة لتحسين الأداء:

- ✅ Multi-level caching (Memory → Redis → Database)
- ✅ Smart invalidation patterns
- ✅ Dynamic TTL based on data type
- ✅ Automatic cache warming

### الفوائد المتوقعة:

```
Cache Hit Rate:   60% → 85%
Response Time:    100ms → 20-30ms
Database Load:    -70%
Throughput:       1000 req/s → 5000+ req/s
```

---

## 🏗️ **Multi-Level Caching**

### المستوى 1: In-Memory Cache (L1)

```javascript
// backend/cache/memory-cache.js
class MemoryCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  get(key) {
    if (this.cache.has(key)) {
      const { data, expiresAt } = this.cache.get(key);
      if (expiresAt && expiresAt < Date.now()) {
        this.cache.delete(key);
        this.stats.misses++;
        return null;
      }
      this.stats.hits++;
      return data;
    }
    this.stats.misses++;
    return null;
  }

  set(key, data, ttlSeconds = 300) {
    if (this.cache.size >= this.maxSize) {
      // LRU eviction
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }

    this.cache.set(key, {
      data,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
      createdAt: Date.now(),
    });
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size,
    };
  }
}

module.exports = new MemoryCache();
```

### المستوى 2: Redis Cache (L2)

```javascript
// backend/cache/redis-cache.js
const redis = require('ioredis');

class RedisCache {
  constructor() {
    this.client = new redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: times => {
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: null,
    });

    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
    };
  }

  async get(key) {
    try {
      const data = await this.client.get(key);
      if (data) {
        this.stats.hits++;
        return JSON.parse(data);
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      this.stats.errors++;
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, data, ttlSeconds = 3600) {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, JSON.stringify(data));
      } else {
        await this.client.set(key, JSON.stringify(data));
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Redis set error:', error);
    }
  }

  async delete(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      this.stats.errors++;
      return null;
    }
  }

  async deletePattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        return await this.client.del(...keys);
      }
      return 0;
    } catch (error) {
      this.stats.errors++;
      return null;
    }
  }

  async getStats() {
    try {
      const info = await this.client.info('stats');
      return {
        ...this.stats,
        redisInfo: info,
      };
    } catch (error) {
      return this.stats;
    }
  }
}

module.exports = new RedisCache();
```

### المستوى 3: Multi-Level Cache Orchestrator

```javascript
// backend/cache/cache-orchestrator.js
const memoryCache = require('./memory-cache');
const redisCache = require('./redis-cache');

class CacheOrchestrator {
  constructor() {
    this.L1 = memoryCache;
    this.L2 = redisCache;
  }

  async get(key) {
    // Level 1: Memory
    let data = this.L1.get(key);
    if (data) return data;

    // Level 2: Redis
    data = await this.L2.get(key);
    if (data) {
      // Promote to L1
      this.L1.set(key, data, 300);
      return data;
    }

    return null;
  }

  async set(key, data, ttlSeconds = 3600) {
    // Write to both levels
    this.L1.set(key, data, Math.min(ttlSeconds, 600));
    await this.L2.set(key, data, ttlSeconds);
  }

  async invalidate(key) {
    this.L1.delete(key);
    await this.L2.delete(key);
  }

  async invalidatePattern(pattern) {
    // Clear from Redis
    await this.L2.deletePattern(pattern);
    // For memory cache, we can't easily do patterns
    // Consider clearing entire L1 or keep pattern tracking
  }

  getStats() {
    return {
      L1: this.L1.getStats(),
      L2: this.L2.getStats(),
    };
  }
}

module.exports = new CacheOrchestrator();
```

---

## 🔄 **Cache Invalidation**

### Pattern 1: Time-Based Invalidation

```javascript
// backend/cache/invalidation-strategies.js

class InvalidationStrategies {
  // 1. Automatic expiration (already in TTL)
  static getDefaultTTL(dataType) {
    const ttlMap = {
      user: 600, // 10 minutes
      vehicle: 1800, // 30 minutes
      session: 3600, // 1 hour
      report: 7200, // 2 hours
      config: 86400, // 24 hours
    };
    return ttlMap[dataType] || 3600;
  }

  // 2. Event-Based Invalidation
  static getInvalidationPatterns(entity, action) {
    const patterns = {
      vehicle: {
        create: ['vehicles:*', 'vehicle-count:*'],
        update: ['vehicle:*', 'vehicles:*', 'vehicle-count:*'],
        delete: ['vehicle:*', 'vehicles:*', 'vehicle-count:*'],
      },
      user: {
        create: ['users:*', 'user-count:*'],
        update: ['user:*', 'users:*', 'user-permissions:*'],
        delete: ['user:*', 'users:*', 'user-count:*'],
      },
    };
    return patterns[entity]?.[action] || [];
  }

  // 3. Dependency-Based Invalidation
  static getDependencies(dataType) {
    const deps = {
      vehicle: ['vehicles-list', 'vehicle-stats', 'fleet-summary'],
      user: ['users-list', 'user-roles', 'org-summary'],
      session: ['active-sessions', 'user-sessions:*'],
    };
    return deps[dataType] || [];
  }
}

module.exports = InvalidationStrategies;
```

### Pattern 2: Smart Invalidation Middleware

```javascript
// backend/middleware/smart-invalidation.js
const cacheOrchestrator = require('../cache/cache-orchestrator');
const InvalidationStrategies = require('../cache/invalidation-strategies');

const invalidationMiddleware = async (req, res, next) => {
  // Capture original send
  const originalSend = res.send;

  res.send = async function (data) {
    // If successful mutation request
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && res.statusCode < 400) {
      const patterns = InvalidationStrategies.getInvalidationPatterns(
        req.params.entity || req.body.entity,
        req.method === 'POST' ? 'create' : req.method === 'PUT' ? 'update' : 'delete',
      );

      // Invalidate related caches
      for (const pattern of patterns) {
        await cacheOrchestrator.invalidatePattern(pattern);
      }
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

module.exports = invalidationMiddleware;
```

---

## ⏰ **TTL Optimization**

### Dynamic TTL Based on Data Characteristics

```javascript
// backend/cache/dynamic-ttl.js

class DynamicTTL {
  // 1. Based on data freshness requirement
  static calculateTTL(dataType, updateFrequency) {
    const baseMap = {
      config: 86400, // 24 hours
      report: 7200, // 2 hours
      user: 600, // 10 minutes
      vehicle: 1800, // 30 minutes
      analytics: 300, // 5 minutes
    };

    // Adjust based on update frequency
    const frequency = {
      hourly: 1,
      daily: 10,
      weekly: 100,
    };

    const base = baseMap[dataType] || 3600;
    const multiplier = frequency[updateFrequency] || 1;

    return base * multiplier;
  }

  // 2. Based on data age
  static calculateAdaptiveTTL(dataCreatedAt) {
    const ageHours = (Date.now() - dataCreatedAt) / (1000 * 60 * 60);

    if (ageHours < 1) return 300; // Fresh data: 5 min
    if (ageHours < 24) return 1800; // Recent data: 30 min
    if (ageHours < 7 * 24) return 3600; // Weekly data: 1 hour
    return 86400; // Old data: 24 hours
  }

  // 3. Based on access patterns
  static calculateAccessBasedTTL(accessCount, timeSinceLastAccess) {
    const baselineTTL = 3600;

    // Frequently accessed → shorter TTL for freshness
    const accessFactor = Math.min(accessCount / 1000, 1);
    const freshnessTTL = baselineTTL * (1 - accessFactor);

    // Recently accessed → longer TTL for efficiency
    const timeFactor = Math.min(timeSinceLastAccess / (60 * 60 * 1000), 1);
    const efficiencyTTL = baselineTTL * (1 + timeFactor);

    return Math.round((freshnessTTL + efficiencyTTL) / 2);
  }
}

module.exports = DynamicTTL;
```

---

## 🔥 **Cache Warming**

### Automatic Cache Warming on Startup

```javascript
// backend/cache/cache-warmer.js

class CacheWarmer {
  constructor(cacheOrchestrator, db) {
    this.cache = cacheOrchestrator;
    this.db = db;
  }

  async warmOnStartup() {
    console.log('🔥 Starting cache warming...');
    try {
      await this.warmPopularQueries();
      await this.warmStaticData();
      await this.warmCriticalData();
      console.log('✅ Cache warming completed');
    } catch (error) {
      console.error('❌ Cache warming failed:', error);
    }
  }

  async warmPopularQueries() {
    console.log('  → Warming popular queries...');

    // Top vehicles
    const vehicles = await this.db.Vehicle.find({ status: 'active' }).limit(100).lean();

    for (const vehicle of vehicles) {
      await this.cache.set(`vehicle:${vehicle._id}`, vehicle, 1800);
    }

    // Vehicle statistics
    const stats = await this.db.Vehicle.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    await this.cache.set('vehicle-stats', stats, 3600);
  }

  async warmStaticData() {
    console.log('  → Warming static data...');

    // Configuration
    const config = await this.db.Config.find();
    await this.cache.set('system-config', config, 86400);

    // System enums
    const statuses = ['active', 'inactive', 'maintenance'];
    await this.cache.set('vehicle-statuses', statuses, 86400);
  }

  async warmCriticalData() {
    console.log('  → Warming critical data...');

    // Active users
    const activeUsers = await this.db.User.find({ isActive: true }).select('_id email role').limit(1000).lean();

    await this.cache.set('active-users', activeUsers, 600);
  }

  async periodicWarmup(interval = 3600000) {
    // 1 hour
    setInterval(async () => {
      await this.warmPopularQueries();
    }, interval);
  }
}

module.exports = CacheWarmer;
```

---

## 🚀 **Implementation Guide**

### Step 1: Install Dependencies

```bash
npm install ioredis lru-cache
```

### Step 2: Update server.js

```javascript
const cacheOrchestrator = require('./cache/cache-orchestrator');
const CacheWarmer = require('./cache/cache-warmer');
const invalidationMiddleware = require('./middleware/smart-invalidation');

// Add invalidation middleware
app.use(invalidationMiddleware);

// Warm cache on startup
const warmer = new CacheWarmer(cacheOrchestrator, db);
warmer.warmOnStartup();
warmer.periodicWarmup(3600000); // Warm every hour
```

### Step 3: Use in Controllers

```javascript
// Example: Get vehicle with caching
async function getVehicle(req, res) {
  const { id } = req.params;

  // Try cache first
  let vehicle = await cacheOrchestrator.get(`vehicle:${id}`);

  if (!vehicle) {
    // Cache miss - query database
    vehicle = await Vehicle.findById(id);

    if (vehicle) {
      // Cache the result
      await cacheOrchestrator.set(
        `vehicle:${id}`,
        vehicle,
        1800, // 30 minutes
      );
    }
  }

  res.json(vehicle);
}
```

### Step 4: Monitor Cache Performance

```javascript
// Add cache stats endpoint
app.get('/api/cache/stats', (req, res) => {
  const stats = cacheOrchestrator.getStats();
  res.json({
    L1: stats.L1,
    L2: stats.L2,
    timestamp: new Date(),
  });
});
```

---

## 📊 **Expected Performance Gains**

| Metric         | Before     | After       | Improvement  |
| -------------- | ---------- | ----------- | ------------ |
| Response Time  | 100ms      | 20-30ms     | **70-80%**   |
| Cache Hit Rate | 60%        | 85%+        | **+25%**     |
| Database Load  | 100%       | 30%         | **-70%**     |
| Throughput     | 1000 req/s | 5000+ req/s | **+400%**    |
| Memory Usage   | Optimal    | Optimized   | **Balanced** |

---

**تم إنشاء هذا الملف:** 14 يناير 2026  
**الحالة:** ✅ جاهز للتطبيق الفوري
