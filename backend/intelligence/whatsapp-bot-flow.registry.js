'use strict';

/**
 * whatsapp-bot-flow.registry.js — W1372.
 *
 * Pure constants + helpers for the **stateful, menu-driven WhatsApp bot**
 * ("مساعد الأوائل الذكي"). This is the conversational backbone the existing
 * WhatsApp stack was missing: the inbound pipeline (whatsappWebhook →
 * whatsappAI.classifyIntent → autoReply.decide) is **stateless** — one
 * inbound message → one classification → one reply. It has no concept of
 * "which step of a multi-turn flow is this user on".
 *
 * This registry + its sibling service (`whatsapp-bot-flow.service.js`) add
 * a deterministic finite-state machine that implements the center's WhatsApp
 * specification:
 *
 *   - A welcome message that DISCLOSES it is a bot ("بوت افتراضي") and offers
 *     human escalation (WhatsApp business-bot policy + the center's spec §1).
 *   - A numbered 10-unit main menu.
 *   - Per-unit multi-step data-collection flows (registration, appointment
 *     request, complaint, human callback) that gather fields one short question
 *     at a time, summarize, ask for confirmation, then emit a structured
 *     `sideEffect` for the dispatcher to act on.
 *   - Read-only "lookup" units (attendance / session reports / billing) that
 *     collect identifiers then hand off to staff (live-data wiring is a
 *     deliberate follow-up wave — see PARITY note below).
 *   - Static informational units (center info, home exercises, notifications).
 *
 * Design choices (mirrors `parent-chatbot.registry.js`):
 *   - **Rule-based + PURE.** No LLM, no DB, no network in this module or its
 *     service core. Deterministic to test, cheap to run, safe against prompt
 *     injection. The dispatcher (webhook handler) owns ALL side effects
 *     (sending, persistence, escalation).
 *   - **Arabic-first.** All user-facing strings are Arabic; keyword catalogues
 *     lean Arabic with English aliases.
 *   - **Linear step machines.** Each unit's flow is an ordered list of steps;
 *     no conditional branching inside a flow (keeps the FSM trivially testable).
 *     Three-way actions (book/edit/cancel) are captured as a free-text answer,
 *     not as branching.
 *
 * PARITY / scope (v1 — W1372): units 4/5/7 (attendance, session reports,
 * billing) COLLECT the identifying inputs then escalate to staff with the
 * structured payload. They do NOT yet query live attendance/report/invoice
 * data — that is an explicit follow-up wave. The `sideEffect.kind` names
 * (`LOOKUP_*`) let that future wave wire DB reads without touching the FSM.
 *
 * @module intelligence/whatsapp-bot-flow.registry
 */

// ─── Center identity (spec §3 — معلومات ثابتة) ───────────────────────────────
const CENTER = Object.freeze({
  nameAr: 'مراكز الأوائل للرعاية النهارية',
  cityAr: 'الرياض',
});

// ─── Side-effect kinds the dispatcher knows how to act on ────────────────────
// The FSM never performs I/O; it returns one of these so the webhook handler
// can escalate / create a record / do nothing. All of them currently escalate
// to staff with the collected payload; named kinds let future waves wire a
// dedicated DB write (e.g. CREATE_COMPLAINT → ComplaintEnhanced.create).
const SIDE_EFFECT = Object.freeze({
  NONE: 'none',
  CREATE_REGISTRATION: 'create_registration', // unit 2
  CREATE_APPOINTMENT_REQUEST: 'create_appointment_request', // unit 3
  LOOKUP_ATTENDANCE: 'lookup_attendance', // unit 4 (escalates in v1)
  LOOKUP_SESSION_REPORT: 'lookup_session_report', // unit 5 (escalates in v1)
  LOOKUP_BILLING: 'lookup_billing', // unit 7 (escalates in v1)
  CREATE_COMPLAINT: 'create_complaint', // unit 9
  CALLBACK_REQUEST: 'callback_request', // unit 10
  // W1380 — new service units
  SUBMIT_SATISFACTION: 'submit_satisfaction', // unit 13 (NPS / feedback)
  EMERGENCY_ESCALATION: 'emergency_escalation', // unit 14 (urgent fast-track)
});

// ─── Conversation phases inside an active flow ───────────────────────────────
const PHASE = Object.freeze({
  COLLECTING: 'collecting',
  CONFIRMING: 'confirming',
});

// Footer appended to every closing message (spec §17 — "ذكّر بكلمة القائمة").
const MENU_HINT = 'اكتب "القائمة" في أي وقت للعودة للقائمة الرئيسية.';

// ─── Static informational content ────────────────────────────────────────────

// Unit 1 — center / services / categories (spec §5).
const INFO_TEXT = [
  `🏥 *${CENTER.nameAr} – ${CENTER.cityAr}*`,
  'مركز متخصص في تأهيل ورعاية ذوي الإعاقة، نضع لكل مستفيد خطة فردية تبدأ بتقييم أولي، ثم خطة علاجية، ثم متابعة وتقارير دورية.',
  '',
  '👥 *الفئات التي نستقبلها:*',
  '• اضطراب طيف التوحد',
  '• الإعاقة الذهنية',
  '• الإعاقة الحركية',
  '• صعوبات التعلم',
  '• اضطرابات النطق والتخاطب',
  '• تأخر النمو العام',
  '',
  '🩺 *الأقسام والبرامج:*',
  '• علاج وظيفي',
  '• علاج نطق وتخاطب',
  '• تربية خاصة / مهارات الحياة اليومية',
  '• تعديل السلوك / الدعم النفسي',
  '• أنشطة جماعية (مهارية، اجتماعية، ترفيهية)',
].join('\n');

// Unit 8 — notifications & alerts (spec §12). Informational only.
const NOTIFICATIONS_INFO = [
  '🔔 *الإشعارات والتنبيهات*',
  'نرسل لكم — بعد موافقتكم — تنبيهات تخص أبناءكم، مثل:',
  '• تذكير بمواعيد الجلسات والتقييم',
  '• إشعارات الحضور والانصراف',
  '• إعلانات الفعاليات (يوم مفتوح، لقاء أولياء الأمور)',
  '• تنبيهات طارئة (تعليق الدوام لظرف طارئ)',
  '',
  'لإيقاف الإشعارات في أي وقت اكتب: "إيقاف الإشعارات"، أو تواصل مع الاستقبال.',
].join('\n');

// Unit 6 — home-exercise suggestions per department (spec §10). Keyed by a
// normalized department token; the service resolves the chosen department to
// the closest key. These are GENERAL wellbeing activities, NOT a clinical
// prescription (spec §2 — لا تقدّم تشخيصاً؛ شرح عام فقط).
const HOME_EXERCISES = Object.freeze({
  occupational: [
    '🧩 *تمارين منزلية — علاج وظيفي:*',
    '1) الإمساك والتلوين: 10 دقائق مرتين يومياً لتقوية عضلات اليد.',
    '2) فرز الأشياء بالألوان أو الأحجام: مرة يومياً لتنمية التآزر البصري الحركي.',
    '3) أنشطة اللصق والقص الآمن: 3 مرات أسبوعياً.',
  ].join('\n'),
  speech: [
    '🗣️ *تمارين منزلية — نطق وتخاطب:*',
    '1) تسمية الصور والأشياء أثناء اللعب: عدة مرات يومياً.',
    '2) تكرار كلمات قصيرة بوضوح أمام المرآة: 5 دقائق مرتين يومياً.',
    '3) استغلال مواقف اليوم (الأكل، الخروج) لتشجيع الكلام والحوار القصير.',
  ].join('\n'),
  special_education: [
    '📚 *تمارين منزلية — تربية خاصة / مهارات الحياة:*',
    '1) مهارة العناية بالذات (غسل اليدين، ارتداء الملابس): خطوة بخطوة يومياً.',
    '2) ترتيب الألعاب بعد اللعب: مهمة يومية بسيطة لتعزيز الاستقلالية.',
    '3) فرز وتصنيف الأدوات المنزلية الآمنة: مرة يومياً.',
  ].join('\n'),
  behavior: [
    '🌟 *تمارين منزلية — دعم سلوكي:*',
    '1) جدول تعزيز إيجابي بالنجوم عند ظهور السلوك المرغوب.',
    '2) روتين يومي ثابت للنوم والأكل واللعب يقلّل السلوكيات غير المرغوبة.',
    '3) تجاهل منظّم للسلوك البسيط مع تعزيز البديل المناسب.',
  ].join('\n'),
});

// ─── W1380: FAQ content (unit 11) ────────────────────────────────────────────
// Keyed 1..6 to match the topic list shown in the unit's intro. The service's
// finalize maps the chosen number to its answer (`resolveFaqAnswer`).
const FAQ_ANSWERS = Object.freeze({
  1: [
    '🕐 *أوقات العمل*',
    'الأحد إلى الخميس: 7:30 صباحاً – 2:30 ظهراً.',
    '(قد تختلف الأوقات حسب الفرع — للتأكيد تواصل مع الاستقبال.)',
  ].join('\n'),
  2: [
    '💳 *الرسوم والاشتراك*',
    'تختلف الرسوم حسب البرنامج وعدد الجلسات والباقة.',
    'لمعرفة التفاصيل تواصل مع قسم القبول، أو اختر "الرسوم والفواتير" من القائمة للاستعلام عن حسابك.',
  ].join('\n'),
  3: [
    '🎒 *ماذا أحضر في أول زيارة؟*',
    '• الهوية الوطنية للمستفيد وولي الأمر.',
    '• التقارير الطبية وتقارير الأخصائيين السابقة (إن وُجدت).',
    '• أي وصفات أو أدوية حالية.',
  ].join('\n'),
  4: [
    '👥 *الأعمار والفئات المقبولة*',
    'نستقبل ذوي الإعاقة ضمن: التوحد، الإعاقة الذهنية، الحركية، صعوبات التعلم،',
    'اضطرابات النطق، وتأخر النمو. لتأكيد البرنامج المناسب لعمر طفلك تواصل مع الاستقبال.',
  ].join('\n'),
  5: [
    '📝 *خطوات التسجيل*',
    '1) تعبئة طلب التسجيل (اختر "التسجيل الأولي" من القائمة).',
    '2) موعد تقييم أولي.',
    '3) وضع خطة فردية للمستفيد.',
    '4) بدء الجلسات والمتابعة الدورية.',
  ].join('\n'),
  6: [
    '🚌 *خدمة النقل / المواصلات*',
    'متوفرة حسب توافر الباصات في فرعك.',
    'للاستفسار عن المسارات والمواعيد تواصل مع الاستقبال.',
  ].join('\n'),
});

const FAQ_INTRO = [
  '❓ *الأسئلة الشائعة* — اختر سؤالاً بكتابة رقمه:',
  '1) أوقات العمل',
  '2) الرسوم وآلية الاشتراك',
  '3) ماذا أحضر في أول زيارة؟',
  '4) الأعمار والفئات المقبولة',
  '5) خطوات التسجيل',
  '6) خدمة النقل / المواصلات',
].join('\n');

// ─── W1380: Location & directions (unit 12) ──────────────────────────────────
// Address + maps link are CENTER-CONFIGURABLE placeholders; replace with the
// branch's real values (or wire from BranchSetting) before launch.
const LOCATION_INFO = [
  `📍 *موقع ${CENTER.nameAr} – ${CENTER.cityAr}*`,
  'العنوان: [يُضاف العنوان التفصيلي للفرع].',
  '🗺️ خرائط جوجل: [يُضاف رابط الموقع هنا]',
  '🕐 أوقات العمل: الأحد–الخميس 7:30ص – 2:30م.',
  '🅿️ يتوفر موقف سيارات.',
  'للمساعدة في الوصول تواصل مع الاستقبال.',
].join('\n');

// ─── Unit / menu definitions ─────────────────────────────────────────────────
// Order here IS the menu numbering 1..10. `steps[i].key` is the field name
// stored in `collected`; `optional:true` lets the user skip with "-"/"تخطي".
// `confirm:false` units skip the summary→confirm step (read-only / info).
const UNITS = Object.freeze([
  // 1 — INFO (static, zero steps)
  {
    id: 'info',
    label: 'معلومات عن المركز والخدمات',
    steps: [],
    confirm: false,
    sideEffect: SIDE_EFFECT.NONE,
    finalize: () => INFO_TEXT,
  },
  // 2 — REGISTER (spec §6)
  {
    id: 'register',
    label: 'التسجيل الأولي / فتح ملف مستفيد جديد',
    intro: 'شكراً لاهتمامك بالتسجيل في مراكز الأوائل. سأحتاج بعض المعلومات الأولية:',
    steps: [
      { key: 'guardianName', prompt: 'اسم ولي الأمر (ثلاثي):' },
      { key: 'beneficiaryName', prompt: 'اسم المستفيد (رباعي):' },
      { key: 'age', prompt: 'عمر المستفيد (بالسنوات والأشهر إن أمكن):' },
      { key: 'gender', prompt: 'الجنس (ذكر / أنثى):' },
      { key: 'city', prompt: 'المدينة:' },
      {
        key: 'guardianPhone',
        prompt: 'رقم جوال ولي الأمر إن كان يختلف عن رقم الواتساب الحالي (أو اكتب "-" للتخطي):',
        optional: true,
      },
      { key: 'priorDiagnosis', prompt: 'هل يوجد تشخيص سابق؟ إن نعم اذكره باختصار (أو اكتب "لا"):' },
      { key: 'hasReports', prompt: 'هل توجد تقارير طبية أو تقارير أخصائيين سابقة؟ (نعم / لا)' },
    ],
    confirm: true,
    sideEffect: SIDE_EFFECT.CREATE_REGISTRATION,
    closing:
      'تم إرسال طلب التسجيل لقسم القبول والتسجيل ✅\nسيتم التواصل معكم خلال (1–3) أيام عمل لتحديد موعد التقييم الأولي بإذن الله.',
  },
  // 3 — APPOINTMENT book/edit/cancel (spec §7)
  {
    id: 'appointment',
    label: 'حجز / تعديل / إلغاء موعد',
    intro: 'سأساعدك في الموعد. أجب على الأسئلة التالية:',
    steps: [
      { key: 'action', prompt: 'ماذا ترغب أن تفعل؟ (حجز / تعديل / إلغاء)' },
      { key: 'beneficiaryName', prompt: 'اسم المستفيد:' },
      { key: 'department', prompt: 'القسم: (علاج وظيفي / نطق / تربية خاصة / سلوك / آخر)' },
      { key: 'preferredDay', prompt: 'اليوم أو التاريخ المفضل (مثال: الأحد القادم / 2026-06-20):' },
      { key: 'preferredPeriod', prompt: 'الفترة الزمنية (صباح / مساء / وقت محدد إن أمكن):' },
    ],
    confirm: true,
    sideEffect: SIDE_EFFECT.CREATE_APPOINTMENT_REQUEST,
    closing: 'تم استلام طلب الموعد ✅\nسيتواصل معكم قسم الاستقبال لتأكيد الموعد المناسب بإذن الله.',
  },
  // 4 — ATTENDANCE lookup (spec §8.ب) — collects, escalates in v1
  {
    id: 'attendance',
    label: 'تقارير الحضور والانصراف',
    intro: 'للاستعلام عن الحضور والانصراف:',
    steps: [
      { key: 'beneficiaryName', prompt: 'اسم المستفيد:' },
      { key: 'date', prompt: 'التاريخ المطلوب (أو اكتب: اليوم):' },
    ],
    confirm: false,
    sideEffect: SIDE_EFFECT.LOOKUP_ATTENDANCE,
    closing: 'تم استلام طلب سجل الحضور ✅\nسيتم تزويدكم بالنتيجة من قبل الاستقبال خلال وقت العمل.',
  },
  // 5 — SESSION REPORTS lookup (spec §9) — collects, escalates in v1
  {
    id: 'session_reports',
    label: 'التقارير اليومية / الأسبوعية للجلسات',
    intro: 'للاستعلام عن تقارير الجلسات:',
    steps: [
      { key: 'beneficiaryName', prompt: 'اسم المستفيد:' },
      { key: 'department', prompt: 'القسم: (وظيفي / نطق / تربية خاصة / سلوك)' },
      { key: 'period', prompt: 'الفترة: (اليوم / هذا الأسبوع / هذا الشهر / آخر تقرير)' },
    ],
    confirm: false,
    sideEffect: SIDE_EFFECT.LOOKUP_SESSION_REPORT,
    closing:
      'تم استلام طلب التقرير ✅\nسيتم تجهيزه ومشاركته معكم من قبل الفريق المختص.\n🔒 حفاظاً على الخصوصية، يُرسَل التقرير لولي الأمر فقط.',
  },
  // 6 — HOME EXERCISES (static content per department, spec §10)
  {
    id: 'home_exercises',
    label: 'المتابعة المنزلية والتمارين المقترحة',
    intro: 'لاقتراح تمارين منزلية مناسبة:',
    steps: [
      { key: 'beneficiaryName', prompt: 'اسم المستفيد:' },
      { key: 'department', prompt: 'القسم: (وظيفي / نطق / تربية خاصة / سلوك)' },
    ],
    confirm: false,
    sideEffect: SIDE_EFFECT.NONE,
    // finalize is provided by the service (needs department → content mapping).
  },
  // 7 — BILLING lookup (spec §11) — collects, escalates in v1
  {
    id: 'billing',
    label: 'الرسوم والفواتير والاشتراكات',
    intro: 'للاستعلام عن الرسوم والفواتير:',
    steps: [
      { key: 'guardianName', prompt: 'اسم ولي الأمر:' },
      { key: 'beneficiaryName', prompt: 'اسم المستفيد:' },
      {
        key: 'fileNumber',
        prompt: 'رقم الملف أو الهوية إن توفّر (أو اكتب "-" للتخطي):',
        optional: true,
      },
    ],
    confirm: false,
    sideEffect: SIDE_EFFECT.LOOKUP_BILLING,
    closing:
      'تم استلام طلب كشف الحساب ✅\nسيتواصل معكم قسم المالية بالتفاصيل.\n⚠️ لا تشاركوا بيانات البطاقات البنكية في المحادثة حفاظاً على أمنكم.',
  },
  // 8 — NOTIFICATIONS (static, zero steps, spec §12)
  {
    id: 'notifications',
    label: 'الإشعارات والتنبيهات',
    steps: [],
    confirm: false,
    sideEffect: SIDE_EFFECT.NONE,
    finalize: () => NOTIFICATIONS_INFO,
  },
  // 9 — COMPLAINT (spec §13)
  {
    id: 'complaint',
    label: 'الشكاوى والملاحظات',
    intro: 'نعتذر عن أي إزعاج، وشكراً لملاحظتك التي تساعدنا على التطوير. أجب على التالي:',
    steps: [
      { key: 'name', prompt: 'الاسم:' },
      { key: 'contactPhone', prompt: 'رقم التواصل:' },
      { key: 'beneficiaryName', prompt: 'اسم المستفيد (إن وجد، أو اكتب "-"):', optional: true },
      { key: 'description', prompt: 'صف المشكلة أو الملاحظة باختصار:' },
      { key: 'whenAt', prompt: 'وقت وتاريخ الواقعة تقريباً (أو اكتب "-"):', optional: true },
    ],
    confirm: true,
    sideEffect: SIDE_EFFECT.CREATE_COMPLAINT,
    closing:
      'تم رفع الشكوى للإدارة المختصة ✅\nوسيتم التواصل معكم في أقرب وقت خلال أوقات العمل الرسمية.',
  },
  // 10 — HUMAN callback (spec §14)
  {
    id: 'human',
    label: 'التواصل مع موظف أو أخصائي بشري',
    intro: 'سأحوّلك لزميل مختص. أحتاج بعض المعلومات:',
    steps: [
      { key: 'name', prompt: 'الاسم:' },
      { key: 'contactPhone', prompt: 'رقم التواصل:' },
      { key: 'bestTime', prompt: 'أفضل وقت للتواصل:' },
      { key: 'topic', prompt: 'موضوع الطلب (تسجيل / تقرير / شكوى / استفسار):' },
    ],
    confirm: true,
    sideEffect: SIDE_EFFECT.CALLBACK_REQUEST,
    closing:
      'تم تحويل طلبك لأحد الزملاء المختصين ✅\nسيتم التواصل معك في أقرب وقت خلال أوقات العمل.',
  },
  // ── W1380: new service units ──────────────────────────────────────────────
  // 11 — FAQ (single-step topic picker; finalize maps the number → answer)
  {
    id: 'faq',
    label: 'الأسئلة الشائعة',
    intro: FAQ_INTRO,
    steps: [{ key: 'faqTopic', prompt: 'اكتب رقم السؤال (1-6):' }],
    confirm: false,
    sideEffect: SIDE_EFFECT.NONE,
    finalize: collected => resolveFaqAnswer(collected && collected.faqTopic),
  },
  // 12 — LOCATION & directions (static, zero steps)
  {
    id: 'location',
    label: 'الموقع والاتجاهات',
    steps: [],
    confirm: false,
    sideEffect: SIDE_EFFECT.NONE,
    finalize: () => LOCATION_INFO,
  },
  // 13 — SATISFACTION survey (NPS-style; no confirm — collect then thank)
  {
    id: 'satisfaction',
    label: 'تقييم الخدمة (استبيان رضا)',
    intro: 'يسعدنا رأيك لتطوير خدماتنا 🌟',
    steps: [
      { key: 'rating', prompt: 'قيّم خدمتنا من 1 (غير راضٍ) إلى 5 (راضٍ جداً):' },
      { key: 'liked', prompt: 'ما الذي أعجبك؟ (أو اكتب "-"):', optional: true },
      { key: 'improve', prompt: 'ما الذي تقترح تحسينه؟ (أو اكتب "-"):', optional: true },
    ],
    confirm: false,
    sideEffect: SIDE_EFFECT.SUBMIT_SATISFACTION,
    closing: 'شكراً جزيلاً لتقييمك! 🌟 رأيك يساعدنا على تقديم أفضل رعاية لأبنائنا.',
  },
  // 14 — EMERGENCY fast-track (no confirm — never delay an urgent report)
  {
    id: 'emergency',
    label: '🚨 بلاغ عاجل',
    intro:
      '🚨 إن كانت حالة طبية طارئة فاتصل فوراً بالإسعاف 997 أو توجّه لأقرب طوارئ.\nلإبلاغ فريقنا بشكل عاجل أجب على التالي:',
    steps: [
      { key: 'beneficiaryName', prompt: 'اسم المستفيد:' },
      { key: 'description', prompt: 'صف الحالة العاجلة باختصار:' },
    ],
    confirm: false,
    sideEffect: SIDE_EFFECT.EMERGENCY_ESCALATION,
    closing: 'تم إبلاغ فريقنا بشكل عاجل وسيتواصل معك في أسرع وقت 🚑\n📞 للطوارئ الطبية: 997.',
  },
]);

// Fast lookup: unit id → unit object.
const UNIT_BY_ID = Object.freeze(
  UNITS.reduce((acc, u) => {
    acc[u.id] = u;
    return acc;
  }, {})
);

// ─── W1381: native interactive menu (WhatsApp list) ─────────────────────────
// WhatsApp interactive lists cap at 10 rows, but we have 14 units — so the menu
// is TWO-LEVEL: a list of CATEGORIES (≤10 rows), and tapping a category sends a
// sub-list of that category's units. Reply IDs are namespaced `BOTNAV:cat:<id>`
// / `BOTNAV:unit:<id>` so the dispatcher can tell a bot-menu tap from any other
// interactive reply in the system. Short labels keep row titles within the
// 24-char WhatsApp limit without ugly mid-word truncation.
const NAV_PREFIX = 'BOTNAV:';

const SHORT_LABELS = Object.freeze({
  info: 'عن المركز وخدماته',
  register: 'تسجيل مستفيد جديد',
  appointment: 'حجز / تعديل موعد',
  attendance: 'الحضور والانصراف',
  session_reports: 'تقارير الجلسات',
  home_exercises: 'تمارين منزلية',
  billing: 'الرسوم والفواتير',
  notifications: 'الإشعارات',
  complaint: 'شكوى أو ملاحظة',
  human: 'تواصل مع موظف',
  faq: 'أسئلة شائعة',
  location: 'الموقع والاتجاهات',
  satisfaction: 'تقييم الخدمة',
  emergency: '🚨 بلاغ عاجل',
});

const MENU_CATEGORIES = Object.freeze([
  { id: 'services', title: '📋 الخدمات والتسجيل', units: ['info', 'register', 'appointment'] },
  {
    id: 'reports',
    title: '📊 التقارير والمتابعة',
    units: ['attendance', 'session_reports', 'home_exercises'],
  },
  { id: 'finance', title: '💳 الرسوم والإشعارات', units: ['billing', 'notifications'] },
  { id: 'help', title: '❓ معلومات ومساعدة', units: ['faq', 'location'] },
  { id: 'feedback', title: '📝 شكاوى وتقييم', units: ['complaint', 'satisfaction'] },
  { id: 'human', title: '👤 تواصل بشري', units: ['human'] },
  { id: 'emergency', title: '🚨 بلاغ عاجل', units: ['emergency'] },
]);

const CATEGORY_BY_ID = Object.freeze(
  MENU_CATEGORIES.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {})
);

// ─── Triggers + free-text keyword routing (spec §15 — NLU lite) ──────────────
// Words that ALWAYS reset to the main menu (even mid-flow).
const MENU_TRIGGERS = Object.freeze([
  'القائمة',
  'القايمة',
  'ابدأ',
  'ابدا',
  'البداية',
  'بداية',
  'الخيارات',
  'menu',
  'start',
  'options',
]);

// Words that abort an in-progress flow back to the menu. Deliberately EXCLUDES
// "إلغاء"/"الغاء" because those are valid answers to unit 3's action step
// ("إلغاء موعد"). Aborting mid-flow uses distinct words instead.
const CANCEL_TRIGGERS = Object.freeze([
  'رجوع',
  'خروج',
  'توقف',
  'الغاء الطلب',
  'إلغاء الطلب',
  'back',
  'exit',
  'cancel',
]);

// W1423 — step BACK one question mid-flow without losing progress (distinct from
// CANCEL, which aborts the whole flow). Deliberately DISTINCTIVE multi-word
// phrases so a back word inside a normal answer never fires (e.g. "إلغاء" stays a
// valid unit-3 action). Matched as substrings via matchesAny.
const BACK_TRIGGERS = Object.freeze([
  'رجوع خطوة',
  'رجوع خطوه',
  'الخطوة السابقة',
  'الخطوه السابقه',
  'ارجع خطوة',
  'ارجع خطوه',
  'تعديل السابق',
  'صحح الاجابة',
  'صحح الاجابه',
  'go back',
  'previous step',
]);

const YES_TOKENS = Object.freeze([
  'نعم',
  'ايوه',
  'اي',
  'تمام',
  'موافق',
  'اكد',
  'تاكيد',
  'أكد',
  'تأكيد',
  'yes',
  'y',
  'ok',
  'confirm',
]);

const NO_TOKENS = Object.freeze(['لا', 'لأ', 'كلا', 'الغاء', 'إلغاء', 'no', 'n', 'cancel']);

const SKIP_TOKENS = Object.freeze(['-', '—', 'تخطي', 'تخطى', 'skip', 'لا يوجد', 'لايوجد']);

// Free-text → unit id, for when the user types intent words instead of a number
// (spec §15: "أبغى تقرير اليوم" → unit 5, "حضوره اليوم" → unit 4, etc.). Each
// entry: unitId → keyword list (matched as normalized substrings).
const UNIT_KEYWORDS = Object.freeze({
  info: ['معلومات', 'خدماتكم', 'وش تقدمون', 'وش خدماتكم', 'عن المركز', 'الفئات', 'services'],
  register: ['تسجيل', 'ملف جديد', 'مستفيد جديد', 'اسجل', 'التحاق', 'register', 'enroll'],
  appointment: ['موعد', 'مواعيد', 'احجز', 'حجز', 'تقييم', 'appointment', 'booking'],
  attendance: ['حضور', 'انصراف', 'حضوره', 'غياب', 'attendance'],
  session_reports: [
    'تقرير الجلسة',
    'تقارير الجلسات',
    'تقرير اليوم',
    'تقرير الجلسة',
    'session report',
  ],
  home_exercises: ['تمارين', 'تمرين', 'واجب منزلي', 'تمارين البيت', 'home exercise', 'homework'],
  billing: [
    'فاتورة',
    'فواتير',
    'رسوم',
    'اشتراك',
    'حسابي',
    'مستحق',
    'invoice',
    'billing',
    'payment',
  ],
  notifications: ['اشعارات', 'تنبيهات', 'notifications', 'alerts'],
  complaint: ['شكوى', 'شكاوى', 'ملاحظة', 'مشكلة', 'اعتراض', 'complaint'],
  human: ['موظف', 'انسان', 'بشري', 'اخصائي', 'تكلم مع', 'human', 'agent', 'representative'],
  // W1380 — new service units
  faq: ['اسئلة شائعة', 'سؤال', 'استفسار عام', 'faq', 'questions'],
  location: ['موقع', 'العنوان', 'عنوانكم', 'وين انتم', 'كيف اوصل', 'الاتجاهات', 'خريطة', 'location', 'address', 'directions', 'map'],
  satisfaction: ['تقييم', 'قيم', 'رضا', 'استبيان', 'رايي', 'رأيي', 'feedback', 'satisfaction', 'survey', 'rating'],
  emergency: ['طارئ', 'طوارئ', 'عاجل', 'بلاغ عاجل', 'مستعجل', 'emergency', 'urgent'],
});

// ─── Pure helpers ────────────────────────────────────────────────────────────

/**
 * Convert Arabic-Indic (٠-٩) and Extended/Persian (۰-۹) digits to ASCII so
 * "١" and "۱" both parse as menu selection 1. Pure.
 */
function toAsciiDigits(s) {
  if (!s || typeof s !== 'string') return '';
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code >= 0x0660 && code <= 0x0669)
      out += String(code - 0x0660); // Arabic-Indic
    else if (code >= 0x06f0 && code <= 0x06f9)
      out += String(code - 0x06f0); // Extended
    else out += ch;
  }
  return out;
}

/**
 * Normalize text for keyword / token matching: ASCII-fold digits, lowercase,
 * strip Arabic diacritics + tatweel, fold alef/ya/ta variants, collapse
 * whitespace. Pure. (Stored field VALUES are kept raw; this is match-only.)
 */
function normalize(s) {
  if (!s || typeof s !== 'string') return '';
  return toAsciiDigits(s)
    .toLowerCase()
    .replace(/[ً-ْ]/g, '') // harakat
    .replace(/ـ/g, '') // tatweel
    .replace(/[أإآٱ]/g, 'ا') // أ إ آ ٱ → ا
    .replace(/ؤ/g, 'و') // W1416: ؤ → و (مسؤول/مسئول variance)
    .replace(/ئ/g, 'ي') // W1416: ئ → ي
    .replace(/ى/g, 'ي') // ى → ي
    .replace(/ة/g, 'ه') // ة → ه
    .replace(/[٠-٩۰-۹]/g, '') // (already folded; safety)
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesAny(text, tokens) {
  const n = normalize(text);
  if (!n) return false;
  return tokens.some(t => {
    const nt = normalize(t);
    // Short tokens (≤2 chars, e.g. "لا", "اي", "y") must match the WHOLE message
    // to avoid firing inside longer answers; longer tokens match as substrings.
    return nt.length <= 2 ? n === nt : n.includes(nt);
  });
}

function isMenuTrigger(text) {
  return matchesAny(text, MENU_TRIGGERS);
}

function isCancelTrigger(text) {
  return matchesAny(text, CANCEL_TRIGGERS);
}

/** W1423 — true when the message asks to step back one question (not cancel). */
function isBackTrigger(text) {
  return matchesAny(text, BACK_TRIGGERS);
}

function isYes(text) {
  return matchesAny(text, YES_TOKENS);
}

function isNo(text) {
  return matchesAny(text, NO_TOKENS);
}

function isSkip(text) {
  const n = normalize(text);
  return SKIP_TOKENS.some(t => normalize(t) === n);
}

/**
 * Parse a main-menu selection. Accepts a message that is essentially a single
 * number 1..UNITS.length (ASCII or Arabic-Indic), optionally wrapped in a
 * numbered-emoji or light punctuation/label ("1️⃣", "٢-", "رقم 3", "14."). The
 * anchored single-group pattern deliberately REJECTS multi-number strings like a
 * date "2026-06-20" or a time "10:30" so they aren't misread as a selection.
 * Returns the 1-based index or null.
 */
function parseMenuSelection(text) {
  if (!text) return null;
  const ascii = toAsciiDigits(String(text)).trim();
  const m = ascii.match(/^\D*?(\d{1,2})\D*$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= UNITS.length ? n : null;
}

// ─── W1381: interactive-list builders + nav-reply parser (pure) ─────────────

/**
 * Build the top-level interactive menu as a category list. Returns a plain data
 * object the dispatcher passes to `whatsappService.sendInteractiveList`. Pure.
 */
function buildMainMenuList(ctx = {}) {
  const greeting = ctx.guardianName ? `مرحباً ${ctx.guardianName} 👋` : 'مرحباً بك 👋';
  return {
    bodyText: `${greeting}\nأنا مساعد الأوائل الذكي (بوت 🤖). اختر القسم المطلوب:`,
    buttonLabel: 'القائمة',
    sectionTitle: 'الأقسام',
    items: MENU_CATEGORIES.map(c => ({ id: `${NAV_PREFIX}cat:${c.id}`, title: c.title })),
  };
}

/**
 * Build the sub-list of units inside one category. Returns null for an unknown
 * category id. Each row's id is `BOTNAV:unit:<unitId>`. Pure.
 */
function buildCategoryList(catId) {
  const cat = CATEGORY_BY_ID[catId];
  if (!cat) return null;
  return {
    bodyText: `${cat.title}\nاختر الخدمة:`,
    buttonLabel: 'اختر',
    sectionTitle: cat.title,
    items: cat.units.map(uid => ({
      id: `${NAV_PREFIX}unit:${uid}`,
      title: SHORT_LABELS[uid] || (UNIT_BY_ID[uid] && UNIT_BY_ID[uid].label) || uid,
    })),
  };
}

/**
 * Parse a namespaced interactive-reply id. Returns `{kind:'cat'|'unit', id}` for
 * a bot-menu tap, or null for anything else (so non-bot interactive replies are
 * left alone). Pure.
 */
function parseNav(replyId) {
  if (!replyId || typeof replyId !== 'string' || !replyId.startsWith(NAV_PREFIX)) return null;
  const rest = replyId.slice(NAV_PREFIX.length);
  const sep = rest.indexOf(':');
  if (sep < 0) return null;
  const kind = rest.slice(0, sep);
  const id = rest.slice(sep + 1);
  if ((kind !== 'cat' && kind !== 'unit') || !id) return null;
  if (kind === 'cat' && !CATEGORY_BY_ID[id]) return null;
  if (kind === 'unit' && !UNIT_BY_ID[id]) return null;
  return { kind, id };
}

/**
 * Resolve a FAQ topic answer (unit 11) from the user's typed number. Returns the
 * matching answer, or a graceful fallback when the number is out of range. Pure.
 */
function resolveFaqAnswer(topicText) {
  const ascii = toAsciiDigits(String(topicText == null ? '' : topicText)).trim();
  const m = ascii.match(/(\d{1,2})/);
  const n = m ? parseInt(m[1], 10) : NaN;
  if (FAQ_ANSWERS[n]) return FAQ_ANSWERS[n];
  return 'لم أتعرّف على رقم السؤال. الأرقام المتاحة من 1 إلى 6 — أو اكتب "موظف" للمساعدة.';
}

/**
 * Strip ONE leading definite article / conjunction-preposition so an inflected
 * surface form reduces toward its stem for the fuzzy fallback (W1416). Very
 * conservative — only the highest-frequency, lowest-ambiguity prefixes, and only
 * when ≥3 chars remain (never over-strips a short word into noise). Pure. EXACT
 * substring matching is unaffected; this only feeds the typo-tolerant fallback.
 * @param {string} tok normalized token
 * @returns {string}
 */
function lightStem(tok) {
  if (!tok) return tok;
  const art = tok.match(/^(?:وال|بال|فال|كال|لل|ال)(.{3,})$/); // article (± leading particle)
  if (art) return art[1];
  const part = tok.match(/^[وفبكل](.{3,})$/); // single leading particle و/ف/ب/ك/ل
  return part ? part[1] : tok;
}

/**
 * True when Levenshtein(a, b) ≤ 1 — catches a single inserted / deleted /
 * substituted letter, the dominant single-char Arabic typo class that
 * normalization cannot fold (e.g. "حضوور"→"حضور", "تسجل"→"تسجيل"). Early-exits;
 * pure. A length gap > 1 returns false immediately.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function editDistanceLE1(a, b) {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let diffs = 0;
    for (let i = 0; i < la; i++) {
      if (a[i] !== b[i] && ++diffs > 1) return false;
    }
    return diffs === 1;
  }
  // off-by-one length: align the shorter inside the longer allowing one skip.
  const s = la < lb ? a : b;
  const l = la < lb ? b : a;
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < s.length && j < l.length) {
    if (s[i] === l[j]) {
      i++;
      j++;
      continue;
    }
    if (skipped) return false;
    skipped = true;
    j++; // consume the extra char in the longer string
  }
  return true;
}

/**
 * Score a message against every unit's keyword catalogue (W1382 + W1416 smarter
 * NLU). An EXACT substring match scores the keyword's length (strongest, precise
 * signal). When a single-word keyword (≥4 chars) has NO exact hit, a typo-tolerant
 * fallback adds HALF weight if any lightly-stemmed message token equals it or is
 * within one edit — so real-world typos / prefixed forms still route, while exact
 * matches always dominate. Returns `{ unitId, score }` for the top match, or null.
 */
function scoreUnits(text) {
  const n = normalize(text);
  if (!n) return null;
  const tokens = n.split(' ').map(lightStem).filter(t => t.length >= 3);
  let best = null;
  for (const [unitId, keywords] of Object.entries(UNIT_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      const nk = normalize(kw);
      if (!nk) continue;
      if (nk.length <= 2) {
        if (n === nk) score += nk.length;
        continue;
      }
      if (n.includes(nk)) {
        score += nk.length; // exact substring — strongest signal
        continue;
      }
      // W1416 typo / inflection fallback: single-word keywords only, half weight.
      if (nk.length >= 4 && !nk.includes(' ')) {
        for (const t of tokens) {
          if (t === nk || editDistanceLE1(t, nk)) {
            score += Math.ceil(nk.length / 2);
            break;
          }
        }
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { unitId, score };
  }
  return best;
}

/**
 * Resolve the unit a user wants from idle: numeric selection first, then
 * score-based free-text keyword routing (spec §15). Returns a unit id or null.
 */
function resolveUnitId(text) {
  const sel = parseMenuSelection(text);
  if (sel) return UNITS[sel - 1].id;
  const best = scoreUnits(text);
  return best ? best.unitId : null;
}

/**
 * Map a free-text department answer (unit 6) to a HOME_EXERCISES key. Returns
 * a key or null when unrecognized.
 */
function resolveDepartmentKey(text) {
  const n = normalize(text);
  if (!n) return null;
  if (/(وظيف|occupation|ot\b)/.test(n)) return 'occupational';
  if (/(نطق|تخاطب|لغ|speech|slp)/.test(n)) return 'speech';
  if (/(تربي|مهارات|اكاديم|special|education)/.test(n)) return 'special_education';
  if (/(سلوك|نفس|behav|psych)/.test(n)) return 'behavior';
  return null;
}

/**
 * W1418 — derive a SHORT Arabic label from a step prompt: the question stem
 * before the first colon / parenthesis (e.g. "اليوم أو التاريخ المفضل (مثال…):"
 * → "اليوم أو التاريخ المفضل"). Pure.
 * @param {string} prompt
 * @returns {string}
 */
function shortLabel(prompt) {
  if (!prompt || typeof prompt !== 'string') return '';
  return prompt.split(/[(:：؟]/)[0].trim();
}

/**
 * Map of collected-field key → short Arabic label, auto-built from every unit's
 * step prompts (first definition wins; keys are consistent across units). Used
 * to render the staff escalation summary with human labels instead of raw keys.
 */
const COLLECTED_LABELS = Object.freeze(
  UNITS.reduce((map, u) => {
    for (const s of u.steps || []) {
      if (s && s.key && !map[s.key]) map[s.key] = shortLabel(s.prompt);
    }
    return map;
  }, {})
);

/**
 * W1418 — render a clean, human-readable Arabic handoff card for staff from a
 * completed bot side effect, instead of a raw JSON dump. Pure + testable.
 * @param {{kind:string, collected?:object}} sideEffect
 * @param {{senderName?:string, phone?:string, reason?:string}} [opts]
 * @returns {string}
 */
function formatEscalationSummary(sideEffect, opts = {}) {
  const reason = opts.reason || (sideEffect && sideEffect.kind) || 'طلب عبر بوت الواتساب';
  const lines = [`📋 ${reason}`];
  const who = [opts.senderName, opts.phone].filter(Boolean).join(' — ');
  if (who) lines.push(`👤 ${who}`);
  const collected = (sideEffect && sideEffect.collected) || {};
  let any = false;
  for (const [k, v] of Object.entries(collected)) {
    if (v === undefined || v === null || String(v).trim() === '') continue;
    lines.push(`• ${COLLECTED_LABELS[k] || k}: ${String(v).trim()}`);
    any = true;
  }
  if (!any) lines.push('• (لا توجد تفاصيل مُجمّعة)');
  return lines.join('\n');
}

module.exports = {
  CENTER,
  SIDE_EFFECT,
  PHASE,
  MENU_HINT,
  INFO_TEXT,
  NOTIFICATIONS_INFO,
  HOME_EXERCISES,
  FAQ_ANSWERS,
  FAQ_INTRO,
  LOCATION_INFO,
  UNITS,
  UNIT_BY_ID,
  NAV_PREFIX,
  SHORT_LABELS,
  MENU_CATEGORIES,
  CATEGORY_BY_ID,
  MENU_TRIGGERS,
  CANCEL_TRIGGERS,
  BACK_TRIGGERS,
  YES_TOKENS,
  NO_TOKENS,
  SKIP_TOKENS,
  UNIT_KEYWORDS,
  // helpers
  toAsciiDigits,
  normalize,
  matchesAny,
  isMenuTrigger,
  isCancelTrigger,
  isBackTrigger,
  isYes,
  isNo,
  isSkip,
  parseMenuSelection,
  resolveUnitId,
  scoreUnits,
  lightStem,
  editDistanceLE1,
  resolveDepartmentKey,
  shortLabel,
  COLLECTED_LABELS,
  formatEscalationSummary,
  resolveFaqAnswer,
  buildMainMenuList,
  buildCategoryList,
  parseNav,
};
