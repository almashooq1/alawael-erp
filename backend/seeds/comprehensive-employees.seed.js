/**
 * @file comprehensive-employees.seed.js
 * @description بيانات موظفين شاملة وواقعية - 30 موظف عبر 3 فروع
 * Comprehensive realistic employees seed - Al-Awael ERP
 * DEV/STAGING only - NOT for production
 */

'use strict';

const bcrypt = require('bcryptjs');
const { EXTRA_EMPLOYEES, mergeWithDefaults } = require('./seed-extensions.config');

const COMPREHENSIVE_EMPLOYEES = [
  // ══════════════════════════════════════════════════════════════════
  // مدراء الفروع
  // ══════════════════════════════════════════════════════════════════
  {
    employeeId: 'MGR-RUH-001',
    name: { ar: 'أحمد بن محمد العمري', en: 'Ahmed Mohammed Al-Omari' },
    gender: 'male',
    dateOfBirth: new Date('1978-04-15'),
    nationalId: '1078901001',
    nationality: 'SA',
    jobTitle: { ar: 'مدير فرع الرياض', en: 'Riyadh Branch Manager' },
    department: 'MANAGEMENT',
    role: 'manager',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2020-03-15'),
    salary: { basic: 18000, housing: 5000, transport: 1500, total: 24500, currency: 'SAR' },
    contact: {
      phone: '0551234001',
      email: 'ahmed.omari@alawael.com.sa',
      emergencyContact: { name: 'محمد العمري', phone: '0551234002', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'إدارة الأعمال', university: 'جامعة الملك سعود', year: 2001 },
      { degree: 'ماجستير', field: 'إدارة الصحة', university: 'جامعة الملك سعود', year: 2005 },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '07:30', end: '16:30' },
  },
  {
    employeeId: 'MGR-JED-001',
    name: { ar: 'فاطمة بنت خالد الزهراني', en: 'Fatimah Khalid Al-Zahrani' },
    gender: 'female',
    dateOfBirth: new Date('1982-07-20'),
    nationalId: '2082901002',
    nationality: 'SA',
    jobTitle: { ar: 'مديرة فرع جدة', en: 'Jeddah Branch Manager' },
    department: 'MANAGEMENT',
    role: 'manager',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2021-01-10'),
    salary: { basic: 17000, housing: 4500, transport: 1500, total: 23000, currency: 'SAR' },
    contact: {
      phone: '0552234002',
      email: 'fatimah.zahrani@alawael.com.sa',
      emergencyContact: { name: 'خالد الزهراني', phone: '0552234003', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'إدارة الخدمات الصحية',
        university: 'جامعة الملك عبدالعزيز',
        year: 2004,
      },
      {
        degree: 'ماجستير',
        field: 'إدارة الجودة الصحية',
        university: 'جامعة الملك عبدالعزيز',
        year: 2008,
      },
    ],
    branchCode: 'JED-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '07:30', end: '16:30' },
  },
  {
    employeeId: 'MGR-DAM-001',
    name: { ar: 'سعود بن عبدالله الدوسري', en: 'Saud Abdullah Al-Dosari' },
    gender: 'male',
    dateOfBirth: new Date('1980-11-08'),
    nationalId: '1080901003',
    nationality: 'SA',
    jobTitle: { ar: 'مدير فرع الدمام', en: 'Dammam Branch Manager' },
    department: 'MANAGEMENT',
    role: 'manager',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2021-06-01'),
    salary: { basic: 17000, housing: 4500, transport: 1500, total: 23000, currency: 'SAR' },
    contact: {
      phone: '0553234003',
      email: 'saud.dosari@alawael.com.sa',
      emergencyContact: { name: 'عبدالله الدوسري', phone: '0553234004', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'العلوم الإدارية', university: 'جامعة الملك فهد', year: 2003 },
    ],
    branchCode: 'DAM-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '07:30', end: '16:30' },
  },

  // ══════════════════════════════════════════════════════════════════
  // أخصائيون - فرع الرياض
  // ══════════════════════════════════════════════════════════════════
  {
    employeeId: 'THR-RUH-001',
    name: { ar: 'نورة بنت عبدالرحمن القحطاني', en: 'Noura Abdulrahman Al-Qahtani' },
    gender: 'female',
    dateOfBirth: new Date('1990-03-12'),
    nationalId: '2090901004',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائية نطق ولغة أولى', en: 'Senior Speech & Language Therapist' },
    department: 'ST',
    role: 'therapist',
    specialty: 'speech_therapy',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2021-02-01'),
    salary: { basic: 12000, housing: 3000, transport: 800, total: 15800, currency: 'SAR' },
    contact: {
      phone: '0554234004',
      email: 'noura.qahtani@alawael.com.sa',
      emergencyContact: { name: 'عبدالرحمن القحطاني', phone: '0554234005', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'اضطرابات التواصل',
        university: 'جامعة الملك سعود',
        year: 2012,
      },
      {
        degree: 'ماجستير',
        field: 'أمراض النطق واللغة',
        university: 'جامعة الملك سعود',
        year: 2015,
      },
    ],
    licenses: [
      {
        type: 'هيئة التخصصات الصحية',
        number: 'SCFHS-ST-00123',
        expiryDate: new Date('2026-12-31'),
      },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },
  {
    employeeId: 'THR-RUH-002',
    name: { ar: 'محمد بن علي الشهراني', en: 'Mohammed Ali Al-Shahrani' },
    gender: 'male',
    dateOfBirth: new Date('1988-09-25'),
    nationalId: '1088901005',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائي علاج وظيفي', en: 'Occupational Therapist' },
    department: 'OT',
    role: 'therapist',
    specialty: 'occupational_therapy',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2022-03-15'),
    salary: { basic: 10500, housing: 2800, transport: 800, total: 14100, currency: 'SAR' },
    contact: {
      phone: '0555234005',
      email: 'mohammed.shahrani@alawael.com.sa',
      emergencyContact: { name: 'علي الشهراني', phone: '0555234006', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'العلاج الوظيفي', university: 'جامعة الملك سعود', year: 2011 },
    ],
    licenses: [
      {
        type: 'هيئة التخصصات الصحية',
        number: 'SCFHS-OT-00456',
        expiryDate: new Date('2026-06-30'),
      },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },
  {
    employeeId: 'THR-RUH-003',
    name: { ar: 'سارة بنت فهد العتيبي', en: 'Sarah Fahad Al-Otaibi' },
    gender: 'female',
    dateOfBirth: new Date('1992-06-18'),
    nationalId: '2092901006',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائية علاج طبيعي', en: 'Physical Therapist' },
    department: 'PT',
    role: 'therapist',
    specialty: 'physical_therapy',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2021-09-01'),
    salary: { basic: 11000, housing: 3000, transport: 800, total: 14800, currency: 'SAR' },
    contact: {
      phone: '0556234006',
      email: 'sarah.otaibi@alawael.com.sa',
      emergencyContact: { name: 'فهد العتيبي', phone: '0556234007', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'العلاج الطبيعي',
        university: 'جامعة الملك عبدالعزيز',
        year: 2014,
      },
    ],
    licenses: [
      {
        type: 'هيئة التخصصات الصحية',
        number: 'SCFHS-PT-00789',
        expiryDate: new Date('2027-03-31'),
      },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },
  {
    employeeId: 'THR-RUH-004',
    name: { ar: 'خالد بن ناصر الغامدي', en: 'Khalid Nasser Al-Ghamdi' },
    gender: 'male',
    dateOfBirth: new Date('1987-12-05'),
    nationalId: '1087901007',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائي تحليل سلوك تطبيقي', en: 'Applied Behavior Analyst (ABA)' },
    department: 'PSY',
    role: 'therapist',
    specialty: 'behavior_therapy',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2022-01-15'),
    salary: { basic: 12000, housing: 3000, transport: 800, total: 15800, currency: 'SAR' },
    contact: {
      phone: '0557234007',
      email: 'khalid.ghamdi@alawael.com.sa',
      emergencyContact: { name: 'ناصر الغامدي', phone: '0557234008', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'علم النفس', university: 'جامعة الأمير سلطان', year: 2010 },
      {
        degree: 'شهادة BCBA',
        field: 'تحليل السلوك التطبيقي',
        university: 'BACB International',
        year: 2015,
      },
    ],
    licenses: [
      {
        type: 'BCBA International',
        number: 'BCBA-SCFHS-00321',
        expiryDate: new Date('2026-01-31'),
      },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },
  {
    employeeId: 'THR-RUH-005',
    name: { ar: 'هند بنت سالم الحربي', en: 'Hind Salem Al-Harbi' },
    gender: 'female',
    dateOfBirth: new Date('1993-02-28'),
    nationalId: '2093901008',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائية تربية خاصة', en: 'Special Education Specialist' },
    department: 'SPECEDUC',
    role: 'therapist',
    specialty: 'special_education',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2022-08-15'),
    salary: { basic: 9500, housing: 2500, transport: 800, total: 12800, currency: 'SAR' },
    contact: {
      phone: '0558234008',
      email: 'hind.harbi@alawael.com.sa',
      emergencyContact: { name: 'سالم الحربي', phone: '0558234009', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'التربية الخاصة',
        university: 'جامعة الأميرة نورة',
        year: 2015,
      },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },
  {
    employeeId: 'THR-RUH-006',
    name: { ar: 'عمر بن حسن السبيعي', en: 'Omar Hassan Al-Subaie' },
    gender: 'male',
    dateOfBirth: new Date('1991-05-10'),
    nationalId: '1091901009',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائي نفسي', en: 'Psychologist' },
    department: 'PSY',
    role: 'therapist',
    specialty: 'psychology',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2023-01-01'),
    salary: { basic: 11000, housing: 3000, transport: 800, total: 14800, currency: 'SAR' },
    contact: {
      phone: '0559234009',
      email: 'omar.subaie@alawael.com.sa',
      emergencyContact: { name: 'حسن السبيعي', phone: '0559234010', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'علم النفس', university: 'جامعة القصيم', year: 2013 },
      {
        degree: 'ماجستير',
        field: 'علم النفس الإكلينيكي',
        university: 'جامعة الملك سعود',
        year: 2016,
      },
    ],
    licenses: [
      {
        type: 'هيئة التخصصات الصحية',
        number: 'SCFHS-PS-00987',
        expiryDate: new Date('2027-06-30'),
      },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },

  // ══════════════════════════════════════════════════════════════════
  // أخصائيون - فرع جدة
  // ══════════════════════════════════════════════════════════════════
  {
    employeeId: 'THR-JED-001',
    name: { ar: 'ريم بنت ماجد السلمي', en: 'Reem Majed Al-Sulami' },
    gender: 'female',
    dateOfBirth: new Date('1989-08-14'),
    nationalId: '2089901010',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائية نطق ولغة أولى', en: 'Senior Speech & Language Therapist' },
    department: 'ST',
    role: 'therapist',
    specialty: 'speech_therapy',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2021-03-01'),
    salary: { basic: 12000, housing: 3000, transport: 800, total: 15800, currency: 'SAR' },
    contact: {
      phone: '0526234010',
      email: 'reem.sulami@alawael.com.sa',
      emergencyContact: { name: 'ماجد السلمي', phone: '0526234011', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'اضطرابات التواصل',
        university: 'جامعة الملك عبدالعزيز',
        year: 2011,
      },
      { degree: 'ماجستير', field: 'أمراض النطق', university: 'جامعة الملك عبدالعزيز', year: 2014 },
    ],
    licenses: [
      {
        type: 'هيئة التخصصات الصحية',
        number: 'SCFHS-ST-00234',
        expiryDate: new Date('2027-01-31'),
      },
    ],
    branchCode: 'JED-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },
  {
    employeeId: 'THR-JED-002',
    name: { ar: 'بدر بن سعد الشمراني', en: 'Badr Saad Al-Shamrani' },
    gender: 'male',
    dateOfBirth: new Date('1991-11-22'),
    nationalId: '1091901011',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائي علاج طبيعي', en: 'Physical Therapist' },
    department: 'PT',
    role: 'therapist',
    specialty: 'physical_therapy',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2022-06-01'),
    salary: { basic: 10500, housing: 2800, transport: 800, total: 14100, currency: 'SAR' },
    contact: {
      phone: '0527234011',
      email: 'badr.shamrani@alawael.com.sa',
      emergencyContact: { name: 'سعد الشمراني', phone: '0527234012', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'العلاج الطبيعي', university: 'جامعة الملك سعود', year: 2013 },
    ],
    licenses: [
      {
        type: 'هيئة التخصصات الصحية',
        number: 'SCFHS-PT-00345',
        expiryDate: new Date('2026-08-31'),
      },
    ],
    branchCode: 'JED-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },
  {
    employeeId: 'THR-JED-003',
    name: { ar: 'لمى بنت عادل الأحمدي', en: 'Lama Adel Al-Ahmadi' },
    gender: 'female',
    dateOfBirth: new Date('1994-03-07'),
    nationalId: '2094901012',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائية علاج وظيفي', en: 'Occupational Therapist' },
    department: 'OT',
    role: 'therapist',
    specialty: 'occupational_therapy',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2023-03-15'),
    salary: { basic: 10000, housing: 2700, transport: 800, total: 13500, currency: 'SAR' },
    contact: {
      phone: '0528234012',
      email: 'lama.ahmadi@alawael.com.sa',
      emergencyContact: { name: 'عادل الأحمدي', phone: '0528234013', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'العلاج الوظيفي',
        university: 'جامعة الملك عبدالعزيز',
        year: 2016,
      },
    ],
    licenses: [
      {
        type: 'هيئة التخصصات الصحية',
        number: 'SCFHS-OT-00567',
        expiryDate: new Date('2026-09-30'),
      },
    ],
    branchCode: 'JED-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },
  {
    employeeId: 'THR-JED-004',
    name: { ar: 'فيصل بن يوسف المالكي', en: 'Faisal Yousef Al-Malki' },
    gender: 'male',
    dateOfBirth: new Date('1990-07-30'),
    nationalId: '1090901013',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائي تحليل سلوك', en: 'Behavior Analyst' },
    department: 'PSY',
    role: 'therapist',
    specialty: 'behavior_therapy',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2022-11-01'),
    salary: { basic: 11000, housing: 3000, transport: 800, total: 14800, currency: 'SAR' },
    contact: {
      phone: '0529234013',
      email: 'faisal.malki@alawael.com.sa',
      emergencyContact: { name: 'يوسف المالكي', phone: '0529234014', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'علم النفس', university: 'جامعة جدة', year: 2012 },
      {
        degree: 'شهادة BCaBA',
        field: 'تحليل السلوك',
        university: 'BACB International',
        year: 2017,
      },
    ],
    licenses: [{ type: 'SCFHS-BA', number: 'SCFHS-BA-00432', expiryDate: new Date('2026-12-31') }],
    branchCode: 'JED-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },

  // ══════════════════════════════════════════════════════════════════
  // أخصائيون - فرع الدمام
  // ══════════════════════════════════════════════════════════════════
  {
    employeeId: 'THR-DAM-001',
    name: { ar: 'ياسر بن عبدالعزيز الشريف', en: 'Yasser Abdulaziz Al-Sharif' },
    gender: 'male',
    dateOfBirth: new Date('1989-01-15'),
    nationalId: '1089901014',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائي نطق ولغة', en: 'Speech & Language Therapist' },
    department: 'ST',
    role: 'therapist',
    specialty: 'speech_therapy',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2022-09-01'),
    salary: { basic: 11000, housing: 3000, transport: 800, total: 14800, currency: 'SAR' },
    contact: {
      phone: '0538234014',
      email: 'yasser.sharif@alawael.com.sa',
      emergencyContact: { name: 'عبدالعزيز الشريف', phone: '0538234015', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'اضطرابات التواصل', university: 'جامعة الملك فهد', year: 2011 },
    ],
    licenses: [
      {
        type: 'هيئة التخصصات الصحية',
        number: 'SCFHS-ST-00555',
        expiryDate: new Date('2026-11-30'),
      },
    ],
    branchCode: 'DAM-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },
  {
    employeeId: 'THR-DAM-002',
    name: { ar: 'دلال بنت صالح العنزي', en: 'Dalal Saleh Al-Anazi' },
    gender: 'female',
    dateOfBirth: new Date('1993-10-20'),
    nationalId: '2093901015',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائية علاج وظيفي', en: 'Occupational Therapist' },
    department: 'OT',
    role: 'therapist',
    specialty: 'occupational_therapy',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2023-05-01'),
    salary: { basic: 10000, housing: 2700, transport: 800, total: 13500, currency: 'SAR' },
    contact: {
      phone: '0539234015',
      email: 'dalal.anazi@alawael.com.sa',
      emergencyContact: { name: 'صالح العنزي', phone: '0539234016', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'العلاج الوظيفي', university: 'جامعة الملك فيصل', year: 2015 },
    ],
    licenses: [
      {
        type: 'هيئة التخصصات الصحية',
        number: 'SCFHS-OT-00666',
        expiryDate: new Date('2027-05-31'),
      },
    ],
    branchCode: 'DAM-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },
  {
    employeeId: 'THR-DAM-003',
    name: { ar: 'تركي بن محمد الشهري', en: 'Turki Mohammed Al-Shahri' },
    gender: 'male',
    dateOfBirth: new Date('1990-04-25'),
    nationalId: '1090901016',
    nationality: 'SA',
    jobTitle: { ar: 'أخصائي علاج طبيعي', en: 'Physical Therapist' },
    department: 'PT',
    role: 'therapist',
    specialty: 'physical_therapy',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2022-12-15'),
    salary: { basic: 10500, housing: 2800, transport: 800, total: 14100, currency: 'SAR' },
    contact: {
      phone: '0540234016',
      email: 'turki.shahri@alawael.com.sa',
      emergencyContact: { name: 'محمد الشهري', phone: '0540234017', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'العلاج الطبيعي', university: 'جامعة الملك فهد', year: 2012 },
    ],
    licenses: [
      {
        type: 'هيئة التخصصات الصحية',
        number: 'SCFHS-PT-00777',
        expiryDate: new Date('2026-07-31'),
      },
    ],
    branchCode: 'DAM-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },

  // ══════════════════════════════════════════════════════════════════
  // موظفو الاستقبال
  // ══════════════════════════════════════════════════════════════════
  {
    employeeId: 'REC-RUH-001',
    name: { ar: 'مها بنت سليمان الراجحي', en: 'Maha Suleiman Al-Rajhi' },
    gender: 'female',
    dateOfBirth: new Date('1995-06-12'),
    nationalId: '2095901017',
    nationality: 'SA',
    jobTitle: { ar: 'موظفة استقبال', en: 'Receptionist' },
    department: 'RECEPTION',
    role: 'receptionist',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2022-06-01'),
    salary: { basic: 5500, housing: 1500, transport: 600, total: 7600, currency: 'SAR' },
    contact: {
      phone: '0554234017',
      email: 'maha.rajhi@alawael.com.sa',
      emergencyContact: { name: 'سليمان الراجحي', phone: '0554234018', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'إدارة الأعمال',
        university: 'جامعة الأعمال والتكنولوجيا',
        year: 2017,
      },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '07:30', end: '15:30' },
  },
  {
    employeeId: 'REC-JED-001',
    name: { ar: 'وفاء بنت أحمد البيشي', en: 'Wafaa Ahmed Al-Bishi' },
    gender: 'female',
    dateOfBirth: new Date('1996-02-18'),
    nationalId: '2096901018',
    nationality: 'SA',
    jobTitle: { ar: 'موظفة استقبال', en: 'Receptionist' },
    department: 'RECEPTION',
    role: 'receptionist',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2022-09-01'),
    salary: { basic: 5500, housing: 1500, transport: 600, total: 7600, currency: 'SAR' },
    contact: {
      phone: '0526234018',
      email: 'wafaa.bishi@alawael.com.sa',
      emergencyContact: { name: 'أحمد البيشي', phone: '0526234019', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'إدارة الخدمات الصحية',
        university: 'جامعة الملك عبدالعزيز',
        year: 2018,
      },
    ],
    branchCode: 'JED-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '07:30', end: '15:30' },
  },
  {
    employeeId: 'REC-DAM-001',
    name: { ar: 'هيفاء بنت راشد المطيري', en: 'Haifa Rashed Al-Mutairi' },
    gender: 'female',
    dateOfBirth: new Date('1997-09-05'),
    nationalId: '2097901019',
    nationality: 'SA',
    jobTitle: { ar: 'موظفة استقبال', en: 'Receptionist' },
    department: 'RECEPTION',
    role: 'receptionist',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2023-01-15'),
    salary: { basic: 5500, housing: 1500, transport: 600, total: 7600, currency: 'SAR' },
    contact: {
      phone: '0538234019',
      email: 'haifa.mutairi@alawael.com.sa',
      emergencyContact: { name: 'راشد المطيري', phone: '0538234020', relationship: 'father' },
    },
    qualifications: [
      { degree: 'دبلوم', field: 'السكرتارية الطبية', university: 'الكلية التقنية', year: 2018 },
    ],
    branchCode: 'DAM-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '07:30', end: '15:30' },
  },

  // ══════════════════════════════════════════════════════════════════
  // المحاسبون
  // ══════════════════════════════════════════════════════════════════
  {
    employeeId: 'ACC-RUH-001',
    name: { ar: 'عادل بن خالد النمري', en: 'Adel Khalid Al-Namri' },
    gender: 'male',
    dateOfBirth: new Date('1986-03-20'),
    nationalId: '1086901020',
    nationality: 'SA',
    jobTitle: { ar: 'محاسب أول', en: 'Senior Accountant' },
    department: 'FIN',
    role: 'accountant',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2020-08-01'),
    salary: { basic: 9000, housing: 2500, transport: 800, total: 12300, currency: 'SAR' },
    contact: {
      phone: '0554234020',
      email: 'adel.namri@alawael.com.sa',
      emergencyContact: { name: 'خالد النمري', phone: '0554234021', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'المحاسبة', university: 'جامعة الملك سعود', year: 2009 },
      { degree: 'زمالة CPA', field: 'المحاسبة القانونية', university: 'SOCPA', year: 2014 },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },
  {
    employeeId: 'ACC-JED-001',
    name: { ar: 'سلمى بنت حسين الفيفي', en: 'Salma Hussein Al-Faifi' },
    gender: 'female',
    dateOfBirth: new Date('1990-12-15'),
    nationalId: '2090901021',
    nationality: 'SA',
    jobTitle: { ar: 'محاسبة', en: 'Accountant' },
    department: 'FIN',
    role: 'accountant',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2021-11-01'),
    salary: { basic: 8000, housing: 2000, transport: 800, total: 10800, currency: 'SAR' },
    contact: {
      phone: '0526234021',
      email: 'salma.faifi@alawael.com.sa',
      emergencyContact: { name: 'حسين الفيفي', phone: '0526234022', relationship: 'father' },
    },
    qualifications: [
      { degree: 'بكالوريوس', field: 'المحاسبة', university: 'جامعة الملك عبدالعزيز', year: 2013 },
    ],
    branchCode: 'JED-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },

  // ══════════════════════════════════════════════════════════════════
  // الموارد البشرية
  // ══════════════════════════════════════════════════════════════════
  {
    employeeId: 'HR-RUH-001',
    name: { ar: 'عبير بنت صالح الحمدان', en: 'Abeer Saleh Al-Hamdan' },
    gender: 'female',
    dateOfBirth: new Date('1984-08-25'),
    nationalId: '2084901022',
    nationality: 'SA',
    jobTitle: { ar: 'مديرة الموارد البشرية', en: 'HR Manager' },
    department: 'HR',
    role: 'hr_officer',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2020-06-01'),
    salary: { basic: 14000, housing: 3500, transport: 1000, total: 18500, currency: 'SAR' },
    contact: {
      phone: '0554234022',
      email: 'abeer.hamdan@alawael.com.sa',
      emergencyContact: { name: 'صالح الحمدان', phone: '0554234023', relationship: 'father' },
    },
    qualifications: [
      {
        degree: 'بكالوريوس',
        field: 'إدارة الموارد البشرية',
        university: 'جامعة الأميرة نورة',
        year: 2007,
      },
      { degree: 'ماجستير', field: 'إدارة الأعمال', university: 'جامعة الملك فهد', year: 2011 },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '16:00' },
  },

  // ══════════════════════════════════════════════════════════════════
  // السائقون
  // ══════════════════════════════════════════════════════════════════
  {
    employeeId: 'DRV-RUH-001',
    name: { ar: 'سالم بن مبارك العجمي', en: 'Salem Mubarak Al-Ajmi' },
    gender: 'male',
    dateOfBirth: new Date('1985-04-08'),
    nationalId: '1085901023',
    nationality: 'SA',
    jobTitle: { ar: 'سائق نقل مستفيدين', en: 'Beneficiary Transport Driver' },
    department: 'TRANSPORT',
    role: 'driver',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2022-01-15'),
    salary: { basic: 4000, housing: 1000, transport: 0, total: 5000, currency: 'SAR' },
    contact: {
      phone: '0554234023',
      email: 'salem.ajmi@alawael.com.sa',
      emergencyContact: { name: 'مبارك العجمي', phone: '0554234024', relationship: 'father' },
    },
    qualifications: [],
    licenses: [
      {
        type: 'رخصة قيادة مركبات ثقيلة',
        number: 'DL-HVY-112233',
        expiryDate: new Date('2027-06-30'),
      },
    ],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '06:30', end: '14:30' },
  },
  {
    employeeId: 'DRV-RUH-002',
    name: { ar: 'ناصر بن فهد الرشيدي', en: 'Nasser Fahad Al-Rashidi' },
    gender: 'male',
    dateOfBirth: new Date('1987-11-14'),
    nationalId: '1087901024',
    nationality: 'SA',
    jobTitle: { ar: 'سائق نقل مستفيدين', en: 'Beneficiary Transport Driver' },
    department: 'TRANSPORT',
    role: 'driver',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2023-03-01'),
    salary: { basic: 4000, housing: 1000, transport: 0, total: 5000, currency: 'SAR' },
    contact: {
      phone: '0554234024',
      email: 'nasser.rashidi@alawael.com.sa',
      emergencyContact: { name: 'فهد الرشيدي', phone: '0554234025', relationship: 'father' },
    },
    qualifications: [],
    licenses: [{ type: 'رخصة قيادة', number: 'DL-444556', expiryDate: new Date('2026-12-31') }],
    branchCode: 'RUH-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '06:30', end: '14:30' },
  },
  {
    employeeId: 'DRV-JED-001',
    name: { ar: 'حمدان بن سعيد اليامي', en: 'Hamdan Saeed Al-Yami' },
    gender: 'male',
    dateOfBirth: new Date('1986-07-22'),
    nationalId: '1086901025',
    nationality: 'SA',
    jobTitle: { ar: 'سائق نقل مستفيدين', en: 'Beneficiary Transport Driver' },
    department: 'TRANSPORT',
    role: 'driver',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2022-08-01'),
    salary: { basic: 4000, housing: 1000, transport: 0, total: 5000, currency: 'SAR' },
    contact: {
      phone: '0526234025',
      email: 'hamdan.yami@alawael.com.sa',
      emergencyContact: { name: 'سعيد اليامي', phone: '0526234026', relationship: 'father' },
    },
    qualifications: [],
    licenses: [{ type: 'رخصة قيادة', number: 'DL-778899', expiryDate: new Date('2027-03-31') }],
    branchCode: 'JED-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '06:30', end: '14:30' },
  },
  {
    employeeId: 'DRV-DAM-001',
    name: { ar: 'مشعل بن راشد الهاجري', en: 'Meshal Rashed Al-Hajri' },
    gender: 'male',
    dateOfBirth: new Date('1988-02-10'),
    nationalId: '1088901026',
    nationality: 'SA',
    jobTitle: { ar: 'سائق نقل مستفيدين', en: 'Beneficiary Transport Driver' },
    department: 'TRANSPORT',
    role: 'driver',
    employmentType: 'fulltime',
    contractType: 'permanent',
    status: 'active',
    hireDate: new Date('2023-06-15'),
    salary: { basic: 4000, housing: 1000, transport: 0, total: 5000, currency: 'SAR' },
    contact: {
      phone: '0538234026',
      email: 'meshal.hajri@alawael.com.sa',
      emergencyContact: { name: 'راشد الهاجري', phone: '0538234027', relationship: 'father' },
    },
    qualifications: [],
    licenses: [{ type: 'رخصة قيادة', number: 'DL-991122', expiryDate: new Date('2028-01-31') }],
    branchCode: 'DAM-MAIN',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '06:30', end: '14:30' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed Function
// ─────────────────────────────────────────────────────────────────────────────
async function seed(connection) {
  const db = connection.db || (connection.connection && connection.connection.db) || connection;
  if (!db) throw new Error('No database connection');

  const col = db.collection('employees');
  const usersCol = db.collection('users');

  // دمج الموظفين الافتراضيين مع الإضافيين من seed-extensions.config.js
  const allEmployees = mergeWithDefaults(COMPREHENSIVE_EMPLOYEES, EXTRA_EMPLOYEES, 'employeeId');
  if (EXTRA_EMPLOYEES.length > 0) {
    console.log(`  ℹ️  إضافة ${EXTRA_EMPLOYEES.length} موظف إضافي من seed-extensions.config.js`);
  }

  let created = 0;
  let skipped = 0;

  for (const emp of allEmployees) {
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
      email: emp.contact.email,
      phone: emp.contact.phone,
      attendance: [],
      leaves: [],
      payrolls: [],
      documents: [],
      metadata: { isComprehensiveSeed: true, seededAt: now },
      createdAt: now,
      updatedAt: now,
    });

    // إنشاء حساب مستخدم مرتبط بالموظف
    const userExists = await usersCol.findOne({ email: emp.contact.email });
    if (!userExists) {
      const seedPassword = process.env.SEED_USER_PASSWORD || process.env.ADMIN_PASSWORD;
      if (!seedPassword) {
        console.log(
          `  ⏭  Skipping user account for ${emp.contact.email} — SEED_USER_PASSWORD not set`
        );
        continue;
      }
      const passwordHash = await bcrypt.hash(seedPassword, 12);
      await usersCol.insertOne({
        email: emp.contact.email,
        phone: emp.contact.phone,
        fullName: emp.name.ar,
        password: passwordHash,
        role: emp.role,
        branch: emp.branchCode,
        isActive: emp.status === 'active',
        employeeRef: emp.employeeId,
        specialty: emp.specialty || null,
        metadata: { isComprehensiveSeed: true, seededAt: now },
        createdAt: now,
        updatedAt: now,
      });
    }

    created++;
  }

  console.log(
    `  ✅ comprehensive-employees: ${created} created, ${skipped} already existed (total: ${COMPREHENSIVE_EMPLOYEES.length})`
  );
}

async function down(connection) {
  const db = connection.db || (connection.connection && connection.connection.db) || connection;
  const result = await db
    .collection('employees')
    .deleteMany({ 'metadata.isComprehensiveSeed': true });
  await db.collection('users').deleteMany({ 'metadata.isComprehensiveSeed': true });
  console.log(
    `  ✅ comprehensive-employees: removed ${result.deletedCount} comprehensive employees & linked users`
  );
}

module.exports = { seed, down, COMPREHENSIVE_EMPLOYEES };
