# 🚀 Integration API - Quick Start Guide

## ⚡ البدء السريع

API الموصلات الثلاث متاح على:

```
BASE_URL: http://localhost:3001/api/integrations
```

---

## 🏥 1️⃣ اختبار الصحة

### فحص صحة جميع الموصلات

```bash
curl -X GET http://localhost:3001/api/integrations/health
```

**الرد:**

```json
{
  "success": true,
  "timestamp": "2026-01-23T12:00:00Z",
  "health": {
    "government": { "healthy": true, "status": 200 },
    "insurance": { "healthy": true, "status": 200 },
    "laboratory": { "healthy": true, "status": 200 },
    "overallStatus": "healthy"
  }
}
```

### الحصول على الإحصائيات

```bash
curl -X GET http://localhost:3001/api/integrations/metrics
```

---

## 🏛️ 2️⃣ موصل الحكومة

### التحقق من هوية المواطن

```bash
curl -X POST http://localhost:3001/api/integrations/government/verify-citizen \
  -H "Content-Type: application/json" \
  -d '{
    "nationalId": "1234567890",
    "fullName": "محمد علي محمد",
    "dateOfBirth": "1990-01-15"
  }'
```

### طلب موافقة على الوصول

```bash
curl -X POST http://localhost:3001/api/integrations/government/request-consent \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "2199123456",
    "consentType": "health-data",
    "scope": ["medical", "financial"]
  }'
```

### الحصول على السجلات الصحية

```bash
curl -X GET "http://localhost:3001/api/integrations/government/health-records/1234567890?consentToken=TOKEN_HERE"
```

### الإبلاغ عن حادثة

```bash
curl -X POST http://localhost:3001/api/integrations/government/report-incident \
  -H "Content-Type: application/json" \
  -d '{
    "incidentType": "medical-incident",
    "description": "وصف الحادثة هنا",
    "severity": "high"
  }'
```

---

## 🛡️ 3️⃣ موصل التأمين

### التحقق من الأهلية

```bash
curl -X POST http://localhost:3001/api/integrations/insurance/verify-eligibility \
  -H "Content-Type: application/json" \
  -d '{
    "policyNumber": "POL-2026-001",
    "patientId": "PAT-123",
    "serviceType": "rehabilitation"
  }'
```

### إرسال ادعاء

```bash
curl -X POST http://localhost:3001/api/integrations/insurance/submit-claim \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PAT-123",
    "policyNumber": "POL-2026-001",
    "serviceDetails": {
      "type": "service",
      "code": "PT001",
      "description": "Physiotherapy Session",
      "date": "2026-01-23",
      "provider": "AlAwael Center",
      "grossAmount": 500,
      "copayAmount": 50,
      "documents": []
    }
  }'
```

### تتبع الادعاء

```bash
curl -X GET http://localhost:3001/api/integrations/insurance/claim/CLM-2026-001
```

### التحقق من الشريك

```bash
curl -X POST http://localhost:3001/api/integrations/insurance/verify-provider \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "PROV-001",
    "insurerId": "INS-001"
  }'
```

### تسجيل Webhook

```bash
curl -X POST http://localhost:3001/api/integrations/insurance/register-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "events": ["claim.approved", "claim.rejected", "claim.pending"]
  }'
```

---

## 🧪 4️⃣ موصل المختبرات

### إرسال أمر فحص

```bash
curl -X POST http://localhost:3001/api/integrations/lab/submit-order \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-2026-001",
    "patientId": "PAT-123",
    "tests": [
      {
        "code": "03020",
        "name": "Complete Blood Count",
        "specimen": "serum"
      },
      {
        "code": "04018",
        "name": "Glucose Fasting",
        "specimen": "plasma"
      }
    ],
    "priority": "normal"
  }'
```

### الحصول على النتائج (JSON)

```bash
curl -X GET "http://localhost:3001/api/integrations/lab/results/ORD-2026-001?format=json"
```

### الحصول على النتائج (HL7 v2.5)

```bash
curl -X GET "http://localhost:3001/api/integrations/lab/results/ORD-2026-001?format=hl7"
```

### الحصول على النتائج (FHIR R4)

```bash
curl -X GET "http://localhost:3001/api/integrations/lab/results/ORD-2026-001?format=fhir"
```

### تتبع الطلب

```bash
curl -X GET http://localhost:3001/api/integrations/lab/order/ORD-2026-001
```

### إلغاء طلب

```bash
curl -X POST http://localhost:3001/api/integrations/lab/cancel-order \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-2026-001",
    "reason": "Patient request"
  }'
```

### تشغيل المطابقة اليدوية

```bash
curl -X POST http://localhost:3001/api/integrations/lab/reconcile
```

---

## ⚙️ 5️⃣ إدارة المهام الخلفية

### بدء المهام

```bash
curl -X POST http://localhost:3001/api/integrations/start-background-tasks
```

### إيقاف المهام

```bash
curl -X POST http://localhost:3001/api/integrations/stop-background-tasks
```

---

## 🔐 متغيرات البيئة المطلوبة

أضف إلى ملف `.env`:

```env
# Government Integration
GOV_API_URL=https://api.gov.sa
GOV_CLIENT_ID=your_client_id
GOV_CLIENT_SECRET=your_client_secret

# Insurance Integration
INSURANCE_API_URL=https://api.insurance.sa
INSURANCE_API_KEY=your_api_key
INSURANCE_CLIENT_ID=your_client_id
INSURANCE_CLIENT_SECRET=your_client_secret
INSURANCE_WEBHOOK_URL=https://yourdomain.com/webhooks/insurance

# Laboratory Integration
LAB_API_URL=https://api.labs.sa
LAB_API_KEY=your_api_key
LAB_FORMAT=json  # 'json', 'hl7', 'fhir'
LAB_CLIENT_CERT=/path/to/cert.pem
LAB_CLIENT_KEY=/path/to/key.pem

# Logging
LOG_LEVEL=info  # 'debug', 'info', 'warn', 'error'
```

---

## 📊 أمثلة استجابات النجاح

### Health Check Success

```json
{
  "success": true,
  "timestamp": "2026-01-23T12:00:00Z",
  "health": {
    "government": { "healthy": true, "status": 200 },
    "insurance": { "healthy": true, "status": 200 },
    "laboratory": { "healthy": true, "status": 200 },
    "overallStatus": "healthy"
  }
}
```

### Claim Submission Success

```json
{
  "success": true,
  "data": {
    "claimId": "CLM-2026-12345",
    "status": "submitted",
    "submittedAt": "2026-01-23T12:00:00Z",
    "estimatedDecision": "2026-01-30T12:00:00Z"
  }
}
```

### Lab Order Success

```json
{
  "success": true,
  "data": {
    "orderId": "ORD-2026-001",
    "status": "accepted",
    "submittedAt": "2026-01-23T12:00:00Z",
    "estimatedCompletion": "2026-01-24T18:00:00Z"
  }
}
```

---

## ❌ معالجة الأخطاء

### Error Response Format

```json
{
  "success": false,
  "error": "Service error message",
  "message": "Detailed error message"
}
```

### Common Errors

| الخطأ | السبب                   | الحل                     |
| ----- | ----------------------- | ------------------------ |
| 400   | Missing required fields | تحقق من البيانات المرسلة |
| 401   | Invalid credentials     | تحقق من مفاتيح API       |
| 403   | Access denied           | تحقق من الأذونات         |
| 404   | Resource not found      | تحقق من معرف المورد      |
| 500   | Server error            | اتصل بالدعم الفني        |

---

## 🧪 اختبار سريع باستخدام Postman

1. **استيراد المجموعة:**

   ```
   نسخ والصق الطلبات من الأعلى إلى Postman
   ```

2. **تعيين متغيرات البيئة:**

   ```
   - base_url = http://localhost:3001
   - gov_client_id = YOUR_VALUE
   - gov_client_secret = YOUR_VALUE
   ```

3. **تشغيل الاختبارات:**
   - ابدأ بـ: `/health` للتحقق من الاتصال
   - ثم جرب كل موصل على حدة

---

## 💡 نصائح مهمة

✅ **قبل الاستخدام:**

- تأكد من أن المتغيرات البيئية معرفة بشكل صحيح
- جرب `/health` أولاً للتحقق من الاتصال
- راجع السجلات عند حدوث أخطاء

✅ **للأمان:**

- لا تشاركون مفاتيح API في كود العميل
- استخدموا HTTPS في الإنتاج
- تحقق من توقيعات Webhook

✅ **للأداء:**

- استخدموا المهام الخلفية للمطابقة الدورية
- راقبوا الإحصائيات والمقاييس بانتظام
- أعد تعيين المقاييس بعد الاختبارات

---

## 📞 الدعم

للأسئلة والمساعدة:

- 📧 support@alawael.com
- 📖 اقرأ: [📚_INTEGRATION_SYSTEM_GUIDE.md](./📚_INTEGRATION_SYSTEM_GUIDE.md)
- 🔍 تحقق من: `/backend/routes/integrations.routes.js`
