/**
 * Advanced Analytics Controller
 * Handles HTTP requests for advanced analytics endpoints
 */

const advancedAnalyticsService = require('../services/advanced-analytics.service');

class AdvancedAnalyticsController {
  /**
   * Get comprehensive dashboard analytics
   * GET /api/analytics/dashboard
   */
  async getDashboardAnalytics(req, res) {
    try {
      const filters = {
        startDate: req.query.start_date,
        endDate: req.query.end_date,
        disabilityType: req.query.disability_type,
      };

      const analytics = await advancedAnalyticsService.getDashboardAnalytics(filters);

      res.status(200).json({
        success: true,
        data: analytics,
        message: 'Dashboard analytics retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard analytics',
        error: error.message,
      });
    }
  }

  /**
   * Get program performance metrics
   * GET /api/analytics/program/:id/performance
   */
  async getProgramPerformanceMetrics(req, res) {
    try {
      const { id } = req.params;
      const metrics = await advancedAnalyticsService.getProgramPerformanceMetrics(id);

      res.status(200).json({
        success: true,
        data: metrics,
        message: 'Program performance metrics retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching program performance:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching program performance metrics',
        error: error.message,
      });
    }
  }

  /**
   * Get comparative analysis
   * POST /api/analytics/compare
   */
  async getComparativeAnalysis(req, res) {
    try {
      const { programIds } = req.body;

      if (!programIds || !Array.isArray(programIds) || programIds.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Please provide at least 2 program IDs for comparison',
        });
      }

      const comparison = await advancedAnalyticsService.getComparativeAnalysis(programIds);

      res.status(200).json({
        success: true,
        data: comparison,
        message: 'Comparative analysis completed successfully',
      });
    } catch (error) {
      console.error('Error performing comparative analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Error performing comparative analysis',
        error: error.message,
      });
    }
  }

  /**
   * Get predictive insights
   * GET /api/analytics/predictive/:disabilityType
   */
  async getPredictiveInsights(req, res) {
    try {
      const { disabilityType } = req.params;
      const insights = await advancedAnalyticsService.getPredictiveInsights(disabilityType);

      res.status(200).json({
        success: true,
        data: insights,
        message: 'Predictive insights generated successfully',
      });
    } catch (error) {
      console.error('Error generating predictive insights:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating predictive insights',
        error: error.message,
      });
    }
  }

  /**
   * Get beneficiary journey analytics
   * GET /api/analytics/beneficiary/:beneficiaryId/journey
   */
  async getBeneficiaryJourneyAnalytics(req, res) {
    try {
      const { beneficiaryId } = req.params;
      const journey = await advancedAnalyticsService.getBeneficiaryJourneyAnalytics(beneficiaryId);

      res.status(200).json({
        success: true,
        data: journey,
        message: 'Beneficiary journey analytics retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching beneficiary journey:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching beneficiary journey analytics',
        error: error.message,
      });
    }
  }

  /**
   * Get monthly trends
   * GET /api/analytics/trends/monthly
   */
  async getMonthlyTrends(req, res) {
    try {
      const filters = {
        startDate: req.query.start_date,
        endDate: req.query.end_date,
        disabilityType: req.query.disability_type,
      };

      const matchStage = {};
      if (filters.disabilityType) {
        matchStage['disability_info.primary_disability'] = filters.disabilityType;
      }

      const trends = await advancedAnalyticsService.getMonthlyTrends(matchStage);

      res.status(200).json({
        success: true,
        data: trends,
        message: 'Monthly trends retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching monthly trends:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching monthly trends',
        error: error.message,
      });
    }
  }

  /**
   * Export analytics report
   * GET /api/analytics/export
   */
  async exportAnalyticsReport(req, res) {
    try {
      const { format = 'json', type = 'dashboard' } = req.query;

      let data;
      switch (type) {
        case 'dashboard':
          data = await advancedAnalyticsService.getDashboardAnalytics({});
          break;
        case 'trends':
          data = await advancedAnalyticsService.getMonthlyTrends({});
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid report type',
          });
      }

      if (format === 'json') {
        res.status(200).json({
          success: true,
          data,
          exportedAt: new Date(),
          format: 'json',
        });
      } else if (format === 'csv') {
        // CSV export logic would go here
        res.status(200).send('CSV export not yet implemented');
      } else {
        res.status(400).json({
          success: false,
          message: 'Unsupported export format',
        });
      }
    } catch (error) {
      console.error('Error exporting analytics report:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting analytics report',
        error: error.message,
      });
    }
  }
}

module.exports = new AdvancedAnalyticsController();
