/**
 * Student Registration — Configuration Constants
 *
 * Matching backend studentConfig — disability types, severity levels,
 * programs, shifts, week days, step labels, and initial form state.
 */

// ─── Disability Types ───────────────────────────
export const DISABILITY_TYPES = {
  physical: {
    label: 'إعاقة حركية',
    subtypes: ['شلل سفلي', 'شلل رباعي', 'بتر', 'ضمور عضلي', 'شلل دماغي'],
  },
  visual: { label: 'إعاقة بصرية', subtypes: ['كفيف', 'ضعف بصر شديد', 'ضعف بصر متوسط'] },
  hearing: { label: 'إعاقة سمعية', subtypes: ['صمم كامل', 'ضعف سمع شديد', 'ضعف سمع متوسط'] },
  intellectual: { label: 'إعاقة ذهنية', subtypes: ['بسيطة', 'متوسطة', 'شديدة', 'شديدة جداً'] },
  autism: { label: 'اضطراب طيف التوحد', subtypes: ['مستوى 1', 'مستوى 2', 'مستوى 3'] },
  learning: { label: 'صعوبات تعلم', subtypes: ['ديسليكسيا', 'ديسكالكوليا', 'ديسجرافيا', 'ADHD'] },
  speech: { label: 'اضطرابات نطق ولغة', subtypes: ['تأخر لغوي', 'لثغة', 'تلعثم', 'حبسة'] },
  multiple: { label: 'إعاقات متعددة', subtypes: ['متعددة'] },
};

export const SEVERITY_LEVELS = {
  mild: 'بسيط',
  moderate: 'متوسط',
  severe: 'شديد',
  profound: 'شديد جداً',
};

// ─── Programs ───────────────────────────────────
export const PROGRAMS = {
  physical_therapy: 'علاج طبيعي',
  occupational_therapy: 'علاج وظيفي',
  speech_therapy: 'علاج نطق',
  behavioral_therapy: 'علاج سلوكي',
  special_education: 'تربية خاصة',
  vocational_training: 'تأهيل مهني',
  social_skills: 'مهارات اجتماعية',
  daily_living: 'مهارات حياتية',
  cognitive_training: 'تدريب معرفي',
  sensory_integration: 'تكامل حسي',
};

// ─── Schedule ───────────────────────────────────
export const SHIFTS = {
  morning: 'صباحية (7:00 - 12:00)',
  evening: 'مسائية (1:00 - 6:00)',
  full: 'يوم كامل (7:00 - 6:00)',
};

export const WEEK_DAYS = {
  sun: 'الأحد',
  mon: 'الاثنين',
  tue: 'الثلاثاء',
  wed: 'الأربعاء',
  thu: 'الخميس',
};

// ─── Steps ──────────────────────────────────────
export const STEPS = [
  'البيانات الشخصية',
  'معلومات الإعاقة',
  'ولي الأمر',
  'البرامج والجدول',
  'التاريخ الطبي',
  'المراجعة والتأكيد',
];

// ─── Initial Form State ─────────────────────────
export const INITIAL_FORM = {
  // Personal
  firstNameAr: '',
  lastNameAr: '',
  firstNameEn: '',
  lastNameEn: '',
  nationalId: '',
  dateOfBirth: '',
  gender: '',
  nationality: 'سعودي',
  placeOfBirth: '',
  bloodType: '',
  // Address
  region: '',
  city: '',
  district: '',
  streetName: '',
  postalCode: '',
  // Disability
  primaryType: '',
  primarySubtype: '',
  severity: '',
  diagnosisDate: '',
  diagnosisSource: '',
  disabilityNotes: '',
  // Guardian - Father
  fatherName: '',
  fatherNationalId: '',
  fatherMobile: '',
  fatherEmail: '',
  fatherOccupation: '',
  fatherEducation: '',
  // Guardian - Mother
  motherName: '',
  motherMobile: '',
  motherEmail: '',
  motherOccupation: '',
  // Emergency
  emergencyName: '',
  emergencyRelation: '',
  emergencyMobile: '',
  // Programs
  selectedPrograms: [],
  shift: '',
  days: [],
  centerName: '',
  branchName: '',
  // Medical
  allergies: [],
  medications: '',
  chronicConditions: '',
  hasGlasses: false,
  hasHearingAid: false,
};
