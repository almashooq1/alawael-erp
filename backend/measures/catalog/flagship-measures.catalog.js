'use strict';

/**
 * flagship-measures.catalog.js — W556
 *
 * Catalog definitions for the standardized instruments that ship with a
 * digital item bank + wired scoring module. Each entry is a full `Measure`
 * (measures_library) document shape. The seed script
 * (scripts/seed-measures-catalog.js) upserts these by `code` and
 * cross-checks each against the scoring registry:
 *
 *   • code               must resolve in backend/measures/scoring
 *   • scoringEngineVersion must equal the module's engineVersion
 *   • scoringDirection   must equal the module's direction
 *   • derivedRange       must equal the module's scoreRange
 *
 * This guarantees the catalog never drifts from the scorer. Item TEXT
 * lives in the scoring module (single source of truth); this catalog
 * carries only the governance + interpretation-band metadata that the
 * Measure model + reports need.
 *
 * Adding a new flagship instrument:
 *   1. ship its scoring module under measures/scoring/<code>.js with an
 *      itemBank (W553 contract);
 *   2. add a catalog entry here;
 *   3. `npm run seed:measures` (idempotent).
 */

const MEASURES = [
  // ── M-CHAT-R/F — autism screening (16–30 months) ──────────────────────
  {
    code: 'M-CHAT-R',
    name: 'Modified Checklist for Autism in Toddlers, Revised with Follow-Up',
    name_ar: 'قائمة الفحص المعدّلة للتوحّد لدى الأطفال الصغار — مع المتابعة',
    abbreviation: 'M-CHAT-R/F',
    version: '1.0.0',
    description: '20-item caregiver-completed autism screening for toddlers aged 16–30 months.',
    description_ar: 'فحص للتوحّد من 20 بندًا يُكمله مقدّم الرعاية للأطفال من 16 إلى 30 شهرًا.',
    category: 'screening',
    type: 'checklist',
    targetPopulation: ['children', 'autism'],
    ageRange: { min: 16, max: 30, unit: 'months' },

    scoringType: 'numeric',
    minScore: 0,
    maxScore: 20,
    scoringDirection: 'lower_better',
    scoringRules: [
      {
        rangeLabel: 'Low risk',
        rangeLabel_ar: 'خطر منخفض',
        minScore: 0,
        maxScore: 2,
        severity: 'normal',
        color: '#2e7d32',
        interpretation: 'No further action unless routine surveillance flags concern.',
        interpretation_ar: 'لا حاجة لإجراء إضافي ما لم تظهر مؤشرات في المتابعة الروتينية.',
      },
      {
        rangeLabel: 'Medium risk',
        rangeLabel_ar: 'خطر متوسط',
        minScore: 3,
        maxScore: 7,
        severity: 'moderate',
        color: '#ef6c00',
        interpretation: 'Administer the Follow-Up; refer if it stays ≥2.',
        interpretation_ar: 'إجراء مقابلة المتابعة؛ التحويل إذا بقيت الدرجة ≥ 2.',
      },
      {
        rangeLabel: 'High risk',
        rangeLabel_ar: 'خطر مرتفع',
        minScore: 8,
        maxScore: 20,
        severity: 'severe',
        color: '#b71c1c',
        interpretation: 'Refer immediately for diagnostic evaluation + early intervention.',
        interpretation_ar: 'تحويل فوري لتقييم تشخيصي وتدخّل مبكّر.',
      },
    ],

    purpose: 'screening',
    rawShape: 'items_array',
    derivedType: 'sum',
    derivedRange: { min: 0, max: 20 },
    interpretationStyle: 'cutoff',
    scoringAlgorithmRef: 'scoring/mchat-r.js',
    scoringEngineVersion: '1.0.0',

    interpretation: { mcid: { status: 'not_applicable' } },
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },

    administrationTime: 10,
    administeredBy: ['parent_caregiver', 'any_trained'],
    trainingRequired: false,
    publisher: 'Robins, Fein & Barton (2009)',
    citation: 'Robins DL, Casagrande K, Barton M, et al. Pediatrics. 2014;133(1):37-45.',
    evidenceLevel: 'level_1',

    eligibility: { languages: ['ar', 'en'], culturalAdaptation: 'done' },
    reporting: {
      showInFamilyReport: true,
      familyFriendlyLabel: 'Autism screening',
      familyFriendlyLabel_ar: 'فحص مؤشرات التوحّد',
    },
    engine: { feedsSmartEngine: true },
    sensitivityLevel: 'HIGH',
    status: 'active',
    tags: ['autism', 'screening', 'digital-administration'],
  },

  // ── CARS-2 (Standard Version) — autism severity ───────────────────────
  {
    code: 'CARS-2',
    name: 'Childhood Autism Rating Scale, 2nd Edition — Standard Version',
    name_ar: 'مقياس تقدير التوحّد الطفولي — الإصدار الثاني (النسخة القياسية)',
    abbreviation: 'CARS2-ST',
    version: '1.0.0',
    description: '15-item clinician-rated autism symptom-severity scale (total 15–60).',
    description_ar: 'مقياس شدّة أعراض التوحّد من 15 بندًا يقدّره الأخصائي (المجموع 15–60).',
    category: 'diagnostic',
    type: 'rating_scale',
    targetPopulation: ['children', 'autism'],
    ageRange: { min: 2, max: 12, unit: 'years' },

    scoringType: 'numeric',
    minScore: 15,
    maxScore: 60,
    scoringDirection: 'lower_better',
    scoringRules: [
      {
        rangeLabel: 'Minimal-to-no symptoms',
        rangeLabel_ar: 'أعراض قليلة إلى منعدمة',
        minScore: 15,
        maxScore: 29.5,
        severity: 'normal',
        color: '#2e7d32',
      },
      {
        rangeLabel: 'Mild-to-moderate symptoms',
        rangeLabel_ar: 'أعراض خفيفة إلى متوسطة',
        minScore: 30,
        maxScore: 36.5,
        severity: 'moderate',
        color: '#ef6c00',
      },
      {
        rangeLabel: 'Severe symptoms',
        rangeLabel_ar: 'أعراض شديدة',
        minScore: 37,
        maxScore: 60,
        severity: 'severe',
        color: '#b71c1c',
      },
    ],

    purpose: 'diagnostic',
    rawShape: 'items_array',
    derivedType: 'sum',
    derivedRange: { min: 15, max: 60 },
    interpretationStyle: 'tier',
    scoringAlgorithmRef: 'scoring/cars2.js',
    scoringEngineVersion: '1.0.0',

    interpretation: { mcid: { status: 'literature_pending' } },
    reassessment: { standardIntervalDays: 180, minIntervalDays: 60 },

    administrationTime: 30,
    administeredBy: ['psychologist', 'special_educator', 'any_trained'],
    trainingRequired: true,
    publisher: 'Schopler, Van Bourgondien, Wellman & Love (2010), WPS',
    citation: 'Schopler E, et al. Childhood Autism Rating Scale, 2nd ed. WPS; 2010.',
    evidenceLevel: 'level_1',

    eligibility: { languages: ['ar', 'en'], culturalAdaptation: 'required' },
    reporting: {
      showInFamilyReport: true,
      familyFriendlyLabel: 'Autism symptom severity',
      familyFriendlyLabel_ar: 'تقدير شدّة أعراض التوحّد',
    },
    engine: { feedsSmartEngine: true },
    sensitivityLevel: 'HIGH',
    status: 'active',
    tags: ['autism', 'severity', 'digital-administration'],
  },

  // ── PedsQL 4.0 Generic Core — health-related quality of life ──────────
  {
    code: 'PEDSQL',
    name: 'Pediatric Quality of Life Inventory 4.0 — Generic Core Scales',
    name_ar: 'مقياس جودة الحياة لدى الأطفال — النسخة العامة 4.0',
    abbreviation: 'PedsQL 4.0',
    version: '1.0.0',
    description: '23-item HRQOL inventory (Physical, Emotional, Social, School) scored 0–100.',
    description_ar: 'مقياس جودة الحياة من 23 بندًا (جسدي، انفعالي، اجتماعي، مدرسي) يُسجّل 0–100.',
    category: 'quality_of_life',
    type: 'rating_scale',
    targetPopulation: ['children', 'adolescents', 'all'],
    ageRange: { min: 2, max: 18, unit: 'years' },

    scoringType: 'numeric',
    minScore: 0,
    maxScore: 100,
    scoringDirection: 'higher_better',
    scoringRules: [
      {
        rangeLabel: 'Good',
        rangeLabel_ar: 'جودة حياة جيدة',
        minScore: 81,
        maxScore: 100,
        severity: 'normal',
        color: '#2e7d32',
      },
      {
        rangeLabel: 'Borderline',
        rangeLabel_ar: 'حدّية',
        minScore: 70,
        maxScore: 80.9,
        severity: 'mild',
        color: '#ef6c00',
      },
      {
        rangeLabel: 'Impaired',
        rangeLabel_ar: 'متأثّرة',
        minScore: 0,
        maxScore: 69.9,
        severity: 'moderate',
        color: '#b71c1c',
      },
    ],

    domains: [
      { key: 'physical', name: 'Physical Functioning', name_ar: 'الأداء الجسدي', maxScore: 100 },
      {
        key: 'emotional',
        name: 'Emotional Functioning',
        name_ar: 'الأداء الانفعالي',
        maxScore: 100,
      },
      { key: 'social', name: 'Social Functioning', name_ar: 'الأداء الاجتماعي', maxScore: 100 },
      { key: 'school', name: 'School Functioning', name_ar: 'الأداء المدرسي', maxScore: 100 },
    ],

    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'weighted_sum',
    derivedRange: { min: 0, max: 100 },
    interpretationStyle: 'band',
    scoringAlgorithmRef: 'scoring/pedsql.js',
    scoringEngineVersion: '1.0.0',

    interpretation: {
      mcid: {
        value: 4.4,
        type: 'absolute',
        status: 'provisional',
        source: 'Varni JW, Burwinkle TM, Seid M, Skarr D. Ambul Pediatr. 2003;3(6):329-341.',
      },
    },
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },

    administrationTime: 5,
    administeredBy: ['parent_caregiver', 'any_trained'],
    trainingRequired: false,
    publisher: 'Varni, Seid & Kurtin (2001)',
    citation: 'Varni JW, Seid M, Kurtin PS. Med Care. 2001;39(8):800-812.',
    evidenceLevel: 'level_1',

    eligibility: { languages: ['ar', 'en'], culturalAdaptation: 'done' },
    reporting: {
      showInFamilyReport: true,
      familyFriendlyLabel: 'Quality of life',
      familyFriendlyLabel_ar: 'جودة الحياة',
    },
    engine: { feedsSmartEngine: true },
    sensitivityLevel: 'MEDIUM',
    status: 'active',
    tags: ['quality-of-life', 'outcome', 'digital-administration'],
  },

  // ── SDQ — Strengths & Difficulties Questionnaire (parent report) ───────
  {
    code: 'SDQ',
    name: 'Strengths and Difficulties Questionnaire — Parent report',
    name_ar: 'استبيان نقاط القوة والصعوبات — تقرير مقدّم الرعاية',
    abbreviation: 'SDQ-P',
    version: '1.0.0',
    description:
      '25-item caregiver-completed behavioural screen across 5 subscales; Total Difficulties 0–40.',
    description_ar:
      'فحص سلوكي من 25 بندًا يُكمله مقدّم الرعاية عبر 5 مقاييس فرعية؛ مجموع الصعوبات 0–40.',
    category: 'screening',
    type: 'rating_scale',
    targetPopulation: ['children', 'adolescents', 'all'],
    ageRange: { min: 4, max: 17, unit: 'years' },

    scoringType: 'numeric',
    minScore: 0,
    maxScore: 40,
    scoringDirection: 'lower_better',
    scoringRules: [
      {
        rangeLabel: 'Close to average',
        rangeLabel_ar: 'ضمن المعدّل الطبيعي',
        minScore: 0,
        maxScore: 13,
        severity: 'normal',
        color: '#2e7d32',
        interpretation: 'No further action unless other concerns arise.',
        interpretation_ar: 'لا حاجة لإجراء إضافي ما لم تظهر مؤشرات أخرى.',
      },
      {
        rangeLabel: 'Slightly raised',
        rangeLabel_ar: 'مرتفع قليلًا',
        minScore: 14,
        maxScore: 16,
        severity: 'moderate',
        color: '#ef6c00',
        interpretation: 'Review elevated subscales; adjust goals and reassess.',
        interpretation_ar: 'مراجعة النطاقات الأعلى وتعديل الأهداف وإعادة التقييم.',
      },
      {
        rangeLabel: 'High / very high',
        rangeLabel_ar: 'مرتفع',
        minScore: 17,
        maxScore: 40,
        severity: 'severe',
        color: '#b71c1c',
        interpretation: 'Refer for specialist behavioural evaluation.',
        interpretation_ar: 'تحويل لتقييم سلوكي متخصّص.',
      },
    ],

    domains: [
      { key: 'emotional', name: 'Emotional Symptoms', name_ar: 'الأعراض الانفعالية', maxScore: 10 },
      { key: 'conduct', name: 'Conduct Problems', name_ar: 'مشكلات السلوك', maxScore: 10 },
      {
        key: 'hyperactivity',
        name: 'Hyperactivity/Inattention',
        name_ar: 'فرط الحركة/تشتّت الانتباه',
        maxScore: 10,
      },
      {
        key: 'peer',
        name: 'Peer Relationship Problems',
        name_ar: 'مشكلات العلاقة بالأقران',
        maxScore: 10,
      },
      {
        key: 'prosocial',
        name: 'Prosocial Behaviour',
        name_ar: 'السلوك الاجتماعي الإيجابي',
        maxScore: 10,
      },
    ],

    purpose: 'screening',
    rawShape: 'items_array',
    derivedType: 'sum',
    derivedRange: { min: 0, max: 40 },
    interpretationStyle: 'cutoff',
    scoringAlgorithmRef: 'scoring/sdq.js',
    scoringEngineVersion: '1.0.0',

    interpretation: { mcid: { status: 'not_applicable' } },
    reassessment: { standardIntervalDays: 180, minIntervalDays: 90 },

    administrationTime: 8,
    administeredBy: ['parent_caregiver', 'any_trained'],
    trainingRequired: false,
    publisher: 'Goodman R. (1997), youthinmind',
    citation: 'Goodman R. J Child Psychol Psychiatry. 1997;38(5):581-586.',
    evidenceLevel: 'level_1',

    eligibility: { languages: ['ar', 'en'], culturalAdaptation: 'done' },
    reporting: {
      showInFamilyReport: true,
      familyFriendlyLabel: 'Behavioural & emotional screen',
      familyFriendlyLabel_ar: 'فحص السلوك والمشاعر',
    },
    engine: { feedsSmartEngine: true },
    sensitivityLevel: 'HIGH',
    status: 'active',
    tags: ['behavioural', 'screening', 'digital-administration'],
  },

  // ── GMFCS-E&R — gross motor function classification (CP) ───────────────
  {
    code: 'GMFCS',
    name: 'Gross Motor Function Classification System — Expanded & Revised',
    name_ar: 'نظام تصنيف الوظيفة الحركية الكبرى — الموسّع والمنقّح',
    abbreviation: 'GMFCS-E&R',
    version: '1.0.0',
    description: '5-level ordinal classification of self-initiated gross-motor function in CP.',
    description_ar: 'تصنيف ترتيبي من 5 مستويات للوظيفة الحركية الكبرى الذاتية في الشلل الدماغي.',
    category: 'motor',
    type: 'rating_scale',
    targetPopulation: ['children', 'cerebral_palsy'],
    ageRange: { min: 2, max: 18, unit: 'years' },

    scoringType: 'numeric',
    minScore: 1,
    maxScore: 5,
    scoringDirection: 'lower_better',
    scoringRules: [
      {
        rangeLabel: 'Level I',
        rangeLabel_ar: 'المستوى I — يمشي دون قيود',
        minScore: 1,
        maxScore: 1,
        severity: 'normal',
        color: '#1b5e20',
      },
      {
        rangeLabel: 'Level II',
        rangeLabel_ar: 'المستوى II — يمشي مع قيود',
        minScore: 2,
        maxScore: 2,
        severity: 'mild',
        color: '#558b2f',
      },
      {
        rangeLabel: 'Level III',
        rangeLabel_ar: 'المستوى III — وسيلة تنقّل محمولة باليد',
        minScore: 3,
        maxScore: 3,
        severity: 'moderate',
        color: '#ef6c00',
      },
      {
        rangeLabel: 'Level IV',
        rangeLabel_ar: 'المستوى IV — تنقّل ذاتي محدود',
        minScore: 4,
        maxScore: 4,
        severity: 'severe',
        color: '#c62828',
      },
      {
        rangeLabel: 'Level V',
        rangeLabel_ar: 'المستوى V — يُنقَل في كرسي متحرّك',
        minScore: 5,
        maxScore: 5,
        severity: 'critical',
        color: '#b71c1c',
      },
    ],

    purpose: 'descriptor',
    rawShape: 'items_array',
    derivedType: 'lookup_table',
    derivedRange: { min: 1, max: 5 },
    interpretationStyle: 'tier',
    scoringAlgorithmRef: 'scoring/gmfcs.js',
    scoringEngineVersion: '1.0.0',

    interpretation: { mcid: { status: 'not_applicable' } },
    reassessment: { standardIntervalDays: 365, minIntervalDays: 180 },

    administrationTime: 5,
    administeredBy: ['physical_therapist', 'physician', 'any_trained'],
    trainingRequired: false,
    publisher: 'Palisano et al. (1997, rev. 2007), CanChild',
    citation: 'Palisano RJ, et al. Dev Med Child Neurol. 1997;39(4):214-223.',
    evidenceLevel: 'level_1',

    eligibility: { languages: ['ar', 'en'], culturalAdaptation: 'not_required' },
    reporting: {
      showInFamilyReport: true,
      familyFriendlyLabel: 'Gross motor level',
      familyFriendlyLabel_ar: 'مستوى الحركة الكبرى',
    },
    engine: { feedsSmartEngine: true },
    sensitivityLevel: 'MEDIUM',
    status: 'active',
    tags: ['cerebral-palsy', 'motor', 'classification', 'digital-administration'],
  },

  // ── MACS — manual ability classification (CP) ─────────────────────────
  {
    code: 'MACS',
    name: 'Manual Ability Classification System',
    name_ar: 'نظام تصنيف القدرة اليدوية',
    abbreviation: 'MACS',
    version: '1.0.0',
    description: '5-level ordinal classification of how children with CP handle objects daily.',
    description_ar: 'تصنيف ترتيبي من 5 مستويات لكيفية تعامل أطفال الشلل الدماغي مع الأشياء يوميًا.',
    category: 'motor',
    type: 'rating_scale',
    targetPopulation: ['children', 'cerebral_palsy'],
    ageRange: { min: 4, max: 18, unit: 'years' },

    scoringType: 'numeric',
    minScore: 1,
    maxScore: 5,
    scoringDirection: 'lower_better',
    scoringRules: [
      {
        rangeLabel: 'Level I',
        rangeLabel_ar: 'المستوى I — يتعامل بسهولة ونجاح',
        minScore: 1,
        maxScore: 1,
        severity: 'normal',
        color: '#1b5e20',
      },
      {
        rangeLabel: 'Level II',
        rangeLabel_ar: 'المستوى II — بجودة/سرعة أقل',
        minScore: 2,
        maxScore: 2,
        severity: 'mild',
        color: '#558b2f',
      },
      {
        rangeLabel: 'Level III',
        rangeLabel_ar: 'المستوى III — بصعوبة ويحتاج مساعدة',
        minScore: 3,
        maxScore: 3,
        severity: 'moderate',
        color: '#ef6c00',
      },
      {
        rangeLabel: 'Level IV',
        rangeLabel_ar: 'المستوى IV — تشكيلة محدودة في مواقف مكيّفة',
        minScore: 4,
        maxScore: 4,
        severity: 'severe',
        color: '#c62828',
      },
      {
        rangeLabel: 'Level V',
        rangeLabel_ar: 'المستوى V — لا يتعامل مع الأشياء',
        minScore: 5,
        maxScore: 5,
        severity: 'critical',
        color: '#b71c1c',
      },
    ],

    purpose: 'descriptor',
    rawShape: 'items_array',
    derivedType: 'lookup_table',
    derivedRange: { min: 1, max: 5 },
    interpretationStyle: 'tier',
    scoringAlgorithmRef: 'scoring/macs.js',
    scoringEngineVersion: '1.0.0',

    interpretation: { mcid: { status: 'not_applicable' } },
    reassessment: { standardIntervalDays: 365, minIntervalDays: 180 },

    administrationTime: 5,
    administeredBy: ['occupational_therapist', 'physical_therapist', 'any_trained'],
    trainingRequired: false,
    publisher: 'Eliasson et al. (2006)',
    citation: 'Eliasson AC, et al. Dev Med Child Neurol. 2006;48(7):549-554.',
    evidenceLevel: 'level_1',

    eligibility: { languages: ['ar', 'en'], culturalAdaptation: 'not_required' },
    reporting: {
      showInFamilyReport: true,
      familyFriendlyLabel: 'Hand-use level',
      familyFriendlyLabel_ar: 'مستوى استخدام اليدين',
    },
    engine: { feedsSmartEngine: true },
    sensitivityLevel: 'MEDIUM',
    status: 'active',
    tags: ['cerebral-palsy', 'motor', 'classification', 'digital-administration'],
  },
];

module.exports = { MEASURES };
