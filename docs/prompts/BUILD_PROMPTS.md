# برومتات بناء نظام الأوائل الكامل — ERP لتأهيل ذوي الإعاقة

> **الاستخدام:** كل قسم = prompt جاهز لتنفيذه. أعطِ القسم كاملاً للـ AI (Claude/ChatGPT/…) مع إضافة `"اعتمد على هيكل المشروع الحالي في c:\...\66666"` كـ context.

> **السياق الثابت (أضفه لكل prompt):**
>
> - Saudi context: PDPL compliance, Arabic-first RTL, Hijri calendar, SCFHS licensing
> - Backend: Express + Mongoose + Redis + Socket.IO (موجود في `backend/`)
> - Frontend: React 18 + MUI 5 + Tailwind + RTL (موجود في `frontend/`)
> - Multi-tenant: كل document له `branchId`؛ الفرع الرئيسي (HQ) يرى الكل، الفروع ترى أنفسها فقط
> - Auth: JWT + refresh tokens + 6-level RBAC hierarchy

---

## 🏛️ القسم 1 — الأساس والهيكل

### PROMPT 1.1 — Multi-Branch RBAC + Branch Isolation

```
ابنِ نظام صلاحيات متعدد الفروع (multi-branch RBAC) على المشروع الحالي:

المتطلبات:
1. Branch model: name, code, type (HQ|branch), parentBranch, manager, address, licenseNumber, capacity
2. كل model آخر (Employee, Beneficiary, Session, Invoice, etc.) يحمل حقل branchId required
3. Role hierarchy: SUPER_ADMIN > HEAD_OFFICE_ADMIN > BRANCH_MANAGER > DEPT_HEAD > SPECIALIST > RECEPTIONIST
4. Middleware `branchScope.middleware.js`:
   - SUPER_ADMIN + HEAD_OFFICE_ADMIN يرون كل الفروع
   - BRANCH_MANAGER وما دونه يرى branchId الخاص به فقط
   - إضافة filter تلقائي على كل MongoDB query يمس collection يحمل branchId
5. Audit log لكل تغيير صلاحيات (مَن، متى، من أي فرع، IP, user agent)
6. UI في /admin/branches: CRUD للفروع + تعيين المدير + عرض إحصائيات
7. UI في /admin/roles: تعيين دور + فرع لكل موظف

قبول:
- موظف فرع A لا يستطيع رؤية بيانات فرع B (حتى عبر API curl)
- HEAD_OFFICE_ADMIN يرى dashboard موحد لكل الفروع
- تقرير "distribution by branch" يظهر للمديرين العامين فقط
- 100% اختبارات integration تغطي السيناريوهات الحرجة
```

### PROMPT 1.2 — User Management + Government ID Integration

```
ابنِ نظام إدارة مستخدمين يدعم المواطنين السعوديين والمقيمين:

المتطلبات:
1. User model مع: nationalId (10 digits)، iqamaNumber (9 digits)، mobile (+966...)، role, branchId
2. تكامل Nafath: POST /api/auth/nafath/verify — إرجاع identity بعد التحقق
3. OTP via Unifonic (SMS) — fallback إلى WhatsApp Cloud API
4. MFA إلزامي للأدوار من SPECIALIST فما فوق
5. Password policy: 12+ chars, uppercase+lowercase+digit+symbol, history 24
6. Session management: refresh tokens يَصلح لـ 7 أيام، access 15 دقيقة
7. Break-glass emergency access مع co-sign من مدير آخر
8. UI /admin/users: جدول + فلاتر (branch, role, status) + export CSV

قبول:
- لا يمكن إنشاء مستخدم بدون nationalId صالح
- Nafath callback يُنشئ session تلقائياً إذا المستخدم موجود
- MFA لا يُتجاوَز لأي admin action
```

### PROMPT 1.3 — Hiearchy Organization Structure

```
أضف "الهيكل التنظيمي" (Org Chart) القابل للتحرير:

المتطلبات:
1. OrgUnit model: name, code, parent, head (Employee ref), branch, type (department|section|team)
2. UI /admin/org-structure:
   - عرض tree (D3.js أو react-organizational-chart)
   - drag-drop لإعادة الترتيب (مع confirm)
   - كارد لكل وحدة: اسم الرئيس، عدد الموظفين، KPIs
3. لكل Employee: حقل orgUnitId
4. تقرير "Span of control" — عدد المرؤوسين لكل مدير
5. تصدير PDF + Excel بالهيكل مع توقيعات إلكترونية من المدير

قبول:
- حذف وحدة له مرؤوسين يُمنَع ويُقترح reassign
- تعديل رئيس وحدة يرسل إشعار لجميع المرؤوسين + HR
```

---

## 👶 القسم 2 — المستفيدون (Beneficiaries)

### PROMPT 2.1 — Beneficiary 360 Profile

```
ابنِ ملف مستفيد 360° شامل:

المتطلبات (UI في /beneficiaries/:id):
1. Header: صورة، اسم، رقم هوية، عمر، فرع، تشخيص رئيسي، status
2. Tabs:
   - الملف الشخصي (بيانات + أهل + عنوان + emergency contacts)
   - التقييمات (Vineland-3, WISC-V, ADOS-2, M-CHAT-R, VB-MAPP — جميعها scorable)
   - خطط التأهيل (IEP) — كل خطة بأهداف SMART + تواريخ مراجعة
   - الجلسات (تقويم + قائمة + تفاصيل لكل جلسة)
   - التقارير (فلترة بالنوع: يومي/أسبوعي/شهري/ربع سنوي/سنوي)
   - التقدم (رسوم بيانية لكل هدف عبر الزمن)
   - الصور والفيديو (gallery مع consent مسجّل)
   - المستندات (تقارير طبية، إذن، عقد)
   - التواصل (سجل مكالمات + رسائل + رسائل الأهل)
   - المالية (فواتير، مدفوعات، قسط التأمين)
   - timeline موحدة (كل حدث مع timestamp)
3. Sidebar: quick actions — حجز جلسة، بدء تقييم، إصدار تقرير، اتصال بولي الأمر

Backend:
- Aggregate endpoint GET /api/beneficiaries/:id/360 يُرجع كل المعلومات في call واحد
- Cache 30 ثانية
- RBAC: فقط therapists المخصّصين + HOA + branch manager يرون كل التفاصيل
- PDPL: ولي الأمر يرى التفاصيل المسموحة فقط عبر portal منفصل

قبول:
- الصفحة تُحمَّل في < 1.5s حتى لطفل له 500 جلسة
- كل حقل حسّاس مُسجَّل في audit log عند عرضه
```

### PROMPT 2.2 — Smart IEP Engine

```
ابنِ محرك خطط تأهيل فردية (Individualized Education Plans) ذكي:

المتطلبات:
1. Goal Bank: 200+ هدف معتمد دولياً، مصنفة حسب:
   - المجال (communication, motor-gross, motor-fine, cognitive, behavioral, etc.)
   - نوع الإعاقة (autism, ID, Down, CP, learning disability)
   - الفئة العمرية (0-3, 3-6, 6-12, 12+)
2. IEP Wizard:
   - Step 1: اختر المستفيد + نوع التشخيص
   - Step 2: نتائج التقييم الأخير (تستورد تلقائياً)
   - Step 3: اقتراح أهداف من Goal Bank بناءً على القصور المُكتشَف
   - Step 4: تخصيص الأهداف (صياغة SMART، baseline، criterion for mastery)
   - Step 5: تعيين أخصائيين + جدول جلسات + تاريخ مراجعة
3. Progress tracking:
   - لكل هدف: trials recorded per session (correct/incorrect/prompted)
   - auto-calculation: percentage correct over last 5 sessions
   - auto-alert عند mastery (80%+ عبر 3 جلسات متتالية)
   - auto-alert عند plateau (لا تحسّن > 21 يوم)
4. Team review: meeting كل 3 أشهر — confirm/adjust أهداف
5. PDF export مع توقيعات الفريق + ولي الأمر

قبول:
- IEP كاملة تُبنَى في < 10 دقائق (مقابل 2-3 ساعات يدوياً)
- إشعار plateau يُرسَل خلال 24 ساعة من اكتشافه
```

### PROMPT 2.3 — Session Management

```
ابنِ نظام إدارة جلسات:

المتطلبات:
1. Session model: beneficiaryId, therapistId, branchId, datetime, duration, type (individual|group), roomId, goals[], attendance, notes, abcObservations[]
2. Calendar view (شهري/أسبوعي/يومي) مع drag-drop
3. Session logger (mobile-friendly):
   - بدء/إنهاء جلسة
   - لكل هدف: عدد المحاولات + نجاح/فشل/توجيه
   - ABC observations (antecedent, behavior, consequence)
   - ملاحظات نصية + صوتية + فيديو مع consent
   - رضا المستفيد (1-5 stars)
4. Auto-sync مع IEP: نتائج الجلسة تحدّث progress الهدف تلقائياً
5. Conflict detection: لا يمكن حجز therapist في غرفتين في نفس الوقت
6. Waitlist: لو غرفة غير متاحة، يُضاف المستفيد لطابور انتظار
7. Cancellation rules: ولي الأمر يلغي قبل 24 ساعة بدون رسوم؛ بعدها 50%

قبول:
- Therapist يسجل جلسة كاملة في < 3 دقائق
- تقرير حضور يُنتج تلقائياً لكل مستفيد شهرياً
```

---

## 👔 القسم 3 — Portals (البوابات)

### PROMPT 3.1 — Parent Portal

```
ابنِ بوابة ولي الأمر (mobile-first PWA):

المتطلبات:
1. Dashboard: صورة ابنه + الفرع + آخر جلسة + الإنجاز هذا الأسبوع
2. Sections:
   - التقدم (رسوم بيانية لكل هدف)
   - الحضور (جدول شهري)
   - الواجبات المنزلية (مع video guides)
   - التواصل مع الأخصائيين (chat thread لكل أخصائي)
   - المواعيد القادمة (+ reminders قبل 24 ساعة وساعة)
   - التقارير (أسبوعي/شهري/فصلي) للقراءة والتحميل
   - الفواتير والمدفوعات
   - مستندات (تقارير، إذن، عقد)
   - الاستبيانات (NPS فصلي، رضا)
3. Notifications: WhatsApp + SMS + in-app
4. Login: OTP عبر جوال (Nafath optional)
5. Privacy: ولي الأمر يرى فقط أطفاله
6. Quick actions: حجز موعد، إلغاء موعد، طلب تقرير، اتصال

قبول:
- يعمل على اتصال 3G بسرعة قبول
- Parent يكمل أي task في ≤ 3 taps
```

### PROMPT 3.2 — Therapist Portal

```
ابنِ بوابة الأخصائي (tablet-first، للاستخدام داخل الجلسة):

المتطلبات:
1. Today's schedule: جلسات اليوم مع وقت + مستفيد + غرفة
2. لكل جلسة: زر "بدء" يفتح session logger full-screen
3. Quick beneficiary summary قبل الجلسة (آخر 3 جلسات + أهداف حالية + ملاحظات الأهل)
4. Real-time sync مع السنسور (لو متصل بـ biometric device لتسجيل heart rate/motion)
5. Voice-to-text للملاحظات (Arabic STT)
6. After-session: 5-step review — attendance, progress%, أهداف مُنجَزة، ملاحظات الأهل، follow-up
7. Weekly prep: "المستفيدون هذا الأسبوع" مع flags (plateau, regression)
8. Documents library: PDFs للـ protocols (ABA, TEACCH, PECS)
9. Peer consultation: طلب رأي أخصائي آخر بصورة/فيديو

قبول:
- جلسة كاملة مُسجَّلة من البداية للنهاية داخل البوابة
- 0 حاجة للتحويل إلى نظام آخر
```

### PROMPT 3.3 — Student (Beneficiary) Portal

```
ابنِ بوابة مستفيد بواجهة مبسّطة (للمراهقين والكبار المستقلين):

المتطلبات:
1. Login بـ QR code (ولي الأمر يطبع) أو PIN بسيط
2. Home: صورة ابتسامة + "جلستك التالية بعد X ساعات"
3. My goals: 3-5 أهداف حالية مع ⭐ لكل إنجاز
4. Activities: ألعاب تدريبية (تناسب عمره ومستواه)
5. Communication board (AAC): رموز للتعبير (للحالات غير الناطقة)
6. Rewards: متجر نقاط — يصرفها على نشاطات/صور/وقت شاشة
7. Journal: يسجل شعوره اليوم (5 emojis)
8. Safety: زر "SOS" يرسل تنبيه لأقرب mentor

قبول:
- 7-year-old يستخدمها دون مساعدة
- Audio cues لكل زر للحالات قليلة القراءة
```

### PROMPT 3.4 — Admin Portal (Command Center)

```
ابنِ command center للإدارة التنفيذية:

المتطلبات:
1. Executive Dashboard (المدير التنفيذي):
   - مؤشرات مالية (revenue, outstanding, churn)
   - مؤشرات عمليات (occupancy, session count, wait list)
   - مؤشرات جودة (patient satisfaction, therapist utilization)
   - تنبيهات حرجة (incidents, compliance)
2. Branch Managers view: مؤشرات فرعهم + مقارنة بباقي الفروع
3. Drill-down: كل مؤشر يفتح تقرير مفصّل
4. Alerts center: تنبيهات مصنّفة (critical/warning/info)
5. Approval inbox: طلبات تحتاج موافقة (رخصات، ترقيات، قرارات)
6. Meeting organizer: جدولة + أجندة + محضر + ATR (Action Tracking Register)
7. Strategic goals tracker (OKRs)

قبول:
- CEO يرى الصورة الكاملة في < 10 ثوانٍ
- أي قرار له audit trail كامل
```

---

## 💼 القسم 4 — HR الشامل

### PROMPT 4.1 — Employee Lifecycle Management

```
ابنِ نظام HR شامل ومتكامل:

المتطلبات:
1. Employee model غني: personal, employment, salary, education, certifications, emergency contacts, bank
2. Onboarding workflow: 15+ خطوة (contract, NDA, briefing, training modules, SCFHS verification, etc.)
3. Offboarding: exit interview, asset return, access revocation, final settlement
4. Time & Attendance:
   - Biometric devices (ZKTeco) integration
   - Geolocation مع WFH
   - Shift scheduling (صباحي/مسائي/مناوبة)
   - Overtime tracking + approval
5. Leave management: annual, sick (بتقرير طبي)، emergency, haj, maternity, bereavement
6. Performance management:
   - Goals (OKR-style) سنوية
   - Quarterly check-ins
   - 360° reviews
   - Calibration sessions
7. Training & Development:
   - Required training per role (SCFHS CE)
   - Tracking + reminders before expiry
   - Certification upload + verification
8. Compensation: salary, allowances (transport, housing, phone), deductions, GOSI
9. Payroll (monthly auto-calc) + WPS upload
10. End of service benefits (مكافأة نهاية الخدمة حسب نظام العمل السعودي)

قبول:
- Employee journey كامل من التقديم للاستقالة في النظام
- Payroll ينفذ 100+ موظف في < 30 ثانية
```

### PROMPT 4.2 — Recruitment & ATS

```
ابنِ Applicant Tracking System:

المتطلبات:
1. Job postings (سبق بُنِيت في /careers)
2. Application review pipeline: new → screening → phone interview → onsite → offer → hired
3. Interview scheduling + calendar integration
4. Assessment tests (مكتبة IQ, personality, technical)
5. Reference check workflow
6. Offer letter generator + e-sign
7. Approvals: HR → Dept Head → Finance (for salary) → CEO
8. Onboarding trigger: قبول العرض → session onboarding
9. Talent pool: مرشحون لم يُقبلوا لكن مؤهلون لاحقاً
10. Analytics: source effectiveness, time-to-hire, cost-per-hire

قبول:
- applicant يمر بالـ pipeline بأقل احتكاك
- audit: من غير status ومتى
```

### PROMPT 4.3 — Succession Planning + Career Pathways

```
ابنِ Succession Planning:

المتطلبات:
1. Key positions identification (critical roles)
2. Successors matrix (9-box grid)
3. Development plans لكل successor
4. Readiness tracking (ready now / 1-2 years / 3-5 years)
5. Career pathway visualization لكل موظف:
   - Current role
   - Possible next moves
   - Gaps (skills, certifications)
   - Timeline
6. Mentorship program linkage
```

---

## 💰 القسم 5 — المالية والمحاسبة

### PROMPT 5.1 — Full Accounting System

```
ابنِ نظام محاسبة متكامل (متوافق مع ZATCA):

المتطلبات:
1. Chart of Accounts (شجرة حسابات) قابلة للتخصيص
2. Journal entries (manual + auto from modules)
3. General Ledger
4. Accounts Payable (AP):
   - Vendor management
   - PO → GR → Invoice → Payment
   - 3-way matching
   - Aging report
5. Accounts Receivable (AR):
   - Customer/Beneficiary billing
   - Invoice generation (linked to Sessions)
   - Payment recording (cash, card, bank transfer, check)
   - Dunning workflow (تذكير + إنذار)
6. Banking:
   - Bank accounts master
   - Reconciliation (MT940 import)
   - Check management
7. Fixed Assets:
   - Register (depreciation schedules)
   - Disposal tracking
8. Budgeting & Forecasting:
   - Annual budget per cost center
   - Variance analysis
   - Rolling forecasts
9. Financial reports:
   - Trial balance
   - P&L
   - Balance sheet
   - Cash flow statement
10. ZATCA Phase 2 compliance:
    - E-invoice XML (UBL 2.1)
    - QR code on every invoice
    - Clearance API integration
    - Archive 7 years
11. VAT:
    - Auto-calc 15% on taxable sales
    - VAT return preparation (VAT-01 form)
12. Cost centers (per branch + per department)

قبول:
- Monthly close في < 3 أيام
- ZATCA رضا 100%
```

### PROMPT 5.2 — Revenue Cycle Management (RCM)

```
ابنِ RCM للقطاع الصحي (insurance billing):

المتطلبات:
1. Insurance master (Bupa, Tawuniya, MedGulf, etc.) + plans per insurance
2. Eligibility check API (CHI integration)
3. Pre-authorization workflow for expensive procedures
4. Claim submission:
   - Electronic (Wasel/Nphies)
   - Batch preparation
   - Resubmission workflow
5. Denial management:
   - Reason codes library
   - Appeal workflow
6. Payment posting (EOB interpretation)
7. KPIs: first-pass rate, days in AR, denial rate
```

### PROMPT 5.3 — Treasury & Cash Management

```
ابنِ Treasury:

المتطلبات:
1. Cash position daily (across all bank accounts)
2. Petty cash per branch
3. Cheque management (issued + received)
4. Short-term investment tracking
5. Foreign currency (أموال من تبرعات خارجية)
6. Forecasting: 13-week rolling cash forecast
```

---

## 🏥 القسم 6 — التأهيل والبرامج الإكلينيكية

### PROMPT 6.1 — Assessment Battery

```
ابنِ مكتبة تقييمات إكلينيكية:

المتطلبات:
1. 15+ أداة scorable built-in:
   - Vineland-3 (Adaptive Behavior)
   - WISC-V (IQ)
   - ADOS-2 (Autism)
   - M-CHAT-R/F (screening)
   - PEP-3 (education profile)
   - VB-MAPP (verbal behavior)
   - ABLLS-R (basic learning)
   - BRIEF-2 (executive function)
   - CARS-2 (autism rating)
   - Conners-3 (ADHD)
   - Draw-A-Person
   - Social Communication Questionnaire
2. لكل أداة:
   - Digital form (translated Arabic)
   - Auto-scoring + standard scores
   - Developmental age + percentile
   - Narrative report template (PDF)
3. Multi-rater: parent + teacher + therapist responses
4. Progress comparison: compare 2 administrations
5. Storage: PDPL-compliant, 25-year retention
```

### PROMPT 6.2 — Specialized Programs

```
ابنِ برامج متخصصة لكل نوع إعاقة:

المتطلبات:
1. Autism Program:
   - ABA protocols library
   - PECS 6-phase progression
   - TEACCH structured teaching
   - Social Stories library (Arabic)
2. Intellectual Disability Program:
   - Adaptive skills training curriculum
   - Life skills modules
   - Vocational pre-training
3. Down Syndrome Program:
   - Motor development tracks
   - Communication building
   - Health monitoring (cardiac, thyroid, vision, hearing)
4. Cerebral Palsy Program:
   - Physical therapy plans
   - AAC communication
   - Mobility aids tracking
5. Learning Disability Program:
   - Reading interventions (Orton-Gillingham Arabic)
   - Math interventions
   - Assistive technology
6. ADHD Program:
   - Behavioral modification
   - Parent training
   - School coordination
7. Early Intervention Program (0-3):
   - Developmental milestones tracking
   - Parent-mediated interventions
   - Home visits scheduling
```

### PROMPT 6.3 — Social Services + Independent Living

```
ابنِ نظام الخدمات الاجتماعية والحياة المستقلة:

المتطلبات:
1. Social worker caseload management
2. Family support plans
3. Home visits scheduling + reports
4. Social benefits liaison (إعانة ذوي الإعاقة من وزارة الموارد)
5. Independent Living Assessment: self-care, community, vocational, social
6. Transition planning (18+ age): vocational, community, residential
7. Community integration programs:
   - Field trips
   - Volunteer opportunities
   - Public transport training
8. Crisis intervention workflow
```

### PROMPT 6.4 — Psychological + Behavioral Support

```
ابنِ نظام الدعم النفسي والسلوكي:

المتطلبات:
1. Functional Behavior Assessment (FBA):
   - ABC data collection (frequency, duration, intensity)
   - Behavior graphing
   - Hypothesis development
2. Behavior Intervention Plan (BIP):
   - Target behaviors (increase/decrease)
   - Antecedent modifications
   - Replacement behaviors
   - Consequences plan
   - Crisis plan
3. Family counseling scheduling + notes
4. Group therapy sessions (social skills, anger management)
5. Mental health screening: PHQ-9, GAD-7 (adapted)
6. Psychiatrist consultation referrals
7. Medication tracking (with MD prescription)
```

---

## 📚 القسم 7 — التعليم والتأهيل

### PROMPT 7.1 — E-Learning Platform

```
ابنِ منصة تعلم إلكتروني للمستفيدين والأهل:

المتطلبات:
1. Courses library:
   - للمستفيدين: life skills, communication, basic academics
   - للأهل: behavior management at home, autism 101, IEP 101
   - للموظفين: compliance, professional development, SCFHS CE
2. SCORM-compatible
3. Video player مع Arabic subtitles
4. Quiz engine (MCQ, matching, ordering, drag-drop)
5. Certificates generation (auto on completion)
6. Progress tracking + analytics
7. Gamification: badges, leaderboards, streaks
8. Offline mode (PWA)
9. Admin: course authoring tool (simple)

قبول:
- دورة 30 دقيقة تعمل بسلاسة على 3G
- شهادة تُنتَج فوراً مع QR verification
```

### PROMPT 7.2 — Education & Curriculum

```
ابنِ نظام إدارة المناهج التعليمية:

المتطلبات:
1. Curriculum library (مُعدّل حسب الإعاقة)
2. Lesson planner
3. Classroom management (للمراكز التي لها صفوف)
4. Teacher assignment
5. Attendance
6. Grades + report cards (أكاديمية + سلوكية + مهارية)
7. Parent-teacher conferences scheduler
```

---

## 🚌 القسم 8 — النقل والعمليات

### PROMPT 8.1 — Fleet & Transport Management

```
ابنِ نظام أسطول ونقل كامل:

المتطلبات:
1. Vehicle master: plate, model, capacity, year, insurance expiry, istimara expiry
2. Driver master: license, medical, background check
3. Routes planner:
   - Optimize routes (nearest neighbor + traffic API)
   - Morning pickup + evening drop
   - Capacity balancing
4. Daily manifest: driver + vehicle + students + stops
5. GPS tracking (device integration):
   - Real-time location
   - Parents see ETA via portal
   - Geofencing alerts
6. Pick-up/drop-off verification:
   - QR scan at pickup
   - Photo with safety belt
   - Auto-notify parent
7. Fuel tracking (card integration)
8. Maintenance schedule + alerts
9. Incident reporting (accidents, delays)
10. Cost per student calculation
```

### PROMPT 8.2 — Facility & Maintenance Management

```
ابنِ نظام صيانة ومرافق:

المتطلبات:
1. Assets register (per branch)
2. Preventive maintenance schedules
3. Work orders (create, assign, track, close)
4. Vendor management for services (cleaning, AC, electrical)
5. Space management: rooms inventory, bookings, utilization%
6. Safety & HSE:
   - Incident reporting
   - Fire drills tracking
   - PPE inventory
   - Risk assessments
7. Environmental controls (IoT sensors):
   - Temperature, humidity, CO2
   - Alerts when thresholds breached
8. Housekeeping schedules + verification
```

### PROMPT 8.3 — Procurement & Supply Chain

```
ابنِ نظام مشتريات وسلسلة إمداد:

المتطلبات:
1. Vendor master (with performance ratings)
2. Material requisitions (MR) from branches
3. Purchase requests → approvals → PO
4. 3-way matching (PO + GR + Invoice)
5. Inventory management (per branch):
   - Stock levels
   - Reorder points
   - Expiry tracking (for therapy materials)
   - Batch/lot tracking
6. Inter-branch transfers
7. Contract management (frame agreements)
8. Vendor evaluation (quality, delivery, price, service)
9. Reports: spend analysis, savings, supplier performance
```

---

## 📊 القسم 9 — التقارير والتكامل

### PROMPT 9.1 — Reports Engine + Multi-Channel Distribution

```
ابنِ محرك تقارير احترافي:

المتطلبات:
1. Report templates per category:
   - Daily: attendance, sessions completed, incidents
   - Weekly: progress per goal, attendance summary, incidents
   - Monthly: full clinical report, financial, HR
   - Quarterly: comprehensive review
   - Semi-annual: IEP review, parent-team meeting prep
   - Annual: strategic review, compliance
2. Template builder (drag-drop):
   - Text blocks, charts, tables, images
   - Variables from beneficiary/session/assessment data
   - Conditional content
3. Multi-language (AR primary, EN secondary)
4. Multi-format output: PDF, DOCX, Excel, HTML
5. Scheduled generation (cron-like)
6. Distribution channels:
   - Email (SendGrid/Amazon SES)
   - SMS (Unifonic)
   - WhatsApp (Cloud API)
   - Portal (in-app + PDF download)
7. Recipient rules:
   - Primary parent + secondary parent + grandparent (optional)
   - Branch manager + therapist
   - Insurance company (sanitized version)
8. Delivery tracking + receipts
9. Bulk send (e.g., monthly reports for all beneficiaries in one batch)
10. Opt-out management per channel per recipient

قبول:
- 500 beneficiary monthly reports generated+sent في < 10 دقائق
- WhatsApp delivery rate > 95%
- PDPL audit trail لكل رسالة
```

### PROMPT 9.2 — Government Integrations

```
ابنِ التكامل مع الجهات الحكومية:

المتطلبات:
1. Nafath (تحقق الهوية):
   - Login with Nafath
   - Verify nationalId
   - Get citizen info
2. Absher (للموظفين):
   - Iqama validation
   - Expiry alerts
3. Yakeen (تحقق شامل):
   - Bulk verification
4. Wasel (CHI) — insurance eligibility
5. Madaa — مؤسسة الرعاية الاجتماعية
   - Beneficiary registration
   - Subsidy applications
6. ZATCA — e-invoicing Phase 2
7. GOSI — لموظفين مسجلين + حسابات
8. Qiwa — عقود العمل + نقل كفالات
9. Muqeem — إقامات المقيمين
10. وزارة الصحة — تقارير المركز الدورية
11. هيئة التخصصات الصحية (SCFHS) — التحقق من تراخيص الأخصائيين

لكل تكامل:
- Adapter module مع circuit breaker
- Retry with exponential backoff
- Webhook receiver + HMAC verification
- Mock mode for dev/test
- Audit log لكل call
```

### PROMPT 9.3 — Analytics + BI Dashboard

```
ابنِ منصة BI:

المتطلبات:
1. Data warehouse (star schema):
   - Fact tables: sessions, assessments, invoices, attendance
   - Dimension tables: beneficiary, therapist, branch, date, diagnosis
2. ETL pipeline (scheduled)
3. Pre-built dashboards:
   - CEO Dashboard
   - Financial Performance
   - Clinical Outcomes
   - HR Analytics
   - Operational KPIs
4. Ad-hoc query builder
5. Self-serve drag-drop charts (Metabase/Superset/Apache Charts)
6. Export (PDF scheduled, Excel, API)
7. Forecasting (ARIMA, Prophet)
8. Anomaly detection
```

---

## 🔔 القسم 10 — الخدمات الشاملة

### PROMPT 10.1 — Notifications Center

```
ابنِ مركز إشعارات موحد:

المتطلبات:
1. Notification types: info, warning, critical, success
2. Channels: in-app, email, SMS, WhatsApp, push (web + mobile)
3. Template library بـ Arabic + English
4. User preferences: per type per channel
5. Smart routing (try WhatsApp, fallback SMS, fallback Email)
6. Delivery tracking + retries
7. Scheduled notifications
8. Bulk notifications with throttling
9. Admin dashboard: deliveries, failures, costs
```

### PROMPT 10.2 — Document Management + E-Signature

```
ابنِ نظام إدارة مستندات:

المتطلبات:
1. DMS structure:
   - Categories (HR, Clinical, Financial, Legal, Admin)
   - Tags + metadata
   - Versioning
2. Storage: MinIO/S3 (encrypted at rest)
3. OCR for scanned docs (Tesseract Arabic)
4. Full-text search (ElasticSearch)
5. Access control (per doc + per folder)
6. E-signature:
   - Draw/type signature
   - Multiple signers workflow
   - Audit trail (IP, timestamp, hash)
   - Legally valid per Saudi e-Transactions Law
7. Form templates library (100+):
   - Consent forms
   - Assessment forms
   - Reports
   - Contracts
8. Template engine (merge variables with beneficiary data)
9. Retention policies (per category)
10. Secure sharing (time-limited links, password-protected)
```

### PROMPT 10.3 — CRM (Beneficiary Relationship Management)

```
ابنِ CRM متخصص لمستفيدين:

المتطلبات:
1. Leads pipeline (new inquiry → evaluation → conversion → churn)
2. Contact history (calls, emails, visits, messages)
3. Campaign management:
   - Email/SMS/WhatsApp campaigns
   - A/B testing
   - Open/click tracking
4. Segmentation:
   - By diagnosis
   - By branch
   - By status (active/inactive/churned)
   - By tenure
5. Satisfaction:
   - NPS surveys (quarterly)
   - CSAT after sessions
   - Focus groups coordination
6. Complaints management:
   - Intake (any channel)
   - Routing by severity
   - SLA tracking
   - Resolution workflow
   - Quality analysis
7. Referral program (word-of-mouth)
8. Loyalty (discounts for long-tenure families)
```

### PROMPT 10.4 — Communications & PR

```
ابنِ وحدة اتصالات إدارية:

المتطلبات:
1. Internal memos + announcements
2. External correspondence (incoming/outgoing)
3. PR calendar (events, campaigns)
4. Media monitoring
5. Social media scheduling
6. Press releases library
7. Crisis communication plans
8. Brand asset library
```

### PROMPT 10.5 — Meetings Management

```
ابنِ نظام اجتماعات:

المتطلبات:
1. Meeting types: team, branch, board, committee, clinical review
2. Scheduling + room booking
3. Agenda builder (collaborative)
4. Minutes taker (live)
5. Action items tracker (ATR)
6. Decisions log
7. Attendance verification
8. Recurring meetings
9. Video conferencing integration (Zoom/Teams/Google Meet)
10. Follow-up automation (reminders for action items)
```

---

## 🎯 القسم 11 — الجودة والامتثال

### PROMPT 11.1 — Quality Management System (QMS)

```
ابنِ QMS مبني على معايير CARF:

المتطلبات:
1. Quality standards library (CARF sections)
2. Self-assessment tool (score each standard)
3. Gap analysis + corrective action plans
4. KPI dashboard (clinical + operational quality)
5. Incident/Event reporting:
   - Sentinel events
   - Near-misses
   - Complaints
   - Adverse events
6. Root Cause Analysis workflow (5 Whys, Fishbone)
7. Quality improvement projects (PDCA)
8. Audit management:
   - Internal audits
   - External audits preparation
9. Document control (all policies/procedures)
10. Training compliance tracking
```

### PROMPT 11.2 — Regulatory Compliance

```
ابنِ الامتثال التنظيمي:

المتطلبات:
1. Regulations library (PDPL, e-Transactions Law, Labor Law, MOH rules)
2. Compliance calendar (deadlines per year):
   - License renewals
   - Report submissions
   - Audits
   - Training refreshers
3. Evidence repository (proof of compliance)
4. Risk register (identified risks + mitigations)
5. Policy management:
   - Version control
   - Review cycles
   - Acknowledgment tracking
6. Ethics committee cases
7. Whistleblower channel (anonymous)
8. Reporting obligations tracker
```

---

## 🔐 القسم 12 — أمن + تكامل داخلي

### PROMPT 12.1 — Internal Integration Bus

```
ابنِ event-driven architecture:

المتطلبات:
1. Event bus (Kafka/RabbitMQ/Redis Streams)
2. Domain events (200+):
   - BeneficiaryCreated, SessionCompleted, AssessmentScored, InvoicePaid, etc.
3. Saga pattern for distributed transactions
4. Event sourcing for critical entities (beneficiary, finance)
5. CQRS where applicable
6. Webhook subscriptions (for external systems)
7. Dead letter queue handling
8. Replay capability
```

### PROMPT 12.2 — Audit + Security

```
ابنِ أمن شامل:

المتطلبات:
1. Audit log (every CUD op + sensitive reads) — immutable
2. SIEM integration (logs shipped to central)
3. Vulnerability scanning (weekly)
4. SAST + DAST in CI
5. Secrets management (HashiCorp Vault أو AWS Secrets Manager)
6. Encryption:
   - At-rest (field-level for PII)
   - In-transit (TLS 1.3)
   - Backups (AES-256)
7. Backup strategy (3-2-1): daily incremental + weekly full + monthly cold
8. DR plan (RTO 4h, RPO 1h)
9. Penetration testing (quarterly)
10. Security awareness training (annual)
```

---

## 📱 القسم 13 — التحديثات والابتكار

### PROMPT 13.1 — Mobile Apps

```
ابنِ تطبيقات جوّال (React Native / Flutter):

المتطلبات:
1. Parent app (iOS + Android)
2. Therapist app (iPad + tablet)
3. Student app (simplified)
4. Features per app (كما في portals)
5. Offline mode
6. Push notifications
7. Biometric login
8. Camera for documents/photos
9. Dark mode
10. Accessibility (screen readers, font scaling)
```

### PROMPT 13.2 — AI Features

```
أضف ميزات ذكاء صناعي:

المتطلبات:
1. Early Warning System:
   - ML model predicts dropout risk
   - Plateau detection
   - Regression alerts
2. Session notes NLP:
   - Auto-extract goals mentioned
   - Sentiment analysis
   - Key phrases summary
3. IEP Recommender:
   - Based on diagnosis + current level, suggest next goals
4. Chatbot للأهل (FAQ about rehab)
5. Voice assistant للأخصائيين (hands-free note-taking)
6. Image recognition للتوثيق (cropped assessments)
7. Anomaly detection في attendance + finance
```

### PROMPT 13.3 — IoT & Wearables

```
ادمج IoT:

المتطلبات:
1. Heart rate monitors أثناء الجلسة
2. Environmental sensors في الغرف
3. Asset tracking (RFID للأجهزة)
4. Smart locks للغرف
5. Attendance via RFID cards
```

---

## 📋 قائمة التنفيذ الموصى بها (Priority Order)

**Phase 1 — Critical Foundation (4 weeks):**

- 1.1 Multi-Branch RBAC
- 1.2 User Management + Nafath
- 2.1 Beneficiary 360

**Phase 2 — Core Clinical (6 weeks):**

- 2.2 Smart IEP
- 2.3 Session Management
- 6.1 Assessment Battery

**Phase 3 — Portals (4 weeks):**

- 3.1 Parent Portal
- 3.2 Therapist Portal
- 3.4 Admin Command Center

**Phase 4 — Back Office (8 weeks):**

- 4.1 HR Lifecycle
- 5.1 Accounting
- 9.1 Reports + Multi-Channel

**Phase 5 — Operations (6 weeks):**

- 8.1 Fleet
- 8.2 Facility
- 8.3 Procurement

**Phase 6 — Specialized (ongoing):**

- 6.2 Specialized Programs
- 11.1 QMS
- 7.1 E-Learning

**Phase 7 — Integrations (4 weeks):**

- 9.2 Government
- 12.1 Event Bus

**Phase 8 — Innovation (ongoing):**

- 13.1 Mobile Apps
- 13.2 AI

---

## 🛠️ Context Prompt (استخدم مع كل task)

```
أنت مهندس سينيور تعمل على نظام ERP متعدد الفروع لمراكز تأهيل ذوي الإعاقة في السعودية.

الـ stack الحالي (الملفات موجودة):
- Backend: Node.js + Express + Mongoose + Redis + Socket.IO in /backend
- Frontend: React 18 + MUI 5 + Tailwind + RTL in /frontend
- Admin: Next.js 14 + Tailwind in /apps/web-admin (optional)

قواعد إلزامية:
1. Arabic-first UI (RTL), English as secondary
2. Multi-tenant: every document carries branchId
3. PDPL compliance (Saudi Data Protection Law)
4. Audit log every create/update/delete of PII
5. JWT + refresh tokens + 6-level RBAC
6. Tests: unit + integration for every endpoint
7. Code style: existing project conventions (look at similar files before coding)

قبل البناء:
- اقرأ الملفات ذات الصلة
- اقترح schema + API contract
- انتظر موافقتي قبل implementation

أثناء البناء:
- Commit بعد كل feature كامل
- Lint + test + build بدون أخطاء
- Arabic commit messages مقبولة

تسليم:
- Documentation (markdown) لكل module
- API examples (curl)
- Migration script إذا schema تغيّر
- Changelog entry
```
