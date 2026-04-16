# Al-Awael Unified Platform Blueprint

> **نواة معمارية موحّدة لمنصة ERP + EMR + CRM + Rehab لمجموعة مراكز تأهيل ذوي الإعاقة في السعودية**

**Version:** 1.0
**Date:** 2026-04-16
**Status:** Draft — للمراجعة والاعتماد

---

## 📋 فهرس الوثيقة

| #                             | المستند                     | الغرض                                       |
| ----------------------------- | --------------------------- | ------------------------------------------- |
| [00](00-executive-summary.md) | **Executive Summary**       | الرؤية + المبادئ الـ16 + القرارات المطلوبة  |
| [01](01-system-context.md)    | **System Context Diagram**  | النظام + الأطراف + الأنظمة الخارجية         |
| [02](02-bounded-contexts.md)  | **Bounded Contexts**        | 14 سياق محدود + Context Map + Team Topology |
| [03](03-modules-map.md)       | **Modules Map**             | كل وحدة: APIs + UI + أحداث + مالك           |
| [04](04-data-domains.md)      | **Canonical Data Model**    | 26 كيان + علاقات + domain events            |
| [05](05-role-matrix.md)       | **Role Matrix (RBAC+ABAC)** | 6 مستويات + مصفوفة صلاحيات + ABAC           |
| [06](06-workflows.md)         | **Workflow Map**            | رحلة المستفيد E2E + sagas + state machines  |
| [07](07-integrations.md)      | **Integration Map**         | حكومية + مدفوعات + تأمين + اتصالات          |
| [08](08-risks-controls.md)    | **Risks & Controls**        | 23 خطر + 80+ ضابط                           |
| [09](09-roadmap.md)           | **Phased Roadmap**          | 6 مراحل + backlog + KPIs                    |
| [10](10-gap-analysis.md)      | **Gap Analysis**            | Current vs Target per BC + decision log     |

---

## 🎯 الأهداف الاستراتيجية

1. **مصدر حقيقة موحّد** — بيانات مستفيد/موظف/فرع واحدة فقط عبر المنصة.
2. **عزل الفروع + إشراف مركزي** — كل فرع مستقل تشغيلياً، HQ يرى الكل.
3. **امتثال سعودي شامل** — ZATCA, GOSI, Qiwa, Nafath, PDPL, CBAHI.
4. **جودة إكلينيكية** — ICF + SMART IRP + AI-assisted + outcome measurement.
5. **تجربة عربية-أولاً** — RTL، accessible، responsive، mobile-first.
6. **قابلية التوسع** — 12 فرع حالياً → 30+ فرع، بنفس المنصة.

---

## 🏗️ البنية عالية المستوى

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                               │
│  Web SPA  │  Mobile (Parent)  │  Mobile (Therapist)  │ Kiosk    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────────┐
│                  Nginx + Cloudflare (WAF)                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                        API GATEWAY                               │
│  Auth  │  Rate Limit  │  RBAC/ABAC  │  Branch Scope  │  Audit   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
         ┌─────────────────────┴─────────────────────┐
         │          APPLICATION LAYER                 │
         │                                            │
         │  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
         │  │ BC-01..BC-14 Modules (Express/Node)    │ │
         │  │                                         │ │
         │  │ Domain Events ←→ Integration Bus       │ │
         │  └────────────────────────────────────────┘ │
         └─────────────────────┬─────────────────────┘
                               │
    ┌──────────┬───────────────┼───────────────┬──────────┐
    │          │               │               │          │
    ▼          ▼               ▼               ▼          ▼
┌───────┐ ┌────────┐   ┌─────────────┐  ┌──────────┐  ┌───────┐
│MongoDB│ │ Redis  │   │    S3       │  │Socket.IO │  │  ML   │
│Primary│ │Cache   │   │ Documents   │  │Real-time │  │Models │
└───────┘ └────────┘   └─────────────┘  └──────────┘  └───────┘
                               │
         ┌─────────────────────┴─────────────────────┐
         │          INTEGRATION LAYER                 │
         │                                            │
         │  ZATCA │ GOSI │ Qiwa │ Nafath │ Absher    │
         │  Yakeen│ Wasel│ Madaa│ HRDF   │ MoHRSD    │
         │  Twilio│SendGrid│ Stripe│ HyperPay│Mada   │
         └────────────────────────────────────────────┘
```

---

## 👥 المستفيدون من الوثيقة

| Audience                       | استخدام                                     |
| ------------------------------ | ------------------------------------------- |
| **Board / C-Suite**            | 00-executive-summary.md → قرارات استراتيجية |
| **CTO / Enterprise Architect** | 01 → 10 كاملة                               |
| **Tech Leads**                 | 02 (BC ownership) + 03 + 04                 |
| **Developers**                 | 03 (modules) + 04 (data) + 05 (RBAC)        |
| **Product Managers**           | 06 (workflows) + 09 (roadmap)               |
| **Security/Compliance**        | 05 + 07 + 08 + PDPL sections                |
| **Integration Team**           | 07 + 12 (gov)                               |
| **Data/BI Team**               | 13 (analytics) + KPIs                       |
| **QA**                         | 06 (workflows) + 08 (controls)              |

---

## ✅ القرارات المطلوبة (للاعتماد)

1. **Principles 16** — اعتماد المبادئ التوجيهية.
2. **Bounded Contexts 14** — اعتماد التقسيم.
3. **Role Hierarchy 6 levels** — اعتماد المصفوفة.
4. **Canonical Data Model** — توقيع CMO + CFO + CHRO.
5. **Roadmap phases** — تخصيص budget + team.
6. **Priority order** — P0 → P1 → P2 → ...
7. **Build vs Buy decisions** — D-01 إلى D-08.

---

## 🎬 ماذا بعد؟

### أسبوع 1

- [ ] مراجعة الـ Blueprint مع C-Suite
- [ ] تعديلات بناءً على الملاحظات
- [ ] اعتماد رسمي

### أسبوع 2

- [ ] تخصيص ميزانية P1
- [ ] تعيين Enterprise Architect (إن لم يكن)
- [ ] تشكيل Steering Committee

### أسبوع 3-4 (P0)

- [ ] تنظيف الاختبارات اليتيمة (536)
- [ ] كتابة ADRs
- [ ] تقوية audit trail

### الشهر 2-4 (P1)

- [ ] ABAC + PDPL + Nafath + Absher + Yakeen + Wasel + Madaa + KPI framework

### ما بعد P1

- [ ] انظر [09-roadmap.md](09-roadmap.md)

---

## 📞 للتواصل

| الدور                    | المسؤول     |
| ------------------------ | ----------- |
| Enterprise Architect     | (to assign) |
| Clinical Lead            | (to assign) |
| CTO                      | (to assign) |
| CMO                      | (to assign) |
| CQO / DPO                | (to assign) |
| Steering Committee Chair | (to assign) |

---

## 📜 Document History

| Version | Date       | Author                  | Changes               |
| ------- | ---------- | ----------------------- | --------------------- |
| 1.0     | 2026-04-16 | Enterprise Architecture | النسخة الأولى الكاملة |

---

## 🔗 روابط ذات صلة

- [README (جذر المشروع)](../../README.md)
- [ARCHITECTURE.md (معمارية تقنية قائمة)](../ARCHITECTURE.md)
- [MODULES.md (خريطة وحدات حالية)](../MODULES.md)
- [ADRs](../architecture/decisions/)
- [Audit: Phantom Tests](../audits/phantom-tests-2026-04-16.md)

---

_هذه الوثيقة حيّة (living document) — تتحدّث مع تطور المنصة. آخر تحديث: 2026-04-16._
