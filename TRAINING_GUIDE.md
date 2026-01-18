# 📚 **دليل التدريب الشامل**

**التاريخ:** 14 يناير 2026  
**الجمهور المستهدف:** فريق التطوير والعمليات  
**المدة:** 3 أيام (24 ساعة تدريبية)

---

## 📋 **جدول المحتويات**

### اليوم الأول: الأساسيات

1. [نظرة عامة على النظام](#نظرة-عامة)
2. [Redis Cluster](#redis-cluster)
3. [Advanced Caching](#advanced-caching)

### اليوم الثاني: البنية التحتية

4. [Database Replication](#database-replication)
5. [CDN Integration](#cdn-integration)
6. [Monitoring & Alerting](#monitoring)

### اليوم الثالث: العمليات

7. [Deployment Procedures](#deployment)
8. [Troubleshooting](#troubleshooting)
9. [Incident Response](#incident-response)

---

## 🎯 **اليوم الأول: الأساسيات**

### الجلسة 1: نظرة عامة على النظام (2 ساعة)

#### الأهداف التعليمية

- فهم البنية المعمارية الكاملة
- معرفة المكونات الرئيسية
- فهم تدفق البيانات
- معرفة مقاييس الأداء

#### المحتوى

**1. البنية المعمارية**

```
User Request
     │
     ▼
┌─────────────────┐
│  Cloudflare CDN │ (200+ locations)
└────────┬────────┘
         │
    ┌────▼────┐
    │ Load    │
    │Balancer │
    └────┬────┘
         │
    ┌────┴────────┐
    │             │
┌───▼────┐   ┌───▼────┐
│ App 1  │   │ App 2  │
└───┬────┘   └───┬────┘
    │            │
    └──────┬─────┘
           │
    ┌──────┼──────────┐
    │      │          │
┌───▼──┐ ┌─▼──┐  ┌───▼──┐
│Redis │ │Redis│  │Redis │
│ M1   │ │ M2  │  │ M3   │
└───┬──┘ └──┬──┘  └───┬──┘
    │      │          │
┌───▼──┐ ┌─▼──┐  ┌───▼──┐
│Redis │ │Redis│  │Redis │
│ R1   │ │ R2  │  │ R3   │
└──────┘ └─────┘  └──────┘
           │
    ┌──────┼──────┐
    │      │      │
┌───▼──┐ ┌─▼──┐ ┌─▼──┐
│Mongo │ │Mongo│ │Mongo│
│Prime │ │Sec1 │ │Sec2 │
└──────┘ └─────┘ └─────┘
```

**2. المكونات الرئيسية**

| المكون        | الوظيفة              | العدد      | الحالة |
| ------------- | -------------------- | ---------- | ------ |
| CDN           | Content delivery     | 200+ edges | ✅     |
| Load Balancer | Traffic distribution | 1          | ✅     |
| App Servers   | Application logic    | 4          | ✅     |
| Redis Cluster | Caching              | 6 nodes    | ✅     |
| MongoDB       | Database             | 3 nodes    | ✅     |

**3. تدفق البيانات**

```javascript
// Request Flow
1. User → CDN (cache check)
2. CDN → Load Balancer (if miss)
3. Load Balancer → App Server
4. App Server → L1 Cache (Memory)
5. If miss → L2 Cache (Redis)
6. If miss → L3 (Database)
7. Response cached at all levels
8. Response → User
```

**4. مقاييس الأداء الحالية**

```
Response Time:    10-50ms (p95)
Throughput:       50,000 req/s
Cache Hit Rate:   85%+
Availability:     99.99%
Error Rate:       < 0.01%
```

#### تمرين عملي

```
مهمة: ارسم البنية المعمارية من الذاكرة
وقت: 15 دقيقة
تقييم: مراجعة جماعية
```

---

### الجلسة 2: Redis Cluster (3 ساعات)

#### الأهداف التعليمية

- فهم Redis Cluster architecture
- إدارة cluster nodes
- التعامل مع failover
- مراقبة الأداء

#### المحتوى النظري

**1. Redis Cluster Basics**

```
Features:
- Automatic sharding (16,384 slots)
- High availability
- Automatic failover
- No single point of failure
- Linear scalability
```

**2. Cluster Topology**

```
6 Nodes Configuration:
- 3 Masters (hold data shards)
- 3 Replicas (backup + read scaling)

Slot Distribution:
- Master 1: slots 0-5460
- Master 2: slots 5461-10922
- Master 3: slots 10923-16383
```

**3. Failover Process**

```
Normal State:
Master 1 (Active) → Replica 1 (Standby)

Master Fails:
Master 1 (Down)
Replica 1 (Promoted to Master)

Recovery:
Old Master 1 (Joins as Replica)
New Master 1 (Serving traffic)
```

#### التمارين العملية

**تمرين 1: إنشاء Cluster (30 دقيقة)**

```bash
# 1. Start Redis instances
for i in {7000..7005}; do
  redis-server --port $i --cluster-enabled yes \
    --cluster-config-file nodes-$i.conf \
    --daemonize yes
done

# 2. Create cluster
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1

# 3. Verify
redis-cli -p 7000 cluster info
redis-cli -p 7000 cluster nodes
```

**تمرين 2: اختبار Failover (20 دقيقة)**

```bash
# 1. Identify master
redis-cli -p 7000 role

# 2. Simulate failure
redis-cli -p 7000 DEBUG sleep 30

# 3. Monitor failover
watch -n 1 'redis-cli -p 7001 cluster nodes'

# 4. Verify new master
redis-cli -p 7001 role
```

**تمرين 3: إضافة Node جديد (20 دقيقة)**

```bash
# 1. Start new node
redis-server --port 7006 --cluster-enabled yes

# 2. Add to cluster
redis-cli --cluster add-node 127.0.0.1:7006 127.0.0.1:7000

# 3. Rebalance slots
redis-cli --cluster rebalance 127.0.0.1:7000
```

#### أسئلة التقييم

```
1. ما هو عدد slots في Redis Cluster؟
   إجابة: 16,384

2. كم من الوقت يستغرق failover تلقائياً؟
   إجابة: 5-10 ثواني

3. كيف يتم توزيع البيانات؟
   إجابة: باستخدام hash slots

4. ما هي quorum؟
   إجابة: العدد الأدنى من nodes للموافقة على failover
```

---

### الجلسة 3: Advanced Caching (3 ساعات)

#### الأهداف التعليمية

- فهم multi-level caching
- تنفيذ invalidation strategies
- استخدام dynamic TTL
- إدارة cache warming

#### المحتوى النظري

**1. Multi-Level Caching Architecture**

```
L1: Memory Cache
├─ Speed: < 1ms
├─ Size: 1000 items
├─ Policy: LRU eviction
└─ Scope: Per-process

L2: Redis Cache
├─ Speed: < 5ms
├─ Size: Unlimited (cluster)
├─ Policy: TTL-based
└─ Scope: Global

L3: Database
├─ Speed: < 50ms
├─ Size: Unlimited
├─ Policy: Persistent
└─ Scope: Global
```

**2. Cache Flow**

```javascript
async function get(key) {
  // Try L1
  let data = memoryCache.get(key);
  if (data) return data;

  // Try L2
  data = await redisCache.get(key);
  if (data) {
    memoryCache.set(key, data);
    return data;
  }

  // Try L3
  data = await database.get(key);
  if (data) {
    redisCache.set(key, data, ttl);
    memoryCache.set(key, data);
    return data;
  }

  return null;
}
```

**3. Invalidation Strategies**

```javascript
// Time-based
cache.set(key, data, 3600); // 1 hour TTL

// Event-based
eventEmitter.on('student:updated', id => {
  cache.delete(`student:${id}`);
  cache.delete(`student:${id}:*`);
});

// Dependency-based
const dependencies = {
  'student:123': ['session:*', 'analytics:student:123'],
};
```

#### التمارين العملية

**تمرين 1: تنفيذ MemoryCache (30 دقيقة)**

```javascript
class MemoryCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    if (!this.cache.has(key)) return null;

    // LRU: move to end
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  set(key, value) {
    // Evict oldest if full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  delete(key) {
    this.cache.delete(key);
  }
}
```

**تمرين 2: Dynamic TTL (20 دقيقة)**

```javascript
class DynamicTTL {
  calculate(data, context) {
    // Base TTL by data type
    let ttl = this.getBaseTTL(data.type);

    // Adjust by access frequency
    if (context.accessCount > 100) {
      ttl *= 0.5; // High traffic = shorter TTL
    }

    // Adjust by data age
    const age = Date.now() - data.createdAt;
    if (age > 86400000) {
      // > 1 day
      ttl *= 2; // Old data = longer TTL
    }

    return ttl;
  }

  getBaseTTL(type) {
    const ttls = {
      user: 3600, // 1 hour
      session: 1800, // 30 min
      analytics: 300, // 5 min
      config: 86400, // 24 hours
    };
    return ttls[type] || 600;
  }
}
```

**تمرين 3: Cache Warming (30 دقيقة)**

```javascript
class CacheWarmer {
  async warmCache() {
    console.log('Starting cache warming...');

    // Popular data
    await this.warmPopularData();

    // Static data
    await this.warmStaticData();

    // Critical data
    await this.warmCriticalData();

    console.log('Cache warming complete!');
  }

  async warmPopularData() {
    const popular = await db.find({ views: { $gt: 1000 } });
    for (const item of popular) {
      await cache.set(`popular:${item._id}`, item, 3600);
    }
  }
}
```

#### مشروع عملي

**المهمة:** بناء cache middleware كامل

```javascript
// Requirements:
// 1. Multi-level caching
// 2. Smart invalidation
// 3. Dynamic TTL
// 4. Performance metrics

// Time: 1 hour
// Review: Group presentation
```

---

## 🎯 **اليوم الثاني: البنية التحتية**

### الجلسة 4: Database Replication (3 ساعات)

#### المحتوى النظري

**1. Replica Set Architecture**

```
Components:
├─ Primary: Handles writes
├─ Secondary 1: Handles reads
├─ Secondary 2: Handles reads
└─ Arbiter (optional): Voting only

Election Process:
1. Primary fails
2. Secondaries detect failure (heartbeat)
3. Election initiated
4. Majority vote required
5. New primary elected
6. Clients reconnect automatically
```

**2. Read Preferences**

```javascript
// Read from primary (strong consistency)
db.collection.find().setReadPreference('primary');

// Read from secondaries (high throughput)
db.collection.find().setReadPreference('secondaryPreferred');

// Read from nearest (low latency)
db.collection.find().setReadPreference('nearest');
```

#### التمارين العملية

**تمرين 1: إنشاء Replica Set (45 دقيقة)**

```bash
# 1. Start 3 MongoDB instances
mongod --port 27017 --replSet almashooq-rs --dbpath /data/db1
mongod --port 27018 --replSet almashooq-rs --dbpath /data/db2
mongod --port 27019 --replSet almashooq-rs --dbpath /data/db3

# 2. Initialize replica set
mongo --port 27017
rs.initiate({
  _id: "almashooq-rs",
  members: [
    { _id: 0, host: "localhost:27017" },
    { _id: 1, host: "localhost:27018" },
    { _id: 2, host: "localhost:27019" }
  ]
})

# 3. Verify
rs.status()
```

**تمرين 2: اختبار Failover (30 دقيقة)**

```bash
# 1. Find primary
rs.isMaster()

# 2. Shutdown primary
db.shutdownServer()

# 3. Monitor election
watch -n 1 'mongo --port 27018 --eval "rs.status().members"'

# 4. Verify new primary
mongo --port 27018
rs.isMaster()
```

---

### الجلسة 5: CDN Integration (2 ساعة)

#### المحتوى

**1. Cloudflare Setup**

```
Steps:
1. Create account
2. Add domain
3. Update DNS
4. Configure cache rules
5. Enable optimizations
6. Setup WAF
7. Monitor analytics
```

**2. Cache Rules**

```javascript
// Static assets - cache forever
/assets/* → max-age=31536000

// API - no cache
/api/* → no-cache

// Images - cache 30 days
/images/* → max-age=2592000

// HTML - cache 1 hour
/*.html → max-age=3600
```

---

### الجلسة 6: Monitoring & Alerting (3 ساعات)

#### التمارين

**تمرين: إعداد Monitoring Dashboard**

```javascript
// Metrics to track
const metrics = {
  responseTime: [],
  throughput: 0,
  cacheHitRate: 0,
  errorRate: 0,
  availability: 0,
};

// Alert conditions
const alerts = {
  responseTime: { threshold: 100, action: 'notify' },
  errorRate: { threshold: 1, action: 'page' },
  availability: { threshold: 99.9, action: 'escalate' },
};
```

---

## 🎯 **اليوم الثالث: العمليات**

### الجلسة 7: Deployment (2 ساعة)

**Zero-Downtime Deployment**

```bash
# 1. Health check
curl http://localhost:3001/health

# 2. Deploy to server 1
pm2 stop app-1
git pull
npm install
pm2 start app-1

# 3. Verify
curl http://localhost:3001/health

# 4. Repeat for other servers
```

---

### الجلسة 8: Troubleshooting (3 ساعات)

#### سيناريوهات شائعة

**1. ارتفاع Response Time**

```
الأسباب المحتملة:
□ Cache miss rate عالي
□ Database slow queries
□ Redis connection issues
□ Network latency

الحلول:
1. فحص cache hit rate
2. تحليل slow query log
3. فحص Redis cluster health
4. تحليل network metrics
```

**2. Redis Master Down**

```
الخطوات:
1. تأكد من Failover حدث تلقائياً
2. فحص cluster nodes
3. تشخيص سبب الفشل
4. إصلاح المشكلة
5. إعادة Node إلى الخدمة
```

---

### الجلسة 9: Incident Response (3 ساعات)

#### Runbook: System Down

```
1. DETECT
   □ Monitoring alert received
   □ Verify system is actually down
   □ Check health endpoints

2. ASSESS
   □ Identify affected components
   □ Estimate user impact
   □ Determine severity

3. RESPOND
   □ Activate incident team
   □ Start incident log
   □ Begin mitigation

4. RESOLVE
   □ Apply fix
   □ Verify recovery
   □ Monitor stability

5. POST-MORTEM
   □ Document incident
   □ Identify root cause
   □ Create action items
```

---

## 📝 **التقييم النهائي**

### اختبار نظري (1 ساعة)

```
50 سؤال متعدد الخيارات
- Redis Cluster: 15 سؤال
- Caching: 15 سؤال
- Database: 10 سؤال
- CDN: 5 سؤال
- Monitoring: 5 سؤال

النجاح: 70% فأكثر
```

### مشروع عملي (2 ساعة)

```
المهمة:
1. إنشاء Redis cluster (3 nodes)
2. تنفيذ caching middleware
3. إعداد monitoring
4. اختبار failover
5. كتابة runbook

التقييم:
- الوظيفة: 40%
- الكود: 30%
- الوثائق: 20%
- العرض: 10%
```

---

## 🎓 **شهادة الإكمال**

```
هذا لتأكيد أن
[الاسم]

قد أكمل بنجاح برنامج التدريب الشامل
على نظام Almashooq ERP - Phase 6

المواضيع المغطاة:
✓ Redis Cluster Management
✓ Advanced Caching Strategies
✓ Database Replication
✓ CDN Integration
✓ Monitoring & Alerting
✓ Deployment & Operations
✓ Troubleshooting & Incident Response

التاريخ: 14 يناير 2026
التوقيع: _________________
```

---

**تاريخ الإنشاء:** 14 يناير 2026  
**الحالة:** جاهز للاستخدام  
**المدة:** 3 أيام (24 ساعة)
