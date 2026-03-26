/**
 * Test Data Factories — Generate realistic mock data for testing.
 * مصانع بيانات الاختبار — إنشاء بيانات وهمية واقعية
 */

let _counter = 0;
const uid = (prefix = '') => `${prefix}${++_counter}`;
const objectId = () => uid('507f1f77bcf86cd79943901');
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const past = (days = 30) => new Date(Date.now() - days * 86400000).toISOString();
const future = (days = 30) => new Date(Date.now() + days * 86400000).toISOString();

// ─── User Factory ───────────────────────────
const userDefaults = {
  _id: objectId,
  name: () => pick(['أحمد محمد', 'فاطمة علي', 'خالد السعيد', 'نورة العمري', 'محمد الراشد']),
  email: () => `user${_counter}@alawael.sa`,
  role: () => pick(['admin', 'doctor', 'therapist', 'teacher', 'hr', 'accountant', 'staff']),
  phone: () => `05${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
  department: () => pick(['الإدارة', 'التعليم', 'العلاج الطبيعي', 'الموارد البشرية', 'المالية']),
  status: () => 'active',
  createdAt: () => past(90),
};

const createUser = (overrides = {}) =>
  Object.fromEntries(
    Object.entries({ ...userDefaults, ...overrides }).map(([k, v]) => [
      k,
      typeof v === 'function' && !overrides[k] ? v() : overrides[k] !== undefined ? overrides[k] : typeof v === 'function' ? v() : v,
    ]),
  );

// ─── Employee Factory ───────────────────────
const createEmployee = (overrides = {}) => ({
  _id: objectId(),
  employeeId: `EMP-${String(_counter).padStart(4, '0')}`,
  name: pick(['سعد الحربي', 'ريم القحطاني', 'تركي المالكي']),
  nationalId: `1${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`,
  department: pick(['الإدارة', 'التعليم', 'المالية', 'الموارد البشرية']),
  position: pick(['مدير', 'معلم', 'محاسب', 'موظف استقبال']),
  salary: Math.floor(Math.random() * 15000) + 5000,
  joinDate: past(365),
  status: 'active',
  ...overrides,
});

// ─── Student / Beneficiary Factory ──────────
const createStudent = (overrides = {}) => ({
  _id: objectId(),
  studentId: `STD-${String(_counter).padStart(4, '0')}`,
  name: pick(['عبدالله محمد', 'سارة أحمد', 'يوسف خالد']),
  age: Math.floor(Math.random() * 12) + 4,
  gender: pick(['male', 'female']),
  guardianName: pick(['محمد عبدالله', 'فهد السعيد']),
  guardianPhone: `05${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
  enrollmentDate: past(180),
  status: 'active',
  ...overrides,
});

// ─── Session Factory ────────────────────────
const createSession = (overrides = {}) => ({
  _id: objectId(),
  title: pick(['جلسة علاج طبيعي', 'جلسة نطق', 'جلسة علاج وظيفي', 'جلسة تعليمية']),
  therapist: createUser({ role: 'therapist' }),
  student: createStudent(),
  date: future(7),
  duration: pick([30, 45, 60]),
  status: pick(['scheduled', 'completed', 'cancelled']),
  notes: 'ملاحظات الجلسة التجريبية',
  ...overrides,
});

// ─── Invoice Factory ────────────────────────
const createInvoice = (overrides = {}) => ({
  _id: objectId(),
  invoiceNumber: `INV-${String(_counter).padStart(5, '0')}`,
  client: pick(['مؤسسة الأوائل', 'شركة النور', 'مركز الرعاية']),
  amount: Math.floor(Math.random() * 50000) + 1000,
  vat: 0,
  total: 0,
  status: pick(['draft', 'sent', 'paid', 'overdue']),
  dueDate: future(30),
  createdAt: past(15),
  items: [{ description: 'خدمة علاجية', quantity: 1, unitPrice: 500, total: 500 }],
  ...overrides,
  get vatAmount() {
    return this.amount * 0.15;
  },
  get totalAmount() {
    return this.amount * 1.15;
  },
});

// ─── Leave Request Factory ──────────────────
const createLeaveRequest = (overrides = {}) => ({
  _id: objectId(),
  employee: createEmployee(),
  type: pick(['annual', 'sick', 'emergency']),
  startDate: future(5),
  endDate: future(10),
  days: Math.floor(Math.random() * 10) + 1,
  reason: 'سبب الإجازة التجريبي',
  status: pick(['pending', 'approved', 'rejected']),
  ...overrides,
});

// ─── Attendance Record Factory ──────────────
const createAttendanceRecord = (overrides = {}) => ({
  _id: objectId(),
  employee: createEmployee(),
  date: past(1),
  checkIn: '08:00',
  checkOut: '16:00',
  status: pick(['present', 'absent', 'late', 'excused']),
  hoursWorked: 8,
  ...overrides,
});

// ─── Notification Factory ───────────────────
const createNotification = (overrides = {}) => ({
  _id: objectId(),
  title: pick(['جلسة جديدة', 'إجازة معتمدة', 'تنبيه نظام', 'رسالة جديدة']),
  message: 'محتوى الإشعار التجريبي',
  type: pick(['info', 'success', 'warning', 'error']),
  read: false,
  createdAt: past(1),
  ...overrides,
});

// ─── Bulk Factory ───────────────────────────
/**
 * Create an array of items using a factory.
 * @param {function} factory
 * @param {number} count
 * @param {object} [overrides]
 * @returns {Array}
 */
const createMany = (factory, count, overrides = {}) => Array.from({ length: count }, (_, i) => factory({ ...overrides, index: i }));

// ─── API Response Wrappers ──────────────────
const wrapListResponse = (data, total) => ({
  data: { data, total: total || data.length, page: 1, pages: 1 },
});

const wrapSingleResponse = data => ({
  data: { data, success: true },
});

const wrapErrorResponse = (status, message) => ({
  response: {
    status,
    data: { message: message || 'خطأ', success: false },
  },
});

// Reset counter between test suites
const resetFactoryCounter = () => {
  _counter = 0;
};

module.exports = {
  createUser,
  createEmployee,
  createStudent,
  createSession,
  createInvoice,
  createLeaveRequest,
  createAttendanceRecord,
  createNotification,
  createMany,
  wrapListResponse,
  wrapSingleResponse,
  wrapErrorResponse,
  resetFactoryCounter,
};
