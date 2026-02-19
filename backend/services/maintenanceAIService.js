/**
 * Maintenance AI Service - خدمة الذكاء الاصطناعي للصيانة
 *
 * نظام ذكي للتنبؤ والتحليل المتقدم
 * ✅ Predictive Analytics
 * ✅ Anomaly Detection
 * ✅ Pattern Recognition
 * ✅ Smart Recommendations
 */

const Vehicle = require('../models/Vehicle');
const MaintenanceTask = require('../models/MaintenanceTask');
const MaintenanceIssue = require('../models/MaintenanceIssue');
const logger = require('../utils/logger');

class MaintenanceAIService {
  /**
   * ==================== التنبؤ بالصيانة ====================
   */

  /**
   * التنبؤ بحاجة الصيانة بناءً على الأنماط التاريخية
   */
  async predictMaintenanceNeeds(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      // جمع البيانات التاريخية
      const maintenanceHistory = vehicle.maintenance.maintenanceHistory || [];
      const performanceData = vehicle.performance;

      // تحليل الأنماط
      const patterns = this.analyzeMaintenancePatterns(maintenanceHistory, performanceData);

      // التنبؤات
      const predictions = {
        oil: this.predictOilChange(patterns, performanceData),
        filter: this.predictFilterChange(patterns, performanceData),
        tires: this.predictTireChange(patterns, performanceData),
        brakes: this.predictBrakeChange(patterns, performanceData),
        battery: this.predictBatteryIssue(patterns, performanceData),
      };

      return {
        success: true,
        predictions,
        confidence: this.calculateConfidence(patterns),
        nextCriticalMaintenance: this.getNextCriticalDate(predictions),
      };
    } catch (error) {
      logger.error('خطأ في التنبؤ بالصيانة:', error);
      throw error;
    }
  }

  /**
   * تحليل أنماط الصيانة
   */
  analyzeMaintenancePatterns(history, performance) {
    const patterns = {
      averageIntervalDays: 0,
      averageIntervalKm: 0,
      maintenanceFrequency: 0,
      costTrend: 0,
      commonIssues: {},
    };

    if (history.length < 2) {
      return patterns;
    }

    // حساب الفترات الزمنية والمسافات
    let totalDays = 0;
    let totalDistance = 0;

    for (let i = 1; i < history.length; i++) {
      const prev = new Date(history[i - 1].date);
      const curr = new Date(history[i].date);
      totalDays += (curr - prev) / (1000 * 60 * 60 * 24);
      totalDistance += history[i].mileage - history[i - 1].mileage;
    }

    patterns.averageIntervalDays = Math.round(totalDays / (history.length - 1));
    patterns.averageIntervalKm = Math.round(totalDistance / (history.length - 1));
    patterns.maintenanceFrequency = history.length;

    // تحليل التكاليف
    const costs = history.map(h => h.cost || 0);
    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    patterns.costTrend = costs[costs.length - 1] - avgCost;

    // أكثر المشاكل شيوعاً
    history.forEach(record => {
      const type = record.type || 'أخرى';
      patterns.commonIssues[type] = (patterns.commonIssues[type] || 0) + 1;
    });

    return patterns;
  }

  /**
   * التنبؤ بتغيير الزيت
   */
  predictOilChange(patterns, performance) {
    const standardInterval = 5000; // كم معياري
    const nextDue = new Date();
    const daysEstimate = Math.round(standardInterval / (patterns.averageIntervalKm / patterns.averageIntervalDays || 20) / 100) * 100;
    nextDue.setDate(nextDue.getDate() + daysEstimate);

    return {
      component: 'تبديل الزيت',
      estimatedDate: nextDue,
      estimatedKm: performance.odometer + standardInterval,
      confidence: 85,
      priority: 'عالية',
      cost: 150,
      duration: 0.5,
    };
  }

  /**
   * التنبؤ باستبدال الفلتر
   */
  predictFilterChange(patterns, performance) {
    const standardInterval = 10000;
    const nextDue = new Date();
    const daysEstimate = Math.round(standardInterval / (patterns.averageIntervalKm / patterns.averageIntervalDays || 40) / 100) * 100;
    nextDue.setDate(nextDue.getDate() + daysEstimate);

    return {
      component: 'استبدال الفلتر',
      estimatedDate: nextDue,
      estimatedKm: performance.odometer + standardInterval,
      confidence: 80,
      priority: 'متوسطة',
      cost: 80,
      duration: 0.25,
    };
  }

  /**
   * التنبؤ باستبدال الإطارات
   */
  predictTireChange(patterns, performance) {
    const standardInterval = 20000;
    const nextDue = new Date();
    const daysEstimate = Math.round(standardInterval / (patterns.averageIntervalKm / patterns.averageIntervalDays || 80) / 100) * 100;
    nextDue.setDate(nextDue.getDate() + daysEstimate);

    return {
      component: 'استبدال الإطارات',
      estimatedDate: nextDue,
      estimatedKm: performance.odometer + standardInterval,
      confidence: 75,
      priority: 'متوسطة',
      cost: 400,
      duration: 1,
    };
  }

  /**
   * التنبؤ بمشاكل الفرامل
   */
  predictBrakeChange(patterns, performance) {
    const standardInterval = 40000;
    const nextDue = new Date();
    const daysEstimate = Math.round(standardInterval / (patterns.averageIntervalKm / patterns.averageIntervalDays || 160) / 100) * 100;
    nextDue.setDate(nextDue.getDate() + daysEstimate);

    return {
      component: 'فحص الفرامل',
      estimatedDate: nextDue,
      estimatedKm: performance.odometer + standardInterval,
      confidence: 78,
      priority: 'عالية',
      cost: 300,
      duration: 2,
    };
  }

  /**
   * التنبؤ بمشاكل البطارية
   */
  predictBatteryIssue(patterns, performance) {
    const standardInterval = 50000;
    const nextDue = new Date();
    const daysEstimate = Math.round(standardInterval / (patterns.averageIntervalKm / patterns.averageIntervalDays || 200) / 100) * 100;
    nextDue.setDate(nextDue.getDate() + daysEstimate);

    return {
      component: 'استبدال البطارية',
      estimatedDate: nextDue,
      estimatedKm: performance.odometer + standardInterval,
      confidence: 70,
      priority: 'منخفضة',
      cost: 200,
      duration: 0.5,
    };
  }

  /**
   * ==================== كشف الحالات الشاذة ====================
   */

  /**
   * كشف السلوك غير الطبيعي للمركبة
   */
  async detectAnomalies(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      const anomalies = [];

      // فحص استهلاك الوقود
      if (vehicle.performance.fuelConsumption) {
        const fuelAnomaly = this.checkFuelConsumptionAnomaly(vehicle);
        if (fuelAnomaly) anomalies.push(fuelAnomaly);
      }

      // فحص تكاليف الصيانة
      const costAnomaly = this.checkMaintenanceCostAnomaly(vehicle);
      if (costAnomaly) anomalies.push(costAnomaly);

      // فحص وتيرة الأعطال
      const issueFrequencyAnomaly = this.checkIssueFrequencyAnomaly(vehicle);
      if (issueFrequencyAnomaly) anomalies.push(issueFrequencyAnomaly);

      return {
        success: true,
        anomalies,
        riskLevel: anomalies.length > 2 ? 'عالية' : anomalies.length > 0 ? 'متوسطة' : 'منخفضة',
      };
    } catch (error) {
      logger.error('خطأ في كشف الحالات الشاذة:', error);
      throw error;
    }
  }

  /**
   * فحص شذوذ استهلاك الوقود
   */
  checkFuelConsumptionAnomaly(vehicle) {
    // نطاق استهلاك طبيعي بناءً على نوع المركبة
    const normalRange = {
      'سيارة ركوب': { min: 6, max: 12 },
      'سيارة نقل': { min: 4, max: 8 },
      'شاحنة': { min: 2, max: 6 },
    };

    const vehicleType = vehicle.basicInfo.type;
    const range = normalRange[vehicleType] || { min: 5, max: 15 };
    const consumption = vehicle.performance.fuelConsumption;

    if (consumption < range.min) {
      return {
        type: 'استهلاك وقود منخفض بشكل غير طبيعي',
        severity: 'متوسطة',
        message: 'قد يشير إلى خلل في حساس الوقود أو مشكلة في نظام الوقود',
        recommendation: 'فحص نظام الوقود والمحرك',
      };
    }

    if (consumption > range.max) {
      return {
        type: 'استهلاك وقود مرتفع جداً',
        severity: 'عالية',
        message: 'استهلاك أعلى من الطبيعي بكثير - قد يشير إلى مشكلة محرك خطيرة',
        recommendation: 'فحص فوري للمحرك والمرشحات والشمعات',
      };
    }

    return null;
  }

  /**
   * فحص شذوذ تكاليف الصيانة
   */
  checkMaintenanceCostAnomaly(vehicle) {
    if (vehicle.maintenance.maintenanceHistory.length < 3) {
      return null;
    }

    const costs = vehicle.maintenance.maintenanceHistory.map(h => h.cost || 0);
    const avgCost = costs.reduce((a, b) => a + b) / costs.length;
    const lastCost = costs[costs.length - 1];

    if (lastCost > avgCost * 2) {
      return {
        type: 'تكلفة صيانة مرتفعة غير عادية',
        severity: 'متوسطة',
        message: `التكلفة الأخيرة (${lastCost}) أعلى من المتوسط بكثير (${avgCost.toFixed(2)})`,
        recommendation: 'راجع تفاصيل الصيانة الأخيرة للتحقق من الأسعار',
      };
    }

    return null;
  }

  /**
   * فحص وتيرة الأعطال
   */
  checkIssueFrequencyAnomaly(vehicle) {
    if (vehicle.issues.length < 5) {
      return null;
    }

    // حساب معدل الأعطال الشهري
    const recentIssues = vehicle.issues.filter(i => {
      const issueDate = new Date(i.date);
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return issueDate > monthAgo;
    });

    if (recentIssues.length > 5) {
      return {
        type: 'معدل أعطال مرتفع جداً',
        severity: 'عالية',
        message: `تم تسجيل ${recentIssues.length} أعطال في الشهر الأخير فقط`,
        recommendation: 'فحص شامل للمركبة واستدعاء متخصص',
      };
    }

    return null;
  }

  /**
   * ==================== التوصيات الذكية ====================
   */

  /**
   * الحصول على توصيات مخصصة
   */
  async getSmartRecommendations(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      const recommendations = [];

      // التنبؤات
      const predictions = await this.predictMaintenanceNeeds(vehicleId);
      predictions.predictions.forEach((pred, key) => {
        if (pred && pred.priority === 'عالية') {
          recommendations.push({
            type: 'صيانة مخططة',
            priority: 'عالية',
            title: `ضرورة ${pred.component}`,
            description: `يُتوقع احتياجك إلى ${pred.component} بحلول ${new Date(pred.estimatedDate).toLocaleDateString('ar-SA')}`,
            cost: pred.cost,
            duration: pred.duration,
            action: 'جدول الصيانة',
          });
        }
      });

      // الحالات الشاذة
      const anomalies = await this.detectAnomalies(vehicleId);
      anomalies.anomalies.forEach(anomaly => {
        recommendations.push({
          type: 'تنبيه صحة',
          priority: anomaly.severity,
          title: anomaly.type,
          description: anomaly.message,
          recommendation: anomaly.recommendation,
          action: 'احجز فحص',
        });
      });

      // نصائح عامة
      recommendations.push({
        type: 'نصيحة',
        priority: 'منخفضة',
        title: 'الصيانة الوقائية توفر المال',
        description: 'الصيانة الدورية المنتظمة تقلل التكاليف بنسبة 30-40%',
        action: 'عرض الجدول الموصى به',
      });

      return {
        success: true,
        recommendations,
        priorityCount: {
          حرجة: recommendations.filter(r => r.priority === 'حرجة').length,
          عالية: recommendations.filter(r => r.priority === 'عالية').length,
          متوسطة: recommendations.filter(r => r.priority === 'متوسطة').length,
        },
      };
    } catch (error) {
      logger.error('خطأ في الحصول على التوصيات:', error);
      throw error;
    }
  }

  /**
   * ==================== دوال مساعدة ====================
   */

  /**
   * حساب مستوى الثقة
   */
  calculateConfidence(patterns) {
    if (patterns.maintenanceFrequency < 2) return 40;
    if (patterns.maintenanceFrequency < 5) return 60;
    if (patterns.maintenanceFrequency < 10) return 80;
    return 90;
  }

  /**
   * الحصول على أقرب تاريخ صيانة حرجة
   */
  getNextCriticalDate(predictions) {
    const dates = Object.values(predictions)
      .filter(p => p && p.priority === 'عالية')
      .map(p => new Date(p.estimatedDate))
      .sort((a, b) => a - b);

    return dates.length > 0 ? dates[0] : null;
  }
}

module.exports = new MaintenanceAIService();
