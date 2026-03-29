/**
 * Sample Beneficiaries Seed
 * بيانات مستفيدين تجريبية - للتطوير والاختبار فقط
 * DEV/STAGING only - NOT for production
 */

'use strict';

const sampleBeneficiaries = [
  // ─── طيف التوحد ─────────────────────────────────────────
  {
    beneficiaryNumber: 'BEN001000',
    name: { ar: 'أحمد محمد العتيبي', en: 'Ahmed Mohammed Al-Otaibi' },
    gender: 'male',
    dateOfBirth: new Date('2018-03-15'),
    nationalId: '1099876543',
    nationality: 'SA',
    primaryDisability: 'AUTISM',
    disabilityLevel: 'ASD_L2',
    caseStatus: 'active',
    guardian: {
      name: { ar: 'محمد سالم العتيبي', en: 'Mohammed Salem Al-Otaibi' },
      relationship: 'father',
      phone: '0501234567',
      email: 'parent1@example.com',
      nationalId: '1088765432',
    },
    address: {
      city: 'الرياض',
      district: 'الملز',
      region: 'الرياض',
    },
    referralSource: 'hospital',
    enrollmentDate: new Date('2023-06-01'),
    programs: ['OT_AUTISM', 'ST_AUTISM', 'PSY_BEHAVIORAL'],
    branchCode: 'RUH-MAIN',
    notes: 'Sample beneficiary for development - ASD Level 2',
  },
  {
    beneficiaryNumber: 'BEN001001',
    name: { ar: 'ريم عبدالله القحطاني', en: 'Reem Abdullah Al-Qahtani' },
    gender: 'female',
    dateOfBirth: new Date('2017-08-22'),
    nationalId: '1099876544',
    nationality: 'SA',
    primaryDisability: 'AUTISM',
    disabilityLevel: 'ASD_L1',
    caseStatus: 'active',
    guardian: {
      name: { ar: 'عبدالله فهد القحطاني', en: 'Abdullah Fahd Al-Qahtani' },
      relationship: 'father',
      phone: '0502345678',
      email: 'parent2@example.com',
      nationalId: '1087654321',
    },
    address: {
      city: 'الرياض',
      district: 'العليا',
      region: 'الرياض',
    },
    referralSource: 'pediatrician',
    enrollmentDate: new Date('2022-09-15'),
    programs: ['OT_SENSORY', 'ST_BASIC', 'SE_AUTISM'],
    branchCode: 'RUH-MAIN',
    notes: 'Sample beneficiary for development - ASD Level 1',
  },
  // ─── الإعاقة الذهنية ─────────────────────────────────────
  {
    beneficiaryNumber: 'BEN001002',
    name: { ar: 'فيصل ناصر الدوسري', en: 'Faisal Nasser Al-Dosari' },
    gender: 'male',
    dateOfBirth: new Date('2015-11-05'),
    nationalId: '1099876545',
    nationality: 'SA',
    primaryDisability: 'INTELLECTUAL',
    disabilityLevel: 'ID_MILD',
    caseStatus: 'active',
    guardian: {
      name: { ar: 'ناصر خالد الدوسري', en: 'Nasser Khalid Al-Dosari' },
      relationship: 'father',
      phone: '0503456789',
      email: 'parent3@example.com',
      nationalId: '1086543210',
    },
    address: {
      city: 'الخرج',
      district: 'الخرج',
      region: 'الرياض',
    },
    referralSource: 'ministry_of_education',
    enrollmentDate: new Date('2023-01-10'),
    programs: ['SE_ID', 'OT_BASIC', 'PSY_FAMILY'],
    branchCode: 'RUH-MAIN',
    notes: 'Sample beneficiary - Mild Intellectual Disability',
  },
  {
    beneficiaryNumber: 'BEN001003',
    name: { ar: 'سارة محمد الشهري', en: 'Sara Mohammed Al-Shehri' },
    gender: 'female',
    dateOfBirth: new Date('2016-04-18'),
    nationalId: '1099876546',
    nationality: 'SA',
    primaryDisability: 'INTELLECTUAL',
    disabilityLevel: 'DS',
    caseStatus: 'active',
    guardian: {
      name: { ar: 'نورة أحمد الشهري', en: 'Noura Ahmed Al-Shehri' },
      relationship: 'mother',
      phone: '0504567890',
      email: 'parent4@example.com',
      nationalId: '2085432109',
    },
    address: {
      city: 'الرياض',
      district: 'الروضة',
      region: 'الرياض',
    },
    referralSource: 'hospital',
    enrollmentDate: new Date('2022-03-20'),
    programs: ['SE_ID', 'PT_PEDIATRIC', 'ST_BASIC', 'ADL_BASIC'],
    branchCode: 'RUH-MAIN',
    notes: 'Sample beneficiary - Down Syndrome',
  },
  // ─── الشلل الدماغي ──────────────────────────────────────
  {
    beneficiaryNumber: 'BEN001004',
    name: { ar: 'عمر طارق البقمي', en: 'Omar Tariq Al-Baqmi' },
    gender: 'male',
    dateOfBirth: new Date('2019-07-12'),
    nationalId: '1099876547',
    nationality: 'SA',
    primaryDisability: 'PHYSICAL',
    disabilityLevel: 'CP',
    caseStatus: 'active',
    guardian: {
      name: { ar: 'طارق عمر البقمي', en: 'Tariq Omar Al-Baqmi' },
      relationship: 'father',
      phone: '0505678901',
      email: 'parent5@example.com',
      nationalId: '1084321098',
    },
    address: {
      city: 'جدة',
      district: 'الصفا',
      region: 'مكة المكرمة',
    },
    referralSource: 'nicu',
    enrollmentDate: new Date('2021-08-05'),
    programs: ['PT_NEURO', 'OT_BASIC', 'ST_BASIC', 'ADL_BASIC'],
    branchCode: 'JED-MAIN',
    notes: 'Sample beneficiary - Cerebral Palsy (Spastic Diplegia)',
  },
  // ─── صعوبات التعلم ──────────────────────────────────────
  {
    beneficiaryNumber: 'BEN001005',
    name: { ar: 'ليان حسين المالكي', en: 'Layan Hussein Al-Malki' },
    gender: 'female',
    dateOfBirth: new Date('2014-02-28'),
    nationalId: '1099876548',
    nationality: 'SA',
    primaryDisability: 'LEARNING',
    disabilityLevel: 'DYSLEXIA',
    caseStatus: 'active',
    guardian: {
      name: { ar: 'حسين علي المالكي', en: 'Hussein Ali Al-Malki' },
      relationship: 'father',
      phone: '0506789012',
      email: 'parent6@example.com',
      nationalId: '1083210987',
    },
    address: {
      city: 'الرياض',
      district: 'المرسلات',
      region: 'الرياض',
    },
    referralSource: 'school',
    enrollmentDate: new Date('2023-10-01'),
    programs: ['SE_LEARNING', 'ST_BASIC'],
    branchCode: 'RUH-MAIN',
    notes: 'Sample beneficiary - Dyslexia',
  },
  // ─── ADHD ────────────────────────────────────────────────
  {
    beneficiaryNumber: 'BEN001006',
    name: { ar: 'زياد سعد العنزي', en: 'Ziyad Saad Al-Anazi' },
    gender: 'male',
    dateOfBirth: new Date('2013-09-10'),
    nationalId: '1099876549',
    nationality: 'SA',
    primaryDisability: 'ADHD',
    disabilityLevel: 'ADHD_CO',
    caseStatus: 'active',
    guardian: {
      name: { ar: 'سعد محمد العنزي', en: 'Saad Mohammed Al-Anazi' },
      relationship: 'father',
      phone: '0507890123',
      email: 'parent7@example.com',
      nationalId: '1082109876',
    },
    address: {
      city: 'الدمام',
      district: 'الفيصلية',
      region: 'الشرقية',
    },
    referralSource: 'psychiatrist',
    enrollmentDate: new Date('2023-04-15'),
    programs: ['PSY_BEHAVIORAL', 'OT_SENSORY'],
    branchCode: 'DAM-MAIN',
    notes: 'Sample beneficiary - ADHD Combined Type',
  },
  // ─── إعاقة سمعية ────────────────────────────────────────
  {
    beneficiaryNumber: 'BEN001007',
    name: { ar: 'هند خالد الرشيدي', en: 'Hind Khalid Al-Rashidi' },
    gender: 'female',
    dateOfBirth: new Date('2016-12-03'),
    nationalId: '1099876550',
    nationality: 'SA',
    primaryDisability: 'HEARING',
    disabilityLevel: 'DEAF',
    caseStatus: 'active',
    guardian: {
      name: { ar: 'خالد سليمان الرشيدي', en: 'Khalid Suleiman Al-Rashidi' },
      relationship: 'father',
      phone: '0508901234',
      email: 'parent8@example.com',
      nationalId: '1080987654',
    },
    address: {
      city: 'الرياض',
      district: 'النزهة',
      region: 'الرياض',
    },
    referralSource: 'hospital',
    enrollmentDate: new Date('2022-11-08'),
    programs: ['ST_BASIC', 'SE_AUTISM'],
    branchCode: 'RUH-MAIN',
    notes: 'Sample beneficiary - Total Deafness with cochlear implant',
  },
  // ─── قائمة انتظار ───────────────────────────────────────
  {
    beneficiaryNumber: 'BEN001008',
    name: { ar: 'يوسف عادل الحربي', en: 'Yousef Adel Al-Harbi' },
    gender: 'male',
    dateOfBirth: new Date('2020-01-25'),
    nationalId: '1099876551',
    nationality: 'SA',
    primaryDisability: 'AUTISM',
    disabilityLevel: 'ASD_L3',
    caseStatus: 'waitlist',
    guardian: {
      name: { ar: 'عادل يوسف الحربي', en: 'Adel Yousef Al-Harbi' },
      relationship: 'father',
      phone: '0509012345',
      email: 'parent9@example.com',
      nationalId: '1079876543',
    },
    address: {
      city: 'الرياض',
      district: 'الياسمين',
      region: 'الرياض',
    },
    referralSource: 'pediatric_neurology',
    enrollmentDate: null,
    programs: ['OT_AUTISM', 'ST_AUTISM', 'PSY_BEHAVIORAL', 'SE_AUTISM'],
    branchCode: 'RUH-MAIN',
    notes: 'Sample beneficiary - ASD Level 3, on waiting list',
  },
  // ─── مغلق / منتهي ───────────────────────────────────────
  {
    beneficiaryNumber: 'BEN001009',
    name: { ar: 'نوف سلطان الغامدي', en: 'Nouf Sultan Al-Ghamdi' },
    gender: 'female',
    dateOfBirth: new Date('2010-06-18'),
    nationalId: '1099876552',
    nationality: 'SA',
    primaryDisability: 'PHYSICAL',
    disabilityLevel: 'HEMI',
    caseStatus: 'discharged',
    guardian: {
      name: { ar: 'سلطان أحمد الغامدي', en: 'Sultan Ahmed Al-Ghamdi' },
      relationship: 'father',
      phone: '0500123456',
      email: 'parent10@example.com',
      nationalId: '1078765432',
    },
    address: {
      city: 'الرياض',
      district: 'السليمانية',
      region: 'الرياض',
    },
    referralSource: 'hospital',
    enrollmentDate: new Date('2020-01-15'),
    dischargeDate: new Date('2023-12-31'),
    programs: ['PT_NEURO', 'OT_BASIC'],
    branchCode: 'RUH-MAIN',
    notes: 'Sample beneficiary - Successfully discharged after rehabilitation',
  },
];

async function seed(connection) {
  const db = connection.db || connection;
  const col = db.collection('beneficiaries');

  let created = 0;
  let skipped = 0;

  for (const ben of sampleBeneficiaries) {
    const existing = await col.findOne({
      $or: [{ beneficiaryNumber: ben.beneficiaryNumber }, { nationalId: ben.nationalId }],
    });

    if (existing) {
      skipped++;
      continue;
    }

    const now = new Date();
    const age = ben.dateOfBirth
      ? Math.floor((now - new Date(ben.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    await col.insertOne({
      ...ben,
      age,
      sessions: [],
      assessments: [],
      documents: [],
      invoices: [],
      metadata: { isSampleData: true, seededAt: now },
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }

  console.log(`  ✔ sample-beneficiaries: ${created} created, ${skipped} already existed`);
}

async function down(connection) {
  const db = connection.db || connection;
  const result = await db.collection('beneficiaries').deleteMany({ 'metadata.isSampleData': true });
  console.log(`  ✔ sample-beneficiaries: removed ${result.deletedCount} sample beneficiaries`);
}

module.exports = { seed, down };
