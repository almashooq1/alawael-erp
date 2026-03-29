/**
 * Rehabilitation Programs Seed
 * برامج التأهيل الأساسية - Al-Awael Rehabilitation Center
 */

'use strict';

const programs = [
  // ─── برامج التأهيل الحركي والجسدي ────────────────────────
  {
    code: 'PT_BASIC',
    name: { ar: 'العلاج الطبيعي الأساسي', en: 'Basic Physical Therapy' },
    department: 'PT',
    type: 'therapeutic',
    targetAgeMin: 0,
    targetAgeMax: 100,
    sessionDurationMin: 45,
    sessionsPerWeek: 3,
    totalSessions: 24,
    description: {
      ar: 'برنامج شامل للعلاج الطبيعي وتحسين الحركة',
      en: 'Comprehensive physical therapy program for improving mobility',
    },
    goals: [
      { ar: 'تحسين نطاق حركة المفاصل', en: 'Improve joint range of motion' },
      { ar: 'تقوية عضلات الجسم', en: 'Strengthen body muscles' },
      { ar: 'تحسين التوازن والتناسق', en: 'Improve balance and coordination' },
    ],
    targetDisabilities: ['PHYSICAL', 'CP'],
    isActive: true,
    order: 1,
    costPerSession: 0,
    currency: 'SAR',
  },
  {
    code: 'PT_NEURO',
    name: { ar: 'إعادة تأهيل عصبي حركي', en: 'Neuro-Motor Rehabilitation' },
    department: 'PT',
    type: 'therapeutic',
    targetAgeMin: 2,
    targetAgeMax: 100,
    sessionDurationMin: 60,
    sessionsPerWeek: 3,
    totalSessions: 36,
    description: {
      ar: 'برنامج متخصص لإعادة التأهيل العصبي الحركي',
      en: 'Specialized program for neuro-motor rehabilitation',
    },
    targetDisabilities: ['CP', 'SCI', 'HEMI', 'PARA', 'QUAD'],
    isActive: true,
    order: 2,
  },
  {
    code: 'PT_PEDIATRIC',
    name: { ar: 'علاج طبيعي للأطفال', en: 'Pediatric Physical Therapy' },
    department: 'PT',
    type: 'therapeutic',
    targetAgeMin: 0,
    targetAgeMax: 12,
    sessionDurationMin: 45,
    sessionsPerWeek: 3,
    totalSessions: 24,
    description: {
      ar: 'برنامج العلاج الطبيعي المتخصص للأطفال',
      en: 'Specialized pediatric physical therapy program',
    },
    targetDisabilities: ['CP', 'PHYSICAL', 'DS'],
    isActive: true,
    order: 3,
  },

  // ─── برامج العلاج الوظيفي ─────────────────────────────────
  {
    code: 'OT_BASIC',
    name: { ar: 'العلاج الوظيفي الأساسي', en: 'Basic Occupational Therapy' },
    department: 'OT',
    type: 'therapeutic',
    targetAgeMin: 2,
    targetAgeMax: 100,
    sessionDurationMin: 45,
    sessionsPerWeek: 2,
    totalSessions: 20,
    description: {
      ar: 'برنامج تطوير مهارات الحياة اليومية والاستقلالية',
      en: 'Program for developing daily living skills and independence',
    },
    goals: [
      { ar: 'تحسين مهارات الرعاية الذاتية', en: 'Improve self-care skills' },
      { ar: 'تطوير المهارات الحركية الدقيقة', en: 'Develop fine motor skills' },
    ],
    targetDisabilities: ['PHYSICAL', 'CP', 'ASD_L1', 'ASD_L2'],
    isActive: true,
    order: 10,
  },
  {
    code: 'OT_SENSORY',
    name: { ar: 'التكامل الحسي', en: 'Sensory Integration Therapy' },
    department: 'OT',
    type: 'therapeutic',
    targetAgeMin: 2,
    targetAgeMax: 14,
    sessionDurationMin: 60,
    sessionsPerWeek: 2,
    totalSessions: 24,
    description: {
      ar: 'برنامج متخصص للتكامل الحسي والمعالجة الحسية',
      en: 'Specialized sensory integration and processing program',
    },
    targetDisabilities: ['AUTISM', 'ASD_L1', 'ASD_L2', 'ADHD'],
    isActive: true,
    order: 11,
  },
  {
    code: 'OT_AUTISM',
    name: { ar: 'العلاج الوظيفي لطيف التوحد', en: 'OT for Autism Spectrum' },
    department: 'OT',
    type: 'therapeutic',
    targetAgeMin: 2,
    targetAgeMax: 18,
    sessionDurationMin: 45,
    sessionsPerWeek: 3,
    totalSessions: 36,
    description: {
      ar: 'برنامج متخصص للعلاج الوظيفي لأطفال طيف التوحد',
      en: 'Specialized OT program for children with autism spectrum',
    },
    targetDisabilities: ['AUTISM', 'ASD_L1', 'ASD_L2', 'ASD_L3'],
    isActive: true,
    order: 12,
  },

  // ─── برامج النطق واللغة ───────────────────────────────────
  {
    code: 'ST_BASIC',
    name: { ar: 'علاج النطق واللغة الأساسي', en: 'Basic Speech & Language Therapy' },
    department: 'ST',
    type: 'therapeutic',
    targetAgeMin: 1,
    targetAgeMax: 100,
    sessionDurationMin: 45,
    sessionsPerWeek: 2,
    totalSessions: 20,
    description: {
      ar: 'برنامج تحسين مهارات التواصل والنطق',
      en: 'Communication and speech improvement program',
    },
    targetDisabilities: ['SPEECH', 'LANG_DELAY', 'APHASIA'],
    isActive: true,
    order: 20,
  },
  {
    code: 'ST_AUTISM',
    name: { ar: 'تواصل وتعبير لطيف التوحد', en: 'AAC & Communication for ASD' },
    department: 'ST',
    type: 'therapeutic',
    targetAgeMin: 2,
    targetAgeMax: 18,
    sessionDurationMin: 45,
    sessionsPerWeek: 3,
    totalSessions: 36,
    description: {
      ar: 'برنامج التواصل المعزز والبديل لأطفال التوحد',
      en: 'AAC and communication program for children with ASD',
    },
    targetDisabilities: ['AUTISM', 'ASD_L2', 'ASD_L3'],
    isActive: true,
    order: 21,
  },

  // ─── برامج التربية الخاصة ────────────────────────────────
  {
    code: 'SE_AUTISM',
    name: { ar: 'تعليم أطفال طيف التوحد', en: 'Special Education for ASD' },
    department: 'SPECEDUC',
    type: 'educational',
    targetAgeMin: 3,
    targetAgeMax: 18,
    sessionDurationMin: 60,
    sessionsPerWeek: 5,
    totalSessions: 100,
    description: {
      ar: 'برنامج تعليمي متخصص لأطفال طيف التوحد',
      en: 'Specialized educational program for children with ASD',
    },
    targetDisabilities: ['AUTISM', 'ASD_L1', 'ASD_L2', 'ASD_L3'],
    isActive: true,
    order: 30,
  },
  {
    code: 'SE_ID',
    name: { ar: 'تعليم الإعاقة الذهنية', en: 'Special Education for Intellectual Disability' },
    department: 'SPECEDUC',
    type: 'educational',
    targetAgeMin: 3,
    targetAgeMax: 18,
    sessionDurationMin: 60,
    sessionsPerWeek: 5,
    totalSessions: 100,
    description: {
      ar: 'برنامج تعليمي متخصص لذوي الإعاقة الذهنية',
      en: 'Specialized educational program for individuals with intellectual disability',
    },
    targetDisabilities: ['INTELLECTUAL', 'ID_MILD', 'ID_MOD', 'DS'],
    isActive: true,
    order: 31,
  },
  {
    code: 'SE_LEARNING',
    name: { ar: 'صعوبات التعلم', en: 'Learning Disabilities Program' },
    department: 'SPECEDUC',
    type: 'educational',
    targetAgeMin: 5,
    targetAgeMax: 18,
    sessionDurationMin: 45,
    sessionsPerWeek: 3,
    totalSessions: 36,
    description: {
      ar: 'برنامج دعم ذوي صعوبات التعلم',
      en: 'Support program for individuals with learning disabilities',
    },
    targetDisabilities: ['LEARNING', 'DYSLEXIA', 'DYSCALC', 'DYSGRAPH'],
    isActive: true,
    order: 32,
  },

  // ─── برامج الدعم النفسي والسلوكي ─────────────────────────
  {
    code: 'PSY_BEHAVIORAL',
    name: { ar: 'تعديل السلوك', en: 'Behavioral Modification (ABA)' },
    department: 'PSY',
    type: 'behavioral',
    targetAgeMin: 2,
    targetAgeMax: 18,
    sessionDurationMin: 60,
    sessionsPerWeek: 5,
    totalSessions: 80,
    description: {
      ar: 'برنامج تحليل السلوك التطبيقي وتعديله',
      en: 'Applied Behavior Analysis (ABA) program',
    },
    targetDisabilities: ['AUTISM', 'ADHD', 'ASD_L1', 'ASD_L2', 'ASD_L3'],
    isActive: true,
    order: 40,
  },
  {
    code: 'PSY_FAMILY',
    name: { ar: 'إرشاد الأسرة', en: 'Family Counseling & Support' },
    department: 'PSY',
    type: 'counseling',
    targetAgeMin: 0,
    targetAgeMax: 100,
    sessionDurationMin: 60,
    sessionsPerWeek: 1,
    totalSessions: 12,
    description: {
      ar: 'برنامج إرشاد وتوجيه الأسر',
      en: 'Counseling and guidance program for families',
    },
    targetDisabilities: ['ALL'],
    isActive: true,
    order: 41,
  },

  // ─── برامج مهارات الحياة اليومية ──────────────────────────
  {
    code: 'ADL_BASIC',
    name: { ar: 'مهارات الحياة اليومية الأساسية', en: 'Basic Activities of Daily Living' },
    department: 'OT',
    type: 'functional',
    targetAgeMin: 3,
    targetAgeMax: 100,
    sessionDurationMin: 45,
    sessionsPerWeek: 2,
    totalSessions: 24,
    description: {
      ar: 'تطوير مهارات الحياة اليومية الأساسية والاستقلالية',
      en: 'Developing basic daily living skills and independence',
    },
    targetDisabilities: ['ALL'],
    isActive: true,
    order: 50,
  },

  // ─── برامج التشغيل المدعوم ────────────────────────────────
  {
    code: 'SE_VOCATIONAL',
    name: { ar: 'التدريب والتأهيل المهني', en: 'Vocational Training & Supported Employment' },
    department: 'SW',
    type: 'vocational',
    targetAgeMin: 16,
    targetAgeMax: 65,
    sessionDurationMin: 120,
    sessionsPerWeek: 3,
    totalSessions: 48,
    description: {
      ar: 'برنامج التدريب المهني ودعم التوظيف لذوي الإعاقة',
      en: 'Vocational training and supported employment program for people with disabilities',
    },
    targetDisabilities: ['INTELLECTUAL', 'PHYSICAL', 'AUTISM'],
    isActive: true,
    order: 60,
  },

  // ─── برامج التأهيل عن بُعد ──────────────────────────────
  {
    code: 'TELE_REHAB',
    name: { ar: 'التأهيل عن بُعد (تليريهاب)', en: 'Tele-Rehabilitation' },
    department: 'REHAB',
    type: 'telehealth',
    targetAgeMin: 5,
    targetAgeMax: 100,
    sessionDurationMin: 30,
    sessionsPerWeek: 2,
    totalSessions: 16,
    description: {
      ar: 'برنامج التأهيل عبر الإنترنت للمناطق البعيدة',
      en: 'Online rehabilitation program for remote areas',
    },
    targetDisabilities: ['ALL'],
    isActive: false, // Disabled by default, enable via system settings
    order: 70,
  },
];

async function seed(connection) {
  const db = connection.db || connection;
  const col = db.collection('programs');

  let upserted = 0;
  let skipped = 0;

  for (const prog of programs) {
    const result = await col.updateOne(
      { code: prog.code },
      {
        $setOnInsert: {
          ...prog,
          metadata: { isSystem: true },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
          name: prog.name,
          isActive: prog.isActive,
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount > 0) upserted++;
    else skipped++;
  }

  console.log(`  ✔ programs: ${upserted} inserted, ${skipped} already existed`);
}

async function down(connection) {
  const db = connection.db || connection;
  const result = await db.collection('programs').deleteMany({ 'metadata.isSystem': true });
  console.log(`  ✔ programs: removed ${result.deletedCount} system programs`);
}

module.exports = { seed, down };
