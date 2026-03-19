/**
 * 📋 خدمة النماذج الجاهزة — Form Templates Service
 * AlAwael ERP — Ready-made form templates for beneficiaries, HR & administration
 * @created 2026-03-13
 */
import apiClient from './api.client';
import logger from '../utils/logger';

const safe = (fn, fallback = null) =>
  fn().catch(err => {
    logger.warn('formTemplatesService ▸', err.message);
    return fallback;
  });

/* ═══ Fallback categories ═══ */
const FALLBACK_CATEGORIES = [
  {
    id: 'all',
    label: 'جميع النماذج',
    labelEn: 'All Forms',
    icon: '📋',
    color: '#455A64',
    count: 48,
  },
  {
    id: 'beneficiary',
    label: 'شؤون المستفيدين',
    labelEn: 'Beneficiary Affairs',
    icon: '🧑‍🦽',
    color: '#1565C0',
    count: 10,
  },
  {
    id: 'hr',
    label: 'شؤون الموظفين',
    labelEn: 'Human Resources',
    icon: '👥',
    color: '#D32F2F',
    count: 14,
  },
  {
    id: 'administration',
    label: 'الشؤون الإدارية',
    labelEn: 'Administration',
    icon: '🏛️',
    color: '#6D4C41',
    count: 11,
  },
  {
    id: 'finance',
    label: 'الشؤون المالية',
    labelEn: 'Finance',
    icon: '💰',
    color: '#2E7D32',
    count: 7,
  },
  { id: 'general', label: 'عامة', labelEn: 'General', icon: '📁', color: '#757575', count: 6 },
];

/* ═══ Fallback built-in templates (minimal) ═══ */
const FALLBACK_TEMPLATES = [
  {
    templateId: 'beneficiary-identification',
    name: 'طلب تعريف بالمستفيد',
    category: 'beneficiary',
    icon: '🪪',
    color: '#1565C0',
    description: 'نموذج لاستخراج خطاب تعريف بالمستفيد',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'beneficiary-transfer',
    name: 'طلب نقل مستفيد',
    category: 'beneficiary',
    icon: '🔄',
    color: '#00897B',
    description: 'نموذج لطلب نقل مستفيد',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'beneficiary-absence',
    name: 'نموذج غياب مستفيد',
    category: 'beneficiary',
    icon: '📅',
    color: '#F57C00',
    description: 'نموذج لتقديم عذر غياب',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'beneficiary-complaint',
    name: 'نموذج شكوى مستفيد',
    category: 'beneficiary',
    icon: '📢',
    color: '#C62828',
    description: 'نموذج لتقديم شكوى',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'beneficiary-service-request',
    name: 'طلب خدمة للمستفيد',
    category: 'beneficiary',
    icon: '🏥',
    color: '#2E7D32',
    description: 'طلب خدمة إضافية',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'hr-resignation',
    name: 'طلب استقالة',
    category: 'hr',
    icon: '📝',
    color: '#D32F2F',
    description: 'نموذج تقديم طلب استقالة',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'hr-leave-request',
    name: 'طلب إجازة',
    category: 'hr',
    icon: '🏖️',
    color: '#0097A7',
    description: 'نموذج طلب إجازة',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'hr-employment-certificate',
    name: 'طلب شهادة تعريف بالعمل',
    category: 'hr',
    icon: '📜',
    color: '#5E35B1',
    description: 'طلب شهادة تعريف',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'hr-salary-certificate',
    name: 'طلب تعريف بالراتب',
    category: 'hr',
    icon: '💰',
    color: '#388E3C',
    description: 'طلب شهادة راتب',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'hr-training-request',
    name: 'طلب تدريب',
    category: 'hr',
    icon: '🎓',
    color: '#F9A825',
    description: 'طلب حضور دورة',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'hr-overtime',
    name: 'طلب عمل إضافي',
    category: 'hr',
    icon: '⏰',
    color: '#E65100',
    description: 'طلب ساعات إضافية',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'admin-purchase-request',
    name: 'طلب شراء',
    category: 'administration',
    icon: '🛒',
    color: '#1565C0',
    description: 'طلب شراء مواد',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'admin-maintenance-request',
    name: 'طلب صيانة',
    category: 'administration',
    icon: '🔧',
    color: '#6D4C41',
    description: 'طلب صيانة',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'admin-room-booking',
    name: 'طلب حجز قاعة',
    category: 'administration',
    icon: '🏢',
    color: '#00838F',
    description: 'حجز قاعة اجتماعات',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'admin-vehicle-request',
    name: 'طلب سيارة نقل',
    category: 'administration',
    icon: '🚐',
    color: '#37474F',
    description: 'طلب سيارة',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'admin-it-support',
    name: 'طلب دعم تقني',
    category: 'administration',
    icon: '💻',
    color: '#283593',
    description: 'طلب دعم فني',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'finance-expense-claim',
    name: 'طلب صرف مصروفات',
    category: 'finance',
    icon: '💳',
    color: '#2E7D32',
    description: 'طلب صرف',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'finance-advance',
    name: 'طلب سلفة',
    category: 'finance',
    icon: '🏦',
    color: '#4527A0',
    description: 'طلب سلفة مالية',
    usageCount: 0,
    fields: [],
  },
  // ── New beneficiary templates ──
  {
    templateId: 'beneficiary-evaluation',
    name: 'نموذج تقييم مستفيد',
    category: 'beneficiary',
    icon: '📊',
    color: '#7B1FA2',
    description: 'تقييم حالة المستفيد',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'beneficiary-discharge',
    name: 'نموذج إخلاء طرف مستفيد',
    category: 'beneficiary',
    icon: '🚪',
    color: '#455A64',
    description: 'إخلاء طرف مستفيد',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'beneficiary-guardian-authorization',
    name: 'تفويض ولي أمر مستفيد',
    category: 'beneficiary',
    icon: '✍️',
    color: '#00695C',
    description: 'تفويض شخص آخر نيابة عن ولي الأمر',
    usageCount: 0,
    fields: [],
  },
  // ── New HR templates ──
  {
    templateId: 'hr-clearance',
    name: 'نموذج إخلاء طرف موظف',
    category: 'hr',
    icon: '📋',
    color: '#795548',
    description: 'إخلاء طرف عند إنهاء الخدمة',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'hr-promotion-request',
    name: 'طلب ترقية موظف',
    category: 'hr',
    icon: '⭐',
    color: '#FF6F00',
    description: 'طلب ترقية بناءً على الأداء',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'hr-business-trip',
    name: 'طلب مهمة عمل / انتداب',
    category: 'hr',
    icon: '✈️',
    color: '#0277BD',
    description: 'طلب انتداب أو مهمة عمل خارجية',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'hr-work-from-home',
    name: 'طلب عمل عن بعد',
    category: 'hr',
    icon: '🏠',
    color: '#558B2F',
    description: 'طلب العمل عن بعد',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'hr-permission-request',
    name: 'طلب استئذان',
    category: 'hr',
    icon: '🕐',
    color: '#AD1457',
    description: 'طلب استئذان أو خروج مبكر',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'hr-loan-letter',
    name: 'طلب خطاب تعاون بنكي',
    category: 'hr',
    icon: '🏛️',
    color: '#1B5E20',
    description: 'خطاب موجه لجهة تمويلية',
    usageCount: 0,
    fields: [],
  },
  // ── New administration templates ──
  {
    templateId: 'admin-exit-permit',
    name: 'طلب تصريح خروج (أصول)',
    category: 'administration',
    icon: '🔑',
    color: '#E65100',
    description: 'تصريح إخراج أصول أو أجهزة',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'admin-stationery-request',
    name: 'طلب قرطاسية ومستلزمات',
    category: 'administration',
    icon: '🗃️',
    color: '#4E342E',
    description: 'طلب مستلزمات مكتبية',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'admin-visitor-request',
    name: 'طلب تصريح زائر',
    category: 'administration',
    icon: '🪪',
    color: '#006064',
    description: 'تصريح دخول زائر',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'admin-key-request',
    name: 'طلب استلام مفاتيح / بطاقة دخول',
    category: 'administration',
    icon: '🔐',
    color: '#BF360C',
    description: 'طلب مفاتيح أو بطاقة',
    usageCount: 0,
    fields: [],
  },
  // ── New finance templates ──
  {
    templateId: 'finance-petty-cash',
    name: 'طلب صرف من العهدة / الصندوق',
    category: 'finance',
    icon: '💵',
    color: '#33691E',
    description: 'صرف من صندوق المصروفات النثرية',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'finance-refund',
    name: 'طلب استرداد مبلغ',
    category: 'finance',
    icon: '🔁',
    color: '#00838F',
    description: 'استرداد مبلغ مالي مدفوع',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'finance-budget-transfer',
    name: 'طلب نقل اعتماد مالي',
    category: 'finance',
    icon: '📊',
    color: '#1A237E',
    description: 'نقل مبلغ من بند مالي لآخر',
    usageCount: 0,
    fields: [],
  },
  // ── General templates ──
  {
    templateId: 'general-suggestion',
    name: 'نموذج اقتراح أو فكرة',
    category: 'general',
    icon: '💡',
    color: '#FFA000',
    description: 'تقديم اقتراح لتطوير العمل',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'general-incident-report',
    name: 'نموذج بلاغ حادثة / طارئ',
    category: 'general',
    icon: '🚨',
    color: '#B71C1C',
    description: 'بلاغ حادثة أو طوارئ',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'general-feedback',
    name: 'نموذج تقييم خدمة / رضا',
    category: 'general',
    icon: '⭐',
    color: '#F57F17',
    description: 'استبيان رضا',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'general-information-request',
    name: 'طلب معلومات رسمي',
    category: 'general',
    icon: 'ℹ️',
    color: '#0288D1',
    description: 'طلب معلومات أو بيانات رسمية',
    usageCount: 0,
    fields: [],
  },
  // ── Batch 2: beneficiary ──
  {
    templateId: 'beneficiary-home-visit',
    name: 'طلب زيارة منزلية',
    category: 'beneficiary',
    icon: '🏡',
    color: '#2E7D32',
    description: 'طلب زيارة منزلية للمستفيد',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'beneficiary-fee-exemption',
    name: 'طلب إعفاء من الرسوم',
    category: 'beneficiary',
    icon: '🎫',
    color: '#00695C',
    description: 'إعفاء كلي أو جزئي من الرسوم',
    usageCount: 0,
    fields: [],
  },
  // ── Batch 2: HR ──
  {
    templateId: 'hr-data-update',
    name: 'طلب تعديل بيانات موظف',
    category: 'hr',
    icon: '✏️',
    color: '#37474F',
    description: 'تعديل بيانات شخصية أو وظيفية',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'hr-housing-allowance',
    name: 'طلب بدل سكن',
    category: 'hr',
    icon: '🏘️',
    color: '#4A148C',
    description: 'صرف أو تعديل بدل سكن',
    usageCount: 0,
    fields: [],
  },
  // ── Batch 2: admin ──
  {
    templateId: 'admin-printing-request',
    name: 'طلب تصوير / طباعة',
    category: 'administration',
    icon: '🖨️',
    color: '#546E7A',
    description: 'طباعة أو تصوير مستندات',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'admin-event-request',
    name: 'طلب تنظيم فعالية / مناسبة',
    category: 'administration',
    icon: '🎉',
    color: '#880E4F',
    description: 'تنظيم فعالية داخل المنشأة',
    usageCount: 0,
    fields: [],
  },
  // ── Batch 2: finance ──
  {
    templateId: 'finance-custody-settlement',
    name: 'طلب تسوية عهدة',
    category: 'finance',
    icon: '📒',
    color: '#3E2723',
    description: 'تسوية عهدة مالية',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'finance-bank-update',
    name: 'طلب تعديل حساب بنكي',
    category: 'finance',
    icon: '🏦',
    color: '#004D40',
    description: 'تحديث بيانات الحساب البنكي',
    usageCount: 0,
    fields: [],
  },
  // ── Batch 2: general ──
  {
    templateId: 'general-experience-certificate',
    name: 'طلب شهادة خبرة',
    category: 'general',
    icon: '🏅',
    color: '#5D4037',
    description: 'إصدار شهادة خبرة',
    usageCount: 0,
    fields: [],
  },
  {
    templateId: 'general-pledge',
    name: 'نموذج إقرار وتعهد',
    category: 'general',
    icon: '📜',
    color: '#263238',
    description: 'توقيع إقرار أو تعهد رسمي',
    usageCount: 0,
    fields: [],
  },
];

const FALLBACK_STATS = {
  totalTemplates: 48,
  totalSubmissions: 0,
  pendingSubmissions: 0,
  approvedSubmissions: 0,
  rejectedSubmissions: 0,
};

/* ═══ Service ═══ */
const formTemplatesService = {
  // ─── Templates ───
  // NOTE: apiClient.baseURL already includes /api, so paths start with /form-templates.
  // The response interceptor returns response.data, so `r` is the JSON body directly.
  getTemplates: (params = {}) =>
    safe(
      () =>
        apiClient
          .get('/form-templates', { params })
          .then(r => r?.templates || (Array.isArray(r) ? r : [])),
      FALLBACK_TEMPLATES.filter(
        t => !params.category || params.category === 'all' || t.category === params.category
      )
    ),

  getTemplate: id =>
    safe(
      () => apiClient.get(`/form-templates/${id}`).then(r => r?.template || r),
      FALLBACK_TEMPLATES.find(t => t.templateId === id) || null
    ),

  createTemplate: data =>
    safe(() => apiClient.post('/form-templates', data), {
      success: true,
      template: { ...data, templateId: `custom-${Date.now()}` },
    }),

  updateTemplate: (id, data) =>
    safe(() => apiClient.put(`/form-templates/${id}`, data), { success: true }),

  deleteTemplate: id => safe(() => apiClient.delete(`/form-templates/${id}`), { success: true }),

  // ─── Categories ───
  getCategories: () =>
    safe(
      () =>
        apiClient
          .get('/form-templates/categories')
          .then(r => r?.categories || (Array.isArray(r) ? r : [])),
      FALLBACK_CATEGORIES
    ),

  // ─── Stats ───
  getStats: () =>
    safe(() => apiClient.get('/form-templates/stats'), {
      stats: FALLBACK_STATS,
      recentSubmissions: [],
    }),

  // ─── Submissions ───
  submitForm: (templateId, data) =>
    safe(() => apiClient.post(`/form-templates/${templateId}/submit`, data), {
      success: true,
      submission: { submissionNumber: `SUB-${Date.now()}`, status: 'submitted' },
    }),

  getMySubmissions: (params = {}) =>
    safe(() => apiClient.get('/form-templates/submissions/my', { params }), {
      submissions: [],
      pagination: { total: 0 },
    }),

  getPendingSubmissions: () =>
    safe(() => apiClient.get('/form-templates/submissions/pending'), { submissions: [] }),

  approveSubmission: (submissionId, comment) =>
    safe(() => apiClient.put(`/form-templates/submissions/${submissionId}/approve`, { comment }), {
      success: true,
    }),

  rejectSubmission: (submissionId, comment) =>
    safe(() => apiClient.put(`/form-templates/submissions/${submissionId}/reject`, { comment }), {
      success: true,
    }),

  // ─── Helpers ───
  getStatusLabel: status => {
    const map = {
      draft: 'مسودة',
      submitted: 'مُرسل',
      under_review: 'قيد المراجعة',
      approved: 'معتمد',
      rejected: 'مرفوض',
      cancelled: 'ملغي',
    };
    return map[status] || status;
  },

  getStatusColor: status => {
    const map = {
      draft: '#9E9E9E',
      submitted: '#1976d2',
      under_review: '#FF9800',
      approved: '#4CAF50',
      rejected: '#F44336',
      cancelled: '#757575',
    };
    return map[status] || '#9E9E9E';
  },

  getCategoryLabel: catId => {
    const cat = FALLBACK_CATEGORIES.find(c => c.id === catId);
    return cat?.label || catId;
  },

  getCategoryColor: catId => {
    const cat = FALLBACK_CATEGORIES.find(c => c.id === catId);
    return cat?.color || '#757575';
  },
};

export default formTemplatesService;
