/**
 * Dashboard Widget Routes
 * مسارات لوحة معلومات الويدجت
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardWidget.controller');

/**
 * Widget Management Routes
 * مسارات إدارة الويدجط
 */

/**
 * POST /api/dashboard/widgets/create
 * إنشاء ويدجت جديد
 * @param {String} dashboardId - Dashboard ID
 * @param {String} type - Widget type
 * @param {String} title - Widget title
 */
router.post('/widgets/create', protect, dashboardController.createWidget);

/**
 * GET /api/dashboard/widgets/:widgetId
 * الحصول على ويدجت
 * @param {String} widgetId - Widget ID
 */
router.get('/widgets/:widgetId', protect, dashboardController.getWidget);

/**
 * PATCH /api/dashboard/widgets/:widgetId
 * تحديث الويدجت
 * @param {String} widgetId - Widget ID
 */
router.patch('/widgets/:widgetId', protect, dashboardController.updateWidget);

/**
 * DELETE /api/dashboard/widgets/:widgetId
 * حذف الويدجت
 * @param {String} widgetId - Widget ID
 */
router.delete('/widgets/:widgetId', protect, dashboardController.deleteWidget);

/**
 * GET /api/dashboard/widgets/types
 * الحصول على أنواع الويدجط
 */
router.get('/widgets/types', protect, dashboardController.getWidgetTypes);

/**
 * Dashboard Management Routes
 * مسارات إدارة لوحة المعلومات
 */

/**
 * POST /api/dashboard/create
 * إنشاء لوحة معلومات جديدة
 * @param {String} name - Dashboard name
 * @param {String} description - Dashboard description
 * @param {String} theme - Theme name
 */
router.post('/create', protect, dashboardController.createDashboard);

/**
 * GET /api/dashboard/:dashboardId
 * الحصول على لوحة المعلومات
 * @param {String} dashboardId - Dashboard ID
 */
router.get('/:dashboardId', protect, dashboardController.getDashboard);

/**
 * GET /api/dashboard/:dashboardId/widgets
 * الحصول على جميع ويدجطس لوحة المعلومات
 * @param {String} dashboardId - Dashboard ID
 */
router.get('/:dashboardId/widgets', protect, dashboardController.getDashboardWidgets);

/**
 * POST /api/dashboard/:dashboardId/widgets/batch
 * حفظ مجموعة من الويدجطس
 * @param {String} dashboardId - Dashboard ID
 * @param {Array} widgets - Widgets array
 */
router.post('/:dashboardId/widgets/batch', protect, dashboardController.batchSaveWidgets);

/**
 * POST /api/dashboard/:dashboardId/widgets/reorder
 * إعادة ترتيب الويدجطس
 * @param {String} dashboardId - Dashboard ID
 * @param {Array} widgets - Reordered widgets
 */
router.post('/:dashboardId/widgets/reorder', protect, dashboardController.reorderWidgets);

/**
 * GET /api/dashboard/user/all
 * الحصول على جميع لوحات المستخدم
 */
router.get('/user/all', protect, dashboardController.getUserDashboards);

/**
 * PATCH /api/dashboard/:dashboardId
 * تحديث لوحة المعلومات
 * @param {String} dashboardId - Dashboard ID
 */
router.patch('/:dashboardId', protect, dashboardController.updateDashboard);

/**
 * DELETE /api/dashboard/:dashboardId
 * حذف لوحة المعلومات
 * @param {String} dashboardId - Dashboard ID
 */
router.delete('/:dashboardId', protect, dashboardController.deleteDashboard);

/**
 * Template Management Routes
 * مسارات إدارة القوالب
 */

/**
 * GET /api/dashboard/templates
 * الحصول على القوالب
 * @query {String} category - Optional category filter
 * @query {String} search - Optional search term
 */
router.get('/templates', protect, dashboardController.getTemplates);

/**
 * POST /api/dashboard/templates/create
 * إنشاء قالب
 * @param {String} name - Template name
 * @param {String} category - Template category
 * @param {Array} widgets - Template widgets
 */
router.post('/templates/create', protect, dashboardController.createTemplate);

/**
 * Theme Management Routes
 * مسارات إدارة المواضيع
 */

/**
 * GET /api/dashboard/themes
 * الحصول على المواضيع المتاحة
 */
router.get('/themes', protect, dashboardController.getThemes);

/**
 * POST /api/dashboard/:dashboardId/theme/:themeName
 * تطبيق موضوع على لوحة المعلومات
 * @param {String} dashboardId - Dashboard ID
 * @param {String} themeName - Theme name
 */
router.post('/:dashboardId/theme/:themeName', protect, dashboardController.applyTheme);

/**
 * Snapshot Management Routes
 * مسارات إدارة صور الحفظ
 */

/**
 * POST /api/dashboard/:dashboardId/snapshot
 * إنشاء صورة حفظ
 * @param {String} dashboardId - Dashboard ID
 * @param {String} name - Optional snapshot name
 */
router.post('/:dashboardId/snapshot', protect, dashboardController.createSnapshot);

/**
 * POST /api/dashboard/:dashboardId/snapshot/:snapshotId/restore
 * استعادة صورة حفظ
 * @param {String} dashboardId - Dashboard ID
 * @param {String} snapshotId - Snapshot ID
 */
router.post('/:dashboardId/snapshot/:snapshotId/restore', protect, dashboardController.restoreSnapshot);

/**
 * Import/Export Routes
 * مسارات الاستيراد والتصدير
 */

/**
 * GET /api/dashboard/:dashboardId/export
 * تصدير لوحة المعلومات
 * @param {String} dashboardId - Dashboard ID
 */
router.get('/:dashboardId/export', protect, dashboardController.exportDashboard);

/**
 * POST /api/dashboard/:dashboardId/import
 * استيراد لوحة المعلومات
 * @param {String} dashboardId - Dashboard ID
 * @param {Object} config - Configuration to import
 */
router.post('/:dashboardId/import', protect, dashboardController.importDashboard);

/**
 * Statistics & Health Routes
 * مسارات الإحصائيات والصحة
 */

/**
 * GET /api/dashboard/stats
 * الحصول على الإحصائيات
 */
router.get('/stats', protect, dashboardController.getStats);

/**
 * GET /api/dashboard/health
 * فحص الصحة
 */
router.get('/health', dashboardController.healthCheck);

module.exports = router;
