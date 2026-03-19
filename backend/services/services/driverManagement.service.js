/**
 * Driver Management Service - خدمة إدارة السائقين الذكية
 * تتضمن التقييم والتنبؤ والتحليل
 */

const Driver = require('../models/Driver');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');

class DriverManagementService {
  /**
   * حساب درجة الأمان للسائق
   */
  static async calculateSafetyScore(driverId) {
    try {
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      const violations = driver.violations;
      const totalViolations = violations.totalViolations || 0;

      // معادلة حساب درجة الأمان
      let safetyScore = 100;

      // انخفاض النقاط بناءً على الانتهاكات
      safetyScore -= violations.speedingIncidents * 5;
      safetyScore -= violations.harshBraking * 3;
      safetyScore -= violations.harshAcceleration * 3;
      safetyScore -= violations.distraction * 7;
      safetyScore -= violations.seatbeltViolations * 10;
      safetyScore -= violations.trafficViolations * 6;
      safetyScore -= violations.accidents * 15;

      // الحد الأدنى 0
      safetyScore = Math.max(0, safetyScore);

      driver.performance.safetyScore = Math.min(100, safetyScore);
      driver.performance.lastAssessmentDate = new Date();

      await driver.save();
      return driver.performance.safetyScore;
    } catch (error) {
      throw new Error(`Failed to calculate safety score: ${error.message}`);
    }
  }

  /**
   * حساب درجة الموثوقية
   */
  static async calculateReliabilityScore(driverId) {
    try {
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      const stats = driver.statistics;
      const totalTrips = stats.totalTrips || 1;

      // نسبة الرحلات المكتملة
      const completionRate = (stats.completedTrips / totalTrips) * 100 || 0;

      // عدد الرحلات الملغاة
      const cancellationRate = (stats.cancelledTrips / totalTrips) * 100 || 0;

      // معادلة درجة الموثوقية
      const reliabilityScore =
        completionRate * 0.6 - cancellationRate * 0.4 + (driver.performance.attendanceScore * 0.1 || 0);

      driver.performance.reliabilityScore = Math.min(100, Math.max(0, reliabilityScore));

      await driver.save();
      return driver.performance.reliabilityScore;
    } catch (error) {
      throw new Error(`Failed to calculate reliability score: ${error.message}`);
    }
  }

  /**
   * حساب درجة خدمة العملاء
   */
  static async calculateCustomerServiceScore(driverId) {
    try {
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      // الحصول على تقييمات الركاب
      const trips = await Trip.find({ driver: driverId }).populate('passengers.user');

      let totalRating = 0;
      let ratingCount = 0;

      trips.forEach((trip) => {
        trip.passengers.list.forEach((passenger) => {
          if (passenger.rating && passenger.rating > 0) {
            totalRating += passenger.rating;
            ratingCount++;
          }
        });
      });

      const averageRating = ratingCount > 0 ? (totalRating / ratingCount) * 20 : 50;

      driver.performance.customerServiceScore = Math.min(100, Math.max(0, averageRating));
      driver.statistics.averagePassengerRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      await driver.save();
      return driver.performance.customerServiceScore;
    } catch (error) {
      throw new Error(`Failed to calculate customer service score: ${error.message}`);
    }
  }

  /**
   * حساب درجة كفاءة استهلاك الوقود
   */
  static async calculateFuelEfficiencyScore(driverId) {
    try {
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      // البيانات المتعلقة باستهلاك الوقود من الرحلات
      const trips = await Trip.find({ driver: driverId });

      if (trips.length === 0) {
        driver.performance.fuelEfficiencyScore = 100;
        await driver.save();
        return 100;
      }

      let totalFuelUsed = 0;
      let totalDistance = 0;

      trips.forEach((trip) => {
        if (trip.fuelUsed) totalFuelUsed += trip.fuelUsed;
        if (trip.distance) totalDistance += trip.distance;
      });

      const fuelEfficiency = totalDistance > 0 ? (totalDistance / totalFuelUsed) * 5 : 50;

      driver.performance.fuelEfficiencyScore = Math.min(100, Math.max(0, fuelEfficiency));

      await driver.save();
      return driver.performance.fuelEfficiencyScore;
    } catch (error) {
      throw new Error(`Failed to calculate fuel efficiency score: ${error.message}`);
    }
  }

  /**
   * حساب درجة الصيانة
   */
  static async calculateMaintenanceScore(driverId) {
    try {
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      const vehicles = await Vehicle.find({ driver: driverId });

      if (vehicles.length === 0) {
        driver.performance.maintenanceScore = 100;
        await driver.save();
        return 100;
      }

      let maintenanceScore = 100;

      vehicles.forEach((vehicle) => {
        if (vehicle.maintenanceHistory && vehicle.maintenanceHistory.length > 0) {
          const lastMaintenanceDate = vehicle.maintenanceHistory[vehicle.maintenanceHistory.length - 1]
            .maintenanceDate;
          const daysSinceLastMaintenance = Math.floor((new Date() - lastMaintenanceDate) / (1000 * 60 * 60 * 24));

          // إذا مرت أكثر من 90 يوم بدون صيانة، نقلل النقاط
          if (daysSinceLastMaintenance > 90) {
            maintenanceScore -= 10;
          }
        } else {
          // لا توجد سجلات صيانة
          maintenanceScore -= 20;
        }
      });

      driver.performance.maintenanceScore = Math.min(100, Math.max(0, maintenanceScore));

      await driver.save();
      return driver.performance.maintenanceScore;
    } catch (error) {
      throw new Error(`Failed to calculate maintenance score: ${error.message}`);
    }
  }

  /**
   * حساب درجة الحضور
   */
  static async calculateAttendanceScore(driverId) {
    try {
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      // آخر 30 يوم
      const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

      const trips = await Trip.find({
        driver: driverId,
        createdAt: { $gte: thirtyDaysAgo },
      });

      // عدد أيام العمل المتوقعة (حسب أيام العمل المجدولة)
      const expectedWorkingDays = driver.schedule?.workingDays?.length || 5;
      const daysInMonth = 30;
      const totalExpectedDays = Math.floor((daysInMonth / 7) * expectedWorkingDays);

      const attendanceRate = (trips.length / totalExpectedDays) * 100 || 0;

      driver.performance.attendanceScore = Math.min(100, Math.max(0, attendanceRate));

      await driver.save();
      return driver.performance.attendanceScore;
    } catch (error) {
      throw new Error(`Failed to calculate attendance score: ${error.message}`);
    }
  }

  /**
   * تحديث جميع درجات الأداء
   */
  static async updateAllPerformanceScores(driverId) {
    try {
      await Promise.all([
        this.calculateSafetyScore(driverId),
        this.calculateReliabilityScore(driverId),
        this.calculateCustomerServiceScore(driverId),
        this.calculateFuelEfficiencyScore(driverId),
        this.calculateMaintenanceScore(driverId),
        this.calculateAttendanceScore(driverId),
      ]);

      const driver = await Driver.findById(driverId);
      driver.calculateOverallRating();
      await driver.save();

      return driver.performance;
    } catch (error) {
      throw new Error(`Failed to update all performance scores: ${error.message}`);
    }
  }

  /**
   * التنبؤ برخصة القيادة الست تنتهي قريباً
   */
  static async predictExpiringLicenses() {
    try {
      const thirtyDaysFromNow = new Date(new Date().setDate(new Date().getDate() + 30));

      const drivers = await Driver.find({
        'licenseDetails.expiryDate': {
          $lte: thirtyDaysFromNow,
          $gte: new Date(),
        },
      });

      return drivers.map((driver) => ({
        driverId: driver._id,
        driverName: driver.fullName,
        licenseNumber: driver.licenseDetails.licenseNumber,
        expiryDate: driver.licenseDetails.expiryDate,
        daysUntilExpiry: driver.daysUntilLicenseExpiry,
      }));
    } catch (error) {
      throw new Error(`Failed to predict expiring licenses: ${error.message}`);
    }
  }

  /**
   * التنبؤ بمعدل الغياب للسائق
   */
  static async predictAbsenceRate(driverId) {
    try {
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      // الحصول على بيانات آخر 60 يوم
      const sixtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 60));

      const trips = await Trip.find({
        driver: driverId,
        createdAt: { $gte: sixtyDaysAgo },
      });

      // عدد أيام العمل المجدولة
      const expectedWorkingDays = Math.floor(60 / 7) * (driver.schedule?.workingDays?.length || 5);

      // الأيام التي لم يعمل فيها
      const absenceDays = expectedWorkingDays - trips.length;

      // معدل الغياب
      const absenceRate = (absenceDays / expectedWorkingDays) * 100 || 0;

      // معادلة التنبؤ (الاتجاه الحالي)
      // إذا كان معدل الغياب أكثر من 20%، فهناك احتمالية عالية للغياب المستقبلي
      const predictedAbsenceRate = Math.min(100, absenceRate * 1.2);

      driver.aiMetrics.predictedAbsenceRate = Math.round(predictedAbsenceRate);

      // تحديد الاتجاه
      if (absenceRate > 20) {
        driver.aiMetrics.predictedPerformanceTrend = 'declining';
        driver.aiMetrics.trainingRecommendations = [
          'عقد اجتماع مع السائق لفهم المشاكل',
          'تقديم دعم إضافي',
          'مراقبة الغياب عن كثب',
        ];
      } else {
        driver.aiMetrics.predictedPerformanceTrend = 'stable';
      }

      await driver.save();
      return {
        driverId: driver._id,
        currentAbsenceRate: absenceRate,
        predictedAbsenceRate: Math.round(predictedAbsenceRate),
        trend: driver.aiMetrics.predictedPerformanceTrend,
      };
    } catch (error) {
      throw new Error(`Failed to predict absence rate: ${error.message}`);
    }
  }

  /**
   * التنبؤ باتجاه الأداء
   */
  static async predictPerformanceTrend(driverId) {
    try {
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      // الحصول على بيانات الأداء من آخر رحلات
      const recentTrips = await Trip.find({ driver: driverId })
        .sort({ createdAt: -1 })
        .limit(10);

      if (recentTrips.length === 0) {
        return { trend: 'no_data' };
      }

      // حساب متوسط التقيييمات
      let totalRating = 0;
      let ratingCount = 0;

      recentTrips.forEach((trip) => {
        trip.passengers.list.forEach((passenger) => {
          if (passenger.rating && passenger.rating > 0) {
            totalRating += passenger.rating;
            ratingCount++;
          }
        });
      });

      const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      // مقارنة مع الأداء السابق
      const previousRating = driver.statistics.averagePassengerRating || 0;
      const ratingChange = averageRating - previousRating;

      let trend = 'stable';
      if (ratingChange > 0.5) {
        trend = 'improving';
      } else if (ratingChange < -0.5) {
        trend = 'declining';
      }

      driver.aiMetrics.predictedPerformanceTrend = trend;

      // التوصيات بناءً على الاتجاه
      if (trend === 'declining') {
        driver.aiMetrics.trainingRecommendations = [
          'تدريب على خدمة العملاء',
          'مراجعة قواعد السلامة',
          'اجتماع مع المدير',
        ];
        driver.aiMetrics.riskFactors = ['انخفاض التقييمات', 'تدهور الأداء'];
      } else if (trend === 'improving') {
        driver.aiMetrics.strengths = ['تحسن الأداء', 'ارتفاع التقييمات'];
      }

      await driver.save();

      return {
        driverId: driver._id,
        trend,
        averageRating,
        ratingChange,
        recommendations: driver.aiMetrics.trainingRecommendations,
      };
    } catch (error) {
      throw new Error(`Failed to predict performance trend: ${error.message}`);
    }
  }

  /**
   * إنشاء تقرير شامل للسائق
   */
  static async generateComprehensiveReport(driverId) {
    try {
      const driver = await Driver.findById(driverId).populate('userId', 'name email phone');

      if (!driver) throw new Error('Driver not found');

      // تحديث جميع الدرجات
      await this.updateAllPerformanceScores(driverId);

      // التنبؤات
      const absencePrediction = await this.predictAbsenceRate(driverId);
      const performanceTrend = await this.predictPerformanceTrend(driverId);

      // جمع البيانات
      const report = {
        driverId: driver._id,
        driverName: driver.fullName,
        email: driver.email,
        personalPhone: driver.personalPhone,
        status: driver.status,
        hireDate: driver.hireDate,
        experienceInYears: driver.experienceInYears,

        // درجات الأداء
        performance: {
          overallRating: driver.performance.overallRating,
          safetyScore: driver.performance.safetyScore,
          reliabilityScore: driver.performance.reliabilityScore,
          customerServiceScore: driver.performance.customerServiceScore,
          fuelEfficiencyScore: driver.performance.fuelEfficiencyScore,
          maintenanceScore: driver.performance.maintenanceScore,
          attendanceScore: driver.performance.attendanceScore,
        },

        // الإحصائيات
        statistics: {
          totalTrips: driver.statistics.totalTrips,
          completedTrips: driver.statistics.completedTrips,
          cancelledTrips: driver.statistics.cancelledTrips,
          totalHoursWorked: driver.statistics.totalHoursWorked,
          totalKilometersDriven: driver.statistics.totalKilometersDriven,
          averagePassengerRating: driver.statistics.averagePassengerRating,
        },

        // الانتهاكات
        violations: {
          total: driver.violations.totalViolations,
          speeding: driver.violations.speedingIncidents,
          accidents: driver.violations.accidents,
          other: driver.violations.totalViolations - driver.violations.speedingIncidents - driver.violations.accidents,
        },

        // التنبؤات والتوصيات
        predictions: {
          absenceRate: absencePrediction.predictedAbsenceRate,
          performanceTrend: performanceTrend.trend,
          trainingRecommendations: driver.aiMetrics.trainingRecommendations,
          riskFactors: driver.aiMetrics.riskFactors,
          strengths: driver.aiMetrics.strengths,
        },

        // معلومات الرخصة
        license: {
          number: driver.licenseDetails.licenseNumber,
          type: driver.licenseDetails.licenseType,
          expiryDate: driver.licenseDetails.expiryDate,
          daysUntilExpiry: driver.daysUntilLicenseExpiry,
          isValid: driver.isLicenseValid(),
        },

        // الشهادات النشطة
        activeCertifications: driver.getActiveCertifications(),

        generatedAt: new Date(),
      };

      return report;
    } catch (error) {
      throw new Error(`Failed to generate comprehensive report: ${error.message}`);
    }
  }

  /**
   * الحصول على قائمة السائقين الذين يحتاجون تدريباً
   */
  static async getDriversNeedingTraining() {
    try {
      const drivers = await Driver.find({
        isActive: true,
        $or: [
          { 'performance.safetyScore': { $lt: 70 } },
          { 'performance.customerServiceScore': { $lt: 70 } },
          { 'training.trainingDueDate': { $lte: new Date() } },
        ],
      }).sort({ 'performance.safetyScore': 1 });

      return drivers.map((driver) => ({
        driverId: driver._id,
        driverName: driver.fullName,
        safetyScore: driver.performance.safetyScore,
        customerServiceScore: driver.performance.customerServiceScore,
        trainingDueDate: driver.training.trainingDueDate,
        recommendations: driver.aiMetrics.trainingRecommendations,
      }));
    } catch (error) {
      throw new Error(`Failed to get drivers needing training: ${error.message}`);
    }
  }

  /**
   * الحصول على أفضل السائقين
   */
  static async getTopPerformers(limit = 10) {
    try {
      const drivers = await Driver.find({ isActive: true })
        .sort({ 'performance.overallRating': -1 })
        .limit(limit)
        .select('firstName lastName performance statistics aiMetrics');

      return drivers;
    } catch (error) {
      throw new Error(`Failed to get top performers: ${error.message}`);
    }
  }
}

module.exports = DriverManagementService;
