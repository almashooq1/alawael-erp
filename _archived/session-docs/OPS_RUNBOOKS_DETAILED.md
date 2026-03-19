# 📚 كتيبات التشغيل المفصلة
## Alawael Platform v1.0 - Operations Runbooks

**الإصدار**: 1.0  
**التاريخ**: 26 فبراير 2026  
**آخر تحديث**: فريق العمليات  

---

## جدول المحتويات

1. [Runbook 1: Server Down / No Response](#runbook-1-server-down--no-response)
2. [Runbook 2: High Error Rate](#runbook-2-high-error-rate)
3. [Runbook 3: High Latency](#runbook-3-high-latency)
4. [Runbook 4: Database Connection Issues](#runbook-4-database-connection-issues)
5. [Runbook 5: Memory/CPU Exhaustion](#runbook-5-memorycpu-exhaustion)
6. [Runbook 6: Deployment Rollback](#runbook-6-deployment-rollback)
7. [Runbook 7: Cache Issues (Redis)](#runbook-7-cache-issues-redis)
8. [Runbook 8: API Rate Limiting](#runbook-8-api-rate-limiting)
9. [Runbook 9: Security Incident](#runbook-9-security-incident)
10. [Runbook 10: Catastrophic Failure](#runbook-10-catastrophic-failure)

---

## Runbook 1: Server Down / No Response

### 🔴 الوصف
الخادم لا يستجيب أو متوقف تماماً

### 📊 الأعراض
```
├─ عدم القدرة على الوصول للموقع
├─ Timeout على جميع الطلبات
├─ Health check يفشل
└─ لا يوجد استجابة من API
```

### ⏱️ التشخيص (5 خطوات - 5 دقائق)

```bash
# الخطوة 1: فحص الاتصال الأساسي
ping <server-ip>
curl -I https://api.alawael.sa/health

# الخطوة 2: فحص حالة الخادم
ssh <server-ip> "systemctl status alawael-backend"
ssh <server-ip> "pm2 status"

# الخطوة 3: فحص المنافذ
netstat -tlnp | grep -E '3000|5432|6379'

# الخطوة 4: فحص السجلات
tail -100 /var/log/alawael/error.log
journalctl -u alawael-backend -n 50

# الخطوة 5: فحص الموارد
top -bn1 | head -20
df -h
free -m
```

### 🔧 الإصلاح (5 خطوات - 10 دقائق)

```bash
# الخطوة 1: إعادة تشغيل الخدمة
pm2 restart all
# أو
systemctl restart alawael-backend

# الخطوة 2: إذا فشل، إعادة تشغيل الخادم
sudo reboot

# الخطوة 3: التحقق من الاتصال بقاعدة البيانات
psql -U alawael_user -d alawael_db -c "SELECT 1"

# الخطوة 4: التحقق من Redis
redis-cli ping

# الخطوة 5: التحقق من التطبيق
curl -s https://api.alawael.sa/health | jq .
```

### 📞 من يتصل به
```
إذا لم يتم الحل في 15 دقيقة:
└─ DevOps Lead: +966-XXX-XXXX-XXX
└─ CTO: +966-XXX-XXXX-XXX
```

### ✅ معايير النجاح
```
├─ Health check يعود بـ 200 OK
├─ API يستجيب خلال < 200ms
├─ لا توجد أخطاء في السجلات
└─ جميع الخدمات تعمل
```

---

## Runbook 2: High Error Rate

### 🟠 الوصف
معدل الأخطاء أعلى من المعتاد (> 1%)

### 📊 الأعراض
```
├─ Alert: Error rate > 1%
├─ كثير من 500 Internal Server Error
├─ شكاوى من المستخدمين
└─ فشل العمليات في السجلات
```

### ⏱️ التشخيص (5 خطوات - 5 دقائق)

```bash
# الخطوة 1: فحص معدل الأخطاء الحالي
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])"

# الخطوة 2: فحص آخر الأخطاء
tail -100 /var/log/alawael/error.log | grep -i "error\|exception"

# الخطوة 3: فحص السجلات المجمعة
grep "500\|502\|503" /var/log/nginx/access.log | tail -50

# الخطوة 4: فحص اتصال قاعدة البيانات
SELECT count(*) FROM pg_stat_activity WHERE state = 'error';

# الخطوة 5: فحص الذاكرة
free -m
pm2 monit
```

### 🔧 الإصلاح (5 خطوات - 15 دقيقة)

```bash
# الخطوة 1: تحديد نوع الخطأ الشائع
grep -o "Error: [^"]*" /var/log/alawael/error.log | sort | uniq -c | sort -rn | head -5

# الخطوة 2: إذا كان خطأ قاعدة بيانات
# إعادة تشغيل الاتصالات
pm2 restart alawael-backend

# الخطوة 3: إذا كان خطأ ذاكرة
# زيادة الذاكرة أو إعادة التشغيل
NODE_OPTIONS="--max-old-space-size=4096" pm2 restart all

# الخطوة 4: تنظيف السجلات القديمة
find /var/log/alawael -name "*.log" -mtime +7 -delete

# الخطوة 5: مراقبة لمدة 5 دقائق
watch -n 30 'curl -s https://api.alawael.sa/health'
```

### 📞 متى يُصعّد
```
├─ إذا استمر الخطأ > 15 دقيقة
├─ إذا تجاوز معدل الخطأ 5%
└─ إذا تأثرت عمليات حيوية
```

### ✅ معايير النجاح
```
├─ معدل الأخطاء < 0.1%
├─ لا توجد أخطاء 5xx جديدة
└─ المستخدمين يبلغون عن تحسن
```

---

## Runbook 3: High Latency

### 🟠 الوصف
زمن الاستجابة أعلى من المقبول

### 📊 الأعراض
```
├─ Alert: p95 latency > 500ms
├─ بطء في تحميل الصفحات
├─ Timeout في الطلبات
└─ شكاوى من المستخدمين
```

### ⏱️ التشخيص (5 خطوات - 5 دقائق)

```bash
# الخطوة 1: قياس زمن الاستجابة
curl -w "@curl-format.txt" -o /dev/null -s https://api.alawael.sa/api/v1/users

# الخطوة 2: فحص حمل النظام
top -bn1 | head -20
iostat -x 1 5

# الخطوة 3: فحص قاعدة البيانات
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;

# الخطوة 4: فحص الشبكة
traceroute api.alawael.sa
mtr -c 10 api.alawael.sa

# الخطوة 5: فحص الـ Cache
redis-cli info stats | grep hit_rate
```

### 🔧 الإصلاح (5 خطوات - 10 دقائق)

```bash
# الخطوة 1: إذا كانت قاعدة البيانات بطيئة
# إعادة تحميل الإعدادات
SELECT pg_reload_conf();

# الخطوة 2: تنظيف الـ Cache
redis-cli FLUSHDB

# الخطوة 3: إعادة تشغيل الخدمات البطيئة
pm2 restart alawael-backend

# الخطوة 4: تحسين الاستعلامات البطيئة
# تشغيل ANALYZE
ANALYZE;

# الخطوة 5: إضافة scaling إذا لزم الأمر
# (يتطلب موافقة)
kubectl scale deployment alawael --replicas=5
```

### ✅ معايير النجاح
```
├─ p95 latency < 200ms
├─ p99 latency < 500ms
└─ لا توجد timeouts
```

---

## Runbook 4: Database Connection Issues

### 🔴 الوصف
مشاكل في الاتصال بقاعدة البيانات

### 📊 الأعراض
```
├─ "Connection refused" errors
├─ "Too many connections" errors
├─ استعلامات بطيئة جداً
└─ Timeout في عمليات DB
```

### ⏱️ التشخيص (5 خطوات - 5 دقائق)

```bash
# الخطوة 1: فحص حالة PostgreSQL
systemctl status postgresql
pg_isready -h localhost -p 5432

# الخطوة 2: فحص الاتصالات النشطة
SELECT count(*) FROM pg_stat_activity;

# الخطوة 3: فحص الاتصالات العالقة
SELECT pid, usename, state, query, query_start 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY query_start;

# الخطوة 4: فحص الأقفال
SELECT * FROM pg_locks WHERE NOT granted;

# الخطوة 5: فحص موارد الخادم
df -h /var/lib/postgresql
free -m
```

### 🔧 الإصلاح (5 خطوات - 10 دقائق)

```bash
# الخطوة 1: إنهاء الاتصالات العالقة
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND query_start < NOW() - INTERVAL '10 minutes';

# الخطوة 2: زيادة حد الاتصالات (مؤقتاً)
ALTER SYSTEM SET max_connections = 200;
SELECT pg_reload_conf();

# الخطوة 3: إعادة تشغيل التطبيقات
pm2 restart all

# الخطوة 4: إذا فشل كل شيء
systemctl restart postgresql

# الخطوة 5: التحقق
psql -c "SELECT version();"
```

### 📞 التصعيد
```
├─ Database Admin: +966-XXX-XXXX-XXX
└─ إذا لم يُحل خلال 15 دقيقة → CTO
```

---

## Runbook 5: Memory/CPU Exhaustion

### 🔴 الوصف
استنزاف موارد الذاكرة أو المعالج

### 📊 الأعراض
```
├─ Alert: CPU > 90% لمدة 5 دقائق
├─ Alert: Memory > 90%
├─ النظام بطيء جداً
└─ OOM (Out of Memory) errors
```

### ⏱️ التشخيص (5 خطوات - 3 دقائق)

```bash
# الخطوة 1: فحص الذاكرة والمعالج
free -h
top -bn1 | head -20

# الخطوة 2: تحديد العمليات المستهلكة
ps aux --sort=-%mem | head -10
ps aux --sort=-%cpu | head -10

# الخطوة 3: فحص Node.js
pm2 monit

# الخطوة 4: فحص swap
swapon -s
cat /proc/sys/vm/swappiness

# الخطوة 5: فحص الـ load average
uptime
```

### 🔧 الإصلاح (5 خطوات - 10 دقائق)

```bash
# الخطوة 1: إعادة تشغيل العمليات المستهلكة
pm2 restart <process-name>

# الخطوة 2: تنظيف الـ cache
sync && echo 3 > /proc/sys/vm/drop_caches

# الخطوة 3: إنهاء العمليات المعلقة
pkill -f "defunct"

# الخطوة 4: زيادة الموارد (إذا متاح)
# AWS: تغيير instance type
# أو إضافة swap
dd if=/dev/zero of=/swapfile bs=1G count=4
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# الخطوة 5: إعادة التشغيل إذا لزم الأمر
sudo reboot
```

---

## Runbook 6: Deployment Rollback

### 🔴 الوصف
الحاجة للتراجع عن نشر جديد بسبب مشاكل

### 📊 الأعراض
```
├─ فشل الاختبارات بعد النشر
├─ أخطاء جديدة في الإنتاج
├─ أداء سيء بعد التحديث
└─ مشاكل في الميزات الجديدة
```

### ⏱️ الإجراء (5 خطوات - 15 دقيقة)

```bash
# الخطوة 1: تأكيد الحاجة للتراجع
# التشاور مع قائد الفريق

# الخطوة 2: الحصول على آخر نسخة مستقرة
git log --oneline -10
LAST_STABLE=$(git describe --tags --abbrev=0 HEAD^)

# الخطوة 3: التراجع
git checkout $LAST_STABLE
# أو
kubectl rollout undo deployment/alawael-backend

# الخطوة 4: التحقق من النشر
kubectl rollout status deployment/alawael-backend
curl -s https://api.alawael.sa/health

# الخطوة 5: التوثيق
echo "Rollback to $LAST_STABLE at $(date)" >> /var/log/rollbacks.log
```

### 📢 الإشعارات
```
├─ إعلام الفريق على Slack
├─ تحديث حالة الحادث
└─ توثيق السبب في Post-mortem
```

---

## Runbook 7: Cache Issues (Redis)

### 🟠 الوصف
مشاكل في Redis Cache

### 📊 الأعراض
```
├─ Cache hit rate < 50%
├─ "Redis connection refused"
├─ بطء في الطلبات المتكررة
└─ جلسات المستخدمين تفشل
```

### ⏱️ التشخيص (5 خطوات - 5 دقائق)

```bash
# الخطوة 1: فحص حالة Redis
systemctl status redis
redis-cli ping

# الخطوة 2: فحص الذاكرة
redis-cli info memory | grep used_memory_human

# الخطوة 3: فحص الإحصائيات
redis-cli info stats

# الخطوة 4: فحص المفاتيح
redis-cli DBSIZE
redis-cli --scan --pattern "session:*" | head -20

# الخطوة 5: فحص الاتصالات
redis-cli client list | wc -l
```

### 🔧 الإصلاح (5 خطوات - 10 دقائق)

```bash
# الخطوة 1: إعادة تشغيل Redis
systemctl restart redis

# الخطوة 2: تنظيف المفاتيح المنتهية
redis-cli --scan --pattern "temp:*" | xargs redis-cli DEL

# الخطوة 3: تحسين الذاكرة
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# الخطوة 4: فحص التطبيق
pm2 restart alawael-backend

# الخطوة 5: مراقبة
redis-cli --latency
```

---

## Runbook 8: API Rate Limiting

### 🟡 الوصف
مشاكل في تحديد معدل الطلبات

### 📊 الأعراض
```
├─ كثير من 429 Too Many Requests
├─ المستخدمون المحترمون مُحجوبون
├─ API غير متاح لبعض العملاء
└─ تنبيهات rate limit
```

### ⏱️ التشخيص (5 خطوات - 5 دقائق)

```bash
# الخطوة 1: فحص سجلات Rate Limit
grep "429" /var/log/nginx/access.log | tail -50

# الخطوة 2: فحص الـ Redis للـ rate limits
redis-cli keys "rate-limit:*" | head -20

# الخطوة 3: تحديد المصادر المسيئة
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# الخطوة 4: فحص إعدادات Rate Limit
cat /etc/nginx/conf.d/rate-limit.conf

# الخطوة 5: فحص حالة النظام
nginx -t
systemctl status nginx
```

### 🔧 الإصلاح (5 خطوات - 10 دقائق)

```bash
# الخطوة 1: حظر IP المسيء (مؤقتاً)
iptables -A INPUT -s <bad-ip> -j DROP

# الخطوة 2: زيادة الحد مؤقتاً
# تعديل /etc/nginx/conf.d/rate-limit.conf
# rate=100r/s

# الخطوة 3: إعادة تحميل Nginx
nginx -s reload

# الخطوة 4: تنظيف rate limit counters
redis-cli --scan --pattern "rate-limit:*" | xargs redis-cli DEL

# الخطوة 5: مراقبة
tail -f /var/log/nginx/access.log | grep 429
```

---

## Runbook 9: Security Incident

### 🔴 الوصف
حادث أمني مشتبه به

### 📊 الأعراض
```
├─ محاولات تسجيل دخول فاشلة كثيرة
├─ طلبات مشبوهة في السجلات
├─ أنماط هجوم SQL Injection/XSS
├─ حركة مرور غير طبيعية
└─ تنبيهات WAF
```

### ⏱️ الاستجابة الفورية (5 خطوات - 5 دقائق)

```bash
# الخطوة 1: تقييم الخطورة
# هل هو هجوم حقيقي أم خطأ إيجابي؟

# الخطوة 2: حظر المصدر المشتبه به فوراً
iptables -A INPUT -s <suspicious-ip> -j DROP
fail2ban-client set nginx-req-limit banip <ip>

# الخطوة 3: حفظ الأدلة
cp /var/log/nginx/access.log /security/incident-$(date +%Y%m%d-%H%M%S).log
cp /var/log/alawael/*.log /security/incident-$(date +%Y%m%d-%H%M%S)/

# الخطوة 4: إعلام فريق الأمان
# استخدم قناة مشفرة

# الخطوة 5: توثيق الحادث
echo "$(date): Security incident detected from IP: <ip>" >> /security/incidents.log
```

### 🔒 إجراءات إضافية
```
├─ مراجعة جميع الحسابات
├─ تغيير كلمات المرور المشتبه بها
├─ تفعيل وضع القراءة فقط إذا لزم
└─ إعلام الإدارة القانونية
```

### 📞 جهات الاتصال للطوارئ الأمنية
```
Security Lead: +966-XXX-XXXX-XXX
CTO: +966-XXX-XXXX-XXX
CERT Team: cert@alawael.sa
```

---

## Runbook 10: Catastrophic Failure

### 🔴🔴 الوصف
فشل كارثي - النظام متوقف بالكامل

### 📊 الأعراض
```
├─ جميع الخوادم غير متاحة
├─ قاعدة البيانات غير متاحة
├─ لا يمكن الوصول لأي خدمة
└─ الإنتاج متوقف تماماً
```

### ⏱️ بروتوكول الطوارئ (10 خطوات - 30 دقيقة)

```bash
# الخطوة 1: تفعيل فريق الطوارئ
# الاتصال بجميع أعضاء الفريق

# الخطوة 2: تقييم الوضع
# ما الذي يعمل؟ ما الذي لا يعمل؟

# الخطوة 3: التبديل للـ DR Site (إذا متاح)
# تنفيذ خطة Disaster Recovery

# الخطوة 4: استعادة قاعدة البيانات من النسخة الاحتياطية
pg_restore -d alawael_db /backup/latest.dump

# الخطوة 5: إعادة تشغيل البنية التحتية
# اتباع ترتيب معين:
# 1. قاعدة البيانات
# 2. Redis
# 3. Backend
# 4. Frontend
# 5. Nginx

# الخطوة 6: التحقق من كل مكون
curl -s https://api.alawael.sa/health

# الخطوة 7: إعلام أصحاب المصلحة
# إرسال تحديثات كل 15 دقيقة

# الخطوة 8: مراقبة مكثفة
# مراقبة جميع الأنظمة

# الخطوة 9: توثيق كل خطوة
# لتقرير Post-mortem

# الخطوة 10: إعلام المستخدمين عند الاستعادة
# عبر جميع القنوات المتاحة
```

### 📞 قائمة الاتصال للطوارئ الكبرى
```
┌─────────────────────────────────────────────┐
│  EMERGENCY CONTACTS                         │
├─────────────────────────────────────────────┤
│  CTO: +966-XXX-XXXX-XXX                    │
│  VP Engineering: +966-XXX-XXXX-XXX         │
│  Database Admin: +966-XXX-XXXX-XXX         │
│  DevOps Lead: +966-XXX-XXXX-XXX            │
│  Security Lead: +966-XXX-XXXX-XXX          │
│  AWS Support: (معرف الحساب: XXXX)          │
└─────────────────────────────────────────────┘
```

### ✅ قائمة التحقق بعد الاستعادة
```
├─ [ ] جميع الخدمات تعمل
├─ [ ] Health checks تمر
├─ [ ] المستخدمون يستطيعون الدخول
├─ [ ] البيانات سليمة
├─ [ ] الأمان مُفعّل
├─ [ ] المراقبة تعمل
├─ [ ] تم إعلام جميع الأطراف
├─ [ ] تم جدولة Post-mortem
└─ [ ] تم تحديث الوثائق
```

---

## 📎 الملاحق

### ملحق أ: أوامر مفيدة

```bash
# فحص صحة النظام
curl -s https://api.alawael.sa/health | jq .

# فحص جميع الخدمات
systemctl status alawael-backend postgresql redis nginx

# عرض السجلات المباشرة
tail -f /var/log/alawael/combined.log

# إعادة تشغيل كل شيء
pm2 restart all && systemctl restart nginx

# فحص المنافذ المفتوحة
netstat -tlnp

# فحص استخدام القرص
df -h && du -sh /var/log/*
```

### ملحق ب: قوالب الرسائل

**رسالة تنبيه للفريق:**
```
🚨 INCIDENT ALERT 🚨

Type: [نوع الحادث]
Severity: [P1/P2/P3]
Started: [الوقت]
Impact: [التأثير]
Status: INVESTIGATING

Runbook: [رابط Runbook]
Incident Channel: #incident-[رقم]

@oncall Please acknowledge.
```

**رسالة تحديث:**
```
📊 INCIDENT UPDATE

Incident: [رقم/اسم]
Status: [INVESTIGATING/IDENTIFIED/MONITORING/RESOLVED]
Time: [الوقت]

Progress:
- [ما تم إنجازه]
- [الخطوات التالية]

Next Update: [الوقت]
```

### ملحق ج: أوقات الاستجابة المستهدفة

| الأولوية | الاستجابة | التحديث | الحل |
|----------|-----------|---------|------|
| P1 | 15 دقيقة | 15 دقيقة | 1 ساعة |
| P2 | 30 دقيقة | 30 دقيقة | 4 ساعات |
| P3 | 2 ساعة | 4 ساعات | 24 ساعة |
| P4 | 8 ساعات | 24 ساعة | 72 ساعة |

---

**تم إنشاء هذا المستند بواسطة فريق العمليات**  
**آخر مراجعة**: 26 فبراير 2026