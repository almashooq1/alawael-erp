# 🔍 دليل استكشاف الأخطاء الشامل

**التاريخ:** 14 يناير 2026  
**الإصدار:** 1.0.0 - شامل ومنظم  
**الحالة:** جاهز للعمل الفوري

---

## 📋 جدول المحتويات

1. [مشاكل الاتصال والشبكة](#مشاكل-الاتصال-والشبكة)
2. [مشاكل قاعدة البيانات](#مشاكل-قاعدة-البيانات)
3. [مشاكل الأداء](#مشاكل-الأداء)
4. [مشاكل الأمان](#مشاكل-الأمان)
5. [مشاكل التطبيق](#مشاكل-التطبيق)
6. [أدوات التشخيص](#أدوات-التشخيص)

---

## 🌐 مشاكل الاتصال والشبكة

### المشكلة 1: المنفذ قيد الاستخدام

**الأعراض:**

```
Error: listen EADDRINUSE :::3001
Address already in use
```

**الحلول:**

```bash
# الحل 1: البحث عن العملية المستخدمة
lsof -i :3001
# أو في Windows
Get-NetTCPConnection -LocalPort 3001

# الحل 2: قتل العملية
kill -9 <PID>
# أو في Windows
Stop-Process -Id <PID> -Force

# الحل 3: استخدام منفذ مختلف
PORT=3002 npm run start:backend

# الحل 4: التحقق من عمليات Node سابقة
pm2 list
pm2 delete all
pm2 start ecosystem.config.js
```

### المشكلة 2: فشل الاتصال بـ Backend

**الأعراض:**

```
Failed to fetch http://localhost:3001
Connection refused
```

**الحلول:**

```bash
# الحل 1: التحقق من حالة الخادم
curl -v http://localhost:3001/health

# الحل 2: فحص ما إذا كان الخادم قيد التشغيل
pm2 status
ps aux | grep "node server.js"

# الحل 3: فحص السجلات
pm2 logs backend
tail -50 logs/error.log

# الحل 4: إعادة تشغيل الخادم
pm2 restart backend
# أو
cd backend && PORT=3001 npm run start:production

# الحل 5: التحقق من Firewall
# تأكد من أن المنفذ 3001 مفتوح
sudo ufw allow 3001
# أو في Windows
netsh advfirewall firewall add rule name="Allow 3001" dir=in action=allow protocol=tcp localport=3001
```

### المشكلة 3: مشكلة CORS

**الأعراض:**

```
Access to XMLHttpRequest blocked by CORS policy
```

**الحلول:**

```bash
# الحل 1: التحقق من CORS Configuration
cat backend/server.js | grep -A 5 "cors"

# الحل 2: تحديث CORS في server.js
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://yourdomain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

# الحل 3: إعادة التشغيل
pm2 restart backend
```

### المشكلة 4: Timeout في الاتصال

**الأعراض:**

```
Request timeout after 30s
Connection closed
```

**الحلول:**

```bash
# الحل 1: التحقق من Response Time
curl -w "Time: %{time_total}s\n" http://localhost:3001/health

# الحل 2: زيادة Timeout في Client
// في frontend
const API_TIMEOUT = 60000; // 60 ثانية

// أو في requests
curl --max-time 120 http://localhost:3001

# الحل 3: فحص الأداء
node backend/load-test.js

# الحل 4: التحقق من الخادم
top -bn1 | head -20 # CPU usage
free -h # Memory usage

# الحل 5: زيادة موارد الخادم
# - زيادة CPU
# - زيادة RAM
# - تحسين الـ queries
```

---

## 🗄️ مشاكل قاعدة البيانات

### المشكلة 1: فشل الاتصال بـ MongoDB

**الأعراض:**

```
MongooseError: Cannot connect to MongoDB
connection timeout
```

**الحلول:**

```bash
# الحل 1: التحقق من MongoDB
mongosh
# أو
mongo

# الحل 2: التحقق من قيمة الاتصال في .env
grep DB_ .env

# الحل 3: اختبار الاتصال مباشرة
mongosh mongodb://localhost:27017/almashooq

# الحل 4: التحقق من عمليات MongoDB
ps aux | grep mongod

# الحل 5: إعادة تشغيل MongoDB
sudo systemctl restart mongodb
# أو في Windows
net stop MongoDB
net start MongoDB

# الحل 6: فحص Firewall
# تأكد من أن المنفذ 27017 مفتوح
lsof -i :27017
```

### المشكلة 2: بطء الاستعلامات

**الأعراض:**

```
Database query takes >1000ms
Slow response time
```

**الحلول:**

```bash
# الحل 1: فحص Slow Query Logs
tail -50 logs/slow-queries.log

# الحل 2: تحليل الاستعلام البطيء
mongosh almashooq << 'EOF'
db.vehicles.explain("executionStats").find({ status: "active" })
EOF

# الحل 3: التحقق من Indexes
mongosh almashooq << 'EOF'
db.vehicles.getIndexes()
EOF

# الحل 4: إضافة Index إذا لزم
mongosh almashooq << 'EOF'
db.vehicles.createIndex({ status: 1, createdAt: -1 })
EOF

# الحل 5: استخدام Projection
// بدلاً من:
Vehicle.find({ status: 'active' })

// استخدم:
Vehicle.find({ status: 'active' })
  .select('_id registrationNumber status')
  .lean()

# الحل 6: استخدام Pagination
// بدلاً من:
Vehicle.find({})

// استخدم:
Vehicle.find({})
  .skip((page - 1) * limit)
  .limit(limit)
```

### المشكلة 3: Database Locks

**الأعراض:**

```
Database locked
Cannot perform operation
Write failed
```

**الحلول:**

```bash
# الحل 1: فحص الـ Locks
mongosh almashooq << 'EOF'
db.currentOp()
EOF

# الحل 2: قتل العملية المعلقة
mongosh almashooq << 'EOF'
db.killOp(opid)
EOF

# الحل 3: إعادة تشغيل MongoDB
sudo systemctl restart mongodb

# الحل 4: فحص حجم البيانات
du -sh /var/lib/mongodb/

# الحل 5: إزالة البيانات الكبيرة
# احذف السجلات القديمة:
db.logs.deleteMany({ createdAt: { $lt: new Date("2024-01-01") } })
```

### المشكلة 4: مشكلة في البيانات

**الأعراض:**

```
Duplicate key error
Validation error
Data inconsistency
```

**الحلول:**

```bash
# الحل 1: فحص البيانات
mongosh almashooq << 'EOF'
// ابحث عن التكرارات
db.users.aggregate([
  { $group: { _id: "$email", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
EOF

# الحل 2: إزالة التكرارات
mongosh almashooq << 'EOF'
db.users.deleteMany({
  email: { $in: ["duplicate@email.com"] },
  createdAt: { $lt: new Date("2024-01-01") }
})
EOF

# الحل 3: التحقق من التحقق
// في Schema:
email: {
  type: String,
  unique: true,
  lowercase: true,
  trim: true
}

# الحل 4: إعادة بناء الـ Indexes
mongosh almashooq << 'EOF'
db.users.reIndex()
EOF
```

---

## ⚡ مشاكل الأداء

### المشكلة 1: استخدام CPU عالي

**الأعراض:**

```
CPU usage > 80%
System is slow
```

**الحلول:**

```bash
# الحل 1: فحص استخدام CPU
top -bn1 | head -15

# الحل 2: تحديد العملية المستهلكة
ps aux --sort=-%cpu | head

# الحل 3: فحص Logs
tail -100 logs/error.log | grep -i "error\|cpu"

# الحل 4: اختبار الأداء
node backend/load-test.js

# الحل 5: تحسين الكود
# - استخدم async/await بشكل صحيح
# - تجنب العمليات المتزامنة الكثيرة
# - استخدم connection pooling

# الحل 6: إعادة توازن الحمل
# استخدم PM2 cluster mode
pm2 start server.js -i max

# الحل 7: إضافة خادم جديد
# استخدم load balancer (nginx, HAProxy)
```

### المشكلة 2: استخدام Memory مرتفع

**الأعراض:**

```
Memory usage > 80%
Node process crashes
Heap out of memory
```

**الحلول:**

```bash
# الحل 1: فحص استخدام الذاكرة
free -h
node -e "console.log(process.memoryUsage())"

# الحل 2: تحديد تسريب الذاكرة
// استخدم clinic.js
npx clinic doctor -- node backend/server.js

# الحل 3: فحص Cache
// في advanced-monitoring.js
const cacheSize = cache.size()
console.log('Cache size:', cacheSize)

# الحل 4: حذف البيانات المخزنة مؤقتاً
// في الكود:
cache.clear()
// أو عبر API
curl -X POST http://localhost:3001/api/cache/clear

# الحل 5: تحسين الاستعلامات
// استخدم lean() و select()
Vehicle.find().lean().select('_id name')

# الحل 6: زيادة حجم الـ Heap
node --max-old-space-size=4096 server.js

# الحل 7: إعادة تشغيل دوري
// استخدم PM2 auto restart
pm2 set max_memory_restart 500M
```

### المشكلة 3: بطء في الاستجابة

**الأعراض:**

```
Response time > 1000ms
API slow
Frontend freezing
```

**الحلول:**

```bash
# الحل 1: قياس الأداء
curl -w "Time: %{time_total}s\n" http://localhost:3001/api/vehicles

# الحل 2: فحص الـ Requests الجارية
curl http://localhost:3001/api/performance/metrics | jq '.performance'

# الحل 3: تحليل الـ Slow Queries
mongosh almashooq << 'EOF'
db.currentOp(true).inprog.filter(op => op.secs_running > 1)
EOF

# الحل 4: استخدام Redis Caching
// في الكود:
const cached = await redis.get('key')
if (cached) return JSON.parse(cached)

const data = await Vehicle.find()
await redis.setex('key', 3600, JSON.stringify(data))

# الحل 5: تفعيل Compression
// يجب أن يكون مفعل:
app.use(compression())

# الحل 6: استخدام CDN
// للملفات الثابتة
// استخدم Cloudflare أو AWS CloudFront

# الحل 7: تحسين الـ Frontend
// استخدم React.memo, useMemo, useCallback
// قلل عدد الـ API calls
// استخدم pagination
```

---

## 🔐 مشاكل الأمان

### المشكلة 1: فشل المصادقة

**الأعراض:**

```
Invalid credentials
401 Unauthorized
Token expired
```

**الحلول:**

```bash
# الحل 1: التحقق من JWT Secret
grep JWT_SECRET .env

# الحل 2: فحص Token
# استخدم jwt.io لفك التشفير

# الحل 3: فحص Expiration
// في الكود:
const decoded = jwt.verify(token, JWT_SECRET)
console.log('Expires at:', new Date(decoded.exp * 1000))

# الحل 4: إصدار Token جديد
curl -X POST http://localhost:3001/auth/refresh

# الحل 5: مسح الـ Tokens القديمة
mongosh almashooq << 'EOF'
db.tokens.deleteMany({ expiresAt: { $lt: new Date() } })
EOF

# الحل 6: زيادة Expiration Time (إذا لزم)
// في config:
JWT_EXPIRE=30d // بدلاً من 7d
```

### المشكلة 2: XSS Attack

**الأعراض:**

```
Malicious script in input
<script> tags in database
```

**الحلول:**

```bash
# الحل 1: استخدام Sanitization
// في الكود:
const xss = require('xss-clean');
app.use(xss());

# الحل 2: Escape في Frontend
// استخدم React automatically
// لا تستخدم dangerouslySetInnerHTML

# الحل 3: Content Security Policy
// في server.js:
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"]
  }
}))

# الحل 4: فحص البيانات في Database
mongosh almashooq << 'EOF'
db.vehicles.find({
  $where: function() {
    return this.description.includes('<script>')
  }
})
EOF
```

### المشكلة 3: SQL/NoSQL Injection

**الأعراض:**

```
Unexpected query behavior
Data exposure
```

**الحلول:**

```bash
# الحل 1: استخدام Parameterized Queries
// ✓ صحيح:
Vehicle.findOne({ _id: req.params.id })

// ✗ خطأ:
Vehicle.findOne({ $where: req.params.query })

# الحل 2: استخدام Sanitization
const mongoSanitize = require('mongo-sanitize')
app.use(mongoSanitize())

# الحل 3: Validate Input
// استخدم joi أو yup:
const schema = Joi.object({
  id: Joi.string().required()
})

# الحل 4: Escape Special Characters
const input = mongoSanitize.sanitize(req.body.input)
```

---

## 🎯 مشاكل التطبيق

### المشكلة 1: فشل الاختبارات

**الأعراض:**

```
Jest tests failing
Unexpected errors
```

**الحلول:**

```bash
# الحل 1: تشغيل الاختبارات
npm test

# الحل 2: فحص خطأ معين
npm test -- --testNamePattern="اسم الاختبار"

# الحل 3: تشغيل في watch mode
npm run test:watch

# الحل 4: مسح Cache
npm test -- --clearCache

# الحل 5: فحص Coverage
npm test -- --coverage

# الحل 6: فحص Log تفصيلي
npm test -- --verbose
```

### المشكلة 2: 404 Not Found

**الأعراض:**

```
Cannot GET /api/vehicles
404 Not Found
```

**الحلول:**

```bash
# الحل 1: التحقق من الـ Routes
grep -r "app.get\|app.post" backend/routes/

# الحل 2: فحص Route Prefix
// تأكد من:
app.use('/api', apiRoutes)

# الحل 3: اختبر الـ Route
curl -X GET http://localhost:3001/api/vehicles

# الحل 4: فحص Middleware
// ترتيب الـ middleware مهم:
app.use(cors())
app.use(authenticate)
app.use(routes)

# الحل 5: إعادة التشغيل
pm2 restart backend
```

### المشكلة 3: 500 Internal Server Error

**أعراض:**

```
500 Internal Server Error
Something went wrong
```

**الحلول:**

```bash
# الحل 1: فحص الـ Logs
tail -100 logs/error.log

# الحل 2: فحص قيمة الخطأ
curl -v http://localhost:3001/api/vehicles

# الحل 3: فحص Database Connection
mongosh

# الحل 4: فحص الكود
// تأكد من:
- التعامل الصحيح مع الأخطاء
- استخدام try/catch
- الرسائل الواضحة

# الحل 5: إعادة بناء
npm run build:backend

# الحل 6: إعادة التشغيل
pm2 restart backend
```

---

## 🛠️ أدوات التشخيص

### الأداة 1: Testing الـ API

```bash
# استخدم curl
curl -X GET http://localhost:3001/api/vehicles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# أو استخدم Postman
# أو استخدم insomnia
```

### الأداة 2: Database Investigation

```bash
# الاتصال بـ MongoDB
mongosh

# عرض قاعدة البيانات الحالية
db

# عرض جميع Collections
show collections

# عد السجلات
db.vehicles.countDocuments()

# عرض مثال
db.vehicles.findOne()

# البحث عن شيء معين
db.vehicles.find({ status: 'active' })
```

### الأداة 3: Performance Monitoring

```bash
# استخدم htop
htop

# استخدم PM2 monitoring
pm2 monit

# استخدم clinic.js
npx clinic doctor -- node backend/server.js

# استخدم built-in metrics
curl http://localhost:3001/api/performance/metrics | jq
```

### الأداة 4: Log Analysis

```bash
# عرض الأخطاء الأخيرة
tail -50 logs/error.log

# البحث عن شيء معين
grep "Error" logs/error.log | tail -20

# عد الأخطاء
grep -c "Error" logs/error.log

# تحليل بسيط
awk -F: '{print $2}' logs/error.log | sort | uniq -c | sort -rn
```

---

## 📞 جدول الاتصال السريع

عندما تواجه مشكلة:

```
1. تحقق من الأعراض ← ابحث في هذا الدليل
2. جرب الحل الأول ← ثم الثاني، إلخ
3. إذا لم تحل ← اجمع معلومات التشخيص
4. اتصل بـ Support ← مع السجلات والمعلومات
```

**معلومات مفيدة للـ Support:**

- رسالة الخطأ الكاملة
- آخر 100 سطر من الـ logs
- نتيجة `npm test`
- نتيجة `pm2 status`
- إخراج `df -h` و `free -h`

---

**تم إنشاء هذا الدليل:** 14 يناير 2026  
**آخر تحديث:** يومياً  
**الحالة:** ✅ جاهز للاستخدام الفوري
