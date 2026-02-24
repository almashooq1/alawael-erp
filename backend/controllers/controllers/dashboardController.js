/**
 * Dashboard Controller
 * Handles HTTP requests for dashboard operations
 * Maps requests to DashboardService methods
 */

const DashboardService = require('../services/dashboardService');

class DashboardController {
  constructor() {
    this.dashboardService = new DashboardService();
  }

  /**
   * Create a new dashboard
   * POST /api/v1/dashboards
   */
  async createDashboard(req, res, next) {
    try {
      const { name, description, layout, refreshInterval, columns } = req.body;

      // Validation
      if (!name) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Dashboard name is required',
          code: 'MISSING_NAME'
        });
      }

      const dashboard = this.dashboardService.createDashboard(req.user.id, {
        name,
        description,
        layout: layout || 'grid',
        refreshInterval: refreshInterval || 30000,
        columns: columns || 12
      });

      res.status(201).json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard by ID
   * GET /api/v1/dashboards/:id
   */
  async getDashboard(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Dashboard ID is required',
          code: 'MISSING_ID'
        });
      }

      const dashboard = this.dashboardService.getDashboard(id);

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'not_found',
          message: error.message,
          code: 'DASHBOARD_NOT_FOUND'
        });
      }
      next(error);
    }
  }

  /**
   * List user's dashboards
   * GET /api/v1/dashboards
   */
  async listDashboards(req, res, next) {
    try {
      const { owned, limit = 10, offset = 0 } = req.query;

      const filters = {};
      if (owned === 'true') {
        filters.owned = true;
      }

      const dashboards = this.dashboardService.listDashboards(
        req.user.id,
        filters
      );

      const paginated = dashboards.slice(
        parseInt(offset),
        parseInt(offset) + parseInt(limit)
      );

      res.json({
        success: true,
        data: paginated,
        total: dashboards.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update dashboard
   * PUT /api/v1/dashboards/:id
   */
  async updateDashboard(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, layout, refreshInterval, columns } = req.body;

      const updated = this.dashboardService.updateDashboard(id, {
        name,
        description,
        layout,
        refreshInterval,
        columns,
        updatedAt: new Date()
      });

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'not_found',
          message: error.message,
          code: 'DASHBOARD_NOT_FOUND'
        });
      }
      next(error);
    }
  }

  /**
   * Delete dashboard
   * DELETE /api/v1/dashboards/:id
   */
  async deleteDashboard(req, res, next) {
    try {
      const { id } = req.params;

      this.dashboardService.deleteDashboard(id);

      res.status(204).send();
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'not_found',
          message: error.message,
          code: 'DASHBOARD_NOT_FOUND'
        });
      }
      next(error);
    }
  }

  /**
   * Add widget to dashboard
   * POST /api/v1/dashboards/:id/widgets
   */
  async addWidget(req, res, next) {
    try {
      const { id } = req.params;
      const { type, title, position, config } = req.body;

      if (!type || !title) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Widget type and title are required',
          code: 'MISSING_WIDGET_FIELDS'
        });
      }

      const widget = this.dashboardService.addWidget(id, {
        type,
        title,
        position: position || { x: 0, y: 0, width: 6, height: 4 },
        config: config || {}
      });

      res.status(201).json({
        success: true,
        data: widget
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update widget
   * PUT /api/v1/dashboards/:dashboardId/widgets/:widgetId
   */
  async updateWidget(req, res, next) {
    try {
      const { _dashboardId, widgetId } = req.params;
      const { title, position, config } = req.body;

      const widget = this.dashboardService.updateWidget(widgetId, {
        title,
        position,
        config
      });

      res.json({
        success: true,
        data: widget
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove widget from dashboard
   * DELETE /api/v1/dashboards/:dashboardId/widgets/:widgetId
   */
  async removeWidget(req, res, next) {
    try {
      const { dashboardId, widgetId } = req.params;

      this.dashboardService.removeWidget(dashboardId, widgetId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get widget data
   * GET /api/v1/dashboards/:dashboardId/widgets/:widgetId/data
   */
  async getWidgetData(req, res, next) {
    try {
      const { widgetId } = req.params;

      const data = this.dashboardService.getWidgetData(widgetId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh widget data
   * POST /api/v1/dashboards/:dashboardId/widgets/:widgetId/refresh
   */
  async refreshWidget(req, res, next) {
    try {
      const { widgetId } = req.params;

      const result = this.dashboardService.refreshWidget(widgetId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Share dashboard with users
   * POST /api/v1/dashboards/:id/share
   */
  async shareDashboard(req, res, next) {
    try {
      const { id } = req.params;
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds)) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'userIds array is required',
          code: 'INVALID_USER_IDS'
        });
      }

      const result = this.dashboardService.shareDashboard(id, userIds);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard statistics
   * GET /api/v1/dashboards/:id/stats
   */
  async getDashboardStats(req, res, next) {
    try {
      const { id } = req.params;

      const stats = this.dashboardService.getDashboardStats(id);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DashboardController;
