/**
 * 🎓 خدمة التدريب والتطوير — Training & Development Service
 * AlAwael ERP — Unified Frontend Service
 * Covers: Training Programs, Courses, Certifications, Reports
 */
import apiClient from './api.client';
import logger from 'utils/logger';

const safe =
  fn =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      logger.warn('trainingService fallback:', e.message);
      return null;
    }
  };

// ═══════════════════════════════════════════
// 1. TRAINING PROGRAMS — برامج التدريب
// ═══════════════════════════════════════════
export const programsService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/training/programs', { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/training/programs/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/training/programs', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/training/programs/${id}`, data);
    return r.data;
  }),
  remove: safe(async id => {
    const r = await apiClient.delete(`/training/programs/${id}`);
    return r.data;
  }),
  enroll: safe(async (id, employeeId) => {
    const r = await apiClient.post(`/training/programs/${id}/enroll`, { employeeId });
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 2. TRAINING COURSES — الدورات التدريبية
// ═══════════════════════════════════════════
export const coursesService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/training/courses', { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/training/courses/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/training/courses', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/training/courses/${id}`, data);
    return r.data;
  }),
  remove: safe(async id => {
    const r = await apiClient.delete(`/training/courses/${id}`);
    return r.data;
  }),
  complete: safe(async (id, result) => {
    const r = await apiClient.patch(`/training/courses/${id}/complete`, result);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 3. CERTIFICATIONS — الشهادات
// ═══════════════════════════════════════════
export const certificationsService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/training/certifications', { params });
    return r.data;
  }),
  issue: safe(async data => {
    const r = await apiClient.post('/training/certifications', data);
    return r.data;
  }),
  revoke: safe(async id => {
    const r = await apiClient.delete(`/training/certifications/${id}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 4. TRAINING SESSIONS — جلسات التدريب
// ═══════════════════════════════════════════
export const sessionsService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/training/sessions', { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/training/sessions/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/training/sessions', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/training/sessions/${id}`, data);
    return r.data;
  }),
  remove: safe(async id => {
    const r = await apiClient.delete(`/training/sessions/${id}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 5. TRAINING PLANS — خطط التدريب
// ═══════════════════════════════════════════
export const plansService = {
  getAll: safe(async () => {
    const r = await apiClient.get('/training/plans');
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/training/plans/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/training/plans', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/training/plans/${id}`, data);
    return r.data;
  }),
  remove: safe(async id => {
    const r = await apiClient.delete(`/training/plans/${id}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 6. TRAINING REPORTS — تقارير التدريب
// ═══════════════════════════════════════════
export const trainingReportsService = {
  getDashboardStats: safe(async () => {
    const r = await apiClient.get('/training/reports/dashboard');
    return r.data;
  }),
  getCompletionReport: safe(async (params = {}) => {
    const r = await apiClient.get('/training/reports/completion', { params });
    return r.data;
  }),
  getSkillGapReport: safe(async () => {
    const r = await apiClient.get('/training/reports/skill-gap');
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 5. MOCK DATA — بيانات تجريبية
// ═══════════════════════════════════════════
const categories = [
  'التطوير المهني',
  'المهارات التقنية',
  'القيادة والإدارة',
  'السلامة والصحة',
  'خدمة العملاء',
  'الجودة والامتثال',
];
const deliveryMethods = ['حضوري', 'عن بعد', 'مدمج', 'تعلم ذاتي'];
const trainingStatuses = ['مخطط', 'قيد التنفيذ', 'مكتمل', 'ملغي', 'معلق'];
const departments = [
  'الموارد البشرية',
  'تقنية المعلومات',
  'المالية',
  'التعليم',
  'العلاج والتأهيل',
  'الإدارة',
  'العمليات',
];

const _trainers = [
  'د. أحمد الراشدي',
  'أ. فاطمة السلمان',
  'د. خالد المنصور',
  'أ. نورة الحمدان',
  'م. يوسف العمري',
  'د. سارة الشريف',
];
const _employees = [
  'محمد العتيبي',
  'أحمد الغامدي',
  'فاطمة القحطاني',
  'سارة الدوسري',
  'خالد الشهري',
  'نورة الحربي',
  'عبدالله المطيري',
  'ريم الزهراني',
  'يوسف العنزي',
  'هدى البلوي',
];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const MOCK_PROGRAMS = Array.from({ length: 20 }, (_, i) => ({
  _id: `prog-${String(i + 1).padStart(3, '0')}`,
  title: [
    'برنامج تطوير القيادات',
    'دورة إدارة المشاريع الاحترافية',
    'برنامج السلامة المهنية',
    'دورة مهارات التواصل الفعال',
    'برنامج التحول الرقمي',
    'دورة خدمة العملاء المتميزة',
    'برنامج إدارة الجودة الشاملة',
    'دورة تحليل البيانات',
    'برنامج الأمن السيبراني',
    'دورة التخطيط الاستراتيجي',
    'برنامج إدارة الموارد البشرية',
    'دورة المحاسبة المالية',
    'برنامج إدارة المخاطر',
    'دورة التسويق الرقمي',
    'برنامج إدارة سلسلة الإمداد',
    'دورة الذكاء العاطفي',
    'برنامج إدارة التغيير',
    'دورة إعداد المدربين',
    'برنامج التميز المؤسسي',
    'دورة الإسعافات الأولية',
  ][i],
  category: pick(categories),
  department: pick(departments),
  trainer: pick(_trainers),
  deliveryMethod: pick(deliveryMethods),
  status: pick(trainingStatuses),
  duration: `${randInt(2, 40)} ساعة`,
  durationHours: randInt(2, 40),
  maxParticipants: randInt(10, 50),
  enrolledCount: randInt(5, 30),
  completedCount: randInt(0, 20),
  startDate: new Date(2026, randInt(0, 5), randInt(1, 28)).toISOString(),
  endDate: new Date(2026, randInt(6, 11), randInt(1, 28)).toISOString(),
  cost: randInt(2000, 25000),
  rating: +(Math.random() * 2 + 3).toFixed(1),
  description: 'وصف تفصيلي للبرنامج التدريبي وأهدافه ومخرجاته المتوقعة',
  objectives: ['تطوير المهارات المهنية', 'تحسين الأداء الوظيفي', 'الحصول على شهادة معتمدة'],
}));

export const MOCK_COURSES = Array.from({ length: 15 }, (_, i) => ({
  _id: `course-${String(i + 1).padStart(3, '0')}`,
  programId: `prog-${String(randInt(1, 10)).padStart(3, '0')}`,
  title: `الوحدة ${i + 1}: ${pick(['أساسيات', 'مبادئ', 'تطبيقات', 'مشاريع', 'تدريب عملي'])} ${pick(categories)}`,
  instructor: pick(_trainers),
  duration: `${randInt(1, 8)} ساعات`,
  date: new Date(2026, randInt(2, 6), randInt(1, 28)).toISOString(),
  location: pick(['قاعة 1', 'قاعة 2', 'عن بعد', 'المختبر', 'القاعة الرئيسية']),
  attendees: randInt(5, 25),
  status: pick(['مجدول', 'منعقد', 'ملغي']),
}));

export const MOCK_CERTIFICATIONS = Array.from({ length: 12 }, (_, i) => ({
  _id: `cert-${String(i + 1).padStart(3, '0')}`,
  employeeName: _employees[i % _employees.length],
  programTitle: MOCK_PROGRAMS[i % MOCK_PROGRAMS.length].title,
  certificationName: MOCK_PROGRAMS[i % MOCK_PROGRAMS.length].title, // alias for TrainingReports.js
  issueDate: new Date(2026, randInt(0, 3), randInt(1, 28)).toISOString(),
  expiryDate: new Date(2028, randInt(0, 11), randInt(1, 28)).toISOString(),
  certNumber: `CERT-${2026}-${String(i + 1).padStart(4, '0')}`,
  grade: pick(['ممتاز', 'جيد جداً', 'جيد', 'مقبول']),
  status: pick(['سارية', 'منتهية', 'ملغية']),
  type: pick(['مهنية', 'أكاديمية', 'تقنية', 'سلامة وصحة']),
}));

export const MOCK_TRAINING_DASHBOARD = {
  totalPrograms: 45,
  activePrograms: 18,
  completedPrograms: 22,
  totalEmployeesTrained: 342,
  totalTrainingHours: 4560,
  avgRating: 4.2,
  budgetUsed: 285000,
  budgetTotal: 400000,
  completionRate: 87.5,
  categoryDistribution: [
    { category: 'التطوير المهني', count: 12 },
    { category: 'المهارات التقنية', count: 10 },
    { category: 'القيادة والإدارة', count: 8 },
    { category: 'السلامة والصحة', count: 6 },
    { category: 'خدمة العملاء', count: 5 },
    { category: 'الجودة والامتثال', count: 4 },
  ],
  monthlyTrend: [
    { month: 'يناير', programs: 4, participants: 48, hours: 320, cost: 35000 },
    { month: 'فبراير', programs: 6, participants: 62, hours: 580, cost: 48000 },
    { month: 'مارس', programs: 5, participants: 55, hours: 420, cost: 42000 },
    { month: 'أبريل', programs: 8, participants: 78, hours: 720, cost: 65000 },
    { month: 'مايو', programs: 7, participants: 72, hours: 640, cost: 55000 },
    { month: 'يونيو', programs: 5, participants: 45, hours: 380, cost: 40000 },
  ],
  departmentTraining: [
    { department: 'تقنية المعلومات', employees: 45, hours: 680, programs: 8 },
    { department: 'الموارد البشرية', employees: 28, hours: 420, programs: 6 },
    { department: 'المالية', employees: 35, hours: 520, programs: 5 },
    { department: 'التعليم', employees: 52, hours: 780, programs: 9 },
    { department: 'العلاج والتأهيل', employees: 38, hours: 560, programs: 7 },
    { department: 'العمليات', employees: 32, hours: 480, programs: 5 },
  ],
  skillGaps: [
    { skill: 'التحول الرقمي', current: 45, target: 80, gap: 35 },
    { skill: 'إدارة المشاريع', current: 55, target: 85, gap: 30 },
    { skill: 'الأمن السيبراني', current: 30, target: 70, gap: 40 },
    { skill: 'تحليل البيانات', current: 40, target: 75, gap: 35 },
    { skill: 'القيادة', current: 50, target: 80, gap: 30 },
    { skill: 'التواصل', current: 65, target: 85, gap: 20 },
  ],
};
