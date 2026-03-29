/**
 * Sample Employees Seed
 * بيانات موظفين تجريبية - للتطوير والاختبار فقط
 * DEV/STAGING only - NOT for production
 */

'use strict';

const sampleEmployees = [
  // ─── المعالجون والمختصون ──────────────────────────────────
  {
    employeeId: 'EMP001000',
    name: { ar: 'د. منال أحمد الزهراني', en: 'Dr. Manal Ahmed Al-Zahrani' },
    gender: 'female',
    dateOfBirth: new Date('1985-04-12'),
    nationalId: '2078901234',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائية علاج وظيفي أول', en: 'Senior Occupational Therapist' },
    department: 'OT',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2018-09-01'),
    salary: {
      basic: 12000,
      housing: 3000,
      transport: 1000,
      total: 16000,
      currency: 'SAR',
    },
    contact: {
      phone: '0551234567',
      email: 'manal.zahrani@alawael.com.sa',
      emergencyContact: { name: 'أحمد الزهراني', phone: '0551234568', relationship: 'spouse' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'العلاج الوظيفي', university: 'جامعة الملك سعود', year: 2007 },
      { degree: 'ماجستير', field: 'إعادة التأهيل', university: 'جامعة الملك سعود', year: 2010 },
    ],
    licenses: [
      { type: 'هيئة التخصصات الصحية', number: 'OT-SA-123456', expiryDate: new Date('2026-12-31') },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
    notes: 'Sample employee - Senior OT Therapist',
  },
  {
    employeeId: 'EMP001001',
    name: { ar: 'أ. خالد إبراهيم الحميد', en: 'Khalid Ibrahim Al-Hamid' },
    gender: 'male',
    dateOfBirth: new Date('1990-07-25'),
    nationalId: '1077890123',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائي علاج طبيعي', en: 'Physical Therapist' },
    department: 'PT',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2020-03-15'),
    salary: {
      basic: 9000,
      housing: 2500,
      transport: 800,
      total: 12300,
      currency: 'SAR',
    },
    contact: {
      phone: '0552345678',
      email: 'khalid.hamid@alawael.com.sa',
      emergencyContact: { name: 'إبراهيم الحميد', phone: '0552345679', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'العلاج الطبيعي',
        university: 'جامعة الملك عبدالعزيز',
        year: 2013,
      },
    ],
    licenses: [
      { type: 'هيئة التخصصات الصحية', number: 'PT-SA-234567', expiryDate: new Date('2025-12-31') },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
    notes: 'Sample employee - Physical Therapist',
  },
  {
    employeeId: 'EMP001002',
    name: { ar: 'أ. نوف سعد العسكر', en: 'Nouf Saad Al-Askar' },
    gender: 'female',
    dateOfBirth: new Date('1992-01-18'),
    nationalId: '2076789012',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائية تخاطب ولغة', en: 'Speech Language Pathologist' },
    department: 'ST',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2019-08-01'),
    salary: {
      basic: 10000,
      housing: 2700,
      transport: 800,
      total: 13500,
      currency: 'SAR',
    },
    contact: {
      phone: '0553456789',
      email: 'nouf.askar@alawael.com.sa',
      emergencyContact: { name: 'سعد العسكر', phone: '0553456790', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'اضطرابات التواصل', university: 'جامعة القصيم', year: 2014 },
    ],
    licenses: [
      { type: 'هيئة التخصصات الصحية', number: 'SLP-SA-345678', expiryDate: new Date('2026-06-30') },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
    notes: 'Sample employee - Speech Language Pathologist',
  },
  {
    employeeId: 'EMP001003',
    name: { ar: 'أ. فارس عبدالرحمن العمري', en: 'Fares Abdulrahman Al-Omari' },
    gender: 'male',
    dateOfBirth: new Date('1988-11-30'),
    nationalId: '1075678901',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائي تحليل سلوك تطبيقي', en: 'Applied Behavior Analysis Specialist (ABA)' },
    department: 'PSY',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2021-01-15'),
    salary: {
      basic: 11000,
      housing: 3000,
      transport: 800,
      total: 14800,
      currency: 'SAR',
    },
    contact: {
      phone: '0554567890',
      email: 'fares.omari@alawael.com.sa',
      emergencyContact: { name: 'عبدالرحمن العمري', phone: '0554567891', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'علم النفس', university: 'جامعة الأمير سلطان', year: 2011 },
      {
        degree: 'شهادة دولية BCBA',
        field: 'تحليل السلوك التطبيقي',
        university: 'Behavior Analyst Certification Board',
        year: 2016,
      },
    ],
    licenses: [
      { type: 'BCBA International', number: 'BCBA-123456', expiryDate: new Date('2026-01-31') },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
    notes: 'Sample employee - ABA Therapist',
  },
  {
    employeeId: 'EMP001004',
    name: { ar: 'أ. هيا محمد الشمري', en: 'Haya Mohammed Al-Shammari' },
    gender: 'female',
    dateOfBirth: new Date('1994-05-08'),
    nationalId: '2074567890',
    nationality: 'SA',
    jobTitle: { ar: 'معلمة تربية خاصة', en: 'Special Education Teacher' },
    department: 'SPECEDUC',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2022-08-15'),
    salary: {
      basic: 8500,
      housing: 2500,
      transport: 800,
      total: 11800,
      currency: 'SAR',
    },
    contact: {
      phone: '0555678901',
      email: 'haya.shammari@alawael.com.sa',
      emergencyContact: { name: 'محمد الشمري', phone: '0555678902', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'التربية الخاصة',
        university: 'جامعة الأميرة نورة',
        year: 2016,
      },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
    notes: 'Sample employee - Special Education Teacher',
  },
  // ─── الإداريون ───────────────────────────────────────────
  {
    employeeId: 'EMP001005',
    name: { ar: 'أ. سلمى عبدالله الصالح', en: 'Salma Abdullah Al-Saleh' },
    gender: 'female',
    dateOfBirth: new Date('1991-03-22'),
    nationalId: '2073456789',
    nationality: 'SA',
    jobTitle: { ar: 'مسؤولة الاستقبال وخدمة العملاء', en: 'Reception & Customer Service Officer' },
    department: 'RECEPTION',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2021-11-01'),
    salary: {
      basic: 5500,
      housing: 1500,
      transport: 600,
      total: 7600,
      currency: 'SAR',
    },
    contact: {
      phone: '0556789012',
      email: 'salma.saleh@alawael.com.sa',
      emergencyContact: { name: 'عبدالله الصالح', phone: '0556789013', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'إدارة الأعمال',
        university: 'جامعة الأعمال والتكنولوجيا',
        year: 2013,
      },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '07:30', end: '15:30' },
    notes: 'Sample employee - Reception Officer',
  },
  {
    employeeId: 'EMP001006',
    name: { ar: 'أ. مشعل سعد الجهني', en: 'Mishal Saad Al-Juhani' },
    gender: 'male',
    dateOfBirth: new Date('1987-09-15'),
    nationalId: '1072345678',
    nationality: 'SA',
    jobTitle: { ar: 'مسؤول الموارد البشرية', en: 'Human Resources Officer' },
    department: 'HR',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2019-05-01'),
    salary: {
      basic: 8000,
      housing: 2500,
      transport: 800,
      total: 11300,
      currency: 'SAR',
    },
    contact: {
      phone: '0557890123',
      email: 'mishal.juhani@alawael.com.sa',
      emergencyContact: { name: 'سعد الجهني', phone: '0557890124', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'إدارة الموارد البشرية',
        university: 'جامعة الملك فهد',
        year: 2010,
      },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
    notes: 'Sample employee - HR Officer',
  },
  {
    employeeId: 'EMP001007',
    name: { ar: 'أ. وليد عمر القرني', en: 'Walid Omar Al-Qarni' },
    gender: 'male',
    dateOfBirth: new Date('1989-12-05'),
    nationalId: '1071234567',
    nationality: 'SA',
    jobTitle: { ar: 'محاسب', en: 'Accountant' },
    department: 'FIN',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2020-07-01'),
    salary: {
      basic: 7500,
      housing: 2000,
      transport: 800,
      total: 10300,
      currency: 'SAR',
    },
    contact: {
      phone: '0558901234',
      email: 'walid.qarni@alawael.com.sa',
      emergencyContact: { name: 'عمر القرني', phone: '0558901235', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'المحاسبة', university: 'جامعة الطائف', year: 2012 },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
    notes: 'Sample employee - Accountant',
  },
  // ─── السائقون ────────────────────────────────────────────
  {
    employeeId: 'EMP001008',
    name: { ar: 'أ. أحمد فرحان البلوي', en: 'Ahmed Farhan Al-Balawi' },
    gender: 'male',
    dateOfBirth: new Date('1983-06-20'),
    nationalId: '1070123456',
    nationality: 'SA',
    jobTitle: { ar: 'سائق', en: 'Driver' },
    department: 'TRANSPORT',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2022-01-10'),
    salary: {
      basic: 3500,
      housing: 1000,
      transport: 0,
      total: 4500,
      currency: 'SAR',
    },
    contact: {
      phone: '0559012345',
      email: 'ahmed.balawi@alawael.com.sa',
      emergencyContact: { name: 'فرحان البلوي', phone: '0559012346', relationship: 'father' },
    },
    qualifications: [],
    licenses: [{ type: 'رخصة قيادة', number: 'DL-SA-123456', expiryDate: new Date('2027-03-31') }],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '07:00', end: '15:00' },
    notes: 'Sample employee - Driver',
  },
  // ─── موظف جديد (في الإجازة) ─────────────────────────────
  {
    employeeId: 'EMP001009',
    name: { ar: 'أ. دانة محمد المطيري', en: 'Dana Mohammed Al-Mutairi' },
    gender: 'female',
    dateOfBirth: new Date('1995-08-14'),
    nationalId: '2069012345',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائية اجتماعية', en: 'Social Worker' },
    department: 'SW',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'on_leave',
    hireDate: new Date('2023-03-01'),
    salary: {
      basic: 7000,
      housing: 2000,
      transport: 700,
      total: 9700,
      currency: 'SAR',
    },
    contact: {
      phone: '0550123456',
      email: 'dana.mutairi@alawael.com.sa',
      emergencyContact: { name: 'محمد المطيري', phone: '0550123457', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'الخدمة الاجتماعية',
        university: 'جامعة الأميرة نورة',
        year: 2017,
      },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
    notes: 'Sample employee - Social Worker (currently on maternity leave)',
  },
];

async function seed(connection) {
  const db = connection.db || connection;
  const col = db.collection('employees');

  let created = 0;
  let skipped = 0;

  for (const emp of sampleEmployees) {
    const existing = await col.findOne({
      $or: [{ employeeId: emp.employeeId }, { nationalId: emp.nationalId }],
    });

    if (existing) {
      skipped++;
      continue;
    }

    const now = new Date();
    await col.insertOne({
      ...emp,
      attendance: [],
      leaves: [],
      payrolls: [],
      documents: [],
      metadata: { isSampleData: true, seededAt: now },
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }

  console.log(`  ✔ sample-employees: ${created} created, ${skipped} already existed`);
}

async function down(connection) {
  const db = connection.db || connection;
  const result = await db.collection('employees').deleteMany({ 'metadata.isSampleData': true });
  console.log(`  ✔ sample-employees: removed ${result.deletedCount} sample employees`);
}

module.exports = { seed, down };
