# 00 — الملخص التنفيذي | Executive Summary

> **Al-Awael Unified Platform Blueprint v1.0**
> منصة موحّدة ERP + EMR + CRM + Rehab لمجموعة مراكز تأهيل ذوي الإعاقة في المملكة العربية السعودية

---

## 1. الرؤية الاستراتيجية

بناء **منصة مؤسسية موحّدة** تخدم مجموعة مراكز تأهيل متعددة الفروع داخل المملكة، تجمع بين:

| الركيزة            | الهدف                                                           |
| ------------------ | --------------------------------------------------------------- |
| **ERP**            | إدارة الموارد (مالية، بشرية، عمليات، مشتريات، أصول)             |
| **EMR**            | السجل الطبي الإلكتروني + الإكلينيكي (تقييم، خطط، جلسات، تقارير) |
| **CRM**            | إدارة علاقات المستفيدين + أولياء الأمور + الشكاوى + الرضا       |
| **Rehab Platform** | منصة تأهيل متخصصة (ICF, IRP, SMART Goals, Progress Tracking)    |

**الناتج:** نظام واحد بمصدر بيانات مركزي (Single Source of Truth)، مع عزل فروع كامل + إشراف مركزي.

---

## 2. السياق التشغيلي

```
                   ┌─────────────────────────┐
                   │   المقر الرئيسي (HQ)    │
                   │  Strategic | Oversight  │
                   │  Group Accounting       │
                   │  Compliance | Quality   │
                   └───────────┬─────────────┘
                               │
            ┌──────────┬───────┴────────┬──────────┐
            │          │                │          │
      ┌─────▼────┐ ┌───▼────┐    ┌─────▼────┐ ┌───▼─────┐
      │ فرع 1  │ │ فرع 2  │...│ فرع 11  │ │ فرع 12  │
      │ عمليات │ │ عمليات │    │ عمليات  │ │ عمليات  │
      │ محلية  │ │ محلية  │    │ محلية   │ │ محلية   │
      └────────┘ └────────┘    └──────────┘ └─────────┘
```

- **المقر الرئيسي**: صلاحيات إشرافية + استراتيجية + مالية مجمّعة + امتثال + جودة على مستوى المجموعة.
- **الفروع**: صلاحيات تشغيلية محلية (عمليات يومية، جلسات، حضور، محاسبة فرع، علاقات مستفيدين).
- **المستفيد**: نقطة ارتكاز كل الأنظمة — رحلة كاملة من الإحالة إلى الإنهاء.

---

## 3. المبادئ التوجيهية (Guiding Principles)

### 3.1 معمارية

1. **Domain-Driven Design** — سياقات محدودة (Bounded Contexts) متماسكة ومنفصلة.
2. **Single Source of Truth** — كل كيان له مالك واحد (ownership) ومصدر واحد.
3. **API-First** — كل ميزة يجب أن تُصمَّم كـ API قبل الواجهة.
4. **Multi-Tenancy by Default** — عزل الفرع مفروض على مستوى البيانات والوصول.
5. **Event-Driven Backbone** — أحداث المجال تُبث لوحدات الإشعار، التدقيق، التحليلات.
6. **Saga/Workflow Orchestration** — العمليات متعددة الخطوات (قبول، فاتورة، إنهاء) تُدار كـ Saga.

### 3.2 أمان وامتثال

7. **Defense in Depth** — مصادقة + تفويض + تدقيق + تشفير + Rate Limit على كل مسار.
8. **Least Privilege** — لا صلاحية بدون حاجة صريحة موثّقة.
9. **PDPL-First** — الامتثال لـ "نظام حماية البيانات الشخصية" السعودي شرط تصميمي، لا لاحق.
10. **Saudi-Native** — ZATCA، GOSI، Qiwa، Nafath، Absher، Etimad، Wasel، CBAHI، MoH.

### 3.3 تجربة مستخدم

11. **Arabic-First UX** — العربية هي اللغة الافتراضية، مع دعم RTL كامل.
12. **Accessibility (WCAG 2.1 AA)** — لأن المستفيدين من ذوي الإعاقة.
13. **Role-Tailored Portals** — واجهة مختلفة لكل دور (مختصر، غني، متخصص).

### 3.4 جودة

14. **Audit Trail Everywhere** — كل تغيير حالة يُسجَّل مع "من/متى/لماذا".
15. **E-Signature on Legal Artifacts** — العقود، الخطط، الموافقات، التقارير.
16. **Approval Workflows** — بدائل لكل عمل ذي أثر قانوني أو مالي.

---

## 4. نطاق المنصة (14 سياق محدود)

| #   | Bounded Context                | اسم عربي                       |
| --- | ------------------------------ | ------------------------------ |
| 1   | Identity & Access Management   | الهوية والصلاحيات              |
| 2   | Multi-Branch Governance        | إدارة الفروع                   |
| 3   | Clinical Core (EMR)            | السجل الإكلينيكي               |
| 4   | Rehab Service Delivery         | تقديم خدمات التأهيل            |
| 5   | Scheduling & Operations        | الجدولة والعمليات              |
| 6   | Finance & Accounting           | المالية والمحاسبة              |
| 7   | Human Resources                | الموارد البشرية                |
| 8   | Quality & Compliance           | الجودة والامتثال               |
| 9   | CRM & Beneficiary Relations    | علاقات المستفيدين              |
| 10  | Document Management            | إدارة الوثائق                  |
| 11  | Communications & Notifications | الاتصالات والإشعارات           |
| 12  | Government Integrations        | التكاملات الحكومية             |
| 13  | Analytics & Executive BI       | التحليلات ولوحات القيادة       |
| 14  | Supply Chain, Assets & Fleet   | سلسلة الإمداد والأصول والأسطول |

---

## 5. مستخدمو النظام (6 مستويات)

| المستوى | الدور                          | نطاق الوصول                      |
| ------- | ------------------------------ | -------------------------------- |
| L1      | **SUPER_ADMIN**                | المنصة كاملة (تقني + قانوني)     |
| L2      | **HEAD_OFFICE_ADMIN**          | جميع الفروع — إشراف + استراتيجي  |
| L3      | **BRANCH_MANAGER**             | فرع واحد — عمليات + تقارير محلية |
| L4      | **CLINICAL_SUPERVISOR**        | قسم إكلينيكي داخل فرع            |
| L5      | **THERAPIST / SPECIALIST**     | حالات مُسندة (caseload)          |
| L6      | **PARENT / STUDENT / SUPPORT** | بيانات شخصية فقط (portal)        |

تفاصيل الـ RBAC + ABAC في [05-role-matrix.md](05-role-matrix.md).

---

## 6. حالة المشروع الحالية (April 2026)

### 6.1 نقاط القوة

- ✅ **نضج معماري**: 329 route، 592 model، 282 service، 98 middleware
- ✅ **Multi-tenancy موحّد**: `branchId` كحقل مركزي + `HEAD_OFFICE_ADMIN` مُضاف حديثاً
- ✅ **سياقات DDD**: 23 domain directory
- ✅ **اختبارات**: 20,179 test ناجح
- ✅ **تكاملات حكومية جزئية**: ZATCA، GOSI، Qiwa، Disability Authority
- ✅ **أمان متعمق**: RBAC، helmet، mongoSanitize، audit logs، rate limiting

### 6.2 فجوات جوهرية (P0–P2)

| الفجوة                                                                        | الأولوية | المرجع                                                             |
| ----------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| لا يوجد ABAC (فقط RBAC)                                                       | P1       | [05-role-matrix](05-role-matrix.md)                                |
| 536 اختبار يتيم                                                               | P0       | [docs/audits/phantom-tests](../audits/phantom-tests-2026-04-16.md) |
| تكاملات حكومية ناقصة (Nafath, Absher, Etimad, Wasel, Madaa, MoHRSD, HRDF)     | P1       | [07-integrations](07-integrations.md)                              |
| لا يوجد Canonical Data Model موثّق                                            | P0       | [04-data-domains](04-data-domains.md)                              |
| لا يوجد ADR لـ Multi-Tenancy / PDPL                                           | P1       | `docs/architecture/decisions/`                                     |
| ازدواج في نماذج الإكلينيكية (RehabilitationPlan + CarePlan + TherapeuticPlan) | P1       | [04-data-domains](04-data-domains.md)                              |
| Portals 6 مستويات غير موحّدة                                                  | P2       | [03-modules-map](03-modules-map.md)                                |
| KPI Framework غير موثّق                                                       | P1       | [09-roadmap](09-roadmap.md)                                        |
| Smart Alerts مبعثرة                                                           | P2       | [08-risks-controls](08-risks-controls.md)                          |

---

## 7. خارطة الطريق المختصرة (6 مراحل)

| المرحلة               | المدة      | التركيز                                                          |
| --------------------- | ---------- | ---------------------------------------------------------------- |
| **P0 — Stabilize**    | 0–4 أسابيع | تنظيف الاختبارات، Canonical Model، ADRs، audit trail hardening   |
| **P1 — Foundation**   | 1–2 شهر    | ABAC، باقي التكاملات الحكومية، PDPL compliance، KPI framework    |
| **P2 — Portals**      | 2–3 شهر    | توحيد 6 portals، Parent Portal Mobile، Therapist Elite Dashboard |
| **P3 — Intelligence** | 3–4 شهر    | Smart Alerts engine، AI-assisted IRP، Executive BI unified       |
| **P4 — Scale**        | 4–6 شهر    | Microservices split (optional)، event sourcing لقطاعات معيّنة    |
| **P5 — Continuous**   | دائم       | تحسين، مراقبة، امتثال مستمر، iterations                          |

تفاصيل كل مرحلة في [09-roadmap.md](09-roadmap.md).

---

## 8. مخرجات هذه الوثيقة

| الوثيقة                                          | المحتوى                                      |
| ------------------------------------------------ | -------------------------------------------- |
| [01-system-context.md](01-system-context.md)     | System Context Diagram + Actors              |
| [02-bounded-contexts.md](02-bounded-contexts.md) | 14 سياق محدود + Context Map                  |
| [03-modules-map.md](03-modules-map.md)           | خريطة الوحدات التفصيلية                      |
| [04-data-domains.md](04-data-domains.md)         | Canonical Data Model (24+ entity)            |
| [05-role-matrix.md](05-role-matrix.md)           | RBAC 6-level + ABAC scaffold                 |
| [06-workflows.md](06-workflows.md)               | Beneficiary Journey E2E + Approval Workflows |
| [07-integrations.md](07-integrations.md)         | Integration Map (Saudi Gov + External)       |
| [08-risks-controls.md](08-risks-controls.md)     | Risk Register + Controls                     |
| [09-roadmap.md](09-roadmap.md)                   | Phased Roadmap + Priorities + KPIs           |
| [10-gap-analysis.md](10-gap-analysis.md)         | Current vs Target (scored)                   |

---

## 9. القرار المطلوب من الإدارة

1. **الموافقة على المبادئ الـ16 التوجيهية** كـ "عقد تصميمي" للمنصة.
2. **اعتماد الـ14 Bounded Context** كتقسيم رسمي للمنصة.
3. **تأكيد مصفوفة الـ6 مستويات** للصلاحيات.
4. **اعتماد خارطة الطريق المرحلية** مع الأولويات.
5. **تخصيص فريق Enterprise Architecture** (Architect + 2 Tech Leads).

بعد الاعتماد، يبدأ تنفيذ P0 (تنظيف + Canonical Data Model + ADRs) مباشرة.
