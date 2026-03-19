/**
 * 🔧 خدمة الصيانة والمرافق — Maintenance & Facilities Service
 * AlAwael ERP
 */
import apiClient from './api.client';
import logger from '../utils/logger';

const safe = (fn, fallback = null) =>
  fn().catch(err => {
    logger.warn('maintenanceService ▸', err.message);
    return fallback;
  });

/* ─── Mock Data ─── */
const priorities = ['عاجل', 'عالي', 'متوسط', 'منخفض'];
const categories = [
  'كهرباء',
  'سباكة',
  'تكييف',
  'نجارة',
  'دهان',
  'نظافة',
  'أمن وسلامة',
  'تقنية معلومات',
  'أخرى',
];
const statuses = ['جديد', 'قيد التنفيذ', 'مكتمل', 'مؤجل', 'ملغي'];

export const MOCK_WORK_ORDERS = Array.from({ length: 22 }, (_, i) => ({
  _id: `wo-${i + 1}`,
  title: [
    'إصلاح تسريب مياه',
    'صيانة تكييف الطابق الثاني',
    'تغيير إنارة القاعة الرئيسية',
    'إصلاح باب المكتب 205',
    'صيانة مصعد المبنى A',
    'تنظيف خزانات المياه',
    'إصلاح تمديدات كهربائية',
    'صيانة أجهزة الإطفاء',
    'دهان فصول الطابق الأول',
    'إصلاح شبكة الإنترنت',
    'استبدال زجاج نافذة',
    'صيانة مولد الطوارئ',
    'إصلاح أرضيات الممر',
    'تركيب كاميرات جديدة',
    'صيانة نظام الإنذار',
    'إصلاح حنفيات الحمامات',
    'صيانة مضخات المياه',
    'تغيير فلاتر التكييف',
    'إصلاح سياج خارجي',
    'صيانة ألعاب الأطفال',
    'تركيب إضاءة خارجية',
    'إصلاح باب طوارئ',
  ][i],
  category: categories[i % categories.length],
  priority: priorities[i % 4],
  status: statuses[i % 5],
  location: [
    `مبنى A - الطابق ${(i % 3) + 1}`,
    `مبنى B - الطابق ${(i % 2) + 1}`,
    'المبنى الرئيسي',
    'الساحة الخارجية',
  ][i % 4],
  requestedBy: [
    'أ. محمد العتيبي',
    'أ. سارة القحطاني',
    'أ. فهد الشهري',
    'أ. نورة الدوسري',
    'أ. خالد الغامدي',
  ][i % 5],
  assignedTo: ['فني أحمد', 'فني عبدالله', 'فني سعد', 'فني ماجد', ''][i % 5],
  createdAt: new Date(2026, 1, 1 + i).toISOString(),
  completedAt: i % 5 === 2 ? new Date(2026, 1, 5 + i).toISOString() : null,
  estimatedCost: Math.floor(Math.random() * 5000) + 200,
  actualCost: i % 5 === 2 ? Math.floor(Math.random() * 4500) + 200 : null,
  notes: '',
  images: [],
}));

export const MOCK_PREVENTIVE_SCHEDULE = [
  {
    _id: 'pm-1',
    task: 'صيانة دورية للتكييف المركزي',
    frequency: 'شهري',
    nextDue: '2026-03-15',
    equipment: 'نظام التكييف',
    assignedTo: 'فني عبدالله',
    status: 'مجدول',
  },
  {
    _id: 'pm-2',
    task: 'فحص أنظمة الإطفاء والإنذار',
    frequency: 'ربع سنوي',
    nextDue: '2026-04-01',
    equipment: 'أنظمة السلامة',
    assignedTo: 'فني سعد',
    status: 'مجدول',
  },
  {
    _id: 'pm-3',
    task: 'تنظيف خزانات المياه',
    frequency: 'ربع سنوي',
    nextDue: '2026-03-20',
    equipment: 'خزانات المياه',
    assignedTo: 'فني أحمد',
    status: 'مجدول',
  },
  {
    _id: 'pm-4',
    task: 'صيانة المصاعد',
    frequency: 'شهري',
    nextDue: '2026-03-10',
    equipment: 'المصاعد',
    assignedTo: 'شركة خارجية',
    status: 'متأخر',
  },
  {
    _id: 'pm-5',
    task: 'فحص التمديدات الكهربائية',
    frequency: 'نصف سنوي',
    nextDue: '2026-06-01',
    equipment: 'الشبكة الكهربائية',
    assignedTo: 'فني ماجد',
    status: 'مجدول',
  },
  {
    _id: 'pm-6',
    task: 'صيانة مولدات الطوارئ',
    frequency: 'ربع سنوي',
    nextDue: '2026-03-25',
    equipment: 'المولدات',
    assignedTo: 'فني عبدالله',
    status: 'مجدول',
  },
  {
    _id: 'pm-7',
    task: 'فحص وصيانة المضخات',
    frequency: 'شهري',
    nextDue: '2026-03-14',
    equipment: 'مضخات المياه',
    assignedTo: 'فني أحمد',
    status: 'مكتمل',
  },
  {
    _id: 'pm-8',
    task: 'تغيير فلاتر المياه',
    frequency: 'ربع سنوي',
    nextDue: '2026-04-15',
    equipment: 'فلاتر المياه',
    assignedTo: 'فني سعد',
    status: 'مجدول',
  },
];

export const MOCK_MAINTENANCE_DASHBOARD = {
  totalOrders: 22,
  openOrders: 8,
  completedThisMonth: 6,
  overdueOrders: 3,
  avgResolutionDays: 4.5,
  totalBudget: 250000,
  spentBudget: 145000,
  categoryDistribution: [
    { name: 'كهرباء', count: 5 },
    { name: 'سباكة', count: 4 },
    { name: 'تكييف', count: 4 },
    { name: 'نجارة', count: 2 },
    { name: 'أمن وسلامة', count: 3 },
    { name: 'أخرى', count: 4 },
  ],
  monthlyTrend: [
    { month: 'سبتمبر', created: 8, completed: 6, cost: 18000 },
    { month: 'أكتوبر', created: 12, completed: 10, cost: 25000 },
    { month: 'نوفمبر', created: 10, completed: 9, cost: 22000 },
    { month: 'ديسمبر', created: 6, completed: 7, cost: 15000 },
    { month: 'يناير', created: 15, completed: 11, cost: 35000 },
    { month: 'فبراير', created: 11, completed: 8, cost: 28000 },
  ],
  priorityDistribution: [
    { priority: 'عاجل', count: 3 },
    { priority: 'عالي', count: 5 },
    { priority: 'متوسط', count: 8 },
    { priority: 'منخفض', count: 6 },
  ],
};

/* ─── API Wrappers ─── */
export const workOrdersService = {
  getAll: () =>
    safe(() => apiClient.get('/maintenance/work-orders').then(r => r.data), MOCK_WORK_ORDERS),
  getById: id => safe(() => apiClient.get(`/maintenance/work-orders/${id}`).then(r => r.data)),
  create: d => safe(() => apiClient.post('/maintenance/work-orders', d).then(r => r.data), d),
  update: (id, d) =>
    safe(() => apiClient.put(`/maintenance/work-orders/${id}`, d).then(r => r.data), d),
  remove: id =>
    safe(() => apiClient.delete(`/maintenance/work-orders/${id}`).then(r => r.data), {
      success: true,
    }),
  complete: (id, cost) =>
    safe(
      () =>
        apiClient
          .patch(`/maintenance/work-orders/${id}/complete`, { actualCost: cost })
          .then(r => r.data),
      { success: true }
    ),
};

export const preventiveService = {
  getAll: () =>
    safe(
      () => apiClient.get('/maintenance/preventive').then(r => r.data),
      MOCK_PREVENTIVE_SCHEDULE
    ),
  create: d => safe(() => apiClient.post('/maintenance/preventive', d).then(r => r.data), d),
  update: (id, d) =>
    safe(() => apiClient.put(`/maintenance/preventive/${id}`, d).then(r => r.data), d),
  complete: id =>
    safe(() => apiClient.patch(`/maintenance/preventive/${id}/complete`).then(r => r.data), {
      success: true,
    }),
};

export const maintenanceReportsService = {
  getDashboardStats: () =>
    safe(
      () => apiClient.get('/maintenance/dashboard').then(r => r.data),
      MOCK_MAINTENANCE_DASHBOARD
    ),
};
