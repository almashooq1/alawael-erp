# 🔧 دليل الصيانة الدورية الشامل

**التاريخ:** 14 يناير 2026  
**الإصدار:** 1.0.0  
**الحالة:** شامل وموثق

---

## 📋 جدول المحتويات

1. [الصيانة اليومية](#الصيانة-اليومية)
2. [الصيانة الأسبوعية](#الصيانة-الأسبوعية)
3. [الصيانة الشهرية](#الصيانة-الشهرية)
4. [الصيانة ربع السنوية](#الصيانة-ربع-السنوية)
5. [خطط الاستجابة للطوارئ](#خطط-الاستجابة-للطوارئ)

---

## ✅ الصيانة اليومية (يومياً)

### المهمة 1: فحص صحة النظام

```bash
# كل صباح - 5 دقائق
#!/bin/bash
echo "🔍 فحص صحة النظام..."

# 1. فحص Backend
curl -s http://localhost:3001/health | jq '.'

# 2. فحص المنافذ
lsof -i :3001 | head -5
lsof -i :3000 | head -5

# 3. فحص Memory
free -h | grep Mem

# 4. فحص Disk
df -h | grep -E "/$|/home"

# 5. فحص Processes
pm2 status
```

### المهمة 2: مراجعة Slow Query Logs

```bash
# كل 4 ساعات - 10 دقائق
#!/bin/bash
echo "📊 مراجعة Slow Queries..."

# عرض آخر 20 استعلام بطيء
tail -20 logs/slow-queries.log

# حساب متوسط وقت الاستعلامات
grep "duration" logs/slow-queries.log | \
  awk '{sum+=$NF; count++} END {print "Average:", sum/count "ms"}'

# البحث عن الأنماط المتكررة
grep "collection" logs/slow-queries.log | \
  sort | uniq -c | sort -rn | head -10
```

### المهمة 3: فحص معدل الأخطاء

```bash
# كل 6 ساعات - 10 دقائق
#!/bin/bash
echo "❌ فحص الأخطاء..."

# عد الأخطاء في آخر 24 ساعة
ERROR_COUNT=$(grep -c "ERROR" logs/error.log)
echo "Total errors: $ERROR_COUNT"

# أنواع الأخطاء الشائعة
echo "Top errors:"
grep "ERROR" logs/error.log | \
  awk -F: '{print $3}' | \
  sort | uniq -c | sort -rn | head -5

# عرض آخر 10 أخطاء
echo "Latest errors:"
tail -10 logs/error.log
```

### المهمة 4: مراقبة استخدام الموارد

```bash
# كل ساعة - 5 دقائق
#!/bin/bash
echo "📈 استخدام الموارد..."

# CPU Usage
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'

# Memory Usage
echo "Memory Usage:"
free -h | awk 'NR==2{printf("Used: %s / Total: %s (%.2f%%)\n", $3, $2, ($3/$2)*100)}'

# Disk I/O
echo "Disk I/O:"
iostat -x 1 2 | tail -1

# Database Connections
echo "Database Connections:"
mongosh --eval "db.serverStatus().connections"
```

### المهمة 5: التحقق من النسخ الاحتياطية

```bash
# كل صباح - 5 دقائق
#!/bin/bash
echo "💾 التحقق من النسخ الاحتياطية..."

# فحص آخر نسخة احتياطية
LATEST_BACKUP=$(ls -t backups/ | head -1)
echo "Latest backup: $LATEST_BACKUP"
echo "Size: $(du -sh backups/$LATEST_BACKUP)"
echo "Age: $(date -r backups/$LATEST_BACKUP)"

# التحقق من أن النسخة محفوظة في آخر 24 ساعة
BACKUP_TIME=$(stat -c %Y backups/latest-backup.tar.gz)
CURRENT_TIME=$(date +%s)
AGE_HOURS=$(( ($CURRENT_TIME - $BACKUP_TIME) / 3600 ))

if [ $AGE_HOURS -gt 24 ]; then
  echo "⚠️ تحذير: النسخة الاحتياطية أقدم من 24 ساعة!"
  # أرسل تنبيه
fi
```

---

## 🔄 الصيانة الأسبوعية (كل يوم جمعة)

### المهمة 1: تحليل الأداء

```bash
# يوم جمعة - ساعة واحدة
#!/bin/bash
echo "📊 تحليل الأداء الأسبوعي..."

# 1. احسب إحصائيات الأداء
curl -s http://localhost:3001/api/performance/metrics | jq '.performance'

# 2. عرض أفضل وأسوأ الاستعلامات
echo "Top 10 slowest queries:"
grep "duration" logs/slow-queries.log | \
  awk -F'duration: ' '{print $2}' | sort -rn | head -10

# 3. عرض أكثر الـ endpoints استخداماً
echo "Top 10 endpoints:"
grep "GET\|POST\|PUT\|DELETE" logs/access.log | \
  awk '{print $7}' | sort | uniq -c | sort -rn | head -10

# 4. حساب Error Rate
TOTAL_REQUESTS=$(wc -l < logs/access.log)
ERROR_REQUESTS=$(grep -c "5[0-9][0-9]" logs/access.log)
echo "Error Rate: $(bc <<< "scale=2; $ERROR_REQUESTS * 100 / $TOTAL_REQUESTS")%"
```

### المهمة 2: فحص الأمان

```bash
# يوم جمعة - 30 دقيقة
#!/bin/bash
echo "🔐 فحص الأمان الأسبوعي..."

# 1. فحص الثغرات
npm audit

# 2. فحص كلمات المرور الضعيفة
mongosh << 'EOF'
db.users.aggregate([
  {
    $match: { password: { $exists: true } }
  },
  { $count: "total" }
])
EOF

# 3. فحص Failed Login Attempts
grep "Failed login" logs/auth.log | \
  awk '{print $7}' | sort | uniq -c | sort -rn | head -10

# 4. فحص Unauthorized Access
grep "403\|401" logs/access.log | wc -l
```

### المهمة 3: تحديث المكتبات

```bash
# يوم جمعة - 30 دقيقة
#!/bin/bash
echo "📦 تحديث المكتبات..."

# 1. فحص آخر التحديثات
npm outdated

# 2. تحديث المكتبات البسيطة
npm update

# 3. تحديث مكتبات الأمان فوراً
npm audit fix

# 4. إعادة تشغيل الخوادم
pm2 restart all
pm2 status
```

### المهمة 4: استعادة واختبار النسخ الاحتياطية

```bash
# يوم جمعة - ساعتان
#!/bin/bash
echo "💾 اختبار النسخ الاحتياطية..."

# 1. إنشاء نسخة احتياطية جديدة
mongodump --db almashooq --out ./weekly-backup/$(date +%Y-%m-%d)

# 2. اختبار استعادة النسخة
# في بيئة اختبار منفصلة:
mongorestore --nsInclude="almashooq.*" ./weekly-backup/$(date +%Y-%m-%d)/almashooq

# 3. التحقق من تكامل البيانات
mongosh almashooq << 'EOF'
db.vehicles.count()
db.users.count()
db.rehabilitation_programs.count()
EOF
```

### المهمة 5: مراجعة السجلات

```bash
# يوم جمعة - 30 دقيقة
#!/bin/bash
echo "📋 مراجعة السجلات الأسبوعية..."

# 1. أنشئ تقرير أسبوعي
cat > weekly-report.txt << EOF
=== Weekly System Report ===
Date: $(date)

Performance:
$(curl -s http://localhost:3001/api/performance/metrics | jq '.performance.summary')

Errors:
Total: $(grep -c ERROR logs/error.log)
Top types: $(grep ERROR logs/error.log | awk -F: '{print $3}' | sort | uniq -c | sort -rn | head -3)

Security:
Failed logins: $(grep -c "Failed login" logs/auth.log)
Unauthorized access: $(grep -c "401\|403" logs/access.log)

Resources:
Database size: $(du -sh data/)
Backup size: $(du -sh backups/)
EOF

echo "Report saved to weekly-report.txt"
```

---

## 📅 الصيانة الشهرية (يوم 1 من كل شهر)

### المهمة 1: مراجعة شاملة للأداء

```bash
# يوم 1 - ساعتان
#!/bin/bash
echo "📊 مراجعة الأداء الشهرية..."

# 1. إنشاء تقرير الأداء
cat > monthly-performance-report.md << 'EOF'
# Monthly Performance Report

## Response Times
$(curl -s http://localhost:3001/api/performance/metrics | jq '.performance')

## Slow Queries Summary
$(tail -1000 logs/slow-queries.log | \
  awk -F'duration: ' '{sum+=$2; count++} END {print "Count:", count; print "Avg:", sum/count "ms"}')

## Cache Performance
$(curl -s http://localhost:3001/api/performance/cache | jq '.')

## Database Statistics
EOF

# 2. تحليل Trends
echo "Performance Trends:"
# قارن مع الأسابيع السابقة
```

### المهمة 2: تحسينات الأداء

```bash
# يوم 1-3 - ساعات عديدة
#!/bin/bash
echo "⚙️ تحسينات الأداء الشهرية..."

# 1. تحليل الاستعلامات البطيئة
echo "Top 20 slow queries:"
tail -10000 logs/slow-queries.log | \
  sort -t':' -k3 -rn | head -20

# 2. إضافة indexes إذا لزم الأمر
mongosh almashooq << 'EOF'
// تحقق من الـ indexes الموجودة
db.vehicles.getIndexes()
db.users.getIndexes()
EOF

# 3. تحسين Caching
# - راجع cache hit rate
# - قم بتحديث TTL إذا لزم
# - أضف caching لاستعلامات جديدة

# 4. تحسين Queries
# - استخدم lean() للاستعلامات البسيطة
# - استخدم projection لتقليل حجم البيانات
# - استخدم aggregation للعمليات المعقدة
```

### المهمة 3: Security Audit

```bash
# يوم 1-5 - ساعة
#!/bin/bash
echo "🔐 Security Audit الشهري..."

# 1. فحص الثغرات الأمنية
npm audit --depth=10

# 2. فحص Dependency licenses
npm ls --long

# 3. فحص بيانات المستخدمين الحساسة
mongosh almashooq << 'EOF'
// تحقق من عدم وجود بيانات حساسة غير مشفرة
db.users.findOne({
  $or: [
    { email: { $regex: "password" } },
    { phone: { $regex: "secret" } }
  ]
})
EOF

# 4. فحص Failed Login Attempts
echo "Failed logins this month:"
grep "Failed login" logs/auth.log | wc -l

# 5. فحص Suspicious Activities
echo "Suspicious activities:"
grep "ERROR\|WARN" logs/security.log | \
  grep -v "Connection timeout\|Normal warning" | \
  wc -l
```

### المهمة 4: مراجعة النسخ الاحتياطية

```bash
# يوم 5 - 30 دقيقة
#!/bin/bash
echo "💾 مراجعة النسخ الاحتياطية الشهرية..."

# 1. فحص وجود نسخ احتياطية
ls -lah backups/ | tail -10

# 2. اختبار استعادة كاملة
# في بيئة اختبار:
mongorestore --nsInclude="almashooq.*" ./backups/monthly/$(date +%Y-%m)

# 3. التحقق من تكامل البيانات
mongosh almashooq << 'EOF'
// تحقق من عدد السجلات
print("Vehicles:", db.vehicles.countDocuments())
print("Users:", db.users.countDocuments())
print("Sessions:", db.sessions.countDocuments())
EOF

# 4. حساب حجم النسخ الاحتياطية
du -sh backups/

# 5. تنظيف النسخ الاحتياطية القديمة
find backups/ -mtime +90 -delete
```

### المهمة 5: اجتماع مراجعة المشروع

```
المشاركون: Team Lead, DevOps, Security Officer, Product Manager

الأجندة:
1. مراجعة KPIs الشهرية
   - Uptime %
   - Response Time
   - Error Rate
   - User Count

2. عرض المشاكل الرئيسية
   - أبطأ Queries
   - الأخطاء المتكررة
   - مشاكل الأمان

3. التحسينات المخطط لها
   - جدول تحسينات الأداء
   - تحديثات الأمان
   - ميزات جديدة

4. خطة الشهر التالي
   - الأهداف
   - المواعيد النهائية
   - الموارد المطلوبة
```

---

## 🎯 الصيانة ربع السنوية (كل 3 أشهر)

### المهمة 1: مراجعة Architecture

```bash
# في بداية كل ربع سنة - يومان
#!/bin/bash
echo "🏗️ مراجعة البنية المعمارية..."

# 1. توثيق البنية الحالية
# - عدد الـ microservices
# - التبعيات بين الخدمات
# - نقاط الاختناق

# 2. تحليل حجم الكود
cloc --by-file --include-lang=JavaScript .

# 3. فحص الـ Dependencies
npm ls | wc -l

# 4. تحليل الأداء النسبي
# - قارن مع الأرباع السابقة
# - حدد الأنماط
# - ستخطط للتحسينات
```

### المهمة 2: Load Testing

```bash
# في بداية كل ربع سنة - يومان
#!/bin/bash
echo "⚡ اختبار الحمل ربع السنوي..."

# 1. تشغيل Load Test
cd backend
node load-test.js

# 2. اختبار مع concurrency عالي
# - 50 concurrent users
# - 1000 requests
# - قياس الأداء

# 3. تحليل النتائج
# - هل أداء النظام ممتاز؟
# - هل هناك نقاط اختناق؟
# - هل نحتاج إلى تحسينات؟

# 4. إنشاء تقرير
```

### المهمة 3: Database Optimization

```bash
# في بداية كل ربع سنة - يومان
#!/bin/bash
echo "🗄️ تحسين قاعدة البيانات..."

# 1. تحليل حجم قاعدة البيانات
mongosh almashooq --eval "db.stats()"

# 2. تفتيش الـ indexes
mongosh almashooq << 'EOF'
db.vehicles.aggregate([
  { $indexStats: {} }
])
EOF

# 3. حذف الـ unused indexes
# MongoDB يعطي تحذيرات للـ indexes غير المستخدمة

# 4. تحسين Sharding (إذا لزم)
# - هل نحتاج إلى sharding؟
# - ما هي shard key الأفضل؟
```

### المهمة 4: Infrastructure Review

```bash
# في بداية كل ربع سنة - يوم
#!/bin/bash
echo "🖥️ مراجعة البنية التحتية..."

# 1. مراجعة استخدام الموارد
# - CPU: هل مستقر تحت الحمل؟
# - Memory: هل هناك تسريب؟
# - Disk: هل هناك مساحة كافية؟

# 2. مراجعة التكاليس
# - تكلفة الخادم
# - تكلفة قاعدة البيانات
# - تكلفة البيانات

# 3. تحسينات مقترحة
# - هل نحتاج إلى خادم أقوى؟
# - هل نحتاج إلى CDN؟
# - هل نحتاج إلى Load Balancer؟
```

---

## 🆘 خطط الاستجابة للطوارئ (Emergency Response Plans)

### السيناريو 1: النظام معطل (System Down)

```bash
# الخطوات الفورية:
1. تشخيص المشكلة (5 دقائق)
   pm2 status
   curl http://localhost:3001/health
   tail -100 logs/error.log

2. محاولة الإصلاح السريع (10 دقائق)
   pm2 restart all
   # أو إعادة تشغيل يدوية

3. استعادة من نسخة احتياطية (30 دقيقة)
   mongorestore --nsInclude="almashooq.*" ./backups/latest

4. التحقق من الاستقرار (10 دقائق)
   npm test
   curl http://localhost:3001/health

5. إشعار المستخدمين
   - أرسل بريد إخباري
   - حدّث صفحة الحالة
```

### السيناريو 2: Slow Performance

```bash
# خطوات استكشاف الأخطاء:
1. قياس الأداء الحالية (5 دقائق)
   curl http://localhost:3001/api/performance/metrics

2. فحص الموارد (10 دقائق)
   top -bn1
   free -h
   df -h

3. فحص قاعدة البيانات (15 دقيقة)
   mongosh --eval "db.serverStatus()"
   mongosh --eval "db.currentOp()"

4. قتل الاستعلامات البطيئة
   mongosh almashooq << 'EOF'
   db.killOp(opid)
   EOF

5. إضافة indexes إذا لزم الأمر

6. إعادة تشغيل الخدمات
   pm2 restart all
```

### السيناريو 3: Security Breach

```bash
# خطوات فورية:
1. عزل النظام (لحظي)
   - افصل الاتصالات الخارجية
   - احفظ السجلات

2. تحديد نطاق الضرر (30 دقيقة)
   - من حصل على الوصول؟
   - ما هي البيانات المتأثرة؟
   - متى حدث؟

3. استعادة من النسخة الاحتياطية
   mongorestore --nsInclude="almashooq.*" ./backups/pre-breach

4. تحديث كلمات المرور
   - غيّر جميع كلمات مرور الخدمات
   - أطلب من المستخدمين تحديث كلماتهم

5. تحليل السجلات
   grep -i "suspicious\|error\|breach" logs/security.log

6. الإبلاغ عن الحادث
   - أبلغ الجهات المسؤولة
   - أخطر المستخدمين المتأثرين
```

---

## 📊 مصفوفة الصيانة

| المهمة           | اليومية | الأسبوعية | الشهرية | ربع السنوية |
| ---------------- | ------- | --------- | ------- | ----------- |
| فحص الصحة        | ✅      | ✅        | ✅      | ✅          |
| الأداء           | ✅      | ✅        | ✅      | ✅          |
| الأمان           | -       | ✅        | ✅      | ✅          |
| النسخ الاحتياطية | ✅      | ✅        | ✅      | ✅          |
| التحديثات        | -       | ✅        | -       | -           |
| Load Testing     | -       | -         | -       | ✅          |
| Architecture     | -       | -         | -       | ✅          |

---

**تم إنشاء هذا الدليل:** 14 يناير 2026  
**الحالة:** ✅ جاهز للاستخدام الفوري
