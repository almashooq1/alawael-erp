# مخطّط طبقة واتساب الأعمال المؤسسية — مركز تأهيل ذوي الإعاقة (Al-Awael)

> **الحالة:** مخطّط معماري + تحليل فجوات (Blueprint + Gap Analysis) — 2026-06-24
> **النطاق:** طبقة واتساب الأعمال كجزء من النواة (Core Platform)، وليست نظامًا منفصلًا.
> **المبدأ الحاكم:** **عدم التكرار**. تم تدقيق المشروع أولًا؛ معظم القدرات المطلوبة **مبنية فعلًا**. هذه الوثيقة تصمّم الطبقة المؤسسية **فوق** الموجود وتبني الفجوة فقط.
> **وثائق شقيقة (لا تُكرَّر):** [`MENU_BOT.md`](./MENU_BOT.md) (بوت القائمة FSM) · [`SETUP_AND_OTP.md`](./SETUP_AND_OTP.md) (الإعداد + OTP).

---

## 0) ملخّص تنفيذي + بصمة ما هو موجود (Anti-Duplication Ledger)

أُجري تدقيق شامل عبر الواجهتين (backend في `66666` + web-admin في `alawael-rehab-platform`). الخلاصة: **قناة واتساب موجودة وناضجة إنتاجيًا** — تكامل Meta Cloud API v21.0، بوت FSM ثنائي اللغة (عربي/إنجليزي)، تصنيف نوايا بالذكاء الاصطناعي، طابور رسائل فاشلة (DLQ)، تحديد معدّل (rate-limit)، إدارة موافقات (consent)، عزل فروع (W1407/W1412)، و4 صفحات في web-admin.

**القاعدة الذهبية لكل بند في هذه الوثيقة:**

| الوسم          | المعنى                                | الإجراء                                 |
| -------------- | ------------------------------------- | --------------------------------------- |
| ✅ **موجود**   | مبنيّ ويعمل في الإنتاج                | **لا يُعاد بناؤه** — يُعاد استخدامه فقط |
| 🟡 **يُوسَّع** | موجود جزئيًا/خام أو غير موصول بالـ UI | يُوسَّع/يُوصَل (لا يُعاد من الصفر)      |
| 🔴 **جديد**    | فجوة حقيقية                           | يُبنى — موجة (Wave) واحدة لكل بند       |

### جرد المكوّنات الموجودة (المرجع الذي يمنع التكرار)

**الخلفية (`66666/backend/services/whatsapp/`):**

| الملف                              | الدور                                                                                                                                                                                                            | الحالة           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `whatsappService.js`               | تكامل Meta Cloud API v21.0: `sendText/Template/Document/Image/Audio/Video/InteractiveButtons/InteractiveList/Otp`، بوابة موافقة `assertCanMessage`، `withRetry` (backoff على 429/5xx)، `APPSECRET_PROOF` (W1425) | ✅               |
| `whatsappWebhook.service.js`       | استقبال webhook، تحقق توقيع HMAC (fail-closed)، تطبيع رسائل، تصنيف نية، قرار رد آلي، حفظ + تصعيد                                                                                                                 | ✅               |
| `whatsappAI.service.js`            | تصنيف نية عربي (W1416، LLM + احتياطي قواعدي)، مشاعر، اقتراح ردود، تلخيص محادثة، تحليل تفاعل                                                                                                                      | ✅               |
| `autoReply.service.js`             | مصفوفة قرار (template/text/escalate/none) لكل نية × درجة إلحاح                                                                                                                                                   | ✅               |
| `rateLimit.service.js`             | نافذة منزلقة لكل رقم (دقيقة/ساعة/يوم)، Redis أو ذاكرة                                                                                                                                                            | ✅               |
| `idempotency.service.js`           | منع تكرار الإرسال عبر `Idempotency-Key` (24h)                                                                                                                                                                    | ✅               |
| `dlq.service.js`                   | طابور رسائل فاشلة + sweeper + إعادة محاولة أسّية + إعادة يدوية                                                                                                                                                   | ✅               |
| `whatsappTemplates.service.js`     | مكتبة قوالب جاهزة (تذكير جلسة، تقرير تقدّم، واجب منزلي، تأكيد موعد، ترحيب، تذكير دفع، استبيان رضا)                                                                                                               | ✅               |
| `templateSync.service.js`          | سحب قوالب Meta المعتمدة + تخزين محلي + تحقق قبل الإرسال                                                                                                                                                          | ✅ (الجدولة 🟡)  |
| `whatsappEventBindings.service.js` | W727: ربط حدث نواة ← قالب (بنية بيانات؛ بدون UI)                                                                                                                                                                 | 🟡               |
| `whatsappBotRecords.service.js`    | W1384: تحويل نهاية تدفّق البوت ← سجل حقيقي (Complaint/NpsResponse/PublicBookingRequest)                                                                                                                          | ✅ (العَلَم OFF) |
| `whatsappBotInsights.service.js`   | W1417/W1419: التقاط عبارات غير مطابقة + قمع استخدام الوحدات                                                                                                                                                      | ✅               |
| `whatsappBotTimeline.service.js`   | W1408: ربط أحداث البوت ← `CareTimeline` للمستفيد                                                                                                                                                                 | ✅               |

**بوت القائمة (FSM) — `66666/backend/intelligence/`:**
`whatsapp-bot-flow.registry.js` (وحدات + كلمات مفتاحية + FAQ + تمارين منزلية) · `whatsapp-bot-flow.service.js` (`handleTurn` نقيّ، FSM، كشف ركود الجلسة) · `whatsapp-bot-flow.i18n.js` (عربي/إنجليزي، W1383). ✅

**النماذج (`66666/backend/models/`):** `WhatsAppConversation` (محادثات + رسائل مضمّنة + `botFlow` FSM + إثراء AI + `branchId`) · `WhatsAppConsent` (موافقات + سجل + نافذة 24h) · `WhatsAppContactGroup` (مجموعات بث + أعضاء + `branchId`) · `WhatsAppDlq` (TTL 30 يوم) · `WhatsAppSyncTemplate` · `WhatsAppBotUnmatchedIntent` (TTL 30 يوم) · `WhatsAppBotUnitUsage`. ✅

**المسارات:** `routes/whatsapp.routes.js` (~50+ endpoint) + `routes/whatsapp-enhanced.routes.js`، مركّبة عبر `routes/registries/communication.registry.js` بـ `dualMount` على `/api/whatsapp` و`/api/v1/whatsapp`. ✅

**الواجهة (web-admin، `apps/web-admin/src/app/(dashboard)/communications/whatsapp/`):** `page.tsx` (Inbox + KPIs) · `[id]/page.tsx` (محادثة + ردود ذكية) · `templates/page.tsx` · `dlq/page.tsx`. عميل `lib/whatsapp-api.ts` + أنواع `lib/types/whatsapp.ts` + تنقّل `nav-items.v2.tsx`. ✅

> **القرار:** الواجهة القديمة `66666/frontend/src/pages/whatsapp/WhatsAppDashboard.jsx` (MUI) = إثبات مفهوم قديم. **كل بناء جديد في web-admin (Next.js) فقط** — التزامًا بدوكترين المشروع (web-admin هي الواجهة المعتمدة).

---

## 1) الوصف المعماري عالي المستوى (High-Level Architecture)

طبقة واتساب **ليست خدمة مستقلة**؛ هي **قناة (Channel) + طبقة تنسيق (Orchestration)** داخل نواة `66666/backend`، تجلس فوق نماذج النواة الموجودة وتستهلك/تنتج عبر ناقل الأحداث (Integration Bus). الواجهة كلها في web-admin.

```text
                          ┌──────────────────────── Meta WhatsApp Cloud API (v21.0) ──────────────────────┐
                          │   Inbound: POST /webhook (HMAC X-Hub-256)     Outbound: /{phoneId}/messages     │
                          └───────────────────────────────┬───────────────────────────────────────────────┘
                                                          │
 ┌──────────────────────────────────────────────────────┼───────────────────────────────────────────────────┐
 │  66666/backend  —  طبقة قناة واتساب (WhatsApp Channel Layer)                                                │
 │                                                                                                            │
 │  [الاستقبال]  whatsappWebhook.service  → verifySignature(fail-closed) → 200 فوري → معالجة غير متزامنة:      │
 │      classifyIntent (AI/قواعد) → autoReply.decide → bot FSM handleTurn → persist WhatsAppConversation      │
 │      → recordInbound(WhatsAppConsent) → (تصعيد؟ مهمة/إشعار) → (sideEffect؟ سجل + CareTimeline)             │
 │                                                                                                            │
 │  [الإرسال]   whatsappService.send* → assertCanMessage(consent) → rateLimit → idempotency → (فشل؟ DLQ)      │
 │                                                                                                            │
 │  [الأتمتة]   Event Bindings (حدث نواة ← قالب) + Campaign Scheduler (🔴) + Bot live-data lookups (🟡)        │
 │                                                                                                            │
 │  [العزل]     effectiveBranchScope / branchFilter على كل قراءة (W1407/W1412)  + can() على كل تحوّل حساس     │
 └───────┬───────────────────┬──────────────────┬──────────────────┬───────────────────┬─────────────────────┘
         │                   │                  │                  │                   │
   Integration Bus     نماذج النواة         الموافقات          RBAC/can.js          الذكاء الاصطناعي
 (systemIntegrationBus) Beneficiary,Session,  Consent +        9 archetypes ×       whatsappAI (LLM/قواعد)
   نشر/استهلاك أحداث     CarePlan,Report,      WhatsAppConsent   75 perms × 55 roles  + RAG (مستقبلًا)
   session.completed,    Complaint,Invoice,
   appointment.*,        Notification,
   careplan.activated    Vehicle, CareTimeline
         │
 ┌───────┴───────────────────────────────────────────────────────────────────────────────────────────────────┐
 │  alawael-rehab-platform/apps/web-admin (Next.js 15, RTL, @alawael/ui)  —  لوحة تحكّم واتساب المؤسسية        │
 │  Inbox موحّد + شريط سياق تأهيلي · لوحة KPIs مرتبطة بمخرجات التأهيل · الحملات · باني الأتمتة · الإعدادات      │
 └────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**المبادئ المعمارية (مطبّقة فعلًا في الكود):**

1. **القناة رقيقة، النواة سميكة:** `whatsappService` = نقل نقيّ؛ كل منطق التأهيل في خدمات النواة. واتساب **لا يملك** بيانات مستفيد أو جلسة — يشير إليها بـ `ref` فقط (`beneficiaryId`, `episodeId`).
2. **استقبال غير متزامن مع رد فوري 200:** يمنع timeout من Meta؛ المعالجة الثقيلة تتم بعد الرد (نمط `processWebhook`).
3. **بوابات دفاعية متعددة الطبقات على كل إرسال:** موافقة → rate-limit → idempotency → DLQ. لا إرسال يتجاوزها.
4. **عزل المستأجر (الفرع) إلزامي:** كل قراءة محادثة/مجموعة تُرشَّح بـ `effectiveBranchScope(req)` — لا `req.branchId` إطلاقًا (W1407/W1412/W269h).
5. **مدفوع بالأحداث:** تُستهلَك أحداث النواة (`session.scheduled`, `careplan.activated`, `invoice.issued`) لإطلاق رسائل آلية، وتُنشَر أحداث واتساب (`whatsapp.message.received`, `whatsapp.escalated`) للمستهلكين.
6. **خصوصية بالتصميم (PDPL):** TTL 30 يوم على DLQ/البصائر؛ موافقة مسجّلة بسبب + وقت؛ ملاحظات حساسة بصلاحية منفصلة.

---

## 2) خريطة الوحدات والوظائف لبيئة التأهيل (مع وسم عدم التكرار)

### M1 — لوحة تحكّم واتساب العامة للمركز (WhatsApp Command Dashboard)

- ✅ موجود: endpoint `GET /api/v1/whatsapp/analytics` (إجماليات + توزيع إلحاح + pending-review)؛ شريط KPIs في `page.tsx`.
- 🔴 جديد: **لوحة KPIs مرتبطة بمخرجات التأهيل** — لا تكتفي بعدّ الرسائل، بل تربط: _نسبة الحضور بعد التذكير، انخفاض الغياب، التزام الأسرة بالواجبات المنزلية، تقدّم الأهداف، رضا الأسر (NPS)_. تحتاج تجميع متقاطع مع `ClinicalSession` + `TherapeuticGoal` + `NpsResponse` (انظر §7 KPIs و§8 UX).

### M2 — Inbox موحّد مهيّأ لبيئة التأهيل

- ✅ موجود: قائمة محادثات + تفاصيل + ردود ذكية + شارات نية/إلحاح/حالة (`page.tsx`, `[id]/page.tsx`).
- 🟡 يُوسَّع: **شريط سياق المستفيد الجانبي** — عند فتح محادثة، يعرض من النواة: التشخيص، الخطة النشطة (`UnifiedCarePlan`)، الأهداف النشطة (`TherapeuticGoal`)، الأخصائيون المسؤولون، جدول الجلسات القادمة (`ClinicalSession`)، حالة الحضور، الفواتير المعلّقة. يُبنى بجلب موازٍ (`Promise.allSettled`) عبر `beneficiaryId` المرتبط بالمحادثة.
- 🟡 يُوسَّع: **تحويل المحادثة بين الأخصائيين** — `POST /conversations/:id/assign` موجود؛ يُضاف **سجل تحويل (transfer log) + Audit** + سبب التحويل، وزر "تحويل إلى أخصائي النطق/المشرف".
- 🔴 جديد: **ملاحظات داخلية لا تظهر للأهل** — حقل `internalNotes[]` على `WhatsAppConversation` + UI، محميّ بصلاحية `whatsapp:notes:internal`، وربط المحادثة بتذكرة/جلسة/حالة (`linkedTicketId`, `linkedSessionId`).

### M3 — ربط واتساب بالمواعيد والجلسات (Two-way Scheduling)

- ✅ موجود: قوالب `session_reminder` / `appointment_confirm` / `session_cancel`؛ بوت يلتقط نية `absent_notification`.
- 🟡 يُوسَّع: **مزامنة ثنائية الاتجاه** — عند رد الأهل بزر تأكيد/إلغاء (interactive)، يقرأ الـ webhook الرد ويحدّث `ClinicalSession.attendance.status` / `status` تلقائيًا (الآن البوت يصعّد فقط — `LOOKUP_*` stubs).
- 🟡 يُوسَّع: **تدفّق عدم الحضور (No-show)** — رسالة سياسة + التماس سبب → تخزين `attendance.excused` + السبب في الجلسة، وربط بـ `CareTimeline`.

### M4 — ربط واتساب بالخطة التأهيلية والتقارير للأهل

- ✅ موجود: قوالب `progress_report` / `homework_assignment`؛ `services/reporting/channels/whatsapp.channel.js` (خام).
- 🟡 يُوسَّع: **توصيل التقارير الدورية** — وصل `GeneratedReport` (PDF نهائي) ← `sendDocument` عبر event binding `report.finalized → whatsapp`. الأهل يردّون بأسئلة/فيديو تمارين منزلية → يُرفَع كوسائط وارد ويُربَط بالأخصائي للتقييم.
- ✅ موجود: بوت FAQ + تمارين منزلية حسب القسم (`HOME_EXERCISES` في الـ registry).

### M5 — الأتمتة والبوت الذكي للتأهيل (Flows + AI)

- ✅ موجود: بوت FSM كامل (10+ وحدات: حالة جديدة، حجز موعد، استعلام حضور/تقرير/فاتورة، شكوى، اتصال مرتجع، رضا، طوارئ)؛ تصنيف نية AI + اقتراح ردود + تلخيص.
- 🟡 يُوسَّع: **باني التدفقات (Flow/Bindings UI)** — `whatsappEventBindings` بنية بيانات بلا واجهة؛ تُبنى صفحة admin لربط _حدث نواة ← قالب/تدفّق_ وتفعيل/تعطيل.
- 🟡 يُوسَّع: **استعلامات البيانات الحيّة للبوت** — `LOOKUP_ATTENDANCE/SESSION_REPORT/BILLING` حاليًا تصعّد فقط؛ تُوصَل بـ `ClinicalSession`/`GeneratedReport`/`Invoice` **بعد تحقّق هوية الولي** (`resolveGuardian`).
- 🔴 جديد: **سيناريو متابعة الغياب المتكرّر** كتدفّق آلي مجدوَل (انظر §7).

### M6 — خدمة العملاء والشكاوى (Tickets)

- ✅ موجود: `whatsappBotRecords` ينشئ `Complaint` من تدفّق شكوى البوت (العَلَم `ENABLE_WHATSAPP_BOT_RECORDS`).
- 🟡 يُوسَّع: **حلقة تتبّع الحالة عكسيًا** — عند تغيّر حالة `Complaint` (استلام/قيد المعالجة/تم الحل)، إشعار الأهل عبر واتساب تلقائيًا (event binding `complaint.status_changed → whatsapp`).

### M7 — الحملات والتوعية الخاصة بذوي الإعاقة (Campaigns)

- ✅ موجود: `WhatsAppContactGroup` + بثّ مُقسَّم (`POST /contact-groups/:id/broadcast`) مع ترشيح موافقة + rate-limit + DLQ + معاينة أهلية (W747) + استيراد/تصدير CSV.
- 🔴 جديد: **نموذج حملة + جدولة (`WhatsAppCampaign`)** — البثّ الآن **عند الطلب فقط** وعديم الحالة. يُبنى: حملة مجدوَلة + استهداف شرائح (حسب التشخيص/الخطة: أهل التوحد، الإعاقة الحركية…) + قياس أثر (مشاركة، حضور ورش، تسجيل). انظر §5 و§7.

### M8 — التقارير والتحليلات المتخصصة (Rehab Analytics)

- 🟡 يُوسَّع: `analytics` الحالي = عدّ خام؛ يُضاف ربط _استخدام واتساب ↔ تحسّن الالتزام/انخفاض الغياب/تقدّم الخطة_، أوقات الذروة، أكثر الاستفسارات، أداء الفرق. (مصدر البصائر: `WhatsAppBotUnmatchedIntent` + `WhatsAppBotUnitUsage` موجودان).

### M9 — الصلاحيات والحوكمة (RBAC + Audit) — §3.

### M10 — مركز الإعدادات والتكاملات (Settings)

- 🔴 جديد: صفحة إعدادات: الأرقام/القناة، ساعات الرد، سياسة التواصل، إدارة القوالب، إعدادات الأتمتة، حالة جودة الرقم (Meta quality rating)، إدارة الموافقات الجماعية. (الأعلام البيئية موجودة؛ ينقص سطح UI لإدارتها).

---

## 3) خريطة الأدوار والصلاحيات (Roles & Permissions)

**المبدأ:** لا نظام صلاحيات جديد. نستعمل محرك `authorization/can.js` الموجود (9 archetypes × 75 perm × 55 role) ونضيف **مساحة أسماء `whatsapp:*`** إلى `permissions.registry` فقط.

### مفاتيح الصلاحيات المقترحة (تُضاف إلى الـ registry)

| المفتاح                         | الوصف                                      | يحرس                              |
| ------------------------------- | ------------------------------------------ | --------------------------------- |
| `whatsapp:inbox:view`           | عرض Inbox + المحادثات (ضمن الفرع)          | قائمة/تفاصيل المحادثات            |
| `whatsapp:message:send`         | إرسال رسالة/قالب يدوي                      | `POST /send/*`                    |
| `whatsapp:conversation:assign`  | تعيين/تحويل محادثة                         | `POST /conversations/:id/assign`  |
| `whatsapp:conversation:resolve` | إغلاق/حلّ محادثة                           | `POST /conversations/:id/resolve` |
| `whatsapp:notes:internal`       | كتابة/عرض الملاحظات الداخلية               | حقل `internalNotes`               |
| `whatsapp:beneficiary:context`  | عرض سياق المستفيد الحساس في الشريط الجانبي | شريط السياق التأهيلي              |
| `whatsapp:campaign:manage`      | إنشاء/جدولة حملات وبثّ                     | `WhatsAppCampaign` + broadcast    |
| `whatsapp:template:manage`      | مزامنة/اعتماد القوالب                      | templates + template-requests     |
| `whatsapp:automation:manage`    | تحرير event bindings + التدفقات            | Flow/Bindings UI                  |
| `whatsapp:consent:manage`       | إدارة موافقات/إلغاء اشتراك                 | consent APIs                      |
| `whatsapp:dlq:manage`           | إعادة/إهمال طابور الفشل                    | DLQ APIs                          |
| `whatsapp:settings:manage`      | إعدادات القناة/التكاملات                   | Settings                          |
| `whatsapp:analytics:view`       | لوحة KPIs والتحليلات                       | analytics + dashboard             |

### خريطة الدور ← الصلاحية (مطابقة لـ archetypes الموجودة)

| الدور                      |     inbox:view     |  message:send   |  assign   | resolve | notes:internal | beneficiary:context | campaign:manage | template/automation | consent | dlq | settings | analytics |
| -------------------------- | :----------------: | :-------------: | :-------: | :-----: | :------------: | :-----------------: | :-------------: | :-----------------: | :-----: | :-: | :------: | :-------: |
| **إدارة المركز** (HQA/BRM) |         ✓          |        ✓        |     ✓     |    ✓    |       ✓        |          ✓          |        ✓        |          ✓          |    ✓    |  ✓  |    ✓     |     ✓     |
| **مشرف** (BRD/Supervisor)  |         ✓          |        ✓        |     ✓     |    ✓    |       ✓        |          ✓          |        ✓        |          ✓          |    —    |  ✓  |    —     |     ✓     |
| **أخصائي** (Therapist)     | ✓ (محادثات حالاته) |        ✓        | ✓ (تحويل) |    ✓    |       ✓        |   ✓ (حالاته فقط)    |        —        |          —          |    —    |  —  |    —     |   جزئي    |
| **استقبال** (Reception)    |         ✓          |        ✓        |     ✓     |    ✓    |       —        |   محدود (لا حساس)   |        —        |          —          |    —    |  —  |    —     |     —     |
| **تحصيل** (Finance)        |   ✓ (مالية فقط)    | ✓ (قوالب فوترة) |     —     |    ✓    |       —        |    محدود (مالي)     |        —        |          —          |    —    |  —  |    —     |   جزئي    |
| **دعم فني** (SYS/SUP)      |         ✓          |        —        |     —     |    —    |       —        |          —          |        —        |          ✓          |    —    |  ✓  |    ✓     |     ✓     |

**قواعد إضافية مفروضة في الكود (موجودة):**

- **عزل الفرع:** كل قراءة عبر `effectiveBranchScope(req)` — الأخصائي يرى محادثات فرعه فقط؛ والأخصائي يُقيَّد إضافيًا بحالاته (caseload guard على نمط W269d عند الحاجة).
- **عزل الحالات الحساسة:** `beneficiary:context` و`notes:internal` صلاحيتان منفصلتان — الاستقبال/التحصيل لا يريان الملاحظات السريرية الحساسة.
- **MFA على التحوّلات الحرجة:** اعتماد قالب، إطلاق حملة جماعية، وإلغاء اشتراك جماعي ← `requireMfaTier` (نمط ADR-019) + `enforceMfa:true` في طبقة الخدمة.
- **Audit Log كامل:** كل تعيين/تحويل/إرسال/حملة/تغيير موافقة يُسجَّل (نمط hash-chain الموجود).

**كيفية الإضافة (من التدقيق):** أضف المفتاح إلى `permissions.registry` ← اربطه بالـ archetype(s) ← احرس نقطة الحماية بـ `can(user, 'whatsapp:...')` ← seed عبر `seeds/roles-permissions.seed.js`.

---

## 4) رحلات المستخدم عبر واتساب (User Journeys)

### 4.1 الأهل / الولي (Parent) — عبر واتساب الجوّال

```text
رسالة "مرحبا" → بوت FSM يرحّب + قائمة تفاعلية (W1381) [لغة لزجة عربي/إنجليزي W1383]
 ├─ "1 تسجيل حالة جديدة" → جمع (اسم، عمر، تشخيص، جوال) → PublicBookingRequest + حجز تقييم
 ├─ "2 موعدي القادم" → (بعد تحقّق ولي) → استعلام ClinicalSession الحيّ → عرض + زرّي [تأكيد][تغيير]
 ├─ "3 تقرير التقدّم" → استعلام GeneratedReport → إرسال PDF (sendDocument)
 ├─ "4 فاتورتي" → استعلام Invoice → الرصيد + رابط دفع (payment-gateway)
 ├─ "5 شكوى/اقتراح" → تدفّق → Complaint (مصدر=parent) + تصعيد + تتبّع حالة عكسي
 ├─ "6 تمارين منزلية" → HOME_EXERCISES حسب قسم المستفيد
 └─ نص حرّ غير مطابق → classifyIntent → رد ذكي أو تصعيد لموظف + التقاط العبارة (W1417)

تلقائيًا (Push): تذكير موعد (قبل يوم + ساعات) · تأكيد/إلغاء · ملخّص بعد الجلسة + واجب ·
 تقرير شهري · رسالة سياسة غياب عند no-show · حملة توعوية مستهدفة.
الأهل يردّون بفيديو تمرين منزلي → وسائط وارد → يُربَط بالأخصائي للتقييم.
```

### 4.2 الأخصائي (Therapist) — عبر web-admin Inbox

```text
يفتح Inbox → يرى محادثات حالاته (مرشّحة بالفرع + caseload) مرتّبة بالإلحاح
 → يفتح محادثة → الشريط الجانبي: تشخيص + الخطة + الأهداف النشطة + الجلسات + الحضور
 → يقرأ تلخيص AI للمحادثة الطويلة → يستخدم "ردًّا ذكيًا" مقترحًا أو يكتب يدويًا
 → يكتب ملاحظة داخلية (لا تظهر للأهل) → يربط المحادثة بجلسة/هدف
 → يستقبل فيديو تمرين منزلي من الأهل → يقيّمه → يردّ بتوجيه
 → عند الحاجة: يحوّل المحادثة لأخصائي آخر/مشرف (مع سبب + Audit) → يحلّها.
```

### 4.3 الإدارة / المشرف (Management) — عبر web-admin Dashboard

```text
لوحة KPIs: حجم المحادثات · زمن الاستجابة · نسبة الحضور بعد التذكير · انخفاض الغياب ·
 التزام الواجبات · NPS الأسر · أثر الحملات
 → يطلق حملة توعوية مستهدفة (شريحة حسب التشخيص) ويقيس أثرها
 → يعتمد/يرفض قوالب جديدة (template-requests) [MFA]
 → يحرّر event bindings (أتمتة) → يراجع طابور pending-review والتصعيدات الحرجة
 → يراجع Audit Log + بصائر البوت (عبارات غير مطابقة → يضبط الكلمات المفتاحية).
```

### 4.4 موظف الاستقبال (Reception) — عبر web-admin Inbox

```text
يرى الطابور العام (دون الملاحظات السريرية الحساسة) → يردّ على الاستفسارات الإدارية
 (مواعيد، رسوم، أوراق) بقوالب جاهزة → ينشئ/يحجز مواعيد → يحوّل الطلبات السريرية
 للأخصائي المختص → يحوّل المالية للتحصيل → يصعّد الطوارئ فورًا.
```

---

## 5) نموذج الكيانات/الجداول (Entity Model — الموجود + المقترح)

### الكيانات الموجودة (لا تُكرَّر — تُشار إليها بـ ref فقط)

`WhatsAppConversation` · `WhatsAppConsent` · `WhatsAppContactGroup` · `WhatsAppDlq` · `WhatsAppSyncTemplate` · `WhatsAppBotUnmatchedIntent` · `WhatsAppBotUnitUsage` — **كلها مبنية**. ونماذج النواة: `Beneficiary` · `ClinicalSession` · `UnifiedCarePlan` · `TherapeuticGoal` · `GeneratedReport` · `Complaint` · `Invoice` · `Vehicle` · `Notification` · `Consent` · `CareTimeline`.

### مخطّط العلاقات (كيف ترتبط القناة بالنواة)

```text
Beneficiary 1───* WhatsAppConversation *───1 Branch (عزل)
   │  (beneficiaryId, episodeId, familyMemberId refs — موجودة على المحادثة)
   ├──< ClinicalSession        (تذكير/تأكيد/no-show ثنائي الاتجاه)
   ├──< UnifiedCarePlan        (تفعيل خطة → رسالة أهداف)
   ├──< TherapeuticGoal        (تقدّم هدف → ملخّص للأهل + KPI)
   ├──< GeneratedReport        (تقرير نهائي → sendDocument)
   ├──< Complaint              (شكوى بوت → تذكرة → تتبّع عكسي)
   ├──< Invoice                (فاتورة → رصيد + رابط دفع)
   └──< CareTimeline           (كل sideEffect → حدث في الخطّ الزمني — W1408)

WhatsAppConsent (phone unique) ── يحكم كل إرسال (assertCanMessage)
WhatsAppContactGroup *──* members(phone, beneficiaryId) ── مصدر شرائح الحملات
```

### الإضافات المقترحة (🔴/🟡 فقط — حد أدنى، لا تكرار)

**(أ) حقول تُضاف إلى `WhatsAppConversation` (🟡 توسيع نموذج موجود):**

```js
internalNotes: [{ text, authorId: {ref:'User'}, createdAt, visibility:'internal' }],  // 🔴 M2
linkedTicketId:  { type: ObjectId, ref: 'Complaint' },     // ربط بتذكرة
linkedSessionId: { type: ObjectId, ref: 'ClinicalSession' },// ربط بجلسة
transferLog: [{ fromUserId, toUserId, reason, at }],        // 🔴 سجل تحويل (Audit)
```

**(ب) نموذج جديد `WhatsAppCampaign` (🔴 M7 — الفجوة الوحيدة لنموذج جديد):**

```js
{
  name, branchId: {ref:'Branch', index},                    // عزل
  status: enum['draft','scheduled','running','completed','cancelled'],
  audience: {                                                // استهداف شرائح
    contactGroupId: {ref:'WhatsAppContactGroup'},
    segmentRules: { diagnosis:[...], planType:[...], ageRange:{} } // حسب تشخيص/خطة
  },
  templateName, templateParams,
  scheduledAt, recurrence: enum['none','weekly','monthly'],  // جدولة
  metrics: { targeted, eligible, sent, delivered, read, replied, optedOut }, // أثر
  outcomeLinks: { workshopRegistrations, attendanceUplift }, // ربط بمخرجات
  createdBy: {ref:'User'}, timestamps
}
// فهارس: {branchId, status, scheduledAt} · TTL لا — سجل تدقيق
```

**(ج) نموذج جديد خفيف `WhatsAppEventBinding` (🟡 M5 — إن لم يكن مخزَّنًا بعد):**

```js
{ branchId, coreEvent: 'session.scheduled'|'careplan.activated'|'invoice.issued'|
  'complaint.status_changed'|'report.finalized', templateName, enabled:Boolean,
  delayMinutes, conditions: {}, createdBy }                  // يدير الأتمتة بلا كود
```

> **ملاحظة منع التكرار:** البثّ، المجموعات، الموافقة، DLQ، القوالب، إثراء AI، حالة البوت — **كلها موجودة**. الإضافات أعلاه هي _حقول على نموذج موجود_ + _نموذجَا حملة/ربط_ فقط. لا يُنشأ نموذج محادثة/رسالة/موافقة جديد.

---

## 6) قائمة APIs و Webhooks (الموجود + المطلوب)

### 6.1 Webhooks مع Meta WhatsApp Business API (✅ مبنية)

| الاتجاه          | المسار                                                     | الوصف                                                               | الحالة |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- | ------ |
| Inbound (verify) | `GET /api/whatsapp/webhook`                                | تحدّي تحقّق Meta (`hub.challenge`، W1424 fix)                       | ✅     |
| Inbound (events) | `POST /api/whatsapp/webhook`                               | رسائل + حالات تسليم، تحقّق HMAC `X-Hub-Signature-256` (fail-closed) | ✅     |
| Outbound         | `POST https://graph.facebook.com/v21.0/{phoneId}/messages` | عبر `whatsappService` (+ `APPSECRET_PROOF` W1425، retry)            | ✅     |

### 6.2 APIs داخلية للقناة (✅ مبنية — عيّنة من ~50+)

`/conversations` (list/:id/resolve/assign/mark-read/pending-review) · `/send/{text,template,document,interactive}` · `/bulk` · `/ai/{classify,suggest-replies,summarize,insights}` · `/templates` (+ `/sync`, `/synced`, `/meta`, قوالب التأهيل الجاهزة) · `/consent/:phone/{opt-in,opt-out,can-message}` · `/contact-groups` (CRUD + members + broadcast + CSV + dedupe) · `/dlq` (list/replay/abandon/sweep) · `/rate-limit/:phone` · `/bot/{unmatched-intents,usage}` · `/analytics` · `/status` · `/event-bindings`.

### 6.3 APIs الجديدة/الموسّعة المطلوبة (🔴/🟡)

| المسار                                                        | الوصف                                 | الحالة | يربط بـ                                               |
| ------------------------------------------------------------- | ------------------------------------- | ------ | ----------------------------------------------------- |
| `GET /conversations/:id/context`                              | سياق المستفيد التأهيلي للشريط الجانبي | 🔴 M2  | Beneficiary, CarePlan, Goal, ClinicalSession, Invoice |
| `POST /conversations/:id/notes`                               | ملاحظة داخلية                         | 🔴 M2  | `internalNotes`                                       |
| `POST /conversations/:id/transfer`                            | تحويل + سبب + Audit                   | 🟡 M2  | `transferLog`                                         |
| `POST /conversations/:id/link`                                | ربط بتذكرة/جلسة                       | 🔴 M2  | linked\*                                              |
| `GET/POST /campaigns` `+ /:id/{schedule,send,metrics,cancel}` | إدارة الحملات + جدولة + أثر           | 🔴 M7  | `WhatsAppCampaign`                                    |
| `GET/PUT /event-bindings` (تحرير)                             | باني الأتمتة                          | 🟡 M5  | `WhatsAppEventBinding`                                |
| `GET /analytics/rehab-outcomes`                               | KPIs مربوطة بالتأهيل                  | 🔴 M8  | ClinicalSession, Goal, NpsResponse                    |
| `GET /settings` / `PUT /settings`                             | إعدادات القناة/التكاملات              | 🔴 M10 | env + config                                          |

### 6.4 تكامل ناقل الأحداث (🟡 وصل — البنية موجودة)

**استهلاك (لإطلاق رسائل آلية):**

```js
integrationBus.subscribe('sessions.session.scheduled',  → sendTemplate('session_reminder'))
integrationBus.subscribe('care-plans.careplan.activated', → sendTemplate('plan_goals'))
integrationBus.subscribe('reports.report.finalized',    → sendDocument(GeneratedReport.pdf))
integrationBus.subscribe('finance.invoice.issued',      → sendTemplate('payment_due'))
integrationBus.subscribe('complaints.complaint.status_changed', → notify parent)
```

**نشر (لمستهلكي النواة):**

```js
integrationBus.publish('whatsapp', 'message.received', {...})
integrationBus.publish('whatsapp', 'conversation.escalated', {...})
integrationBus.publish('whatsapp', 'campaign.completed', {...})
```

> كل عقد حدث جديد يلزمه (دوكترين المشروع): (1) drift guard ثابت، (2) اختبار سلوكي للظرف، (3) اختبار تكامل عبر آلية التسليم الفعلية.

---

## 7) سيناريوهات الأتمتة + مؤشرات الأداء (Automation + KPIs)

### 7.1 سيناريوهات الأتمتة (كثير منها ✅ في بوت FSM؛ المجدوَل 🔴)

| السيناريو           | المُطلِق                           | الإجراء                                         | الحالة     |
| ------------------- | ---------------------------------- | ----------------------------------------------- | ---------- |
| استقبال حالة جديدة  | نص بوت "تسجيل"                     | جمع بيانات → `PublicBookingRequest` → حجز تقييم | ✅ W1384   |
| متابعة خطة جديدة    | حدث `careplan.activated`           | إرسال الأهداف + الجدول + أول موعد + تعليمات     | 🟡 binding |
| ما بعد الجلسة       | حدث `session.completed`            | ملخّص قصير + تمرين منزلي + تذكير الجلسة القادمة | 🟡 binding |
| تذكير موعد ثنائي    | حدث `session.scheduled` (−24h/−3h) | تذكير + زرّا [تأكيد][تغيير] → مزامنة الحضور     | 🟡 توسيع   |
| غياب (No-show)      | حدث `session.no_show`              | رسالة سياسة + التماس سبب → `attendance.excused` | 🟡 توسيع   |
| متابعة غياب متكرّر  | جدولة (sweeper)                    | تنبيه + طلب سبب + حلول (تغيير وقت/نقل/استشارة)  | 🔴 جديد    |
| حملة توعوية مستهدفة | جدولة حملة                         | بثّ مُقسَّم (تشخيص/خطة) + قياس أثر              | 🔴 M7      |
| تتبّع شكوى          | حدث `complaint.status_changed`     | إشعار الأهل بالحالة (استلام/معالجة/حل)          | 🟡 binding |
| استبيان رضا (NPS)   | حدث `episode.milestone` أو دوري    | إرسال استبيان → `NpsResponse`                   | ✅ W1384   |
| تذكير دفع           | حدث `invoice.issued`/overdue       | قالب فاتورة + رابط دفع                          | 🟡 binding |

**AI داخل الأتمتة (✅ موجود):** تصنيف نوع الطلب (إداري/تأهيلي/طارئ/شكوى) → توجيه؛ تلخيص المحادثات الطويلة للأخصائي؛ اقتراح ردود؛ استخراج كيانات (تاريخ/وقت/اسم). توسعة مستقبلية: ربط RAG (`/api/rag`) للأسئلة السياساتية (موجود في النواة W283).

### 7.2 مؤشرات الأداء (KPIs) — قناة واتساب في سياق التأهيل

**مؤشرات تشغيلية للقناة (✅ معظم البيانات متاحة):**

- حجم المحادثات (وارد/صادر) · زمن الاستجابة الأول (FRT) · زمن الحل (TTR) · معدّل الردّ الآلي مقابل البشري · طابور pending-review · معدّل التصعيد · جودة الرقم (Meta quality rating) · معدّل تسليم/قراءة الرسائل · حالات DLQ.

**مؤشرات مرتبطة بمخرجات التأهيل (🔴 الربط الجديد — جوهر القيمة):**

- **نسبة الحضور بعد التذكير** = جلسات حضرت بعد تذكير واتساب ÷ جلسات ذُكّرت.
- **انخفاض نسبة الغياب (No-show)** قبل/بعد تفعيل تذكيرات واتساب.
- **التزام الأسرة بالواجبات المنزلية** = ردود/فيديوهات تمارين مستلمة ÷ واجبات مُرسَلة.
- **تقدّم الأهداف** = تحسّن `TherapeuticGoal` للأسر النشطة على واتساب مقابل غير النشطة.
- **رضا الأسر (NPS)** عبر استبيانات واتساب.
- **المشاركة في البرامج الجماعية** المنسوبة لحملات واتساب (تسجيل ورش/دورات).
- **أثر الحملات** = مشاهدة/ردّ/تحويل (حضور فعلي) لكل حملة.

> هذه المؤشرات تتطلّب تجميعًا متقاطعًا (`GET /analytics/rehab-outcomes`) بين `WhatsAppConversation` و`ClinicalSession`/`TherapeuticGoal`/`NpsResponse` — وهو ما يفرّق هذه اللوحة عن أي لوحة واتساب عامة.

---

## 8) توصيات UX/UI (لوحة واتساب داخل web-admin — RTL/عربي)

**الإطار:** Next.js 15 + `@alawael/ui` (RTL، علامة Al-Awael: navy/orange/green + خط Tajawal). **يُعاد استخدام** primitives الموجودة: `Stat`, `Badge`, `Button`, `Card`, `Tabs`, `MessageList`, `PageHeader`, `EmptyState`. لا مكتبة UI جديدة.

**التخطيط (Inbox ثلاثي الأعمدة، RTL — التدفّق يمين→يسار):**

```text
┌── يمين: قائمة المحادثات ──┬── وسط: خيط الرسائل ──┬── يسار: سياق المستفيد التأهيلي ──┐
│ بحث + فلاتر (إلحاح/حالة) │ MessageList + شارات   │ التشخيص · الخطة النشطة          │
│ شارات: غير مقروء/إلحاح   │ نية/مشاعر/تسليم        │ الأهداف النشطة · الأخصائيون      │
│ مرتّبة urgencyRank ↓     │ تلخيص AI (محادثة طويلة)│ الجلسات القادمة + الحضور         │
│                         │ ردود ذكية مقترحة       │ الفواتير المعلّقة                │
│                         │ مؤلّف رد + تنبيه 24h    │ تبويب "ملاحظات داخلية" (صلاحية)  │
└─────────────────────────┴───────────────────────┴─────── أزرار: تحويل · ربط · حلّ ──┘
```

**مبادئ UX خاصة بكثافة بيانات التأهيل:**

1. **تنبيهات الكسر بالأحمر** (نمط المشروع `bg-red-50` + حدّ أحمر): تصعيد حرج، طوارئ، غياب متكرّر، نافذة 24h على وشك الإغلاق، رقم منخفض الجودة.
2. **سياق دون مغادرة:** شريط جانبي يجلب من النواة بـ `Promise.allSettled` — لا تنقّل بعيدًا عن المحادثة.
3. **خصوصية مرئية:** تبويب "ملاحظات داخلية" مخفيّ عمّن لا يملك `whatsapp:notes:internal`؛ بيانات حساسة وراء `whatsapp:beneficiary:context`.
4. **لغة لزجة:** احترام `botFlow.lang` (عربي افتراضي، W1383) في عرض المحادثة.
5. **أفعال سياقية فقط:** أزرار التحوّل المتاحة حسب الحالة الراهنة (نمط صفحات التأهيل في web-admin).
6. **جوّال أولًا للأخصائي:** Inbox يطوي إلى عمود واحد على الجوّال؛ الأهل أصلًا على واتساب الجوّال.
7. **لوحة KPIs:** شريط `Stat` علوي + رسوم اتجاه (حضور بعد التذكير، انخفاض غياب) + جدول "أكثر الاستفسارات" من `WhatsAppBotUnmatchedIntent`.
8. **تحديث لحظي (🔴 اختياري):** SSE/WebSocket لعدّاد غير المقروء (حاليًا لقطة عند الجلب).

**صفحات web-admin المقترحة (توسعة المسار الموجود `(dashboard)/communications/whatsapp/`):**

- `page.tsx` (Inbox) ✅ — يُوسَّع بالشريط الجانبي + الملاحظات + التحويل.
- `[id]/page.tsx` ✅ — يُوسَّع بسياق `/conversations/:id/context`.
- `templates/` ✅ · `dlq/` ✅ — موجودتان.
- `dashboard/` 🔴 — لوحة KPIs المرتبطة بالتأهيل.
- `campaigns/` 🔴 — قائمة + إنشاء + جدولة + أثر.
- `automation/` 🔴 — باني event bindings.
- `settings/` 🔴 — القناة/التكاملات/الموافقات.

---

## 9) خطة التنفيذ على موجات (Waves) — بناء الفجوة فقط

> كل موجة = commit ذرّي (model/field + route + binding + drift guard ثابت + سلوكي) على نمط المشروع. الترقيم يُؤخذ وقت الـ commit (تحقّق من `git log` + `check:wave-collision`).

| #   | الموجة                                      | الوسم | النطاق                                                                  | المخرَج |
| --- | ------------------------------------------- | ----- | ----------------------------------------------------------------------- | ------- |
| 1   | شريط السياق التأهيلي                        | 🟡/🔴 | `GET /conversations/:id/context` + توسيع `[id]/page.tsx`                | M2      |
| 2   | ملاحظات داخلية + تحويل + ربط                | 🔴/🟡 | حقول `internalNotes/transferLog/linked*` + endpoints + UI + صلاحيات     | M2      |
| 3   | مزامنة المواعيد ثنائية الاتجاه              | 🟡    | webhook interactive → `ClinicalSession.attendance` + تدفّق no-show      | M3      |
| 4   | توصيل التقارير + bindings الأساسية          | 🟡    | وصل `report.finalized`/`session.completed`/`careplan.activated` → قوالب | M4/M5   |
| 5   | `WhatsAppEventBinding` + باني الأتمتة       | 🟡    | نموذج + `automation/` UI + جدولة                                        | M5      |
| 6   | استعلامات بيانات حيّة للبوت                 | 🟡    | وصل `LOOKUP_ATTENDANCE/REPORT/BILLING` بعد `resolveGuardian`            | M5      |
| 7   | `WhatsAppCampaign` + جدولة + استهداف        | 🔴    | نموذج + scheduler + `campaigns/` UI + قياس أثر                          | M7      |
| 8   | لوحة KPIs التأهيلية                         | 🔴    | `GET /analytics/rehab-outcomes` + `dashboard/` UI                       | M1/M8   |
| 9   | إعدادات + إدارة موافقات + opt-out responder | 🔴/🟡 | `settings/` + consent UI                                                | M10     |
| 10  | جدولة مزامنة القوالب + أرشفة المحادثات      | 🔴    | cron 6h لـ templateSync + استراتيجية أرشفة >500 رسالة                   | تصلّب   |

### ما يجب **عدم** بنائه (موجود — يُمنع التكرار صراحةً)

- ❌ تكامل Meta API / إرسال / قوالب / OTP — موجود في `whatsappService` + `whatsappTemplates`.
- ❌ webhook / تحقّق توقيع / تصنيف نية / رد آلي — موجود.
- ❌ بوت قائمة / FSM / حالة / ثنائي اللغة — موجود (`whatsapp-bot-flow.*`).
- ❌ نموذج محادثة/رسالة/موافقة/مجموعة/DLQ — موجود (7 نماذج).
- ❌ بثّ مجموعات / استيراد CSV / معاينة أهلية — موجود.
- ❌ rate-limit / idempotency / DLQ sweeper — موجود.
- ❌ صفحات Inbox/تفاصيل/قوالب/DLQ في web-admin — موجودة (تُوسَّع لا تُعاد).
- ❌ نظام صلاحيات جديد — يُعاد استخدام `can.js` بإضافة مفاتيح `whatsapp:*` فقط.
- ❌ واجهة `66666/frontend` القديمة (MUI) — ميتة بدوكترين المشروع.

---

## 10) الامتثال والمخاطر (موجزة)

- **PDPL/الخصوصية:** موافقة مسجّلة (سبب + وقت + قناة) في `WhatsAppConsent`؛ نافذة خدمة 24h محترمة (Meta)؛ TTL 30 يوم على DLQ/البصائر؛ الملاحظات الحساسة بصلاحية منفصلة. **توسعة:** opt-out auto-responder + استثناء رسائل الطوارئ من الإيقاف.
- **عزل المستأجر:** `effectiveBranchScope`/`branchFilter` على كل قراءة (W1407/W1412)؛ منع `req.branchId` (W269h).
- **الموثوقية:** رد webhook فوري 200 + معالجة غير متزامنة؛ DLQ + backoff أسّي؛ idempotency ضد إعادة المحاولة وcron.
- **الأمان:** HMAC `X-Hub-Signature-256` fail-closed؛ `APPSECRET_PROOF`؛ MFA على التحوّلات الحرجة؛ Audit كامل.
- **المخاطر المفتوحة:** أرشفة المحادثات الكبيرة (>500 رسالة)؛ ضبط NLU يدوي (مراجعة `unmatched-intents`)؛ اعتماد قوالب Meta يستغرق وقتًا (خطّط مسبقًا).

---

### المراجع داخل المشروع

- الكود: `66666/backend/services/whatsapp/*` · `intelligence/whatsapp-bot-flow.*` · `models/WhatsApp*.js` · `routes/whatsapp*.routes.js` · `routes/registries/communication.registry.js`.
- الواجهة: `alawael-rehab-platform/apps/web-admin/src/app/(dashboard)/communications/whatsapp/*` · `lib/whatsapp-api.ts`.
- النواة: `models/Beneficiary.js` · `domains/sessions` · `domains/care-plans` · `domains/reports` · `models/{Complaint,Invoice,Consent,Notification}.js` · `middleware/assertBranchMatch.js` · `authorization/can.js` · `integration/systemIntegrationBus.js`.
- وثائق شقيقة: [`MENU_BOT.md`](./MENU_BOT.md) · [`SETUP_AND_OTP.md`](./SETUP_AND_OTP.md) · `docs/blueprint/00-master-architecture.md`.
  </content>
  </invoke>
