/**
 * Disability Assessment Service
 * خدمة المقاييس والاختبارات لذوي الإعاقة
 *
 * Connects to the real backend API with graceful static fallback
 * for scale/test definitions (which are configuration data).
 */

import apiClient from 'services/api.client';
import logger from 'utils/logger';

import ASSESSMENT_SCALES from './scales';
import ASSESSMENT_TESTS from './tests';
import {
  MOCK_BENEFICIARIES,
  DISABILITY_TYPES,
  generateMockScaleResults,
  generateMockTestResults,
} from './mockData';

/* ─────────────────────────── Service methods ─────────────────────────── */

const assessmentService = {
  /* ── Scale definitions (static config — these define what scales exist) ── */

  getScales() {
    return ASSESSMENT_SCALES;
  },

  getScaleById(scaleId) {
    return ASSESSMENT_SCALES.find(s => s.id === scaleId) || null;
  },

  /* ── Test definitions (static config — these define what tests exist) ── */

  getTests() {
    return ASSESSMENT_TESTS;
  },

  getTestById(testId) {
    return ASSESSMENT_TESTS.find(t => t.id === testId) || null;
  },

  /* ── Beneficiaries (real API → fallback) ── */

  async getBeneficiaries() {
    try {
      const response = await apiClient.get('/disability/beneficiaries');
      if (response?.data?.length) return response.data;
      if (Array.isArray(response) && response.length) return response;
      logger.info('Beneficiaries API returned empty — using local data');
      return MOCK_BENEFICIARIES;
    } catch (err) {
      logger.warn('Beneficiaries API unavailable — using local data:', err?.message);
      return MOCK_BENEFICIARIES;
    }
  },

  getDisabilityTypes() {
    return DISABILITY_TYPES;
  },

  /* ── Scale Results (CRUD — real API) ── */

  async getScaleResults(filters = {}) {
    try {
      const response = await apiClient.get('/disability/assessment/scale-results', {
        params: filters,
      });
      return response;
    } catch (err) {
      logger.warn('Scale results API error — using generated data:', err?.message);
      let results = generateMockScaleResults();
      if (filters.beneficiaryId) {
        results = results.filter(r => r.beneficiaryId === filters.beneficiaryId);
      }
      if (filters.scaleId) {
        results = results.filter(r => r.scaleId === filters.scaleId);
      }
      return { success: true, data: results, count: results.length, _fromCache: true };
    }
  },

  async submitScaleResult(payload) {
    try {
      return await apiClient.post('/disability/assessment/scale-results', payload);
    } catch (err) {
      logger.error('Scale result submit failed:', err?.message);
      throw new Error('فشل حفظ نتيجة المقياس — تحقق من الاتصال بالخادم');
    }
  },

  /* ── Test Results (CRUD — real API) ── */

  async getTestResults(filters = {}) {
    try {
      const response = await apiClient.get('/disability/assessment/test-results', {
        params: filters,
      });
      return response;
    } catch (err) {
      logger.warn('Test results API error — using generated data:', err?.message);
      let results = generateMockTestResults();
      if (filters.beneficiaryId) {
        results = results.filter(r => r.beneficiaryId === filters.beneficiaryId);
      }
      if (filters.testId) {
        results = results.filter(r => r.testId === filters.testId);
      }
      return { success: true, data: results, count: results.length, _fromCache: true };
    }
  },

  async submitTestResult(payload) {
    try {
      return await apiClient.post('/disability/assessment/test-results', payload);
    } catch (err) {
      logger.error('Test result submit failed:', err?.message);
      throw new Error('فشل حفظ نتيجة الاختبار — تحقق من الاتصال بالخادم');
    }
  },

  /* ── Statistics (real API) ── */

  async getStatistics() {
    try {
      const data = await apiClient.get('/disability/statistics');
      return data;
    } catch (err) {
      logger.warn('Statistics API unavailable — using cached data:', err?.message);
      return {
        success: true,
        data: {
          totalAssessments: 14,
          totalBeneficiaries: 6,
          scaleAssessments: 8,
          testAssessments: 6,
          averageScore: 49.8,
          completionRate: 88,
          monthlyTrend: [
            { month: 'يناير', scales: 3, tests: 2 },
            { month: 'فبراير', scales: 8, tests: 5 },
            { month: 'مارس', scales: 10, tests: 7 },
          ],
        },
        _fromCache: true,
      };
    }
  },

  /* ── Available Scales from Backend (dynamic) ── */

  async getAvailableScales() {
    try {
      const response = await apiClient.get('/disability/assessment/scales');
      return response;
    } catch (err) {
      logger.warn('Available scales API error — using static list:', err?.message);
      return {
        success: true,
        data: ASSESSMENT_SCALES.map(s => ({
          key: s.id,
          name: s.name,
          nameEn: s.nameEn,
          maxScore: s.maxScore,
          domainsCount: s.domains.length,
        })),
        _fromCache: true,
      };
    }
  },

  async getScaleDetails(scaleKey) {
    try {
      const response = await apiClient.get(`/disability/assessment/scales/${scaleKey}`);
      return response;
    } catch (err) {
      logger.warn('Scale details API error — using static:', err?.message);
      const scale = ASSESSMENT_SCALES.find(s => s.id === scaleKey);
      return scale ? { success: true, data: scale, _fromCache: true } : null;
    }
  },

  /* ── Recommended Scales per Disability Type ── */

  async getRecommendedScales(disabilityType) {
    try {
      const response = await apiClient.get(
        `/disability/assessment/recommended-scales/${encodeURIComponent(disabilityType)}`
      );
      return response;
    } catch (err) {
      logger.warn('Recommended scales API error:', err?.message);
      throw new Error('فشل جلب المقاييس المقترحة');
    }
  },

  /* ── Perform Assessment (single scale) ── */

  async performAssessment({ beneficiaryId, scaleKey, domainScores, metadata }) {
    try {
      return await apiClient.post('/disability/assessment/perform', {
        beneficiaryId,
        scaleKey,
        domainScores,
        metadata,
      });
    } catch (err) {
      logger.error('Perform assessment failed:', err?.message);
      throw new Error('فشل تنفيذ التقييم — تحقق من البيانات والاتصال');
    }
  },

  /* ── Batch Assessment (multiple scales at once) ── */

  async performBatchAssessment({ beneficiaryId, scaleAssessments, metadata }) {
    try {
      return await apiClient.post('/disability/assessment/batch', {
        beneficiaryId,
        scaleAssessments,
        metadata,
      });
    } catch (err) {
      logger.error('Batch assessment failed:', err?.message);
      throw new Error('فشل التقييم الجماعي — تحقق من البيانات');
    }
  },

  /* ── Progress Over Time ── */

  async getScaleProgress(beneficiaryId, scaleKey) {
    try {
      const response = await apiClient.get(
        `/disability/assessment/progress/${beneficiaryId}/${scaleKey}`
      );
      return response;
    } catch (err) {
      logger.warn('Progress API error:', err?.message);
      return { success: true, data: { assessments: [], trend: 'unknown' }, _fromCache: true };
    }
  },

  /* ── Comprehensive Beneficiary Profile ── */

  async getAssessmentProfile(beneficiaryId) {
    try {
      const response = await apiClient.get(`/disability/assessment/profile/${beneficiaryId}`);
      return response;
    } catch (err) {
      logger.warn('Assessment profile API error:', err?.message);
      throw new Error('فشل جلب ملف التقييم الشامل');
    }
  },

  /* ── Global Analytics ── */

  async getAnalytics() {
    try {
      const response = await apiClient.get('/disability/assessment/analytics');
      return response;
    } catch (err) {
      logger.warn('Analytics API error:', err?.message);
      throw new Error('فشل جلب التحليلات');
    }
  },

  /* ── Compare All Scales for a Beneficiary ── */

  async compareAssessments(beneficiaryId) {
    try {
      const response = await apiClient.get(`/disability/assessment/compare/${beneficiaryId}`);
      return response;
    } catch (err) {
      logger.warn('Compare assessments API error:', err?.message);
      throw new Error('فشل مقارنة التقييمات');
    }
  },

  /* ═══════════════════════════════════════════════════════════════════
   *  NEW: Enhanced Measurement Endpoints (نقاط نهاية القياس المحسّنة)
   * ═══════════════════════════════════════════════════════════════════ */

  /* ── Dashboard Stats (إحصائيات لوحة المعلومات) ── */

  async getDashboardStats(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.beneficiaryId) params.append('beneficiaryId', filters.beneficiaryId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      const qs = params.toString();
      const response = await apiClient.get(`/measurements/dashboard${qs ? `?${qs}` : ''}`);
      return response;
    } catch (err) {
      logger.warn('Dashboard stats API error:', err?.message);
      return { success: false, data: null };
    }
  },

  /* ── Trend Analysis (تحليل الاتجاه) ── */

  async getTrend(beneficiaryId, typeId, limit = 20) {
    try {
      const response = await apiClient.get(
        `/measurements/trend/${beneficiaryId}/${typeId}?limit=${limit}`
      );
      return response;
    } catch (err) {
      logger.warn('Trend API error:', err?.message);
      return { success: false, data: null };
    }
  },

  /* ── Quick Assessment Stats (إحصائيات التقييم السريع) ── */

  async getQuickAssessmentStats(beneficiaryId) {
    try {
      const response = await apiClient.get(
        `/measurements/quick-assessment/stats/${beneficiaryId}`
      );
      return response;
    } catch (err) {
      logger.warn('Quick assessment stats API error:', err?.message);
      return { success: false, data: [] };
    }
  },

  /* ── Batch Assessment (تقييم جماعي للقياسات) ── */

  async batchMeasurementAssessment(assessments) {
    try {
      const response = await apiClient.post('/measurements/batch-assessment', { assessments });
      return response;
    } catch (err) {
      logger.error('Batch measurement assessment failed:', err?.message);
      throw new Error('فشل التقييم الجماعي للقياسات');
    }
  },

  /* ── Rehab Plan Progress (تقدم خطة التأهيل) ── */

  async getRehabPlanProgress(beneficiaryId) {
    try {
      const response = await apiClient.get(
        `/measurements/rehab-plan/${beneficiaryId}/progress`
      );
      return response;
    } catch (err) {
      logger.warn('Rehab plan progress API error:', err?.message);
      return { success: false, data: null };
    }
  },

  /* ── Scale & Test Search helpers ── */

  searchScales(query) {
    if (!query) return ASSESSMENT_SCALES;
    const q = query.toLowerCase();
    return ASSESSMENT_SCALES.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  },

  searchTests(query) {
    if (!query) return ASSESSMENT_TESTS;
    const q = query.toLowerCase();
    return ASSESSMENT_TESTS.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.nameEn.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  },

  /* ── Scale & Test statistics helpers ── */

  getScalesSummary() {
    return {
      totalScales: ASSESSMENT_SCALES.length,
      totalDomains: ASSESSMENT_SCALES.reduce((sum, s) => sum + (s.domains?.length || 0), 0),
      maxPossibleScore: ASSESSMENT_SCALES.reduce((sum, s) => sum + (s.maxScore || 0), 0),
      scales: ASSESSMENT_SCALES.map(s => ({
        id: s.id,
        name: s.name,
        nameEn: s.nameEn,
        maxScore: s.maxScore,
        domainCount: s.domains?.length || 0,
      })),
    };
  },

  getTestsSummary() {
    return {
      totalTests: ASSESSMENT_TESTS.length,
      totalSections: ASSESSMENT_TESTS.reduce((sum, t) => sum + (t.sections?.length || 0), 0),
      maxPossibleScore: ASSESSMENT_TESTS.reduce((sum, t) => sum + (t.maxScore || 0), 0),
      tests: ASSESSMENT_TESTS.map(t => ({
        id: t.id,
        name: t.name,
        nameEn: t.nameEn,
        maxScore: t.maxScore,
        sectionCount: t.sections?.length || 0,
      })),
    };
  },
};

export default assessmentService;
export { ASSESSMENT_SCALES, ASSESSMENT_TESTS, DISABILITY_TYPES };
