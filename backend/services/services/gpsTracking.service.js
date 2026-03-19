/**
 * خدمة تتبع GPS وتحليل سلوك السائق
 * GPS Tracking & Driver Behavior Analysis Service
 */

class GPSTrackingService {
  /**
   * تحديث موقع المركبة في الوقت الفعلي
   * @param {Object} vehicle - المركبة
   * @param {Object} location - الموقع الجديد
   * @param {Number} speed - السرعة الحالية
   * @param {Number} heading - الاتجاه
   * @returns {Object} - نتيجة التحديث
   */
  static async updateVehicleLocation(vehicle, location, speed, heading) {
    const update = {
      timestamp: new Date(),
      location,
      speed,
      heading,
      alerts: []
    };

    // 1. فحص السرعة الزائدة
    const speedAlert = this.checkSpeeding(speed, location);
    if (speedAlert) {
      update.alerts.push(speedAlert);
    }

    // 2. فحص الانحراف عن المسار
    if (vehicle.currentRoute) {
      const deviationAlert = await this.checkRouteDeviation(vehicle, location);
      if (deviationAlert) {
        update.alerts.push(deviationAlert);
      }
    }

    // 3. تحديث موقع المركبة
    await vehicle.updateGPSLocation(location, speed, heading);

    return update;
  }

  /**
   * فحص السرعة الزائدة
   */
  static checkSpeeding(speed, location) {
    const speedLimits = {
      highway: 120,
      city: 80,
      residential: 60,
      school_zone: 40
    };

    // تحديد نوع المنطقة (محاكاة - يمكن دمج مع API)
    const zoneType = this.detectZoneType(location);
    const limit = speedLimits[zoneType] || 100;

    if (speed > limit) {
      return {
        type: 'speeding',
        severity: speed > limit + 20 ? 'critical' : 'medium',
        message: `تجاوز السرعة المسموحة (${speed} كم/س - الحد المسموح ${limit} كم/س)`,
        location,
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * فحص الانحراف عن المسار
   */
  static async checkRouteDeviation(vehicle, currentLocation) {
    const route = vehicle.currentRoute;
    if (!route || !route.path) return null;

    const maxDeviation = 500; // 500 متر
    const distanceFromRoute = this.calculateDistanceFromPath(
      currentLocation,
      route.path.coordinates
    );

    if (distanceFromRoute > maxDeviation) {
      return {
        type: 'route_deviation',
        severity: 'high',
        message: `انحراف عن المسار المحدد (${Math.round(distanceFromRoute)} متر)`,
        location: currentLocation,
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * تحليل سلوك السائق
   * @param {Object} trip - الرحلة
   * @param {Array} gpsData - بيانات GPS
   * @returns {Object} - تحليل السلوك
   */
  static analyzeDrivingBehavior(trip, gpsData) {
    const analysis = {
      speedingIncidents: 0,
      harshBraking: 0,
      harshAcceleration: 0,
      smoothDriving: 0,
      idleTime: 0,
      score: 100
    };

    // تحليل التسارع والفرملة
    for (let i = 1; i < gpsData.length; i++) {
      const prev = gpsData[i - 1];
      const curr = gpsData[i];
      
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // بالثواني
      const speedChange = curr.speed - prev.speed;
      const acceleration = speedChange / timeDiff;

      // فحص الفرملة المفاجئة
      if (acceleration < -8) {
        analysis.harshBraking++;
        analysis.score -= 5;
      }

      // فحص التسارع المفاجئ
      if (acceleration > 8) {
        analysis.harshAcceleration++;
        analysis.score -= 5;
      }

      // فحص السرعة الزائدة
      if (curr.speed > 100) {
        analysis.speedingIncidents++;
        analysis.score -= 10;
      }

      // فحص التوقف (السرعة = 0)
      if (curr.speed === 0 && timeDiff > 60) {
        analysis.idleTime += timeDiff;
      }

      // القيادة السلسة
      if (Math.abs(acceleration) < 2) {
        analysis.smoothDriving++;
      }
    }

    // حساب النسبة المئوية للقيادة السلسة
    analysis.smoothDrivingPercentage = 
      (analysis.smoothDriving / gpsData.length) * 100;

    // تعديل النتيجة بناءً على القيادة السلسة
    if (analysis.smoothDrivingPercentage > 80) {
      analysis.score += 10;
    }

    // التأكد من عدم تجاوز الحدود
    analysis.score = Math.max(0, Math.min(100, analysis.score));

    return analysis;
  }

  /**
   * تحديد المناطق الخطرة
   * @param {Array} trips - الرحلات
   * @returns {Array} - المناطق الخطرة
   */
  static identifyDangerousZones(trips) {
    const zones = {};

    trips.forEach(trip => {
      trip.incidents?.forEach(incident => {
        if (!incident.location) return;

        const key = this.getGridKey(incident.location.coordinates);
        
        if (!zones[key]) {
          zones[key] = {
            location: incident.location,
            incidentCount: 0,
            types: {}
          };
        }

        zones[key].incidentCount++;
        zones[key].types[incident.type] = 
          (zones[key].types[incident.type] || 0) + 1;
      });
    });

    // تحويل إلى مصفوفة وترتيب حسب عدد الحوادث
    return Object.values(zones)
      .filter(zone => zone.incidentCount >= 3)
      .sort((a, b) => b.incidentCount - a.incidentCount);
  }

  /**
   * التنبؤ بوقت الوصول (ETA)
   * @param {Object} vehicle - المركبة
   * @param {Object} destination - الوجهة
   * @returns {Object} - وقت الوصول المتوقع
   */
  static async calculateETA(vehicle, destination) {
    const currentLocation = vehicle.gpsDevice?.currentLocation?.coordinates;
    if (!currentLocation) {
      throw new Error('موقع المركبة الحالي غير متاح');
    }

    const distance = this.calculateDistance(currentLocation, destination.coordinates);
    const averageSpeed = vehicle.statistics?.averageSpeed || 50;
    const trafficFactor = await this.getTrafficFactor(currentLocation, destination.coordinates);

    const estimatedTime = (distance / (averageSpeed * trafficFactor)) * 60; // بالدقائق
    const eta = new Date(Date.now() + estimatedTime * 60000);

    return {
      distance: Math.round(distance * 10) / 10,
      estimatedTime: Math.round(estimatedTime),
      eta,
      confidence: trafficFactor > 0.8 ? 'high' : 'medium'
    };
  }

  /**
   * مراقبة السلامة في الوقت الفعلي
   */
  static async monitorSafety(vehicle, trip) {
    const alerts = [];
    const currentLocation = vehicle.gpsDevice?.currentLocation;

    if (!currentLocation) return alerts;

    // 1. فحص سرعة المركبة
    const speed = currentLocation.speed || 0;
    if (speed > 120) {
      alerts.push({
        type: 'critical_speed',
        severity: 'critical',
        message: 'سرعة خطيرة جداً',
        action: 'إيقاف المركبة فوراً'
      });
    }

    // 2. فحص حالة الوقود
    const fuelLevel = vehicle.fuelConsumption?.currentFuelLevel || 0;
    if (fuelLevel < 10) {
      alerts.push({
        type: 'low_fuel',
        severity: 'high',
        message: 'مستوى الوقود منخفض جداً',
        action: 'التوجه لأقرب محطة وقود'
      });
    }

    // 3. فحص موعد الصيانة
    const maintenanceStatus = vehicle.maintenanceStatus;
    if (maintenanceStatus === 'overdue') {
      alerts.push({
        type: 'maintenance_overdue',
        severity: 'high',
        message: 'موعد الصيانة متأخر',
        action: 'حجز موعد صيانة فوري'
      });
    }

    // 4. فحص وجود حوادث سابقة في المنطقة
    const dangerousZones = await this.checkDangerousZone(currentLocation);
    if (dangerousZones) {
      alerts.push({
        type: 'dangerous_zone',
        severity: 'medium',
        message: 'منطقة بها حوادث متكررة - الحذر مطلوب',
        action: 'قيادة بحذر شديد'
      });
    }

    return alerts;
  }

  /**
   * إنشاء تقرير سلوك السائق
   */
  static async generateDriverReport(driver, startDate, endDate) {
    // جلب جميع الرحلات في الفترة المحددة
    const Trip = require('../models/Trip');
    const trips = await Trip.find({
      driver: driver._id,
      actualStartTime: { $gte: startDate, $lte: endDate }
    });

    const report = {
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email
      },
      period: { startDate, endDate },
      totalTrips: trips.length,
      completedTrips: trips.filter(t => t.status === 'completed').length,
      totalDistance: 0,
      totalDuration: 0,
      averageScore: 0,
      incidents: {
        speeding: 0,
        harshBraking: 0,
        harshAcceleration: 0,
        accidents: 0,
        breakdowns: 0
      },
      fuelEfficiency: 0,
      safetyRating: 0
    };

    // تجميع البيانات
    trips.forEach(trip => {
      report.totalDistance += trip.statistics?.totalDistance || 0;
      report.totalDuration += trip.statistics?.totalDuration || 0;
      report.averageScore += trip.driverBehavior?.score || 0;
      
      report.incidents.speeding += trip.driverBehavior?.speedingIncidents || 0;
      report.incidents.harshBraking += trip.driverBehavior?.harshBrakingCount || 0;
      report.incidents.harshAcceleration += trip.driverBehavior?.harshAccelerationCount || 0;
      
      trip.incidents?.forEach(incident => {
        if (incident.type === 'accident') report.incidents.accidents++;
        if (incident.type === 'breakdown') report.incidents.breakdowns++;
      });

      report.fuelEfficiency += trip.fuelData?.efficiency || 0;
    });

    // حساب المتوسطات
    if (trips.length > 0) {
      report.averageScore = report.averageScore / trips.length;
      report.fuelEfficiency = report.fuelEfficiency / trips.length;
    }

    // حساب تقييم السلامة
    report.safetyRating = this.calculateSafetyRating(report);

    return report;
  }

  /**
   * حساب تقييم السلامة
   */
  static calculateSafetyRating(report) {
    let rating = 100;

    // خصم النقاط بناءً على الحوادث
    rating -= report.incidents.accidents * 20;
    rating -= report.incidents.speeding * 2;
    rating -= report.incidents.harshBraking * 1;
    rating -= report.incidents.harshAcceleration * 1;
    rating -= report.incidents.breakdowns * 5;

    // مكافأة على معدل الإنجاز
    const completionRate = report.completedTrips / (report.totalTrips || 1);
    if (completionRate > 0.95) rating += 10;

    return Math.max(0, Math.min(100, rating));
  }

  // ========== وظائف مساعدة ==========

  static calculateDistance(point1, point2) {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;

    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  static detectZoneType(location) {
    // محاكاة - يمكن دمج مع API خرائط
    return 'city';
  }

  static calculateDistanceFromPath(point, pathCoordinates) {
    let minDistance = Infinity;

    for (let i = 0; i < pathCoordinates.length - 1; i++) {
      const distance = this.distanceToSegment(
        point,
        pathCoordinates[i],
        pathCoordinates[i + 1]
      );
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance * 1000; // تحويل لمتر
  }

  static distanceToSegment(point, segmentStart, segmentEnd) {
    const [x, y] = point;
    const [x1, y1] = segmentStart;
    const [x2, y2] = segmentEnd;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;

    return Math.sqrt(dx * dx + dy * dy);
  }

  static getGridKey(coordinates) {
    const [lon, lat] = coordinates;
    // تقسيم الخريطة إلى شبكة 0.01 درجة (~1 كم)
    return `${Math.floor(lat * 100)},${Math.floor(lon * 100)}`;
  }

  static async getTrafficFactor(start, end) {
    // محاكاة - يمكن دمج مع API حركة المرور
    const hour = new Date().getHours();
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18);
    return isPeakHour ? 0.6 : 0.9;
  }

  static async checkDangerousZone(location) {
    // محاكاة - يمكن دمج مع قاعدة بيانات الحوادث
    return false;
  }
}

module.exports = GPSTrackingService;
