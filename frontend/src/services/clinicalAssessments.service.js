/**
 * clinicalAssessments.service.js — خدمة التقييمات السريرية
 *
 * طبقة API كاملة لوحدة التقييمات السريرية.
 * تتصل بـ /api/admin/assessments مع fallback للبيانات التجريبية.
 */

import apiClient from './api.client';

const BASE = '/api/v1/admin/assessments';

// ── أدوات التقييم المتاحة ───────────────────────────────────────────────────
export const ASSESSMENT_TOOLS = [
  { id: 'CARS', label: 'CARS - مقياس تقدير التوحد في الطفولة', category: 'autism_screening' },
  { id: 'MCHAT', label: 'M-CHAT - قائمة التحقق المعدلة للتوحد', category: 'autism_screening' },
  { id: 'VBMAPP', label: 'VB-MAPP - تقييم المعالم اللفظية', category: 'language' },
  { id: 'DENVER', label: 'Denver II - مقياس دنفر للتطور', category: 'adaptive_behavior' },
  { id: 'VINELAND', label: 'Vineland-3 - مقياس السلوك التكيفي', category: 'adaptive_behavior' },
  { id: 'BAYLEY', label: 'Bayley-4 - مقاييس التطور في الرضع', category: 'cognitive' },
  { id: 'WPPSI', label: 'WPPSI-IV - ذكاء ويكسلر قبل المدرسي', category: 'cognitive' },
  { id: 'WISC', label: 'WISC-V - ذكاء ويكسلر للأطفال', category: 'cognitive' },
  { id: 'PLS', label: 'PLS-5 - مقاييس اللغة ما قبل المدرسة', category: 'language' },
  { id: 'CELF', label: 'CELF-5 - تقييم اللغة الأساسية', category: 'language' },
  { id: 'PEABODY', label: 'Peabody - مقياس التطور الحركي', category: 'motor' },
  { id: 'BRUININKS', label: 'BOT-2 - اختبار برويننكس للكفاءة الحركية', category: 'motor' },
  { id: 'SENSORY_PROFILE', label: 'Sensory Profile-2 - ملف الحسي', category: 'sensory' },
  { id: 'CBCL', label: 'CBCL - قائمة التحقق من سلوك الطفل', category: 'behavioral' },
  { id: 'CONNERS', label: 'Conners-3 - تقييم ADHD', category: 'behavioral' },
  { id: 'GOLDENART', label: 'GAS - مقياس تحقيق الهدف', category: 'quality_of_life' },
  { id: 'PEDI', label: 'PEDI-CAT - جرد تقييم وظيفة الأطفال', category: 'adaptive_behavior' },
  { id: 'OTHER', label: 'أداة تقييم أخرى', category: 'other' },
];

export const CATEGORIES = [
  { value: 'autism_screening', label: 'كشف التوحد' },
  { value: 'adaptive_behavior', label: 'السلوك التكيفي' },
  { value: 'cognitive', label: 'المعرفي' },
  { value: 'language', label: 'اللغة والتواصل' },
  { value: 'motor', label: 'الحركي' },
  { value: 'sensory', label: 'الحسي' },
  { value: 'social_emotional', label: 'الاجتماعي-العاطفي' },
  { value: 'academic', label: 'الأكاديمي' },
  { value: 'behavioral', label: 'السلوكي' },
  { value: 'quality_of_life', label: 'جودة الحياة' },
  { value: 'other', label: 'أخرى' },
];

export const INTERPRETATIONS = [
  { value: 'within_normal', label: 'ضمن المعدل الطبيعي', color: 'success' },
  { value: 'borderline', label: 'حدي', color: 'warning' },
  { value: 'mild', label: 'خفيف', color: 'warning' },
  { value: 'moderate', label: 'متوسط', color: 'error' },
  { value: 'severe', label: 'شديد', color: 'error' },
  { value: 'profound', label: 'عميق', color: 'error' },
  { value: 'not_applicable', label: 'غير قابل للتطبيق', color: 'default' },
];

export const STATUSES = [
  { value: 'draft', label: 'مسودة', color: 'default' },
  { value: 'completed', label: 'مكتمل', color: 'success' },
  { value: 'reviewed', label: 'تمت المراجعة', color: 'info' },
  { value: 'archived', label: 'مؤرشف', color: 'warning' },
];

// ── Mock Fallback ──────────────────────────────────────────────────────────
const MOCK_ASSESSMENTS = [
  {
    _id: 'mock-1',
    tool: 'CARS',
    category: 'autism_screening',
    assessmentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    score: 35,
    rawScore: 35,
    maxRawScore: 60,
    interpretation: 'mild',
    status: 'completed',
    beneficiary: { firstName: 'أحمد', lastName: 'محمد', beneficiaryNumber: 'B001' },
    therapist: { firstName: 'سارة', lastName: 'العتيبي' },
    observations: 'يظهر المستفيد تحسناً ملحوظاً في مهارات التواصل',
    strengths: ['التواصل البصري', 'اللعب التخيلي'],
    concerns: ['الاستجابة للاسم', 'التفاعل الاجتماعي'],
    recommendations: ['برنامج ABA مكثف', 'دعم اللغة'],
  },
  {
    _id: 'mock-2',
    tool: 'VBMAPP',
    category: 'language',
    assessmentDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    score: 65,
    rawScore: 78,
    maxRawScore: 120,
    interpretation: 'moderate',
    status: 'reviewed',
    beneficiary: { firstName: 'فاطمة', lastName: 'الزهراني', beneficiaryNumber: 'B002' },
    therapist: { firstName: 'خالد', lastName: 'الغامدي' },
    observations: 'مستوى اللغة يعادل عمراً لغوياً حوالي 18 شهراً',
    strengths: ['الإشارة', 'التقليد الحركي'],
    concerns: ['المفردات', 'بناء الجملة'],
    recommendations: ['جلسات نطق مكثفة', 'نمذجة اللغة'],
  },
];

// ── Service ────────────────────────────────────────────────────────────────
const clinicalAssessmentsService = {
  /**
   * جلب قائمة التقييمات مع فلاتر متعددة
   */
  async list(params = {}) {
    try {
      const res = await apiClient.get(BASE, { params });
      return res.data;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          items: MOCK_ASSESSMENTS,
          pagination: { total: MOCK_ASSESSMENTS.length, page: 1, pages: 1 },
        };
      }
      throw err;
    }
  },

  /**
   * إحصائيات لوحة القيادة
   */
  async getStats(params = {}) {
    try {
      const res = await apiClient.get(`${BASE}/stats`, { params });
      return res.data;
    } catch {
      return {
        total: MOCK_ASSESSMENTS.length,
        thisMonth: 2,
        byCategory: [],
        byTool: [],
        avgScore: 50,
        recentCount: 2,
      };
    }
  },

  /**
   * قائمة الأدوات المستخدمة (للفلتر)
   */
  async getTools(params = {}) {
    try {
      const res = await apiClient.get(`${BASE}/tools`, { params });
      return res.data?.tools || [];
    } catch {
      return ASSESSMENT_TOOLS.map(t => t.id);
    }
  },

  /**
   * اتجاه النتائج لمستفيد بأداة معينة
   */
  async getTrend(beneficiaryId, tool) {
    try {
      const res = await apiClient.get(`${BASE}/beneficiary/${beneficiaryId}/trend`, {
        params: { tool },
      });
      return res.data;
    } catch {
      return { items: [] };
    }
  },

  /**
   * جلب تقييم واحد
   */
  async getById(id) {
    const res = await apiClient.get(`${BASE}/${id}`);
    return res.data;
  },

  /**
   * إنشاء تقييم جديد
   */
  async create(data) {
    const res = await apiClient.post(BASE, data);
    return res.data;
  },

  /**
   * تحديث تقييم
   */
  async update(id, data) {
    const res = await apiClient.patch(`${BASE}/${id}`, data);
    return res.data;
  },

  /**
   * أرشفة تقييم (حذف ناعم)
   */
  async archive(id) {
    const res = await apiClient.delete(`${BASE}/${id}`);
    return res.data;
  },
};

export default clinicalAssessmentsService;
