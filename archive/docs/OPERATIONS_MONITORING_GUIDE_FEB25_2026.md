# 📊 دليل المراقبة والعمليات
## Operations & Monitoring Guide

**التاريخ:** 25 فبراير 2026
**الإصدار:** v1.1.0
**المسؤول:** Operations Team
**الفترة:** ما بعد النشر مباشرة

---

## 🎯 أهداف المراقبة الأساسية

### Key Performance Indicators (KPIs)
```
1. Application Availability
   🎯 Target: 99.9% uptime
   📊 Current: 100%
   🔔 Alert if: < 99%

2. Response Time (Average)
   🎯 Target: < 200ms
   📊 Current: ~150ms
   🔔 Alert if: > 500ms for 5 min

3. Error Rate
   🎯 Target: < 0.1%
   📊 Current: 0%
   🔔 Alert if: > 1% for 5 min

4. Successful Auth Rate
   🎯 Target: > 99%
   📊 Current: 100%
   🔔 Alert if: < 98%

5. API Throughput
   🎯 Target: > 500 req/sec
   📊 Current: Initial measurement
   🔔 Alert if: < 100 req/sec
```

---

## 📈 لوحة التحكم الرئيسية

### الروابط الأساسية
```
Monitoring Dashboard:
📍 http://monitoring-dashboard.company.com/alawael-backend

Log Aggregation:
📍 http://logs.company.com/alawael-backend

Performance Metrics:
📍 http://grafana.company.com/d/alawael-dash

Alert Management:
📍 http://alerts.company.com/rules

Health Status:
📍 http://prod-api.company.com/api/health
```

### مراجع سريعة
```bash
# فحص الحالة الحالية
curl -s http://prod-api/api/health | jq .

# عدد المستخدمين النشطين
curl -s http://prod-api/api/metrics/active-users | jq .

# معدل الأخطاء
curl -s http://prod-api/api/metrics/error-rate | jq .

# OAuth Success Rate
curl -s http://prod-api/api/metrics/oauth-success | jq .
```

---

## 🔔 قواعد التنبيهات (Alert Rules)

### تنبيهات حرجة (Critical) 🔴

#### 1. Application Down
```
Condition: API not responding (status 500/503)
Duration: > 2 minutes
Channels: Email + Slack + Call
Response: P1 - Immediate action
Actions:
  1. Check application logs
  2. Restart if needed
  3. Check database connectivity
  4. If still failing: Rollback
```

#### 2. Database Connection Loss
```
Condition: Database unavailable
Duration: > 1 minute
Channels: Email + Slack + Call
Response: P1 - Immediate action
Actions:
  1. Verify database status
  2. Check network connectivity
  3. Check credential validity
  4. Restart connection pool
```

#### 3. Critical Error Rate
```
Condition: Error rate > 5%
Duration: > 2 minutes
Channels: Email + Slack + Call
Response: P1 - Immediate action
Actions:
  1. Check error logs
  2. Identify error pattern
  3. Check recent deployments
  4. Rollback if recent change
```

#### 4. Memory Leak Detected
```
Condition: Memory usage > 90% and growing
Duration: > 5 minutes
Channels: Email + Slack + Call
Response: P1 - Immediate action
Actions:
  1. Monitor memory trend
  2. Identify memory consumer
  3. Check for loops/leaks
  4. Restart service if needed
```

### تنبيهات مهمة (High) 🟠

#### 1. High Latency
```
Condition: Response time > 1000ms (average)
Duration: > 5 minutes
Channels: Email + Slack
Response: P2 - Investigation within 30 min
Actions:
  1. Check database queries
  2. Check Redis performance
  3. Check CPU/Memory usage
  4. Optimize slow queries
```

#### 2. Elevated Error Rate
```
Condition: Error rate > 1%
Duration: > 10 minutes
Channels: Email + Slack
Response: P2 - Investigation within 1 hour
Actions:
  1. Analyze error patterns
  2. Check application logs
  3. Check dependencies
  4. Monitor error trending
```

#### 3. OAuth Failures Increasing
```
Condition: Failed OAuth exchanges > 5% of total
Duration: > 10 minutes
Channels: Email + Slack
Response: P2 - Investigation within 1 hour
Actions:
  1. Check OAuth service logs
  2. Verify secrets/credentials
  3. Check token refresh logic
  4. Monitor for attacks
```

#### 4. Authentication Rate Drop
```
Condition: Successful auth rate < 98%
Duration: > 15 minutes
Channels: Email + Slack
Response: P2 - Investigation within 1 hour
Actions:
  1. Check auth service logs
  2. Check session storage
  3. Check user database
  4. Verify OAuth provider
```

### تنبيهات معلوماتية (Info) 🟡

#### 1. Unusual Activity Detected
```
Condition: Multiple failed login attempts from same IP
Duration: 10+ attempts in 5 minutes
Channels: Email
Response: P3 - Monitoring only
Actions:
  1. Log IP for investigation
  2. Check if legitimate (office, VPN)
  3. Auto-block if policy allows
  4. Review audit log
```

#### 2. Cache Hit Rate Low
```
Condition: Redis cache hit rate < 80%
Duration: > 30 minutes
Channels: Email
Response: P3 - Review and optimize
Actions:
  1. Analyze cache queries
  2. Check cache configuration
  3. Verify data size
  4. Optimize cache keys
```

#### 3. Resource Utilization High
```
Condition: CPU > 70% or Memory > 80%
Duration: > 10 minutes
Channels: Email
Response: P3 - Monitor and plan scaling
Actions:
  1. Check for load spike
  2. Monitor trending
  3. Plan capacity scaling
  4. Optimize if trending up
```

---

## 📋 Daily/Weekly Monitoring Checklist

### يومياً (Daily) - كل صباح
```
Time: 9:00 AM
Duration: 15 minutes
Responsible: On-Call Engineer

☐ Check application status
  curl -s http://prod-api/api/health
  
☐ Review error logs (past 24h)
  grep ERROR /logs/alawael-backend.log | tail -20
  
☐ Check database connections
  mongo --eval "db.adminCommand('ping')"
  
☐ Verify Redis is accessible
  redis-cli ping
  
☐ Check active user count
  curl -s http://prod-api/api/metrics/active-users
  
☐ Review authentication metrics
  Success Rate: ____%
  Error Rate: ____%
  
☐ Check for pending alerts
  (Open monitoring dashboard)
  
☐ Log findings in daily report
```

### أسبوعياً (Weekly) - كل الاثنين
```
Time: 10:00 AM
Duration: 1 hour
Responsible: Operations Manager

☐ Weekly Performance Review
  - Document performance metrics
  - Identify trends
  - Note any anomalies
  
☐ Security Audit
  - Review failed login attempts
  - Check for suspicious activity
  - Verify IP whitelist
  - Review audit logs
  
☐ Database Health Check
  - Run ANALYZE commands
  - Check index performance
  - Review slow query logs
  
☐ Backup Verification
  - Verify backup completed
  - Test restore procedure
  - Document status
  
☐ Capacity Planning
  - Analyze growth trends
  - Project future needs
  - Plan scaling if needed
  
☐ Team Standup
  - Share findings with team
  - Discuss improvements
  - Plan for next week
  
☐ Documentation Update
  - Update monitoring guide
  - Document configurations
  - Update playbooks
```

### شهرياً (Monthly) - أول يوم الشهر
```
Time: 9:00 AM
Duration: 2-3 hours
Responsible: DevOps Lead

☐ Comprehensive System Review
  - Performance trends (30 days)
  - Security audit
  - Capacity utilization
  - Cost analysis
  
☐ Disaster Recovery Test
  - Test backup/restore
  - Verify RTO/RPO
  - Document results
  
☐ Dependency Updates Review
  - Check for security patches
  - Plan updates
  - Test in staging
  
☐ Architecture Review
  - Identify bottlenecks
  - Plan improvements
  - Update documentation
  
☐ Team Training
  - Review procedures
  - Update playbooks
  - Train new team members
  
☐ Executive Report
  - System uptime
  - Performance metrics
  - Security incidents
  - Planned improvements
```

---

## 🚨 سيناريوهات استجابة الطوارئ

### Scenario 1: API مقف (Down)

#### الأعراض:
```
❌ curl http://prod-api/health → Connection refused
❌ Monitoring dashboard → Red status
❌ Multiple 500 errors in logs
❌ Users reporting "Cannot connect"
```

#### خطوات الاستجابة السريعة:
```bash
# 1. تأكد من المشكلة
curl http://prod-api/api/health
# Expected: Should fail

# 2. تحقق من حالة العملية
pm2 list
# يجب أن يظهر alawael-backend كـ errored

# 3. تحقق من السجلات
tail -50 /logs/alawael-backend.log

# 4. حاول إعادة التشغيل
pm2 restart alawael-backend

# 5. تحقق من حالة جديدة بعد 10 ثوان
curl http://prod-api/api/health
```

#### إذا لم ينجح الإصلاح:
```bash
# 1. فحص أسرع للمشاكل
pm2 logs alawael-backend --lines 100

# 2. تحقق من الأساسيات
# - Database: mongo --eval "db.adminCommand('ping')"
# - Redis: redis-cli ping
# - Network: ping 8.8.8.8

# 3. إذا كانت المشكلة بسبب deployment حديث
git log --oneline -n 5
git reset --hard HEAD~1  # Rollback

# 4. أعد التشغيل
pm2 start app.js

# 5. فعّل البديل إن وجد
# استخدم الخادم الثاني أو السابق
```

#### التحقق من النجاح:
```bash
# يجب أن ترى:
✅ Status: Running
✅ Health check returns 200 OK
✅ DB connection: OK
✅ Redis connection: OK
✅ No errors in logs
```

---

### Scenario 2: خطأ عالي في قاعدة البيانات

#### الأعراض:
```
⚠️ "MongoError: connection timeout"
⚠️ Slow query responses
⚠️ Connection pool exhausted
⚠️ Users see timeouts
```

#### خطوات الاستجابة:
```bash
# 1. فحص اتصال MongoDB
mongo --host prod-mongo --eval "db.adminCommand('ping')"

# 2. تحقق من أسباب البطء
mongo --eval "
  db.currentOp(true)
  // يوضح العمليات الحالية
"

# 3. تحقق من الفهارس
mongo --eval "
  db.users.getIndexes()
  db.sessions.getIndexes()
"

# 4. منع العمليات الطويلة
mongo --eval "
  db.killOp(opId)
"

# 5. أعد تشغيل تجمع الاتصالات
# (هذا قد يتطلب restart مختصر)
pm2 restart alawael-backend

# 6. قم بتحسين الاستعلامات
# حدد الاستعلام البطيء واحذفه
```

---

### Scenario 3: استهلاك الذاكرة مرتفع

#### الأعراض:
```
⚠️ Memory: 85% - 95%
⚠️ Memory growing steadily
⚠️ Process slowdown
⚠️ OOM killer warnings in logs
```

#### خطوات الاستجابة:
```bash
# 1. تحقق من استخدام الذاكرة
pm2 monit
# Watch memory % with arrow keys

# 2. حدد العملية المسبة
pm2 monit --pid <pid>

# 3. تحقق من الـ heap dump
node --expose-gc
# في الإنتاج: استخدم أداة تحليل خارجية

# 4. افحص للحلقات اللانهائية
grep -n "while\|for" alawael-backend/services/*.js

# 5. تحقق من سرب الاستدعاءات
# في السجلات: ابحث عن عمليات متكررة

# 6. إذا كانت مشكلة معروفة
# طبق الإصلاح من التحديثات

# 7. إذا كان حاد جداً
pm2 restart alawael-backend
# هذا سيعيد تعيين الذاكرة
```

#### المراقبة:
```bash
# تابع الذاكرة بعد الإصلاح
watch -n 5 'pm2 list | grep alawael'

# تحقق من الاتجاه
# يجب أن تستقر الذاكرة تدريجياً
```

---

### Scenario 4: معدل الخطأ المرتفع

#### الأعراض:
```
⚠️ Error rate spike from 0% to 5%+
⚠️ Multiple error types in logs
⚠️ Users reporting failures
⚠️ Monitoring alerts firing
```

#### خطوات التحليل:
```bash
# 1. اجمع أنماط الأخطاء
grep ERROR /logs/alawael-backend.log | grep -o "Error: [^\\n]*" | sort | uniq -c | sort -rn

# 2. حدد توقيت البدء
grep ERROR /logs/alawael-backend.log | head -n 1
# لاحظ الطابع الزمني

# 3. تحقق من التغييرات الأخيرة
git log --since="2 hours ago" --oneline

# 4. أنماط شائعة:
# - "jwt malformed" → مشكلة secret
# - "connection refused" → مشكلة external service
# - "validation failed" → مشكلة بيانات kernel تعطل
# - "timeout" → performance issue

# 5. بناءً على النمط:
case $error_pattern in
  "jwt")
    # تحقق من JWT_SECRET
    echo "JWT_SECRET is: ${JWT_SECRET:0:10}..."
    ;;
  "connection")
    # تحقق من الخدمات الخارجية
    curl -s http://external-service/health
    ;;
  "validation")
    # افحص البيانات الجديدة
    db.users.count()
    ;;
  *)
    # تحليل عام
    grep -A5 "ERROR" /logs/alawael-backend.log | head -30
    ;;
esac
```

#### الإصلاح:
```bash
# إذا كان deployment حديث جداً
git log --oneline -1
git revert <commit-hash>
pm2 restart alawael-backend

# إذا كان خدمة خارجية
# اتصل بفريق تلك الخدمة

# إذا كانت قاعدة البيانات
# راجع Scenario 2 (DB Issues)

# إذا كان لا نعرف
# استخدم bisect للعثور على السبب
git bisect start
```

---

## 📊 التقارير الأداء

### Daily Performance Report Template
```markdown
# Daily Performance Report
Date: [DATE]
Report Period: 00:00 - 23:59

## System Availability
- Uptime: 100%
- Downtime: 0 min
- Incidents: 0

## Performance Metrics
- Avg Response Time: XX ms
- P95 Response Time: XX ms
- P99 Response Time: XX ms
- Throughput: XX req/sec

## Error Analysis
- Total Errors: X
- Error Rate: 0.X%
- Most Common Errors:
  1. Error type A: X times
  2. Error type B: X times
  3. Error type C: X times

## Resource Utilization
- CPU Peak: XX%
- Memory Peak: XX%
- DB Connections: XX/Max
- Cache Hit Rate: XX%

## Authentication Metrics
- Total Auth Attempts: XXXX
- Successful: XX.X%
- Failed: X.X%
- OAuth Flow Success: XX%

## Security Events
- Failed Logins (Locked): X
- Suspicious Activities: X
- IP Blocks: X
- Audit Events: XXXX

## Alerts Triggered
- Critical: 0
- High: 0
- Medium: X
- Low: X

## Action Items
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

## Sign-Off
Reviewed by: _________________
Date: _________________
```

---

## 🔧 الأدوات المستخدمة

### أدوات المراقبة المثبتة
```
1. PM2 Plus
   - Application monitoring
   - Memory/CPU tracking
   - Restart automation

2. Grafana
   - Metrics visualization
   - Custom dashboards
   - Alert conditions

3. ELK Stack (Elasticsearch, Logstash, Kibana)
   - Log aggregation
   - Log search
   - Log analysis

4. DataDog (Optional)
   - Advanced monitoring
   - APM tracing
   - Infrastructure monitoring

5. Sentry (Error Tracking)
   - Error notifications
   - Error grouping
   - Stack trace analysis
```

### أوامر مفيدة
```bash
# PM2 Commands
pm2 list                    # قائمة العمليات
pm2 logs                    # عرض السجلات الحالية
pm2 logs --lines 100       # آخر 100 سطر
pm2 monit                   # مراقبة فعلية
pm2 restart all             # إعادة تشغيل جميع التطبيقات
pm2 delete alawael-backend  # حذف التطبيق

# Log Commands
tail -f /logs/alawael-backend.log    # سجل فعلي
grep ERROR /logs/*.log               # جميع الأخطاء
grep -c "ERROR" /logs/*.log          # عد الأخطاء
tail -100 /logs/alawael-backend.log | grep "2026-02-25"

# Database Commands
mongo --eval "db.serverStatus()"                    # حالة الخادم
mongo --eval "db.currentOp()"                       # العمليات الحالية
mongo --eval "db.stats()"                           # إحصائيات قاعدة البيانات
mongo --host backup-server --eval "db.adminCommand('ping')"

# Redis Commands
redis-cli ping                     # اختبر الاتصال
redis-cli info                     # معلومات
redis-cli dbsize                   # عدد المفاتيح
redis-cli SLOWLOG GET 5           # الأوامر البطيئة
redis-cli CONFIG GET maxmemory     # الحد الأقصى للذاكرة

# API Health Checks
curl -s http://prod-api/api/health | jq .
curl -s http://prod-api/api/metrics/uptime
curl -s http://prod-api/api/metrics/requests
curl -s http://prod-api/api/metrics/errors
```

---

## 📞 جهات الاتصال الطارئة

### نموذج الاتصال
| الدور | الاسم | الهاتف | البديل | البديل 2 |
|------|-------|--------|--------|---------|
| On-Call Lead | Ahmed | +966-50-... | Sara | Hassan |
| Database Admin | Karim | +966-50-... | Leila | - |
| Infrastructure | Ibrahim | +966-50-... | Noor | - |
| Security Lead | Fatima | +966-50-... | Maria | - |
| QA Lead | Omar | +966-50-... | Zina | - |

### مرجع السلسلة (Escalation Chain)
```
L1: On-Call Engineer (يحاول حل مباشر)
    └─ ربما ينجح إصلاح بسيط

L2: Senior Engineer (إذا استمرت المشكلة 10 دقائق)
    └─ تحليل أعمق وخبرة أكثر

L3: Lead/Manager (إذا استمرت 30 دقيقة)
    └─ قرار بالنسبة للإجراءات الكبيرة

L4: Executive (إذا استمرت ساعة واحدة)
    └─ إشعار الإدارة العليا
```

---

## ✅ قائمة التحقق النهائية

```
يومي:
☐ فحص حالة النظام صباحاً
☐ مراجعة السجلات للأخطاء
☐ توثيق أي حادثة
☐ تحديث فريقك بالحالة

أسبوعياً:
☐ تقرير الأداء إلى الإدارة
☐ اختبار المراقبة
☐ تحديث playbooks
☐ مراجعة السعة

شهرياً:
☐ اختبار كامل الكوارث
☐ مراجعة الأمان
☐ تحديثات التكاليف
☐ اجتماع المراجعة الشاملة
```

---

**المراقبة المستمرة ضرورية لضمان الاستقرار! 🛡️**

**آخر تحديث:** 25 فبراير 2026
**الحالة الأخيرة:** ✅ سيارة ملائمة
**فريق العمليات:** متأهب وجاهز
