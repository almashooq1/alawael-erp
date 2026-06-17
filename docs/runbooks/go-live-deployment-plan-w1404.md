# 🚀 خطة النشر الفعلي — Al-Awael ERP Deployment Plan

## Wave 1404: Staging Setup + Monitoring + Rollback

> **الحالة**: جاهز للتنفيذ المرحلي
> **التاريخ**: 2026-06-17
> **الهدف**: نقل البيئة من تطوير (Development) إلى إنتاج (Production) بأمان كامل

---

## 📋 التحضيرات الأساسية

### 1️⃣ إعداد Staging Environment (Pre-Production)

```bash
# على VPS Staging (مثل production لكن منفصل تماماً)

# 1. استنساخ الريبو
git clone https://github.com/almashooq1/alawael-erp.git /home/alawael/staging
cd /home/alawael/staging

# 2. إعداد .env للـ Staging (مع credentials حقيقية لـ test)
cp backend/.env.example backend/.env
# تعديل القيم:
#   NODE_ENV=staging
#   MONGODB_URI=mongodb+srv://staging-user:pass@cluster.mongodb.net/alawael-staging
#   JWT_SECRET=<generate new: openssl rand -base64 64>
#   REDIS_PASSWORD=<strong password>
#   NPHIES_MODE=mock  # keep mock for now
#   ENABLE_AUTO_BACKUP=true
#   DB_BACKUP_KEEP_DAYS=7  # shorter retention for staging

# 3. تشغيل Docker Compose (Staging Profile)
docker compose \
  -f docker-compose.professional.yml \
  -f docker-compose.production.yml \
  up -d

# 4. التحقق من الصحة
curl -s http://localhost:3001/api/test
# Expected: 200 OK
```

**✓ Verification Checklist:**

- [ ] MongoDB initialized (check `db.version()` in mongo shell)
- [ ] Redis connected (check `PING` response)
- [ ] Backend API running on port 3001
- [ ] All 9 providers in mock mode (`preflight` shows no errors)
- [ ] Service health verified (`check-services` reports all UP)
- [ ] DNS records point to staging IP (e.g., `staging.alawael.example`)

---

## 🔒 الأمان والمراقبة

### 2️⃣ تفعيل المراقبة والتنبيهات (Prometheus + Grafana + Alerting)

#### 2A. إنشاء Prometheus Configuration

```bash
# ops/prometheus.yml
cat > ops/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    environment: 'staging'
    service: 'alawael-erp'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'ops/alerting-rules.yml'

scrape_configs:
  - job_name: 'alawael-backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:6379']
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: localhost:9121

  - job_name: 'mongodb'
    static_configs:
      - targets: ['localhost:27017']
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: localhost:9216

  - job_name: 'docker'
    static_configs:
      - targets: ['unix:///var/run/docker.sock']
EOF
```

#### 2B. إنشاء Alerting Rules

```bash
# ops/alerting-rules.yml
cat > ops/alerting-rules.yml << 'EOF'
groups:
  - name: alawael.rules
    interval: 30s
    rules:
      # API Latency
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
        for: 5m
        annotations:
          summary: "High API latency detected"
          action: "Check backend logs for slow queries"

      # API Errors
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        annotations:
          summary: "High error rate (>1%)"
          action: "Check application logs immediately"

      # Database
      - alert: MongoDBDown
        expr: mongodb_up == 0
        for: 1m
        annotations:
          summary: "MongoDB connection lost"
          action: "Restart MongoDB or check network"

      # Redis
      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        annotations:
          summary: "Redis connection lost"
          action: "Restart Redis or check credentials"

      # Memory
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1e9 > 0.9
        for: 5m
        annotations:
          summary: "Process memory >900MB"
          action: "Check for memory leaks; consider scaling"

      # Disk
      - alert: LowDiskSpace
        expr: node_filesystem_avail_bytes{mountpoint="/"} / 1e9 < 10
        for: 5m
        annotations:
          summary: "Disk space <10GB"
          action: "Cleanup old logs/backups"
EOF
```

#### 2C. Docker Compose Extension for Monitoring

```bash
# Add to docker-compose.production.yml:
cat >> docker-compose.production.yml << 'EOF'

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./ops/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./ops/alerting-rules.yml:/etc/prometheus/alerting-rules.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    restart: always

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./ops/alertmanager.yml:/etc/alertmanager/config.yml:ro
    command:
      - '--config.file=/etc/alertmanager/config.yml'
    restart: always

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3010:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
      - GF_INSTALL_PLUGINS=redis-datasource,mongodb-datasource
    volumes:
      - grafana-data:/var/lib/grafana
      - ./ops/grafana/provisioning:/etc/grafana/provisioning:ro
    restart: always

  redis-exporter:
    image: oliver006/redis_exporter:latest
    ports:
      - "9121:9121"
    command:
      - --redis.addr=redis:6379
      - --redis.password=${REDIS_PASSWORD}
    restart: always

volumes:
  prometheus-data:
  grafana-data:
EOF
```

**✓ Verification Checklist:**

- [ ] Prometheus dashboard accessible at http://staging:9090
- [ ] Grafana dashboard accessible at http://staging:3010
- [ ] Alert rules loaded (check Prometheus "Alerts" tab)
- [ ] Sample metrics visible (CPU, memory, latency)

---

## 💾 النسخ الاحتياطية وخطة الاسترجاع

### 3️⃣ إعداد نظام Backup والـ Disaster Recovery

```bash
# على VPS Staging:

# 1. توليد مفتاح التشفير
node backend/scripts/backup-keygen.js > /home/alawael/.backup-key
chmod 600 /home/alawael/.backup-key

# 2. إعداد .env للـ Backup
cat >> backend/.env << EOF
BACKUP_ENCRYPTION_KEY=$(cat /home/alawael/.backup-key)
ENABLE_AUTO_BACKUP=true
DB_BACKUP_KEEP_DAYS=30
DB_BACKUP_DIR=/home/alawael/backups
EOF

# 3. إنشاء مجلد الـ Backups
mkdir -p /home/alawael/backups
chmod 700 /home/alawael/backups

# 4. تشغيل أول Backup
node backend/scripts/db-backup.js backup

# 5. التحقق من صحة الـ Backup
node backend/scripts/dr-verify.js
# Expected: "✅ All checks passed!"
```

#### 3A. Cron Job للـ Backup التلقائي (Nightly)

```bash
# على VPS:
crontab -e

# أضف السطر التالي:
0 2 * * * cd /home/alawael/staging && \
  node backend/scripts/db-backup.js backup && \
  node backend/scripts/db-backup.js cleanup --keep 30 && \
  echo "Backup completed at $(date)" >> /var/log/alawael-backup.log

# تحقق من الـ cron job
crontab -l | grep db-backup
```

#### 3B. Restore Procedure (في حالة الطوارئ)

```bash
# 1. قائمة الـ Backups المتاحة
node backend/scripts/db-backup.js list

# 2. استرجاع من Backup محدد
node backend/scripts/db-backup.js restore --file backup_2026-06-17_02-30.gz

# 3. التحقق من الاسترجاع
mongo alawael-erp --eval "db.users.countDocuments()"
```

**✓ Verification Checklist:**

- [ ] `dr-verify.js` exits 0 (full restore test passed)
- [ ] Backup files exist in `/home/alawael/backups`
- [ ] Cron job runs nightly (check `/var/log/alawael-backup.log`)
- [ ] Test restore on staging succeeds
- [ ] Restore time is <5 minutes (acceptable RTO)

---

## ⚙️ تشغيل الـ Sweepers والـ Cron Jobs

### 4️⃣ تفعيل الـ Automated Tasks

```bash
# في backend/app.js، تأكد من:

# 1. جميع sweepers مفعّلة
ENABLE_AUTO_BACKUP=true
ENABLE_NPHIES_RECONCILIATION=true
ENABLE_ZATCA_SLA_ENFORCEMENT=true
ENABLE_CARE_PLAN_PLATEAU_DETECTION=true
ENABLE_HR_ANOMALY_SWEEPER=true
ENABLE_RESPITE_NOSHOW_SWEEPER=true

# 2. تشغيل backend مع sweepers
npm run dev
# أو للإنتاج:
NODE_ENV=staging npm start

# 3. التحقق من أن الـ Sweepers بدأت
# في السجلات (logs)، يجب أن ترى:
#   ✓ Auto-backup scheduler initialized
#   ✓ NPHIES reconciliation started
#   ✓ Care-plan plateau detector wired
```

**قائمة الـ Sweepers الرئيسية:**

| Sweeper               | Interval      | Purpose                        | Env Flag                                  |
| --------------------- | ------------- | ------------------------------ | ----------------------------------------- |
| Auto-Backup           | Daily 2:00 AM | Database backup                | `ENABLE_AUTO_BACKUP=true`                 |
| NPHIES Reconciliation | Every 4h      | Insurance claim reconciliation | `ENABLE_NPHIES_RECONCILIATION=true`       |
| ZATCA SLA             | Every 30m     | E-invoice compliance check     | `ENABLE_ZATCA_SLA_ENFORCEMENT=true`       |
| Care-Plan Plateau     | Daily 6:00 AM | Detect stalled plans           | `ENABLE_CARE_PLAN_PLATEAU_DETECTION=true` |
| HR Anomaly            | Daily 3:00 AM | Detect attendance anomalies    | `ENABLE_HR_ANOMALY_SWEEPER=true`          |
| Respite No-Show       | Daily 1:00 AM | Mark no-show bookings          | `ENABLE_RESPITE_NOSHOW_SWEEPER=true`      |

**✓ Verification Checklist:**

- [ ] All sweepers initialized (check startup logs)
- [ ] No errors in `/var/log/alawael-errors.log`
- [ ] Database operations logged correctly
- [ ] Cron jobs running at expected intervals

---

## 🧪 اختبارات الحمل على Staging

### 5️⃣ تشغيل أدوات Load Testing

```bash
# على staging environment:

# 1. Smoke Test (baseline sanity check)
TOKEN=$(curl -s -X POST http://staging:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alawael.com","password":"..."}' \
  | jq -r '.token')

npm run test:load:smoke

# Expected output:
#   Smoke test completed successfully
#   ✓ 10 VUs completed 300 requests in 30s
#   ✓ No errors

# 2. Baseline Load Test (5-stage ramp)
TOKEN=$TOKEN npm run test:load

# Expected SLO thresholds:
#   ✓ health_latency p95 < 200ms
#   ✓ readiness_latency p95 < 800ms
#   ✓ http_req_failed < 1%

# 3. Gov Integration Stress Test (NPHIES + GOSI mock)
TOKEN=$TOKEN npm run test:load:gov

# Expected SLO thresholds:
#   ✓ nphies_read_latency p95 < 1200ms
#   ✓ gosi_read_latency p95 < 1500ms
#   ✓ gov_read_failed < 2%

# All tests should complete WITHOUT errors
```

**✓ Verification Checklist:**

- [ ] Smoke test passes (no timeouts)
- [ ] Baseline load test meets SLOs
- [ ] Gov integration test meets SLOs
- [ ] No database errors during load
- [ ] Memory usage stable (no leaks)
- [ ] Connection pool not exhausted

---

## 🔄 خطة الـ Rollback والـ Failover

### 6️⃣ Rollback Procedure (في حالة الفشل)

**السيناريو 1: أخطاء بعد النشر (الـ First 1 Hour)**

```bash
# إذا حدثت مشاكل خلال الساعة الأولى:

# 1. فوري: وقف الحركة (قلل ترافيك عبر load balancer)
# في النظام: جزّئ الحركة 95% → old، 5% → new

# 2. استرجع من الـ Backup الأخير
cd /home/alawael/staging
node backend/scripts/db-backup.js list
node backend/scripts/db-backup.js restore --file backup_last_good.gz

# 3. أعد تشغيل Backend
docker compose restart backend

# 4. تحقق من الصحة
curl -s http://staging:3001/api/test
npm run test:load:smoke
```

**السيناريو 2: مشاكل قاعدة البيانات (Data Corruption)**

```bash
# إذا اكتشفت data corruption:

# 1. أوقف البيئة الحالية فوراً
docker compose down

# 2. استرجع من backup الأقدم السليم
node backend/scripts/db-backup.js list
node backend/scripts/db-backup.js restore --file backup_2026-06-16.gz

# 3. تحقق من integrity
mongo alawael-erp --eval "db.adminCommand('dbStats')"

# 4. أعد التشغيل
docker compose -f docker-compose.professional.yml up -d
```

**السيناريو 3: Performance Degradation**

```bash
# إذا كان الأداء بطيئاً جداً:

# 1. تحقق من Database Indexes
mongo alawael-erp --eval "db.collection_name.getIndexes()"

# 2. تشغيل optimization
npm run optimize:indexes

# 3. تحقق من Redis Cache
redis-cli INFO stats

# 4. إعادة تحميل الـ Caches
redis-cli FLUSHDB  # ⚠️ استخدم بحذر!
npm run db:seed:cache
```

**Rollback Checklist:**

- [ ] تحديد السبب الجذري للمشكلة
- [ ] استرجاع من backup معروف أنه سليم
- [ ] تشغيل smoke tests بعد الاسترجاع
- [ ] التحقق من بيانات المستخدمين الحرجة
- [ ] إشعار الفريق بتفاصيل incident

---

## 📊 مراقبة ما بعد النشر (Post-Deployment)

### 7️⃣ First 24 Hours Checklist

| Time             | Task                  | Success Criteria             |
| ---------------- | --------------------- | ---------------------------- |
| H+0 (Deployment) | Deploy to staging     | All smoke tests pass         |
| H+5m             | Health checks         | API responding, DB connected |
| H+15m            | Load test (smoke)     | 10 VUs, no errors            |
| H+30m            | Baseline load test    | SLOs met (p95 latency OK)    |
| H+1h             | Gov integration test  | Mock providers responding    |
| H+2h             | Check logs for errors | No 5xx errors                |
| H+4h             | Monitor sweepers      | Auto-backup executed         |
| H+8h             | Check backup validity | DR verify passes             |
| H+24h            | Full health audit     | All systems nominal          |

**Daily Monitoring Dashboard:**

```
[Grafana] Open: http://staging:3010
- API Latency (p95, p99)
- Error Rate (4xx, 5xx)
- Database Connection Pool Usage
- Memory Usage
- Redis Hit Rate
- Cron Job Execution Status
```

---

## 🎯 الانتقال من Staging إلى Production

### 8️⃣ Production Deployment (بعد 1 أسبوع من Staging)

**متطلبات أولية:**

- [ ] Staging مستقر لـ 7 أيام بدون أخطاء
- [ ] جميع sweepers تعمل بنجاح
- [ ] Backups تُنسخ بشكل دوري
- [ ] Alerting يعمل بشكل صحيح
- [ ] اختبارات الحمل تمرّ SLOs

**خطوات Production:**

```bash
# 1. نسخ الـ Configuration من Staging
scp alawael-staging:/home/alawael/staging/backend/.env \
    alawael-prod:/home/alawael/production/backend/.env

# 2. تعديل قيم Production-specific
# NODE_ENV=production
# MONGODB_URI=<production db>
# NPHIES_MODE=live (بعد CCHI onboarding)
# ENABLE_AUTO_BACKUP=true

# 3. تشغيل Production
cd /home/alawael/production
docker compose \
  -f docker-compose.professional.yml \
  -f docker-compose.production.yml \
  up -d

# 4. التحقق
npm run preflight
npm run test:load:smoke
```

---

## 📝 الملاحظات والدروس المستفادة

### ماذا يجب تذكره:

1. **Backups are Sacred**

   - اختبر الـ restore قبل الاعتماد عليه
   - احتفظ بـ encryption key في مكان آمن
   - لا تحذف backups القديمة دون سبب

2. **Monitoring is Early Warning**

   - راقب الـ CPU/Memory في الساعات الأولى
   - راقب الـ Database queries للبطء
   - راقب الـ Alert logs بنشاط

3. **Sweepers Need Care**

   - تحقق من أن جميع sweepers تعمل
   - لا تعطّل sweeper دون سبب
   - وثّق أي تعديلات على schedules

4. **Load Testing is Non-Negotiable**
   - اختبر على Staging قبل Production
   - اختبر مع real data (أو ما يقاربها)
   - سجّل SLOs الخاصة بك وراقبها

---

## 🆘 Emergency Contacts & Procedures

**في حالة الطوارئ (Production Down):**

1. **فوري (First 5 minutes):**

   - جزّئ الحركة away from production
   - فتّش الـ error logs: `tail -f /var/log/alawael-errors.log`
   - تحقق من MongoDB و Redis: `redis-cli PING`

2. **بعد 5 دقائق:**

   - استرجع من آخر backup سليم
   - أعد تشغيل Backend
   - اختبر smoke tests

3. **Post-Incident:**
   - اكتب incident report
   - حدّد السبب الجذري
   - ضع خطة لتجنب تكرار الحادثة

---

## ✅ النهاية: علامات النجاح

**تعتبر البيئة مستعدة للإنتاج عندما:**

- ✅ جميع 10 Gaps مُغلقة
- ✅ Staging مستقرة لـ 7 أيام بلا أخطاء
- ✅ جميع sweepers تعمل بنجاح
- ✅ Backups تُختبر يومياً وتنجح
- ✅ اختبارات الحمل تمرّ SLOs
- ✅ Monitoring and Alerting مفعّلة
- ✅ فريق on-call جاهز 24/7
- ✅ Rollback procedure توثّق وجربة

**التاريخ المتوقع للنشر الفعلي:**

```
2026-06-24 (1 أسبوع من الآن)
بعد 7 أيام استقرار على Staging
```

---

**Wave W1404 — تم الإكمال بنجاح ✅**
