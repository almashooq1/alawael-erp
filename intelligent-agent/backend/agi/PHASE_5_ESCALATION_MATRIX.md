# مصفوفة التصعيد - المرحلة 5

# PHASE 5 ESCALATION MATRIX

**التاريخ | Date:** January 30, 2026  
**المرحلة | Phase:** Phase 5  
**الحالة | Status:** Active

---

## 1. تعريف مستويات التصعيد | Escalation Levels

| المستوى | Level        | الوصف           | Description | زمن الإشعار | Notify Within |
| ------- | ------------ | --------------- | ----------- | ----------- | ------------- |
| L1      | On-Call      | مهندس مناوب     | 15 min      |
| L2      | Team Lead    | قائد الفريق     | 30 min      |
| L3      | Ops Manager  | مدير العمليات   | 45 min      |
| L4      | Exec Sponsor | الراعي التنفيذي | 60 min      |

---

## 2. مصفوفة التصعيد حسب الشدة | Escalation by Severity

| الشدة | Severity | L1  | L2  | L3  | L4  | تحديث الحالة | Status Update |
| ----- | -------- | --- | --- | --- | --- | ------------ | ------------- |
| Sev-1 | Critical | ✅  | ✅  | ✅  | ✅  | كل 30 دقيقة  |
| Sev-2 | High     | ✅  | ✅  | ✅  | ☐   | كل 60 دقيقة  |
| Sev-3 | Medium   | ✅  | ✅  | ☐   | ☐   | كل 4 ساعات   |
| Sev-4 | Low      | ✅  | ☐   | ☐   | ☐   | يومياً       |

---

## 3. محفزات التصعيد | Escalation Triggers

- **P95 > 180ms** لمدة 15 دقيقة
- **Error Rate > 0.20%** لمدة 10 دقائق
- **Uptime < 99.95%** خلال 24 ساعة
- **Security Alert (High/Critical)**
- **Data Integrity Risk** أو فشل نسخ احتياطي

---

## 4. جهات الاتصال | Contact Roles

| الدور            | Role | المسؤول  | Owner    | وسيلة الاتصال | Contact |
| ---------------- | ---- | -------- | -------- | ------------- | ------- |
| On-Call Engineer | L1   | **\_\_** | **\_\_** | **\_\_**      |
| Team Lead        | L2   | **\_\_** | **\_\_** | **\_\_**      |
| Ops Manager      | L3   | **\_\_** | **\_\_** | **\_\_**      |
| Exec Sponsor     | L4   | **\_\_** | **\_\_** | **\_\_**      |

---

## 5. قنوات الاتصال | Communication Channels

- القناة الأساسية: Slack / Teams
- القناة الاحتياطية: الهاتف
- البريد الإلكتروني: Incident distribution list

---

## 6. التوقيع والموافقة | Sign-Off

| الدور         | Role     | الاسم    | Name     | التوقيع  | Signature | التاريخ | Date |
| ------------- | -------- | -------- | -------- | -------- | --------- | ------- | ---- |
| Ops Lead      | **\_\_** | **\_\_** | **\_\_** | **\_\_** |
| Security Lead | **\_\_** | **\_\_** | **\_\_** | **\_\_** |
| QA Lead       | **\_\_** | **\_\_** | **\_\_** | **\_\_** |
| Product Lead  | **\_\_** | **\_\_** | **\_\_** | **\_\_** |

---

**Status:** ✅ PHASE 5 ESCALATION MATRIX READY
