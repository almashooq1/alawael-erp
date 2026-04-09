/**
 * Document Pro Service — خدمة إدارة المستندات الاحترافية
 * ═══════════════════════════════════════════════════════
 * واجهة API موحدة للذكاء الاصطناعي، سير العمل، البحث المتقدم،
 * الإشعارات، التحليلات الذكية
 */

import apiClient from './api.client';

const BASE = '/api/documents-pro';

// ── مساعد الطلبات ─────────────────────────────────────────
async function request(method, url, data = null, params = null) {
  try {
    const config = { method, url: `${BASE}${url}` };
    if (data) config.data = data;
    if (params) config.params = params;
    const response = await apiClient(config);
    return response.data;
  } catch (err) {
    const message = err.response?.data?.message || err.message || 'خطأ غير متوقع';
    console.error(`[DocumentPro] ${method} ${url}: ${message}`);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════
//  📊 لوحة المعلومات
// ═══════════════════════════════════════════════════════════

export const getDashboard = () => request('GET', '/dashboard');

// ═══════════════════════════════════════════════════════════
//  🧠 الذكاء الاصطناعي
// ═══════════════════════════════════════════════════════════

/** تصنيف تلقائي */
export const classifyDocument = data => request('POST', '/intelligence/classify', data);

/** تصنيف مجموعة مستندات */
export const classifyBulk = documentIds =>
  request('POST', '/intelligence/classify-bulk', { documentIds });

/** فحص التكرار */
export const checkDuplicates = (documentId, threshold = 0.7) =>
  request('POST', '/intelligence/duplicates', { documentId, threshold });

/** تلخيص مستند */
export const summarizeDocument = (documentId, maxSentences = 3) =>
  request('POST', '/intelligence/summarize', { documentId, maxSentences });

/** التوصيات الذكية */
export const getRecommendations = documentId =>
  request('GET', `/intelligence/recommendations/${documentId}`);

/** التحليلات */
export const getAnalytics = () => request('GET', '/intelligence/analytics');

/** التكوين */
export const getIntelligenceConfig = () => request('GET', '/intelligence/config');

// ═══════════════════════════════════════════════════════════
//  ⚙️ سير العمل
// ═══════════════════════════════════════════════════════════

/** إنشاء سير عمل */
export const createWorkflow = (documentId, templateId, options = {}) =>
  request('POST', '/workflow/create', { documentId, templateId, ...options });

/** تنفيذ انتقال */
export const executeTransition = (workflowId, newStatus, options = {}) =>
  request('POST', `/workflow/${workflowId}/transition`, { newStatus, ...options });

/** جلب سير عمل المستند */
export const getDocumentWorkflow = documentId => request('GET', `/workflow/document/${documentId}`);

/** المهام المعلقة */
export const getPendingTasks = (params = {}) => request('GET', '/workflow/pending', null, params);

/** تفويض المهمة */
export const delegateTask = (workflowId, toUserId, comments = '') =>
  request('POST', `/workflow/${workflowId}/delegate`, { toUserId, comments });

/** تصعيد سير العمل */
export const escalateWorkflow = (workflowId, escalateTo) =>
  request('POST', `/workflow/${workflowId}/escalate`, { escalateTo });

/** إحصائيات سير العمل */
export const getWorkflowStats = (params = {}) => request('GET', '/workflow/stats', null, params);

/** قوالب سير العمل */
export const getWorkflowTemplates = () => request('GET', '/workflow/templates');

// ═══════════════════════════════════════════════════════════
//  🔍 البحث المتقدم
// ═══════════════════════════════════════════════════════════

/** بحث متقدم */
export const advancedSearch = (params = {}) => request('GET', '/search', null, params);

/** بحث فوري */
export const quickSearch = (q, limit = 8) => request('GET', '/search/quick', null, { q, limit });

/** بحث في المحتوى */
export const searchContent = (params = {}) => request('GET', '/search/content', null, params);

/** حفظ بحث */
export const saveSearch = searchData => request('POST', '/search/save', searchData);

/** جلب البحوث المحفوظة */
export const getSavedSearches = () => request('GET', '/search/saved');

/** تنفيذ بحث محفوظ */
export const executeSavedSearch = (searchId, options = {}) =>
  request('POST', `/search/saved/${searchId}/execute`, options);

/** حذف بحث محفوظ */
export const deleteSavedSearch = searchId => request('DELETE', `/search/saved/${searchId}`);

// ═══════════════════════════════════════════════════════════
//  🔔 الإشعارات
// ═══════════════════════════════════════════════════════════

/** جلب الإشعارات */
export const getNotifications = (params = {}) => request('GET', '/notifications', null, params);

/** ملخص الإشعارات */
export const getNotificationSummary = () => request('GET', '/notifications/summary');

/** تحديد كمقروء */
export const markNotificationRead = notificationId =>
  request('PUT', `/notifications/${notificationId}/read`);

/** تحديد الكل كمقروء */
export const markAllNotificationsRead = () => request('PUT', '/notifications/read-all');

/** حذف إشعار */
export const deleteNotification = notificationId =>
  request('DELETE', `/notifications/${notificationId}`);

/** تفضيلات الإشعارات */
export const getNotificationPreferences = () => request('GET', '/notifications/preferences');

/** تحديث التفضيلات */
export const updateNotificationPreferences = updates =>
  request('PUT', '/notifications/preferences', updates);

// ═══════════════════════════════════════════════════════════
//  📋 التكوين العام
// ═══════════════════════════════════════════════════════════

/** جلب جميع الثوابت */
export const getFullConfig = () => request('GET', '/config');

// ── تصدير موحد ────────────────────────────────────────────
const documentProService = {
  // Dashboard
  getDashboard,
  // Intelligence
  classifyDocument,
  classifyBulk,
  checkDuplicates,
  summarizeDocument,
  getRecommendations,
  getAnalytics,
  getIntelligenceConfig,
  // Workflow
  createWorkflow,
  executeTransition,
  getDocumentWorkflow,
  getPendingTasks,
  delegateTask,
  escalateWorkflow,
  getWorkflowStats,
  getWorkflowTemplates,
  // Search
  advancedSearch,
  quickSearch,
  searchContent,
  saveSearch,
  getSavedSearches,
  executeSavedSearch,
  deleteSavedSearch,
  // Notifications
  getNotifications,
  getNotificationSummary,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  // Config
  getFullConfig,
};

export default documentProService;
