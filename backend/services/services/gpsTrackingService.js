/**
 * GPS Tracking Service
 * خدمات تتبع GPS المتقدمة
 */

const GPSLocation = require('../models/GPSLocation');
const Driver = require('../models/Driver');

class GPSTrackingService {
  /**
   * تسجيل موقع جديد
   */
  static async recordLocation(driverId, locationData) {
    try {
      const {
        coordinates,
        speed,
        heading,
        altitude,
        accuracy,
        satellites,
        acceleration,
        seatbeltStatus,
        engineRunning,
      } = locationData;

      // التحقق من وجود السائق
      const driver = await Driver.findById(driverId);
      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      // إنشاء موقع جديد
      const location = new GPSLocation({
        driver: driverId,
        location: {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude],
        },
        speed,
        heading,
        altitude,
        accuracy,
        satellites,
        acceleration,
        seatbeltStatus,
        engineRunning,
      });

      // التحقق من انتهاكات
      const violations = this.checkViolations(location);

      // إضافة التنبيهات
      if (violations.length > 0) {
        location.alerts = violations;
      }

      // حفظ الموقع
      await location.save();

      // تحديث آخر موقع معروف للسائق
      driver.lastKnownLocation = {
        coordinates: [coordinates.longitude, coordinates.latitude],
        timestamp: new Date(),
        speed,
      };

      await driver.save();

      return location;
    } catch (error) {
      console.error('خطأ في تسجيل الموقع:', error);
      throw error;
    }
  }

  /**
   * التحقق من الانتهاكات والتنبيهات
   */
  static checkViolations(location) {
    const violations = [];

    // 1. فحص انتهاك السرعة
    if (location.speed > location.maxSpeedAllowed) {
      violations.push({
        type: 'speeding',
        severity: location.speed > location.maxSpeedAllowed * 1.5 ? 'critical' : 'high',
        message: `تجاوز السرعة: ${location.speed} كم/س (الحد: ${location.maxSpeedAllowed} كم/س)`,
      });
    }

    // 2. فحص التسارع الحاد
    if (location.acceleration) {
      const totalAccel = Math.sqrt(
        location.acceleration.x ** 2 +
          location.acceleration.y ** 2 +
          location.acceleration.z ** 2
      );

      if (totalAccel > 0.5) {
        violations.push({
          type: 'harsh_acceleration',
          severity: 'medium',
          message: `تسارع حاد: ${totalAccel.toFixed(2)} G`,
        });
      }
    }

    // 3. فحص حزام الأمان
    if (location.seatbeltStatus === 'unfastened' && location.engineRunning) {
      violations.push({
        type: 'seatbelt_unbuckled',
        severity: 'high',
        message: 'حزام الأمان غير مثبت',
      });
    }

    return violations;
  }

  /**
   * الحصول على الموقع الحالي
   */
  static async getCurrentLocation(driverId) {
    try {
      return await GPSLocation.getLatestLocation(driverId);
    } catch (error) {
      console.error('خطأ في جلب الموقع الحالي:', error);
      throw error;
    }
  }

  /**
   * الحصول على خريطة المسار
   */
  static async getRouteMap(driverId, startTime, endTime) {
    try {
      const locations = await GPSLocation.getLocationsInTimeRange(
        driverId,
        startTime,
        endTime
      );

      if (locations.length === 0) {
        return null;
      }

      // حساب المسافة الكلية
      let totalDistance = 0;
      for (let i = 0; i < locations.length - 1; i++) {
        totalDistance += locations[i].getDistanceTo(locations[i + 1]);
      }

      // حساب متوسط السرعة
      const avgSpeed = locations.reduce((acc, loc) => acc + loc.speed, 0) / locations.length;

      return {
        locations: locations.map((loc) => ({
          lat: loc.lat,
          lon: loc.lon,
          speed: loc.speed,
          timestamp: loc.timestamp,
        })),
        stats: {
          totalDistance: totalDistance.toFixed(2),
          averageSpeed: avgSpeed.toFixed(2),
          maxSpeed: Math.max(...locations.map((l) => l.speed)),
          duration: (locations[locations.length - 1].timestamp - locations[0].timestamp) / 1000 / 60,
          pointCount: locations.length,
        },
      };
    } catch (error) {
      console.error('خطأ في جلب خريطة المسار:', error);
      throw error;
    }
  }

  /**
   * الحصول على تقرير السلوك
   */
  static async getBehaviorReport(driverId, startTime, endTime) {
    try {
      const locations = await GPSLocation.getLocationsInTimeRange(
        driverId,
        startTime,
        endTime
      );

      if (locations.length === 0) {
        throw new Error('لا توجد بيانات علمية');
      }

      // حساب الإحصائيات
      const speedViolations = locations.filter((l) => l.speedLimitViolation).length;
      const harshAccelerations = locations.filter((l) => l.harshAcceleration).length;
      const harshBrakings = locations.filter((l) => l.harshBraking).length;
      const sharpTurns = locations.filter((l) => l.sharpTurn).length;

      // حساب درجة السلوك
      const baseScore = 100;
      const penalties = {
        speedViolation: speedViolations * 2,
        harshAcceleration: harshAccelerations * 1,
        harshBraking: harshBrakings * 1,
        sharpTurn: sharpTurns * 1.5,
      };

      const totalPenalty = Object.values(penalties).reduce((a, b) => a + b, 0);
      const behaviorScore = Math.max(0, 100 - totalPenalty);

      return {
        score: behaviorScore,
        grading: this.getGradeFromScore(behaviorScore),
        violations: {
          speeding: speedViolations,
          harshAcceleration: harshAccelerations,
          harshBraking: harshBrakings,
          sharpTurn: sharpTurns,
        },
        recommendations: this.generateRecommendations(behaviorScore, penalties),
        summary: `السائق لديه سلوك ${this.getGradeFromScore(behaviorScore)} على الطريق`,
      };
    } catch (error) {
      console.error('خطأ في جلب تقرير السلوك:', error);
      throw error;
    }
  }

  /**
   * الحصول على درجة من النقاط
   */
  static getGradeFromScore(score) {
    if (score >= 90) return 'ممتاز';
    if (score >= 80) return 'جيد جداً';
    if (score >= 70) return 'جيد';
    if (score >= 60) return 'مقبول';
    return 'ضعيف';
  }

  /**
   * توليد توصيات التحسين
   */
  static generateRecommendations(score, penalties) {
    const recommendations = [];

    if (penalties.speedViolation > 0) {
      recommendations.push('التزم بحدود السرعة المقررة');
    }
    if (penalties.harshAcceleration > 0) {
      recommendations.push('تجنب التسارع المفاجئ');
    }
    if (penalties.harshBraking > 0) {
      recommendations.push('قم بالكبح بسلاسة وتدرج');
    }
    if (penalties.sharpTurn > 0) {
      recommendations.push('خذ المنعطفات بحذر وببطء');
    }

    if (score < 60) {
      recommendations.push('يُنصح بحضور برنامج تدريب السلامة');
    }

    return recommendations;
  }

  /**
   * البحث عن السائقين بالقرب من موقع
   */
  static async findNearbyDrivers(longitude, latitude, maxDistance = 1000) {
    try {
      return await GPSLocation.findNearby(longitude, latitude, maxDistance);
    } catch (error) {
      console.error('خطأ في البحث عن السائقين:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الأسطول
   */
  static async getFleetStatistics(driverId = null, timeRange = 'today') {
    try {
      const now = new Date();
      let startTime = new Date();

      // تحديد نطاق الوقت
      if (timeRange === 'today') {
        startTime.setHours(0, 0, 0, 0);
      } else if (timeRange === 'week') {
        startTime.setDate(now.getDate() - 7);
      } else if (timeRange === 'month') {
        startTime.setMonth(now.getMonth() - 1);
      }

      let query = { timestamp: { $gte: startTime, $lte: now } };
      if (driverId) {
        query.driver = driverId;
      }

      // حساب الإحصائيات
      const locations = await GPSLocation.find(query);
      const avgSpeed = await GPSLocation.getAverageSpeed(driverId, startTime, now);

      return {
        totalLocationsTracked: locations.length,
        totalActiveDrivers: new Set(locations.map((l) => l.driver)).size,
        averageSpeed: avgSpeed?.averageSpeed?.toFixed(2) || 0,
        maxSpeed: avgSpeed?.maxSpeed || 0,
        speedViolations: locations.filter((l) => l.speedLimitViolation).length,
        totalDistance: locations.reduce((acc, loc) => acc + (loc.distanceDriven || 0), 0).toFixed(2),
        timeRange,
      };
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الأسطول:', error);
      throw error;
    }
  }
}

module.exports = GPSTrackingService;
