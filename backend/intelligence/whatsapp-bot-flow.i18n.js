'use strict';

/**
 * whatsapp-bot-flow.i18n.js — W1383 (expansion bundle D).
 *
 * Bilingual (Arabic / English) OVERLAY for the WhatsApp menu bot. The base
 * registry stays Arabic-first and UNCHANGED — this module adds an English layer
 * on top and a resolver that returns the English string when `lang === 'en'`
 * and an English value exists, otherwise falls back to the Arabic base. So:
 *
 *   - Nothing breaks: every existing test + reader that touches the Arabic
 *     registry directly keeps working.
 *   - English is data-only + incremental: a field without an `en` entry simply
 *     renders Arabic. Completing a translation is editing this file, no code.
 *
 * SCOPE (v1): the full INTERACTIVE surface is bilingual — welcome, all 14 unit
 * labels + short labels, category titles, every step prompt, intros, closings,
 * and the confirm/summary/cancel framework. Two long static content blocks are
 * also translated (location, notifications). The three encyclopedic blocks
 * (center info, FAQ answers, home-exercise lists) fall back to Arabic and are a
 * documented content-translation follow-up (clinical English should be
 * human-reviewed by bilingual staff, not shipped as unreviewed machine text).
 *
 * @module intelligence/whatsapp-bot-flow.i18n
 */

const LANGS = Object.freeze(['ar', 'en']);
const DEFAULT_LANG = 'ar';

// Explicit language-switch triggers (sticky — we only switch on an explicit
// request, never auto-detect per message, which is fragile for mixed input).
const LANG_TRIGGERS = Object.freeze({
  en: ['english', 'انجليزي', 'إنجليزي', 'انكليزي', 'بالانجليزي', 'en'],
  ar: ['عربي', 'العربية', 'بالعربي', 'arabic', 'ar'],
});

// ─── English overlay ─────────────────────────────────────────────────────────
const EN = Object.freeze({
  framework: {
    greeting: 'Hello 👋',
    greetingNamed: name => `Hello ${name} 👋`,
    intro: () =>
      `I'm *Al-Awael Smart Assistant* (a virtual bot 🤖) for Al-Awael Day-Care Centers – Riyadh.`,
    help: "Happy to help with your child's rehabilitation and care ❤️",
    humanHint: 'You can type "agent" anytime to reach a human.',
    choose: 'Please choose an option by typing its number:',
    menuHint: 'Type "menu" anytime to return to the main menu.',
    summaryHeader: label => `📋 *Your request summary (${label}):*`,
    confirmQ: 'Do you confirm sending the request? (yes / no)',
    confirmPrompt: 'Please reply (yes) to confirm or (no) to cancel.',
    cancelled: 'The current operation was cancelled.',
    notSent: 'The request was cancelled and not sent.',
    switched: 'Language set to English. 🌐',
  },
  labels: {
    info: 'About the center & services',
    register: 'New beneficiary registration',
    appointment: 'Book / change / cancel appointment',
    attendance: 'Attendance reports',
    session_reports: 'Daily / weekly session reports',
    home_exercises: 'Home follow-up & exercises',
    billing: 'Fees, invoices & subscriptions',
    notifications: 'Notifications & alerts',
    complaint: 'Complaints & feedback',
    human: 'Talk to a staff member',
    faq: 'Frequently asked questions',
    location: 'Location & directions',
    satisfaction: 'Service satisfaction survey',
    emergency: '🚨 Urgent report',
  },
  shortLabels: {
    info: 'About the center',
    register: 'New registration',
    appointment: 'Book / change appt.',
    attendance: 'Attendance',
    session_reports: 'Session reports',
    home_exercises: 'Home exercises',
    billing: 'Fees & invoices',
    notifications: 'Notifications',
    complaint: 'Complaint / feedback',
    human: 'Talk to staff',
    faq: 'FAQ',
    location: 'Location',
    satisfaction: 'Satisfaction survey',
    emergency: '🚨 Urgent report',
  },
  catTitles: {
    services: '📋 Services & registration',
    reports: '📊 Reports & follow-up',
    finance: '💳 Fees & notifications',
    help: '❓ Info & help',
    feedback: '📝 Complaints & feedback',
    human: '👤 Talk to staff',
    emergency: '🚨 Urgent report',
  },
  // Per-unit intro / closing / step prompts (keyed by the Arabic step `key`).
  units: {
    register: {
      intro: 'Thank you for your interest in registering. I just need some initial details:',
      closing:
        'Your registration request has been sent to the admissions team ✅\nWe will contact you within (1–3) business days to schedule the initial assessment.',
      prompts: {
        guardianName: "Guardian's full name (three parts):",
        beneficiaryName: "Beneficiary's full name (four parts):",
        age: "Beneficiary's age (years and months if possible):",
        gender: 'Gender (male / female):',
        city: 'City:',
        guardianPhone: 'Guardian mobile if different from this WhatsApp number (or type "-" to skip):',
        priorDiagnosis: 'Any prior diagnosis? If yes, briefly state it (or type "no"):',
        hasReports: 'Any previous medical or specialist reports? (yes / no)',
      },
    },
    appointment: {
      intro: 'I will help with the appointment. Please answer the following:',
      closing:
        'Your appointment request has been received ✅\nReception will contact you to confirm a suitable time.',
      prompts: {
        action: 'What would you like to do? (book / change / cancel)',
        beneficiaryName: 'Beneficiary name:',
        department: 'Department: (occupational / speech / special education / behavior / other)',
        preferredDay: 'Preferred day or date (e.g. next Sunday / 2026-06-20):',
        preferredPeriod: 'Preferred time (morning / evening / a specific time if possible):',
      },
    },
    attendance: {
      intro: 'To check attendance:',
      closing:
        'Your attendance request has been received ✅\nReception will share the result during working hours.',
      prompts: {
        beneficiaryName: 'Beneficiary name:',
        date: 'Requested date (or type: today):',
      },
    },
    session_reports: {
      intro: 'To check session reports:',
      closing:
        'Your report request has been received ✅\nThe team will prepare and share it.\n🔒 For privacy, reports are sent to the guardian only.',
      prompts: {
        beneficiaryName: 'Beneficiary name:',
        department: 'Department: (occupational / speech / special education / behavior)',
        period: 'Period: (today / this week / this month / latest report)',
      },
    },
    home_exercises: {
      intro: 'To suggest suitable home exercises:',
      prompts: {
        beneficiaryName: 'Beneficiary name:',
        department: 'Department: (occupational / speech / special education / behavior)',
      },
    },
    billing: {
      intro: 'To check fees and invoices:',
      closing:
        'Your account statement request has been received ✅\nThe finance team will contact you with the details.\n⚠️ Do not share bank card details in chat for your security.',
      prompts: {
        guardianName: 'Guardian name:',
        beneficiaryName: 'Beneficiary name:',
        fileNumber: 'File or ID number if available (or type "-" to skip):',
      },
    },
    complaint: {
      intro:
        'We apologize for any inconvenience, and thank you for your feedback which helps us improve. Please answer:',
      closing:
        'Your complaint has been escalated to the relevant management ✅\nWe will contact you as soon as possible during official working hours.',
      prompts: {
        name: 'Name:',
        contactPhone: 'Contact number:',
        beneficiaryName: 'Beneficiary name (if any, or type "-"):',
        description: 'Briefly describe the issue or feedback:',
        whenAt: 'Approximate time and date of the incident (or type "-"):',
      },
    },
    human: {
      intro: 'I will connect you to a specialist colleague. I need a few details:',
      closing:
        'Your request has been forwarded to a specialist colleague ✅\nWe will contact you as soon as possible during working hours.',
      prompts: {
        name: 'Name:',
        contactPhone: 'Contact number:',
        bestTime: 'Best time to contact you:',
        topic: 'Request topic (registration / report / complaint / inquiry):',
      },
    },
    faq: {
      intro:
        '❓ *Frequently asked questions* — choose a question by typing its number:\n1) Working hours\n2) Fees & subscription\n3) What to bring on the first visit\n4) Accepted ages & categories\n5) Registration steps\n6) Transport service',
      prompts: { faqTopic: 'Type the question number (1-6):' },
    },
    satisfaction: {
      intro: 'We value your feedback to improve our services 🌟',
      closing: 'Thank you for your rating! 🌟 Your feedback helps us provide the best care.',
      prompts: {
        rating: 'Rate our service from 1 (unsatisfied) to 5 (very satisfied):',
        liked: 'What did you like? (or type "-"):',
        improve: 'What would you suggest improving? (or type "-"):',
      },
    },
    emergency: {
      intro:
        '🚨 If this is a medical emergency, call the ambulance (997) immediately or go to the nearest ER.\nTo notify our team urgently, please answer:',
      closing:
        'Our team has been urgently notified and will contact you as soon as possible 🚑\n📞 Medical emergencies: 997.',
      prompts: {
        beneficiaryName: 'Beneficiary name:',
        description: 'Briefly describe the urgent situation:',
      },
    },
  },
  // Static content (short blocks translated; long encyclopedic blocks fall back).
  content: {
    location: [
      '📍 *Al-Awael Day-Care Centers – Riyadh*',
      'Address: [branch address to be added].',
      '🗺️ Google Maps: [location link to be added]',
      '🕐 Working hours: Sun–Thu 7:30 AM – 2:30 PM.',
      '🅿️ Parking available.',
      'For help getting here, contact reception.',
    ].join('\n'),
    notifications: [
      '🔔 *Notifications & alerts*',
      'With your consent, we send alerts about your child, such as:',
      '• Session and assessment reminders',
      '• Attendance / departure notifications',
      '• Event announcements (open day, parents meeting)',
      '• Urgent alerts (closures for emergencies)',
      '',
      'To stop notifications anytime type "stop notifications", or contact reception.',
    ].join('\n'),
  },
});

// ─── Resolver helpers ────────────────────────────────────────────────────────

function normLang(lang) {
  return LANGS.includes(lang) ? lang : DEFAULT_LANG;
}

/** Generic pick: English value when lang=en and present, else the Arabic base. */
function pick(arabicValue, enValue, lang) {
  return normLang(lang) === 'en' && enValue != null && enValue !== '' ? enValue : arabicValue;
}

function unitLabel(unitId, arLabel, lang) {
  return pick(arLabel, EN.labels[unitId], lang);
}
function unitShortLabel(unitId, arShort, lang) {
  return pick(arShort, EN.shortLabels[unitId], lang);
}
function categoryTitle(catId, arTitle, lang) {
  return pick(arTitle, EN.catTitles[catId], lang);
}
function unitIntro(unitId, arIntro, lang) {
  return pick(arIntro, EN.units[unitId] && EN.units[unitId].intro, lang);
}
function unitClosing(unitId, arClosing, lang) {
  return pick(arClosing, EN.units[unitId] && EN.units[unitId].closing, lang);
}
function stepPrompt(unitId, stepKey, arPrompt, lang) {
  const u = EN.units[unitId];
  return pick(arPrompt, u && u.prompts && u.prompts[stepKey], lang);
}
function contentBlock(key, arContent, lang) {
  return pick(arContent, EN.content[key], lang);
}
/** Framework string by key. `args` are passed to function-valued entries. */
function fw(key, lang, ...args) {
  const ar = FW_AR[key];
  const en = EN.framework[key];
  const val = pick(typeof ar === 'function' ? ar : ar, typeof en === 'function' ? en : en, lang);
  return typeof val === 'function' ? val(...args) : val;
}

// Arabic framework strings (single source so fw() can resolve both languages).
const FW_AR = Object.freeze({
  greeting: 'مرحباً بك 👋',
  greetingNamed: name => `مرحباً ${name} 👋`,
  intro: (center, city) =>
    `أنا *مساعد الأوائل الذكي* (بوت افتراضي 🤖) الخاص بـ ${center} – ${city}.`,
  help: 'أسعد بخدمتك في كل ما يتعلق بتأهيل ورعاية أبنائكم وبناتكم ❤️',
  humanHint: 'يمكنك في أي وقت كتابة "موظف" للتحدث مع شخص بشري.',
  choose: 'يرجى اختيار أحد الخيارات بكتابة رقمه:',
  menuHint: 'اكتب "القائمة" في أي وقت للعودة للقائمة الرئيسية.',
  summaryHeader: label => `📋 *ملخص طلبك (${label}):*`,
  confirmQ: 'هل تؤكد إرسال الطلب؟ (نعم / لا)',
  confirmPrompt: 'يرجى الرد بـ (نعم) للتأكيد أو (لا) للإلغاء.',
  cancelled: 'تم إلغاء العملية الحالية.',
  notSent: 'تم إلغاء الطلب ولم يُرسَل.',
  switched: 'تم ضبط اللغة على العربية. 🌐',
});

/**
 * Resolve an explicit language switch from the message. Returns the new lang if
 * the user asked to switch, else the current (sticky) lang. Pure.
 */
function detectLangPreference(text, current = DEFAULT_LANG) {
  const t = String(text == null ? '' : text)
    .toLowerCase()
    .trim();
  if (!t) return normLang(current);
  for (const lang of LANGS) {
    for (const trig of LANG_TRIGGERS[lang]) {
      const nt = trig.toLowerCase();
      // short ascii triggers ('en'/'ar') must match whole message; others substring
      if (nt.length <= 2 ? t === nt : t.includes(nt)) return lang;
    }
  }
  return normLang(current);
}

module.exports = {
  LANGS,
  DEFAULT_LANG,
  LANG_TRIGGERS,
  EN,
  FW_AR,
  normLang,
  pick,
  unitLabel,
  unitShortLabel,
  categoryTitle,
  unitIntro,
  unitClosing,
  stepPrompt,
  contentBlock,
  fw,
  detectLangPreference,
};
