'use strict';

/**
 * licensing.registry.js — W692 measure licensing & digitization governance.
 *
 * The single source of truth for the COPYRIGHT / LICENSING status of every
 * standardized instrument shipped with a digital item bank (a scoring module
 * under measures/scoring/<code>.js).
 *
 * WHY this exists (the legal-risk gap):
 *   Several flagship instruments are commercially copyrighted (CARS-2 by WPS,
 *   Vineland-3 by Pearson, FIM/WeeFIM by UDSMR, SCQ by WPS). Digitizing their
 *   item content for clinical administration WITHOUT a publisher license is a
 *   copyright violation. The codebase already ships an item bank for some of
 *   these for the auto-scoring math — but whether a center MAY render that
 *   questionnaire on screen depends on the license it holds.
 *
 *   This registry makes that decision EXPLICIT and ENFORCEABLE:
 *     • the digital-administration UI calls `assertDigitizable(code, ctx)`
 *       before rendering an instrument's items;
 *     • the W692 drift guard fails CI if a scoring module ships an itemBank
 *       with no licensing record, or if a `proprietary` instrument is marked
 *       digitizable without a recorded permission reference.
 *
 * licenseType:
 *   public_domain        — no copyright restriction (Berg Balance Scale).
 *   free_with_attribution— copyrighted but the author grants free clinical
 *                          use with attribution (M-CHAT-R/F, SDQ, GMFCS/MACS/
 *                          CFCS/EDACS via CanChild).
 *   licensed             — free OR paid clinical use but requires registering
 *                          a license/permission with the publisher (PedsQL).
 *   proprietary          — commercial copyright; digital reproduction of items
 *                          requires a purchased license (CARS-2, Vineland-3,
 *                          FIM, WeeFIM, SCQ).
 *
 * digitizationDefault:
 *   The platform-wide default for whether the items MAY be rendered digitally.
 *   For `licensed`/`proprietary` this is false until a center records a
 *   permissionRef (its own purchased license) via center configuration.
 *
 * NOTE: This registry encodes publicly-documented licensing facts as of the
 * ship date. It is NOT legal advice. Each center must confirm its own license
 * standing with the publisher before enabling a restricted instrument.
 */

const LICENSE_TYPES = Object.freeze({
  PUBLIC_DOMAIN: 'public_domain',
  FREE_WITH_ATTRIBUTION: 'free_with_attribution',
  LICENSED: 'licensed',
  PROPRIETARY: 'proprietary',
});

const VALID_LICENSE_TYPES = new Set(Object.values(LICENSE_TYPES));

/**
 * @typedef {Object} LicensingRecord
 * @property {string}  code                measureCode (matches scoring module)
 * @property {string}  owner               copyright holder / publisher
 * @property {string}  licenseType         one of LICENSE_TYPES
 * @property {boolean} digitizationDefault platform default for rendering items
 * @property {boolean} requiresAttribution must display the citation/author
 * @property {string=} sourceUrl           where the license terms live
 * @property {string}  notes_ar            Arabic governance note for admins
 */

/** @type {Record<string, LicensingRecord>} */
const LICENSING = Object.freeze({
  // ── Public domain — render freely ────────────────────────────────────
  BERG: {
    code: 'BERG',
    owner: 'Berg, Wood-Dauphinee & Williams (1989)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar: 'مقياس بيرغ للتوازن متاح للاستخدام السريري الحر دون قيود حقوق نشر.',
  },
  'PHQ-9': {
    code: 'PHQ-9',
    owner: 'Kroenke, Spitzer & Williams (2001) — developed with a Pfizer grant',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    sourceUrl: 'https://www.phqscreeners.com',
    notes_ar:
      'استبيان PHQ-9 لفرز الاكتئاب متاح للاستنساخ والاستخدام السريري دون إذن أو رسوم. البند التاسع (أفكار إيذاء النفس) بند سلامة حرج.',
  },
  'GAD-7': {
    code: 'GAD-7',
    owner: 'Spitzer, Kroenke, Williams & Löwe (2006) — developed with a Pfizer grant',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    sourceUrl: 'https://www.phqscreeners.com',
    notes_ar: 'مقياس GAD-7 لفرز القلق العام متاح للاستنساخ والاستخدام السريري دون إذن أو رسوم.',
  },
  'WHO-5': {
    code: 'WHO-5',
    owner: 'World Health Organization (1998)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: true,
    sourceUrl: 'https://www.psykiatri-regionh.dk/who-5',
    notes_ar:
      'مؤشر WHO-5 للرفاهية متاح للاستخدام الحر دون إذن بشرط عدم التعديل وذكر منظمة الصحة العالمية كمصدر.',
  },
  FLACC: {
    code: 'FLACC',
    owner: 'Merkel, Voepel-Lewis, Shayevitz & Malviya (1997) — University of Michigan',
    licenseType: LICENSE_TYPES.FREE_WITH_ATTRIBUTION,
    digitizationDefault: true,
    requiresAttribution: true,
    notes_ar:
      'مقياس FLACC السلوكي للألم متاح للاستخدام السريري مع ذكر المؤلفين كمصدر؛ مناسب للأشخاص غير القادرين على التعبير اللفظي.',
  },
  BARTHEL: {
    code: 'BARTHEL',
    owner: 'Mahoney & Barthel (1965)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar:
      'مؤشّر بارثل لأنشطة الحياة اليومية في الملكية العامة ومتاح للاستخدام السريري الحر دون إذن أو رسوم.',
  },
  MAS: {
    code: 'MAS',
    owner: 'Bohannon & Smith (1987)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar:
      'مقياس آشورث المعدّل لتقييم التشنّج العضلي متاح للاستخدام السريري الحر دون قيود حقوق نشر.',
  },
  MRS: {
    code: 'MRS',
    owner: 'van Swieten et al. (1988)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar:
      'مقياس رانكين المعدّل لدرجة الإعاقة الإجمالية في الملكية العامة ومتاح للاستخدام السريري الحر دون إذن أو رسوم.',
  },
  GCS: {
    code: 'GCS',
    owner: 'Teasdale & Jennett (1974)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar:
      'مقياس غلاسكو للغيبوبة لتقييم مستوى الوعي في الملكية العامة ومتاح للاستخدام السريري الحر دون قيود.',
  },
  CSI: {
    code: 'CSI',
    owner: 'Robinson (1983)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar:
      'مؤشّر إجهاد مقدّم الرعاية في الملكية العامة ومتاح للاستخدام السريري والبحثي الحر دون إذن أو رسوم.',
  },
  TUG: {
    code: 'TUG',
    owner: 'Podsiadlo & Richardson (1991)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar:
      'اختبار النهوض والمشي الموقوت لتقييم الحركة وخطر السقوط في الملكية العامة ومتاح للاستخدام السريري الحر.',
  },
  TINETTI: {
    code: 'TINETTI',
    owner: 'Tinetti (1986)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar:
      'تقييم تينيتي للتوازن والمشية لتقدير خطر السقوط في الملكية العامة ومتاح للاستخدام السريري الحر دون قيود.',
  },
  MINICOG: {
    code: 'MINICOG',
    owner: 'Borson et al. (2000)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar:
      'فحص ميني-كوغ المعرفي في الملكية العامة ومتاح للاستخدام السريري والتعليمي الحر دون إذن أو رسوم.',
  },
  KATZ: {
    code: 'KATZ',
    owner: 'Katz et al. (1963)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar:
      'مؤشّر كاتز للاستقلالية في الأنشطة اليومية الأساسية في الملكية العامة ومتاح للاستخدام السريري الحر.',
  },
  LAWTON: {
    code: 'LAWTON',
    owner: 'Lawton & Brody (1969)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar:
      'مقياس لوتون للأنشطة اليومية الأداتية في الملكية العامة ومتاح للاستخدام السريري الحر دون قيود.',
  },
  NRS: {
    code: 'NRS',
    owner: 'Numeric Pain Rating Scale (public domain)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar:
      'مقياس الألم الرقمي (0–10) أداة عامة في الملكية العامة ومتاحة للاستخدام السريري الحر دون إذن أو رسوم.',
  },
  FTS5: {
    code: 'FTS5',
    owner: 'Five Times Sit-to-Stand Test (public domain)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar:
      'اختبار الوقوف من الجلوس خمس مرات أداة قياس وظيفي في الملكية العامة ومتاحة للاستخدام السريري الحر دون إذن أو رسوم.',
  },
  MORSE: {
    code: 'MORSE',
    owner: 'Morse, Morse & Tylko (1989)',
    licenseType: LICENSE_TYPES.PUBLIC_DOMAIN,
    digitizationDefault: true,
    requiresAttribution: false,
    notes_ar:
      'مقياس مورس لخطر السقوط في الملكية العامة ومتاح للاستخدام السريري الحر؛ يُنصح بالمعايرة المؤسسية لنقاط القطع.',
  },

  // ── Free with attribution — render freely, must credit the author ─────
  'WHODAS-12': {
    code: 'WHODAS-12',
    owner: 'World Health Organization (2010)',
    licenseType: LICENSE_TYPES.FREE_WITH_ATTRIBUTION,
    digitizationDefault: true,
    requiresAttribution: true,
    sourceUrl:
      'https://www.who.int/standards/classifications/international-classification-of-functioning-disability-and-health/who-disability-assessment-schedule',
    notes_ar:
      'جدول WHODAS 2.0 لتقييم الإعاقة (12 بندًا) © منظمة الصحة العالمية، متاح مجانًا للاستخدام السريري والبحثي غير الربحي بشرط عدم التعديل وذكر المنظمة كمصدر.',
  },

  // ── Licensed / proprietary — SCORE-ENTRY ONLY (no item digitization) ──
  // These instruments are commercial copyright. The platform ships NO test
  // items and NO raw→scaled conversion tables for them — only a score-entry
  // module that stores the examiner's final standard scores. digitization is
  // false: the publisher's items must never be rendered on screen without a
  // separate digital-licensing agreement (a paper-administration licence does
  // not cover digital reproduction).
  SB5: {
    code: 'SB5',
    owner: 'Riverside Insights (Roid, 2003)',
    licenseType: LICENSE_TYPES.PROPRIETARY,
    digitizationDefault: false,
    requiresAttribution: true,
    sourceUrl: 'https://www.riversideinsights.com',
    notes_ar:
      'مقياس ستانفورد-بينيه للذكاء (الإصدار الخامس) © Riverside Insights — أداة تجارية محمية. لا يُرقمن النظام أي بنود أو جداول تحويل؛ يُدخل الأخصائي المعتمد الدرجات المعيارية النهائية فقط على أن يملك المركز ترخيص التطبيق الرسمي.',
  },
  WECHSLER: {
    code: 'WECHSLER',
    owner: 'Pearson / NCS (Wechsler scales: WPPSI-IV, WISC-V, WAIS-IV)',
    licenseType: LICENSE_TYPES.PROPRIETARY,
    digitizationDefault: false,
    requiresAttribution: true,
    sourceUrl: 'https://www.pearsonassessments.com',
    notes_ar:
      'مقاييس وكسلر للذكاء © Pearson — أداة تجارية محمية. لا يُرقمن النظام أي اختبارات فرعية أو جداول تحويل؛ يُدخل الأخصائي المعتمد الدرجات المعيارية النهائية فقط (الذكاء الكلي والمؤشرات) على أن يملك المركز ترخيص التطبيق الرسمي.',
  },

  'PSS-10': {
    code: 'PSS-10',
    owner: 'Cohen, Kamarck & Mermelstein (1983)',
    licenseType: LICENSE_TYPES.FREE_WITH_ATTRIBUTION,
    digitizationDefault: true,
    requiresAttribution: true,
    notes_ar:
      'مقياس الضغط النفسي المُدرَك متاح مجانًا للاستخدام غير الربحي الأكاديمي والسريري بشرط ذكر المصدر؛ يُمنع البيع.',
  },
  'M-CHAT-R': {
    code: 'M-CHAT-R',
    owner: 'Robins, Fein & Barton (2009)',
    licenseType: LICENSE_TYPES.FREE_WITH_ATTRIBUTION,
    digitizationDefault: true,
    requiresAttribution: true,
    sourceUrl: 'https://mchatscreen.com',
    notes_ar:
      'متاح مجانًا للاستخدام السريري والبحثي بشرط عدم التعديل على البنود وذكر المصدر؛ يُمنع البيع.',
  },
  SDQ: {
    code: 'SDQ',
    owner: 'Robert Goodman / Youthinmind',
    licenseType: LICENSE_TYPES.FREE_WITH_ATTRIBUTION,
    digitizationDefault: true,
    requiresAttribution: true,
    sourceUrl: 'https://www.sdqinfo.org',
    notes_ar:
      'استبيان نقاط القوة والصعوبات متاح مجانًا للاستخدام غير التجاري مع ذكر المصدر؛ الاستخدام التجاري يتطلب ترخيصًا.',
  },
  GMFCS: {
    code: 'GMFCS',
    owner: 'Palisano et al. / CanChild',
    licenseType: LICENSE_TYPES.FREE_WITH_ATTRIBUTION,
    digitizationDefault: true,
    requiresAttribution: true,
    sourceUrl: 'https://canchild.ca',
    notes_ar: 'تصنيف الوظيفة الحركية متاح للاستخدام السريري الحر مع ذكر CanChild كمصدر.',
  },
  MACS: {
    code: 'MACS',
    owner: 'Eliasson et al. / CanChild',
    licenseType: LICENSE_TYPES.FREE_WITH_ATTRIBUTION,
    digitizationDefault: true,
    requiresAttribution: true,
    sourceUrl: 'https://www.macs.nu',
    notes_ar: 'تصنيف القدرة اليدوية متاح للاستخدام السريري الحر مع ذكر المصدر.',
  },
  CFCS: {
    code: 'CFCS',
    owner: 'Hidecker et al. / CanChild',
    licenseType: LICENSE_TYPES.FREE_WITH_ATTRIBUTION,
    digitizationDefault: true,
    requiresAttribution: true,
    sourceUrl: 'https://cfcs.us',
    notes_ar: 'تصنيف وظيفة التواصل متاح للاستخدام السريري الحر مع ذكر المصدر.',
  },
  EDACS: {
    code: 'EDACS',
    owner: 'Sellers, Mandy, Pennington et al.',
    licenseType: LICENSE_TYPES.FREE_WITH_ATTRIBUTION,
    digitizationDefault: true,
    requiresAttribution: true,
    sourceUrl: 'https://www.edacs.org',
    notes_ar: 'تصنيف القدرة على الأكل والشرب متاح للاستخدام السريري غير التجاري مع ذكر المصدر.',
  },

  // ── Licensed — register a permission with the publisher ───────────────
  PEDSQL: {
    code: 'PEDSQL',
    owner: 'James W. Varni / Mapi Research Trust',
    licenseType: LICENSE_TYPES.LICENSED,
    digitizationDefault: false,
    requiresAttribution: true,
    sourceUrl: 'https://eprovide.mapi-trust.org',
    notes_ar:
      'PedsQL مجاني للأبحاث غير المموّلة لكنه يتطلب ترخيصًا للاستخدام السريري/التجاري؛ فعّل الإدارة الرقمية بعد تسجيل الترخيص عبر Mapi Trust.',
  },

  // ── Proprietary — purchased commercial license required ───────────────
  'CARS-2': {
    code: 'CARS-2',
    owner: 'Schopler et al. / Western Psychological Services (WPS)',
    licenseType: LICENSE_TYPES.PROPRIETARY,
    digitizationDefault: false,
    requiresAttribution: true,
    sourceUrl: 'https://www.wpspublish.com',
    notes_ar:
      'CARS-2 محمي بحقوق نشر WPS؛ يُمنع عرض بنوده رقميًا دون ترخيص مشترى من الناشر. سجّل مرجع الترخيص لتفعيل الإدارة الرقمية.',
  },
  'VINELAND-3': {
    code: 'VINELAND-3',
    owner: 'Sparrow, Cicchetti & Saulnier / Pearson',
    licenseType: LICENSE_TYPES.PROPRIETARY,
    digitizationDefault: false,
    requiresAttribution: true,
    sourceUrl: 'https://www.pearsonassessments.com',
    notes_ar:
      'Vineland-3 محمي بحقوق نشر Pearson؛ يتطلب ترخيصًا تجاريًا لعرض بنوده رقميًا. سجّل مرجع الترخيص أولًا.',
  },
  SCQ: {
    code: 'SCQ',
    owner: 'Rutter, Bailey & Lord / Western Psychological Services (WPS)',
    licenseType: LICENSE_TYPES.PROPRIETARY,
    digitizationDefault: false,
    requiresAttribution: true,
    sourceUrl: 'https://www.wpspublish.com',
    notes_ar:
      'استبيان التواصل الاجتماعي SCQ محمي بحقوق نشر WPS؛ يتطلب ترخيصًا مشترى لعرض بنوده رقميًا.',
  },
  FIM: {
    code: 'FIM',
    owner: 'Uniform Data System for Medical Rehabilitation (UDSMR)',
    licenseType: LICENSE_TYPES.PROPRIETARY,
    digitizationDefault: false,
    requiresAttribution: true,
    sourceUrl: 'https://www.udsmr.org',
    notes_ar:
      'مقياس FIM™ علامة مسجّلة لـ UDSMR ويتطلب اشتراكًا/ترخيصًا للاستخدام الرقمي. سجّل مرجع الترخيص لتفعيله.',
  },
  WEEFIM: {
    code: 'WEEFIM',
    owner: 'Uniform Data System for Medical Rehabilitation (UDSMR)',
    licenseType: LICENSE_TYPES.PROPRIETARY,
    digitizationDefault: false,
    requiresAttribution: true,
    sourceUrl: 'https://www.udsmr.org',
    notes_ar:
      'مقياس WeeFIM® علامة مسجّلة لـ UDSMR ويتطلب ترخيصًا للاستخدام الرقمي. سجّل مرجع الترخيص لتفعيله.',
  },
});

/**
 * Look up the licensing record for a measure code. Returns null when none
 * is registered (the drift guard turns that into a CI failure for any
 * scoring module that ships an itemBank).
 *
 * @param {string} code
 * @returns {LicensingRecord|null}
 */
function getLicensing(code) {
  if (!code || typeof code !== 'string') return null;
  return LICENSING[code] || null;
}

/**
 * Decide whether an instrument's items MAY be rendered digitally for a given
 * center context. A center can override the platform default by recording a
 * `permissionRef` (its own purchased license / publisher permission).
 *
 * @param {string} code
 * @param {Object} [ctx]
 * @param {string} [ctx.permissionRef]  center-recorded license/permission id
 * @returns {{ allowed: boolean, reason: string, licenseType: string|null,
 *            requiresAttribution: boolean, record: LicensingRecord|null }}
 */
function evaluateDigitization(code, ctx = {}) {
  const record = getLicensing(code);
  if (!record) {
    return {
      allowed: false,
      reason: 'NO_LICENSING_RECORD',
      licenseType: null,
      requiresAttribution: false,
      record: null,
    };
  }
  const hasPermission = Boolean(ctx.permissionRef);
  // Public / free instruments are allowed by default. Restricted instruments
  // need an explicit center permission to flip the default false → true.
  const allowed = record.digitizationDefault || hasPermission;
  let reason;
  if (allowed) {
    reason = record.digitizationDefault ? 'DEFAULT_PERMITTED' : 'PERMISSION_ON_FILE';
  } else {
    reason =
      record.licenseType === LICENSE_TYPES.PROPRIETARY
        ? 'PROPRIETARY_LICENSE_REQUIRED'
        : 'PUBLISHER_PERMISSION_REQUIRED';
  }
  return {
    allowed,
    reason,
    licenseType: record.licenseType,
    requiresAttribution: record.requiresAttribution,
    record,
  };
}

/**
 * Throw unless the instrument may be rendered digitally. Used by the
 * administration UI/service immediately before serving an item bank.
 *
 * @param {string} code
 * @param {Object} [ctx] same as evaluateDigitization
 * @returns {{ allowed: true } & ReturnType<typeof evaluateDigitization>}
 */
function assertDigitizable(code, ctx = {}) {
  const result = evaluateDigitization(code, ctx);
  if (!result.allowed) {
    const note = result.record ? ` — ${result.record.notes_ar}` : '';
    const err = new Error(`Digital administration blocked for '${code}': ${result.reason}${note}`);
    err.code = 'MEASURE_DIGITIZATION_BLOCKED';
    err.reason = result.reason;
    err.licenseType = result.licenseType;
    throw err;
  }
  return /** @type {any} */ (result);
}

/** Every measure code that carries a licensing record. */
function listCodes() {
  return Object.keys(LICENSING);
}

module.exports = {
  LICENSE_TYPES,
  VALID_LICENSE_TYPES,
  LICENSING,
  getLicensing,
  evaluateDigitization,
  assertDigitizable,
  listCodes,
};
