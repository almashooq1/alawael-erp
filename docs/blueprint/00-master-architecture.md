# 00 — المخطط المعماري الرئيسي · Master Architecture Spec

> هذا هو المرجع الموحَّد للوحة التحكم في ALAWAEL. يدمج البرومبت الأساسي الرئيسي مع الإضافات الإلزامية الأربع.
>
> This is the unified reference for the ALAWAEL dashboard system. It consolidates the original core prompt with the four mandatory extension pillars.

---

## القسم الأول · البرومبت الأساسي الرئيسي

## Section I — The Core Prompt

### 1. الدور · Role

Principal Product Architect لإعادة تصميم نظام لوحات التحكم في منصة ALAWAEL — منظومة ERP تشغيلية وسريرية لمراكز إعادة التأهيل والرعاية اليومية في المملكة العربية السعودية.

Principal Product Architect for redesigning the ALAWAEL dashboard system — an operational + clinical ERP for rehabilitation and day-care centers in Saudi Arabia.

### 2. الواقع الحالي · Existing baseline (pre-Wave 11)

عند بدء العمل، كان النظام يحتوي على:

- 305 صفحة UI (web-admin)
- 103 رابط في الـ sidebar
- 39 KPI في `kpi.registry.js`
- 39 red-flag سريري
- 5 قواعد تنبيه أساسية (Phase 11 baseline)

When work began, the system shipped: 305 admin pages, 103 sidebar links, 39 KPIs, 39 clinical red-flags, 5 baseline alert rules.

### 3. القيود الحاكمة · Governing constraints

```
1. لا إعادة كتابة شاملة — التطوير تدريجي طبقي (wave-by-wave)
2. عربية أولاً (Arabic-first, RTL) مع تكافؤ إنجليزي عند الحاجة
3. كل ميزة جديدة opt-in عبر env flag — لا تعطّل ما يعمل
4. كل قرار قابل للقياس + مدقَّق (every decision auditable)
5. اللوحة الموحَّدة سطحياً مرفوضة — التخصيص حسب الدور إلزامي
6. لا 3rd-party LLM يستقبل PHI أو مالية أو HR — قاعدة صلبة
```

### 4. مبدأ التصميم الجوهري · Core design principle

> اللوحة ليست عرضاً سلبياً للبيانات. اللوحة أداة قرار يومية. كل عنصر يجب أن يقود إلى:
> `explanation → breakdown → owner → next action → related records`.
>
> The dashboard is not a passive view. It's a daily decision instrument. Every element must lead to explanation, breakdown, owner, next-action, related records.

---

## القسم الثاني · الإضافات الإلزامية الأربع

## Section II — The Four Mandatory Additions

### 1️⃣ إضافة التنبيهات الذكية · Smart Alerts Addition

> **القاعدة**: لا ذكاء غامض. كل تنبيه قابل للتنفيذ، ذو معنى، واعٍ للدور، وحساس للوقت.
>
> **Rule**: No vague AI. Every alert is actionable, meaningful, role-aware, and time-sensitive.

**الذي تم تسليمه (Waves 11-16):**

| المحور                 | المحتوى                                                                                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **التصنيف (Taxonomy)** | 4 درجات شدة (critical/high/medium/low/info) × 6 فئات (clinical/financial/operational/quality/hr/compliance) × 6 أنماط (threshold/deadline/state/absence/anomaly/composite) × 4 ضغوط زمنية (immediate/hours/days/watching) × 4 نطاقات (entity/branch/region/platform) |
| **قواعد العمل**        | 19 قاعدة تنبيه: 5 baseline + Wave 3 (10) + Wave 5 (4) — تشمل document-expiring, pdpl-dsar-sla, care-plan-unsigned, vaccination-overdue, credential-expired, invoice-overdue-90d, incident-critical-open-24h, kpi-anomaly                                             |
| **نموذج الملكية**      | role-resolved owner chain: assigned user → primary role (e.g. `care_manager`) → category fallback chain → super_admin                                                                                                                                                |
| **التصعيد**            | 3-tier escalation engine: tier 1 → 2 → 3 على timer قابل للضبط. Tier 3 + critical/high يفرض SMS عبر `unifiedNotifier` (single-line wiring: `app._resolveUsersForRole`)                                                                                                |
| **سير العمل**          | 7 إجراءات تشغيلية: acknowledge / assign / snooze (5min-7d) / mute (1h-30d, branch_manager+) / resolve / comment / reopen — كلها idempotent + AuditLog-bound                                                                                                          |
| **أنماط الواجهة**      | 8 dashboard surfaces (executive/branch/clinical/hr/finance/quality/dpo/me) — كل واحدة مفلترة + PII-masked حسب 5 viewer levels                                                                                                                                        |
| **التكامل**            | 393 backend tests / 24 suites. مفاتيح الإنتاج: `ALERTS_ENGINE_ENABLED`, `ALERTS_ESCALATION_ENABLED`, `app._resolveUsersForRole` (callback واحد يفعّل كل شيء)                                                                                                         |

📁 المراجع: [[alert-priority-engine-2026-05-16]] · `docs/blueprint/12-*` · 8 ملفات Wave 11-16 تحت `backend/alerts/`

---

### 2️⃣ إضافة الذكاء التشغيلي · Operational Intelligence Addition

> **القاعدة**: ذكاء قابل للتفسير، بدرجة ثقة، بأسباب، مع رابط للتفاصيل، مع قدرة dismiss/confirm.
>
> **Rule**: Explainable intelligence with confidence labels, reasoning, deepLink to detail, and dismiss/confirm capability.

**الذي تم تسليمه (Waves 18-20):**

| المحور                     | المحتوى                                                                                                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **الضمانات الخمس G**       | كل insight يجب أن يحوي (يفشل عند validateSync بدونها): G1 ≥ 2 reasoning bullets ثنائي اللغة · G2 supporting facts ≠ فارغ · G3 confidence factors ≠ فارغ · G4 deepLink أو suggestedAction · G5 inputDigest = 40-char SHA1 hex. كل ضمانة لها مفتاح خطأ مستقل (`err.errors.G1.message`) |
| **المولّدات (Generators)** | 3 مولّدات منتجة + 7 مصمَّمة: ✅ care-gap.v1 (3 فحوصات) ✅ anomaly.v1 (Western Electric Z-score) ✅ trend-deviation.v1 (slope reversal + acceleration) · ⏳ risk-score / opportunity / workflow-delay / branch-underperform / attendance-risk / executive-digest / weekly-summary     |
| **الـ Insight Model**      | 10 INSIGHT_KINDS · 4 severity · 6 categories · 4 scopes · 5 source types (rule/statistical/llm/hybrid). dedup صارم على `(generatorId, inputDigest)` خلال state ∈ {active, confirmed}. Critical يُرقَّى تلقائياً إلى Alert                                                            |
| **الأوامر التشغيلية**      | confirm/dismiss/note/resolve — كلها idempotent. dismiss يتطلب `reasonCode` (acted-on/noise/duplicate/wrong-target/not-applicable/other) يغذي **generator scoreboard** للجودة                                                                                                         |
| **الـ Orchestrator**       | runTick / runGenerator(id) / runOne / getMetrics / listGenerators. عزل صارم: loader throw أو evaluate throw يُلتقط ويُحسب ولا يكسر الـ tick. Cap أمان: 500 payload/generator/tick                                                                                                    |
| **HTTP API**               | `/api/v1/insights` — 7 endpoints (list + scoreboard + get + confirm/dismiss/note/resolve). جاهز للإنتاج، خلف authenticate                                                                                                                                                            |
| **التكامل**                | 96 backend tests / 4 suites. orchestrator boot ينتظر Wave 27 خلف env flag `INTELLIGENCE_ORCHESTRATOR_ENABLED`                                                                                                                                                                        |

📁 المراجع: [[intelligence-layer-2026-05-17]] · `docs/blueprint/00-intelligence-design.md` (موحَّد في هذه الوثيقة) · `backend/intelligence/`

---

### 3️⃣ إضافة جودة البيانات · Data Quality Addition

> **القاعدة**: لا أعرض بياناً تنفيذياً أو سريرياً بدون مؤشرات ثقة وجودة. أي KPI حساس يجب أن يكون مصحوباً بحالة جودة البيانات.
>
> **Rule**: No executive or clinical data is rendered without trust+quality indicators. Sensitive KPIs MUST carry a data quality status.

**الذي تم تسليمه (Wave 22):**

| المحور                   | المحتوى                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **الأبعاد الثمانية**     | freshness · timeliness · completeness · validity · consistency · uniqueness · source · aiConfidence (null للـKPIs الحتمية). كل بُعد ٠..١ + كل بُعد له **إجراء تشغيلي مميز** عند الفشل             |
| **المستويات الخمسة**     | excellent (≥0.9) · good (≥0.75) · fair (≥0.6) · poor (≥0.4) · critical (<0.4). **القيمة تُخفى (mask) للتنفيذيين** عند critical إذا كان `maskOnCritical: true` (افتراضياً للسريري/المالي/الامتثال) |
| **الأوزان حسب الفئة**    | finance يثقّل consistency=3 · compliance يثقّل completeness/validity=3 · clinical يثقّل validity=3 · operational يثقّل freshness/timeliness=2                                                     |
| **كتالوج المصادر**       | 8 فئات: prod_api 1.0 → prod_db 1.0 → ingest_pipeline 0.95 → etl_batch 0.9 → derived 0.85 → manual_import 0.7 → legacy_system 0.6 → simulated 0.3. درجة المصدر = MIN عبر المصادر المُعلَنة         |
| **الحوكمة عند الاختراق** | تصعيد التفاوت — `medium` على dataset سريري/مالي/امتثال يرتفع إلى `high` تلقائياً (يفرض القاعدة الحاكمة "لا KPI حساس بدون حالة جودة")                                                              |
| **عرض exec vs ops**      | exec: badge مركَّب واحد + مصادر مجمَّعة + masking عند critical. ops: chips per-dimension + raw source names + timestamps + NEVER masked. clinical: ops + PHI banner تلقائي                        |
| **HTTP API**             | `/api/v1/data-quality` — 6 endpoints (list + sources + get + dimensions + compute + batch-compute). Compute stateless (snapshot في body، لا Mongo في route layer)                                 |
| **التكامل**              | 65 tests + drift guard: `drilldown.registry.js ⊆ data-quality.registry.js` (كل KPI قابل للحفر له عقد جودة)                                                                                        |

📁 المراجع: [[data-quality-2026-05-17]] · `docs/blueprint/30-data-trust-quality.md`

---

### 4️⃣ إضافة الخدمات الممتازة · Premium Services Addition

> **الهدف**: لمسات فخامة احترافية تجعل النظام أداة قرار يومية، لا مجرد لوحة. كل ميزة تخلق _لحظة عادة استخدام_.
>
> **Goal**: Premium professional touches that turn the dashboard into a daily decision instrument. Each feature creates a _habit moment_.

**الذي تم تسليمه (Wave 25):**

| الفئة · Category        | الميزات · Features (14)                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Briefing** (3)        | 🌅 morning-briefing (06:00 KSA) · 🌇 end-of-day-wrap-up (16:30 KSA) · 📅 weekly-executive-digest (Monday 07:00)                                 |
| **Personalization** (4) | 📑 saved-views (with sharable URL) · ⚙️ dashboard-presets · 📌 pinned-widgets (max 6 enforced) · 👁️ watchlists                                  |
| **Collaboration** (2)   | 💬 kpi-annotations (per-KPI threads, AuditLogged) · 🤝 handoff-notes (team-to-team at shift change)                                             |
| **Productivity** (3)    | ⌨️ quick-action-center (Ctrl+K palette) · ✅ follow-up-queue (every ack/confirm creates one) · 🔍 exception-review-center (Sunday 09:00 weekly) |
| **Reporting** (2)       | 🖨️ printable-summaries (Cairo/Tajawal RTL PDF) · 📊 branch-scorecards                                                                           |

**الكيانات المخزَّنة:** 5 جداول جديدة (Annotation · HandoffNote · FollowUp · Watchlist · UserPreferences) مع service layer Mongo-free بنمط in-memory store حتى Wave 27 يضيف الـ Mongoose models.

**المولّدات الجديدة:** ✅ end-of-day.v1 (severity scales بالعمل المفتوح) · ✅ executive-digest.v1 (severity scales بـ KPIs التي تراجعت ≥10% أسبوع-vs-أسبوع)

**HTTP API:** `/api/v1/productivity` — 18 endpoints

**Pin limit = 6** مفروض server-side · **sensitive_form NEVER auto-saves** (clinical signatures, finance approvals, DSAR responses)

📁 المراجع: [[productivity-features-2026-05-17]] · `docs/blueprint/33-premium-productivity-features.md`

---

## القسم الثالث · الطبقات الداعمة (إضافات إلزامية لاحقة)

## Section III — Supporting Mandatory Layers

هذه الـ 4 إضافات تكمل البرومبت الأساسي + تسبق الإضافات الأربع الرئيسية في الاعتمادية:

These 4 additions complete the core prompt + serve as dependencies for the four primary additions above:

### Wave 21 — Drill-Down Architecture (لا لوحة مغلقة)

5-level hierarchy (executive → branch → unit → entity-list → record) + 4 orthogonal slices (explanation/breakdown/owner/next-action/related-records) + drill registry (12 priority KPIs with levels + drivers + owner + actions) + 8 HTTP endpoints + AuditLog funnel. **66 tests.**

📁 [[drilldown-architecture-2026-05-17]] · `docs/blueprint/29-drilldown-architecture.md`

### Wave 23 — Role-Based Decision Support (لا لوحة موحدة)

9 semantic role groups × full decision-support profile (primaryGoals, decisionsSupported, kpiIds, alertSurfaces, quickActions, restrictedData, layoutDensity, defaultLanding, terminalLevel). Canonical-role → group indirection lets 22 canonical roles map to 9 profiles. `maskForRole` strips fields at the query layer. **50 tests.**

📁 [[role-profiles-2026-05-17]] · `docs/blueprint/31-role-based-decision-support.md`

### Wave 24 — Cognitive Load Reduction Framework (مساحة عقلية محدودة)

9 cognitive-load principles → enforceable mechanics. Layout-policy registry (6 dashboards × tiered sections × scored elements) + density budgets (6/8/10/12 above-the-fold per density) + smart defaults + 4 auto-save profiles. `scoreElement` + `validateDashboard` CI guard **fails the build** on any element without `intent` or any over-budget layout. **48 tests.**

📁 [[cognitive-load-framework-2026-05-17]] · `docs/blueprint/32-cognitive-load-framework.md`

### Wave 26 — Governance & Auditability (جاهزية المؤسسة)

Permissions registry (40+ codes × role-group holders) + widget gating + `maskForCompliance` (role-restricted) + `redactForLLM` (HARD: no PHI/financial/HR to 3rd-party LLMs) + 5 compliance banners (PDPL Art.13 + financial + HR + PII + business-secret) + **unified audit-trail timeline** merging AuditLog + state-transitions + comments + feedback + CSV export gated by `governance.audit-trail.export`. **42 tests.**

📁 [[governance-auditability-2026-05-17]] · `docs/blueprint/34-governance-auditability.md`

---

## القسم الرابع · المخطط الكلي للتدفق

## Section IV — End-to-End Flow

ما يحدث عندما يفتح مدير الفرع لوحته في الساعة 8 صباحاً:

What happens when a branch manager opens their dashboard at 8 am:

```
1. authenticate middleware → resolves canonical role
        ↓
2. GET /api/v1/role-profiles/me/dashboard?branchId=...
   (Wave 23) returns:
     - groupKey: 'branch_manager'
     - defaultLanding: '/dashboards/branch/B-1'
     - layoutDensity: 'medium-high'
     - kpiIds: [active_count, attendance, goals_stalled, ...]
     - alertSurfaces: ['branch']
     - quickActions: [todays-worklist, staff-schedule, open-complaints, audit-pack]
     - restrictedData: ['cross_branch']
     - terminalLevel: 'record'
        ↓
3. GET /api/v1/layout-policy/branch/for-role/branch_manager?branchId=B-1
   (Wave 24) returns:
     - 4 sections in fixed order: critical-signals → operational-pulse → task-group → deep-dive
     - tier-1 elements (10 max budget): branch-alerts, attendance, goals-stalled, therapist-util, complaints, ...
     - smart defaults: dateRange=last_7d, branchScope=B-1
     - auto-save profiles: filters (10s interval), worklist (blur)
     - permission gates: requiredPermissions[] per element (Wave 26 will strip if not held)
        ↓
4. GET /api/v1/governance/permissions/me (Wave 26)
     - returns user's effective permission set
     - UI pre-disables buttons for permissions the user lacks
        ↓
5. For each KPI on the dashboard:
   a. GET /api/v1/drilldown/kpi.goals.stalled_count?branchId=B-1 (Wave 21)
        - returns chain + drivers + owner + actions
   b. POST /api/v1/data-quality/kpi.goals.stalled_count/compute (Wave 22)
        - returns composite + dimensions + level + maskValue
        - if level=critical AND maskOnCritical=true → UI shows "Data quality issue"
   c. GET /api/v1/governance/banners?dataKinds=clinical_phi (Wave 26)
        - returns PHI banner if KPI value is clinical
        ↓
6. GET /api/v1/alerts/dashboard/branch (Wave 15) — alert stream
   - PII-masked per viewer role (Wave 14 pii-masking.service)
   - merged with insights from GET /api/v1/insights?branchId=B-1&kind=anomaly,trend-deviation
   - operator action surfaces:
     - POST /api/v1/alerts/:id/acknowledge (Wave 15)
        → creates FollowUp via Wave 25 productivity layer
        → AuditLog entry via Wave 26 governance
        ↓
7. Morning briefing card at top (Wave 25 productivity)
   - calls morning-briefing.v1 generator (when wired in Wave 27)
   - shows: overnight critical + handoffs-for-me + due-today follow-ups
        ↓
8. Pinned widgets row (Wave 25, max 6 server-enforced)
        ↓
9. End-of-day card appears after 16:00 (Wave 25 end-of-day.v1 generator)
        ↓
10. At any point: click any KPI → drill drawer opens
    - explanation tab: Insight feed (Wave 18) for that KPI
    - breakdown tab: drivers from Wave 21
    - owner tab: resolved chain (Wave 21 + Wave 26)
    - next-action tab: quick actions from Wave 23
    - related-records tab: filtered entity list (Wave 21 entity-list level)
```

Every step is **role-aware, permission-gated, quality-flagged, audit-logged**. The platform is now an enterprise decision instrument.

---

## القسم الخامس · المؤشرات الإجمالية

## Section V — Aggregate Metrics

| المقياس · Metric          | القيمة · Value                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Total waves shipped       | **26** (Waves 0-26)                                                                                                                                        |
| Backend test suites       | **18** (in cumulative regression)                                                                                                                          |
| Cumulative passing tests  | **604/604**                                                                                                                                                |
| Design documents          | **30+** in `docs/blueprint/`                                                                                                                               |
| Registries                | 9 (alerts, drilldown, data-quality, role-profiles, layout-policy, productivity-features, governance, intelligence kpis, insight generators)                |
| HTTP API surfaces         | 9 namespaces under `/api/v1/`: alerts, insights, drilldown, data-quality, role-profiles, layout-policy, productivity, governance, briefings                |
| Memory entries            | 30+ in `~/.claude/projects/.../memory/`                                                                                                                    |
| Drift guards (CI-gated)   | 10+ across waves 21-26 (KPI coverage, generator refs, role mappings, element scoring, DQ coverage, permission holders, banner uniqueness, etc.)            |
| Sensitive-data protection | 5 kinds (clinical_phi, financial, hr_compensation, pii_identifiers, business_secret) × 3 enforcement layers (maskForRole, maskForCompliance, redactForLLM) |
| Permission codes          | 40+ in governance registry                                                                                                                                 |
| Role groups               | 9 (executive_leadership through reception)                                                                                                                 |
| Quality dimensions        | 8 (freshness through aiConfidence)                                                                                                                         |
| Drill-down levels         | 5 (executive through record)                                                                                                                               |
| Cognitive-load tiers      | 3 (must-show / should-show / could-show)                                                                                                                   |
| Premium features          | 14 across 5 categories                                                                                                                                     |

---

## القسم السادس · المتبقي (Wave 27+)

## Section VI — Remaining Work

| Wave | المحتوى                                                                                                                                                                                                                        | الحالة  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| 27   | Mongoose persistence for the 5 Wave-25 collections (Annotation/HandoffNote/FollowUp/Watchlist/UserPreferences)                                                                                                                 | Pending |
| 27   | Orchestrator cron wiring + env flag `INTELLIGENCE_ORCHESTRATOR_ENABLED`                                                                                                                                                        | Pending |
| 27   | Auto-creation hooks: confirm/ack → FollowUp                                                                                                                                                                                    | Pending |
| 27   | ESLint rule: no `anthropic.messages.create(...)` without `redactForLLM` preprocessor                                                                                                                                           | Pending |
| 28   | UI library: `<MorningBriefing>`, `<PinnedRow>`, `<KpiAnnotationDrawer>`, `<HandoffInbox>`, `<FollowUpQueue>`, `<Ctrl+KPalette>`, `<DrillDrawer>`, `<DataQualityBadge>`, `<DataQualityBreakdownDrawer>`, `<AuditTrailTimeline>` | Pending |
| 28   | Printable PDF generator (Cairo/Tajawal Arabic font, RTL)                                                                                                                                                                       | Pending |
| 29   | root-cause-chain.v1 generator (walks drivers graph, max 5 hops)                                                                                                                                                                | Pending |
| 29   | 7 more Intelligence generators (risk-score, opportunity, workflow-delay, branch-underperform, attendance-risk, weekly-summary, executive-digest LLM narrative variant)                                                         | Pending |
| 29   | 27 more KPIs in drill + DQ registries (cover all 39 from `kpi.registry.js`)                                                                                                                                                    | Pending |
| 30   | Approval state contract implementations on Invoice / CarePlan / Leave / PerformanceReview models                                                                                                                               | Pending |
| 30   | Regional role wiring (`regionBranchIds` + middleware)                                                                                                                                                                          | Pending |

---

## القسم السابع · فلسفة التصميم المُلخَّصة

## Section VII — Design Philosophy (one-paragraph summary)

> ALAWAEL dashboard ليست لوحة. هي **آلة قرار يومية** للمؤسسة متعددة الفروع. كل KPI يُسأَل: ما القرار الذي يخدمه؟ من المالك؟ ما الإجراء التالي؟ كل تنبيه يُسأَل: من سيتصرف؟ متى؟ بأي صلاحية؟ كل ذكاء اصطناعي يُسأَل: ما السبب؟ ما درجة الثقة؟ هل يحترم PDPL؟ كل بيانات تُسأَل: ما مصدرها؟ هل هي حديثة؟ هل تتفق مع المصادر الأخرى؟ كل واجهة تُسأَل: هل تتسبب في عبء معرفي مبرَّر بقرار؟ النتيجة: منصة تجتاز تدقيق CBAHI / PDPL / ISO 9001 — وتجعل المسؤول يفتحها كل صباح كأول أداة، لا آخر مرجع.
>
> ALAWAEL dashboard is not a dashboard. It's a **daily decision machine** for a multi-branch enterprise. Every KPI is asked: what decision does it serve? Who owns it? What's the next action? Every alert is asked: who acts? When? With what permission? Every AI output is asked: what's the reasoning? What's the confidence? Does it respect PDPL? Every data is asked: where did it come from? Is it fresh? Does it agree with other sources? Every UI surface is asked: is this cognitive load justified by a decision? The result: a platform that passes CBAHI / PDPL / ISO 9001 audit — and makes the operator open it every morning as their _first_ tool, not their last reference.
