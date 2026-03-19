/**
 * 🤝 خدمة إدارة علاقات العملاء المتقدمة — Advanced CRM Service
 * AlAwael ERP — Full Database-Backed CRM
 * Covers: Contacts, Leads, Deals, Follow-ups, Reports, Pipeline, Activities
 */
import apiClient from './api.client';
import logger from 'utils/logger';

const safe =
  fn =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      logger.warn('crmService error:', e.message);
      return null;
    }
  };

// ═══════════════════════════════════════════
// 1. CONTACTS — جهات الاتصال
// ═══════════════════════════════════════════
export const contactsService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/crm/contacts', { params });
    const d = r.data;
    return Array.isArray(d) ? d : d?.data || d;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/crm/contacts/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/crm/contacts', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/crm/contacts/${id}`, data);
    return r.data;
  }),
  remove: safe(async id => {
    const r = await apiClient.delete(`/crm/contacts/${id}`);
    return r.data;
  }),
  getStats: safe(async () => {
    const r = await apiClient.get('/crm/contacts/stats');
    return r.data;
  }),
  addInteraction: safe(async (id, data) => {
    const r = await apiClient.post(`/crm/contacts/${id}/interactions`, data);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 2. LEADS — العملاء المحتملين
// ═══════════════════════════════════════════
export const leadsService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/crm/leads', { params });
    const d = r.data;
    return Array.isArray(d) ? d : d?.data || d;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/crm/leads/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/crm/leads', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/crm/leads/${id}`, data);
    return r.data;
  }),
  remove: safe(async id => {
    const r = await apiClient.delete(`/crm/leads/${id}`);
    return r.data;
  }),
  updateStage: safe(async (id, stage) => {
    const r = await apiClient.patch(`/crm/leads/${id}/stage`, { stage });
    return r.data;
  }),
  convertToContact: safe(async id => {
    const r = await apiClient.post(`/crm/leads/${id}/convert`);
    return r.data;
  }),
  getPipeline: safe(async () => {
    const r = await apiClient.get('/crm/leads/pipeline');
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 3. DEALS — الصفقات
// ═══════════════════════════════════════════
export const dealsService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/crm/deals', { params });
    const d = r.data;
    return Array.isArray(d) ? d : d?.data || d;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/crm/deals/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/crm/deals', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/crm/deals/${id}`, data);
    return r.data;
  }),
  remove: safe(async id => {
    const r = await apiClient.delete(`/crm/deals/${id}`);
    return r.data;
  }),
  updateStage: safe(async (id, stage) => {
    const r = await apiClient.patch(`/crm/deals/${id}/stage`, { stage });
    return r.data;
  }),
  getPipeline: safe(async () => {
    const r = await apiClient.get('/crm/pipeline');
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 4. FOLLOW-UPS — المتابعات
// ═══════════════════════════════════════════
export const followUpService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/crm/follow-ups', { params });
    const d = r.data;
    return Array.isArray(d) ? d : d?.data || d;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/crm/follow-ups', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/crm/follow-ups/${id}`, data);
    return r.data;
  }),
  complete: safe(async (id, notes, result) => {
    const r = await apiClient.patch(`/crm/follow-ups/${id}/complete`, { notes, result });
    return r.data;
  }),
  getUpcoming: safe(async (days = 7) => {
    const r = await apiClient.get('/crm/follow-ups/upcoming', { params: { days } });
    return r.data;
  }),
  getOverdue: safe(async () => {
    const r = await apiClient.get('/crm/follow-ups/overdue');
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 5. ACTIVITIES — الأنشطة
// ═══════════════════════════════════════════
export const activitiesService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/crm/activities', { params });
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 6. CRM REPORTS — تقارير CRM
// ═══════════════════════════════════════════
export const crmReportsService = {
  getDashboardStats: safe(async () => {
    const r = await apiClient.get('/crm/reports/dashboard');
    return r.data;
  }),
  getConversionReport: safe(async (params = {}) => {
    const r = await apiClient.get('/crm/reports/conversion', { params });
    return r.data;
  }),
  getActivityReport: safe(async (params = {}) => {
    const r = await apiClient.get('/crm/reports/activity', { params });
    return r.data;
  }),
  getRevenueReport: safe(async (params = {}) => {
    const r = await apiClient.get('/crm/reports/revenue', { params });
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 7. SEED — بيانات تجريبية
// ═══════════════════════════════════════════
export const seedService = {
  seedDemoData: safe(async () => {
    const r = await apiClient.post('/crm/seed');
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 8. MOCK DATA — بيانات تجريبية للعرض الأولي
// ═══════════════════════════════════════════
const contactTypes = ['شركة', 'فرد', 'جهة حكومية', 'مؤسسة تعليمية', 'منظمة غير ربحية'];
const leadStages = ['جديد', 'اتصال أولي', 'عرض مقدم', 'تفاوض', 'مغلق - ربح', 'مغلق - خسارة'];
const leadSources = ['موقع إلكتروني', 'إحالة', 'معرض', 'إعلان', 'شبكات اجتماعية', 'اتصال مباشر'];
const priorities = ['عالية', 'متوسطة', 'منخفضة'];
const followUpTypes = ['اتصال هاتفي', 'بريد إلكتروني', 'زيارة', 'اجتماع', 'عرض تقديمي'];
const sectors = ['التعليم', 'الصحة', 'التقنية', 'البناء', 'المالية', 'التجارة', 'الصناعة'];

const _names = [
  'شركة النخبة للتقنية',
  'مؤسسة الابتكار التعليمية',
  'شركة المستقبل للبرمجيات',
  'مجموعة الريادة',
  'شركة الأفق للاستشارات',
  'مؤسسة الأمانة الطبية',
  'شركة السلام للمقاولات',
  'مجموعة الإنجاز المالية',
  'شركة الوفاء للتجارة',
  'مؤسسة التميز للتدريب',
  'شركة الفجر للتقنية',
  'مؤسسة البناء الحديثة',
  'شركة التواصل الذكي',
  'مجموعة النجاح للخدمات',
  'شركة الأمل للتطوير',
];

const _people = [
  'أحمد محمد الغامدي',
  'فاطمة علي العتيبي',
  'خالد إبراهيم الشهري',
  'نورة سعد القحطاني',
  'محمد عبدالله الدوسري',
  'سارة يوسف الحربي',
  'عبدالرحمن خالد المطيري',
  'ريم فهد الزهراني',
  'يوسف أحمد العنزي',
  'هدى سلطان البلوي',
];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const MOCK_CONTACTS = Array.from({ length: 30 }, (_, i) => ({
  _id: `cnt-${String(i + 1).padStart(3, '0')}`,
  name: _names[i % _names.length],
  contactPerson: _people[i % _people.length],
  type: pick(contactTypes),
  sector: pick(sectors),
  email: `info@company${i + 1}.sa`,
  phone: `05${randInt(10000000, 99999999)}`,
  city: pick(['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'أبها', 'تبوك']),
  status: pick(['نشط', 'غير نشط', 'معلق']),
  totalDeals: randInt(0, 15),
  totalRevenue: randInt(50000, 2000000),
  lastContact: new Date(2026, randInt(0, 2), randInt(1, 28)).toISOString(),
  createdAt: new Date(2025, randInt(0, 11), randInt(1, 28)).toISOString(),
  notes: 'ملاحظات حول العميل والتعاملات السابقة',
}));

export const MOCK_LEADS = Array.from({ length: 25 }, (_, i) => ({
  _id: `lead-${String(i + 1).padStart(3, '0')}`,
  title: `فرصة ${_names[i % _names.length]}`,
  company: _names[i % _names.length],
  contactPerson: _people[i % _people.length],
  email: `lead${i + 1}@example.sa`,
  phone: `05${randInt(10000000, 99999999)}`,
  source: pick(leadSources),
  stage: pick(leadStages),
  priority: pick(priorities),
  estimatedValue: randInt(10000, 500000),
  probability: randInt(10, 95),
  assignedTo: pick(_people),
  expectedCloseDate: new Date(2026, randInt(2, 8), randInt(1, 28)).toISOString(),
  createdAt: new Date(2026, randInt(0, 2), randInt(1, 28)).toISOString(),
  notes: 'تفاصيل الفرصة والخطوات التالية',
}));

export const MOCK_FOLLOW_UPS = Array.from({ length: 20 }, (_, i) => ({
  _id: `fu-${String(i + 1).padStart(3, '0')}`,
  contactId: `cnt-${String(randInt(1, 15)).padStart(3, '0')}`,
  contactName: _names[i % _names.length],
  type: pick(followUpTypes),
  subject: `متابعة ${pick(['عرض سعر', 'عقد', 'استفسار', 'شكوى', 'طلب خدمة'])}`,
  scheduledDate: new Date(2026, randInt(2, 5), randInt(1, 28)).toISOString(),
  status: pick(['مجدول', 'مكتمل', 'ملغي', 'متأخر']),
  priority: pick(priorities),
  assignedTo: pick(_people),
  notes: 'ملاحظات المتابعة',
  completedAt: i % 3 === 0 ? new Date(2026, 2, randInt(1, 15)).toISOString() : null,
  result: i % 3 === 0 ? pick(['إيجابي', 'سلبي', 'بحاجة متابعة']) : null,
}));

export const MOCK_CRM_DASHBOARD = {
  totalContacts: 156,
  activeContacts: 124,
  totalLeads: 45,
  wonDeals: 28,
  lostDeals: 8,
  openDeals: 9,
  totalRevenue: 3450000,
  conversionRate: 73.7,
  avgDealSize: 123214,
  thisMonthNewContacts: 12,
  thisMonthNewDeals: 8,
  overdueFollowUps: 3,
  monthlyTrend: [
    { month: 'يناير', leads: 12, won: 6, lost: 2, revenue: 450000 },
    { month: 'فبراير', leads: 18, won: 9, lost: 3, revenue: 620000 },
    { month: 'مارس', leads: 15, won: 8, lost: 1, revenue: 580000 },
    { month: 'أبريل', leads: 20, won: 11, lost: 2, revenue: 750000 },
    { month: 'مايو', leads: 22, won: 10, lost: 4, revenue: 680000 },
    { month: 'يونيو', leads: 16, won: 7, lost: 1, revenue: 510000 },
  ],
  pipelineDistribution: [
    { stage: 'جديد', count: 12, value: 340000 },
    { stage: 'اتصال أولي', count: 8, value: 250000 },
    { stage: 'عرض مقدم', count: 10, value: 520000 },
    { stage: 'تفاوض', count: 6, value: 480000 },
    { stage: 'مغلق - ربح', count: 28, value: 3450000 },
    { stage: 'مغلق - خسارة', count: 8, value: 190000 },
  ],
  sourceDistribution: [
    { source: 'موقع إلكتروني', count: 18 },
    { source: 'إحالة', count: 14 },
    { source: 'معرض', count: 8 },
    { source: 'إعلان', count: 6 },
    { source: 'شبكات اجتماعية', count: 12 },
    { source: 'اتصال مباشر', count: 5 },
  ],
  topPerformers: [
    { name: 'أحمد الغامدي', deals: 8, revenue: 890000 },
    { name: 'فاطمة العتيبي', deals: 6, revenue: 720000 },
    { name: 'خالد الشهري', deals: 5, revenue: 650000 },
    { name: 'نورة القحطاني', deals: 4, revenue: 480000 },
    { name: 'محمد الدوسري', deals: 3, revenue: 410000 },
  ],
  recentActivities: [
    { type: 'deal_won', text: 'تم إغلاق صفقة مع شركة النخبة بقيمة 250,000 ر.س', time: '2 ساعة' },
    { type: 'new_lead', text: 'عميل محتمل جديد من معرض التعليم 2026', time: '3 ساعات' },
    { type: 'follow_up', text: 'متابعة مع مؤسسة الابتكار التعليمية', time: '5 ساعات' },
    { type: 'contact', text: 'تم إضافة شركة الأفق للاستشارات', time: 'أمس' },
    { type: 'deal_lost', text: 'تم خسارة صفقة مجموعة الريادة', time: 'أمس' },
  ],
  upcomingFollowUps: [],
};

export const MOCK_CONVERSION_REPORT = {
  overall: { total: 72, converted: 53, rate: 73.6 },
  bySource: [
    { source: 'موقع إلكتروني', total: 18, converted: 14, rate: 77.8 },
    { source: 'إحالة', total: 14, converted: 12, rate: 85.7 },
    { source: 'معرض', total: 8, converted: 5, rate: 62.5 },
    { source: 'إعلان', total: 6, converted: 3, rate: 50.0 },
    { source: 'شبكات اجتماعية', total: 12, converted: 9, rate: 75.0 },
    { source: 'اتصال مباشر', total: 5, converted: 4, rate: 80.0 },
  ],
  byMonth: [
    { month: 'يناير', total: 12, converted: 8, rate: 66.7 },
    { month: 'فبراير', total: 18, converted: 14, rate: 77.8 },
    { month: 'مارس', total: 15, converted: 12, rate: 80.0 },
    { month: 'أبريل', total: 20, converted: 16, rate: 80.0 },
    { month: 'مايو', total: 22, converted: 15, rate: 68.2 },
    { month: 'يونيو', total: 16, converted: 11, rate: 68.8 },
  ],
  avgTimeToConvert: '18 يوم',
};
