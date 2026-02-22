const express = require('express');
const router = express.Router();

// Import Advanced Services
const supplierAnalytics = require('../services/supplier.analytics.service');
const aiForecast = require('../services/ai.forecasting.service');
const reporting = require('../services/procurement.reporting.service');
const supplierMgmt = require('../services/supplier.management.advanced.service');

// Middleware
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║          SUPPLIER ANALYTICS ROUTES (تحليل الموردين)        ║
 * ╚════════════════════════════════════════════════════════════╝
 */

/**
 * GET /api/v1/procurement/analytics/suppliers/:id/performance
 * تقييم أداء المورد الشامل
 */
router.get(
  '/analytics/suppliers/:id/performance',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await supplierAnalytics.evaluateSupplierPerformance(req.params.id);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/analytics/suppliers/:id/cost-trends
 * تحليل التكاليف والأسعار
 */
router.get(
  '/analytics/suppliers/:id/cost-trends',
  authenticateToken,
  async (req, res) => {
    try {
      const days = req.query.days || 90;
      const result = await supplierAnalytics.analyzeCostTrends(req.params.id, parseInt(days));
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/analytics/suppliers/compare
 * مقارنة الموردين
 */
router.get(
  '/analytics/suppliers/compare',
  authenticateToken,
  async (req, res) => {
    try {
      const category = req.query.category || null;
      const result = await supplierAnalytics.compareSuppliers(category);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/analytics/suppliers/:id/report
 * تقرير الأداء الشامل للمورد
 */
router.get(
  '/analytics/suppliers/:id/report',
  authenticateToken,
  async (req, res) => {
    try {
      const period = req.query.period || 'quarterly';
      const result = await supplierAnalytics.generateSupplierReport(
        req.params.id,
        period
      );
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/analytics/suppliers/:id/risk
 * تحليل المخاطر
 */
router.get(
  '/analytics/suppliers/:id/risk',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await supplierAnalytics.analyzeSupplierRisk(req.params.id);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/analytics/suppliers/best/:count
 * تحديد أفضل الموردين
 */
router.get(
  '/analytics/suppliers/best/:count',
  authenticateToken,
  async (req, res) => {
    try {
      const limit = parseInt(req.params.count) || 5;
      const category = req.query.category || null;
      const result = await supplierAnalytics.identifyBestSuppliers(limit, category);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/analytics/diversification
 * تقرير التنويع
 */
router.get(
  '/analytics/diversification',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await supplierAnalytics.supplierDiversificationReport();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║        AI FORECASTING ROUTES (التنبؤات الذكية)            ║
 * ╚════════════════════════════════════════════════════════════╝
 */

/**
 * GET /api/v1/procurement/forecast/demand/:productCode
 * التنبؤ المتقدم بالطلب
 */
router.get(
  '/forecast/demand/:productCode',
  authenticateToken,
  async (req, res) => {
    try {
      const days = req.query.days || 90;
      const result = await aiForecast.advancedDemandForecast(
        req.params.productCode,
        parseInt(days)
      );
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/forecast/stockout-risk
 * التنبؤ بمخاطر نفاد المخزون
 */
router.get(
  '/forecast/stockout-risk',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await aiForecast.predictStockOutRisk();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/forecast/patterns
 * تحليل أنماط الشراء
 */
router.get(
  '/forecast/patterns',
  authenticateToken,
  async (req, res) => {
    try {
      const days = req.query.days || 90;
      const result = await aiForecast.analyzePurchasePatterns(parseInt(days));
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/forecast/recommendations
 * التوصيات الذكية للشراء
 */
router.get(
  '/forecast/recommendations',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await aiForecast.getSmartPurchasingRecommendations();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/forecast/scenarios/:productCode
 * محاكاة السيناريوهات
 */
router.get(
  '/forecast/scenarios/:productCode',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await aiForecast.simulateScenarios(req.params.productCode);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║        REPORTING ROUTES (التقارير الشاملة)                ║
 * ╚════════════════════════════════════════════════════════════╝
 */

/**
 * GET /api/v1/procurement/reports/spending
 * تقرير النفقات
 */
router.get(
  '/reports/spending',
  authenticateToken,
  async (req, res) => {
    try {
      const { startDate, endDate, supplierId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate required'
        });
      }

      const result = await reporting.generateSpendingReport(
        new Date(startDate),
        new Date(endDate),
        { supplierId }
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/reports/supplier-performance
 * تقرير أداء الموردين
 */
router.get(
  '/reports/supplier-performance',
  authenticateToken,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate required'
        });
      }

      const result = await reporting.generateSupplierPerformanceReport(
        new Date(startDate),
        new Date(endDate)
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/reports/operational
 * تقرير الأداء التشغيلي
 */
router.get(
  '/reports/operational',
  authenticateToken,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate required'
        });
      }

      const result = await reporting.generateOperationalPerformanceReport(
        new Date(startDate),
        new Date(endDate)
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/reports/alerts
 * تقرير التنبيهات والمشاكل
 */
router.get(
  '/reports/alerts',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await reporting.generateAlertAndIssueReport();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/reports/compliance
 * تقرير الامتثال والمخاطر
 */
router.get(
  '/reports/compliance',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await reporting.generateComplianceAndRiskReport();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║      SUPPLIER MANAGEMENT ROUTES (إدارة العلاقات)          ║
 * ╚════════════════════════════════════════════════════════════╝
 */

/**
 * GET /api/v1/procurement/management/suppliers/:id/capabilities
 * تقييم قدرات المورد
 */
router.get(
  '/management/suppliers/:id/capabilities',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await supplierMgmt.assessSupplierCapabilities(req.params.id);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * POST /api/v1/procurement/management/supplier-pools
 * إنشاء تجمع موردين ديناميكي
 */
router.post(
  '/management/supplier-pools',
  authenticateToken,
  async (req, res) => {
    try {
      const { category, targetQuality } = req.body;
      
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category is required'
        });
      }

      const result = await supplierMgmt.createDynamicSupplierPool(
        category,
        targetQuality || 3.5
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * POST /api/v1/procurement/management/optimize-allocation
 * تحسين توزيع الطلبيات
 */
router.post(
  '/management/optimize-allocation',
  authenticateToken,
  async (req, res) => {
    try {
      const { itemsNeeded, category } = req.body;
      
      if (!itemsNeeded || !category) {
        return res.status(400).json({
          success: false,
          message: 'itemsNeeded and category are required'
        });
      }

      const result = await supplierMgmt.optimizeOrderAllocation(
        itemsNeeded,
        category
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/management/suppliers/:id/relationships
 * إدارة العلاقات مع المورد
 */
router.get(
  '/management/suppliers/:id/relationships',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await supplierMgmt.manageSupplierRelationships(req.params.id);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║              DASHBOARD ROUTES (لوحات المعلومات)           ║
 * ╚════════════════════════════════════════════════════════════╝
 */

/**
 * GET /api/v1/procurement/dashboard/executive-summary
 * ملخص تنفيذي شامل
 */
router.get(
  '/dashboard/executive-summary',
  authenticateToken,
  async (req, res) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const now = new Date();

      const [alerts, spending, stockouts, compliance] = await Promise.all([
        reporting.generateAlertAndIssueReport(),
        reporting.generateSpendingReport(thirtyDaysAgo, now),
        aiForecast.predictStockOutRisk(),
        reporting.generateComplianceAndRiskReport(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          alerts: {
            total: alerts.data.totalAlerts,
            critical: alerts.data.criticalAlerts,
            topAlerts: alerts.data.alerts.slice(0, 5),
          },
          spending: {
            period: '30 days',
            totalSpend: spending.data.summary.totalSpend,
            totalOrders: spending.data.summary.totalOrders,
            averageOrderValue: spending.data.summary.averageOrderValue,
            topSuppliers: spending.data.paretoAnalysis.topSuppliers.slice(0, 3),
          },
          inventory: {
            atRisk: stockouts.data.totalAtRisk,
            critical: stockouts.data.critical,
            topRiskItems: stockouts.data.items.slice(0, 3),
          },
          compliance: {
            activeContracts: compliance.data.contractCompliance.activeContracts,
            expiringWithin30Days: compliance.data.contractCompliance.expiringWithin30Days,
            totalSuppliers: compliance.data.supplierCompliance.activeSuppliershop,
          },
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/dashboard/supplier-analytics
 * لوحة تحليلات الموردين
 */
router.get(
  '/dashboard/supplier-analytics',
  authenticateToken,
  async (req, res) => {
    try {
      const [comparison, diversification, risks] = await Promise.all([
        supplierAnalytics.compareSuppliers(),
        supplierAnalytics.supplierDiversificationReport(),
        (async () => {
          const suppliers = await Supplier.find({ status: 'ACTIVE' });
          const risks = [];
          for (const supplier of suppliers.slice(0, 10)) {
            const risk = await supplierAnalytics.analyzeSupplierRisk(supplier._id);
            if (risk.success) risks.push(risk.data);
          }
          return risks;
        })(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          topSuppliers: comparison.data.slice(0, 5),
          diversification: diversification.data,
          highRiskSuppliers: risks.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL'),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/v1/procurement/dashboard/inventory-insights
 * لوحة رؤى المخزون
 */
router.get(
  '/dashboard/inventory-insights',
  authenticateToken,
  async (req, res) => {
    try {
      const [forecast, recommendations, patterns] = await Promise.all([
        aiForecast.predictStockOutRisk(),
        aiForecast.getSmartPurchasingRecommendations(),
        aiForecast.analyzePurchasePatterns(90),
      ]);

      res.status(200).json({
        success: true,
        data: {
          stockOutRisk: forecast.data,
          purchasingRecommendations: recommendations.data
            .slice(0, 5)
            .map(r => ({
              productCode: r.productCode,
              productName: r.productName,
              urgency: r.urgency,
              recommendedQuantity: r.recommendedQuantity,
              estimatedCost: r.estimatedCost,
            })),
          purchasePatterns: patterns.data.insights,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
