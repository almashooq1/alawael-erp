/**
 * @file tickets.seed.js
 * @description بيانات تذاكر الدعم الفني الشاملة - 20+ تذكرة واقعية
 * Support tickets comprehensive seed - Al-Awael ERP
 * DEV/STAGING only - NOT for production
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// فئات التذاكر
// ─────────────────────────────────────────────────────────────────────────────
const TICKET_CATEGORIES = [
  {
    category: 'technical',
    nameAr: 'دعم تقني',
    subcategories: ['login_issue', 'system_error', 'performance', 'data_sync', 'mobile_app'],
  },
  {
    category: 'clinical',
    nameAr: 'سريري / علاجي',
    subcategories: ['session_issue', 'plan_update', 'assessment_request', 'medical_record'],
  },
  {
    category: 'financial',
    nameAr: 'مالي / فوترة',
    subcategories: ['invoice_error', 'payment_issue', 'insurance_claim', 'refund_request'],
  },
  {
    category: 'transport',
    nameAr: 'نقل',
    subcategories: [
      'route_change',
      'vehicle_issue',
      'driver_complaint',
      'pickup_time',
      'missed_transport',
    ],
  },
  {
    category: 'hr',
    nameAr: 'موارد بشرية',
    subcategories: ['leave_request', 'attendance_correction', 'payroll_query', 'schedule_change'],
  },
  {
    category: 'general',
    nameAr: 'عام',
    subcategories: ['complaint', 'suggestion', 'inquiry', 'appointment_issue'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// بيانات التذاكر الواقعية
// ─────────────────────────────────────────────────────────────────────────────
const TICKET_TEMPLATES = [
  // ── تقنية ──────────────────────────────────────────────────────────────────
  {
    category: 'technical',
    subcategory: 'login_issue',
    priority: 'high',
    titleAr: 'عدم القدرة على تسجيل الدخول إلى النظام',
    titleEn: 'Unable to login to the system',
    descriptionAr:
      'لا أستطيع الدخول إلى النظام منذ الصباح، تظهر رسالة خطأ "كلمة المرور غير صحيحة" رغم إدخال البيانات الصحيحة. جربت إعادة تعيين كلمة المرور لكن لم تصل رسالة البريد.',
    descriptionEn:
      'Cannot login to the system since morning. Getting "incorrect password" error despite entering correct credentials. Tried password reset but no email received.',
    tags: ['login', 'password', 'urgent'],
    expectedSLA: 4, // ساعات
  },
  {
    category: 'technical',
    subcategory: 'system_error',
    priority: 'high',
    titleAr: 'خطأ في حفظ بيانات الجلسة',
    titleEn: 'Error saving session data',
    descriptionAr:
      'عند محاولة حفظ ملاحظات الجلسة تظهر رسالة "خطأ 500 - خطأ داخلي في الخادم". المشكلة بدأت بعد آخر تحديث للنظام. تأثر 3 أخصائيين في فرع الرياض.',
    descriptionEn:
      'When trying to save session notes, error 500 appears. Issue started after last system update. 3 therapists affected in Riyadh branch.',
    tags: ['error', 'sessions', 'server'],
    expectedSLA: 4,
  },
  {
    category: 'technical',
    subcategory: 'mobile_app',
    priority: 'medium',
    titleAr: 'تطبيق الجوال لا يتزامن مع النظام الرئيسي',
    titleEn: 'Mobile app not syncing with main system',
    descriptionAr:
      'التطبيق على الجوال لا يُظهر الجلسات المجدولة لليوم الحالي. آخر تزامن كان قبل 6 ساعات. الإنترنت يعمل بشكل طبيعي.',
    descriptionEn:
      'Mobile app not showing today scheduled sessions. Last sync was 6 hours ago. Internet is working normally.',
    tags: ['mobile', 'sync', 'sessions'],
    expectedSLA: 8,
  },
  {
    category: 'technical',
    subcategory: 'performance',
    priority: 'medium',
    titleAr: 'بطء شديد في تحميل تقارير الأداء',
    titleEn: 'Slow loading of performance reports',
    descriptionAr:
      'تقرير الأداء الشهري يستغرق أكثر من 5 دقائق للتحميل. في السابق كان يتحمل في ثوانٍ. المشكلة على كل الأجهزة في الفرع.',
    descriptionEn:
      'Monthly performance report takes more than 5 minutes to load. Previously loaded in seconds. Issue on all devices in branch.',
    tags: ['performance', 'reports', 'slow'],
    expectedSLA: 24,
  },

  // ── سريري ──────────────────────────────────────────────────────────────────
  {
    category: 'clinical',
    subcategory: 'session_issue',
    priority: 'medium',
    titleAr: 'طلب تعديل موعد الجلسة الأسبوعية للمستفيد',
    titleEn: 'Request to reschedule weekly session',
    descriptionAr:
      'ولي أمر المستفيد يزيد المطيري يطلب تغيير موعد جلسة الاثنين من الساعة 10 صباحاً إلى 12 ظهراً بشكل دائم بسبب التزامات مدرسية.',
    descriptionEn:
      "Beneficiary Yazeed Al-Mutairi's guardian requests changing Monday session from 10am to 12pm permanently due to school commitments.",
    tags: ['reschedule', 'session', 'guardian_request'],
    expectedSLA: 24,
  },
  {
    category: 'clinical',
    subcategory: 'plan_update',
    priority: 'low',
    titleAr: 'طلب مراجعة الخطة العلاجية للمستفيدة لمى القحطاني',
    titleEn: 'Request to review treatment plan for Lama Al-Qahtani',
    descriptionAr:
      'المستفيدة لمى أكملت 3 أهداف من الخطة العلاجية بنجاح. نطلب مراجعة الخطة وإضافة أهداف جديدة تناسب المستوى الحالي.',
    descriptionEn:
      'Beneficiary Lama has successfully completed 3 treatment goals. Requesting plan review and addition of new goals matching current level.',
    tags: ['treatment_plan', 'review', 'goals'],
    expectedSLA: 48,
  },
  {
    category: 'clinical',
    subcategory: 'assessment_request',
    priority: 'medium',
    titleAr: 'طلب إجراء تقييم دوري للمستفيد عبدالعزيز الشهراني',
    titleEn: 'Request for periodic assessment for Abdulaziz Al-Shahrani',
    descriptionAr:
      'مضى 6 أشهر على آخر تقييم. الأخصائية سارة العتيبي تطلب تحديد موعد للتقييم الدوري باستخدام مقياس VABS-3.',
    descriptionEn:
      '6 months since last assessment. Therapist Sarah Al-Otaibi requests scheduling periodic assessment using VABS-3 scale.',
    tags: ['assessment', 'periodic', 'VABS'],
    expectedSLA: 48,
  },

  // ── مالية ──────────────────────────────────────────────────────────────────
  {
    category: 'financial',
    subcategory: 'invoice_error',
    priority: 'high',
    titleAr: 'خطأ في فاتورة شهر مارس - مبالغ غير صحيحة',
    titleEn: 'Error in March invoice - incorrect amounts',
    descriptionAr:
      'فاتورة شهر مارس للمستفيد سلطان الدوسري تحتوي على 18 جلسة في حين كان الحضور الفعلي 12 جلسة فقط. الفرق 6 جلسات × 380 ريال = 2280 ريال زيادة.',
    descriptionEn:
      'March invoice for Sultan Al-Dosari shows 18 sessions while actual attendance was 12. Difference: 6 sessions × 380 SAR = 2280 SAR overcharge.',
    tags: ['invoice', 'correction', 'overcharge'],
    expectedSLA: 8,
  },
  {
    category: 'financial',
    subcategory: 'insurance_claim',
    priority: 'medium',
    titleAr: 'مطالبة التأمين لشركة بوبا - يناير 2026',
    titleEn: 'Insurance claim for BUPA - January 2026',
    descriptionAr:
      'لم يصل رد شركة بوبا على مطالبة يناير المقدمة منذ 45 يوماً. المبلغ المطالب به: 38,500 ريال. نرجو المتابعة الفورية.',
    descriptionEn:
      'No response from BUPA for January claim submitted 45 days ago. Claimed amount: 38,500 SAR. Urgent follow-up needed.',
    tags: ['insurance', 'bupa', 'pending_claim'],
    expectedSLA: 24,
  },
  {
    category: 'financial',
    subcategory: 'refund_request',
    priority: 'medium',
    titleAr: 'طلب استرداد مبلغ - إلغاء الخدمة',
    titleEn: 'Refund request - service cancellation',
    descriptionAr:
      'ولي أمر المستفيدة رزان العنزي يطلب استرداد الرسوم المدفوعة مسبقاً بسبب السفر للعلاج خارج المملكة. المبلغ: 4,200 ريال.',
    descriptionEn:
      'Guardian of Razan Al-Anazi requests refund of prepaid fees due to traveling abroad for treatment. Amount: 4,200 SAR.',
    tags: ['refund', 'cancellation', 'prepaid'],
    expectedSLA: 48,
  },

  // ── نقل ────────────────────────────────────────────────────────────────────
  {
    category: 'transport',
    subcategory: 'route_change',
    priority: 'medium',
    titleAr: 'طلب تغيير نقطة التوصيل للمستفيد',
    titleEn: 'Request to change beneficiary drop-off point',
    descriptionAr:
      'انتقلت عائلة المستفيد مشاري الغامدي إلى حي الرمال. نطلب تحديث نقطة الاستقبال والتوصيل من حي العارض إلى حي الرمال.',
    descriptionEn:
      'Family of beneficiary Mishari Al-Ghamdi moved to Al-Ramal district. Requesting update of pickup/drop-off from Al-Areed to Al-Ramal district.',
    tags: ['route', 'address_change', 'transport'],
    expectedSLA: 24,
  },
  {
    category: 'transport',
    subcategory: 'vehicle_issue',
    priority: 'high',
    titleAr: 'عطل في مركبة النقل رقم VEH-RUH-001',
    titleEn: 'Breakdown of transport vehicle VEH-RUH-001',
    descriptionAr:
      'المركبة VEH-RUH-001 تعرضت لعطل مفاجئ في الطريق اليوم الصباح. يوجد 6 مستفيدين على متنها. نحتاج بديلاً فورياً.',
    descriptionEn:
      'Vehicle VEH-RUH-001 broke down on the road this morning. 6 beneficiaries on board. Need immediate replacement.',
    tags: ['vehicle', 'breakdown', 'urgent', 'beneficiaries'],
    expectedSLA: 2,
  },
  {
    category: 'transport',
    subcategory: 'missed_transport',
    priority: 'medium',
    titleAr: 'المستفيد لم يُستقل في الوقت المحدد',
    titleEn: 'Beneficiary missed scheduled pickup',
    descriptionAr:
      'السائق لم يصل لاستقبال المستفيد ريناد العتيبي في الموعد المحدد (7:00 صباحاً). ولي الأمر ينتظر منذ 30 دقيقة.',
    descriptionEn:
      'Driver did not arrive to pick up beneficiary Rinad Al-Otaibi at scheduled time (7:00 AM). Guardian has been waiting for 30 minutes.',
    tags: ['missed_pickup', 'driver', 'delay'],
    expectedSLA: 2,
  },
  {
    category: 'transport',
    subcategory: 'pickup_time',
    priority: 'low',
    titleAr: 'طلب تعديل وقت الاستقبال الصباحي',
    titleEn: 'Request to adjust morning pickup time',
    descriptionAr:
      'ولي أمر المستفيد نايف الشريف يطلب تأخير وقت الاستقبال من 6:30 صباحاً إلى 7:00 صباحاً بسبب صعوبة إعداد المستفيد مبكراً.',
    descriptionEn:
      'Guardian of beneficiary Naif Al-Sharif requests delaying pickup from 6:30 AM to 7:00 AM due to difficulty preparing the beneficiary early.',
    tags: ['pickup_time', 'schedule_adjustment'],
    expectedSLA: 48,
  },

  // ── موارد بشرية ────────────────────────────────────────────────────────────
  {
    category: 'hr',
    subcategory: 'attendance_correction',
    priority: 'low',
    titleAr: 'تصحيح سجل الحضور - غياب خاطئ',
    titleEn: 'Attendance correction - incorrect absence',
    descriptionAr:
      'تم تسجيل غياب بدون عذر للأخصائية نورة القحطاني يوم 15 مارس في حين كانت في دورة تدريبية معتمدة. أرجو تصحيح السجل.',
    descriptionEn:
      'Unexcused absence was recorded for therapist Noura Al-Qahtani on March 15 while she was attending an approved training course. Please correct the record.',
    tags: ['attendance', 'correction', 'training'],
    expectedSLA: 24,
  },
  {
    category: 'hr',
    subcategory: 'leave_request',
    priority: 'low',
    titleAr: 'طلب إجازة اضطرارية',
    titleEn: 'Emergency leave request',
    descriptionAr:
      'أتقدم بطلب إجازة اضطرارية لمدة 3 أيام (20-22 أبريل) لأسباب عائلية طارئة. أرجو الموافقة الفورية.',
    descriptionEn:
      'Requesting 3-day emergency leave (April 20-22) for urgent family reasons. Please grant immediate approval.',
    tags: ['leave', 'emergency', 'urgent'],
    expectedSLA: 8,
  },
  {
    category: 'hr',
    subcategory: 'payroll_query',
    priority: 'medium',
    titleAr: 'استفسار عن بدل العمل الإضافي - شهر فبراير',
    titleEn: 'Overtime allowance inquiry - February',
    descriptionAr:
      'لاحظت أن بدل العمل الإضافي لشهر فبراير (12 ساعة إضافية) لم يُضاف إلى الراتب. أرجو مراجعة قسيمة الراتب.',
    descriptionEn:
      'Noticed that February overtime allowance (12 extra hours) was not added to salary. Please review payslip.',
    tags: ['payroll', 'overtime', 'salary'],
    expectedSLA: 24,
  },

  // ── عام ────────────────────────────────────────────────────────────────────
  {
    category: 'general',
    subcategory: 'complaint',
    priority: 'high',
    titleAr: 'شكوى بخصوص التعامل مع ولي الأمر',
    titleEn: 'Complaint regarding guardian interaction',
    descriptionAr:
      'ولي أمر المستفيد حسن المالكي يُبدي استياءه من طريقة تعامل موظفة الاستقبال معه عند مراجعة الفرع أمس. يطلب الاعتذار الرسمي ومراجعة الإجراءات.',
    descriptionEn:
      "Guardian of Hassan Al-Malki expresses dissatisfaction with receptionist's interaction during yesterday's branch visit. Requests formal apology and procedure review.",
    tags: ['complaint', 'guardian', 'reception', 'service_quality'],
    expectedSLA: 8,
  },
  {
    category: 'general',
    subcategory: 'suggestion',
    priority: 'low',
    titleAr: 'اقتراح لتحسين خدمة النقل',
    titleEn: 'Suggestion to improve transport service',
    descriptionAr:
      'أقترح إضافة خاصية التتبع المباشر للمركبة عبر التطبيق لتمكين أولياء الأمور من معرفة موقع المركبة لحظة بلحظة وتلقي إشعار قبل الوصول بـ 10 دقائق.',
    descriptionEn:
      'Suggest adding real-time vehicle tracking via the app to allow guardians to know vehicle location in real-time and receive notification 10 minutes before arrival.',
    tags: ['suggestion', 'transport', 'tracking', 'app'],
    expectedSLA: 72,
  },
  {
    category: 'general',
    subcategory: 'inquiry',
    priority: 'low',
    titleAr: 'استفسار عن إمكانية نقل المستفيد لفرع آخر',
    titleEn: 'Inquiry about beneficiary branch transfer',
    descriptionAr:
      'انتقلت عائلة المستفيدة جود السبيعي من الرياض إلى جدة. هل يمكن نقل الملف العلاجي لفرع جدة مع الاحتفاظ بنفس الخطة العلاجية؟',
    descriptionEn:
      "Beneficiary Joud Al-Subaie's family relocated from Riyadh to Jeddah. Is it possible to transfer the clinical file to Jeddah branch while maintaining the same treatment plan?",
    tags: ['branch_transfer', 'inquiry', 'relocation'],
    expectedSLA: 48,
  },
  {
    category: 'general',
    subcategory: 'appointment_issue',
    priority: 'medium',
    titleAr: 'تعارض في مواعيد الجلسات',
    titleEn: 'Session appointment conflict',
    descriptionAr:
      'يوجد تعارض في جدول الأخصائية هند الحربي يوم الاثنين 28 أبريل: جلستان في نفس الوقت (10:00 صباحاً) لمستفيدَين مختلفَين. أرجو المراجعة والتصحيح.',
    descriptionEn:
      'Scheduling conflict for therapist Hind Al-Harbi on Monday April 28: two sessions at same time (10:00 AM) for two different beneficiaries. Please review and correct.',
    tags: ['scheduling', 'conflict', 'appointment'],
    expectedSLA: 8,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// حالات التذاكر والتعليقات
// ─────────────────────────────────────────────────────────────────────────────
const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'escalated'];

const COMMENT_TEMPLATES = {
  open: [
    {
      ar: 'تم استلام التذكرة وسيتم مراجعتها قريباً.',
      en: 'Ticket received and will be reviewed shortly.',
    },
    {
      ar: 'شكراً لتواصلك. سيتم الرد خلال مدة الـ SLA المحددة.',
      en: 'Thank you for contacting us. Will respond within defined SLA.',
    },
  ],
  in_progress: [
    {
      ar: 'جارٍ التحقيق في المشكلة. سيتم التحديث خلال ساعتين.',
      en: 'Investigating the issue. Will update within 2 hours.',
    },
    {
      ar: 'تم تصعيد الأمر للفريق التقني المختص.',
      en: 'Issue escalated to specialized technical team.',
    },
    {
      ar: 'تم التواصل مع الجهة المعنية وننتظر ردها.',
      en: 'Contacted the relevant party and awaiting response.',
    },
  ],
  resolved: [
    {
      ar: 'تم حل المشكلة بنجاح. الرجاء التأكد من عمل كل شيء بشكل صحيح.',
      en: 'Issue resolved successfully. Please verify everything is working correctly.',
    },
    {
      ar: 'تم تطبيق الإصلاح اللازم. التذكرة ستُغلق تلقائياً خلال 48 ساعة إذا لم تكن هناك ملاحظات.',
      en: 'Fix applied. Ticket will close automatically in 48 hours if no further comments.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function dateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function randomStatus(priority) {
  // التذاكر العالية الأولوية أكثرها محلولة أو قيد المعالجة
  if (priority === 'high') {
    const r = Math.random();
    if (r < 0.3) return 'resolved';
    if (r < 0.6) return 'in_progress';
    if (r < 0.8) return 'closed';
    return 'escalated';
  }
  if (priority === 'medium') {
    const r = Math.random();
    if (r < 0.25) return 'open';
    if (r < 0.5) return 'in_progress';
    if (r < 0.8) return 'resolved';
    return 'closed';
  }
  // low
  const r = Math.random();
  if (r < 0.3) return 'open';
  if (r < 0.5) return 'in_progress';
  if (r < 0.75) return 'resolved';
  return 'closed';
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed Function
// ─────────────────────────────────────────────────────────────────────────────
async function seed(connection) {
  const db = connection.db || (connection.connection && connection.connection.db) || connection;
  if (!db) throw new Error('No database connection');

  const employeeCol = db.collection('employees');
  const ticketsCol = db.collection('tickets');
  const now = new Date();

  // جلب الموظفين لتعيين التذاكر لهم
  const employees = await employeeCol
    .find({ status: 'active', 'metadata.isComprehensiveSeed': true })
    .toArray();

  const managers = employees.filter(e => e.role === 'manager');
  const therapists = employees.filter(e => ['therapist', 'senior_therapist'].includes(e.role));
  const support = employees.filter(e =>
    ['manager', 'receptionist', 'accountant', 'hr_officer'].includes(e.role)
  );

  const BRANCHES = ['RUH-MAIN', 'JED-MAIN', 'DAM-MAIN'];

  let created = 0;
  let ticketCounter = 1;

  for (let i = 0; i < TICKET_TEMPLATES.length; i++) {
    const template = TICKET_TEMPLATES[i];
    const daysAgo = randomInRange(1, 45);
    const createdAt = dateDaysAgo(daysAgo);
    const status = randomStatus(template.priority);
    const branchCode = BRANCHES[i % BRANCHES.length];

    // مُقدِّم التذكرة (موظف أو أخصائي)
    const allStaff = [...therapists, ...support];
    const submitter = allStaff.length > 0 ? allStaff[i % allStaff.length] : null;

    // المُعيَّن إليه
    const assignee = managers.length > 0 ? managers[i % managers.length] : null;

    // تاريخ الحل
    const resolvedAt = ['resolved', 'closed'].includes(status)
      ? new Date(createdAt.getTime() + template.expectedSLA * 60 * 60 * 1000 * randomInRange(1, 3))
      : null;

    // إنشاء التعليقات
    const comments = [];
    if (status !== 'open') {
      const openComment = COMMENT_TEMPLATES.open[0];
      comments.push({
        authorId: assignee?._id || null,
        authorName: assignee?.name?.ar || 'الدعم التقني',
        role: 'support',
        commentAr: openComment.ar,
        commentEn: openComment.en,
        isInternal: false,
        createdAt: new Date(createdAt.getTime() + 30 * 60 * 1000), // +30 دقيقة
      });
    }
    if (['in_progress', 'resolved', 'closed', 'escalated'].includes(status)) {
      const inProgressComment =
        COMMENT_TEMPLATES.in_progress[randomInRange(0, COMMENT_TEMPLATES.in_progress.length - 1)];
      comments.push({
        authorId: assignee?._id || null,
        authorName: assignee?.name?.ar || 'الدعم التقني',
        role: 'support',
        commentAr: inProgressComment.ar,
        commentEn: inProgressComment.en,
        isInternal: false,
        createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000), // +ساعتان
      });
    }
    if (['resolved', 'closed'].includes(status)) {
      const resolvedComment = COMMENT_TEMPLATES.resolved[randomInRange(0, 1)];
      comments.push({
        authorId: assignee?._id || null,
        authorName: assignee?.name?.ar || 'الدعم التقني',
        role: 'support',
        commentAr: resolvedComment.ar,
        commentEn: resolvedComment.en,
        isInternal: false,
        createdAt: resolvedAt || new Date(),
      });
    }

    // تقييم المستخدم (للتذاكر المغلقة)
    const userRating =
      status === 'closed'
        ? {
            score: randomInRange(3, 5),
            commentAr:
              randomInRange(1, 2) === 1
                ? 'تمت المعالجة بشكل سريع وفعال، شكراً.'
                : 'الخدمة جيدة لكن استغرقت وقتاً أطول من المتوقع.',
            ratedAt: new Date(resolvedAt ? resolvedAt.getTime() + 24 * 60 * 60 * 1000 : now),
          }
        : null;

    const ticket = {
      ticketNumber: `TKT-${branchCode.split('-')[0]}-${String(ticketCounter).padStart(4, '0')}`,
      category: template.category,
      subcategory: template.subcategory,
      priority: template.priority,
      status,

      titleAr: template.titleAr,
      titleEn: template.titleEn,
      descriptionAr: template.descriptionAr,
      descriptionEn: template.descriptionEn,
      tags: template.tags,

      branchCode,

      // مُقدِّم التذكرة
      submittedBy: {
        userId: submitter?._id || null,
        name: submitter?.name?.ar || 'موظف النظام',
        role: submitter?.role || 'employee',
        employeeId: submitter?.employeeId || null,
      },

      // المُعيَّن إليه
      assignedTo: assignee
        ? {
            userId: assignee._id,
            name: assignee.name?.ar,
            role: assignee.role,
            employeeId: assignee.employeeId,
          }
        : null,

      // SLA
      sla: {
        expectedHours: template.expectedSLA,
        dueAt: new Date(createdAt.getTime() + template.expectedSLA * 60 * 60 * 1000),
        breached: resolvedAt
          ? resolvedAt > new Date(createdAt.getTime() + template.expectedSLA * 60 * 60 * 1000)
          : status === 'open' &&
            new Date() > new Date(createdAt.getTime() + template.expectedSLA * 60 * 60 * 1000),
        resolvedWithinSLA: resolvedAt
          ? resolvedAt <= new Date(createdAt.getTime() + template.expectedSLA * 60 * 60 * 1000)
          : null,
      },

      // التواريخ
      resolvedAt,
      closedAt:
        status === 'closed'
          ? new Date(resolvedAt ? resolvedAt.getTime() + 24 * 60 * 60 * 1000 : now)
          : null,
      firstResponseAt: comments.length > 0 ? comments[0].createdAt : null,

      // التعليقات
      comments,
      commentsCount: comments.length,

      // المرفقات (بيانات وهمية)
      attachments:
        template.category === 'financial' || template.category === 'technical'
          ? [
              {
                fileName: `screenshot_${ticketCounter}.png`,
                fileType: 'image/png',
                fileSizeKB: randomInRange(50, 500),
                uploadedAt: createdAt,
              },
            ]
          : [],

      // تقييم المستخدم
      userRating,

      // مقاييس
      metrics: {
        viewCount: randomInRange(2, 15),
        responseTimeMinutes:
          comments.length > 0
            ? Math.round((comments[0].createdAt - createdAt) / (1000 * 60))
            : null,
        resolutionTimeHours: resolvedAt
          ? Math.round((resolvedAt - createdAt) / (1000 * 60 * 60))
          : null,
      },

      // بيانات meta
      metadata: {
        isComprehensiveSeed: true,
        seededAt: now,
        seedVersion: '2.0',
      },
      createdAt,
      updatedAt: resolvedAt || now,
    };

    await ticketsCol.insertOne(ticket);
    created++;
    ticketCounter++;
  }

  // إحصائيات ملخصة
  const byStatus = {};
  const byPriority = {};
  TICKET_TEMPLATES.forEach(t => {
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
  });

  console.log(`  ✅ Tickets: ${created} created`);
  console.log(
    `     Priority breakdown: high=${TICKET_TEMPLATES.filter(t => t.priority === 'high').length}, medium=${TICKET_TEMPLATES.filter(t => t.priority === 'medium').length}, low=${TICKET_TEMPLATES.filter(t => t.priority === 'low').length}`
  );

  return { created };
}

// ─────────────────────────────────────────────────────────────────────────────
// Down Function
// ─────────────────────────────────────────────────────────────────────────────
async function down(connection) {
  const db = connection.db || (connection.connection && connection.connection.db) || connection;
  if (!db) return;
  const result = await db
    .collection('tickets')
    .deleteMany({ 'metadata.isComprehensiveSeed': true });
  console.log(`  ✅ Tickets: deleted ${result.deletedCount}`);
}

module.exports = { seed, down, TICKET_TEMPLATES, TICKET_CATEGORIES };
