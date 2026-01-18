# 📊 Performance API Documentation

## وثائق API مراقبة الأداء

---

## 📍 Base URL

```
http://localhost:3001/api/performance
```

---

## 🔐 Authentication

جميع المسارات تتطلب:

- **JWT Token** في header `Authorization: Bearer <token>`
- **Role:** `admin` أو أعلى

---

## 📌 المسارات المتاحة

### 1️⃣ GET /api/performance/metrics

**الوصف:** الحصول على معدلات الأداء الحالية

#### Request

```http
GET /api/performance/metrics HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token>
Content-Type: application/json
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "totalRequests": 1523,
    "averageDuration": "245.67ms",
    "slowRequests": 3,
    "cacheHits": 892,
    "cacheMisses": 631,
    "cacheHitRate": "58.56%"
  },
  "timestamp": "2025-01-14T03:15:30.123Z",
  "message": "Performance metrics retrieved successfully"
}
```

#### Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| None | -    | -        | -           |

#### Examples

```bash
# Using curl
curl -X GET http://localhost:3001/api/performance/metrics \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# Using axios (JavaScript)
const response = await axios.get('/api/performance/metrics', {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

### 2️⃣ GET /api/performance/cache

**الوصف:** الحصول على إحصائيات الـ Cache

#### Request

```http
GET /api/performance/cache HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token>
Content-Type: application/json
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "totalKeys": 45,
    "redisStatus": "connected",
    "memoryUsage": "2.4MB",
    "info": {
      "used_memory": "2516582",
      "used_memory_human": "2.40M",
      "connected_clients": 1
    }
  },
  "timestamp": "2025-01-14T03:15:30.123Z"
}
```

#### Notes

- إذا لم يكن Redis متصل، سيكون `redisStatus: "disconnected"`
- الـ `info` يحتوي على معلومات مباشرة من Redis

---

### 3️⃣ POST /api/performance/cache/clear

**الوصف:** مسح الـ Cache بواسطة نمط

#### Request

```http
POST /api/performance/cache/clear HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token>
Content-Type: application/json

{
  "pattern": "cache:vehicles:*"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "تم مسح الـ Cache بالنمط: cache:vehicles:*",
  "pattern": "cache:vehicles:*"
}
```

#### Parameters

| Name    | Type   | Required | Description                       |
| ------- | ------ | -------- | --------------------------------- |
| pattern | string | false    | Redis key pattern (default: "\*") |

#### Examples

```bash
# Clear all cache
curl -X POST http://localhost:3001/api/performance/cache/clear \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "*"}'

# Clear vehicle cache only
curl -X POST http://localhost:3001/api/performance/cache/clear \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "cache:vehicles:*"}'

# Clear compliance cache
curl -X POST http://localhost:3001/api/performance/cache/clear \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "cache:compliance:*"}'
```

#### Notes

- Pattern uses Redis glob syntax: `*`, `?`, `[abc]`
- Clearing is async for large patterns
- Default pattern clears all keys

---

### 4️⃣ GET /api/performance/query-hints

**الوصف:** نصائح لتحسين استعلامات قاعدة البيانات

#### Request

```http
GET /api/performance/query-hints HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token>
Content-Type: application/json
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "vehicle": {
      "indexedFields": [
        "registrationNumber",
        "plateNumber",
        "owner",
        "assignedDriver",
        "registration.expiryDate",
        "inspection.nextInspectionDate",
        "status",
        "createdAt"
      ],
      "recommendedCompoundIndexes": [
        {
          "name": "owner_registrationNumber_index",
          "fields": ["owner", "registrationNumber"]
        },
        {
          "name": "status_createdAt_index",
          "fields": ["status", "createdAt"]
        },
        {
          "name": "location_timestamp_index",
          "fields": ["tracking.lastLocation.timestamp"]
        }
      ]
    },
    "user": {
      "indexedFields": ["email", "createdAt", "status"],
      "recommendations": ["Add index on role field"]
    }
  },
  "timestamp": "2025-01-14T03:15:30.123Z",
  "message": "Database query optimization hints"
}
```

---

### 5️⃣ GET /api/performance/health

**الوصف:** فحص صحة النظام الشامل

#### Request

```http
GET /api/performance/health HTTP/1.1
Host: localhost:3001
Content-Type: application/json
```

#### Response (200 OK)

```json
{
  "status": "healthy",
  "timestamp": "2025-01-14T03:15:30.123Z",
  "uptime": 3654.223,
  "memory": {
    "rss": 104857600,
    "heapTotal": 52428800,
    "heapUsed": 26214400,
    "external": 1048576
  },
  "cpu": {
    "user": 1234567,
    "system": 234567
  },
  "performance": {
    "totalRequests": 1523,
    "averageDuration": "245.67ms",
    "slowRequests": 3,
    "cacheHits": 892,
    "cacheMisses": 631,
    "cacheHitRate": "58.56%"
  },
  "cache": {
    "totalKeys": 45,
    "redisStatus": "connected",
    "memoryUsage": "2.4MB"
  },
  "checks": {
    "requestHandling": "✅",
    "caching": "✅",
    "slowRequests": "✅"
  }
}
```

#### Notes

- هذا الـ endpoint لا يتطلب authentication
- يمكن استخدامه لـ health check من الـ load balancer
- الحالة تصبح `unhealthy` إذا حدث خطأ

---

### 6️⃣ POST /api/performance/metrics/reset

**الوصف:** إعادة تعيين معدلات الأداء

#### Request

```http
POST /api/performance/metrics/reset HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token>
Content-Type: application/json
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Performance metrics reset successfully"
}
```

#### Notes

- يتطلب صلاحية `admin`
- يمسح جميع المقاييس المتراكمة
- مفيد قبل البدء بـ benchmark جديد

---

## 📊 Response Headers

| Header           | Value          | Description            |
| ---------------- | -------------- | ---------------------- |
| X-Response-Time  | `245ms`        | وقت معالجة الـ request |
| X-Cache          | `HIT` / `MISS` | حالة الـ Cache         |
| Content-Encoding | `gzip`         | نوع الضغط              |

---

## ❌ Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "You do not have permission to access this resource"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Error message here"
}
```

---

## 🛠️ Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional

# Cache Configuration
CACHE_TTL=300                    # seconds (5 minutes)
COMPRESSION_THRESHOLD=1024        # bytes
SLOW_REQUEST_THRESHOLD=1000      # milliseconds
```

---

## 📈 Performance Metrics Explained

| Metric              | Description                        | Unit    |
| ------------------- | ---------------------------------- | ------- |
| **totalRequests**   | عدد الـ requests الكلي             | count   |
| **averageDuration** | متوسط وقت المعالجة                 | ms      |
| **slowRequests**    | عدد الـ requests البطيئة (>1000ms) | count   |
| **cacheHits**       | عدد مرات Cache HIT                 | count   |
| **cacheMisses**     | عدد مرات Cache MISS                | count   |
| **cacheHitRate**    | نسبة Cache HIT                     | percent |

### تفسير النتائج

```
Cache Hit Rate 60%+ = جيد جداً
Cache Hit Rate 30-60% = متوسط، قد تحتاج تحسين
Cache Hit Rate <30% = ضعيف، راجع TTL وـ patterns
```

---

## 🧪 Testing Examples

### Using Postman

1. Set up authorization header with JWT token
2. Send request to endpoints
3. View response and headers

### Using cURL

```bash
# Get metrics
curl -X GET http://localhost:3001/api/performance/metrics \
  -H "Authorization: Bearer your_token_here"

# Check health (no auth required)
curl -X GET http://localhost:3001/api/performance/health

# Clear cache
curl -X POST http://localhost:3001/api/performance/cache/clear \
  -H "Authorization: Bearer your_token_here" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "*"}'
```

### Using JavaScript/Axios

```javascript
// Get performance metrics
const getMetrics = async token => {
  try {
    const response = await axios.get('http://localhost:3001/api/performance/metrics', { headers: { Authorization: `Bearer ${token}` } });
    console.log('Performance Metrics:', response.data);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Clear cache
const clearCache = async (token, pattern = '*') => {
  try {
    const response = await axios.post(
      'http://localhost:3001/api/performance/cache/clear',
      { pattern },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log('Cache cleared:', response.data);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Health check
const healthCheck = async () => {
  try {
    const response = await axios.get('http://localhost:3001/api/performance/health');
    console.log('System Health:', response.data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 🔄 Monitoring Recommendations

### Daily Tasks

- ✅ Check health endpoint: `/api/performance/health`
- ✅ Review cache hit rate (target: >50%)
- ✅ Monitor slow requests count (target: <1%)

### Weekly Tasks

- ✅ Run benchmark: `npm run benchmark`
- ✅ Review performance trends
- ✅ Optimize slow queries

### Monthly Tasks

- ✅ Full performance audit
- ✅ Add new indexes if needed
- ✅ Update TTL configurations

---

**آخر تحديث:** 14 يناير 2025
**الإصدار:** 1.0.0
**الحالة:** ✅ مكتملة وجاهزة للاستخدام
