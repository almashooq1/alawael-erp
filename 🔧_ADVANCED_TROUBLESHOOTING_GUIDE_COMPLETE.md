# 🔧 دليل استكشاف الأخطاء المتقدم - شامل

## 🚨 أخطاء حرجة وحلول فورية

### **الخطأ 1: Docker لا يبدأ**

#### 🔴 الأعراض:

```
Error: Cannot connect to Docker daemon
docker: command not found
Port 2375 is not responding
```

#### ✅ الحل السريع (1 دقيقة):

```powershell
# 1. تحقق من Docker
docker --version

# 2. إذا لم يكن مثبت:
# قم بتثبيت Docker Desktop من:
# https://www.docker.com/products/docker-desktop

# 3. أعد تشغيل Docker Desktop:
# ذهب إلى System Tray → Docker → Restart

# 4. انتظر 30 ثانية
Start-Sleep -Seconds 30

# 5. تحقق من الاتصال:
docker ps
```

#### 🟡 الحل المتقدم (3 دقائق):

```powershell
# 1. نظّف كل الحاويات:
docker system prune -a --volumes

# 2. أعد بناء الصور:
docker-compose build --no-cache

# 3. شغّل الخوادم:
docker-compose up -d

# 4. تحقق من الحالة:
docker-compose ps
```

#### 🔴 الحل القوي (10 دقائق):

```powershell
# 1. توقف كل الخدمات:
docker-compose down

# 2. احذف كل الحاويات:
docker system prune -a --volumes --force

# 3. أعد بناء من الصفر:
docker-compose build --no-cache

# 4. شغّل مع السجلات:
docker-compose up -d --build

# 5. عرّض السجلات:
docker-compose logs -f
```

---

### **الخطأ 2: MongoDB لا يتصل**

#### 🔴 الأعراض:

```
MongoError: connect ECONNREFUSED 127.0.0.1:27017
Error: Failed to connect to MongoDB
Timeout waiting for MongoDB
```

#### ✅ الحل السريع (2 دقيقة):

```bash
# 1. تحقق من MongoDB:
docker ps | grep mongo

# 2. إذا لم تكن موجودة:
docker-compose up -d mongo

# 3. انتظر:
sleep 5

# 4. اختبر الاتصال:
mongosh "mongodb://localhost:27017"
```

#### 🟡 الحل المتقدم (5 دقائق):

```bash
# 1. أعد تشغيل MongoDB:
docker restart mongo

# 2. تحقق من الحالة:
docker logs mongo

# 3. اختبر الاتصال:
curl -X GET http://localhost:27017

# 4. إذا لم ينجح:
docker-compose down mongo
docker-compose up -d mongo
```

#### 🔴 الحل القوي (10 دقائق):

```bash
# 1. احذف البيانات:
docker-compose down -v

# 2. أعد الإنشاء:
docker-compose up -d mongo

# 3. انتظر:
sleep 10

# 4. أعد تشغيل Backend:
npm run dev:backend

# 5. جرّب الاتصال:
curl -X GET http://localhost:3001/api/health
```

---

### **الخطأ 3: Redis لا يعمل**

#### 🔴 الأعراض:

```
Error: Redis connection refused
ECONNREFUSED 127.0.0.1:6379
Could not connect to any Redis instance
```

#### ✅ الحل السريع (2 دقيقة):

```bash
# 1. شغّل Redis:
docker-compose up -d redis

# 2. اختبر:
redis-cli ping

# إذا كانت النتيجة "PONG" ✅
```

#### 🟡 الحل المتقدم (5 دقائق):

```bash
# 1. أعد تشغيل:
docker restart redis

# 2. تفريغ البيانات:
redis-cli FLUSHALL

# 3. تحقق:
redis-cli INFO

# 4. إذا لم ينجح:
docker-compose down redis
docker-compose up -d redis
```

---

### **الخطأ 4: Backend API لا يستجيب**

#### 🔴 الأعراض:

```
Error: Cannot GET /api/health
Connection refused to localhost:3001
ERR_CONNECTION_REFUSED
```

#### ✅ الحل السريع (3 دقائق):

```bash
# 1. تحقق من العملية:
lsof -i :3001
# أو في Windows:
netstat -ano | findstr :3001

# 2. إذا كانت موجودة - اقتلها:
taskkill /PID [PID] /F

# 3. شغّل Backend مجدداً:
npm run dev:backend

# 4. اختبر:
curl -X GET http://localhost:3001/api/health
```

#### 🟡 الحل المتقدم (8 دقائق):

```bash
# 1. تحقق من الأخطاء:
npm run dev:backend 2>&1 | tail -20

# 2. تفقد .env:
cat backend/.env | grep -E "(PORT|MONGO|REDIS)"

# 3. تحقق من التبعيات:
npm ls

# 4. أعد تثبيت:
rm -rf node_modules package-lock.json
npm install

# 5. شغّل:
npm run dev:backend
```

---

### **الخطأ 5: Frontend لا يحمّل**

#### 🔴 الأعراض:

```
Error: localhost:3000 refused to connect
Cannot find module
webpack compilation failed
```

#### ✅ الحل السريع (3 دقائق):

```bash
# 1. شغّل الفرونت:
npm run dev:frontend

# 2. اذهب إلى:
# http://localhost:3000

# 3. افتح Console (F12):
# ابحث عن الأخطاء الحمراء
```

#### 🟡 الحل المتقدم (8 دقائق):

```bash
# 1. نظّف الكاش:
rm -rf frontend/node_modules
rm frontend/package-lock.json

# 2. أعد التثبيت:
cd frontend
npm install

# 3. شغّل:
npm run dev

# 4. إذا لم ينجح:
npm start -- --reset-cache
```

---

### **الخطأ 6: Database Timeout**

#### 🔴 الأعراض:

```
MongoTimeoutError
Command failed with error 50
Timeout while waiting for response
```

#### ✅ الحل السريع (5 دقائق):

```bash
# 1. تحقق من الاتصال:
mongosh "mongodb://localhost:27017" --eval "db.serverStatus()"

# 2. تحقق من الأداء:
mongosh "mongodb://localhost:27017" --eval "db.stats()"

# 3. إذا كانت بطيئة:
docker restart mongo
```

#### 🟡 الحل المتقدم (15 دقيقة):

```bash
# 1. فحص الفهارس:
npm run db:indexes

# 2. تحسين الاستعلامات:
npm run db:optimize

# 3. نظّف البيانات القديمة:
npm run db:cleanup

# 4. قم بإعادة الفهرسة:
mongosh << EOF
use rehab_system
db.collection.reIndex()
EOF
```

---

### **الخطأ 7: Memory Leak**

#### 🔴 الأعراض:

```
Process out of memory
FATAL ERROR: CALL_AND_RETRY_LAST
Node.js process killed due to memory limit
```

#### ✅ الحل السريع (5 دقائق):

```bash
# 1. توقف الخادم:
npm run stop

# 2. نظّف الذاكرة:
npm run clean:cache

# 3. شغّل مجدداً:
npm run dev:backend

# 4. راقب الاستخدام:
npm run monitor:memory
```

#### 🟡 الحل المتقدم (20 دقيقة):

```bash
# 1. جد source of leak:
node --max-old-space-size=4096 ./backend/server.js

# 2. استخدم profiler:
npm run profile:memory

# 3. حلّل النتائج:
node --prof-process isolate-*.log > analysis.txt
cat analysis.txt | head -50

# 4. إصلح leak:
npm run fix:memory-leak
```

---

### **الخطأ 8: Port Already in Use**

#### 🔴 الأعراض:

```
Error: listen EADDRINUSE: address already in use :::3001
Address already in use
Port 3000/3001/6379 is already taken
```

#### ✅ الحل السريع (2 دقيقة):

```bash
# 1. ابحث عن العملية:
# Windows:
netstat -ano | findstr :3001

# 2. اقتلها:
taskkill /PID [PID] /F

# 3. شغّل مجدداً:
npm run dev:backend
```

#### 🟡 الحل المتقدم (5 دقائق):

```bash
# 1. غيّر المنفذ:
PORT=3002 npm run dev:backend

# 2. أو ابحث عن كل العمليات:
# Windows:
Get-NetTCPConnection -LocalPort 3001 | Stop-Process

# 3. أو استخدم Docker:
docker-compose restart backend
```

---

## 📊 فحص الصحة المتقدم

### **اختبار شامل (10 دقائق):**

```bash
#!/bin/bash

echo "🔍 فحص الصحة الشامل..."

# 1. Docker
echo "1. التحقق من Docker..."
if docker ps > /dev/null 2>&1; then
  echo "✅ Docker: OK"
else
  echo "❌ Docker: FAILED"
fi

# 2. MongoDB
echo "2. التحقق من MongoDB..."
if mongosh "mongodb://localhost:27017" --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
  echo "✅ MongoDB: OK"
else
  echo "❌ MongoDB: FAILED"
fi

# 3. Redis
echo "3. التحقق من Redis..."
if redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis: OK"
else
  echo "❌ Redis: FAILED"
fi

# 4. Backend API
echo "4. التحقق من Backend API..."
if curl -s -X GET http://localhost:3001/api/health | grep -q "status"; then
  echo "✅ Backend API: OK"
else
  echo "❌ Backend API: FAILED"
fi

# 5. Frontend
echo "5. التحقق من Frontend..."
if curl -s http://localhost:3000 | grep -q "html" > /dev/null 2>&1; then
  echo "✅ Frontend: OK"
else
  echo "❌ Frontend: FAILED"
fi

# 6. Disk Space
echo "6. التحقق من مساحة القرص..."
DISKSPACE=$(df / | tail -1 | awk '{print $(NF-1)}')
if [ ${DISKSPACE%\%} -lt 80 ]; then
  echo "✅ Disk Space: OK ($DISKSPACE)"
else
  echo "❌ Disk Space: LOW ($DISKSPACE)"
fi

# 7. CPU Usage
echo "7. التحقق من CPU..."
CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}')
echo "✅ CPU Usage: $CPU"

# 8. Memory
echo "8. التحقق من الذاكرة..."
MEM=$(free | grep Mem | awk '{printf("%.1f%%\n", $3/$2 * 100)}')
echo "✅ Memory Usage: $MEM"

echo ""
echo "✅ فحص الصحة اكتمل!"
```

---

## 🔄 خطوات إعادة التشغيل

### **الخيار 1: إعادة تشغيل سريعة (1 دقيقة):**

```bash
npm run restart:quick
```

### **الخيار 2: إعادة تشغيل شاملة (5 دقائق):**

```bash
npm run restart:full
```

### **الخيار 3: إعادة تشغيل كاملة (15 دقيقة):**

```bash
npm run restart:complete

# أو يدويًا:
docker-compose down
docker system prune -a --volumes
docker-compose build --no-cache
docker-compose up -d
```

---

## 📝 السجلات والتصحيح

### **عرض السجلات:**

```bash
# السجلات الأخيرة:
docker-compose logs -f --tail=100

# سجلات service محدد:
docker-compose logs -f backend
docker-compose logs -f mongo
docker-compose logs -f redis

# حفظ السجلات:
docker-compose logs > logs-$(date +%Y%m%d-%H%M%S).txt
```

### **تصحيح أعمق (Debugging):**

```bash
# تصحيح Backend:
npm run debug:backend

# تصحيح Database:
npm run debug:database

# تصحيح Performance:
npm run debug:performance
```

---

## 🚨 خطة الطوارئ النهائية

### **إذا فشل كل شيء:**

```bash
# 1. توقف كل شيء:
docker-compose down -v

# 2. نظّف النظام:
docker system prune -a --volumes --force

# 3. أعد البناء:
docker-compose build --no-cache

# 4. شغّل من الصفر:
docker-compose up -d

# 5. تحقق:
npm run health:check
```

### **استرجاع من Backup:**

```bash
# 1. احصل على آخر backup:
npm run backup:restore:latest

# 2. تحقق من البيانات:
npm run db:verify

# 3. شغّل المرة أخرى:
npm run dev
```

---

## 📞 متى تطلب المساعدة؟

```
🟢 يمكنك حله بنفسك:
  - Port conflict
  - Docker restart
  - Cache cleanup
  - Simple errors

🟡 تحتاج استشارة:
  - Database corruption
  - Performance issues
  - Complex bugs
  - Integration problems

🔴 استدعِ الفريق الفوري:
  - System crash
  - Data loss
  - Security breach
  - Critical downtime

🆘 استدعِ CTO:
  - Multiple cascading failures
  - Unknown root cause
  - Production emergency
  - Need immediate decision
```

---

**آخر تحديث:** 19 يناير 2026 **الحالة:** ✅ شامل وجاهز
