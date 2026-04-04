/**
 * @file seed-extensions.config.js
 * @description إعدادات توسعة البيانات التجريبية — Seed Extensions Configuration
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * لإضافة موظفين جدد:   أضف كائنات في EXTRA_EMPLOYEES
 * لإضافة مستفيدين:     أضف كائنات في EXTRA_BENEFICIARIES
 * لضبط الجلسات:        عدّل SESSIONS_CONFIG
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * البيانات الافتراضية:
 *   - 30 موظف في comprehensive-employees.seed.js
 *   - 50 مستفيد في comprehensive-beneficiaries.seed.js
 *   - الجلسات تُنشأ تلقائياً من الخطط العلاجية
 *
 * أي بيانات تضيفها هنا ستُدمج مع الافتراضية عند التشغيل.
 */

'use strict';

// ─── إعداد الجلسات ─────────────────────────────────────────────────────────────
/**
 * التحكم في عدد وتوزيع الجلسات المُنشأة تلقائياً
 */
const SESSIONS_CONFIG = {
  /** عدد الأشهر الماضية التي تُنشأ جلساتها (يؤثر مباشرة على إجمالي الجلسات) */
  monthsBack: 2,

  /** نسبة الحضور (0-1) */
  attendanceRate: 0.85,

  /** نسبة الغياب بعذر (من المتغيبين) */
  excusedAbsenceRate: 0.67,

  /** الحد الأقصى للجلسات لكل مستفيد في الأسبوع */
  maxSessionsPerWeekPerBeneficiary: 5,

  /** الحد الأقصى للجلسات اليومية لكل أخصائي */
  maxDailySessionsPerTherapist: 8,

  /** أيام العمل (0=الأحد ... 4=الخميس) */
  workDays: [0, 1, 2, 3, 4],

  /** مدة الجلسة الافتراضية بالدقائق */
  defaultDurationMinutes: 45,

  /** فترة الاستراحة بين الجلسات بالدقائق */
  bufferMinutes: 15,
};

// ─── موظفون إضافيون ────────────────────────────────────────────────────────────
/**
 * أضف موظفين إضافيين هنا بنفس بنية comprehensive-employees.seed.js
 * الحقول المطلوبة: employeeId, name, gender, nationalId, jobTitle, department, role,
 *                  employmentType, status, hireDate, salary, contact, branchCode
 *
 * @type {object[]}
 */
const EXTRA_EMPLOYEES = [
  // ── مثال — قم بإزالة التعليق وتعديل البيانات لإضافة موظف جديد ──
  // {
  //   employeeId: 'THR-RUH-020',
  //   name: { ar: 'سلمى بنت ناصر الشمري', en: 'Salma Nasser Al-Shamri' },
  //   gender: 'female',
  //   dateOfBirth: new Date('1990-05-12'),
  //   nationalId: '1090012345',
  //   nationality: 'SA',
  //   jobTitle: { ar: 'أخصائية علاج وظيفي', en: 'Occupational Therapist' },
  //   specialty: 'occupational_therapy',
  //   department: 'CLINICAL',
  //   role: 'therapist',
  //   employmentType: 'fulltime',
  //   contractType: 'permanent',
  //   status: 'active',
  //   hireDate: new Date('2025-01-15'),
  //   salary: { basic: 9000, housing: 2500, transport: 800, total: 12300, currency: 'SAR' },
  //   contact: {
  //     phone: '0551299020',
  //     email: 'salma.shamri@alawael.com.sa',
  //     emergencyContact: { name: 'ناصر الشمري', phone: '0551299021', relationship: 'father' },
  //   },
  //   qualifications: [
  //     { degree: 'بكالوريوس', field: 'العلاج الوظيفي', university: 'جامعة الملك سعود', year: 2012 },
  //   ],
  //   licenseNumber: 'SCFHS-OT-01234',
  //   branchCode: 'RUH-MAIN',
  //   workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
  //   workingHours: { start: '07:30', end: '16:30' },
  // },
];

// ─── مستفيدون إضافيون ──────────────────────────────────────────────────────────
/**
 * أضف مستفيدين إضافيين هنا بنفس بنية comprehensive-beneficiaries.seed.js
 * الحقول المطلوبة: beneficiaryNumber, name, gender, dateOfBirth, nationalId,
 *                  primaryDisability, caseStatus, guardian, branchCode, enrollmentDate
 *
 * @type {object[]}
 */
const EXTRA_BENEFICIARIES = [
  // ── مثال — قم بإزالة التعليق وتعديل البيانات لإضافة مستفيد جديد ──
  // {
  //   beneficiaryNumber: 'RUH-2026-051',
  //   name: { ar: 'فارس بن عبدالله التميمي', en: 'Fares Abdullah Al-Tamimi' },
  //   gender: 'male',
  //   dateOfBirth: new Date('2017-09-20'),
  //   nationalId: '1100299051',
  //   nationality: 'SA',
  //   primaryDisability: 'AUTISM',
  //   disabilityLevel: 'ASD_L1',
  //   caseStatus: 'active',
  //   guardian: {
  //     name: { ar: 'عبدالله التميمي', en: 'Abdullah Al-Tamimi' },
  //     relationship: 'father',
  //     phone: '0501299051',
  //     email: 'abdullah.tamimi.2026@gmail.com',
  //     nationalId: '1080299051',
  //   },
  //   address: { city: 'الرياض', district: 'الروضة', region: 'الرياض' },
  //   referralSource: 'school',
  //   enrollmentDate: new Date('2026-01-15'),
  //   insurance: { provider: 'tawuniya', policyNumber: 'TAW-299051', class: 'B' },
  //   programs: ['ST_AUTISM', 'OT_AUTISM'],
  //   branchCode: 'RUH-MAIN',
  //   transportRequired: false,
  // },
  // ── مثال — مستفيد في فرع جدة ──
  // {
  //   beneficiaryNumber: 'JED-2026-036',
  //   name: { ar: 'هيا بنت محمد السبيعي', en: 'Haya Mohammed Al-Subaie' },
  //   gender: 'female',
  //   dateOfBirth: new Date('2020-11-03'),
  //   nationalId: '2100299036',
  //   nationality: 'SA',
  //   primaryDisability: 'DOWN_SYNDROME',
  //   disabilityLevel: 'MODERATE',
  //   caseStatus: 'active',
  //   guardian: {
  //     name: { ar: 'محمد السبيعي', en: 'Mohammed Al-Subaie' },
  //     relationship: 'father',
  //     phone: '0561299036',
  //     email: 'mohammed.subaie.jed@gmail.com',
  //     nationalId: '2080299036',
  //   },
  //   address: { city: 'جدة', district: 'الروضة', region: 'مكة المكرمة' },
  //   referralSource: 'doctor',
  //   enrollmentDate: new Date('2026-02-01'),
  //   insurance: { provider: 'medgulf', policyNumber: 'MG-299036', class: 'A' },
  //   programs: ['PT_DOWN', 'ST_DOWN', 'OT_DOWN'],
  //   branchCode: 'JED-MAIN',
  //   transportRequired: true,
  //   transportAddress: 'حي الروضة، جدة',
  // },
];

// ─── دالة دمج البيانات مع الافتراضية ─────────────────────────────────────────
/**
 * تدمج البيانات الإضافية مع المصفوفة الافتراضية
 * @template T
 * @param {T[]} defaults - البيانات الافتراضية
 * @param {T[]} extras - البيانات الإضافية
 * @param {string} uniqueKey - الحقل الفريد للمقارنة
 * @returns {T[]}
 */
function mergeWithDefaults(defaults, extras, uniqueKey) {
  if (!extras || extras.length === 0) return defaults;

  const defaultKeys = new Set(defaults.map(d => d[uniqueKey]));
  const newItems = extras.filter(e => {
    if (defaultKeys.has(e[uniqueKey])) {
      console.warn(
        `  ⚠️  ${uniqueKey}='${e[uniqueKey]}' موجود مسبقاً في البيانات الافتراضية، تم التجاهل`
      );
      return false;
    }
    return true;
  });

  return [...defaults, ...newItems];
}

module.exports = {
  SESSIONS_CONFIG,
  EXTRA_EMPLOYEES,
  EXTRA_BENEFICIARIES,
  mergeWithDefaults,
};
