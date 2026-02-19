/**
 * Maintenance Analytics Service - خدمة تحليلات الصيانة
 *
 * تقارير وتحليلات متقدمة شاملة
 * ✅ Advanced Reports
 * ✅ Cost Analysis
 * ✅ Performance Metrics
 * ✅ Custom Reports
 */

const Vehicle = require('../models/Vehicle');
const MaintenanceTask = require('../models/MaintenanceTask');
const MaintenanceSchedule = require('../models/MaintenanceSchedule');
const MaintenanceProvider = require('../models/MaintenanceProvider');
const MaintenanceIssue = require('../models/MaintenanceIssue');
const MaintenanceInventory = require('../models/MaintenanceInventory');
const logger = require('../utils/logger');

class MaintenanceAnalyticsService {
  /**
   * ==================== التقارير الشاملة ====================
   */

  /**
   * تقرير الصيانة الشامل
   */
  async generateComprehensiveReport(vehicleId, startDate, endDate) {
    try {
      const vehicle = await Vehicle.findById(vehicleId).populate('basicInfo');

      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      // جمع البيانات
      const tasks = await MaintenanceTask.find({
        vehicle: vehicleId,
        completedDate: { $gte: startDate, $lte: endDate },
      });

      const issues = await MaintenanceIssue.find({
        vehicle: vehicleId,
        reportedDate: { $gte: startDate, $lte: endDate },
      });

      const schedules = await MaintenanceSchedule.find({ vehicle: vehicleId });

      // الحسابات
      const report = {
        vehicleInfo: {
          id: vehicle._id,
          plateNumber: vehicle.plateNumber,
          registrationNumber: vehicle.registrationNumber,
          make: vehicle.basicInfo.make,
          model: vehicle.basicInfo.model,
          year: vehicle.basicInfo.year,
        },
        period: {
          from: startDate,
          to: endDate,
          daysCount: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
        },
        tasksSummary: {
          total: tasks.length,
          completed: tasks.filter(t => t.status === 'مكتملة').length,
          pending: tasks.filter(t => t.status === 'مجدولة').length,
          onHold: tasks.filter(t => t.status === 'معلقة').length,
          cancelled: tasks.filter(t => t.status === 'ملغاة').length,
        },
        issuesSummary: {
          total: issues.length,
          critical: issues.filter(i => i.severity === 'حرجة').length,
          high: issues.filter(i => i.severity === 'عالية').length,
          medium: issues.filter(i => i.severity === 'متوسطة').length,
          low: issues.filter(i => i.severity === 'منخفضة').length,
          resolved: issues.filter(i => i.status === 'مكتمل').length,
          open: issues.filter(i => i.status !== 'مكتمل').length,
        },
        costAnalysis: this.analyzeCosts(tasks, issues),
        schedulePerformance: this.analyzeSchedulePerformance(schedules, tasks),
        maintenanceByCategory: this.categorizeMaintenanceWork(tasks),
        topIssues: this.getTopIssues(issues),
        timeMetrics: this.calculateTimeMetrics(tasks),
      };

      return {
        success: true,
        report,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('خطأ في إنشاء التقرير الشامل:', error);
      throw error;
    }
  }

  /**
   * تحليل التكاليف
   */
  analyzeCosts(tasks, issues) {
    const taskCosts = tasks.reduce((sum, t) => sum + (t.actualCost || t.estimatedCost || 0), 0);
    const issueCosts = issues.reduce((sum, i) => sum + (i.resolution.actualCost || 0), 0);
    const totalCost = taskCosts + issueCosts;

    const costByCategory = {};
    tasks.forEach(task => {
      const cat = task.category;
      costByCategory[cat] = (costByCategory[cat] || 0) + (task.actualCost || task.estimatedCost || 0);
    });

    return {
      totalCost: totalCost.toFixed(2),
      tasksCost: taskCosts.toFixed(2),
      issuesCost: issueCosts.toFixed(2),
      averagePerTask: tasks.length > 0 ? (taskCosts / tasks.length).toFixed(2) : 0,
      costByCategory,
      costTrend: taskCosts > issueCosts ? 'مستقر' : 'تصاعدي',
    };
  }

  /**
   * تحليل أداء الجدول
   */
  analyzeSchedulePerformance(schedules, tasks) {
    const performance = {
      totalSchedules: schedules.length,
      activeSchedules: schedules.filter(s => s.status === 'نشط').length,
      completionRate: 0,
      onTimeRate: 0,
      averageDelay: 0,
    };

    if (tasks.length > 0) {
      const onTimeTasks = tasks.filter(
        t => t.completedDate && t.completedDate <= t.scheduledDate
      );
      performance.completionRate = ((tasks.filter(t => t.status === 'مكتملة').length / tasks.length) * 100).toFixed(2);
      performance.onTimeRate = ((onTimeTasks.length / tasks.length) * 100).toFixed(2);

      const delays = tasks
        .filter(t => t.completedDate && t.completedDate > t.scheduledDate)
        .map(t => (t.completedDate - t.scheduledDate) / (1000 * 60 * 60 * 24));

      if (delays.length > 0) {
        performance.averageDelay = (delays.reduce((a, b) => a + b) / delays.length).toFixed(2);
      }
    }

    return performance;
  }

  /**
   * تصنيف الأعمال الصيانية
   */
  categorizeMaintenanceWork(tasks) {
    const categories = {};

    tasks.forEach(task => {
      if (!categories[task.category]) {
        categories[task.category] = {
          count: 0,
          cost: 0,
          duration: 0,
          avgDuration: 0,
        };
      }

      categories[task.category].count++;
      categories[task.category].cost += task.actualCost || task.estimatedCost || 0;
      categories[task.category].duration += task.actualDuration || task.estimatedDuration || 0;
    });

    // حساب المتوسطات
    Object.keys(categories).forEach(cat => {
      categories[cat].avgDuration = (categories[cat].duration / categories[cat].count).toFixed(2);
      categories[cat].cost = categories[cat].cost.toFixed(2);
    });

    return categories;
  }

  /**
   * أعلى المشاكل تكراراً
   */
  getTopIssues(issues) {
    const issueTypes = {};

    issues.forEach(i => {
      const type = i.type || 'أخرى';
      if (!issueTypes[type]) {
        issueTypes[type] = 0;
      }
      issueTypes[type]++;
    });

    return Object.entries(issueTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * حساب مقاييس الوقت
   */
  calculateTimeMetrics(tasks) {
    const metrics = {
      averageCompletionTime: 0,
      averageDowntime: 0,
      totalDowntime: 0,
      longestTask: null,
      shortestTask: null,
    };

    if (tasks.length === 0) return metrics;

    let totalTime = 0;
    let completedCount = 0;
    let maxDuration = 0;
    let minDuration = Infinity;

    tasks.forEach(task => {
      if (task.completedDate && task.startedDate) {
        const duration = (task.completedDate - task.startedDate) / (1000 * 60 * 60);
        totalTime += duration;
        completedCount++;
        metrics.totalDowntime += duration;

        if (duration > maxDuration) {
          maxDuration = duration;
          metrics.longestTask = task.title;
        }
        if (duration < minDuration) {
          minDuration = duration;
          metrics.shortestTask = task.title;
        }
      }
    });

    metrics.averageCompletionTime = completedCount > 0 ? (totalTime / completedCount).toFixed(2) : 0;
    metrics.averageDowntime = tasks.length > 0 ? (metrics.totalDowntime / tasks.length).toFixed(2) : 0;
    metrics.totalDowntime = metrics.totalDowntime.toFixed(2);

    return metrics;
  }

  /**
   * ==================== تقارير الأداء ====================
   */

  /**
   * تقرير أداء مراكز الصيانة
   */
  async getProviderPerformanceReport() {
    try {
      const providers = await MaintenanceProvider.find({ status: 'نشط' });

      const report = await Promise.all(
        providers.map(async provider => {
          const tasks = await MaintenanceTask.find({
            assignedTechnician: { $in: provider.staff.map(s => s.staffId) },
          });

          return {
            providerId: provider._id,
            providerName: provider.providerName,
            rating: provider.performance.averageRating,
            completionRate: provider.performance.onTimeCompletionRate || 0,
            qualityScore: provider.performance.qualityScore || 0,
            totalServices: provider.performance.totalServices,
            costPerService: provider.pricing.laborRatePerHour,
            customerSatisfaction: provider.performance.customerSatisfactionScore || 0,
            recommendations: this.getProviderRecommendation(provider),
          };
        })
      );

      // ترتيب حسب الأداء
      report.sort((a, b) => b.qualityScore - a.qualityScore);

      return {
        success: true,
        report,
        bestPerformer: report[0] || null,
      };
    } catch (error) {
      logger.error('خطأ في إنشاء تقرير الأداء:', error);
      throw error;
    }
  }

  /**
   * توصيات المورد
   */
  getProviderRecommendation(provider) {
    let recommendation = 'موصى به';

    if (provider.performance.averageRating < 3) {
      recommendation = 'غير موصى به';
    } else if (provider.performance.averageRating < 4 || provider.performance.onTimeCompletionRate < 80) {
      recommendation = 'توخي الحذر';
    }

    return recommendation;
  }

  /**
   * ==================== تقارير المخزون ====================
   */

  /**
   * تقرير حالة المخزون
   */
  async getInventoryHealthReport() {
    try {
      const inventory = await MaintenanceInventory.find({ status: 'نشط' });

      const report = {
        totalParts: inventory.length,
        byStatus: {
          optimal: inventory.filter(i => !i.needsReorder && i.currentStock > i.minimumStock).length,
          lowStock: inventory.filter(i => i.isLowStock).length,
          overstock: inventory.filter(i => i.isOverstock).length,
          expiring: inventory.filter(i => i.daysUntilExpiry <= 30 && i.daysUntilExpiry > 0).length,
          expired: inventory.filter(i => i.isExpired).length,
        },
        totalValue: inventory.reduce((sum, i) => sum + i.inventoryValue, 0).toFixed(2),
        costDistribution: this.analyzeInventoryCostDistribution(inventory),
        slowMovingItems: this.getSlowMovingItems(inventory),
        criticalItems: this.getCriticalItems(inventory),
      };

      return {
        success: true,
        report,
      };
    } catch (error) {
      logger.error('خطأ في إنشاء تقرير المخزون:', error);
      throw error;
    }
  }

  /**
   * تحليل توزيع تكاليف المخزون
   */
  analyzeInventoryCostDistribution(inventory) {
    const distribution = {
      high: inventory.filter(i => i.inventoryValue > 1000).length,
      medium: inventory.filter(i => i.inventoryValue >= 100 && i.inventoryValue <= 1000).length,
      low: inventory.filter(i => i.inventoryValue < 100).length,
    };

    return distribution;
  }

  /**
   * الأصناف بطيئة الحركة
   */
  getSlowMovingItems(inventory) {
    return inventory
      .filter(i => i.usage.totalUsed < 2 && i.currentStock > i.minimumStock * 2)
      .map(i => ({
        name: i.partName,
        stock: i.currentStock,
        value: i.inventoryValue,
      }))
      .slice(0, 10);
  }

  /**
   * الأصناف الحرجة
   */
  getCriticalItems(inventory) {
    return inventory
      .filter(i => i.needsReorder || i.isLowStock)
      .map(i => ({
        name: i.partName,
        current: i.currentStock,
        minRequired: i.minimumStock,
        action: i.needsReorder ? 'أمر شراء فوري' : 'مراقبة',
      }));
  }

  /**
   * ==================== تقارير الامتثال ====================
   */

  /**
   * تقرير الامتثال والسلامة
   */
  async getComplianceReport(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      const report = {
        vehicleId: vehicle._id,
        plateNumber: vehicle.plateNumber,
        complianceStatus: {
          registration: {
            status: vehicle.registration.status,
            expiryDate: vehicle.registration.expiryDate,
            isValid: vehicle.registration.expiryDate > new Date(),
          },
          insurance: {
            status: vehicle.insurance.insured ? 'مؤمن' : 'غير مؤمن',
            expiryDate: vehicle.insurance.policyExpiryDate,
            isValid: vehicle.insurance.policyExpiryDate > new Date(),
          },
          inspection: {
            status: vehicle.inspection.status,
            lastDate: vehicle.inspection.lastInspectionDate,
            nextDate: vehicle.inspection.nextInspectionDate,
            isValid: vehicle.inspection.nextInspectionDate > new Date(),
          },
        },
        violations: {
          total: vehicle.totalViolations,
          recentCount: vehicle.violations.filter(v => {
            const vDate = new Date(v.date);
            const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
            return vDate > sixMonthsAgo;
          }).length,
          unpaidFines: vehicle.violations.filter(v => !v.paid).length,
          totalFines: vehicle.totalFines,
        },
        maintenanceCompliance: {
          onSchedule: vehicle.maintenance.nextMaintenanceDate > new Date() ? 'متوافق' : 'متأخر',
          lastMaintenanceDate: vehicle.maintenance.lastMaintenanceDate,
          nextMaintenanceDate: vehicle.maintenance.nextMaintenanceDate,
        },
        overallCompliance: this.calculateComplianceScore(vehicle),
      };

      return {
        success: true,
        report,
      };
    } catch (error) {
      logger.error('خطأ في إنشاء تقرير الامتثال:', error);
      throw error;
    }
  }

  /**
   * حساب درجة الامتثال
   */
  calculateComplianceScore(vehicle) {
    let score = 100;

    // تخفيفات
    if (!vehicle.registration || vehicle.registration.status !== 'نشط') score -= 20;
    if (!vehicle.insurance || !vehicle.insurance.insured) score -= 20;
    if (!vehicle.inspection || vehicle.inspection.status !== 'معايير') score -= 15;
    if (vehicle.totalViolations > 5) score -= 10;
    if (vehicle.maintenance.nextMaintenanceDate < new Date()) score -= 15;

    return {
      score: Math.max(score, 0),
      status: score >= 80 ? 'ممتاز' : score >= 60 ? 'جيد' : score >= 40 ? 'مقبول' : 'ضعيف',
    };
  }
}

module.exports = new MaintenanceAnalyticsService();
