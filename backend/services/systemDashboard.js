/**
 * =====================================================
 * ADVANCED DASHBOARD SERVICE - خدمة لوحة التحكم المتقدمة
 * =====================================================
 * تجميع جميع البيانات والإحصائيات في مكان واحد
 */

// Import services if available, otherwise use mock data
const maintenanceService = require('./maintenanceService');
const fuelService = require('./fuelService');
const violationsService = require('./violationsService');
const bookingService = require('./bookingService');
const driverRatingService = require('./driverRatingService');
const alertService = require('./alertNotificationService');
const costBudgetService = require('./costBudgetService');

class DashboardService {
  /**
   * الحصول على لوحة التحكم الرئيسية
   */
  async getMainDashboard() {
    try {
      const [vehiclesData, driversData, tripsData, maintenanceData, fuelData, violationsData] =
        await Promise.all([
          this.getVehiclesSummary(),
          this.getDriversSummary(),
          this.getTripsSummary(),
          this.getMaintenanceSummary(),
          this.getFuelSummary(),
          this.getViolationsSummary(),
        ]);

      return {
        success: true,
        data: {
          overview: {
            totalVehicles: vehiclesData.total,
            activeVehicles: vehiclesData.active,
            totalDrivers: driversData.total,
            activeDrivers: driversData.active,
            tripsToday: tripsData.today,
            activeTrips: tripsData.active,
          },
          vehicles: vehiclesData,
          drivers: driversData,
          trips: tripsData,
          maintenance: maintenanceData,
          fuel: fuelData,
          violations: violationsData,
          alerts: await this.getSystemAlerts(),
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ملخص المركبات
   */
  async getVehiclesSummary() {
    // في النظام الحقيقي نستدعي vehicleService
    return {
      total: 9,
      active: 7,
      inactive: 2,
      needsMaintenance: 3,
      expiringSoon: 2,
      byStatus: {
        available: 5,
        in_use: 2,
        maintenance: 2,
      },
    };
  }

  /**
   * ملخص السائقين
   */
  async getDriversSummary() {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      onTrip: 0,
      available: 0,
    };
  }

  /**
   * ملخص الرحلات
   */
  async getTripsSummary() {
    const today = new Date().toISOString().split('T')[0];

    return {
      today: 0,
      active: 0,
      completed: 0,
      totalDistance: 0,
      totalFuel: 0,
      averageEfficiency: 0,
    };
  }

  /**
   * ملخص الصيانة
   */
  async getMaintenanceSummary() {
    try {
      const stats = await maintenanceService.getMaintenanceStatistics({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      return {
        monthlyRecords: stats.data?.totalRecords || 0,
        monthlyCost: stats.data?.totalCost || 0,
        scheduledCount: 0,
        overdueCount: 0,
      };
    } catch {
      return {
        monthlyRecords: 0,
        monthlyCost: 0,
        scheduledCount: 0,
        overdueCount: 0,
      };
    }
  }

  /**
   * ملخص الوقود
   */
  async getFuelSummary() {
    return {
      monthlyLiters: 0,
      monthlyCost: 0,
      averageEfficiency: 0,
      trend: 'stable',
    };
  }

  /**
   * ملخص المخالفات
   */
  async getViolationsSummary() {
    try {
      const stats = await violationsService.getViolationStatistics();

      return {
        total: stats.data?.total || 0,
        pending: stats.data?.pending || 0,
        unpaidFines: stats.data?.unpaidFines || 0,
        totalPoints: stats.data?.totalPoints || 0,
      };
    } catch {
      return {
        total: 0,
        pending: 0,
        unpaidFines: 0,
        totalPoints: 0,
      };
    }
  }

  /**
   * تنبيهات النظام
   */
  async getSystemAlerts() {
    const alerts = [];

    // يمكن إضافة تنبيهات من مختلف الأنظمة
    // مثال: صيانة مستحقة، مخالفات غير مدفوعة، وثائق منتهية، إلخ

    return alerts;
  }

  /**
   * لوحة تحكم المركبة
   */
  async getVehicleDashboard(vehicleId) {
    try {
      const [maintenanceHistory, fuelHistory, violations, tripsSummary] = await Promise.all([
        maintenanceService.getMaintenanceHistory(vehicleId, { limit: 10 }),
        fuelService.getFuelHistory(vehicleId, { limit: 10 }),
        violationsService.getViolations({ vehicleId, limit: 10 }),
        tripService.getVehicleStats(vehicleId),
      ]);

      return {
        success: true,
        data: {
          vehicleId,
          maintenance: maintenanceHistory.data,
          fuel: fuelHistory.data,
          violations: violations.data,
          trips: tripsSummary.data || { total: 0, totalDistance: 0, totalFuel: 0 },
          recommendations: await maintenanceService.getMaintenanceRecommendations(vehicleId, 0),
          alerts: await this.getVehicleAlerts(vehicleId),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * لوحة تحكم السائق
   */
  async getDriverDashboard(driverId) {
    try {
      const [trips, violations, points] = await Promise.all([
        tripService.getDriverStats(driverId),
        violationsService.getViolations({ driverId, limit: 10 }),
        violationsService.getDriverViolationPoints(driverId),
      ]);

      return {
        success: true,
        data: {
          driverId,
          trips: trips.data || { total: 0, totalDistance: 0 },
          violations: violations.data,
          points: points.data,
          alerts: await violationsService.getViolationAlerts(null, driverId),
          performance: this.calculateDriverPerformance(trips.data, violations.data),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * حساب أداء السائق
   */
  calculateDriverPerformance(trips, violations) {
    let score = 100;

    // خصم نقاط على المخالفات
    if (violations?.total) {
      score -= violations.total * 5;
    }

    // إضافة نقاط على الرحلات الناجحة
    if (trips?.total) {
      score += Math.min(trips.total * 0.5, 20);
    }

    score = Math.max(0, Math.min(100, score));

    let rating = 'ممتاز';
    if (score < 50) rating = 'ضعيف';
    else if (score < 70) rating = 'مقبول';
    else if (score < 85) rating = 'جيد';

    return {
      score: score.toFixed(1),
      rating,
      description: this.getPerformanceDescription(parseFloat(score)),
    };
  }

  /**
   * وصف الأداء
   */
  getPerformanceDescription(score) {
    if (score >= 90) return 'أداء متميز، استمر على هذا المستوى';
    if (score >= 75) return 'أداء جيد، مع بعض التحسينات المطلوبة';
    if (score >= 60) return 'أداء مقبول، يحتاج إلى تحسين';
    return 'أداء ضعيف، يحتاج إلى تطوير عاجل';
  }

  /**
   * تنبيهات المركبة
   */
  async getVehicleAlerts(vehicleId) {
    const alerts = [];

    try {
      // تنبيهات الصيانة
      const maintenanceRec = await maintenanceService.getMaintenanceRecommendations(vehicleId, 0);
      if (maintenanceRec.data?.overdue > 0) {
        alerts.push({
          type: 'maintenance_overdue',
          severity: 'critical',
          message: `${maintenanceRec.data.overdue} صيانة متأخرة`,
          action: 'يجب إجراء الصيانة فوراً',
        });
      }

      // تنبيهات المخالفات
      const violationAlerts = await violationsService.getViolationAlerts(vehicleId);
      if (violationAlerts.data?.alerts) {
        alerts.push(...violationAlerts.data.alerts);
      }

      // تنبيهات الوقود
      const fuelAlerts = await fuelService.getFuelAlerts(vehicleId);
      if (fuelAlerts.data?.alerts) {
        alerts.push(...fuelAlerts.data.alerts);
      }
    } catch (error) {
      console.error('Error getting vehicle alerts:', error);
    }

    return alerts;
  }

  /**
   * إحصائيات متقدمة
   */
  async getAdvancedStatistics(period = 'month') {
    const startDate = this.getStartDate(period);

    try {
      const [maintenanceStats, fuelStats, violationStats] = await Promise.all([
        maintenanceService.getMaintenanceStatistics({ startDate }),
        fuelService.getFuelHistory('all', { startDate }),
        violationsService.getViolationStatistics({ startDate }),
      ]);

      return {
        success: true,
        data: {
          period,
          startDate,
          endDate: new Date().toISOString(),
          maintenance: maintenanceStats.data,
          fuel: fuelStats.data?.summary,
          violations: violationStats.data,
          trends: this.calculateTrends(maintenanceStats, fuelStats, violationStats),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * حساب تاريخ البداية حسب الفترة
   */
  getStartDate(period) {
    const now = new Date();

    switch (period) {
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        now.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        now.setFullYear(now.getFullYear() - 1);
        break;
      default:
        now.setMonth(now.getMonth() - 1);
    }

    return now.toISOString();
  }

  /**
   * حساب الاتجاهات
   */
  calculateTrends(maintenance, fuel, violations) {
    return {
      maintenanceCost: 'stable',
      fuelConsumption: 'stable',
      violationsCount: 'stable',
      overall: 'improving',
    };
  }
}

module.exports = new DashboardService();
