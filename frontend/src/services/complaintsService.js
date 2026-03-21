/**
 * 📋 إدارة الشكاوى والاقتراحات — Complaints & Suggestions Service
 * AlAwael ERP
 */
import apiClient from 'services/api.client';
import logger from 'utils/logger';

const safe = async (fn, fallback = null) => {
  try {
    return await fn();
  } catch (e) {
    logger.error('complaintsService:', e);
    return fallback;
  }
};

// ═══════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════
export const MOCK_COMPLAINTS = [
  {
    _id: 'comp-1',
    title: 'تأخر في صيانة المكيفات',
    description: 'تم تقديم طلب صيانة منذ أسبوعين ولم يتم التجاوب',
    type: 'شكوى',
    category: 'صيانة',
    priority: 'عالي',
    status: 'مفتوحة',
    submittedBy: 'أحمد المحمد',
    submitterRole: 'معلم',
    department: 'قسم الصيانة',
    assignedTo: 'فهد الشمري',
    createdAt: '2026-03-15',
    resolvedAt: null,
    resolution: '',
    rating: null,
  },
  {
    _id: 'comp-2',
    title: 'اقتراح تحسين نظام الحضور',
    description: 'اقتراح إضافة ميزة التعرف على الوجه في نظام الحضور',
    type: 'اقتراح',
    category: 'تقنية',
    priority: 'متوسط',
    status: 'قيد المراجعة',
    submittedBy: 'سارة العلي',
    submitterRole: 'إداري',
    department: 'تقنية المعلومات',
    assignedTo: 'محمد الأحمد',
    createdAt: '2026-03-14',
    resolvedAt: null,
    resolution: '',
    rating: null,
  },
  {
    _id: 'comp-3',
    title: 'مشكلة في جودة الوجبات',
    description: 'عدة شكاوى من أولياء الأمور حول جودة الوجبات المقدمة',
    type: 'شكوى',
    category: 'تغذية',
    priority: 'عاجل',
    status: 'مفتوحة',
    submittedBy: 'نورة القحطاني',
    submitterRole: 'ولي أمر',
    department: 'قسم التغذية',
    assignedTo: 'سعاد المطيري',
    createdAt: '2026-03-13',
    resolvedAt: null,
    resolution: '',
    rating: null,
  },
  {
    _id: 'comp-4',
    title: 'طلب توفير مواقف إضافية',
    description: 'ازدحام شديد في مواقف السيارات خاصة وقت الذروة',
    type: 'اقتراح',
    category: 'مرافق',
    priority: 'منخفض',
    status: 'قيد المراجعة',
    submittedBy: 'خالد العتيبي',
    submitterRole: 'ولي أمر',
    department: 'إدارة المرافق',
    assignedTo: '',
    createdAt: '2026-03-12',
    resolvedAt: null,
    resolution: '',
    rating: null,
  },
  {
    _id: 'comp-5',
    title: 'تأخر في صرف الرواتب',
    description: 'لم يتم صرف راتب شهر فبراير في الموعد المحدد',
    type: 'شكوى',
    category: 'مالية',
    priority: 'عاجل',
    status: 'تم الحل',
    submittedBy: 'عمار السيد',
    submitterRole: 'موظف',
    department: 'الشؤون المالية',
    assignedTo: 'إبراهيم الحربي',
    createdAt: '2026-03-01',
    resolvedAt: '2026-03-03',
    resolution: 'تم صرف الرواتب المتأخرة مع اعتذار رسمي',
    rating: 4,
  },
  {
    _id: 'comp-6',
    title: 'اقتراح برنامج أنشطة صيفية',
    description: 'اقتراح تنظيم أنشطة تعليمية وترفيهية خلال الإجازة الصيفية',
    type: 'اقتراح',
    category: 'أنشطة',
    priority: 'متوسط',
    status: 'مقبول',
    submittedBy: 'فاطمة الزهراني',
    submitterRole: 'معلم',
    department: 'قسم الأنشطة',
    assignedTo: 'سلمان العمري',
    createdAt: '2026-02-20',
    resolvedAt: '2026-03-05',
    resolution: 'تمت الموافقة وسيتم التنفيذ في الصيف',
    rating: 5,
  },
  {
    _id: 'comp-7',
    title: 'ضعف شبكة الإنترنت',
    description: 'بطء شديد في الإنترنت يؤثر على العملية التعليمية',
    type: 'شكوى',
    category: 'تقنية',
    priority: 'عالي',
    status: 'قيد التنفيذ',
    submittedBy: 'يزيد الدوسري',
    submitterRole: 'معلم',
    department: 'تقنية المعلومات',
    assignedTo: 'محمد الأحمد',
    createdAt: '2026-03-10',
    resolvedAt: null,
    resolution: '',
    rating: null,
  },
  {
    _id: 'comp-8',
    title: 'تحسين نظام التواصل مع أولياء الأمور',
    description: 'اقتراح إطلاق تطبيق جوال لتسهيل التواصل',
    type: 'اقتراح',
    category: 'تقنية',
    priority: 'متوسط',
    status: 'قيد المراجعة',
    submittedBy: 'مريم الخالدي',
    submitterRole: 'ولي أمر',
    department: 'تقنية المعلومات',
    assignedTo: '',
    createdAt: '2026-03-08',
    resolvedAt: null,
    resolution: '',
    rating: null,
  },
  {
    _id: 'comp-9',
    title: 'نقص في الأدوات التعليمية',
    description: 'عدم توفر أدوات ووسائل تعليمية كافية في فصول التربية الخاصة',
    type: 'شكوى',
    category: 'تعليم',
    priority: 'عالي',
    status: 'قيد التنفيذ',
    submittedBy: 'هدى المالكي',
    submitterRole: 'معلم',
    department: 'إدارة المشتريات',
    assignedTo: 'عبدالله القحطاني',
    createdAt: '2026-03-05',
    resolvedAt: null,
    resolution: '',
    rating: null,
  },
  {
    _id: 'comp-10',
    title: 'شكوى من ارتفاع الرسوم',
    description: 'عدة أولياء أمور يشكون من ارتفاع الرسوم الدراسية',
    type: 'شكوى',
    category: 'مالية',
    priority: 'متوسط',
    status: 'تم الحل',
    submittedBy: 'عبدالعزيز النفيسة',
    submitterRole: 'ولي أمر',
    department: 'الشؤون المالية',
    assignedTo: 'إبراهيم الحربي',
    createdAt: '2026-02-15',
    resolvedAt: '2026-02-25',
    resolution: 'تم تقديم خطة تقسيط مرنة وخصومات للأخوة',
    rating: 3,
  },
  {
    _id: 'comp-11',
    title: 'اقتراح حديقة حسية للأطفال',
    description: 'إنشاء حديقة حسية تساعد أطفال التوحد في التفاعل البيئي',
    type: 'اقتراح',
    category: 'مرافق',
    priority: 'متوسط',
    status: 'مقبول',
    submittedBy: 'نوف العنزي',
    submitterRole: 'أخصائي تأهيل',
    department: 'قسم التأهيل',
    assignedTo: 'فهد الشمري',
    createdAt: '2026-02-10',
    resolvedAt: '2026-03-01',
    resolution: 'تمت الموافقة - سيبدأ التنفيذ الربع القادم',
    rating: 5,
  },
  {
    _id: 'comp-12',
    title: 'تسرب مياه في دورات المياه',
    description: 'تسرب مياه مستمر في دورات المياه بالمبنى الرئيسي',
    type: 'شكوى',
    category: 'صيانة',
    priority: 'عاجل',
    status: 'تم الحل',
    submittedBy: 'عادل الحارثي',
    submitterRole: 'موظف',
    department: 'قسم الصيانة',
    assignedTo: 'فهد الشمري',
    createdAt: '2026-03-02',
    resolvedAt: '2026-03-04',
    resolution: 'تم إصلاح التسرب واستبدال الأنابيب التالفة',
    rating: 4,
  },
];

export const MOCK_COMPLAINTS_DASHBOARD = {
  totalComplaints: 12,
  openComplaints: 3,
  inProgressComplaints: 2,
  resolvedComplaints: 4,
  acceptedSuggestions: 2,
  avgResolutionDays: 5.2,
  satisfactionAvg: 4.0,
  typeDistribution: [
    { name: 'شكوى', count: 7 },
    { name: 'اقتراح', count: 5 },
  ],
  categoryDistribution: [
    { name: 'صيانة', count: 3 },
    { name: 'تقنية', count: 3 },
    { name: 'مالية', count: 2 },
    { name: 'تغذية', count: 1 },
    { name: 'مرافق', count: 2 },
    { name: 'تعليم', count: 1 },
  ],
  statusDistribution: [
    { name: 'مفتوحة', count: 3, color: '#E53935' },
    { name: 'قيد المراجعة', count: 2, color: '#FB8C00' },
    { name: 'قيد التنفيذ', count: 2, color: '#1E88E5' },
    { name: 'تم الحل', count: 3, color: '#43A047' },
    { name: 'مقبول', count: 2, color: '#8E24AA' },
  ],
  monthlyTrend: [
    { month: 'يناير', complaints: 4, resolved: 3 },
    { month: 'فبراير', complaints: 5, resolved: 4 },
    { month: 'مارس', complaints: 8, resolved: 5 },
    { month: 'أبريل', complaints: 3, resolved: 3 },
    { month: 'مايو', complaints: 6, resolved: 5 },
    { month: 'يونيو', complaints: 4, resolved: 4 },
  ],
  priorityDistribution: [
    { name: 'عاجل', count: 3 },
    { name: 'عالي', count: 3 },
    { name: 'متوسط', count: 4 },
    { name: 'منخفض', count: 2 },
  ],
};

// ═══════════════════════════════════════════
// Services
// ═══════════════════════════════════════════
export const complaintsService = {
  getAll: () => safe(() => apiClient.get('/complaints').then(r => r.data), MOCK_COMPLAINTS),
  getById: id =>
    safe(
      () => apiClient.get(`/complaints/${id}`).then(r => r.data),
      MOCK_COMPLAINTS.find(c => c._id === id)
    ),
  create: data => safe(() => apiClient.post('/complaints', data).then(r => r.data)),
  update: (id, data) => safe(() => apiClient.put(`/complaints/${id}`, data).then(r => r.data)),
  remove: id => safe(() => apiClient.delete(`/complaints/${id}`).then(r => r.data)),
  resolve: (id, resolution) =>
    safe(() => apiClient.post(`/complaints/${id}/resolve`, { resolution }).then(r => r.data)),
  rate: (id, rating) =>
    safe(() => apiClient.post(`/complaints/${id}/rate`, { rating }).then(r => r.data)),

  // ── Actions (merged from complaints.service.js) ──────────────
  respond: (id, data) =>
    safe(() => apiClient.post(`/complaints/${id}/respond`, data).then(r => r.data)),
  escalate: (id, data) =>
    safe(() => apiClient.post(`/complaints/${id}/escalate`, data).then(r => r.data)),

  // ── Stats ─────────────────────────────────────────────────────
  getStats: () => safe(() => apiClient.get('/complaints/stats').then(r => r.data)),

  // ── Source-filtered shortcuts ─────────────────────────────────
  getEmployeeComplaints: params =>
    safe(() =>
      apiClient.get('/complaints', { params: { ...params, source: 'employee' } }).then(r => r.data)
    ),
  getStudentComplaints: params =>
    safe(() =>
      apiClient.get('/complaints', { params: { ...params, source: 'student' } }).then(r => r.data)
    ),
  getCustomerComplaints: params =>
    safe(() =>
      apiClient.get('/complaints', { params: { ...params, source: 'customer' } }).then(r => r.data)
    ),
  getParentComplaints: params =>
    safe(() =>
      apiClient.get('/complaints', { params: { ...params, source: 'parent' } }).then(r => r.data)
    ),

  // ── Legacy aliases (backward compat) ──────────────────────────
  createEmployeeComplaint: data =>
    safe(() => apiClient.post('/complaints', { ...data, source: 'employee' }).then(r => r.data)),
  createStudentComplaint: data =>
    safe(() => apiClient.post('/complaints', { ...data, source: 'student' }).then(r => r.data)),
  createCustomerComplaint: data =>
    safe(() => apiClient.post('/complaints', { ...data, source: 'customer' }).then(r => r.data)),
  updateEmployeeComplaint: (id, data) =>
    safe(() => apiClient.put(`/complaints/${id}`, data).then(r => r.data)),
  updateStudentComplaint: (id, data) =>
    safe(() => apiClient.put(`/complaints/${id}`, data).then(r => r.data)),
  resolveComplaint: (id, data) =>
    safe(() => apiClient.post(`/complaints/${id}/resolve`, data).then(r => r.data)),
};

export const complaintsReportsService = {
  getDashboardStats: () =>
    safe(
      () => apiClient.get('/complaints/dashboard/stats').then(r => r.data),
      MOCK_COMPLAINTS_DASHBOARD
    ),
};
