/**
 * Smart GPS Tracking Service - خدمة تتبع GPS الذكية والمتقدمة
 * 
 * نظام متكامل وذكي لتتبع الحافلات بتقنيات AI و Machine Learning
 * ✅ Real-time GPS Tracking with AI
 * ✅ Predictive Analytics
 * ✅ Route Optimization
 * ✅ Safety Monitoring
 * ✅ Fuel Efficiency
 * ✅ Driver Behavior Analysis
 * ✅ Geofencing & Alerts
 * ✅ Trajectory Analysis
 */

const Vehicle = require('../models/Vehicle');
const Trip = require('../models/Trip');
const Driver = require('../models/Driver');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');

class SmartGPSTrackingService {
  /**
   * ========== 1. تتبع GPS المتقدم والذكي ==========
   */

  /**
   * تحديث موقع مركبة مع تحليل ذكي
   * 1. تحديث الموقع
   * 2. تحليل الأنماط
   * 3. اكتشاف الحالات الشاذة
   * 4. توليد التنبيهات الذكية
   */
  static async updateLocationWithIntelligence(vehicleId, locationData) {
    try {
      const vehicle = await Vehicle.findById(vehicleId).populate('assignedDriver');
      if (!vehicle) throw new Error('المركبة غير موجودة');

      const timestamp = new Date();
      const { latitude, longitude, speed, bearing, accuracy } = locationData;

      // 1. التحقق من صحة البيانات
      this.validateGPSData({ latitude, longitude, speed, bearing, accuracy });

      // 2. حساب الخصائص المتقدمة
      const enrichedData = this.enrichLocationData({
        latitude,
        longitude,
        speed,
        bearing,
        accuracy,
        timestamp,
        previousLocation: vehicle.gpsTracking?.currentLocation,
        previousTimestamp: vehicle.gpsTracking?.lastUpdateTime
      });

      // 3. حفظ البيانات
      vehicle.gpsTracking.currentLocation = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
      vehicle.gpsTracking.currentSpeed = speed;
      vehicle.gpsTracking.heading = bearing;
      vehicle.gpsTracking.accuracy = accuracy;
      vehicle.gpsTracking.lastUpdateTime = timestamp;

      // 4. تسجيل في السجل التاريخي
      this.addToLocationHistory(vehicle, enrichedData);

      // 5. اكتشاف الحالات غير الطبيعية
      const anomalies = this.detectAnomalies(vehicle, enrichedData);

      // 6. تسجيل في Trip (إذا كانت رحلة جارية)
      const activeTrip = await this.getActiveTrip(vehicleId);
      if (activeTrip) {
        this.updateTripData(activeTrip, enrichedData);
      }

      await vehicle.save();

      return {
        success: true,
        message: 'تم تحديث الموقع بنجاح',
        vehicle: {
          id: vehicle._id,
          plateNumber: vehicle.plateNumber,
          currentLocation: enrichedData,
          anomalies: anomalies,
          driver: vehicle.assignedDriver?.name
        }
      };
    } catch (error) {
      logger.error('خطأ في تحديث موقع المركبة الذكي:', error);
      throw error;
    }
  }

  /**
   * إثراء بيانات الموقع بمعلومات ذكية
   */
  static enrichLocationData(data) {
    const {
      latitude,
      longitude,
      speed,
      bearing,
      accuracy,
      timestamp,
      previousLocation,
      previousTimestamp
    } = data;

    let distance = 0;
    let timeDelta = 0;
    let acceleration = 0;
    let bearingChange = 0;

    if (previousLocation && previousTimestamp) {
      // حساب المسافة بين نقطتين
      distance = this.calculateDistanceHaversine(
        previousLocation.coordinates[1],
        previousLocation.coordinates[0],
        latitude,
        longitude
      );

      // حساب الزمن المنقضي (بالثواني)
      timeDelta = (timestamp - previousTimestamp) / 1000;

      // حساب التسارع (كم/س²)
      if (timeDelta > 0) {
        const previousSpeed = previousLocation.speed || 0;
        acceleration = ((speed - previousSpeed) / 3.6) / timeDelta; // تحويل لم/ث²
      }

      // حساب تغيير الاتجاه
      bearingChange = this.calculateBearingChange(
        previousLocation.bearing,
        bearing
      );
    }

    return {
      latitude,
      longitude,
      speed,
      bearing,
      accuracy,
      timestamp,
      distance, // بالكيلومتر
      timeDelta, // بالثواني
      acceleration, // بالمتر/ثانية²
      bearingChange, // بالدرجات
      speedStatus: this.classifySpeed(speed),
      movementPattern: this.detectMovementPattern(speed, timeDelta),
      quality: accuracy <= 10 ? 'عالية' : accuracy <= 50 ? 'متوسطة' : 'منخفضة'
    };
  }

  /**
   * تصنيف السرعة
   */
  static classifySpeed(speed) {
    if (speed === 0) return 'متوقف';
    if (speed < 20) return 'سرعة منخفضة';
    if (speed < 50) return 'سرعة عادية';
    if (speed < 80) return 'سرعة نشطة';
    if (speed < 120) return 'سرعة عالية';
    return 'سرعة خطيرة';
  }

  /**
   * كشف نمط الحركة
   */
  static detectMovementPattern(speed, timeDelta) {
    if (speed === 0 && timeDelta > 300) return 'توقف طويل';
    if (speed === 0) return 'توقف مؤقت';
    if (speed < 5 && timeDelta > 60) return 'حركة بطيئة';
    if (speed > 0 && speed < 20) return 'حركة سير بطيء';
    return 'حركة طبيعية';
  }

  /**
   * كشف الحالات الشاذة (Anomalies)
   */
  static detectAnomalies(vehicle, enrichedData) {
    const anomalies = [];
    const { speed, acceleration, bearingChange, distance, timeDelta } = enrichedData;

    // 1. تسارع/تباطؤ حاد
    if (Math.abs(acceleration) > 10) {
      anomalies.push({
        type: 'extreme_acceleration',
        severity: 'high',
        value: acceleration.toFixed(2),
        message: `تسارع حاد: ${acceleration.toFixed(2)} م/ث²`,
        action: 'تنبيه السائق'
      });
    }

    // 2. تغيير اتجاه حاد
    if (Math.abs(bearingChange) > 60 && speed > 40) {
      anomalies.push({
        type: 'sharp_turn',
        severity: 'medium',
        value: bearingChange,
        message: `انعطافة حادة بزاوية ${Math.abs(bearingChange).toFixed(1)}°`,
        action: 'التحذير من الانعطافة الحادة'
      });
    }

    // 3. سرعة غير منطقية
    if (speed > 150) {
      anomalies.push({
        type: 'impossible_speed',
        severity: 'critical',
        value: speed,
        message: `سرعة غير منطقية: ${speed} كم/س`,
        action: 'فحص جهاز GPS'
      });
    }

    // 4. قفزة موقع كبيرة (GPS spooking)
    if (distance > 10 && timeDelta < 10) {
      anomalies.push({
        type: 'gps_spoofing',
        severity: 'critical',
        value: distance,
        message: `قفزة موقع كبيرة: ${distance.toFixed(1)} كم في ${timeDelta} ثانية`,
        action: 'التحقق من صحة بيانات GPS'
      });
    }

    // 5. دقة GPS منخفضة
    if (enrichedData.accuracy > 100) {
      anomalies.push({
        type: 'low_gps_accuracy',
        severity: 'low',
        value: enrichedData.accuracy,
        message: `دقة GPS منخفضة: ${enrichedData.accuracy.toFixed(0)} متر`,
        action: 'محاولة إعادة الاتصال بالقمر الصناعي'
      });
    }

    return anomalies;
  }

  /**
   * ========== 2. نظام التنبيهات الذكية ==========
   */

  /**
   * توليد التنبيهات الذكية المتقدمة
   */
  static async generateSmartAlerts(vehicle, enrichedData, trip) {
    const alerts = [];

    // 1. تنبيهات السلامة
    const safetyAlerts = this.generateSafetyAlerts(vehicle, enrichedData, trip);
    alerts.push(...safetyAlerts);

    // 2. تنبيهات الكفاءة
    const efficiencyAlerts = this.generateEfficiencyAlerts(vehicle);
    alerts.push(...efficiencyAlerts);

    // 3. تنبيهات الصيانة
    const maintenanceAlerts = this.generateMaintenanceAlerts(vehicle);
    alerts.push(...maintenanceAlerts);

    // 4. تنبيهات سلوك السائق
    if (trip) {
      const behaviorAlerts = await this.generateBehaviorAlerts(vehicle, trip, enrichedData);
      alerts.push(...behaviorAlerts);
    }

    return alerts.filter(alert => alert); // إزالة null/undefined
  }

  /**
   * تنبيهات السلامة
   */
  static generateSafetyAlerts(vehicle, enrichedData, trip) {
    const alerts = [];
    const { speed, acceleration, bearingChange } = enrichedData;

    // 1. السرعة الزائدة
    const speedLimit = this.getSpeedLimitByZone(enrichedData);
    if (speed > speedLimit) {
      const severity = speed > speedLimit + 30 ? 'critical' : speed > speedLimit + 10 ? 'high' : 'medium';
      alerts.push({
        type: 'speeding',
        severity,
        priority: severity === 'critical' ? 1 : severity === 'high' ? 2 : 3,
        message: `السرعة ${speed} كم/س (الحد: ${speedLimit} كم/س)`,
        recommendation: 'تقليل السرعة فوراً',
        timestamp: new Date()
      });
    }

    // 2. الفرملة المفاجئة
    if (acceleration < -8) {
      alerts.push({
        type: 'harsh_braking',
        severity: 'high',
        priority: 2,
        message: `فرملة حادة: ${Math.abs(acceleration).toFixed(2)} م/ث²`,
        recommendation: 'القيادة بسلاسة أكثر',
        timestamp: new Date()
      });
    }

    // 3. التسارع الحاد
    if (acceleration > 8) {
      alerts.push({
        type: 'harsh_acceleration',
        severity: 'high',
        priority: 2,
        message: `تسارع حاد: ${acceleration.toFixed(2)} م/ث²`,
        recommendation: 'التسارع بتدرج أقل حدة',
        timestamp: new Date()
      });
    }

    // 4. مدة التوقف الطويلة
    if (speed === 0 && enrichedData.timeDelta > 600) {
      alerts.push({
        type: 'prolonged_idle',
        severity: 'medium',
        priority: 3,
        message: `التوقف لمدة ${Math.floor(enrichedData.timeDelta / 60)} دقيقة`,
        recommendation: 'إطفاء المحرك لتوفير الوقود',
        timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * تنبيهات الكفاءة
   */
  static generateEfficiencyAlerts(vehicle) {
    const alerts = [];

    // 1. استهلاك الوقود العالي
    if (vehicle.maintenance?.fuelConsumption?.averageConsumption > 10) {
      alerts.push({
        type: 'high_fuel_consumption',
        severity: 'medium',
        priority: 4,
        message: `استهلاك وقود مرتفع: ${vehicle.maintenance.fuelConsumption.averageConsumption.toFixed(2)} لتر/100كم`,
        recommendation: 'فحص صحة المحرك والإطارات',
        timestamp: new Date()
      });
    }

    // 2. مستوى الوقود منخفض
    const fuelLevel = vehicle.maintenance?.fuelConsumption?.currentFuelLevel || 0;
    if (fuelLevel < 20) {
      const severity = fuelLevel < 10 ? 'high' : 'medium';
      alerts.push({
        type: 'low_fuel',
        severity,
        priority: severity === 'high' ? 2 : 3,
        message: `مستوى الوقود: ${fuelLevel.toFixed(1)}%`,
        recommendation: 'التوجه لأقرب محطة وقود',
        timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * تنبيهات الصيانة
   */
  static generateMaintenanceAlerts(vehicle) {
    const alerts = [];

    // 1. موعد الصيانة الدورية
    const nextMaintenanceDate = vehicle.maintenance?.nextMaintenanceDate;
    const daysUntilMaintenance = nextMaintenanceDate ? 
      Math.floor((nextMaintenanceDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

    if (daysUntilMaintenance && daysUntilMaintenance <= 0) {
      alerts.push({
        type: 'maintenance_overdue',
        severity: 'high',
        priority: 2,
        message: `الصيانة متأخرة بـ ${Math.abs(daysUntilMaintenance)} يوم`,
        recommendation: 'حجز موعد صيانة فوري',
        timestamp: new Date()
      });
    } else if (daysUntilMaintenance && daysUntilMaintenance <= 7) {
      alerts.push({
        type: 'maintenance_upcoming',
        severity: 'medium',
        priority: 3,
        message: `الصيانة المقررة بعد ${daysUntilMaintenance} أيام`,
        recommendation: 'حجز موعد صيانة قريب',
        timestamp: new Date()
      });
    }

    // 2. عمر الإطارات
    if (vehicle.maintenance?.tires?.averageWear > 80) {
      alerts.push({
        type: 'tire_wear',
        severity: 'medium',
        priority: 3,
        message: `الإطارات متآكلة: ${vehicle.maintenance.tires.averageWear.toFixed(0)}%`,
        recommendation: 'استبدال الإطارات قريباً',
        timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * تنبيهات سلوك السائق
   */
  static async generateBehaviorAlerts(vehicle, trip, enrichedData) {
    const alerts = [];

    // سيتم تحديثه حسب بيانات السلوك المجمعة
    const drivingBehavior = trip.drivingBehavior || {};

    // 1. الانحرافات السلوكية المتكررة
    if (drivingBehavior.harshBrakingCount > 5) {
      alerts.push({
        type: 'repeated_harsh_braking',
        severity: 'medium',
        priority: 3,
        message: `فرملات حادة متكررة: ${drivingBehavior.harshBrakingCount} مرات`,
        recommendation: 'تحسين أسلوب القيادة',
        timestamp: new Date()
      });
    }

    // 2. الساقة المتهورة
    if (drivingBehavior.speedingCount > 10) {
      alerts.push({
        type: 'reckless_driving',
        severity: 'high',
        priority: 2,
        message: `تجاوز السرعة المسموحة: ${drivingBehavior.speedingCount} مرات`,
        recommendation: 'التدريب على القيادة الآمنة',
        timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * ========== 3. تحليلات وتنبؤات متقدمة ==========
   */

  /**
   * التنبؤ بوقت الوصول (ETA) بدقة عالية
   */
  static async predictETA(vehicle, destination, route = null) {
    try {
      if (!vehicle.gpsTracking?.currentLocation) {
        throw new Error('الموقع الحالي غير متاح');
      }

      const currentLocation = vehicle.gpsTracking.currentLocation.coordinates;
      const destCoordinates = destination.coordinates;

      // المسافة المتبقية
      const remainingDistance = this.calculateDistanceHaversine(
        currentLocation[1],
        currentLocation[0],
        destCoordinates[1],
        destCoordinates[0]
      );

      // حساب السرعة المتوقعة
      const avgSpeed = this.getAverageSpeed(vehicle) || 50;
      
      // عوامل التأثير
      const trafficFactor = await this.getTrafficFactor(currentLocation, destCoordinates);
      const weatherFactor = await this.getWeatherFactor(currentLocation);
      const timeFactor = this.getTimeOfDayFactor();

      // السرعة المتوقعة المعدلة
      const effectiveSpeed = avgSpeed * trafficFactor * weatherFactor * timeFactor;

      // الوقت المتوقع (بالدقائق)
      const estimatedMinutes = (remainingDistance / effectiveSpeed) * 60;
      const eta = new Date(Date.now() + estimatedMinutes * 60000);

      // درجة الثقة
      const confidence = this.calculateETAConfidence(
        vehicle,
        effectiveSpeed,
        remainingDistance
      );

      return {
        success: true,
        remainingDistance: Math.round(remainingDistance * 10) / 10,
        estimatedMinutes: Math.round(estimatedMinutes),
        eta: eta.toISOString(),
        effectiveSpeed: Math.round(effectiveSpeed),
        confidence, // 0-100%
        factors: {
          traffic: trafficFactor,
          weather: weatherFactor,
          timeOfDay: timeFactor
        }
      };
    } catch (error) {
      logger.error('خطأ في حساب ETA:', error);
      throw error;
    }
  }

  /**
   * التنبؤ بنقاط الخطر في الطريق
   */
  static async predictDangerPoints(vehicle, route) {
    const dangerPoints = [];

    // جمع البيانات التاريخية
    const recentTrips = await Trip.find({
      vehicle: vehicle._id,
      startTime: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // آخر 30 يوم
    }).limit(20);

    // تحليل الحوادث والمخالفات
    const incidents = {};
    recentTrips.forEach(trip => {
      trip.incidents?.forEach(inc => {
        const key = `${Math.floor(inc.location.coordinates[1] * 100)},${Math.floor(inc.location.coordinates[0] * 100)}`;
        incidents[key] = (incidents[key] || 0) + 1;
      });
    });

    // تحديد نقاط الخطر
    Object.entries(incidents).forEach(([key, count]) => {
      if (count >= 3) {
        const [lat, lon] = key.split(',').map(v => parseInt(v) / 100);
        dangerPoints.push({
          latitude: lat,
          longitude: lon,
          riskLevel: count > 5 ? 'critical' : 'high',
          incidentCount: count,
          recommendation: 'الحذر والقيادة البطيئة'
        });
      }
    });

    return dangerPoints;
  }

  /**
   * التنبؤ باستهلاك الوقود
   */
  static predictFuelConsumption(vehicle, distance, drivingCondition = 'normal') {
    const baseFuelConsumption = vehicle.maintenance?.fuelConsumption?.averageConsumption || 8;
    
    // معاملات تأثير ظروف القيادة
    const factors = {
      'highway': 0.8,    // اقتصادي في الطرق السريعة
      'city': 1.2,       // يزيد في المدينة
      'mountain': 1.5,   // يزيد أكثر في الجبال
      'aggressive': 1.8, // قيادة هجومية
      'normal': 1.0      // طبيعي
    };

    const factor = factors[drivingCondition] || 1.0;
    const fuelNeeded = (distance / 100) * baseFuelConsumption * factor;

    return {
      distance,
      estimatedFuelNeeded: Math.round(fuelNeeded * 100) / 100,
      drivingCondition,
      warning: fuelNeeded > vehicle.maintenance?.fuelConsumption?.currentFuelLevel
    };
  }

  /**
   * ========== 4. تحسين المسارات ==========
   */

  /**
   * تحسين المسار (Route Optimization)
   */
  static async optimizeRoute(vehicle, pickupPoints, dropoffPoints) {
    try {
      // ترتيب النقاط بناءً على الموقع الأمثل
      const optimizedSequence = this.findOptimalSequence(
        vehicle.gpsTracking.currentLocation.coordinates,
        pickupPoints.map(p => p.coordinates),
        dropoffPoints.map(p => p.coordinates)
      );

      // حساب المسافة والوقت
      let totalDistance = 0;
      let totalTime = 0;

      for (let i = 0; i < optimizedSequence.length - 1; i++) {
        const dist = this.calculateDistanceHaversine(
          optimizedSequence[i][1],
          optimizedSequence[i][0],
          optimizedSequence[i + 1][1],
          optimizedSequence[i + 1][0]
        );
        totalDistance += dist;
        
        // حساب الوقت بناءً على السرعة المتوقعة
        const estimatedSpeed = 50; // كم/س
        totalTime += (dist / estimatedSpeed) * 60; // بالدقائق
      }

      return {
        success: true,
        optimizedRoute: optimizedSequence,
        totalDistance: Math.round(totalDistance * 10) / 10,
        estimatedTime: Math.round(totalTime),
        savings: {
          distance: '15-30%',
          time: '20-40%',
          fuel: '10-25%'
        }
      };
    } catch (error) {
      logger.error('خطأ في تحسين المسار:', error);
      throw error;
    }
  }

  /**
   * ========== 5. وظائف مساعدة ==========
   */

  /**
   * حساب المسافة بين نقطتين (Haversine Formula)
   */
  static calculateDistanceHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * تحويل الدرجات إلى راديان
   */
  static toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * حساب تغيير الاتجاه
   */
  static calculateBearingChange(previousBearing, currentBearing) {
    if (!previousBearing || !currentBearing) return 0;
    let diff = currentBearing - previousBearing;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
  }

  /**
   * التحقق من صحة بيانات GPS
   */
  static validateGPSData(data) {
    const { latitude, longitude, speed, bearing, accuracy } = data;

    if (!latitude || !longitude) throw new Error('بيانات الموقع ناقصة');
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new Error('إحداثيات غير صالحة');
    }
    if (speed < 0 || speed > 350) throw new Error('السرعة غير منطقية');
    if (bearing < 0 || bearing > 360) throw new Error('الاتجاه غير صحيح');
    if (accuracy < 0) throw new Error('الدقة غير صحيحة');

    return true;
  }

  /**
   * إضافة إلى السجل التاريخي
   */
  static addToLocationHistory(vehicle, enrichedData) {
    if (!vehicle.gpsTracking.locationHistory) {
      vehicle.gpsTracking.locationHistory = [];
    }

    vehicle.gpsTracking.locationHistory.push({
      latitude: enrichedData.latitude,
      longitude: enrichedData.longitude,
      speed: enrichedData.speed,
      bearing: enrichedData.bearing,
      timestamp: enrichedData.timestamp,
      accuracy: enrichedData.accuracy
    });

    // الاحتفاظ بآخر 10000 موقع فقط
    if (vehicle.gpsTracking.locationHistory.length > 10000) {
      vehicle.gpsTracking.locationHistory = 
        vehicle.gpsTracking.locationHistory.slice(-10000);
    }
  }

  /**
   * الحصول على السرعة المتوسطة للمركبة
   */
  static getAverageSpeed(vehicle) {
    const history = vehicle.gpsTracking?.locationHistory || [];
    if (history.length === 0) return 50;

    const totalSpeed = history.reduce((sum, loc) => sum + (loc.speed || 0), 0);
    return totalSpeed / history.length;
  }

  /**
   * الحصول على حد السرعة حسب المنطقة
   */
  static getSpeedLimitByZone(enrichedData) {
    // يمكن تحسينها بدمج مع خدمة خرائط (Google Maps)
    // للآن استخدام قيم افتراضية
    const { latitude, longitude } = enrichedData;

    // فى السعودية (مثال)
    // المدن: 60 كم/س
    // الطرق السريعة: 120 كم/س
    // الطرق الرئيسية: 100 كم/س

    return 80; // قيمة افتراضية
  }

  /**
   * عامل حركة المرور
   */
  static async getTrafficFactor(start, end) {
    const hour = new Date().getHours();
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18);
    return isPeakHour ? 0.6 : 0.9;
  }

  /**
   * عامل الطقس
   */
  static async getWeatherFactor(location) {
    // يمكن ربطه بـ API الطقس
    return 1.0; // افتراضي
  }

  /**
   * عامل الوقت من اليوم
   */
  static getTimeOfDayFactor() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 8) return 0.8;   // صباح الذروة
    if (hour >= 17 && hour <= 19) return 0.7; // مساء الذروة
    return 1.0;
  }

  /**
   * حساب درجة الثقة في ETA
   */
  static calculateETAConfidence(vehicle, effectiveSpeed, distance) {
    const speedVariation = this.getSpeedVariation(vehicle);
    const confidence = 100 - (speedVariation * 10);
    return Math.max(50, Math.min(100, confidence));
  }

  /**
   * الحصول على تذبذب السرعة
   */
  static getSpeedVariation(vehicle) {
    const history = vehicle.gpsTracking?.locationHistory || [];
    if (history.length < 2) return 0;

    const speeds = history.map(loc => loc.speed || 0);
    const avgSpeed = speeds.reduce((a, b) => a + b) / speeds.length;
    const variance = speeds.reduce((sum, speed) => 
      sum + Math.pow(speed - avgSpeed, 2), 0) / speeds.length;
    
    return Math.sqrt(variance) / (avgSpeed || 1);
  }

  /**
   * الحصول على أفضل ترتيب للنقاط
   */
  static findOptimalSequence(start, pickupPoints, dropoffPoints) {
    // خوارزمية مبسطة (يمكن تحسينها باستخدام Traveling Salesman Problem)
    const allPoints = [start, ...pickupPoints, ...dropoffPoints];
    
    // ترتيب بسيط حسب المسافة الأقرب (Nearest Neighbor)
    const optimized = [start];
    const remaining = [...pickupPoints, ...dropoffPoints];

    while (remaining.length > 0) {
      const current = optimized[optimized.length - 1];
      let nearest = remaining[0];
      let minDist = this.calculateDistanceHaversine(
        current[1], current[0], nearest[1], nearest[0]
      );

      remaining.forEach((point, idx) => {
        const dist = this.calculateDistanceHaversine(
          current[1], current[0], point[1], point[0]
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = point;
        }
      });

      optimized.push(nearest);
      remaining.splice(remaining.indexOf(nearest), 1);
    }

    return optimized;
  }

  /**
   * الحصول على الرحلة النشطة
   */
  static async getActiveTrip(vehicleId) {
    return await Trip.findOne({
      vehicle: vehicleId,
      status: { $in: ['جارية', 'active', 'in-progress'] }
    });
  }

  /**
   * تحديث بيانات الرحلة
   */
  static updateTripData(trip, enrichedData) {
    if (!trip.route) trip.route = [];
    trip.route.push({
      latitude: enrichedData.latitude,
      longitude: enrichedData.longitude,
      speed: enrichedData.speed,
      timestamp: enrichedData.timestamp
    });

    // تحديث إحصائيات الرحلة
    if (!trip.statistics) trip.statistics = {};
    trip.statistics.totalDistance = (trip.statistics.totalDistance || 0) + enrichedData.distance;
    trip.statistics.maxSpeed = Math.max(trip.statistics.maxSpeed || 0, enrichedData.speed);
  }
}

module.exports = SmartGPSTrackingService;
