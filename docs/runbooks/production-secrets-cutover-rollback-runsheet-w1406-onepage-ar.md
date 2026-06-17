# قطع الأسرار الإنتاجية — الرجوع للخلف (صفحة واحدة) (W1406)

**للاستخدام:** مرجع سريع في غرفة الحرب  
**التاريخ:** [DD]/[MM]/[YYYY] | **تذكرة التغيير:** [fill]

---

## التشغيل → قرار الرجوع (90 ثانية)

**هل أي من هذه الشروط صحيح؟**

- الخدمة لا تبدأ (الأسرار لم تُحل)
- Auth endpoints ترجع 401/403 (كل المستخدمين متأثرين)
- فشل التشفير (البيانات غير قابلة للقراءة)
- فحص الصحة يفشل بعد 30 ثانية إعادة محاولة

**نعم** → استدعاء مدير الإصدار → أعلن عن حادثة → انتقل إلى الخطوة 1  
**لا** → تحقق أكثر (قد لا تكون مشكلة أسرار)

---

## الخطوة 1: غرفة الحرب (دقيقتان)

- [ ] مدير الإصدار: أعلن عن حادثة حرجة
- [ ] استدعي الفريق: DevOps و Backend و Security
- [ ] افتح: جسر الاتصال / محادثة Slack
- [ ] اسند: Ops Lead (تنسيق)، DevOps (تنفيذ)، Backend (التحقق)

**المسؤول:** Release Manager | **القناة:** [Slack/Bridge] | **الوقت:** [HH:MM]

---

## الخطوة 2: استعادة الأسرار (دقيقتان)

```bash
# احفظ الحالة الفاشلة
cp /production-secrets-live.env /archive/failed-cutover-$(date +%s).env

# استعد ما قبل التغيير
cp /backups/secrets/production/pre-cutover-*.env /production-secrets-live.env

# تحقق من وجود جميع المفاتيح الخمسة
cat /production-secrets-live.env | grep -E "MONGODB_URI|JWT_SECRET|ENCRYPTION_KEY|SESSION_SECRET"
```

**الفحوصات:**

- [ ] جميع المفاتيح الخمسة موجودة
- [ ] المفاتيح بصيغة صحيحة (غير تالفة)
- [ ] الأذونات: 600

**المسؤول:** DevOps Lead | **الدليل:** `[path]` | **الوقت:** [HH:MM]

---

## الخطوة 3: إعادة تشغيل الخدمات (3 دقائق)

```bash
# أزل من موازن التحميل
lb-tool remove-pool production-backend

# أعد تشغيل (الترتيب مهم)
docker restart redis && sleep 10
docker restart mongo && sleep 15
docker restart backend && sleep 20
docker restart frontend && sleep 10

# أضف مجددًا إلى موازن التحميل
lb-tool add-pool production-backend instance-1 instance-2
```

**المسؤول:** DevOps Lead | **الوقت:** [HH:MM]

---

## الخطوة 4: فحوصات الصحة (5 دقائق)

```bash
# 1. فحص البيئة
cd backend && npm run env:check

# 2. فحص المصادقة
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 3. الصحة
curl http://localhost:3001/api/v1/health

# 4. الواجهة الأمامية
curl -I http://localhost:3000/
```

**النتائج:** ☐ الكل يمر ☐ بعضها يفشل (انظر الملخص التفصيلي)

**المسؤول:** Backend Verifier | **الوقت:** [HH:MM]

---

## الخطوة 5: المراقبة (10 دقائق)

```bash
# راقب الصحة لمدة 10 دقائق
watch -n 5 'curl -s http://lb.prod/health | jq .status'

# افحص سجلات الأخطاء
docker logs backend 2>&1 | grep -i error | tail -20
```

**المقاييس:**

| المقياس            | الهدف  | الحالة       |
| ------------------ | ------ | ------------ |
| استجابة API (p50)  | <100ms | ☐ OK ☐ عالي  |
| معدل نجاح المصادقة | >99%   | ☐ OK ☐ منخفض |
| معدل الأخطاء       | <0.1%  | ☐ OK ☐ عالي  |

**المسؤول:** DevOps + Backend | **الوقت:** [HH:MM]

---

## القرار: اكتمل الرجوع للخلف؟

**الكل أخضر؟**  
☐ **نعم** → الرجوع نجح. انتقل إلى: _إخطار الفريق_ (أدناه)  
☐ **لا** → انظر التصعيد (الملخص التفصيلي) أو استدعِ Backend Lead فورًا

---

## إخطار الفريق

**الحالة:** ☐ مكتمل  
**الإعلان:**

> اكتمل الرجوع للخلف. تم استعادة النظام إلى أسرار ما قبل التغيير. تم التحقق من Auth/API/UI وهي تعمل. سيتبع التحليل خلال 24 ساعة.

**القنوات:** Slack #incidents و #ops-team ورسالة البريد الإلكتروني للمعنيين  
**المسؤول:** Release Manager | **الوقت:** [HH:MM]

---

## أرشيف الدليل

- بصمة الأسرار الاحتياطية: [file]
- سجل env:check: [file]
- مخرجات فحص الصحة: [file]
- سجلات الخدمات: [folder]
- تذكرة الحادثة: [link]

---

## التوقيعات

| الدور                  | الاسم  | التوقيع | الوقت   |
| ---------------------- | ------ | ------- | ------- |
| مدير الإصدار (التفويض) | [fill] | [sig]   | [HH:MM] |
| DevOps Lead (التنفيذ)  | [fill] | [sig]   | [HH:MM] |
| Backend (التحقق)       | [fill] | [sig]   | [HH:MM] |

---

**التالي:** وثيقة تحليل جذر السبب التفصيلية (خلال 24 ساعة)  
**ذات صلة:** [production-secrets-cutover-rollback-runsheet-w1406.md](production-secrets-cutover-rollback-runsheet-w1406.md)
