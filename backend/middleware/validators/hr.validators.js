/**
 * HR Validation Rules
 * قواعد التحقق لوحدة الموارد البشرية
 */

const { body } = require('express-validator');
const {
  mongoId,
  dateRangeRules,
  requiredString,
  optionalString,
  requiredDate,
  optionalDate,
  requiredEnum,
  optionalEnum,
  optionalAmount,
  phoneField,
  bodyMongoId,
  queryEnum,
  queryString,
  paginationRules,
} = require('./common.validators');

// ═══ EMPLOYEES ═══════════════════════════════════════════════════════════════

const createEmployee = [
  requiredString('firstName', 'الاسم الأول', { max: 100 }),
  requiredString('lastName', 'اسم العائلة', { max: 100 }),
  optionalString('firstNameEn', 'الاسم بالإنجليزية', { max: 100 }),
  optionalString('lastNameEn', 'اسم العائلة بالإنجليزية', { max: 100 }),
  body('email').optional().isEmail().withMessage('البريد الإلكتروني غير صالح'),
  phoneField('phone', false),
  phoneField('mobile', false),
  optionalString('nationalId', 'رقم الهوية', { max: 20 }),
  optionalDate('dateOfBirth', 'تاريخ الميلاد'),
  optionalEnum('gender', 'الجنس', ['male', 'female']),
  optionalEnum('maritalStatus', 'الحالة الاجتماعية', ['single', 'married', 'divorced', 'widowed']),
  // Employment Info
  optionalString('employeeNumber', 'الرقم الوظيفي', { max: 50 }),
  optionalString('department', 'القسم', { max: 100 }),
  optionalString('position', 'المسمى الوظيفي', { max: 100 }),
  optionalEnum('employmentType', 'نوع التوظيف', [
    'full-time',
    'part-time',
    'contract',
    'temporary',
    'intern',
  ]),
  optionalDate('joinDate', 'تاريخ الالتحاق'),
  optionalDate('contractEndDate', 'تاريخ انتهاء العقد'),
  optionalEnum('status', 'الحالة', ['active', 'inactive', 'on_leave', 'terminated', 'resigned']),
  // Salary
  optionalAmount('basicSalary', 'الراتب الأساسي'),
  optionalAmount('housingAllowance', 'بدل السكن'),
  optionalAmount('transportAllowance', 'بدل النقل'),
  optionalAmount('otherAllowances', 'بدلات أخرى'),
  // Address
  optionalString('address.street', 'الشارع', { max: 200 }),
  optionalString('address.city', 'المدينة', { max: 100 }),
  optionalString('address.region', 'المنطقة', { max: 100 }),
  optionalString('address.country', 'الدولة', { max: 100 }),
  // Bank
  optionalString('bankInfo.bankName', 'اسم البنك', { max: 100 }),
  optionalString('bankInfo.accountNumber', 'رقم الحساب', { max: 50 }),
  optionalString('bankInfo.iban', 'الآيبان', { max: 50 }),
  // Notes
  optionalString('notes', 'ملاحظات', { max: 2000 }),
];

const updateEmployee = [mongoId('id'), ...createEmployee];

const listEmployees = [
  ...paginationRules,
  queryString('search', 'البحث'),
  queryEnum('status', 'الحالة', ['active', 'inactive', 'on_leave', 'terminated', 'resigned']),
  queryString('department', 'القسم'),
];

// ═══ PAYROLL ═════════════════════════════════════════════════════════════════

const calculatePayroll = [
  body('month')
    .notEmpty()
    .withMessage('الشهر مطلوب')
    .isInt({ min: 1, max: 12 })
    .withMessage('الشهر يجب أن يكون بين 1 و 12'),
  body('year')
    .notEmpty()
    .withMessage('السنة مطلوبة')
    .isInt({ min: 2020, max: 2100 })
    .withMessage('السنة غير صالحة'),
];

const listPayroll = [
  ...paginationRules,
  queryString('month', 'الشهر'),
  queryString('year', 'السنة'),
  queryString('employee', 'الموظف'),
];

// ═══ LEAVES ══════════════════════════════════════════════════════════════════

const requestLeave = [
  requiredEnum('type', 'نوع الإجازة', [
    'annual',
    'sick',
    'emergency',
    'unpaid',
    'maternity',
    'paternity',
    'other',
  ]),
  requiredDate('startDate', 'تاريخ البداية'),
  requiredDate('endDate', 'تاريخ النهاية'),
  optionalString('reason', 'السبب', { max: 1000 }),
  optionalString('notes', 'ملاحظات', { max: 1000 }),
];

const rejectLeave = [mongoId('id'), requiredString('reason', 'سبب الرفض', { max: 1000 })];

const listLeaves = [
  ...paginationRules,
  queryEnum('status', 'الحالة', ['pending', 'approved', 'rejected', 'cancelled']),
  queryEnum('type', 'النوع', [
    'annual',
    'sick',
    'emergency',
    'unpaid',
    'maternity',
    'paternity',
    'other',
  ]),
  queryString('employee', 'الموظف'),
  ...dateRangeRules,
];

// ═══ PERFORMANCE ═════════════════════════════════════════════════════════════

const createReview = [
  bodyMongoId('employee', 'الموظف'),
  requiredString('period', 'الفترة', { max: 50 }),
  body('overallRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('التقييم يجب أن يكون بين 0 و 5'),
  optionalString('strengths', 'نقاط القوة', { max: 2000 }),
  optionalString('improvements', 'مجالات التحسين', { max: 2000 }),
  optionalString('goals', 'الأهداف', { max: 2000 }),
  optionalString('managerComments', 'ملاحظات المدير', { max: 2000 }),
  optionalString('employeeComments', 'ملاحظات الموظف', { max: 2000 }),
];

// ═══ TRAINING ════════════════════════════════════════════════════════════════

const enrollTraining = [bodyMongoId('trainingId', 'الدورة التدريبية')];

module.exports = {
  createEmployee,
  updateEmployee,
  listEmployees,
  calculatePayroll,
  listPayroll,
  requestLeave,
  rejectLeave,
  listLeaves,
  createReview,
  enrollTraining,
};
