/**
 * Dashboard Widget Controller
 * متحكم لوحة معلومات الويدجت
 * 
 * يدير جميع العمليات المتعلقة بالويدجط
 */

const widgetManager = require('../services/widgetManager.service');
const templateService = require('../services/widgetTemplate.service');
const configService = require('../services/dashboardConfiguration.service');
const persistenceService = require('../services/widgetPersistence.service');
const Logger = require('../utils/logger');

/**
 * Create widget
 * POST /api/dashboard/widgets/create
 * إنشاء ويدجت جديد
 */
exports.createWidget = async (req, res) => {
  try {
    const { dashboardId, type, title, config, position, size, refreshInterval } = req.body;

    // Validate required fields
    if (!dashboardId || !type || !title) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        en: 'Missing required fields',
        errors: { code: 'MISSING_FIELDS' }
      });
    }

    // Create widget
    const widget = widgetManager.createWidget({
      userId: req.user.id,
      dashboardId,
      type,
      title,
      config,
      position,
      size,
      refreshInterval
    });

    // Save to database
    await persistenceService.saveWidget(req.user.id, dashboardId, widget);

    res.status(201).json({
      success: true,
      message: 'Widget created successfully',
      en: 'Widget created successfully',
      data: widget
    });
  } catch (error) {
    Logger.error(`Error creating widget: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الويدجت',
      en: 'Error creating widget',
      error: { code: 'CREATE_ERROR' }
    });
  }
};

/**
 * Get widget
 * GET /api/dashboard/widgets/:widgetId
 * الحصول على ويدجت
 */
exports.getWidget = async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { dashboardId } = req.query;

    const widget = await persistenceService.loadWidget(req.user.id, dashboardId, widgetId);

    res.status(200).json({
      success: true,
      message: 'Widget retrieved successfully',
      en: 'Widget retrieved successfully',
      data: widget
    });
  } catch (error) {
    Logger.error(`Error getting widget: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في استرجاع الويدجت',
      en: 'Error retrieving widget',
      error: { code: 'GET_ERROR' }
    });
  }
};

/**
 * Update widget
 * PATCH /api/dashboard/widgets/:widgetId
 * تحديث الويدجت
 */
exports.updateWidget = async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { dashboardId, title, config, position, size, refreshInterval } = req.body;

    const updates = {};
    if (title) updates.title = title;
    if (config) updates.config = config;
    if (position) updates.position = position;
    if (size) updates.size = size;
    if (refreshInterval) updates.refreshInterval = refreshInterval;

    const widget = await persistenceService.updateWidget(
      req.user.id,
      dashboardId,
      widgetId,
      updates
    );

    res.status(200).json({
      success: true,
      message: 'Widget updated successfully',
      en: 'Widget updated successfully',
      data: widget
    });
  } catch (error) {
    Logger.error(`Error updating widget: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الويدجت',
      en: 'Error updating widget',
      error: { code: 'UPDATE_ERROR' }
    });
  }
};

/**
 * Delete widget
 * DELETE /api/dashboard/widgets/:widgetId
 * حذف الويدجت
 */
exports.deleteWidget = async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { dashboardId } = req.query;

    await persistenceService.deleteWidget(req.user.id, dashboardId, widgetId);
    widgetManager.deleteWidget(widgetId);

    res.status(200).json({
      success: true,
      message: 'Widget deleted successfully',
      en: 'Widget deleted successfully',
      data: { id: widgetId }
    });
  } catch (error) {
    Logger.error(`Error deleting widget: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الويدجت',
      en: 'Error deleting widget',
      error: { code: 'DELETE_ERROR' }
    });
  }
};

/**
 * Get dashboard widgets
 * GET /api/dashboard/:dashboardId/widgets
 * الحصول على جميع ويدجطس لوحة المعلومات
 */
exports.getDashboardWidgets = async (req, res) => {
  try {
    const { dashboardId } = req.params;

    const widgets = await persistenceService.loadDashboardWidgets(req.user.id, dashboardId);

    res.status(200).json({
      success: true,
      message: 'Widgets retrieved successfully',
      en: 'Widgets retrieved successfully',
      data: {
        count: widgets.length,
        widgets
      }
    });
  } catch (error) {
    Logger.error(`Error getting dashboard widgets: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في استرجاع الويدجطس',
      en: 'Error retrieving widgets',
      error: { code: 'GET_ERROR' }
    });
  }
};

/**
 * Batch save widgets
 * POST /api/dashboard/:dashboardId/widgets/batch
 * حفظ مجموعة من الويدجطس
 */
exports.batchSaveWidgets = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const { widgets } = req.body;

    if (!Array.isArray(widgets)) {
      return res.status(400).json({
        success: false,
        message: 'Widgets must be an array',
        en: 'Widgets must be an array',
        error: { code: 'INVALID_FORMAT' }
      });
    }

    const saved = await persistenceService.batchSaveWidgets(req.user.id, dashboardId, widgets);

    res.status(201).json({
      success: true,
      message: 'Widgets saved successfully',
      en: 'Widgets saved successfully',
      data: {
        count: saved.length,
        widgets: saved
      }
    });
  } catch (error) {
    Logger.error(`Error batch saving widgets: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ الويدجطس',
      en: 'Error saving widgets',
      error: { code: 'BATCH_ERROR' }
    });
  }
};

/**
 * Reorder widgets
 * POST /api/dashboard/:dashboardId/widgets/reorder
 * إعادة ترتيب الويدجطس
 */
exports.reorderWidgets = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const { widgets } = req.body;

    const dashboard = configService.reorderWidgets(dashboardId, widgets);

    res.status(200).json({
      success: true,
      message: 'Widgets reordered successfully',
      en: 'Widgets reordered successfully',
      data: dashboard
    });
  } catch (error) {
    Logger.error(`Error reordering widgets: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في إعادة الترتيب',
      en: 'Error reordering widgets',
      error: { code: 'REORDER_ERROR' }
    });
  }
};

/**
 * Get widget types
 * GET /api/dashboard/widgets/types
 * الحصول على أنواع الويدجط
 */
exports.getWidgetTypes = async (req, res) => {
  try {
    const types = widgetManager.getAvailableTypes();

    res.status(200).json({
      success: true,
      message: 'Widget types retrieved successfully',
      en: 'Widget types retrieved successfully',
      data: types
    });
  } catch (error) {
    Logger.error(`Error getting widget types: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في استرجاع الأنواع',
      en: 'Error retrieving types',
      error: { code: 'GET_ERROR' }
    });
  }
};

/**
 * Create dashboard
 * POST /api/dashboard/create
 * إنشاء لوحة معلومات جديدة
 */
exports.createDashboard = async (req, res) => {
  try {
    const { name, description, theme, gridSize, isPublic } = req.body;

    const dashboard = configService.createDashboard({
      userId: req.user.id,
      name,
      description,
      theme,
      gridSize,
      isPublic
    });

    res.status(201).json({
      success: true,
      message: 'Dashboard created successfully',
      en: 'Dashboard created successfully',
      data: dashboard
    });
  } catch (error) {
    Logger.error(`Error creating dashboard: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء لوحة المعلومات',
      en: 'Error creating dashboard',
      error: { code: 'CREATE_ERROR' }
    });
  }
};

/**
 * Get dashboard
 * GET /api/dashboard/:dashboardId
 * الحصول على لوحة المعلومات
 */
exports.getDashboard = async (req, res) => {
  try {
    const { dashboardId } = req.params;

    const dashboard = configService.getDashboard(dashboardId);

    res.status(200).json({
      success: true,
      message: 'Dashboard retrieved successfully',
      en: 'Dashboard retrieved successfully',
      data: dashboard
    });
  } catch (error) {
    Logger.error(`Error getting dashboard: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في استرجاع لوحة المعلومات',
      en: 'Error retrieving dashboard',
      error: { code: 'GET_ERROR' }
    });
  }
};

/**
 * Get user dashboards
 * GET /api/dashboard/user/all
 * الحصول على جميع لوحات المستخدم
 */
exports.getUserDashboards = async (req, res) => {
  try {
    const dashboards = configService.getUserDashboards(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Dashboards retrieved successfully',
      en: 'Dashboards retrieved successfully',
      data: {
        count: dashboards.length,
        dashboards
      }
    });
  } catch (error) {
    Logger.error(`Error getting user dashboards: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في استرجاع لوحات المعلومات',
      en: 'Error retrieving dashboards',
      error: { code: 'GET_ERROR' }
    });
  }
};

/**
 * Update dashboard
 * PATCH /api/dashboard/:dashboardId
 * تحديث لوحة المعلومات
 */
exports.updateDashboard = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const { name, description, theme, gridSize, isPublic } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (theme) updates.theme = theme;
    if (gridSize) updates.gridSize = gridSize;
    if (isPublic !== undefined) updates.isPublic = isPublic;

    const dashboard = configService.updateDashboard(dashboardId, updates);

    res.status(200).json({
      success: true,
      message: 'Dashboard updated successfully',
      en: 'Dashboard updated successfully',
      data: dashboard
    });
  } catch (error) {
    Logger.error(`Error updating dashboard: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث لوحة المعلومات',
      en: 'Error updating dashboard',
      error: { code: 'UPDATE_ERROR' }
    });
  }
};

/**
 * Delete dashboard
 * DELETE /api/dashboard/:dashboardId
 * حذف لوحة المعلومات
 */
exports.deleteDashboard = async (req, res) => {
  try {
    const { dashboardId } = req.params;

    configService.deleteDashboard(dashboardId);

    res.status(200).json({
      success: true,
      message: 'Dashboard deleted successfully',
      en: 'Dashboard deleted successfully',
      data: { id: dashboardId }
    });
  } catch (error) {
    Logger.error(`Error deleting dashboard: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف لوحة المعلومات',
      en: 'Error deleting dashboard',
      error: { code: 'DELETE_ERROR' }
    });
  }
};

/**
 * Get templates
 * GET /api/dashboard/templates
 * الحصول على القوالب
 */
exports.getTemplates = async (req, res) => {
  try {
    const { category, search } = req.query;

    const templates = templateService.getAllTemplates({ category, search });

    res.status(200).json({
      success: true,
      message: 'Templates retrieved successfully',
      en: 'Templates retrieved successfully',
      data: {
        count: templates.length,
        templates
      }
    });
  } catch (error) {
    Logger.error(`Error getting templates: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في استرجاع القوالب',
      en: 'Error retrieving templates',
      error: { code: 'GET_ERROR' }
    });
  }
};

/**
 * Create template
 * POST /api/dashboard/templates/create
 * إنشاء قالب
 */
exports.createTemplate = async (req, res) => {
  try {
    const { name, category, description, icon, widgets, isPublic } = req.body;

    const template = templateService.createTemplate({
      userId: req.user.id,
      name,
      category,
      description,
      icon,
      widgets,
      isPublic
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      en: 'Template created successfully',
      data: template
    });
  } catch (error) {
    Logger.error(`Error creating template: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء القالب',
      en: 'Error creating template',
      error: { code: 'CREATE_ERROR' }
    });
  }
};

/**
 * Apply theme
 * POST /api/dashboard/:dashboardId/theme/:themeName
 * تطبيق موضوع
 */
exports.applyTheme = async (req, res) => {
  try {
    const { dashboardId, themeName } = req.params;

    const dashboard = configService.applyTheme(dashboardId, themeName);

    res.status(200).json({
      success: true,
      message: 'Theme applied successfully',
      en: 'Theme applied successfully',
      data: dashboard
    });
  } catch (error) {
    Logger.error(`Error applying theme: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في تطبيق الموضوع',
      en: 'Error applying theme',
      error: { code: 'APPLY_ERROR' }
    });
  }
};

/**
 * Get themes
 * GET /api/dashboard/themes
 * الحصول على المواضيع
 */
exports.getThemes = async (req, res) => {
  try {
    const themes = configService.getAvailableThemes();

    res.status(200).json({
      success: true,
      message: 'Themes retrieved successfully',
      en: 'Themes retrieved successfully',
      data: themes
    });
  } catch (error) {
    Logger.error(`Error getting themes: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في استرجاع المواضيع',
      en: 'Error retrieving themes',
      error: { code: 'GET_ERROR' }
    });
  }
};

/**
 * Create snapshot
 * POST /api/dashboard/:dashboardId/snapshot
 * إنشاء صورة حفظ
 */
exports.createSnapshot = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const { name } = req.body;

    const snapshotId = configService.createSnapshot(dashboardId, name);

    res.status(201).json({
      success: true,
      message: 'Snapshot created successfully',
      en: 'Snapshot created successfully',
      data: { snapshotId }
    });
  } catch (error) {
    Logger.error(`Error creating snapshot: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الصورة',
      en: 'Error creating snapshot',
      error: { code: 'CREATE_ERROR' }
    });
  }
};

/**
 * Restore snapshot
 * POST /api/dashboard/:dashboardId/snapshot/:snapshotId/restore
 * استعادة صورة حفظ
 */
exports.restoreSnapshot = async (req, res) => {
  try {
    const { dashboardId, snapshotId } = req.params;

    const dashboard = configService.restoreSnapshot(dashboardId, snapshotId);

    res.status(200).json({
      success: true,
      message: 'Snapshot restored successfully',
      en: 'Snapshot restored successfully',
      data: dashboard
    });
  } catch (error) {
    Logger.error(`Error restoring snapshot: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في استعادة الصورة',
      en: 'Error restoring snapshot',
      error: { code: 'RESTORE_ERROR' }
    });
  }
};

/**
 * Export dashboard
 * GET /api/dashboard/:dashboardId/export
 * تصدير لوحة المعلومات
 */
exports.exportDashboard = async (req, res) => {
  try {
    const { dashboardId } = req.params;

    const config = await persistenceService.exportDashboard(req.user.id, dashboardId);

    res.status(200).json({
      success: true,
      message: 'Dashboard exported successfully',
      en: 'Dashboard exported successfully',
      data: config
    });
  } catch (error) {
    Logger.error(`Error exporting dashboard: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في تصدير لوحة المعلومات',
      en: 'Error exporting dashboard',
      error: { code: 'EXPORT_ERROR' }
    });
  }
};

/**
 * Import dashboard
 * POST /api/dashboard/:dashboardId/import
 * استيراد لوحة المعلومات
 */
exports.importDashboard = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const { config } = req.body;

    const widgets = await persistenceService.importDashboard(req.user.id, dashboardId, config);

    res.status(201).json({
      success: true,
      message: 'Dashboard imported successfully',
      en: 'Dashboard imported successfully',
      data: {
        count: widgets.length,
        widgets
      }
    });
  } catch (error) {
    Logger.error(`Error importing dashboard: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في استيراد لوحة المعلومات',
      en: 'Error importing dashboard',
      error: { code: 'IMPORT_ERROR' }
    });
  }
};

/**
 * Get stats
 * GET /api/dashboard/stats
 * الحصول على الإحصائيات
 */
exports.getStats = async (req, res) => {
  try {
    const widgetStats = widgetManager.getWidgetStats();
    const dashboardStats = configService.getDashboardStats();
    const storageStats = persistenceService.getStorageStats();

    res.status(200).json({
      success: true,
      message: 'Statistics retrieved successfully',
      en: 'Statistics retrieved successfully',
      data: {
        widgets: widgetStats,
        dashboards: dashboardStats,
        storage: storageStats
      }
    });
  } catch (error) {
    Logger.error(`Error getting stats: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'خطأ في استرجاع الإحصائيات',
      en: 'Error retrieving statistics',
      error: { code: 'GET_ERROR' }
    });
  }
};

/**
 * Health check
 * GET /api/dashboard/health
 * فحص الصحة
 */
exports.healthCheck = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Dashboard system is healthy',
      en: 'Dashboard system is healthy',
      data: {
        status: 'operational',
        timestamp: new Date(),
        services: {
          widgets: 'active',
          templates: 'active',
          persistence: 'active',
          configuration: 'active'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في النظام',
      en: 'System error',
      error: { code: 'HEALTH_ERROR' }
    });
  }
};
