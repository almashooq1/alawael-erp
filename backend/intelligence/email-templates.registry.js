'use strict';

/**
 * email-templates.registry.js — W1242 (نظام القوالب البريدية الاحترافي)
 *
 * Single source of truth for the platform's transactional email catalogue.
 * Today the codebase sends email through 55+ INLINE `dir="rtl"` HTML strings
 * scattered across utils/emailService.js, communication/email-service.js and
 * channel services — no shared layout, no variable contracts, no preview.
 * This registry centralizes them house-style (frozen, bilingual, pure data):
 *
 *   key            stable identifier (callers + EmailLog.template.slug)
 *   category       maps to EmailPreference categories (auth|appointments|
 *                  clinical|finance|hr|system|reports)
 *   subjectAr/En   subject lines with {{var}} placeholders
 *   preheaderAr    hidden inbox-preview line (professional clients show it)
 *   blocks         STRUCTURED body — the renderer owns ALL HTML, so every
 *                  template inherits the same polished RTL layout:
 *                    {type:'paragraph', ar}             plain text (escaped)
 *                    {type:'greeting', ar}              «مرحباً {{name}}،»
 *                    {type:'panel',  ar, tone}          highlighted box
 *                                                       tone: info|success|warning|danger
 *                    {type:'kv',     rows:[{labelAr, value:'{{var}}'}]}
 *                    {type:'cta',    labelAr, urlVar}   button (url from variable)
 *                    {type:'divider'}
 *   variables      CONTRACT — {name: {required, labelAr, sample}}; the
 *                  renderer REJECTS a render with missing required vars
 *                  (refuse-to-fabricate: no email goes out half-filled) and
 *                  previews use `sample` values.
 *
 * Rendering (layout, escaping, plain-text fallback) lives in
 * services/email/templateRenderer.service.js. Drift guard:
 * __tests__/email-templates-wave1242.test.js.
 */

const CATEGORIES = Object.freeze([
  'auth',
  'appointments',
  'clinical',
  'finance',
  'hr',
  'system',
  'reports',
]);

const BLOCK_TYPES = Object.freeze(['greeting', 'paragraph', 'panel', 'kv', 'cta', 'divider']);
const PANEL_TONES = Object.freeze(['info', 'success', 'warning', 'danger']);

const T = def => Object.freeze(def);

const EMAIL_TEMPLATES = Object.freeze({
  // ── الحساب والدخول ────────────────────────────────────────────────────────
  WELCOME_USER: T({
    key: 'WELCOME_USER',
    category: 'auth',
    titleAr: 'ترحيب بمستخدم جديد',
    subjectAr: 'مرحباً بك في منصة الأوائل، {{name}}',
    subjectEn: 'Welcome to Al-Awael, {{name}}',
    preheaderAr: 'تم إنشاء حسابك بنجاح — ابدأ رحلتك معنا',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'مرحباً {{name}}،' }),
      T({
        type: 'paragraph',
        ar: 'يسعدنا انضمامك إلى منصة مراكز الأوائل للتأهيل. تم إنشاء حسابك بنجاح ويمكنك الدخول مباشرة باستخدام بريدك الإلكتروني.',
      }),
      T({
        type: 'kv',
        rows: Object.freeze([
          T({ labelAr: 'البريد الإلكتروني', value: '{{email}}' }),
          T({ labelAr: 'الدور', value: '{{role}}' }),
        ]),
      }),
      T({ type: 'cta', labelAr: 'الدخول إلى المنصة', urlVar: 'loginUrl' }),
      T({
        type: 'paragraph',
        ar: 'إن لم تكن أنت من أنشأ هذا الحساب فتجاهل هذه الرسالة أو تواصل مع الدعم.',
      }),
    ]),
    variables: Object.freeze({
      name: T({ required: true, labelAr: 'اسم المستخدم', sample: 'أ. سارة القحطاني' }),
      email: T({ required: true, labelAr: 'البريد', sample: 'sara@example.com' }),
      role: T({ required: false, labelAr: 'الدور', sample: 'أخصائية نطق' }),
      loginUrl: T({ required: true, labelAr: 'رابط الدخول', sample: 'https://alaweal.org/login' }),
    }),
  }),

  PASSWORD_RESET: T({
    key: 'PASSWORD_RESET',
    category: 'auth',
    titleAr: 'إعادة تعيين كلمة المرور',
    subjectAr: 'رمز إعادة تعيين كلمة المرور — صالح لمدة {{expiryMinutes}} دقيقة',
    subjectEn: 'Your password reset code',
    preheaderAr: 'استخدم الرمز أدناه لإعادة تعيين كلمة المرور',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'مرحباً {{name}}،' }),
      T({
        type: 'paragraph',
        ar: 'تلقّينا طلباً لإعادة تعيين كلمة المرور لحسابك. استخدم الرمز التالي خلال {{expiryMinutes}} دقيقة:',
      }),
      T({ type: 'panel', tone: 'info', ar: 'رمز التحقق: {{otp}}' }),
      T({ type: 'paragraph', ar: 'إن لم تطلب ذلك فتجاهل هذه الرسالة — حسابك آمن ولن يتغير شيء.' }),
    ]),
    variables: Object.freeze({
      name: T({ required: true, labelAr: 'الاسم', sample: 'أ. محمد' }),
      otp: T({ required: true, labelAr: 'رمز التحقق', sample: '482913' }),
      expiryMinutes: T({ required: true, labelAr: 'مدة الصلاحية', sample: '15' }),
    }),
  }),

  // ── المواعيد ──────────────────────────────────────────────────────────────
  APPOINTMENT_REMINDER: T({
    key: 'APPOINTMENT_REMINDER',
    category: 'appointments',
    titleAr: 'تذكير بموعد',
    subjectAr: 'تذكير: موعد {{beneficiaryName}} يوم {{date}} الساعة {{time}}',
    subjectEn: 'Appointment reminder — {{date}} {{time}}',
    preheaderAr: 'موعد {{serviceType}} مع {{therapistName}}',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'عزيزي ولي الأمر،' }),
      T({ type: 'paragraph', ar: 'نذكّركم بموعد {{beneficiaryName}} القادم في مركز الأوائل:' }),
      T({
        type: 'kv',
        rows: Object.freeze([
          T({ labelAr: 'الخدمة', value: '{{serviceType}}' }),
          T({ labelAr: 'الأخصائي', value: '{{therapistName}}' }),
          T({ labelAr: 'التاريخ', value: '{{date}}' }),
          T({ labelAr: 'الوقت', value: '{{time}}' }),
          T({ labelAr: 'الفرع', value: '{{branchName}}' }),
        ]),
      }),
      T({
        type: 'panel',
        tone: 'warning',
        ar: 'نرجو الحضور قبل الموعد بعشر دقائق. وفي حال تعذّر الحضور يرجى إبلاغنا قبل 24 ساعة لإعادة الجدولة.',
      }),
    ]),
    variables: Object.freeze({
      beneficiaryName: T({ required: true, labelAr: 'اسم المستفيد', sample: 'محمد العتيبي' }),
      serviceType: T({ required: true, labelAr: 'الخدمة', sample: 'جلسة علاج نطق' }),
      therapistName: T({ required: true, labelAr: 'الأخصائي', sample: 'أ. نورة الشمري' }),
      date: T({ required: true, labelAr: 'التاريخ', sample: 'الأحد 15 يونيو 2026' }),
      time: T({ required: true, labelAr: 'الوقت', sample: '10:30 صباحاً' }),
      branchName: T({ required: false, labelAr: 'الفرع', sample: 'فرع الرياض — النرجس' }),
    }),
  }),

  APPOINTMENT_CANCELLED: T({
    key: 'APPOINTMENT_CANCELLED',
    category: 'appointments',
    titleAr: 'إلغاء/تأجيل موعد',
    subjectAr: 'تنبيه: تم إلغاء موعد {{beneficiaryName}} ليوم {{date}}',
    subjectEn: 'Appointment cancelled — {{date}}',
    preheaderAr: 'سنتواصل معكم لإعادة الجدولة في أقرب وقت',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'عزيزي ولي الأمر،' }),
      T({
        type: 'panel',
        tone: 'danger',
        ar: 'نأسف لإبلاغكم بإلغاء موعد {{beneficiaryName}} ({{serviceType}}) المقرر يوم {{date}} الساعة {{time}}.',
      }),
      T({ type: 'paragraph', ar: 'السبب: {{reason}}' }),
      T({
        type: 'paragraph',
        ar: 'سيتواصل معكم فريق المواعيد خلال يوم عمل لإعادة الجدولة بما يناسبكم. نعتذر عن أي إزعاج.',
      }),
    ]),
    variables: Object.freeze({
      beneficiaryName: T({ required: true, labelAr: 'اسم المستفيد', sample: 'سارة القحطاني' }),
      serviceType: T({ required: true, labelAr: 'الخدمة', sample: 'جلسة علاج وظيفي' }),
      date: T({ required: true, labelAr: 'التاريخ', sample: 'الثلاثاء 17 يونيو 2026' }),
      time: T({ required: true, labelAr: 'الوقت', sample: '12:00 ظهراً' }),
      reason: T({ required: false, labelAr: 'السبب', sample: 'ظرف طارئ لدى الأخصائي' }),
    }),
  }),

  // ── سريري (الخيط الذهبي) ─────────────────────────────────────────────────
  SESSION_SUMMARY_GUARDIAN: T({
    key: 'SESSION_SUMMARY_GUARDIAN',
    category: 'clinical',
    titleAr: 'ملخص جلسة لولي الأمر',
    subjectAr: 'ملخص جلسة {{beneficiaryName}} اليوم — {{serviceType}}',
    subjectEn: 'Session summary — {{beneficiaryName}}',
    preheaderAr: 'ما تم العمل عليه اليوم وواجب المنزل',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'عزيزي ولي أمر {{beneficiaryName}}،' }),
      T({
        type: 'paragraph',
        ar: 'أُنجزت اليوم جلسة {{serviceType}} مع {{therapistName}}. ملخص ما تم:',
      }),
      T({ type: 'panel', tone: 'info', ar: '{{summary}}' }),
      T({
        type: 'kv',
        rows: Object.freeze([
          T({ labelAr: 'الأهداف المعمول عليها', value: '{{goalsWorked}}' }),
          T({ labelAr: 'الواجب المنزلي', value: '{{homework}}' }),
        ]),
      }),
      T({
        type: 'paragraph',
        ar: 'مشاركتكم في تطبيق الواجب المنزلي تضاعف أثر الجلسات. لأي استفسار تواصلوا معنا عبر بوابة الأهل.',
      }),
    ]),
    variables: Object.freeze({
      beneficiaryName: T({ required: true, labelAr: 'المستفيد', sample: 'محمد' }),
      serviceType: T({ required: true, labelAr: 'الخدمة', sample: 'علاج نطق' }),
      therapistName: T({ required: true, labelAr: 'الأخصائي', sample: 'أ. ريم الحربي' }),
      summary: T({
        required: true,
        labelAr: 'الملخص',
        sample: 'عمل ممتاز على أصوات /س/ في بداية الكلمة بدقة 80%',
      }),
      goalsWorked: T({ required: false, labelAr: 'الأهداف', sample: 'النطق — المفردات' }),
      homework: T({
        required: false,
        labelAr: 'الواجب',
        sample: 'تمرين بطاقات الصور 10 دقائق يومياً',
      }),
    }),
  }),

  GOAL_ACHIEVED: T({
    key: 'GOAL_ACHIEVED',
    category: 'clinical',
    titleAr: 'تهنئة بتحقيق هدف',
    subjectAr: '🎉 إنجاز جديد: {{beneficiaryName}} حقق هدف «{{goalTitle}}»',
    subjectEn: 'Goal achieved — {{beneficiaryName}}',
    preheaderAr: 'خطوة جديدة في رحلة التقدم — نبارك لكم',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'عزيزي ولي أمر {{beneficiaryName}}،' }),
      T({
        type: 'panel',
        tone: 'success',
        ar: 'نبارك لكم! حقق {{beneficiaryName}} الهدف العلاجي: «{{goalTitle}}» 🎉',
      }),
      T({
        type: 'paragraph',
        ar: 'هذا الإنجاز ثمرة المواظبة على الجلسات وتطبيق التوصيات في المنزل. سيناقش الفريق الهدف التالي في المراجعة القادمة.',
      }),
      T({ type: 'cta', labelAr: 'عرض تقرير التقدم', urlVar: 'progressUrl' }),
    ]),
    variables: Object.freeze({
      beneficiaryName: T({ required: true, labelAr: 'المستفيد', sample: 'محمد العتيبي' }),
      goalTitle: T({ required: true, labelAr: 'الهدف', sample: 'تكوين جملة من 3-4 كلمات' }),
      progressUrl: T({
        required: false,
        labelAr: 'رابط التقرير',
        sample: 'https://alaweal.org/portal/progress',
      }),
    }),
  }),

  BASELINE_DUE: T({
    key: 'BASELINE_DUE',
    category: 'clinical',
    titleAr: 'تنبيه خط أساس مستحق (NBA)',
    subjectAr: 'مطلوب: تسجيل خط الأساس لـ{{beneficiaryName}} — {{goalCount}} هدف بانتظار القياس',
    subjectEn: 'Baseline due — {{beneficiaryName}}',
    preheaderAr: 'أهداف موصولة بمقاييس دون قياس أول — من طابور الإجراء الأفضل التالي',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'مرحباً {{therapistName}}،' }),
      T({
        type: 'paragraph',
        ar: 'رصد محرّك «الإجراء الأفضل التالي» أهدافاً نشطة لـ{{beneficiaryName}} موصولة بمقاييس لكن دون خط أساس مسجّل:',
      }),
      T({ type: 'panel', tone: 'warning', ar: '{{goalsList}}' }),
      T({
        type: 'paragraph',
        ar: 'تسجيل خط الأساس يجعل قياس التقدم لاحقاً صادقاً وقابلاً للدفاع أمام الأسرة والجهات.',
      }),
      T({ type: 'cta', labelAr: 'فتح طابور الإجراءات', urlVar: 'nbaUrl' }),
    ]),
    variables: Object.freeze({
      therapistName: T({ required: true, labelAr: 'الأخصائي', sample: 'أ. فيصل' }),
      beneficiaryName: T({ required: true, labelAr: 'المستفيد', sample: 'محمد العتيبي' }),
      goalCount: T({ required: true, labelAr: 'عدد الأهداف', sample: '3' }),
      goalsList: T({
        required: true,
        labelAr: 'قائمة الأهداف',
        sample: 'المفردات — النطق — تكوين الجمل',
      }),
      nbaUrl: T({
        required: false,
        labelAr: 'رابط الطابور',
        sample: 'https://alaweal.org/next-best-action',
      }),
    }),
  }),

  OVERDUE_REVIEW_SUPERVISOR: T({
    key: 'OVERDUE_REVIEW_SUPERVISOR',
    category: 'clinical',
    titleAr: 'مراجعات خطط متأخرة (مشرف)',
    subjectAr: 'تنبيه إشرافي: {{count}} خطة رعاية تجاوزت موعد المراجعة في {{branchName}}',
    subjectEn: 'Overdue care-plan reviews — {{branchName}}',
    preheaderAr: 'الأكثر تأخراً أولاً — مطلوب جدولة مراجعات',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'مرحباً {{supervisorName}}،' }),
      T({
        type: 'panel',
        tone: 'danger',
        ar: 'يوجد {{count}} خطة رعاية تجاوزت موعد مراجعتها الدورية، أقدمها متأخر {{maxOverdueDays}} يوماً.',
      }),
      T({ type: 'paragraph', ar: '{{plansList}}' }),
      T({ type: 'cta', labelAr: 'فتح لوحة عمليات الإشراف', urlVar: 'opsUrl' }),
    ]),
    variables: Object.freeze({
      supervisorName: T({ required: true, labelAr: 'المشرف', sample: 'د. عبدالله' }),
      count: T({ required: true, labelAr: 'العدد', sample: '4' }),
      branchName: T({ required: true, labelAr: 'الفرع', sample: 'فرع الرياض' }),
      maxOverdueDays: T({ required: true, labelAr: 'أقصى تأخير', sample: '21' }),
      plansList: T({
        required: false,
        labelAr: 'القائمة',
        sample: 'محمد (21 يوماً) — سارة (14 يوماً) — فيصل (9 أيام)',
      }),
      opsUrl: T({
        required: false,
        labelAr: 'الرابط',
        sample: 'https://alaweal.org/supervisor-ops',
      }),
    }),
  }),

  // ── مالية ─────────────────────────────────────────────────────────────────
  INVOICE_ISSUED: T({
    key: 'INVOICE_ISSUED',
    category: 'finance',
    titleAr: 'إصدار فاتورة',
    subjectAr: 'فاتورة رقم {{invoiceNumber}} — {{amount}} ريال',
    subjectEn: 'Invoice {{invoiceNumber}}',
    preheaderAr: 'تفاصيل الفاتورة وطرق السداد',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'عزيزي {{guardianName}}،' }),
      T({ type: 'paragraph', ar: 'صدرت فاتورة جديدة لخدمات {{beneficiaryName}}:' }),
      T({
        type: 'kv',
        rows: Object.freeze([
          T({ labelAr: 'رقم الفاتورة', value: '{{invoiceNumber}}' }),
          T({ labelAr: 'الفترة', value: '{{period}}' }),
          T({ labelAr: 'المبلغ', value: '{{amount}} ريال' }),
          T({ labelAr: 'تاريخ الاستحقاق', value: '{{dueDate}}' }),
        ]),
      }),
      T({ type: 'cta', labelAr: 'عرض الفاتورة والسداد', urlVar: 'invoiceUrl' }),
      T({ type: 'paragraph', ar: 'لأي استفسار عن الفاتورة يسعد فريق الحسابات بخدمتكم.' }),
    ]),
    variables: Object.freeze({
      guardianName: T({ required: true, labelAr: 'ولي الأمر', sample: 'أ. سعود العتيبي' }),
      beneficiaryName: T({ required: true, labelAr: 'المستفيد', sample: 'محمد' }),
      invoiceNumber: T({ required: true, labelAr: 'رقم الفاتورة', sample: 'INV-2026-0451' }),
      period: T({ required: false, labelAr: 'الفترة', sample: 'يونيو 2026' }),
      amount: T({ required: true, labelAr: 'المبلغ', sample: '2,400' }),
      dueDate: T({ required: true, labelAr: 'الاستحقاق', sample: '25 يونيو 2026' }),
      invoiceUrl: T({
        required: false,
        labelAr: 'الرابط',
        sample: 'https://alaweal.org/portal/invoices',
      }),
    }),
  }),

  PAYMENT_RECEIPT: T({
    key: 'PAYMENT_RECEIPT',
    category: 'finance',
    titleAr: 'إيصال سداد',
    subjectAr: 'شكراً لسدادكم — إيصال رقم {{receiptNumber}}',
    subjectEn: 'Payment receipt {{receiptNumber}}',
    preheaderAr: 'تم استلام دفعتكم بنجاح',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'عزيزي {{guardianName}}،' }),
      T({
        type: 'panel',
        tone: 'success',
        ar: 'تم استلام دفعتكم بمبلغ {{amount}} ريال بنجاح. شكراً لكم.',
      }),
      T({
        type: 'kv',
        rows: Object.freeze([
          T({ labelAr: 'رقم الإيصال', value: '{{receiptNumber}}' }),
          T({ labelAr: 'الفاتورة', value: '{{invoiceNumber}}' }),
          T({ labelAr: 'طريقة السداد', value: '{{method}}' }),
          T({ labelAr: 'التاريخ', value: '{{paidAt}}' }),
        ]),
      }),
    ]),
    variables: Object.freeze({
      guardianName: T({ required: true, labelAr: 'ولي الأمر', sample: 'أ. سعود' }),
      amount: T({ required: true, labelAr: 'المبلغ', sample: '2,400' }),
      receiptNumber: T({ required: true, labelAr: 'رقم الإيصال', sample: 'RC-2026-0789' }),
      invoiceNumber: T({ required: false, labelAr: 'الفاتورة', sample: 'INV-2026-0451' }),
      method: T({ required: false, labelAr: 'الطريقة', sample: 'مدى' }),
      paidAt: T({ required: true, labelAr: 'التاريخ', sample: '12 يونيو 2026' }),
    }),
  }),

  // ── تقارير ────────────────────────────────────────────────────────────────
  MONTHLY_PROGRESS_REPORT: T({
    key: 'MONTHLY_PROGRESS_REPORT',
    category: 'reports',
    titleAr: 'تقرير التقدم الشهري',
    subjectAr: 'تقرير {{month}} — تقدم {{beneficiaryName}}',
    subjectEn: 'Monthly progress — {{beneficiaryName}}',
    preheaderAr: 'نظرة شهرية موجزة: الجلسات، الأهداف، والتوصيات',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'عزيزي ولي أمر {{beneficiaryName}}،' }),
      T({ type: 'paragraph', ar: 'إليكم خلاصة شهر {{month}}:' }),
      T({
        type: 'kv',
        rows: Object.freeze([
          T({ labelAr: 'جلسات منفذة', value: '{{sessionsCount}}' }),
          T({ labelAr: 'نسبة الحضور', value: '{{attendancePct}}%' }),
          T({ labelAr: 'أهداف نشطة', value: '{{activeGoals}}' }),
          T({ labelAr: 'أهداف تحققت هذا الشهر', value: '{{achievedGoals}}' }),
        ]),
      }),
      T({ type: 'panel', tone: 'info', ar: 'أبرز الملاحظات: {{highlights}}' }),
      T({ type: 'cta', labelAr: 'عرض التقرير الكامل', urlVar: 'reportUrl' }),
    ]),
    variables: Object.freeze({
      beneficiaryName: T({ required: true, labelAr: 'المستفيد', sample: 'محمد العتيبي' }),
      month: T({ required: true, labelAr: 'الشهر', sample: 'يونيو 2026' }),
      sessionsCount: T({ required: true, labelAr: 'الجلسات', sample: '12' }),
      attendancePct: T({ required: true, labelAr: 'الحضور', sample: '92' }),
      activeGoals: T({ required: true, labelAr: 'أهداف نشطة', sample: '3' }),
      achievedGoals: T({ required: true, labelAr: 'أهداف محققة', sample: '1' }),
      highlights: T({
        required: false,
        labelAr: 'الملاحظات',
        sample: 'تحسن ملحوظ في المبادرة بالتواصل',
      }),
      reportUrl: T({
        required: false,
        labelAr: 'الرابط',
        sample: 'https://alaweal.org/portal/reports',
      }),
    }),
  }),

  // ── نظام/تشغيل ────────────────────────────────────────────────────────────
  INCIDENT_NOTIFICATION: T({
    key: 'INCIDENT_NOTIFICATION',
    category: 'system',
    titleAr: 'إشعار حادثة (جودة/سلامة)',
    subjectAr: '⚠️ حادثة {{severity}}: {{incidentType}} — {{branchName}}',
    subjectEn: 'Incident: {{incidentType}}',
    preheaderAr: 'تفاصيل الحادثة والإجراء المطلوب',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'مرحباً {{recipientName}}،' }),
      T({
        type: 'panel',
        tone: 'danger',
        ar: 'سُجّلت حادثة من نوع «{{incidentType}}» بدرجة {{severity}} في {{branchName}} بتاريخ {{occurredAt}}.',
      }),
      T({ type: 'paragraph', ar: 'الوصف: {{description}}' }),
      T({ type: 'paragraph', ar: 'الإجراء المطلوب: {{requiredAction}}' }),
      T({ type: 'cta', labelAr: 'فتح سجل الحادثة', urlVar: 'incidentUrl' }),
    ]),
    variables: Object.freeze({
      recipientName: T({ required: true, labelAr: 'المستلم', sample: 'مسؤول الجودة' }),
      incidentType: T({ required: true, labelAr: 'النوع', sample: 'سقوط' }),
      severity: T({ required: true, labelAr: 'الدرجة', sample: 'متوسطة' }),
      branchName: T({ required: true, labelAr: 'الفرع', sample: 'فرع الرياض' }),
      occurredAt: T({ required: true, labelAr: 'التاريخ', sample: '12 يونيو 2026 — 10:20' }),
      description: T({
        required: true,
        labelAr: 'الوصف',
        sample: 'انزلاق أثناء النشاط الحركي دون إصابة',
      }),
      requiredAction: T({
        required: false,
        labelAr: 'الإجراء',
        sample: 'مراجعة وتوقيع خلال 24 ساعة',
      }),
      incidentUrl: T({
        required: false,
        labelAr: 'الرابط',
        sample: 'https://alaweal.org/quality/incidents',
      }),
    }),
  }),

  // ── الاتصالات الإدارية (W1246 — migration targets of utils/emailService) ──
  NEW_COMMUNICATION: T({
    key: 'NEW_COMMUNICATION',
    category: 'system',
    titleAr: 'إشعار اتصال إداري جديد',
    subjectAr: 'اتصال جديد: {{title}}',
    subjectEn: 'New communication: {{title}}',
    preheaderAr: 'مرجع {{referenceNumber}} — أولوية {{priority}}',
    blocks: Object.freeze([
      T({ type: 'paragraph', ar: 'ورد اتصال إداري جديد يخصك:' }),
      T({ type: 'kv', rows: Object.freeze([
        T({ labelAr: 'رقم المرجع', value: '{{referenceNumber}}' }),
        T({ labelAr: 'العنوان', value: '{{title}}' }),
        T({ labelAr: 'النوع', value: '{{type}}' }),
        T({ labelAr: 'الأولوية', value: '{{priority}}' }),
        T({ labelAr: 'تاريخ الإرسال', value: '{{sentDate}}' }),
        T({ labelAr: 'المرسل', value: '{{senderName}}' }),
        T({ labelAr: 'القسم', value: '{{senderDepartment}}' }),
      ]) }),
      T({ type: 'panel', tone: 'info', ar: '{{subjectText}}' }),
      T({ type: 'cta', labelAr: 'عرض التفاصيل الكاملة', urlVar: 'viewUrl' }),
    ]),
    variables: Object.freeze({
      title: T({ required: true, labelAr: 'العنوان', sample: 'تحديث آلية الدوام' }),
      referenceNumber: T({ required: true, labelAr: 'المرجع', sample: 'COM-2026-0142' }),
      type: T({ required: false, labelAr: 'النوع', sample: 'تعميم' }),
      priority: T({ required: false, labelAr: 'الأولوية', sample: 'عالية' }),
      sentDate: T({ required: false, labelAr: 'التاريخ', sample: '12 يونيو 2026' }),
      senderName: T({ required: true, labelAr: 'المرسل', sample: 'إدارة الموارد البشرية' }),
      senderDepartment: T({ required: false, labelAr: 'القسم', sample: 'الموارد البشرية' }),
      subjectText: T({ required: true, labelAr: 'الموضوع', sample: 'يرجى الاطلاع على التحديثات المرفقة والعمل بموجبها.' }),
      viewUrl: T({ required: false, labelAr: 'الرابط', sample: 'https://alaweal.org/communications-system/view/1' }),
    }),
  }),

  APPROVAL_REQUEST: T({
    key: 'APPROVAL_REQUEST',
    category: 'system',
    titleAr: 'طلب موافقة على اتصال',
    subjectAr: 'طلب موافقة: {{title}}',
    subjectEn: 'Approval request: {{title}}',
    preheaderAr: 'مرحلة {{stageName}} — بانتظار قرارك',
    blocks: Object.freeze([
      T({ type: 'panel', tone: 'warning', ar: 'يُرجى مراجعة الاتصال التالي والموافقة عليه أو رفضه:' }),
      T({ type: 'kv', rows: Object.freeze([
        T({ labelAr: 'رقم المرجع', value: '{{referenceNumber}}' }),
        T({ labelAr: 'العنوان', value: '{{title}}' }),
        T({ labelAr: 'المرحلة', value: '{{stageName}}' }),
        T({ labelAr: 'الأولوية', value: '{{priority}}' }),
      ]) }),
      T({ type: 'panel', tone: 'info', ar: '{{subjectText}}' }),
      T({ type: 'cta', labelAr: '✓ موافقة', urlVar: 'approveUrl' }),
      T({ type: 'cta', labelAr: '✗ رفض', urlVar: 'rejectUrl' }),
    ]),
    variables: Object.freeze({
      title: T({ required: true, labelAr: 'العنوان', sample: 'اعتماد خطة التدريب' }),
      referenceNumber: T({ required: true, labelAr: 'المرجع', sample: 'COM-2026-0150' }),
      stageName: T({ required: true, labelAr: 'المرحلة', sample: 'موافقة المدير المباشر' }),
      priority: T({ required: false, labelAr: 'الأولوية', sample: 'متوسطة' }),
      subjectText: T({ required: true, labelAr: 'الموضوع', sample: 'خطة التدريب الصيفي للأخصائيين.' }),
      approveUrl: T({ required: true, labelAr: 'رابط الموافقة', sample: 'https://alaweal.org/communications-system/approve/1' }),
      rejectUrl: T({ required: true, labelAr: 'رابط الرفض', sample: 'https://alaweal.org/communications-system/reject/1' }),
    }),
  }),

  STATUS_CHANGE: T({
    key: 'STATUS_CHANGE',
    category: 'system',
    titleAr: 'تحديث حالة اتصال',
    subjectAr: 'تحديث حالة: {{title}}',
    subjectEn: 'Status update: {{title}}',
    preheaderAr: '{{oldStatusLabel}} ← {{newStatusLabel}}',
    blocks: Object.freeze([
      T({ type: 'kv', rows: Object.freeze([
        T({ labelAr: 'رقم المرجع', value: '{{referenceNumber}}' }),
        T({ labelAr: 'العنوان', value: '{{title}}' }),
      ]) }),
      T({ type: 'panel', tone: 'info', ar: 'تغيّرت الحالة من «{{oldStatusLabel}}» إلى «{{newStatusLabel}}».' }),
      T({ type: 'cta', labelAr: 'عرض التفاصيل', urlVar: 'viewUrl' }),
    ]),
    variables: Object.freeze({
      title: T({ required: true, labelAr: 'العنوان', sample: 'طلب صيانة قاعة العلاج' }),
      referenceNumber: T({ required: true, labelAr: 'المرجع', sample: 'COM-2026-0133' }),
      oldStatusLabel: T({ required: true, labelAr: 'الحالة السابقة', sample: 'قيد المراجعة' }),
      newStatusLabel: T({ required: true, labelAr: 'الحالة الجديدة', sample: 'مكتمل' }),
      viewUrl: T({ required: false, labelAr: 'الرابط', sample: 'https://alaweal.org/communications-system/view/1' }),
    }),
  }),

  STAFF_ANNOUNCEMENT: T({
    key: 'STAFF_ANNOUNCEMENT',
    category: 'hr',
    titleAr: 'تعميم إداري للموظفين',
    subjectAr: 'تعميم: {{title}}',
    subjectEn: 'Announcement: {{title}}',
    preheaderAr: '{{title}}',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'الزملاء الأعزاء،' }),
      T({ type: 'paragraph', ar: '{{body}}' }),
      T({
        type: 'kv',
        rows: Object.freeze([
          T({ labelAr: 'الجهة المصدرة', value: '{{issuer}}' }),
          T({ labelAr: 'تاريخ السريان', value: '{{effectiveDate}}' }),
        ]),
      }),
    ]),
    variables: Object.freeze({
      title: T({ required: true, labelAr: 'العنوان', sample: 'تحديث سياسة الإجازات' }),
      body: T({
        required: true,
        labelAr: 'النص',
        sample: 'اعتباراً من الشهر القادم تُقدَّم طلبات الإجازة عبر المنصة فقط…',
      }),
      issuer: T({ required: false, labelAr: 'الجهة', sample: 'الموارد البشرية' }),
      effectiveDate: T({ required: false, labelAr: 'السريان', sample: '1 يوليو 2026' }),
    }),
  }),

  WEEKLY_SUPERVISOR_DIGEST: T({
    key: 'WEEKLY_SUPERVISOR_DIGEST',
    category: 'reports',
    titleAr: 'الملخص الأسبوعي للمشرف',
    subjectAr: 'ملخص الأسبوع — {{branchName}}: {{sessionsCount}} جلسة، {{alertsCount}} تنبيه',
    subjectEn: 'Weekly digest — {{branchName}}',
    preheaderAr: 'صحة العمليات، الإنتاجية، وما يحتاج انتباهك',
    blocks: Object.freeze([
      T({ type: 'greeting', ar: 'مرحباً {{supervisorName}}،' }),
      T({
        type: 'kv',
        rows: Object.freeze([
          T({ labelAr: 'جلسات منفذة', value: '{{sessionsCount}}' }),
          T({ labelAr: 'نسبة التوثيق', value: '{{docPct}}%' }),
          T({ labelAr: 'تنبيهات مفتوحة', value: '{{alertsCount}}' }),
          T({ labelAr: 'درجة صحة العمليات', value: '{{healthGrade}}' }),
        ]),
      }),
      T({ type: 'panel', tone: 'info', ar: 'الأكثر إلحاحاً: {{topAttention}}' }),
      T({ type: 'cta', labelAr: 'فتح لوحة العمليات', urlVar: 'opsUrl' }),
    ]),
    variables: Object.freeze({
      supervisorName: T({ required: true, labelAr: 'المشرف', sample: 'د. عبدالله' }),
      branchName: T({ required: true, labelAr: 'الفرع', sample: 'فرع الرياض' }),
      sessionsCount: T({ required: true, labelAr: 'الجلسات', sample: '84' }),
      docPct: T({ required: true, labelAr: 'التوثيق', sample: '91' }),
      alertsCount: T({ required: true, labelAr: 'التنبيهات', sample: '5' }),
      healthGrade: T({ required: true, labelAr: 'الصحة', sample: 'HEALTHY' }),
      topAttention: T({
        required: false,
        labelAr: 'الانتباه',
        sample: '3 أهداف بلا خط أساس لدى محمد',
      }),
      opsUrl: T({
        required: false,
        labelAr: 'الرابط',
        sample: 'https://alaweal.org/supervisor-ops',
      }),
    }),
  }),
});

function getTemplate(key) {
  return EMAIL_TEMPLATES[String(key || '').trim()] || null;
}

function listTemplates() {
  return Object.values(EMAIL_TEMPLATES);
}

module.exports = {
  CATEGORIES,
  BLOCK_TYPES,
  PANEL_TONES,
  EMAIL_TEMPLATES,
  getTemplate,
  listTemplates,
};
