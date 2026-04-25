/**
 * forms-catalog.registry.js — ready-to-use form template catalogue.
 *
 * Phase 19 Commit 1. Provides 32 pre-designed FormTemplate seeds across
 * three audiences (beneficiary / hr / management) so admins can switch on
 * a working form with one click instead of building from FormDesigner.
 *
 * Design decisions:
 *
 *   1. Pure data — no I/O, no DB. The catalog is `require`-able from
 *      services, routes, CLIs, and tests. Drift test enforces shape.
 *
 *   2. IDs are dotted slugs (`<audience>.<category>.<form>`), e.g.
 *      `hr.leave.annual`. Once shipped they are frozen — never rename.
 *      Add a successor + mark old `deprecated: true` instead.
 *
 *   3. Each entry is a partial FormTemplate seed. The instantiate path
 *      (formsCatalogService.instantiate) clones the entry and persists
 *      it as a new FormTemplate doc, applying tenant/branch context.
 *
 *   4. `audience` ∈ {beneficiary, hr, management}. The admin UI groups
 *      the catalog by audience.
 *
 *   5. `approvalWorkflow.steps[*].role` MUST resolve to a role known to
 *      config/rbac.config.js — the registry test mirrors the pattern
 *      used by sla.registry.js / purchaseRequest.registry.js.
 *
 *   6. Field names are stable identifiers (snake_case) so downstream
 *      analytics + reporting can key off them across template versions.
 */

'use strict';

const AUDIENCES = Object.freeze(['beneficiary', 'hr', 'management']);

const CATEGORIES = Object.freeze({
  beneficiary: ['intake', 'consent', 'request', 'feedback', 'welfare'],
  hr: ['leave', 'compensation', 'change', 'evaluation', 'separation', 'feedback', 'development'],
  management: ['procurement', 'finance', 'governance', 'risk'],
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const text = (name, label, opts = {}) => ({ name, label, type: 'text', ...opts });
const textarea = (name, label, opts = {}) => ({ name, label, type: 'textarea', ...opts });
const number = (name, label, opts = {}) => ({ name, label, type: 'number', ...opts });
const date = (name, label, opts = {}) => ({ name, label, type: 'date', ...opts });
const select = (name, label, options, opts = {}) => ({
  name,
  label,
  type: 'select',
  options: options.map(o => (typeof o === 'string' ? { label: o, value: o } : o)),
  ...opts,
});
const checkbox = (name, label, opts = {}) => ({ name, label, type: 'checkbox', ...opts });
const file = (name, label, opts = {}) => ({ name, label, type: 'file', ...opts });
const sig = (name, label, opts = {}) => ({ name, label, type: 'signature', ...opts });
const rating = (name, label, opts = {}) => ({ name, label, type: 'rating', ...opts });

// ─── BENEFICIARY FORMS (12) ───────────────────────────────────────────────────

const beneficiaryForms = [
  {
    id: 'beneficiary.intake.registration',
    audience: 'beneficiary',
    category: 'intake',
    title: 'نموذج تسجيل مستفيد جديد',
    titleEn: 'New Beneficiary Registration',
    description: 'تسجيل مستفيد جديد في المركز مع البيانات الأساسية والطبية',
    icon: 'PersonAdd',
    sections: [
      { id: 'personal', title: 'البيانات الشخصية', order: 0, columns: 2 },
      { id: 'contact', title: 'بيانات التواصل', order: 1, columns: 2 },
      { id: 'medical', title: 'الحالة الطبية', order: 2, columns: 1 },
      { id: 'consent', title: 'الإقرار', order: 3, columns: 1 },
    ],
    fields: [
      text('full_name_ar', 'الاسم الرباعي بالعربية', { section: 'personal', required: true }),
      text('full_name_en', 'الاسم بالإنجليزية', { section: 'personal' }),
      text('national_id', 'رقم الهوية / الإقامة', {
        section: 'personal',
        required: true,
        validation: { pattern: '^[0-9]{10}$', patternMessage: 'يجب أن يكون 10 أرقام' },
      }),
      date('dob', 'تاريخ الميلاد', { section: 'personal', required: true }),
      select('gender', 'الجنس', ['ذكر', 'أنثى'], { section: 'personal', required: true }),
      select('nationality', 'الجنسية', ['سعودي', 'مقيم'], { section: 'personal', required: true }),
      text('guardian_name', 'اسم ولي الأمر', { section: 'contact', required: true }),
      text('phone', 'رقم الجوال', {
        section: 'contact',
        required: true,
        validation: { pattern: '^05[0-9]{8}$' },
      }),
      text('email', 'البريد الإلكتروني', { section: 'contact', type: 'email' }),
      textarea('address', 'العنوان السكني', { section: 'contact' }),
      textarea('diagnosis', 'التشخيص الطبي الأساسي', { section: 'medical', required: true }),
      file('medical_reports', 'التقارير الطبية', {
        section: 'medical',
        acceptedFileTypes: ['.pdf', '.jpg', '.png'],
      }),
      checkbox('agree_terms', 'أقر بصحة البيانات وأوافق على شروط الخدمة', {
        section: 'consent',
        required: true,
      }),
      sig('guardian_signature', 'توقيع ولي الأمر', { section: 'consent', required: true }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'reception_officer', label: 'استقبال', order: 0 },
        { role: 'admission_officer', label: 'قبول', order: 1 },
      ],
    },
    metadata: { sla_hours: 48, references: ['care.intake'] },
  },

  {
    id: 'beneficiary.consent.treatment',
    audience: 'beneficiary',
    category: 'consent',
    title: 'موافقة العلاج والتأهيل',
    titleEn: 'Treatment & Rehabilitation Consent',
    description: 'الموافقة على خطة العلاج والجلسات التأهيلية',
    icon: 'MedicalServices',
    sections: [
      { id: 'beneficiary', title: 'بيانات المستفيد', order: 0, columns: 2 },
      { id: 'consent', title: 'بنود الموافقة', order: 1, columns: 1 },
      { id: 'signature', title: 'التوقيع', order: 2, columns: 1 },
    ],
    fields: [
      text('beneficiary_id', 'رقم المستفيد', { section: 'beneficiary', required: true }),
      text('beneficiary_name', 'اسم المستفيد', { section: 'beneficiary', required: true }),
      checkbox('consent_assessment', 'أوافق على إجراء التقييمات الأولية والدورية', {
        section: 'consent',
        required: true,
      }),
      checkbox('consent_therapy', 'أوافق على جلسات العلاج (طبيعي/وظيفي/نطق/سلوكي)', {
        section: 'consent',
        required: true,
      }),
      checkbox('consent_emergency', 'أوافق على اتخاذ الإجراءات الطبية الطارئة عند اللزوم', {
        section: 'consent',
        required: true,
      }),
      checkbox('consent_progress_share', 'أوافق على مشاركة التقارير مع الجهات المختصة', {
        section: 'consent',
      }),
      textarea('special_notes', 'ملاحظات أو استثناءات', { section: 'consent' }),
      sig('guardian_signature', 'توقيع ولي الأمر', { section: 'signature', required: true }),
      date('signed_date', 'تاريخ التوقيع', { section: 'signature', required: true }),
    ],
    approvalWorkflow: { enabled: false },
    metadata: { revocable: true, retention_years: 7 },
  },

  {
    id: 'beneficiary.consent.photography',
    audience: 'beneficiary',
    category: 'consent',
    title: 'موافقة التصوير والنشر',
    titleEn: 'Photography & Media Consent',
    description: 'الموافقة على تصوير المستفيد لأغراض توثيقية أو إعلامية',
    icon: 'PhotoCamera',
    sections: [
      { id: 'main', title: 'الموافقة', order: 0, columns: 1 },
      { id: 'signature', title: 'التوقيع', order: 1, columns: 1 },
    ],
    fields: [
      text('beneficiary_id', 'رقم المستفيد', { section: 'main', required: true }),
      checkbox('consent_internal_documentation', 'تصوير داخلي توثيقي (سجلات طبية فقط)', {
        section: 'main',
      }),
      checkbox('consent_social_media', 'نشر على حسابات المركز في وسائل التواصل', {
        section: 'main',
      }),
      checkbox('consent_marketing', 'استخدام في مواد دعائية أو إعلامية', { section: 'main' }),
      checkbox('hide_face', 'يجب إخفاء ملامح الوجه في أي صورة منشورة', { section: 'main' }),
      date('valid_until', 'سريان الموافقة حتى تاريخ', { section: 'main' }),
      sig('guardian_signature', 'توقيع ولي الأمر', { section: 'signature', required: true }),
    ],
    approvalWorkflow: { enabled: false },
    metadata: { revocable: true, retention_years: 7 },
  },

  {
    id: 'beneficiary.consent.data-sharing',
    audience: 'beneficiary',
    category: 'consent',
    title: 'موافقة مشاركة البيانات الشخصية (PDPL)',
    titleEn: 'Personal Data Sharing Consent (PDPL)',
    description: 'الموافقة على مشاركة البيانات وفق نظام حماية البيانات الشخصية',
    icon: 'PrivacyTip',
    sections: [
      { id: 'purposes', title: 'أغراض المشاركة', order: 0, columns: 1 },
      { id: 'parties', title: 'الجهات المستقبلة', order: 1, columns: 1 },
      { id: 'rights', title: 'حقوقك', order: 2, columns: 1 },
      { id: 'signature', title: 'التوقيع', order: 3, columns: 1 },
    ],
    fields: [
      text('beneficiary_id', 'رقم المستفيد', { section: 'purposes', required: true }),
      checkbox('purpose_treatment', 'تقديم خدمات التأهيل والعلاج', { section: 'purposes' }),
      checkbox('purpose_insurance', 'مطالبات التأمين الطبي', { section: 'purposes' }),
      checkbox('purpose_research', 'البحوث المجهَّلة الهوية', { section: 'purposes' }),
      checkbox('share_moh', 'وزارة الصحة', { section: 'parties' }),
      checkbox('share_mhrsd', 'وزارة الموارد البشرية والتنمية الاجتماعية', { section: 'parties' }),
      checkbox('share_insurance', 'شركات التأمين', { section: 'parties' }),
      checkbox('right_access', 'أعلم بحقي في الوصول إلى بياناتي', {
        section: 'rights',
        required: true,
      }),
      checkbox('right_correct', 'أعلم بحقي في تصحيح بياناتي', {
        section: 'rights',
        required: true,
      }),
      checkbox('right_revoke', 'أعلم بحقي في سحب الموافقة في أي وقت', {
        section: 'rights',
        required: true,
      }),
      sig('guardian_signature', 'توقيع ولي الأمر', { section: 'signature', required: true }),
      date('signed_date', 'تاريخ التوقيع', { section: 'signature', required: true }),
    ],
    approvalWorkflow: { enabled: false },
    metadata: { revocable: true, regulatory: ['PDPL', 'KSA-NDMO'] },
  },

  {
    id: 'beneficiary.feedback.complaint',
    audience: 'beneficiary',
    category: 'feedback',
    title: 'بلاغ شكوى',
    titleEn: 'Service Complaint',
    description: 'تقديم شكوى رسمية بشأن خدمة أو موظف أو إجراء',
    icon: 'ReportProblem',
    sections: [
      { id: 'submitter', title: 'بيانات المُبلِّغ', order: 0, columns: 2 },
      { id: 'complaint', title: 'تفاصيل الشكوى', order: 1, columns: 1 },
      { id: 'attachments', title: 'مرفقات', order: 2, columns: 1 },
    ],
    fields: [
      text('submitter_name', 'الاسم', { section: 'submitter', required: true }),
      text('submitter_phone', 'رقم الجوال', { section: 'submitter', required: true }),
      select('relation', 'صفة المُبلِّغ', ['المستفيد', 'ولي الأمر', 'قريب', 'موظف', 'زائر'], {
        section: 'submitter',
        required: true,
      }),
      select(
        'category',
        'نوع الشكوى',
        ['جودة الخدمة الطبية', 'سلوك موظف', 'مرافق المركز', 'موعد / تأخير', 'فاتورة / دفع', 'أخرى'],
        { section: 'complaint', required: true }
      ),
      select('severity', 'درجة الأولوية', ['منخفضة', 'متوسطة', 'عالية', 'حرجة'], {
        section: 'complaint',
        required: true,
        defaultValue: 'متوسطة',
      }),
      date('incident_date', 'تاريخ الحادثة', { section: 'complaint' }),
      textarea('description', 'وصف تفصيلي', {
        section: 'complaint',
        required: true,
        validation: { minLength: 30 },
      }),
      textarea('expected_resolution', 'الحل المتوقع', { section: 'complaint' }),
      file('evidence', 'مرفقات داعمة', { section: 'attachments' }),
      checkbox('want_response', 'أرغب في تلقي رد رسمي', {
        section: 'attachments',
        defaultValue: true,
      }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'quality_officer', label: 'جودة', order: 0 },
        { role: 'branch_manager', label: 'مدير الفرع', order: 1, autoApproveAfterDays: 3 },
      ],
    },
    metadata: { sla_hours: 72, references: ['quality.complaints'] },
  },

  {
    id: 'beneficiary.feedback.suggestion',
    audience: 'beneficiary',
    category: 'feedback',
    title: 'اقتراح / ملاحظة',
    titleEn: 'Suggestion / Feedback',
    description: 'مشاركة اقتراح لتحسين الخدمة',
    icon: 'EmojiObjects',
    sections: [{ id: 'main', title: 'الاقتراح', order: 0, columns: 1 }],
    fields: [
      text('submitter_name', 'الاسم (اختياري)', { section: 'main' }),
      select('topic', 'الموضوع', ['خدمة طبية', 'مرافق', 'تطبيق إلكتروني', 'موظفين', 'أخرى'], {
        section: 'main',
        required: true,
      }),
      textarea('suggestion', 'تفاصيل الاقتراح', {
        section: 'main',
        required: true,
        validation: { minLength: 20 },
      }),
      rating('experience_rating', 'تقييم التجربة الحالية', { section: 'main' }),
    ],
    approvalWorkflow: { enabled: false },
    metadata: { sla_hours: 240 },
  },

  {
    id: 'beneficiary.welfare.application',
    audience: 'beneficiary',
    category: 'welfare',
    title: 'طلب إعانة / دعم',
    titleEn: 'Welfare Application',
    description: 'طلب دعم مالي أو عيني من برامج الإعانة',
    icon: 'VolunteerActivism',
    sections: [
      { id: 'beneficiary', title: 'بيانات المستفيد', order: 0, columns: 2 },
      { id: 'situation', title: 'الوضع المعيشي', order: 1, columns: 1 },
      { id: 'request', title: 'تفاصيل الطلب', order: 2, columns: 1 },
      { id: 'documents', title: 'المستندات', order: 3, columns: 1 },
    ],
    fields: [
      text('beneficiary_id', 'رقم المستفيد', { section: 'beneficiary', required: true }),
      number('family_size', 'عدد أفراد الأسرة', { section: 'situation', required: true }),
      number('monthly_income', 'الدخل الشهري (ريال)', { section: 'situation', required: true }),
      select('housing_type', 'نوع السكن', ['ملك', 'إيجار', 'سكن أسرة', 'أخرى'], {
        section: 'situation',
        required: true,
      }),
      number('monthly_rent', 'قيمة الإيجار الشهري', { section: 'situation' }),
      select(
        'support_type',
        'نوع الدعم المطلوب',
        ['مالي', 'تجهيزات طبية', 'مواصلات', 'أدوية', 'دروس خصوصية', 'أخرى'],
        { section: 'request', required: true }
      ),
      number('amount_requested', 'المبلغ المطلوب (ريال)', { section: 'request' }),
      textarea('justification', 'مبررات الطلب', {
        section: 'request',
        required: true,
        validation: { minLength: 50 },
      }),
      file('income_proof', 'إثبات الدخل / الإعالة', {
        section: 'documents',
        required: true,
      }),
      file('quotes', 'عروض أسعار (إن وُجدت)', { section: 'documents' }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'social_worker', label: 'الأخصائي الاجتماعي', order: 0 },
        { role: 'welfare_committee', label: 'لجنة الإعانة', order: 1 },
        { role: 'cfo', label: 'المدير المالي', order: 2 },
      ],
    },
    metadata: { sla_hours: 240, references: ['care.welfare'] },
  },

  {
    id: 'beneficiary.request.transfer',
    audience: 'beneficiary',
    category: 'request',
    title: 'طلب نقل بين الفروع',
    titleEn: 'Branch Transfer Request',
    description: 'طلب نقل المستفيد من فرع إلى فرع آخر',
    icon: 'TransferWithinAStation',
    sections: [
      { id: 'main', title: 'تفاصيل النقل', order: 0, columns: 2 },
      { id: 'reason', title: 'المبررات', order: 1, columns: 1 },
    ],
    fields: [
      text('beneficiary_id', 'رقم المستفيد', { section: 'main', required: true }),
      text('current_branch', 'الفرع الحالي', { section: 'main', required: true }),
      text('target_branch', 'الفرع المطلوب', { section: 'main', required: true }),
      date('preferred_date', 'تاريخ النقل المفضل', { section: 'main' }),
      select(
        'reason_category',
        'سبب النقل',
        ['تغيير سكن', 'قرب من العمل', 'توفر تخصص', 'أسباب شخصية', 'أخرى'],
        { section: 'reason', required: true }
      ),
      textarea('reason_details', 'تفاصيل', { section: 'reason', required: true }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'case_manager', label: 'مدير الحالة', order: 0 },
        { role: 'current_branch_manager', label: 'مدير الفرع الحالي', order: 1 },
        { role: 'target_branch_manager', label: 'مدير الفرع المستقبِل', order: 2 },
      ],
    },
    metadata: { sla_hours: 168 },
  },

  {
    id: 'beneficiary.request.visit',
    audience: 'beneficiary',
    category: 'request',
    title: 'طلب زيارة منزلية',
    titleEn: 'Home Visit Request',
    description: 'طلب جلسة منزلية بدلاً من الحضور للمركز',
    icon: 'Home',
    sections: [
      { id: 'main', title: 'تفاصيل الزيارة', order: 0, columns: 2 },
      { id: 'medical', title: 'الحالة الطبية', order: 1, columns: 1 },
    ],
    fields: [
      text('beneficiary_id', 'رقم المستفيد', { section: 'main', required: true }),
      date('preferred_date', 'التاريخ المفضل', { section: 'main', required: true }),
      select('preferred_time', 'الوقت المفضل', ['صباحًا', 'ظهرًا', 'مساءً'], {
        section: 'main',
        required: true,
      }),
      select('service', 'نوع الخدمة', ['علاج طبيعي', 'علاج وظيفي', 'نطق', 'تقييم', 'متابعة'], {
        section: 'main',
        required: true,
      }),
      textarea('address', 'العنوان كاملاً مع علامة جغرافية', {
        section: 'main',
        required: true,
      }),
      textarea('medical_reason', 'مبرر طبي للزيارة المنزلية', {
        section: 'medical',
        required: true,
      }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'case_manager', label: 'مدير الحالة', order: 0 },
        { role: 'home_visit_coordinator', label: 'منسق الزيارات المنزلية', order: 1 },
      ],
    },
    metadata: { sla_hours: 48, references: ['care.homeVisit'] },
  },

  {
    id: 'beneficiary.request.info-update',
    audience: 'beneficiary',
    category: 'request',
    title: 'تحديث البيانات الشخصية',
    titleEn: 'Personal Information Update',
    description: 'طلب تحديث بيانات (رقم جوال، عنوان، ولي أمر، …)',
    icon: 'Edit',
    sections: [{ id: 'main', title: 'البيانات المراد تحديثها', order: 0, columns: 1 }],
    fields: [
      text('beneficiary_id', 'رقم المستفيد', { section: 'main', required: true }),
      checkbox('update_phone', 'رقم الجوال', { section: 'main' }),
      text('new_phone', 'الرقم الجديد', {
        section: 'main',
        conditional: { field: 'update_phone', operator: 'equals', value: true, action: 'show' },
      }),
      checkbox('update_address', 'العنوان', { section: 'main' }),
      textarea('new_address', 'العنوان الجديد', {
        section: 'main',
        conditional: { field: 'update_address', operator: 'equals', value: true, action: 'show' },
      }),
      checkbox('update_guardian', 'ولي الأمر', { section: 'main' }),
      text('new_guardian', 'الاسم الجديد', {
        section: 'main',
        conditional: { field: 'update_guardian', operator: 'equals', value: true, action: 'show' },
      }),
      file('supporting_docs', 'مستندات داعمة', { section: 'main' }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [{ role: 'admission_officer', label: 'موظف القبول', order: 0 }],
    },
    metadata: { sla_hours: 24 },
  },

  {
    id: 'beneficiary.request.cessation',
    audience: 'beneficiary',
    category: 'request',
    title: 'طلب إيقاف الخدمة',
    titleEn: 'Service Cessation Request',
    description: 'إيقاف أو تعليق خدمات التأهيل',
    icon: 'StopCircle',
    sections: [{ id: 'main', title: 'تفاصيل الإيقاف', order: 0, columns: 1 }],
    fields: [
      text('beneficiary_id', 'رقم المستفيد', { section: 'main', required: true }),
      select('cessation_type', 'نوع الإيقاف', ['إيقاف مؤقت', 'إنهاء نهائي', 'تحويل إلى مركز آخر'], {
        section: 'main',
        required: true,
      }),
      date('effective_date', 'تاريخ السريان', { section: 'main', required: true }),
      date('resume_date', 'تاريخ الاستئناف المتوقع', {
        section: 'main',
        conditional: {
          field: 'cessation_type',
          operator: 'equals',
          value: 'إيقاف مؤقت',
          action: 'show',
        },
      }),
      textarea('reason', 'سبب الإيقاف', {
        section: 'main',
        required: true,
        validation: { minLength: 30 },
      }),
      checkbox('confirm_no_dues', 'أقر بعدم وجود مستحقات مالية على المستفيد', {
        section: 'main',
        required: true,
      }),
      sig('guardian_signature', 'توقيع ولي الأمر', { section: 'main', required: true }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'case_manager', label: 'مدير الحالة', order: 0 },
        { role: 'finance_officer', label: 'مالية', order: 1 },
        { role: 'branch_manager', label: 'مدير الفرع', order: 2 },
      ],
    },
    metadata: { sla_hours: 120 },
  },

  {
    id: 'beneficiary.feedback.satisfaction-survey',
    audience: 'beneficiary',
    category: 'feedback',
    title: 'استبيان رضا',
    titleEn: 'Satisfaction Survey',
    description: 'تقييم تجربة المستفيد للخدمات المقدَّمة',
    icon: 'Poll',
    sections: [
      { id: 'ratings', title: 'تقييم الجوانب', order: 0, columns: 1 },
      { id: 'open', title: 'تعليقات', order: 1, columns: 1 },
    ],
    fields: [
      rating('rating_staff', 'الكادر الطبي والإداري', { section: 'ratings', required: true }),
      rating('rating_facility', 'نظافة المرافق وراحتها', { section: 'ratings', required: true }),
      rating('rating_appointments', 'سهولة الحجز والمواعيد', {
        section: 'ratings',
        required: true,
      }),
      rating('rating_progress', 'وضوح التقدم في الخطة العلاجية', {
        section: 'ratings',
        required: true,
      }),
      rating('rating_overall', 'التقييم العام', { section: 'ratings', required: true }),
      number('nps', 'هل تنصح غيرك بالمركز؟ (0-10)', {
        section: 'ratings',
        validation: { min: 0, max: 10 },
      }),
      textarea('what_we_did_well', 'ما الذي أعجبك؟', { section: 'open' }),
      textarea('what_to_improve', 'ما الذي يحتاج تحسين؟', { section: 'open' }),
    ],
    approvalWorkflow: { enabled: false },
    metadata: { anonymous: true, references: ['quality.nps'] },
  },
];

// ─── HR FORMS (12) ────────────────────────────────────────────────────────────

const hrForms = [
  {
    id: 'hr.leave.annual',
    audience: 'hr',
    category: 'leave',
    title: 'طلب إجازة سنوية',
    titleEn: 'Annual Leave Request',
    description: 'طلب إجازة سنوية مدفوعة',
    icon: 'BeachAccess',
    sections: [
      { id: 'main', title: 'تفاصيل الإجازة', order: 0, columns: 2 },
      { id: 'coverage', title: 'تسليم العمل', order: 1, columns: 1 },
    ],
    fields: [
      date('from_date', 'من تاريخ', { section: 'main', required: true }),
      date('to_date', 'إلى تاريخ', { section: 'main', required: true }),
      number('days_count', 'عدد الأيام', {
        section: 'main',
        readOnly: true,
        formula: '({to_date} - {from_date}) / 86400000 + 1',
      }),
      number('balance_remaining', 'الرصيد المتبقي بعد الإجازة', {
        section: 'main',
        readOnly: true,
      }),
      textarea('reason', 'سبب الإجازة', { section: 'main' }),
      text('cover_employee', 'الموظف البديل', { section: 'coverage', required: true }),
      textarea('handover_notes', 'مذكرة التسليم', { section: 'coverage' }),
      text('contact_during_leave', 'وسيلة التواصل عند الضرورة', { section: 'coverage' }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'direct_manager', label: 'المدير المباشر', order: 0 },
        { role: 'hr_officer', label: 'الموارد البشرية', order: 1 },
      ],
    },
    metadata: { sla_hours: 48, references: ['hr.leave'] },
  },

  {
    id: 'hr.leave.sick',
    audience: 'hr',
    category: 'leave',
    title: 'طلب إجازة مرضية',
    titleEn: 'Sick Leave Request',
    description: 'إجازة مرضية مع تقرير طبي',
    icon: 'Sick',
    sections: [
      { id: 'main', title: 'تفاصيل الإجازة', order: 0, columns: 2 },
      { id: 'medical', title: 'التقرير الطبي', order: 1, columns: 1 },
    ],
    fields: [
      date('from_date', 'من تاريخ', { section: 'main', required: true }),
      date('to_date', 'إلى تاريخ', { section: 'main', required: true }),
      text('hospital_name', 'اسم المستشفى / العيادة', { section: 'medical', required: true }),
      file('medical_report', 'التقرير الطبي', {
        section: 'medical',
        required: true,
        acceptedFileTypes: ['.pdf', '.jpg', '.png'],
      }),
      textarea('notes', 'ملاحظات', { section: 'medical' }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'direct_manager', label: 'المدير المباشر', order: 0 },
        { role: 'hr_officer', label: 'الموارد البشرية', order: 1 },
      ],
    },
    metadata: { sla_hours: 24, references: ['hr.leave', 'compliance.labor-law'] },
  },

  {
    id: 'hr.leave.maternity-paternity',
    audience: 'hr',
    category: 'leave',
    title: 'إجازة وضع / أبوة',
    titleEn: 'Maternity / Paternity Leave',
    description: 'إجازة وضع للأم أو إجازة أبوة',
    icon: 'ChildFriendly',
    sections: [{ id: 'main', title: 'البيانات', order: 0, columns: 1 }],
    fields: [
      select('leave_type', 'نوع الإجازة', ['وضع', 'أبوة'], { section: 'main', required: true }),
      date('expected_due_date', 'تاريخ الولادة المتوقع', { section: 'main', required: true }),
      date('actual_birth_date', 'تاريخ الولادة الفعلي', { section: 'main' }),
      date('from_date', 'بداية الإجازة', { section: 'main', required: true }),
      date('to_date', 'نهاية الإجازة', { section: 'main', required: true }),
      file('medical_doc', 'تقرير طبي / شهادة ميلاد', {
        section: 'main',
        required: true,
      }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'direct_manager', label: 'المدير المباشر', order: 0 },
        { role: 'hr_officer', label: 'الموارد البشرية', order: 1 },
      ],
    },
    metadata: { references: ['compliance.labor-law'] },
  },

  {
    id: 'hr.compensation.overtime',
    audience: 'hr',
    category: 'compensation',
    title: 'طلب ساعات إضافية',
    titleEn: 'Overtime Request',
    description: 'طلب ساعات عمل إضافية مدفوعة',
    icon: 'AccessTime',
    sections: [
      { id: 'main', title: 'تفاصيل الساعات', order: 0, columns: 2 },
      { id: 'justification', title: 'المبررات', order: 1, columns: 1 },
    ],
    fields: [
      date('work_date', 'تاريخ العمل الإضافي', { section: 'main', required: true }),
      number('hours_count', 'عدد الساعات', {
        section: 'main',
        required: true,
        validation: { min: 1, max: 12 },
      }),
      select('rate_type', 'نوع التعويض', ['عادي', 'مضاعف', 'إجازة بديلة'], {
        section: 'main',
        required: true,
      }),
      textarea('task_description', 'وصف المهمة', {
        section: 'justification',
        required: true,
      }),
      textarea('manager_justification', 'مبرر المدير', { section: 'justification' }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'direct_manager', label: 'المدير المباشر', order: 0 },
        { role: 'hr_officer', label: 'الموارد البشرية', order: 1 },
      ],
    },
    metadata: { sla_hours: 72, references: ['hr.payroll'] },
  },

  {
    id: 'hr.change.salary',
    audience: 'hr',
    category: 'change',
    title: 'طلب تعديل راتب',
    titleEn: 'Salary Change Request',
    description: 'طلب زيادة أو تعديل راتب موظف',
    icon: 'AttachMoney',
    sections: [
      { id: 'employee', title: 'الموظف', order: 0, columns: 2 },
      { id: 'change', title: 'التغيير المطلوب', order: 1, columns: 2 },
      { id: 'justification', title: 'المبررات', order: 2, columns: 1 },
    ],
    fields: [
      text('employee_id', 'رقم الموظف', { section: 'employee', required: true }),
      text('current_position', 'المسمى الحالي', { section: 'employee', readOnly: true }),
      number('current_salary', 'الراتب الحالي', { section: 'change', readOnly: true }),
      number('new_salary', 'الراتب المقترح', { section: 'change', required: true }),
      select(
        'change_type',
        'نوع التغيير',
        ['زيادة سنوية', 'ترقية', 'تعديل سوق', 'مكافأة أداء', 'أخرى'],
        { section: 'change', required: true }
      ),
      date('effective_date', 'تاريخ السريان', { section: 'change', required: true }),
      textarea('justification', 'المبررات', {
        section: 'justification',
        required: true,
        validation: { minLength: 50 },
      }),
      file('performance_review', 'آخر تقييم أداء', { section: 'justification' }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'direct_manager', label: 'المدير المباشر', order: 0 },
        { role: 'hr_director', label: 'مدير الموارد البشرية', order: 1 },
        { role: 'cfo', label: 'المدير المالي', order: 2 },
        { role: 'ceo', label: 'الرئيس التنفيذي', order: 3 },
      ],
    },
    metadata: { sla_hours: 240, sensitive: true, references: ['hr.changeRequest'] },
  },

  {
    id: 'hr.change.position',
    audience: 'hr',
    category: 'change',
    title: 'طلب تعديل مسمى وظيفي',
    titleEn: 'Position Change Request',
    description: 'تغيير المسمى الوظيفي أو الإدارة',
    icon: 'Work',
    sections: [{ id: 'main', title: 'التغيير', order: 0, columns: 1 }],
    fields: [
      text('employee_id', 'رقم الموظف', { section: 'main', required: true }),
      text('current_position', 'المسمى الحالي', { section: 'main', readOnly: true }),
      text('current_department', 'الإدارة الحالية', { section: 'main', readOnly: true }),
      text('new_position', 'المسمى الجديد', { section: 'main', required: true }),
      text('new_department', 'الإدارة الجديدة', { section: 'main', required: true }),
      date('effective_date', 'تاريخ السريان', { section: 'main', required: true }),
      textarea('justification', 'المبررات', { section: 'main', required: true }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'current_manager', label: 'المدير الحالي', order: 0 },
        { role: 'new_manager', label: 'المدير الجديد', order: 1 },
        { role: 'hr_director', label: 'مدير الموارد البشرية', order: 2 },
      ],
    },
    metadata: { sla_hours: 168, references: ['hr.changeRequest'] },
  },

  {
    id: 'hr.change.transfer',
    audience: 'hr',
    category: 'change',
    title: 'طلب نقل بين الفروع',
    titleEn: 'Branch Transfer Request',
    description: 'نقل موظف من فرع إلى فرع آخر',
    icon: 'SwapHoriz',
    sections: [{ id: 'main', title: 'النقل', order: 0, columns: 1 }],
    fields: [
      text('employee_id', 'رقم الموظف', { section: 'main', required: true }),
      text('current_branch', 'الفرع الحالي', { section: 'main', readOnly: true }),
      text('target_branch', 'الفرع المطلوب', { section: 'main', required: true }),
      select('transfer_type', 'نوع النقل', ['دائم', 'مؤقت', 'انتداب'], {
        section: 'main',
        required: true,
      }),
      date('from_date', 'تاريخ بداية النقل', { section: 'main', required: true }),
      date('to_date', 'تاريخ نهاية النقل', {
        section: 'main',
        conditional: { field: 'transfer_type', operator: 'equals', value: 'مؤقت', action: 'show' },
      }),
      textarea('reason', 'السبب', { section: 'main', required: true }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'current_branch_manager', label: 'مدير الفرع الحالي', order: 0 },
        { role: 'target_branch_manager', label: 'مدير الفرع المستقبِل', order: 1 },
        { role: 'hr_director', label: 'مدير الموارد البشرية', order: 2 },
      ],
    },
    metadata: { sla_hours: 168, references: ['hr.changeRequest'] },
  },

  {
    id: 'hr.separation.resignation',
    audience: 'hr',
    category: 'separation',
    title: 'استقالة',
    titleEn: 'Resignation Letter',
    description: 'تقديم استقالة رسمية مع فترة الإشعار',
    icon: 'ExitToApp',
    sections: [
      { id: 'main', title: 'التفاصيل', order: 0, columns: 1 },
      { id: 'reason', title: 'الأسباب', order: 1, columns: 1 },
      { id: 'handover', title: 'التسليم', order: 2, columns: 1 },
    ],
    fields: [
      date('resignation_date', 'تاريخ التقديم', { section: 'main', required: true }),
      date('last_working_day', 'آخر يوم عمل', { section: 'main', required: true }),
      number('notice_period_days', 'فترة الإشعار (أيام)', {
        section: 'main',
        required: true,
        defaultValue: 30,
      }),
      select(
        'reason_category',
        'سبب الاستقالة',
        ['فرصة أفضل', 'أسباب شخصية', 'سفر', 'تقاعد', 'تطوير مهني', 'أخرى'],
        { section: 'reason', required: true }
      ),
      textarea('reason_details', 'تفاصيل', { section: 'reason' }),
      textarea('handover_plan', 'خطة تسليم المهام', { section: 'handover', required: true }),
      sig('employee_signature', 'توقيع الموظف', { section: 'handover', required: true }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'direct_manager', label: 'المدير المباشر', order: 0 },
        { role: 'hr_director', label: 'مدير الموارد البشرية', order: 1 },
        { role: 'finance_officer', label: 'مالية (تسويات)', order: 2 },
      ],
    },
    metadata: { sla_hours: 240, references: ['hr.changeRequest', 'hr.payroll.settlement'] },
  },

  {
    id: 'hr.evaluation.performance-annual',
    audience: 'hr',
    category: 'evaluation',
    title: 'تقييم أداء سنوي',
    titleEn: 'Annual Performance Review',
    description: 'تقييم الأداء السنوي من قبل المدير المباشر',
    icon: 'Assessment',
    sections: [
      { id: 'employee', title: 'الموظف', order: 0, columns: 2 },
      { id: 'goals', title: 'الأهداف', order: 1, columns: 1 },
      { id: 'competencies', title: 'الكفاءات', order: 2, columns: 1 },
      { id: 'overall', title: 'التقييم العام', order: 3, columns: 1 },
    ],
    fields: [
      text('employee_id', 'رقم الموظف', { section: 'employee', required: true }),
      text('review_period', 'الفترة المُقيَّمة', {
        section: 'employee',
        required: true,
        defaultValue: '2026',
      }),
      textarea('goals_achievement', 'تحقيق الأهداف السنوية', {
        section: 'goals',
        required: true,
      }),
      rating('competency_quality', 'جودة العمل', { section: 'competencies', required: true }),
      rating('competency_productivity', 'الإنتاجية', {
        section: 'competencies',
        required: true,
      }),
      rating('competency_teamwork', 'العمل ضمن الفريق', {
        section: 'competencies',
        required: true,
      }),
      rating('competency_initiative', 'المبادرة', { section: 'competencies', required: true }),
      rating('competency_attendance', 'الالتزام والحضور', {
        section: 'competencies',
        required: true,
      }),
      select(
        'overall_rating',
        'التقييم النهائي',
        ['يتجاوز التوقعات', 'يلبي التوقعات', 'يحتاج تحسين', 'دون التوقعات'],
        { section: 'overall', required: true }
      ),
      textarea('strengths', 'نقاط القوة', { section: 'overall' }),
      textarea('improvement_areas', 'مجالات التطوير', { section: 'overall' }),
      textarea('next_year_goals', 'أهداف العام القادم', { section: 'overall' }),
      sig('manager_signature', 'توقيع المدير', { section: 'overall', required: true }),
      sig('employee_signature', 'توقيع الموظف', { section: 'overall', required: true }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'direct_manager', label: 'المدير المباشر', order: 0 },
        { role: 'department_head', label: 'رئيس القسم', order: 1 },
        { role: 'hr_director', label: 'مدير الموارد البشرية', order: 2 },
      ],
    },
    metadata: { references: ['hr.performance'] },
  },

  {
    id: 'hr.feedback.employee-complaint',
    audience: 'hr',
    category: 'feedback',
    title: 'شكوى موظف',
    titleEn: 'Employee Complaint',
    description: 'شكوى داخلية بشأن بيئة العمل أو زملاء',
    icon: 'Forum',
    sections: [{ id: 'main', title: 'الشكوى', order: 0, columns: 1 }],
    fields: [
      select(
        'category',
        'نوع الشكوى',
        ['تحرش', 'تمييز', 'سلوك مسيء', 'بيئة عمل', 'أداء إداري', 'أخرى'],
        { section: 'main', required: true }
      ),
      checkbox('confidential', 'أرغب في السرية التامة', {
        section: 'main',
        defaultValue: true,
      }),
      checkbox('anonymous', 'تقديم بشكل مجهول', { section: 'main' }),
      textarea('description', 'وصف تفصيلي', {
        section: 'main',
        required: true,
        validation: { minLength: 50 },
      }),
      textarea('witnesses', 'شهود (اختياري)', { section: 'main' }),
      file('evidence', 'مرفقات', { section: 'main' }),
      textarea('expected_resolution', 'الحل المرغوب', { section: 'main' }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'hr_officer', label: 'الموارد البشرية', order: 0 },
        { role: 'hr_director', label: 'مدير الموارد البشرية', order: 1, autoApproveAfterDays: 5 },
      ],
    },
    metadata: { sla_hours: 72, sensitive: true },
  },

  {
    id: 'hr.development.training-request',
    audience: 'hr',
    category: 'development',
    title: 'طلب تدريب / دورة',
    titleEn: 'Training Request',
    description: 'طلب حضور دورة تدريبية أو شهادة',
    icon: 'School',
    sections: [
      { id: 'training', title: 'الدورة', order: 0, columns: 1 },
      { id: 'cost', title: 'التكلفة', order: 1, columns: 2 },
      { id: 'justification', title: 'المبررات', order: 2, columns: 1 },
    ],
    fields: [
      text('course_name', 'اسم الدورة', { section: 'training', required: true }),
      text('provider', 'الجهة المقدِّمة', { section: 'training', required: true }),
      date('start_date', 'تاريخ البداية', { section: 'training', required: true }),
      date('end_date', 'تاريخ النهاية', { section: 'training', required: true }),
      select('format', 'الصيغة', ['حضوري', 'عن بُعد', 'هجين'], {
        section: 'training',
        required: true,
      }),
      number('cost_amount', 'التكلفة (ريال)', { section: 'cost', required: true }),
      select('cost_coverage', 'من يتحمل التكلفة', ['المركز كاملاً', 'الموظف كاملاً', 'مشاركة'], {
        section: 'cost',
        required: true,
      }),
      textarea('benefit_to_role', 'كيف يفيد الدور الحالي', {
        section: 'justification',
        required: true,
      }),
      checkbox('commitment_to_stay', 'أتعهد بالبقاء سنة بعد الدورة', { section: 'justification' }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'direct_manager', label: 'المدير المباشر', order: 0 },
        { role: 'hr_director', label: 'مدير الموارد البشرية', order: 1 },
        { role: 'cfo', label: 'المدير المالي (إن > حد)', order: 2 },
      ],
    },
    metadata: { sla_hours: 168 },
  },

  {
    id: 'hr.compensation.salary-advance',
    audience: 'hr',
    category: 'compensation',
    title: 'طلب سُلفة على الراتب',
    titleEn: 'Salary Advance Request',
    description: 'طلب سحب سُلفة من الراتب',
    icon: 'Payments',
    sections: [{ id: 'main', title: 'تفاصيل السُلفة', order: 0, columns: 2 }],
    fields: [
      number('amount_requested', 'المبلغ (ريال)', { section: 'main', required: true }),
      number('repayment_months', 'عدد أشهر السداد', {
        section: 'main',
        required: true,
        defaultValue: 6,
        validation: { min: 1, max: 24 },
      }),
      date('expected_disbursement', 'التاريخ المطلوب', { section: 'main', required: true }),
      select('reason', 'السبب', ['طبي', 'تعليمي', 'سكني', 'طارئ عائلي', 'أخرى'], {
        section: 'main',
        required: true,
      }),
      textarea('details', 'تفاصيل', { section: 'main' }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'direct_manager', label: 'المدير المباشر', order: 0 },
        { role: 'hr_director', label: 'مدير الموارد البشرية', order: 1 },
        { role: 'cfo', label: 'المدير المالي', order: 2 },
      ],
    },
    metadata: { sla_hours: 120, references: ['hr.payroll'] },
  },
];

// ─── MANAGEMENT FORMS (8) ─────────────────────────────────────────────────────

const managementForms = [
  {
    id: 'management.procurement.purchase-request',
    audience: 'management',
    category: 'procurement',
    title: 'طلب شراء',
    titleEn: 'Purchase Request',
    description: 'طلب شراء معدات/مواد/خدمات',
    icon: 'ShoppingCart',
    sections: [
      { id: 'main', title: 'بنود الطلب', order: 0, columns: 1 },
      { id: 'budget', title: 'الميزانية', order: 1, columns: 2 },
      { id: 'justification', title: 'المبررات', order: 2, columns: 1 },
    ],
    fields: [
      select('category', 'الفئة', ['معدات طبية', 'أثاث', 'تقنية', 'مستلزمات', 'خدمات'], {
        section: 'main',
        required: true,
      }),
      {
        name: 'items',
        label: 'البنود',
        type: 'repeater',
        section: 'main',
        required: true,
        minRows: 1,
        repeaterFields: [
          { name: 'description', label: 'الوصف', type: 'text', required: true },
          { name: 'quantity', label: 'الكمية', type: 'number', required: true },
          { name: 'unit_price', label: 'السعر للوحدة', type: 'number', required: true },
        ],
      },
      number('total_amount', 'المبلغ الإجمالي', { section: 'budget', required: true }),
      text('cost_center', 'مركز التكلفة', { section: 'budget', required: true }),
      select('urgency', 'الأولوية', ['عادية', 'عاجلة', 'طارئة'], {
        section: 'budget',
        required: true,
        defaultValue: 'عادية',
      }),
      textarea('justification', 'المبررات', {
        section: 'justification',
        required: true,
      }),
      file('quotes', 'عروض الأسعار (3 على الأقل)', { section: 'justification', required: true }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'requester_manager', label: 'مدير القسم', order: 0 },
        { role: 'procurement_officer', label: 'المشتريات', order: 1 },
        { role: 'cfo', label: 'المدير المالي', order: 2 },
        { role: 'ceo', label: 'الرئيس التنفيذي (إن > حد)', order: 3 },
      ],
    },
    metadata: { sla_hours: 168, references: ['ops.purchaseRequest'] },
  },

  {
    id: 'management.finance.budget-approval',
    audience: 'management',
    category: 'finance',
    title: 'اعتماد ميزانية',
    titleEn: 'Budget Approval',
    description: 'اعتماد ميزانية قسم/مشروع/فترة',
    icon: 'AccountBalance',
    sections: [
      { id: 'main', title: 'الميزانية', order: 0, columns: 2 },
      { id: 'breakdown', title: 'البنود', order: 1, columns: 1 },
    ],
    fields: [
      select('budget_type', 'نوع الميزانية', ['تشغيلية', 'رأسمالية', 'مشروع', 'طارئة'], {
        section: 'main',
        required: true,
      }),
      text('cost_center', 'مركز التكلفة / القسم', { section: 'main', required: true }),
      text('period', 'الفترة (مثل: Q1 2026)', { section: 'main', required: true }),
      number('total_budget', 'إجمالي الميزانية (ريال)', { section: 'main', required: true }),
      {
        name: 'line_items',
        label: 'البنود التفصيلية',
        type: 'repeater',
        section: 'breakdown',
        required: true,
        minRows: 1,
        repeaterFields: [
          { name: 'category', label: 'الفئة', type: 'text' },
          { name: 'amount', label: 'المبلغ', type: 'number' },
          { name: 'notes', label: 'ملاحظات', type: 'text' },
        ],
      },
      textarea('justification', 'المبررات', { section: 'breakdown', required: true }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'department_head', label: 'رئيس القسم', order: 0 },
        { role: 'cfo', label: 'المدير المالي', order: 1 },
        { role: 'ceo', label: 'الرئيس التنفيذي', order: 2 },
        { role: 'board', label: 'مجلس الإدارة (إن capex)', order: 3 },
      ],
    },
    metadata: { sla_hours: 240, sensitive: true },
  },

  {
    id: 'management.finance.capex-approval',
    audience: 'management',
    category: 'finance',
    title: 'اعتماد إنفاق رأسمالي',
    titleEn: 'Capital Expenditure Approval',
    description: 'اعتماد شراء أصول > 100,000 ريال',
    icon: 'Construction',
    sections: [
      { id: 'main', title: 'الأصل', order: 0, columns: 2 },
      { id: 'business-case', title: 'الجدوى', order: 1, columns: 1 },
    ],
    fields: [
      text('asset_name', 'وصف الأصل', { section: 'main', required: true }),
      select('asset_class', 'فئة الأصل', ['معدات طبية', 'مباني', 'مركبات', 'أنظمة تقنية', 'أخرى'], {
        section: 'main',
        required: true,
      }),
      number('cost', 'التكلفة (ريال)', { section: 'main', required: true }),
      number('useful_life_years', 'العمر الإنتاجي (سنوات)', { section: 'main', required: true }),
      number('expected_roi_pct', 'العائد المتوقع %', { section: 'main' }),
      textarea('strategic_rationale', 'الأهمية الاستراتيجية', {
        section: 'business-case',
        required: true,
      }),
      textarea('alternatives_considered', 'البدائل المدروسة', { section: 'business-case' }),
      textarea('risk_assessment', 'تقييم المخاطر', { section: 'business-case', required: true }),
      file('vendor_quotes', 'عروض الموردين', { section: 'business-case', required: true }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'cfo', label: 'المدير المالي', order: 0 },
        { role: 'ceo', label: 'الرئيس التنفيذي', order: 1 },
        { role: 'board', label: 'مجلس الإدارة', order: 2 },
      ],
    },
    metadata: { sla_hours: 480, sensitive: true, threshold_sar: 100000 },
  },

  {
    id: 'management.procurement.vendor-onboarding',
    audience: 'management',
    category: 'procurement',
    title: 'تسجيل مورد جديد',
    titleEn: 'Vendor Onboarding',
    description: 'تسجيل مورد جديد في النظام',
    icon: 'Business',
    sections: [
      { id: 'company', title: 'الشركة', order: 0, columns: 2 },
      { id: 'contact', title: 'التواصل', order: 1, columns: 2 },
      { id: 'compliance', title: 'الالتزامات', order: 2, columns: 1 },
    ],
    fields: [
      text('legal_name', 'الاسم النظامي', { section: 'company', required: true }),
      text('trade_license', 'السجل التجاري', { section: 'company', required: true }),
      text('vat_number', 'الرقم الضريبي', { section: 'company', required: true }),
      select(
        'company_type',
        'نوع الشركة',
        ['مؤسسة فردية', 'شركة ذات مسؤولية محدودة', 'مساهمة', 'فرع أجنبي'],
        { section: 'company', required: true }
      ),
      text('contact_person', 'الشخص المسؤول', { section: 'contact', required: true }),
      text('contact_phone', 'الجوال', { section: 'contact', required: true }),
      text('contact_email', 'البريد الإلكتروني', {
        section: 'contact',
        type: 'email',
        required: true,
      }),
      textarea('address', 'العنوان', { section: 'contact' }),
      text('iban', 'IBAN للتحويل', { section: 'contact' }),
      file('cr_copy', 'نسخة السجل التجاري', { section: 'compliance', required: true }),
      file('vat_cert', 'شهادة ضريبة القيمة المضافة', { section: 'compliance', required: true }),
      file('zakat_cert', 'شهادة الزكاة', { section: 'compliance' }),
      file('saudization_cert', 'شهادة السعودة', { section: 'compliance' }),
      checkbox('agree_anti_bribery', 'يلتزم المورد بميثاق مكافحة الرشوة', {
        section: 'compliance',
        required: true,
      }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'procurement_officer', label: 'المشتريات', order: 0 },
        { role: 'legal_officer', label: 'القانوني', order: 1 },
        { role: 'cfo', label: 'المدير المالي', order: 2 },
      ],
    },
    metadata: { sla_hours: 168 },
  },

  {
    id: 'management.governance.policy-change',
    audience: 'management',
    category: 'governance',
    title: 'اقتراح تعديل سياسة',
    titleEn: 'Policy Change Proposal',
    description: 'اقتراح إضافة/تعديل/إلغاء سياسة داخلية',
    icon: 'Gavel',
    sections: [
      { id: 'main', title: 'السياسة', order: 0, columns: 1 },
      { id: 'change', title: 'التغيير المقترح', order: 1, columns: 1 },
      { id: 'impact', title: 'الأثر', order: 2, columns: 1 },
    ],
    fields: [
      text('policy_id', 'رقم السياسة (إن قائمة)', { section: 'main' }),
      text('policy_title', 'عنوان السياسة', { section: 'main', required: true }),
      select('change_type', 'نوع التغيير', ['سياسة جديدة', 'تعديل', 'إلغاء'], {
        section: 'main',
        required: true,
      }),
      textarea('current_state', 'النص الحالي', {
        section: 'change',
        conditional: { field: 'change_type', operator: 'not_equals', value: 'سياسة جديدة' },
      }),
      textarea('proposed_state', 'النص المقترح', { section: 'change', required: true }),
      textarea('rationale', 'مبرر التغيير', { section: 'change', required: true }),
      select('impact_level', 'مستوى الأثر', ['منخفض', 'متوسط', 'عالٍ', 'حاسم'], {
        section: 'impact',
        required: true,
      }),
      textarea('affected_departments', 'الإدارات المتأثرة', { section: 'impact', required: true }),
      textarea('rollout_plan', 'خطة التطبيق', { section: 'impact' }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'policy_owner', label: 'مالك السياسة', order: 0 },
        { role: 'legal_officer', label: 'القانوني', order: 1 },
        { role: 'compliance_officer', label: 'الالتزام', order: 2 },
        { role: 'ceo', label: 'الرئيس التنفيذي', order: 3 },
      ],
    },
    metadata: { sla_hours: 480, references: ['governance.policies'] },
  },

  {
    id: 'management.governance.strategic-decision',
    audience: 'management',
    category: 'governance',
    title: 'مذكرة قرار استراتيجي',
    titleEn: 'Strategic Decision Memo',
    description: 'توثيق قرار استراتيجي يحتاج اعتماد القيادة',
    icon: 'Insights',
    sections: [
      { id: 'main', title: 'القرار', order: 0, columns: 1 },
      { id: 'analysis', title: 'التحليل', order: 1, columns: 1 },
    ],
    fields: [
      text('decision_title', 'عنوان القرار', { section: 'main', required: true }),
      select(
        'domain',
        'المجال',
        ['توسع', 'استثمار', 'شراكة', 'إعادة هيكلة', 'تقنية', 'تشغيل', 'مالي'],
        { section: 'main', required: true }
      ),
      textarea('summary', 'ملخص تنفيذي', { section: 'main', required: true }),
      textarea('background', 'الخلفية', { section: 'analysis', required: true }),
      textarea('options_evaluated', 'الخيارات المقيَّمة', { section: 'analysis', required: true }),
      textarea('recommended_option', 'الخيار الموصى به', { section: 'analysis', required: true }),
      textarea('financial_impact', 'الأثر المالي', { section: 'analysis' }),
      textarea('risks', 'المخاطر الرئيسية', { section: 'analysis', required: true }),
      textarea('next_steps', 'الخطوات التالية', { section: 'analysis' }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'cfo', label: 'المدير المالي', order: 0 },
        { role: 'ceo', label: 'الرئيس التنفيذي', order: 1 },
        { role: 'board', label: 'مجلس الإدارة', order: 2 },
      ],
    },
    metadata: { sla_hours: 720, sensitive: true },
  },

  {
    id: 'management.risk.audit-finding-response',
    audience: 'management',
    category: 'risk',
    title: 'رد على ملاحظة مراجعة',
    titleEn: 'Audit Finding Response',
    description: 'الرد الرسمي على ملاحظة من المراجعة الداخلية أو الخارجية',
    icon: 'FactCheck',
    sections: [
      { id: 'finding', title: 'الملاحظة', order: 0, columns: 1 },
      { id: 'response', title: 'الرد', order: 1, columns: 1 },
      { id: 'plan', title: 'خطة العمل', order: 2, columns: 1 },
    ],
    fields: [
      text('finding_id', 'رقم الملاحظة', { section: 'finding', required: true }),
      select('audit_type', 'نوع المراجعة', ['داخلية', 'خارجية', 'هيئة تنظيمية', 'CBAHI', 'SOCPA'], {
        section: 'finding',
        required: true,
      }),
      select('severity', 'درجة الخطورة', ['منخفضة', 'متوسطة', 'عالية', 'حرجة'], {
        section: 'finding',
        required: true,
      }),
      textarea('finding_summary', 'ملخص الملاحظة', { section: 'finding', required: true }),
      select(
        'response_type',
        'نوع الرد',
        ['موافقة + خطة معالجة', 'موافقة جزئية', 'اعتراض', 'قبول مخاطرة'],
        { section: 'response', required: true }
      ),
      textarea('response_text', 'نص الرد', { section: 'response', required: true }),
      textarea('root_cause', 'السبب الجذري', { section: 'plan' }),
      textarea('action_plan', 'إجراءات تصحيحية', { section: 'plan', required: true }),
      text('action_owner', 'المسؤول', { section: 'plan', required: true }),
      date('target_date', 'تاريخ الإغلاق المستهدف', { section: 'plan', required: true }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'process_owner', label: 'مالك العملية', order: 0 },
        { role: 'compliance_officer', label: 'الالتزام', order: 1 },
        { role: 'audit_committee', label: 'لجنة المراجعة', order: 2 },
      ],
    },
    metadata: { sla_hours: 240, references: ['quality.capa', 'governance.audit'] },
  },

  {
    id: 'management.risk.acceptance',
    audience: 'management',
    category: 'risk',
    title: 'قبول مخاطرة',
    titleEn: 'Risk Acceptance',
    description: 'قبول رسمي لمخاطرة دون تطبيق ضوابط مخفِّفة',
    icon: 'Warning',
    sections: [
      { id: 'risk', title: 'المخاطرة', order: 0, columns: 1 },
      { id: 'acceptance', title: 'القبول', order: 1, columns: 1 },
    ],
    fields: [
      text('risk_id', 'رقم المخاطرة', { section: 'risk', required: true }),
      textarea('risk_description', 'الوصف', { section: 'risk', required: true }),
      select('category', 'الفئة', ['تشغيلية', 'مالية', 'سمعة', 'امتثال', 'تقنية', 'سلامة'], {
        section: 'risk',
        required: true,
      }),
      select('likelihood', 'الاحتمال', ['نادر', 'محتمل', 'مؤكد'], {
        section: 'risk',
        required: true,
      }),
      select('impact', 'الأثر', ['طفيف', 'متوسط', 'كبير', 'كارثي'], {
        section: 'risk',
        required: true,
      }),
      textarea('reason_for_acceptance', 'مبرر القبول', {
        section: 'acceptance',
        required: true,
        validation: { minLength: 50 },
      }),
      textarea('compensating_controls', 'ضوابط معوِّضة (إن وُجدت)', { section: 'acceptance' }),
      date('review_date', 'موعد المراجعة', { section: 'acceptance', required: true }),
      text('accepted_by_role', 'الجهة القابلة', { section: 'acceptance', required: true }),
    ],
    approvalWorkflow: {
      enabled: true,
      steps: [
        { role: 'risk_owner', label: 'مالك المخاطرة', order: 0 },
        { role: 'risk_officer', label: 'مسؤول إدارة المخاطر', order: 1 },
        { role: 'ceo', label: 'الرئيس التنفيذي', order: 2 },
      ],
    },
    metadata: { sla_hours: 168, sensitive: true, references: ['quality.risk'] },
  },
];

// ─── Combined catalogue ───────────────────────────────────────────────────────

const FORMS_CATALOG = Object.freeze([...beneficiaryForms, ...hrForms, ...managementForms]);

// ─── Public API ──────────────────────────────────────────────────────────────

function listAll() {
  return FORMS_CATALOG;
}

function listByAudience(audience) {
  if (!AUDIENCES.includes(audience)) {
    throw new Error(`Unknown audience '${audience}'. Expected one of: ${AUDIENCES.join(', ')}`);
  }
  return FORMS_CATALOG.filter(f => f.audience === audience);
}

function getById(id) {
  return FORMS_CATALOG.find(f => f.id === id) || null;
}

function summary() {
  return {
    total: FORMS_CATALOG.length,
    byAudience: AUDIENCES.reduce((acc, a) => {
      acc[a] = FORMS_CATALOG.filter(f => f.audience === a).length;
      return acc;
    }, {}),
    byCategory: FORMS_CATALOG.reduce((acc, f) => {
      const k = `${f.audience}.${f.category}`;
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}),
  };
}

module.exports = {
  AUDIENCES,
  CATEGORIES,
  FORMS_CATALOG,
  listAll,
  listByAudience,
  getById,
  summary,
};
