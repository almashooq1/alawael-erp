/**
 * Leave Types Seed
 * أنواع الإجازات وفق نظام العمل السعودي
 * Saudi Labor Law (Royal Decree No. M/51) compliant
 */

'use strict';

const leaveTypes = [
  // ─── الإجازات الأساسية (نظام العمل) ──────────────────────
  {
    code: 'ANNUAL',
    name: { ar: 'الإجازة السنوية', en: 'Annual Leave' },
    category: 'paid',
    daysPerYear: 21, // 21 days first 5 years, 30 after
    maxDaysPerYear: 30,
    minServiceMonths: 12,
    carryOver: true,
    carryOverMax: 30,
    requiresApproval: true,
    advanceNoticeDays: 14,
    paidPercentage: 100,
    legalBasis: 'Saudi Labor Law Art. 109',
    applicableTo: ['all'],
    isActive: true,
    order: 1,
  },
  {
    code: 'SICK',
    name: { ar: 'إجازة مرضية', en: 'Sick Leave' },
    category: 'paid',
    daysPerYear: 120,
    maxDaysPerYear: 120,
    minServiceMonths: 0,
    carryOver: false,
    requiresApproval: false,
    requiresMedicalCertificate: true,
    // First 30 days: 100%, next 60 days: 75%, next 30 days: unpaid
    payStructure: [
      { days: 30, paidPercentage: 100 },
      { days: 60, paidPercentage: 75 },
      { days: 30, paidPercentage: 0 },
    ],
    paidPercentage: 100,
    legalBasis: 'Saudi Labor Law Art. 117',
    applicableTo: ['all'],
    isActive: true,
    order: 2,
  },
  {
    code: 'MATERNITY',
    name: { ar: 'إجازة وضع (أمومة)', en: 'Maternity Leave' },
    category: 'paid',
    daysPerYear: 70,
    maxDaysPerYear: 70,
    minServiceMonths: 0,
    carryOver: false,
    requiresApproval: true,
    requiresMedicalCertificate: true,
    paidPercentage: 100,
    gender: 'female',
    legalBasis: 'Saudi Labor Law Art. 151',
    applicableTo: ['female'],
    isActive: true,
    order: 3,
  },
  {
    code: 'PATERNITY',
    name: { ar: 'إجازة رعاية مولود (أبوة)', en: 'Paternity Leave' },
    category: 'paid',
    daysPerYear: 3,
    maxDaysPerYear: 3,
    minServiceMonths: 0,
    carryOver: false,
    requiresApproval: true,
    requiresMedicalCertificate: false,
    paidPercentage: 100,
    gender: 'male',
    legalBasis: 'Saudi Labor Law Art. 113',
    applicableTo: ['male'],
    isActive: true,
    order: 4,
  },
  {
    code: 'MARRIAGE',
    name: { ar: 'إجازة زواج', en: 'Marriage Leave' },
    category: 'paid',
    daysPerYear: 5,
    maxDaysPerYear: 5,
    minServiceMonths: 0,
    carryOver: false,
    requiresApproval: true,
    requiresMedicalCertificate: false,
    paidPercentage: 100,
    legalBasis: 'Saudi Labor Law Art. 113',
    applicableTo: ['all'],
    isActive: true,
    order: 5,
  },
  {
    code: 'DEATH',
    name: { ar: 'إجازة وفاة (عزاء)', en: 'Bereavement Leave' },
    category: 'paid',
    daysPerYear: 5,
    maxDaysPerYear: 5,
    minServiceMonths: 0,
    carryOver: false,
    requiresApproval: false,
    paidPercentage: 100,
    legalBasis: 'Saudi Labor Law Art. 113',
    applicableTo: ['all'],
    isActive: true,
    order: 6,
    notes: {
      ar: '5 أيام لوفاة الزوج أو الزوجة، 3 أيام لوفاة أحد الأقارب',
      en: '5 days for spouse, 3 days for relatives',
    },
  },
  {
    code: 'HAJJ',
    name: { ar: 'إجازة الحج', en: 'Hajj Leave' },
    category: 'paid',
    daysPerYear: 10,
    maxDaysPerYear: 10,
    minServiceMonths: 24, // 2 years minimum service
    carryOver: false,
    maxTimesEntitled: 1, // Once per employment
    requiresApproval: true,
    paidPercentage: 100,
    legalBasis: 'Saudi Labor Law Art. 113',
    applicableTo: ['muslim'],
    isActive: true,
    order: 7,
  },
  {
    code: 'IDDAH',
    name: { ar: 'إجازة العدة', en: 'Iddah Leave' },
    category: 'paid',
    daysPerYear: 130, // 4 months + 10 days = ~130 days
    maxDaysPerYear: 130,
    minServiceMonths: 0,
    carryOver: false,
    requiresApproval: true,
    requiresMedicalCertificate: false,
    paidPercentage: 100,
    gender: 'female',
    legalBasis: 'Saudi Labor Law Art. 151',
    applicableTo: ['female', 'muslim'],
    isActive: true,
    order: 8,
  },
  {
    code: 'STUDY_EXAM',
    name: { ar: 'إجازة دراسة وامتحان', en: 'Study / Exam Leave' },
    category: 'paid',
    daysPerYear: 15,
    maxDaysPerYear: 15,
    minServiceMonths: 0,
    carryOver: false,
    requiresApproval: true,
    requiresMedicalCertificate: false,
    paidPercentage: 100,
    legalBasis: 'Saudi Labor Law Art. 116',
    applicableTo: ['all'],
    isActive: true,
    order: 9,
  },

  // ─── إجازات إضافية (سياسة المنشأة) ──────────────────────
  {
    code: 'UNPAID',
    name: { ar: 'إجازة بدون راتب', en: 'Unpaid Leave' },
    category: 'unpaid',
    daysPerYear: 0,
    maxDaysPerYear: 365,
    minServiceMonths: 12,
    carryOver: false,
    requiresApproval: true,
    advanceNoticeDays: 30,
    paidPercentage: 0,
    applicableTo: ['all'],
    isActive: true,
    order: 10,
  },
  {
    code: 'EMERGENCY',
    name: { ar: 'إجازة طارئة', en: 'Emergency Leave' },
    category: 'paid',
    daysPerYear: 3,
    maxDaysPerYear: 3,
    minServiceMonths: 0,
    carryOver: false,
    requiresApproval: false,
    paidPercentage: 100,
    applicableTo: ['all'],
    isActive: true,
    order: 11,
  },
  {
    code: 'TRAINING',
    name: { ar: 'إجازة تدريب وتطوير', en: 'Training & Development Leave' },
    category: 'paid',
    daysPerYear: 0,
    maxDaysPerYear: 30,
    minServiceMonths: 0,
    carryOver: false,
    requiresApproval: true,
    paidPercentage: 100,
    applicableTo: ['all'],
    isActive: true,
    order: 12,
  },
  {
    code: 'COMPENSATORY',
    name: { ar: 'إجازة تعويضية', en: 'Compensatory Leave' },
    category: 'compensatory',
    daysPerYear: 0,
    maxDaysPerYear: 30,
    minServiceMonths: 0,
    carryOver: true,
    carryOverMax: 30,
    requiresApproval: true,
    paidPercentage: 100,
    applicableTo: ['all'],
    isActive: true,
    order: 13,
  },
  {
    code: 'WFH',
    name: { ar: 'العمل من المنزل', en: 'Work From Home' },
    category: 'wfh',
    daysPerYear: 0,
    maxDaysPerYear: 52, // Once per week max
    minServiceMonths: 0,
    carryOver: false,
    requiresApproval: true,
    paidPercentage: 100,
    applicableTo: ['all'],
    isActive: false, // Disabled by default
    order: 14,
  },
];

async function seed(connection) {
  const db = connection.db || connection;
  const col = db.collection('leavetypes');

  let upserted = 0;
  let skipped = 0;

  for (const lt of leaveTypes) {
    const result = await col.updateOne(
      { code: lt.code },
      {
        $setOnInsert: {
          ...lt,
          metadata: { isSystem: true },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
          name: lt.name,
          isActive: lt.isActive,
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount > 0) upserted++;
    else skipped++;
  }

  console.log(`  ✔ leave-types: ${upserted} inserted, ${skipped} already existed`);
}

async function down(connection) {
  const db = connection.db || connection;
  const result = await db.collection('leavetypes').deleteMany({ 'metadata.isSystem': true });
  console.log(`  ✔ leave-types: removed ${result.deletedCount} system leave types`);
}

module.exports = { seed, down };
