'use strict';

/**
 * AR/VR Scenarios Catalog — كتالوج سيناريوهات الواقع الافتراضي / المعزز
 *
 * Preset, evidence-aligned scenarios the therapist can pick from when
 * creating a new session. Each scenario maps to a clinical goal area
 * (motor / cognitive / balance / phobia / social / sensory / ADL) and
 * carries default difficulty + planned duration + supported devices.
 *
 * Keep this catalog in sync with the front-end picker. Adding new entries
 * is non-breaking; renaming an `id` is breaking.
 */

const SCENARIOS = [
  // ─── Motor rehab ──────────────────────────────────────────────
  {
    id: 'mr-upper-limb-fruit-pick',
    name: 'قطف الفواكه — تأهيل الطرف العلوي',
    nameEn: 'Fruit Picking — Upper-limb Rehab',
    technologyType: 'vr',
    specialty: 'motor_rehab',
    category: 'therapeutic_game',
    defaultDurationMinutes: 15,
    defaultDifficulty: 3,
    minAge: 5,
    maxAge: 90,
    objectives: ['reach', 'grasp', 'release', 'shoulder ROM'],
    devices: ['meta_quest_3', 'meta_quest_pro', 'pico_4'],
    contraindications: ['acute_shoulder_injury', 'severe_motion_sickness'],
    description:
      'بيئة بستان افتراضية — يقطف المستفيد ثمارًا متدرجة الارتفاع لتدريب مدى الحركة + قبضة اليد.',
  },
  {
    id: 'mr-hand-rehab-piano',
    name: 'بيانو افتراضي — تدريب أصابع اليد',
    nameEn: 'Virtual Piano — Hand Dexterity',
    technologyType: 'vr',
    specialty: 'motor_rehab',
    category: 'therapeutic_game',
    defaultDurationMinutes: 12,
    defaultDifficulty: 4,
    minAge: 6,
    maxAge: 80,
    objectives: ['finger isolation', 'fine motor', 'reaction time'],
    devices: ['meta_quest_pro', 'apple_vision_pro'],
    description: 'يتابع المستفيد نوتات متتالية على بيانو افتراضي مع تتبع كل إصبع.',
  },

  // ─── Balance / gait ───────────────────────────────────────────
  {
    id: 'bal-tightrope-canyon',
    name: 'حبل مشدود فوق وادٍ',
    nameEn: 'Canyon Tightrope',
    technologyType: 'vr',
    specialty: 'balance_training',
    category: 'simulation',
    defaultDurationMinutes: 10,
    defaultDifficulty: 6,
    minAge: 12,
    maxAge: 65,
    objectives: ['static balance', 'weight shifting', 'core stability'],
    devices: ['htc_vive', 'meta_quest_3', 'pico_4'],
    contraindications: ['vestibular_disorder', 'fall_risk_high'],
    description: 'مشي على حبل مع تغذية راجعة بصرية — يتم قياس مساحة التذبذب وتوزيع الوزن.',
  },
  {
    id: 'bal-gait-corridor',
    name: 'ممر المشي المتدرج',
    nameEn: 'Graded Gait Corridor',
    technologyType: 'vr',
    specialty: 'balance_training',
    category: 'exercise',
    defaultDurationMinutes: 20,
    defaultDifficulty: 4,
    minAge: 8,
    maxAge: 90,
    objectives: ['gait symmetry', 'cadence', 'stride length'],
    devices: ['meta_quest_3', 'pico_4'],
    description: 'ممر بطول قابل للتعديل مع موسيقى إيقاعية لتنظيم خطوات المستفيد.',
  },

  // ─── Cognitive ─────────────────────────────────────────────────
  {
    id: 'cog-memory-market',
    name: 'سوق الذاكرة',
    nameEn: 'Memory Market',
    technologyType: 'vr',
    specialty: 'cognitive_rehab',
    category: 'training',
    defaultDurationMinutes: 15,
    defaultDifficulty: 5,
    minAge: 10,
    maxAge: 95,
    objectives: ['working memory', 'attention', 'sequencing'],
    devices: ['meta_quest_3', 'apple_vision_pro', 'hololens_2'],
    description: 'يحفظ المستفيد قائمة مشتريات ثم يجمعها من رفوف متعددة في سوق افتراضي.',
  },
  {
    id: 'cog-stroop-train',
    name: 'لوحة Stroop التفاعلية',
    nameEn: 'Interactive Stroop Board',
    technologyType: 'ar',
    specialty: 'cognitive_rehab',
    category: 'assessment',
    defaultDurationMinutes: 8,
    defaultDifficulty: 6,
    minAge: 10,
    maxAge: 80,
    objectives: ['inhibition control', 'selective attention'],
    devices: ['apple_vision_pro', 'hololens_2', 'meta_quest_pro'],
    description: 'نسخة AR من اختبار Stroop — تُسقط كلمات ملونة على الطاولة الواقعية.',
  },

  // ─── Phobia / exposure therapy ─────────────────────────────────
  {
    id: 'phob-height-glass-elevator',
    name: 'مصعد زجاجي — رهاب المرتفعات',
    nameEn: 'Glass Elevator — Acrophobia',
    technologyType: 'vr',
    specialty: 'phobia_therapy',
    category: 'simulation',
    defaultDurationMinutes: 12,
    defaultDifficulty: 5,
    minAge: 16,
    maxAge: 70,
    objectives: ['graded exposure', 'anxiety regulation', 'breathing control'],
    devices: ['meta_quest_3', 'pico_4', 'htc_vive'],
    contraindications: ['cardiac_history', 'uncontrolled_anxiety'],
    description: 'صعود تدريجي يقاس فيه معدل القلب والتنفس — يتيح للمعالج التحكم في الارتفاع.',
  },

  // ─── Social skills ─────────────────────────────────────────────
  {
    id: 'soc-classroom-conversation',
    name: 'محادثة الفصل المدرسي',
    nameEn: 'Classroom Conversation',
    technologyType: 'vr',
    specialty: 'social_skills',
    category: 'social_scenario',
    defaultDurationMinutes: 18,
    defaultDifficulty: 4,
    minAge: 6,
    maxAge: 25,
    objectives: ['turn taking', 'eye contact', 'social initiation'],
    devices: ['meta_quest_3', 'pico_4'],
    description: 'تفاعل مع زملاء افتراضيين في سيناريوهات اجتماعية شائعة — مصمم لطيف التوحد.',
  },
  {
    id: 'soc-job-interview',
    name: 'مقابلة عمل افتراضية',
    nameEn: 'Virtual Job Interview',
    technologyType: 'vr',
    specialty: 'social_skills',
    category: 'training',
    defaultDurationMinutes: 25,
    defaultDifficulty: 7,
    minAge: 16,
    maxAge: 60,
    objectives: ['professional communication', 'stress tolerance', 'self-presentation'],
    devices: ['meta_quest_pro', 'apple_vision_pro'],
    description: 'محاكاة مقابلة وظيفية — يطرح المُحاور الافتراضي أسئلة ويحلل لغة الجسد.',
  },

  // ─── Sensory integration ───────────────────────────────────────
  {
    id: 'sens-aquarium-calm',
    name: 'حوض أسماك مهدئ',
    nameEn: 'Calming Aquarium',
    technologyType: 'vr',
    specialty: 'sensory_integration',
    category: 'relaxation',
    defaultDurationMinutes: 10,
    defaultDifficulty: 1,
    minAge: 3,
    maxAge: 100,
    objectives: ['sensory regulation', 'anxiety reduction'],
    devices: ['meta_quest_3', 'pico_4', 'apple_vision_pro'],
    description: 'مشاهد هادئة تحت الماء — موجة استرخاء قبل/بعد جلسات شديدة.',
  },

  // ─── Daily living (ADL) ────────────────────────────────────────
  {
    id: 'adl-supermarket-shopping',
    name: 'تسوّق من السوبر ماركت',
    nameEn: 'Supermarket Shopping',
    technologyType: 'vr',
    specialty: 'daily_living',
    category: 'daily_activity',
    defaultDurationMinutes: 20,
    defaultDifficulty: 4,
    minAge: 10,
    maxAge: 90,
    objectives: ['ADL', 'planning', 'money handling', 'navigation'],
    devices: ['meta_quest_3', 'pico_4'],
    description: 'تسوّق كامل: قائمة → رفوف → كاشير. مناسب لإعادة دمج المرضى.',
  },
  {
    id: 'adl-kitchen-safety',
    name: 'سلامة المطبخ',
    nameEn: 'Kitchen Safety',
    technologyType: 'vr',
    specialty: 'daily_living',
    category: 'training',
    defaultDurationMinutes: 15,
    defaultDifficulty: 5,
    minAge: 12,
    maxAge: 80,
    objectives: ['hazard identification', 'sequencing', 'attention'],
    devices: ['meta_quest_3', 'apple_vision_pro'],
    description: 'مطبخ تفاعلي يحتوي مخاطر مخفية — يكتشفها المستفيد ويعالجها.',
  },

  // ─── Mixed / hologram showcase ─────────────────────────────────
  {
    id: 'mix-anatomy-hologram',
    name: 'هولوجرام تشريحي تفاعلي',
    nameEn: 'Interactive Anatomy Hologram',
    technologyType: 'hologram',
    specialty: 'other',
    category: 'training',
    defaultDurationMinutes: 15,
    defaultDifficulty: 3,
    minAge: 14,
    maxAge: 70,
    objectives: ['psychoeducation', 'body awareness'],
    devices: ['hololens_2', 'apple_vision_pro'],
    description: 'يستخدمه الأخصائي لشرح الإصابة للمستفيد بصرياً عبر جسد ثلاثي الأبعاد.',
  },
];

const SCENARIOS_BY_ID = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));

function listScenarios({ specialty, technologyType, minAge, maxAge } = {}) {
  return SCENARIOS.filter(s => {
    if (specialty && s.specialty !== specialty) return false;
    if (technologyType && s.technologyType !== technologyType) return false;
    if (minAge != null && s.maxAge < minAge) return false;
    if (maxAge != null && s.minAge > maxAge) return false;
    return true;
  });
}

function getScenario(id) {
  return SCENARIOS_BY_ID[id] || null;
}

module.exports = {
  SCENARIOS,
  SCENARIOS_BY_ID,
  listScenarios,
  getScenario,
};
