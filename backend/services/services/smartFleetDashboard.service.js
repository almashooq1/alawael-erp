/**
 * Smart Real-Time Fleet Dashboard Service
 * خدمة لوحة التحكم الذكية لإدارة الأسطول في الوقت الفعلي
 * 
 * ✅ Real-time Vehicle Tracking Map
 * ✅ Fleet Analytics & Insights
 * ✅ Alert Management & Response
 * ✅ Driver Performance Metrics
 * ✅ Operational KPIs
 * ✅ Predictive Alerts
 */

const Vehicle = require('../models/Vehicle');
const Trip = require('../models/Trip');
const Driver = require('../models/Driver');
const logger = require('../utils/logger');

class SmartFleetDashboardService {
  /**
   * ========== 1. البيانات الحية للأسطول ==========
   */

  /**
   * الحصول على لقطة شاملة للأسطول
   */
  static async getFleetSnapshot() {
    try {
      const vehicles = await Vehicle.find({ isActive: true })
        .populate('assignedDriver')
        .select('plateNumber type status gpsTracking maintenance assignedDriver');

      const trips = await Trip.find({ status: { $in: ['جارية', 'active'] } });

      const snapshot = {
        timestamp: new Date(),
        fleet: {
          total: vehicles.length,
          active: vehicles.filter(v => v.status === 'active').length,
          inTrip: trips.length,
          idle: vehicles.filter(v => v.status === 'active').length - trips.length,
          maintenance: vehicles.filter(v => v.status === 'maintenance').length,
          breakdown: vehicles.filter(v => v.status === 'breakdown').length
        },
        vehicles: vehicles.map(v => ({
          _id: v._id,
          plateNumber: v.plateNumber,
          type: v.type,
          status: v.status,
          location: {
            latitude: v.gpsTracking?.currentLocation?.coordinates[1],
            longitude: v.gpsTracking?.currentLocation?.coordinates[0]
          },
          currentSpeed: v.gpsTracking?.currentSpeed || 0,
          heading: v.gpsTracking?.heading,
          driver: v.assignedDriver?.name || 'لم يتم تعيين',
          fuel: v.maintenance?.fuelConsumption?.currentFuelLevel || 0,
          lastUpdate: v.gpsTracking?.lastUpdateTime
        })),
        trips,
        analytics: await this.calculateFleetAnalytics(vehicles, trips)
      };

      return snapshot;
    } catch (error) {
      logger.error('خطأ في الحصول على لقطة الأسطول:', error);
      throw error;
    }
  }

  /**
   * تحليلات الأسطول المتقدمة
   */
  static async calculateFleetAnalytics(vehicles, trips) {
    const analytics = {
      distance: {
        daily: 0,
        weekly: 0,
        monthly: 0
      },
      fuel: {
        consumed: 0,
        averageConsumption: 0,
        efficiency: 0
      },
      safety: {
        violations: 0,
        accidents: 0,
        safetyScore: 85
      },
      efficiency: {
        utilizationRate: 0,
        averageTripDuration: 0,
        onTimeRate: 0
      }
    };

    // حساب المسافات
    trips.forEach(trip => {
      analytics.distance.daily += trip.statistics?.totalDistance || 0;
    });

    // جمع 7 أيام الماضية
    const weekTrips = await Trip.find({
      startTime: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    analytics.distance.weekly = weekTrips.reduce((sum, t) => 
      sum + (t.statistics?.totalDistance || 0), 0);

    // معدل الاستهلاك
    const totalFuel = vehicles.reduce((sum, v) => 
      sum + (v.maintenance?.fuelConsumption?.currentFuelLevel || 0), 0);
    analytics.fuel.averageConsumption = totalFuel / vehicles.length;

    // معدل سلامة الأسطول
    const violations = trips.reduce((sum, t) => 
      sum + (t.incidents?.length || 0), 0);
    analytics.safety.violations = violations;

    // معدل الاستخدام
    analytics.efficiency.utilizationRate = (trips.length / vehicles.length) * 100;

    // متوسط مدة الرحلة
    if (trips.length > 0) {
      const avgDuration = trips.reduce((sum, t) => 
        sum + (t.statistics?.totalDuration || 0), 0) / trips.length;
      analytics.efficiency.averageTripDuration = Math.round(avgDuration);
    }

    return analytics;
  }

  /**
   * ========== 2. إدارة التنبيهات الذكية ==========
   */

  /**
   * نظام إدارة التنبيهات المتقدم
   */
  static async getAlertsDashboard(filters = {}) {
    try {
      // جمع جميع التنبيهات النشطة
      const jobs = await this.collectActiveAlerts(filters);

      // تصنيفها حسب الأولوية والخطورة
      const categorized = this.categorizeAlerts(jobs);

      // حساب إحصائيات التنبيهات
      const statistics = {
        total: jobs.length,
        critical: jobs.filter(a => a.severity === 'critical').length,
        high: jobs.filter(a => a.severity === 'high').length,
        medium: jobs.filter(a => a.severity === 'medium').length,
        low: jobs.filter(a => a.severity === 'low').length,
        resolved: jobs.filter(a => a.resolved).length,
        pending: jobs.filter(a => !a.resolved).length
      };

      return {
        success: true,
        alerts: categorized,
        statistics,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('خطأ في الحصول على لوحة التنبيهات:', error);
      throw error;
    }
  }

  /**
   * جمع جميع التنبيهات النشطة
   */
  static async collectActiveAlerts(filters) {
    const alerts = [];

    // التنبيهات من الرحلات الجارية
    const activeTrips = await Trip.find({
      status: { $in: ['جارية', 'active'] }
    }).populate('vehicle', ' plateNumber type')
      .populate('driver', 'name phone');

    for (const trip of activeTrips) {
      if (trip.alerts || trip.incidents) {
        const tripAlerts = (trip.alerts || []).map(alert => ({
          ...alert,
          vehicleId: trip.vehicle._id,
          vehiclePlate: trip.vehicle.plateNumber,
          vehicleType: trip.vehicle.type,
          driverName: trip.driver?.name,
          tripId: trip._id,
          source: 'trip'
        }));
        alerts.push(...tripAlerts);
      }
    }

    // التنبيهات من المركبات
    const vehicles = await Vehicle.find({ isActive: true });
    for (const vehicle of vehicles) {
      const vehicleAlerts = await this.generateVehicleAlerts(vehicle);
      vehicleAlerts.forEach(alert => {
        alert.vehicleId = vehicle._id;
        alert.vehiclePlate = vehicle.plateNumber;
        alert.source = 'vehicle';
      });
      alerts.push(...vehicleAlerts);
    }

    return alerts;
  }

  /**
   * توليد التنبيهات للمركبة
   */
  static async generateVehicleAlerts(vehicle) {
    const alerts = [];

    // 1. تنبيهات الصيانة
    if (vehicle.maintenance?.status === 'overdue') {
      alerts.push({
        type: 'maintenance_overdue',
        severity: 'high',
        message: `الصيانة متأخرة للمركبة ${vehicle.plateNumber}`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // 2. تنبيهات الوقود
    const fuelLevel = vehicle.maintenance?.fuelConsumption?.currentFuelLevel;
    if (fuelLevel && fuelLevel < 15) {
      alerts.push({
        type: 'low_fuel',
        severity: fuelLevel < 5 ? 'critical' : 'high',
        message: `الوقود منخفض: ${fuelLevel.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // 3. تنبيهات الإطارات
    if (vehicle.maintenance?.tires?.averageWear > 90) {
      alerts.push({
        type: 'tire_wear',
        severity: 'high',
        message: `الإطارات متآكلة جداً`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // 4. تنبيهات GPS
    const lastUpdate = vehicle.gpsTracking?.lastUpdateTime;
    if (lastUpdate && Date.now() - lastUpdate > 10 * 60 * 1000) {
      alerts.push({
        type: 'gps_signal_lost',
        severity: 'high',
        message: `فقدان إشارة GPS`,
        timestamp: new Date(),
        resolved: false
      });
    }

    return alerts;
  }

  /**
   * تصنيف التنبيهات
   */
  static categorizeAlerts(alerts) {
    return {
      critical: alerts.filter(a => a.severity === 'critical'),
      high: alerts.filter(a => a.severity === 'high'),
      medium: alerts.filter(a => a.severity === 'medium'),
      low: alerts.filter(a => a.severity === 'low')
    };
  }

  /**
   * ========== 3. مقاييس أداء السائق ==========
   */

  /**
   * الحصول على تقرير أداء السائق
   */
  static async getDriverPerformanceReport(driverId, days = 30) {
    try {
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('السائق غير موجود');

      // جمع الرحلات
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const trips = await Trip.find({
        driver: driverId,
        startTime: { $gte: startDate }
      });

      // حساب المقاييس
      const metrics = {
        totalTrips: trips.length,
        totalDistance: 0,
        totalDuration: 0,
        averageSpeed: 0,
        safetyScore: 100,
        fuelEfficiency: 0,
        onTimePercentage: 0,
        violations: {
          speeding: 0,
          harshBraking: 0,
          harshAcceleration: 0,
          routeDeviation: 0
        },
        incidents: {
          accidents: 0,
          breakdowns: 0,
          others: 0
        },
        behavior: {
          smoothDriving: 0,
          aggressiveDriving: 0,
          carefulDriving: 0
        }
      };

      // تحليل البيانات
      trips.forEach(trip => {
        metrics.totalDistance += trip.statistics?.totalDistance || 0;
        metrics.totalDuration += trip.statistics?.totalDuration || 0;

        // التنبيهات والمخالفات
        if (trip.alerts) {
          trip.alerts.forEach(alert => {
            if (alert.type === 'speeding') metrics.violations.speeding++;
            if (alert.type === 'harsh_braking') metrics.violations.harshBraking++;
            if (alert.type === 'harsh_acceleration') metrics.violations.harshAcceleration++;
          });
        }

        // الحوادث
        if (trip.incidents) {
          metrics.incidents.accidents += trip.incidents.filter(i => i.type === 'accident').length;
          metrics.incidents.breakdowns += trip.incidents.filter(i => i.type === 'breakdown').length;
        }
      });

      // حساب المتوسطات
      metrics.averageSpeed = metrics.totalDistance / (metrics.totalDuration || 1);
      metrics.fuelEfficiency = (trips.length > 0) ? 
        trips.reduce((sum, t) => sum + (t.fuelData?.efficiency || 0), 0) / trips.length : 0;

      // درجة السلامة
      metrics.safetyScore = this.calculateSafetyScore(metrics.violations, metrics.incidents);

      // نسبة الالتزام بالموعد
      const onTimeTrips = trips.filter(t => t.arrivedOnTime).length;
      metrics.onTimePercentage = trips.length > 0 ? (onTimeTrips / trips.length) * 100 : 0;

      return {
        success: true,
        driver: {
          id: driver._id,
          name: driver.name,
          email: driver.email,
          phone: driver.phone
        },
        period: { startDate, endDate: new Date(), days },
        metrics,
        recommendations: this.generateDriverRecommendations(metrics),
        rating: this.calculateDriverRating(metrics)
      };
    } catch (error) {
      logger.error('خطأ في الحصول على تقرير أداء السائق:', error);
      throw error;
    }
  }

  /**
   * حساب درجة السلامة
   */
  static calculateSafetyScore(violations, incidents) {
    let score = 100;

    // خصم النقاط بناءً على المخالفات
    score -= violations.speeding * 2;
    score -= violations.harshBraking * 1;
    score -= violations.harshAcceleration * 1;
    score -= violations.routeDeviation * 0.5;

    // خصم النقاط بناءً على الحوادث
    score -= incidents.accidents * 20;
    score -= incidents.breakdowns * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * توليد التوصيات
   */
  static generateDriverRecommendations(metrics) {
    const recommendations = [];

    if (metrics.violations.speeding > 5) {
      recommendations.push({
        category: 'safety',
        priority: 'high',
        message: 'الالتزام بحدود السرعة المسموحة',
        action: 'تدريب على أسلوب القيادة الآمن'
      });
    }

    if (metrics.violations.harshBraking > 3) {
      recommendations.push({
        category: 'driving_style',
        priority: 'medium',
        message: 'تقليل الفرملات الحادة',
        action: 'القيادة بتوقع أفضل والابتعاد عن الازدحام'
      });
    }

    if (metrics.fuelEfficiency < 6) {
      recommendations.push({
        category: 'efficiency',
        priority: 'medium',
        message: 'تحسين كفاءة استهلاك الوقود',
        action: 'تقليل التسارع الحاد والقيادة بسرعة ثابتة'
      });
    }

    if (metrics.onTimePercentage < 80) {
      recommendations.push({
        category: 'punctuality',
        priority: 'medium',
        message: 'الالتزام بالمواعيد المحددة',
        action: 'التخطيط بشكل أفضل للرحلات'
      });
    }

    return recommendations;
  }

  /**
   * حساب تقييم السائق
   */
  static calculateDriverRating(metrics) {
    const weights = {
      safety: 0.35,
      efficiency: 0.25,
      punctuality: 0.20,
      distance: 0.20
    };

    const safetyRating = metrics.safetyScore;
    const efficiencyRating = (100 / 10) * Math.min(10, metrics.fuelEfficiency);
    const punctualityRating = metrics.onTimePercentage;
    const distanceRating = Math.min(100, (metrics.totalDistance / 500) * 100);

    const overall = 
      (safetyRating * weights.safety) +
      (efficiencyRating * weights.efficiency) +
      (punctualityRating * weights.punctuality) +
      (distanceRating * weights.distance);

    return {
      overall: Math.round(overall),
      safetyRating: Math.round(safetyRating),
      efficiencyRating: Math.round(efficiencyRating),
      punctualityRating: Math.round(punctualityRating),
      distanceRating: Math.round(distanceRating),
      level: this.getRatingLevel(overall)
    };
  }

  /**
   * الحصول على مستوى التقييم
   */
  static getRatingLevel(score) {
    if (score >= 90) return 'ممتاز';
    if (score >= 80) return 'جيد جداً';
    if (score >= 70) return 'جيد';
    if (score >= 60) return 'مقبول';
    return 'يحتاج تحسين';
  }

  /**
   * ========== 4. مؤشرات الأداء الرئيسية (KPIs) ==========
   */

  /**
   * الحصول على KPIs الأسطول
   */
  static async getFleetKPIs(timeframe = 'daily') {
    try {
      const kpis = {
        timeframe,
        timestamp: new Date(),
        operational: {},
        financial: {},
        safety: {},
        environmental: {}
      };

      // الفترة الزمنية
      const { startDate, endDate } = this.getTimeframeRange(timeframe);

      // جمع البيانات
      const trips = await Trip.find({
        startTime: { $gte: startDate, $lte: endDate }
      });

      const vehicles = await Vehicle.find({ isActive: true });

      // مؤشرات التشغيل
      kpis.operational = {
        totalTrips: trips.length,
        totalDistance: trips.reduce((sum, t) => sum + (t.statistics?.totalDistance || 0), 0),
        totalHours: trips.reduce((sum, t) => sum + (t.statistics?.totalDuration || 0), 0) / 60,
        averageTripDistance: trips.length > 0 ? 
          trips.reduce((sum, t) => sum + (t.statistics?.totalDistance || 0), 0) / trips.length : 0,
        utilizationRate: (trips.length / (vehicles.length * 8)) * 100, // حسب ساعات العمل
        onTimePercentage: trips.length > 0 ? 
          (trips.filter(t => t.arrivedOnTime).length / trips.length) * 100 : 0
      };

      // مؤشرات مالية
      const fuelCost = trips.reduce((sum, t) => sum + (t.costs?.fuel || 0), 0);
      const maintenanceCost = trips.reduce((sum, t) => sum + (t.costs?.maintenance || 0), 0);
      const totalCost = fuelCost + maintenanceCost;

      kpis.financial = {
        totalCost,
        fuelCost,
        maintenanceCost,
        costPerKM: kpis.operational.totalDistance > 0 ? 
          totalCost / kpis.operational.totalDistance : 0,
        revenuePerTrip: trips.length > 0 ? 
          (kpis.operational.totalDistance * 10) / trips.length : 0
      };

      // مؤشرات السلامة
      const incidents = trips.reduce((sum, t) => sum + (t.incidents?.length || 0), 0);
      const violations = trips.reduce((sum, t) => sum + (t.alerts?.length || 0), 0);

      kpis.safety = {
        accidentRate: trips.length > 0 ? (incidents / trips.length) * 100 : 0,
        violationRate: trips.length > 0 ? (violations / trips.length) * 100 : 0,
        safetyScore: 100 - (incidents * 5) - (violations * 0.5),
        incidentsByType: this.categorizeIncidents(trips)
      };

      // مؤشرات بيئية
      const totalFuelUsed = trips.reduce((sum, t) => sum + (t.fuelData?.consumed || 0), 0);
      const co2Emissions = totalFuelUsed * 2.31; // كغ CO2 لكل لتر

      kpis.environmental = {
        fuelUsed: Math.round(totalFuelUsed * 100) / 100,
        co2Emissions: Math.round(co2Emissions * 100) / 100,
        emissionsPerKM: kpis.operational.totalDistance > 0 ? 
          co2Emissions / kpis.operational.totalDistance : 0
      };

      return kpis;
    } catch (error) {
      logger.error('خطأ في الحصول على KPIs:', error);
      throw error;
    }
  }

  /**
   * الحصول على نطاق الوقت
   */
  static getTimeframeRange(timeframe) {
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case 'hourly':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const day = now.getDate() - now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), day);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate: now };
  }

  /**
   * تصنيف الحوادث
   */
  static categorizeIncidents(trips) {
    const categories = {
      accidents: 0,
      breakdowns: 0,
      speedingViolations: 0,
      routeDeviations: 0,
      other: 0
    };

    trips.forEach(trip => {
      trip.incidents?.forEach(incident => {
        if (incident.type === 'accident') categories.accidents++;
        else if (incident.type === 'breakdown') categories.breakdowns++;
        else categories.other++;
      });

      trip.alerts?.forEach(alert => {
        if (alert.type === 'speeding') categories.speedingViolations++;
        else if (alert.type === 'route_deviation') categories.routeDeviations++;
      });
    });

    return categories;
  }

  /**
   * ========== 5. التقارير المتقدمة ==========
   */

  /**
   * تقرير يومي شامل
   */
  static async getDailyReport(date = null) {
    const reportDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const trips = await Trip.find({
      startTime: { $gte: startOfDay, $lte: endOfDay }
    }).populate('vehicle', 'plateNumber type')
      .populate('driver', 'name');

    return {
      date: reportDate.toISOString().split('T')[0],
      summary: {
        totalTrips: trips.length,
        totalDistance: trips.reduce((sum, t) => sum + (t.statistics?.totalDistance || 0), 0),
        totalDuration: trips.reduce((sum, t) => sum + (t.statistics?.totalDuration || 0), 0),
        totalFuelUsed: trips.reduce((sum, t) => sum + (t.fuelData?.consumed || 0), 0),
        incidents: trips.reduce((sum, t) => sum + (t.incidents?.length || 0), 0)
      },
      details: trips.map(t => ({
        tripId: t._id,
        vehicle: t.vehicle?.plateNumber,
        driver: t.driver?.name,
        distance: t.statistics?.totalDistance,
        duration: t.statistics?.totalDuration,
        fuelUsed: t.fuelData?.consumed,
        status: t.status
      }))
    };
  }
}

module.exports = SmartFleetDashboardService;
