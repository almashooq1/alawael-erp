/**
 * Employee Portal – Demo / Seed Data
 * All values use Arabic labels where appropriate.
 */

export const demoProfile = {
  _id: 'emp-001',
  name: 'أحمد محمد العلي',
  empId: 'EMP-2024-0042',
  department: 'تقنية المعلومات',
  position: 'مهندس برمجيات أول',
  phone: '+966 55 123 4567',
  email: 'ahmed.ali@alawael.sa',
  joinDate: '2021-03-15',
  nationalId: '1098765432',
  nationality: 'سعودي',
  birthDate: '1992-07-20',
  gender: 'ذكر',
  maritalStatus: 'متزوج',
  address: 'الرياض، حي النرجس، شارع الأمير سلطان',
  avatar: null,
};

export const demoBalances = {
  annual: { used: 12, remaining: 18, total: 30 },
  sick: { used: 3, remaining: 12, total: 15 },
  emergency: { used: 1, remaining: 4, total: 5 },
  personal: { used: 2, remaining: 3, total: 5 },
};

export const demoLeaveHistory = [
  {
    _id: 'lv-001',
    type: 'annual',
    startDate: '2026-01-10',
    endDate: '2026-01-17',
    days: 7,
    status: 'approved',
    reason: 'إجازة عائلية',
  },
  {
    _id: 'lv-002',
    type: 'sick',
    startDate: '2026-02-03',
    endDate: '2026-02-05',
    days: 3,
    status: 'approved',
    reason: 'مراجعة طبية',
  },
  {
    _id: 'lv-003',
    type: 'emergency',
    startDate: '2026-03-01',
    endDate: '2026-03-01',
    days: 1,
    status: 'pending',
    reason: 'ظرف طارئ',
  },
];

export const demoPayslips = [
  {
    _id: 'ps-001',
    month: 1,
    year: 2026,
    basic: 12000,
    allowances: 4500,
    deductions: 1800,
    net: 14700,
  },
  {
    _id: 'ps-002',
    month: 2,
    year: 2026,
    basic: 12000,
    allowances: 4500,
    deductions: 1800,
    net: 14700,
  },
  {
    _id: 'ps-003',
    month: 3,
    year: 2026,
    basic: 12000,
    allowances: 5000,
    deductions: 1900,
    net: 15100,
  },
];

export const demoDocuments = [
  {
    _id: 'doc-001',
    name: 'عقد العمل',
    type: 'contract',
    uploadDate: '2021-03-15',
    size: '245 KB',
    status: 'valid',
  },
  {
    _id: 'doc-002',
    name: 'شهادة الخبرة',
    type: 'certificate',
    uploadDate: '2025-12-01',
    size: '180 KB',
    status: 'valid',
  },
  {
    _id: 'doc-003',
    name: 'صورة الهوية الوطنية',
    type: 'id',
    uploadDate: '2024-06-10',
    size: '1.2 MB',
    status: 'expired',
  },
];

export const demoRequests = [
  {
    _id: 'req-001',
    type: 'salary_certificate',
    description: 'شهادة راتب لتقديمها للبنك',
    status: 'pending',
    createdAt: '2026-03-10',
  },
  {
    _id: 'req-002',
    type: 'letter',
    description: 'خطاب تعريف بالراتب',
    status: 'approved',
    createdAt: '2026-02-20',
  },
];
