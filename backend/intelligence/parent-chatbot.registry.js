'use strict';

/**
 * parent-chatbot.registry.js — Wave 120 / P3.6 Phase 1.
 *
 * Constants for the Parent Chatbot service.
 *
 * Phase-1 scope is **foundation only**: a rule-based intent
 * classifier over Arabic + English keywords, canned response
 * templates, conversation-turn persistence schema, and audit hooks.
 * Phase-2 (Wave 121+) will add LLM-backed response generation +
 * DB-backed context injection (appointment / invoice / progress
 * lookups). Phase-3 will add a Parent Portal UI.
 *
 * Design choices:
 *   - **Rule-based v1.** No LLM dependency for foundation — cheap to
 *     run, deterministic to test, safe against prompt injection. The
 *     same `classifyIntent` / `generateResponse` surface can swap to
 *     LLM behind the same contract in Phase 2.
 *   - **Arabic-first.** Keyword catalogues lean Arabic with English
 *     aliases. Response templates are exclusively Arabic.
 *   - **PDPL-aware retention.** TTL on session model is 30 days; the
 *     model itself doesn't persist beneficiary clinical data — only
 *     conversation text + the *resolved intent* (no medical content).
 *   - **No PII in responses.** Templates use placeholder tokens that
 *     the Phase-2 context-injection layer fills from authorized DB
 *     queries; Phase 1 returns the template verbatim with placeholders
 *     intact so reviewers can see exactly what would be filled.
 */

const INTENT = Object.freeze({
  GREETING: 'greeting',
  APPOINTMENT_NEXT: 'appointment.next',
  APPOINTMENT_HISTORY: 'appointment.history',
  APPOINTMENT_CANCEL: 'appointment.cancel',
  APPOINTMENT_BOOK: 'appointment.book',
  INVOICE_BALANCE: 'invoice.balance',
  INVOICE_HISTORY: 'invoice.history',
  PAYMENT_METHODS: 'payment.methods',
  PROGRESS_SUMMARY: 'progress.summary',
  TEAM_THERAPIST: 'team.therapist',
  CLINIC_HOURS: 'clinic.hours',
  CLINIC_ADDRESS: 'clinic.address',
  CLINIC_HOLIDAYS: 'clinic.holidays',
  DOCUMENT_REQUEST: 'document.request',
  TRANSPORT_INFO: 'transport.info',
  ESCALATE_HUMAN: 'escalate.human',
  UNKNOWN: 'unknown',
});
const INTENTS = Object.freeze(Object.values(INTENT));

// Per-intent keyword catalogue. Each entry is `{ai: string[], en: string[]}`.
// Matching is case-insensitive substring against normalized text.
// Order within an intent array doesn't matter — every hit counts.
const INTENT_KEYWORDS = Object.freeze({
  [INTENT.GREETING]: Object.freeze({
    ar: Object.freeze(['السلام', 'مرحبا', 'مرحباً', 'أهلا', 'السلام عليكم', 'صباح', 'مساء']),
    en: Object.freeze(['hello', 'hi', 'good morning', 'good evening', 'salam']),
  }),
  [INTENT.APPOINTMENT_NEXT]: Object.freeze({
    ar: Object.freeze(['موعدي القادم', 'الموعد القادم', 'موعد جاي', 'متى موعد', 'موعدي']),
    en: Object.freeze(['next appointment', 'upcoming appointment', 'when is my appointment']),
  }),
  [INTENT.APPOINTMENT_HISTORY]: Object.freeze({
    ar: Object.freeze(['مواعيدي السابقة', 'سجل المواعيد', 'كل المواعيد']),
    en: Object.freeze(['appointment history', 'past appointments', 'all appointments']),
  }),
  [INTENT.APPOINTMENT_CANCEL]: Object.freeze({
    ar: Object.freeze(['إلغاء الموعد', 'الغاء موعدي', 'لن أستطيع الحضور']),
    en: Object.freeze(['cancel appointment', 'cancel my appointment', 'cannot attend']),
  }),
  [INTENT.APPOINTMENT_BOOK]: Object.freeze({
    ar: Object.freeze(['حجز موعد', 'أريد موعد', 'موعد جديد', 'احجز لي', 'طلب موعد']),
    en: Object.freeze([
      'book appointment',
      'book an appointment',
      'schedule appointment',
      'new appointment',
      'reserve a slot',
    ]),
  }),
  [INTENT.INVOICE_BALANCE]: Object.freeze({
    ar: Object.freeze(['رصيدي', 'كم علي', 'الرصيد المستحق', 'كم المبلغ المتبقي']),
    en: Object.freeze(['balance', 'outstanding balance', 'how much do i owe']),
  }),
  [INTENT.INVOICE_HISTORY]: Object.freeze({
    ar: Object.freeze(['فواتيري', 'سجل الفواتير', 'كل الفواتير']),
    en: Object.freeze(['invoices', 'invoice history', 'past invoices']),
  }),
  [INTENT.PAYMENT_METHODS]: Object.freeze({
    ar: Object.freeze([
      'طرق الدفع',
      'كيف أدفع',
      'كيف ادفع',
      'وسيلة الدفع',
      'الدفع الإلكتروني',
      'تحويل بنكي',
    ]),
    en: Object.freeze([
      'payment methods',
      'how to pay',
      'how can i pay',
      'pay online',
      'bank transfer',
      'pay my invoice',
    ]),
  }),
  [INTENT.PROGRESS_SUMMARY]: Object.freeze({
    ar: Object.freeze(['تقدم ابني', 'تقدم ابنتي', 'كيف يتقدم', 'تقدمه', 'حالته الآن']),
    en: Object.freeze(['progress', 'how is my child', 'son progress', 'daughter progress']),
  }),
  [INTENT.TEAM_THERAPIST]: Object.freeze({
    ar: Object.freeze(['من معالج ابني', 'المعالج', 'الأخصائي', 'من يعالج']),
    en: Object.freeze(['who is the therapist', 'my therapist', 'specialist']),
  }),
  [INTENT.CLINIC_HOURS]: Object.freeze({
    ar: Object.freeze(['ساعات العمل', 'متى تفتحون', 'مواعيد العمل', 'ساعات العيادة']),
    en: Object.freeze(['working hours', 'opening hours', 'when are you open', 'clinic hours']),
  }),
  [INTENT.CLINIC_ADDRESS]: Object.freeze({
    ar: Object.freeze(['عنوان المركز', 'وين المركز', 'موقع', 'العنوان']),
    en: Object.freeze(['address', 'location', 'where is the clinic']),
  }),
  [INTENT.CLINIC_HOLIDAYS]: Object.freeze({
    ar: Object.freeze([
      'الإجازات',
      'الأعياد',
      'إجازة العيد',
      'إجازة وطنية',
      'مفتوح في العيد',
      'مفتوحون في العيد',
      'العيد',
    ]),
    en: Object.freeze(['holidays', 'holiday schedule', 'open on eid', 'national day']),
  }),
  [INTENT.DOCUMENT_REQUEST]: Object.freeze({
    ar: Object.freeze(['طلب تقرير', 'تقرير طبي', 'شهادة', 'مستند', 'إفادة', 'طلب وثيقة']),
    en: Object.freeze(['request report', 'medical report', 'certificate', 'document request']),
  }),
  [INTENT.TRANSPORT_INFO]: Object.freeze({
    ar: Object.freeze([
      'التوصيل',
      'توصيل',
      'الباص',
      'باص',
      'المواصلات',
      'النقل',
      'الحافلة',
      'حافلة',
    ]),
    en: Object.freeze(['transport', 'bus service', 'shuttle', 'pick up']),
  }),
  [INTENT.ESCALATE_HUMAN]: Object.freeze({
    ar: Object.freeze(['أريد التحدث مع شخص', 'موظف', 'إنسان', 'تكلم مع موظف', 'مساعدة بشرية']),
    en: Object.freeze(['talk to human', 'human agent', 'real person', 'speak to staff']),
  }),
});

// Confidence thresholds for the rule-based classifier.
//   AUTO_RESPOND: model emits the canned reply for the top intent.
//   CLARIFY: model emits a clarification prompt listing top-2 intent labels.
//   FALLBACK: model emits the escalate-to-human template.
const CONFIDENCE_THRESHOLDS = Object.freeze({
  AUTO_RESPOND: 0.5,
  CLARIFY: 0.25,
});

// Canned response templates. Each is plain Arabic with `{TOKEN}`
// placeholders. Phase 2 context-injection layer will replace tokens
// from authorized DB queries; Phase 1 returns templates verbatim.
const RESPONSE_TEMPLATES = Object.freeze({
  [INTENT.GREETING]: 'أهلاً بك! كيف يمكنني مساعدتك اليوم؟',
  [INTENT.APPOINTMENT_NEXT]:
    'موعدك القادم هو {APPOINTMENT_DATE} الساعة {APPOINTMENT_TIME} مع {THERAPIST_NAME}.',
  [INTENT.APPOINTMENT_HISTORY]:
    'لديك {APPOINTMENT_COUNT} مواعيد في الـ 90 يومًا الماضية. آخرها كان {LAST_APPOINTMENT_DATE}.',
  [INTENT.APPOINTMENT_CANCEL]:
    'لإلغاء الموعد، يرجى الاتصال بالاستقبال على {CLINIC_PHONE} قبل 24 ساعة من الموعد.',
  [INTENT.APPOINTMENT_BOOK]:
    'لحجز موعد جديد، يرجى الاتصال بالاستقبال على {CLINIC_PHONE} أو زيارة بوابة الأهالي.',
  [INTENT.INVOICE_BALANCE]:
    'رصيدك المستحق حاليًا هو {BALANCE_SAR} ريال. يمكنك السداد عبر {PAYMENT_LINK}.',
  [INTENT.INVOICE_HISTORY]:
    'لديك {INVOICE_COUNT} فاتورة في السجل. لعرض التفاصيل، يرجى زيارة صفحة الفواتير.',
  [INTENT.PAYMENT_METHODS]:
    'وسائل الدفع المتاحة: تحويل بنكي، مدى، بطاقة ائتمان، Apple Pay. لمزيد من التفاصيل: {PAYMENT_LINK}.',
  [INTENT.PROGRESS_SUMMARY]:
    'يتلقى {CHILD_NAME} {SESSION_COUNT} جلسة شهريًا، وقد حقق {GOALS_COMPLETED} من {GOALS_TOTAL} أهداف.',
  [INTENT.TEAM_THERAPIST]: 'المعالج الأساسي لـ {CHILD_NAME} هو {THERAPIST_NAME}، تخصص {SPECIALTY}.',
  [INTENT.CLINIC_HOURS]: 'ساعات عمل المركز: {CLINIC_HOURS}.',
  [INTENT.CLINIC_ADDRESS]: 'عنوان المركز: {CLINIC_ADDRESS}.',
  [INTENT.CLINIC_HOLIDAYS]:
    'المركز يتبع جدول الإجازات الرسمية في المملكة العربية السعودية. لمعرفة جدول إجازات محدد، يرجى التواصل مع الاستقبال.',
  [INTENT.DOCUMENT_REQUEST]:
    'لطلب تقرير أو شهادة، يرجى تعبئة طلب وثيقة عبر بوابة الأهالي أو الاتصال بالاستقبال. المدة المتوقعة للإصدار: 3-5 أيام عمل.',
  [INTENT.TRANSPORT_INFO]:
    'خدمة النقل متوفرة حسب توافر الباصات في فرعك. للاستفسار عن المسارات والمواعيد، يرجى الاتصال بالاستقبال.',
  [INTENT.ESCALATE_HUMAN]:
    'سأقوم بتحويلك إلى أحد موظفي الاستقبال. سيتواصل معك أحدهم خلال {ETA_MINUTES} دقيقة.',
  [INTENT.UNKNOWN]:
    'عذرًا، لم أفهم طلبك. هل يمكنك إعادة الصياغة؟ أو اكتب "موظف" للتحدث مع الاستقبال.',
});

// Maximum length of an inbound message we'll accept. Beyond this, the
// service returns MESSAGE_TOO_LONG instead of trying to classify.
// Aligns with a typical SMS turn + a generous margin for screen-reader
// users.
const MAX_MESSAGE_LENGTH = 1000;

// Maximum turns we'll keep per session. Older turns are dropped from
// the response payload (still in the document until TTL expires) so
// the wire response stays small.
const MAX_TURNS_IN_RESPONSE = 20;

// Tokens that must NEVER appear in a chatbot response (would leak
// clinical detail or PII). The service refuses to emit a template
// containing any of these unless Phase-2 explicitly authorized.
const FORBIDDEN_RESPONSE_TOKENS = Object.freeze([
  'ICD',
  'diagnosis',
  'تشخيص',
  'medication',
  'دواء',
  'national_id',
  'الهوية',
]);

const REASON = Object.freeze({
  CHATBOT_UNAVAILABLE: 'CHATBOT_UNAVAILABLE',
  MESSAGE_REQUIRED: 'MESSAGE_REQUIRED',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_NOT_OWNED: 'SESSION_NOT_OWNED',
  RESPONSE_FORBIDDEN_CONTENT: 'RESPONSE_FORBIDDEN_CONTENT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
});

const MODEL_VERSION = 'parent-chatbot-rule-based-v1';

// ─── Pure helpers ────────────────────────────────────────────────

/**
 * Normalize a string for keyword matching: lowercase, strip Arabic
 * diacritics + tatweel, collapse whitespace.
 */
function normalizeText(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .replace(/[ً-ْ]/g, '') // Arabic diacritics
    .replace(/ـ/g, '') // tatweel
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Score a single intent against a normalized message. Returns
 * `{ count, total, score, matched }` with `score ∈ [0, 1]`.
 *
 * Scoring rules (rule-based v1):
 *   - 0 matches              → 0
 *   - ≥1 match, longest ≥4   → baseline 0.6 (auto-respond tier)
 *   - ≥1 match, all <4 chars → baseline 0.3 (clarify tier; "hi"/"كم")
 *   - +0.1 per additional match, clamped to 1.0
 *
 * The threshold of 4 chars covers Arabic words like "موظف" (employee),
 * "موعد" (appointment), and English words like "next", "balance" —
 * short enough to be permissive, long enough to filter stop-words.
 */
function scoreIntent(normalizedMessage, intent) {
  const catalog = INTENT_KEYWORDS[intent];
  if (!catalog) return { count: 0, total: 0, score: 0, matched: [] };
  const all = [...catalog.ar, ...catalog.en];
  const matched = all.filter(kw => normalizedMessage.includes(normalizeText(kw)));
  if (matched.length === 0) {
    return { count: 0, total: all.length, score: 0, matched: [] };
  }
  const hasDistinctive = matched.some(kw => kw.length >= 4);
  let score = hasDistinctive ? 0.6 : 0.3;
  if (matched.length > 1) {
    score = Math.min(1, score + 0.1 * (matched.length - 1));
  }
  return {
    count: matched.length,
    total: all.length,
    score: Number(score.toFixed(4)),
    matched,
  };
}

/**
 * Templates are emitted verbatim in Phase 1; this guard checks that
 * the chosen template doesn't accidentally embed a forbidden token.
 * Returns null if safe; returns the offending token otherwise.
 */
function forbiddenTokenInTemplate(template) {
  if (!template) return null;
  const lower = template.toLowerCase();
  for (const tok of FORBIDDEN_RESPONSE_TOKENS) {
    if (lower.includes(tok.toLowerCase())) return tok;
  }
  return null;
}

module.exports = {
  INTENT,
  INTENTS,
  INTENT_KEYWORDS,
  CONFIDENCE_THRESHOLDS,
  RESPONSE_TEMPLATES,
  MAX_MESSAGE_LENGTH,
  MAX_TURNS_IN_RESPONSE,
  FORBIDDEN_RESPONSE_TOKENS,
  REASON,
  MODEL_VERSION,
  normalizeText,
  scoreIntent,
  forbiddenTokenInTemplate,
};
