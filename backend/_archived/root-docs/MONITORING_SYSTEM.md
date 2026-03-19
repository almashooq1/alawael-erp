# 📡 Monitoring & Alerting System

**آخر تحديث:** 1 فبراير 2026

---

## ✅ المكونات الرئيسية

1. **Real-time Monitoring**

- تحديثات لحظية عبر WebSocket و SSE
- بيانات لوحة التحكم: صحة النظام، الأداء، التنبيهات

2. **Alert System**

- قواعد تنبيه قابلة للتوسعة
- إشعارات بريدية / SMS (اختياري عبر ENV)
- سجل تنبيهات آخر 200

3. **Health Check Dashboard**

- صفحة HTML جاهزة لعرض الحالة الصحية

---

## 🚀 الروابط المهمة

- **لوحة الصحة (HTML):**
  - `GET /api/monitoring/health/dashboard`

- **الحالة الصحية (JSON):**
  - `GET /api/monitoring/health`

- **لوحة المراقبة:**
  - `GET /api/monitoring/dashboard`

- **البيانات اللحظية (SSE):**
  - `GET /api/monitoring/stream`

- **التنبيهات:**
  - `GET /api/monitoring/alerts`
  - `POST /api/monitoring/alerts/test`

---

## ⚙️ إعدادات التنبيهات (اختيارية)

```
ALERT_EMAILS=admin@example.com,ops@example.com
ALERT_SMS=+966500000000,+966511111111
```

---

## ✅ أمثلة سريعة

### 1) اختبار تنبيه

```bash
curl -X POST http://localhost:3001/api/monitoring/alerts/test \
  -H "Content-Type: application/json" \
  -d '{"message":"Test alert from monitoring","severity":"warning"}'
```

### 2) مشاهدة حالة النظام

```bash
curl http://localhost:3001/api/monitoring/health
```

### 3) فتح لوحة الصحة

```
http://localhost:3001/api/monitoring/health/dashboard
```

---

## ✅ ملاحظات

- التحديثات اللحظية تعمل كل 10 ثواني.
- قواعد التنبيه قابلة للتعديل في:
  - `backend/monitoring/alertSystem.js`
- التكامل مع Email/SMS يتطلب إعدادات بيئية صحيحة.
