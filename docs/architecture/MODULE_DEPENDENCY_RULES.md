# قواعد إدارة التبعيات بين الوحدات في منصة ALAWAEL

> **Status**: Canonical doctrine (Single Source of Truth). أي تغيير معماري جوهري في التبعيات يجب أن يُرافقه تحديث لهذه الوثيقة.
>
> **Date introduced**: 2026-05-24
> **Owner**: Architecture team
> **Drift guard**: `backend/__tests__/module-dependency-direction-wave354.test.js` (W354)
> **Related ADRs**: ADR-006 (Domain Event Bus), ADR-021 (Duplicate Model Registration), ADR-025 (Module Dependency Rules — mapping doctrine→folders)

## 1) تعريف الوحدات وحدودها

1. كل وحدة (Module / Bounded Context) تُعرَّف بناءً على مسؤولية واضحة واحدة، مثل:

   - `beneficiary-360`
   - `assessment-measures`
   - `goals-care-plans`
   - `programs-sessions-progress`
   - `operations-attendance-transport`
   - `reports-approvals-family`
   - `quality-risk-governance`
   - `platform-core` (المشترك: Users, Branches, Roles, Workflow, Dictionaries)

2. يُمنع على أي وحدة أن تصل مباشرة إلى التفاصيل الداخلية لوحدة أخرى (جداولها، Entities الداخلية، Services الخاصة).

   - يسمح فقط باستخدام:
     - واجهات عامة (Public Services / Facades) مُعرَّفة بوضوح.
     - أو Events داخلية واضحة.

3. كل وحدة تُعامَل كصندوق مغلق:
   - واجهة عامة واضحة (Public API).
   - منطق داخلي خاص.
   - Data Model داخلي حيث يلزم.
   - طبقة Mapping/DTO تفصل بين الداخلي والخارجي.

---

## 2) اتجاهات التبعيات بين الوحدات

1. التبعيات بين الوحدات **أحادية الاتجاه** ولا يُسمح بالتبعيات الدائرية مطلقًا.

   الترتيب المنطقي في منصة ALAWAEL (من الأساس إلى المستهلك النهائي):

   - `platform-core` _(الأساس — لا يعتمد على أي وحدة)_
     ↓
   - `beneficiary-360`
     ↓
   - `assessment-measures`
     ↓
   - `goals-care-plans`
     ↓
   - `programs-sessions-progress`
     ↓
   - `operations-attendance-transport`
     ↓
   - `reports-approvals-family`
     ↓
   - `quality-risk-governance` _(القمة — يقرأ من كل ما قبله)_

2. القاعدة العامة:

   - الوحدات في موقع **لاحق** في السلسلة يمكن أن تعتمد على الوحدات **السابقة لها** قراءةً فقط عبر واجهاتها العامة أو Events.
   - يُمنع على وحدة "سابقة" أن تعتمد على وحدة "لاحقة" بشكل يعكس الاتجاه (مثلاً `beneficiary-360` لا يستطيع الاعتماد على `quality-risk-governance`).

3. أمثلة تطبيقية:
   - `reports-approvals-family` يمكنه أن يقرأ من:
     - `beneficiary-360`
     - `assessment-measures`
     - `goals-care-plans`
     - `programs-sessions-progress`
     - `operations-attendance-transport`
   - لكنه لا يملك صلاحية تعديل بيانات هذه الوحدات بشكل مباشر.

---

## 3) نمط التواصل بين الوحدات (Public API + Events)

### 3.1 واجهات عامة (Public API)

1. كل وحدة تُعرّف واجهات خدمات عامة واضحة (Services/Facades)، مثل:

   - `AssessmentService.getApprovedAssessmentsForBeneficiary(beneficiaryId)`
   - `GoalsService.getActiveGoalsForEpisode(episodeId)`
   - `AttendanceService.getAttendanceSummary(beneficiaryId, period)`

2. الوحدات الأخرى تستخدم هذه الواجهات فقط:
   - لا استعلام SQL مباشر على جداول وحدة أخرى.
   - لا استدعاء لطُرق داخلية غير مُعلنة كـ Public API.

### 3.2 أحداث مجال داخلية (Domain Events)

1. عند حدوث حدث مهم داخل وحدة، يجب إطلاق Event داخلي مثل:

   - `beneficiary.created`
   - `assessment.approved`
   - `plan.approved`
   - `session.completed`
   - `attendance.marked_absent`
   - `report.shared_with_family`
   - `incident.reported`
   - `risk.escalated`

2. وحدات أخرى تستمع لهذه الأحداث وتنفّذ منطقها الخاص بدون تبعية قوية.

   - مثال:
     - عندما يُطلق `assessment.approved` من وحدة `assessment-measures`:
       - وحدة `goals-care-plans` تستخدم الحدث لتوليد خيارات أهداف وخطط.
       - وحدة `beneficiary-360` تُحدّث الـ Timeline.
       - وحدة `reports-approvals-family` تُستخدم لاحقًا لإعداد تقرير.

3. الأحداث تُعرّف بصيغة ثابتة:
   - `name`
   - `sourceModule`
   - `entityType`
   - `entityId`
   - `beneficiaryId` (إن وجد)
   - `episodeId` (إن وجد)
   - `occuredAt`
   - `payloadSummary`

---

## 4) ملكية البيانات (Single Source of Truth)

1. لكل كيان رئيسي **مالك واحد** (System of Record / Owner Module):

   - Beneficiary, Guardians, Episodes → `beneficiary-360`
   - Assessments, Measures, Results → `assessment-measures`
   - Goals, Care Plans → `goals-care-plans`
   - Programs, Sessions, Progress Signals → `programs-sessions-progress`
   - Schedules, Attendance, Transport → `operations-attendance-transport`
   - Report Artifacts, Family Communications → `reports-approvals-family`
   - Risks, Incidents, Audits, CAPA → `quality-risk-governance`
   - Users, Branches, Roles, Permissions, WorkflowTasks, Dictionaries → `platform-core`

2. الوحدات الأخرى:

   - **تقرأ** البيانات عبر واجهة المالك أو Read Models.
   - **تُشتق** بيانات ملخّصة (Aggregates / Projections) للعرض أو التقارير.
   - لا تعدّل البيانات الأصلية إلا عبر واجهات المالك وبقواعده.

3. أي Read Model أو Cache:
   - يُوسَم بوضوح أنه "مشتق" وليس مصدر الحقيقة.
   - لا يُستخدم كأساس لتحديثات كيان آخر (لا تقوم بسلسلة Updates انطلاقًا من View).

---

## 5) معالجة التبعيات المعقدة والدائرية

1. يُمنع وجود تبعية دائرية بين وحدتين (A → B و B → A).

2. في حال ظهرت حاجة متبادلة:

   - يتم استخراج الجزء المشترك إلى وحدة ثالثة `shared-kernel` أو توسيع `platform-core`.
   - أو يُستخدم Event Pattern:
     - A يطلق Event.
     - B يستمع ويتصرف.
     - بدون أن يستدعي A خدمات B مباشرة أو العكس.

3. قبل إضافة تبعية جديدة:
   - تحقق: هل يمكن حلها بـ Event؟
   - هل يمكن نقل الكيان إلى مالك أوضح؟
   - هل يوجد بالفعل Read Model يمكن إعادة استخدامه؟

---

## 6) طبقات داخل الوحدة (Layering)

1. داخل كل وحدة، تُستخدم طبقات واضحة قدر الإمكان:

   - Layer: API / Controllers
   - Layer: Application Services / Use Cases
   - Layer: Domain / Entities / Value Objects
   - Layer: Infrastructure (ORM, Repos, Integrations)

2. التبعيات داخل الوحدة تكون باتجاه واحد:

   - من الأعلى (API) إلى الأسفل (Domain/Infrastructure)، وليس العكس.
   - Domain لا يعتمد على Infrastructure مباشرة قدر المستطاع.

3. هذا يقلل من تشابك التبعيات الداخلية ويسهل التطوير والتعديل.

---

## 7) قواعد لاستخدام الوحدات من بعضها

1. لا وحدة تسحب كودًا من مجلد `internal` أو `domain` لوحدة أخرى مباشرة.

2. يُسمح فقط بـ:

   - استيراد واجهات مُعلَنة في مجلد `public` أو `application` للوحدة الأخرى.
   - استهلاك Events منشورة من الوحدة الأخرى.

3. أي خرق لهذه القاعدة يُعتبر "خرق معماري" ويجب تصحيحه قبل الدمج (CI/Code Review).

---

## 8) التبعيات مع المكتبات الخارجية (External Dependencies)

1. استخدام المكتبات الخارجية يكون:

   - في طبقة Infrastructure قدر الإمكان.
   - مع لفّها في Services/Adapters خاصة بالنظام (Anti-Corruption Layer).

2. لا تُنشر أنواع (Types) أو Models خاصة بمكتبة خارجية إلى باقي الوحدات مباشرة.

   - يجب تحويلها إلى Types داخلية أو DTOs.

3. إدارة الإصدارات:
   - الالتزام بإصدارات محددة في Package Manager + Lockfile.
   - تجنب التحديث العشوائي لكل التبعيات بدون مراجعة.

---

## 9) الاختبارات المعمارية وفحص التبعيات

1. يُفضّل (عند توفر الوقت) إنشاء اختبارات معمارية (Architecture Tests) تتحقق من:

   - عدم وجود تبعيات دائرية بين الوحدات.
   - التزام الوحدات بالتسلسل المحدد (Dependency Graph).
   - منع الوصول إلى Packages داخلية غير مسموحة.

2. أي PR جديد يكسر هذه القواعد يجب أن:
   - يفشل في CI، أو
   - يتم مراجعته يدويًا قبل الدمج.

> **تطبيق فعلي في هذا الريبو**: drift guard في `backend/__tests__/module-dependency-direction-wave354.test.js` (W354) ينفّذ كل من (1)+(2)+(3) عبر static analysis على `backend/domains/*/index.js` (التبعيات المُعلَنة في `BaseDomainModule` constructor) + مسح `require()` فعلي. مع baseline-ratchet pattern مماثل لـ W325c/W340 لرصد الانتهاكات الموجودة + منع الجديدة.

---

## 10) ممارسات عملية عند إضافة ميزة جديدة

قبل إضافة ميزة جديدة تربط أكثر من وحدة:

1. حدد الوحدة "المالكة" للبيانات الأساسية للميزة.
2. اسأل:
   - من سيكتب؟
   - من سيقرأ؟
   - هل نحتاج Event جديد؟
3. تأكد أن اتجاه التبعية لا يكسر السلم:
   - لا تجعل وحدة تقارير تعدّل Attendance أو Beneficiary.
4. إن احتجت Read Model، أنشئه في وحدة مناسبة مع توثيق كونه مشتقًا.
5. حدّث هذا الملف إذا تغيّرت قاعدة معمارية أو أضفت Domain جديدًا مهمًا.

---

## 11) تحديث هذه الوثيقة

- أي تغيير كبير في بنية الوحدات أو ملكية الكيانات يجب أن يُرافقه تحديث لهذه الوثيقة.
- هذه الوثيقة تُعتبر مرجعًا رسميًا (Single Source of Truth) لقواعد التبعيات المعمارية في المنصة.
- لا يُسمح بتغيير سلوك التبعيات في الكود بشكل جوهري بدون مراجعة هذه الوثيقة أولاً.

---

## ملحق: مابينج الوحدات الـ 8 إلى مجلدات الكود الفعلية

> القواعد أعلاه مفاهيمية. في الريبو الحالي، الكود موزَّع على `backend/domains/` (24 domain مبنية بنمط BaseDomainModule) + مجلدات legacy (`backend/{models, services, routes}/` ~2,108 ملف). راجع **ADR-025** للتفصيل الكامل + open stakeholder questions حول المابينج.

ملخّص المابينج (مرجعي — التفصيل في ADR-025):

| Doctrine Module                                        | `backend/domains/` folders                                                       | Legacy areas                                                                               |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `platform-core`                                        | `security`, `notifications`, `workflow`                                          | `intelligence/`, `middleware/`, `utils/`, `database/`                                      |
| `beneficiary-360`                                      | `core`, `episodes`, `timeline`                                                   | `models/Beneficiary.js`, `models/EpisodeOfCare.js`                                         |
| `assessment-measures`                                  | `assessments`, `goals` (MeasuresLibrary)                                         | `models/MeasurementMaster.js`, `services/measureLifecycle*`                                |
| `goals-care-plans`                                     | `care-plans`, `behavior`                                                         | `intelligence/care-planning.registry.js`                                                   |
| `programs-sessions-progress`                           | `programs`, `sessions`, `group-therapy`, `tele-rehab`, `ar-vr`, `field-training` | `services/sessions*`, `models/Therapy*`                                                    |
| `operations-attendance-transport + quality` (W354b T6) | `hr`, `quality`                                                                  | `routes/transport*`, `services/quality/`, `services/hikvision*`, `database/audit-trail.js` |
| `reports-approvals-family-communication` (W354b T7)    | `reports`, `dashboards`, `ai-recommendations`, `family`, `research`              | `authorization/approvals/`, `routes/parent-portal-v1.routes.js`, `services/messaging*`     |
| _(reserved)_ T8                                        | _(none)_                                                                         | W354b folded quality into T6, research + family into T7                                    |

**ملاحظات على المابينج (W354b 2026-05-25)**:

- `research` ضمن quality-risk-governance لأنها clinical-research/audit-related (راجع ADR-025 Q3).
- `dashboards` ضمن reports-approvals-family لأن KPI/DecisionSupport هي طبقة قراءة-عرض، لا مالك بيانات أصلي.
- `hr` معقّد: عنده طبقة employees/payroll/leave (`platform-core`-ish) + شؤون التوظيف (operations-attendance-transport). الـ ADR-025 يقترح بقاؤه في `operations-attendance-transport` مؤقتًا حتى تنفّذ ADR منفصلة للتقسيم.
- `workflow` حاليًا مصنّف `platform-core` لكنه يستدعي `episodes/`+`core/`+`timeline/` (انعكاس اتجاه). هذه أبرز انتهاكات الحدود المكتشفة في الفحص الأولي — موثّقة في baseline لـ drift guard.
