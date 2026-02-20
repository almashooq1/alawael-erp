/**
 * خدمة تحسين المسارات الذكية
 * Smart Route Optimization Service
 */

class RouteOptimizationService {
  /**
   * خوارزمية تحسين المسار بناءً على عدة عوامل
   * @param {Object} route - المسار الحالي
   * @param {Object} options - خيارات التحسين
   * @returns {Object} - المسار المحسّن مع التوصيات
   */
  static async optimizeRoute(route, options = {}) {
    try {
      if (!route) {
        return {
          score: 0,
          suggestions: [],
          estimatedImprovements: {},
        };
      }

      const {
        considerTraffic = true,
        considerPassengerDemand = true,
        considerFuelEfficiency = true,
        considerTimeEfficiency = true,
      } = options;

      const optimization = {
        score: 0,
        suggestions: [],
        estimatedImprovements: {},
      };

      // 1. تحليل حركة المرور
      if (considerTraffic) {
        const trafficAnalysis = await this.analyzeTraffic(route);
        if (trafficAnalysis) {
          optimization.suggestions.push(...(trafficAnalysis.suggestions || []));
          optimization.score += trafficAnalysis.score || 0;
        }
      }

      // 2. تحليل طلب الركاب
      if (considerPassengerDemand) {
        const demandAnalysis = this.analyzePassengerDemand(route);
        if (demandAnalysis) {
          optimization.suggestions.push(...(demandAnalysis.suggestions || []));
          optimization.score += demandAnalysis.score || 0;
        }
      }

      // 3. تحسين استهلاك الوقود
      if (considerFuelEfficiency) {
        const fuelAnalysis = this.analyzeFuelEfficiency(route);
        if (fuelAnalysis) {
          optimization.suggestions.push(...(fuelAnalysis.suggestions || []));
          optimization.score += fuelAnalysis.score || 0;
        }
      }

      // 4. تحسين الوقت
      if (considerTimeEfficiency) {
        const timeAnalysis = this.analyzeTimeEfficiency(route);
        if (timeAnalysis) {
          optimization.suggestions.push(...(timeAnalysis.suggestions || []));
          optimization.score += timeAnalysis.score || 0;
        }
      }

      // حساب النتيجة النهائية
      const divisor = (considerTraffic ? 1 : 0) + (considerPassengerDemand ? 1 : 0) + (considerFuelEfficiency ? 1 : 0) + (considerTimeEfficiency ? 1 : 0);
      optimization.score = divisor > 0 ? Math.min(100, optimization.score / divisor) : 0;

      return optimization;
    } catch (error) {
      console.error('Route optimization error:', error.message);
      return {
        score: 0,
        suggestions: [
          {
            type: 'optimization_failed',
            description: 'فشل تحسين المسار: ' + error.message,
            estimatedImprovement: 0,
          },
        ],
        estimatedImprovements: {},
      };
    }
  }

  /**
   * خوارزمية إيجاد أقصر مسار (Dijkstra's Algorithm)
   * @param {Array} stops - نقاط التوقف
   * @param {Object} startPoint - نقطة البداية
   * @returns {Object} - المسار الأمثل
   */
  static calculateShortestPath(stops, startPoint) {
    const graph = this.buildGraph(stops);
    const distances = {};
    const visited = new Set();
    const previous = {};
    const path = [];

    // تهيئة المسافات
    Object.keys(graph).forEach(node => {
      distances[node] = Infinity;
      previous[node] = null;
    });
    distances[startPoint.id] = 0;

    while (visited.size < Object.keys(graph).length) {
      // إيجاد العقدة الأقرب غير المزارة
      let closestNode = null;
      let shortestDistance = Infinity;

      for (const node in distances) {
        if (!visited.has(node) && distances[node] < shortestDistance) {
          closestNode = node;
          shortestDistance = distances[node];
        }
      }

      if (!closestNode) break;

      visited.add(closestNode);

      // تحديث المسافات للعقد المجاورة
      for (const neighbor in graph[closestNode]) {
        const distance = distances[closestNode] + graph[closestNode][neighbor];

        if (distance < distances[neighbor]) {
          distances[neighbor] = distance;
          previous[neighbor] = closestNode;
        }
      }
    }

    // بناء المسار
    let current = stops[stops.length - 1].id;
    while (current) {
      path.unshift(current);
      current = previous[current];
    }

    return {
      path,
      totalDistance: distances[stops[stops.length - 1].id],
      optimized: true,
    };
  }

  /**
   * خوارزمية تحسين ترتيب المحطات
   * @param {Array} stops - المحطات
   * @param {Object} vehicle - المركبة
   * @returns {Array} - المحطات المحسنة
   */
  static optimizeStopSequence(stops, vehicle) {
    // خوارزمية الجار الأقرب (Nearest Neighbor)
    const optimizedStops = [];
    const remaining = [...stops];
    let currentLocation = vehicle.gpsDevice?.currentLocation?.coordinates || [0, 0];

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      // إيجاد أقرب محطة
      remaining.forEach((stop, index) => {
        const distance = this.calculateDistance(currentLocation, stop.location.coordinates);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      const nearest = remaining.splice(nearestIndex, 1)[0];
      optimizedStops.push(nearest);
      currentLocation = nearest.location.coordinates;
    }

    return optimizedStops;
  }

  /**
   * تحليل حركة المرور (محاكاة - يمكن دمج مع API خارجي)
   */
  static async analyzeTraffic(route) {
    const analysis = {
      score: 70,
      suggestions: [],
    };

    // محاكاة بيانات حركة المرور
    const trafficData = this.simulateTrafficData(route);

    if (trafficData.congestionLevel > 0.7) {
      analysis.suggestions.push({
        type: 'traffic_alternative',
        description: 'اقتراح مسار بديل لتجنب الازدحام المروري',
        estimatedImprovement: 15,
        priority: 'high',
      });
      analysis.score -= 20;
    }

    if (trafficData.peakHours) {
      analysis.suggestions.push({
        type: 'time_adjustment',
        description: 'تعديل مواعيد الرحلات لتجنب ساعات الذروة',
        estimatedImprovement: 10,
        priority: 'medium',
      });
      analysis.score -= 10;
    }

    return analysis;
  }

  /**
   * تحليل طلب الركاب
   */
  static analyzePassengerDemand(route) {
    const analysis = {
      score: 80,
      suggestions: [],
    };

    const occupancyRate = (route.passengers?.length || 0) / (route.capacity?.total || 1);

    if (occupancyRate < 0.5) {
      analysis.suggestions.push({
        type: 'reduce_frequency',
        description: 'تقليل عدد الرحلات أو دمج مسارات قليلة الاستخدام',
        estimatedImprovement: 20,
        priority: 'low',
      });
      analysis.score -= 15;
    }

    if (occupancyRate > 0.9) {
      analysis.suggestions.push({
        type: 'increase_capacity',
        description: 'زيادة عدد المركبات أو استخدام مركبات أكبر',
        estimatedImprovement: 25,
        priority: 'high',
      });
      analysis.score -= 10;
    }

    // تحليل توزيع الركاب على المحطات
    const stopAnalysis = this.analyzeStopUsage(route.stops);
    if (stopAnalysis.unusedStops > 0) {
      analysis.suggestions.push({
        type: 'remove_stops',
        description: `إزالة ${stopAnalysis.unusedStops} محطة غير مستخدمة`,
        estimatedImprovement: 10,
        priority: 'medium',
      });
    }

    return analysis;
  }

  /**
   * تحليل كفاءة استهلاك الوقود
   */
  static analyzeFuelEfficiency(route) {
    const analysis = {
      score: 75,
      suggestions: [],
    };

    const avgDistance = route.totalDistance || 0;
    const stopCount = route.stops?.length || 0;

    // تحليل عدد نقاط التوقف
    if (stopCount > 15) {
      analysis.suggestions.push({
        type: 'consolidate_stops',
        description: 'دمج المحطات القريبة لتقليل عدد التوقفات',
        estimatedImprovement: 12,
        priority: 'medium',
      });
      analysis.score -= 10;
    }

    // تحليل المسافة الكلية
    if (avgDistance > 50) {
      analysis.suggestions.push({
        type: 'optimize_distance',
        description: 'تحسين المسار لتقليل المسافة الكلية',
        estimatedImprovement: 15,
        priority: 'high',
      });
      analysis.score -= 15;
    }

    return analysis;
  }

  /**
   * تحليل كفاءة الوقت
   */
  static analyzeTimeEfficiency(route) {
    const analysis = {
      score: 85,
      suggestions: [],
    };

    const estimatedDuration = route.estimatedDuration || 0;
    const stopCount = route.stops?.length || 0;
    const avgStopTime = estimatedDuration / (stopCount || 1);

    if (avgStopTime > 5) {
      analysis.suggestions.push({
        type: 'reduce_wait_time',
        description: 'تقليل وقت الانتظار في المحطات',
        estimatedImprovement: 10,
        priority: 'medium',
      });
      analysis.score -= 10;
    }

    return analysis;
  }

  /**
   * حساب المسافة بين نقطتين (Haversine Formula)
   */
  static calculateDistance(point1, point2) {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;

    const R = 6371; // نصف قطر الأرض بالكيلومتر
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

  /**
   * تحويل الدرجات إلى راديان
   */
  static toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * بناء رسم بياني من المحطات
   */
  static buildGraph(stops) {
    const graph = {};

    stops.forEach((stop, i) => {
      graph[stop.id] = {};

      stops.forEach((otherStop, j) => {
        if (i !== j) {
          const distance = this.calculateDistance(
            stop.location.coordinates,
            otherStop.location.coordinates
          );
          graph[stop.id][otherStop.id] = distance;
        }
      });
    });

    return graph;
  }

  /**
   * محاكاة بيانات حركة المرور
   */
  static simulateTrafficData(route) {
    const hour = new Date().getHours();
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18);

    return {
      congestionLevel: isPeakHour ? 0.8 : 0.3,
      peakHours: isPeakHour,
      averageSpeed: isPeakHour ? 30 : 60,
    };
  }

  /**
   * تحليل استخدام المحطات
   */
  static analyzeStopUsage(stops) {
    let unusedStops = 0;
    let underutilizedStops = 0;

    stops.forEach(stop => {
      const passengerCount = stop.passengers?.length || 0;

      if (passengerCount === 0) {
        unusedStops++;
      } else if (passengerCount < 2) {
        underutilizedStops++;
      }
    });

    return {
      unusedStops,
      underutilizedStops,
      totalStops: stops.length,
    };
  }

  /**
   * اقتراح مسارات بديلة
   */
  static async suggestAlternativeRoutes(route, passengerNeeds) {
    const alternatives = [];

    // المسار السريع
    const fastRoute = {
      name: 'المسار السريع',
      type: 'fast',
      estimatedTime: Math.round(route.estimatedDuration * 0.8),
      stops: this.reduceStops(route.stops, 0.5),
      score: 85,
    };
    alternatives.push(fastRoute);

    // المسار الشامل
    const comprehensiveRoute = {
      name: 'المسار الشامل',
      type: 'comprehensive',
      estimatedTime: Math.round(route.estimatedDuration * 1.2),
      stops: this.expandStops(route.stops, passengerNeeds),
      score: 90,
    };
    alternatives.push(comprehensiveRoute);

    // المسار الاقتصادي
    const economicRoute = {
      name: 'المسار الاقتصادي',
      type: 'economic',
      estimatedTime: route.estimatedDuration,
      stops: this.optimizeStopsForFuel(route.stops),
      score: 80,
    };
    alternatives.push(economicRoute);

    return alternatives;
  }

  static reduceStops(stops, percentage) {
    const keepCount = Math.ceil(stops.length * percentage);
    return stops
      .sort((a, b) => (b.passengers?.length || 0) - (a.passengers?.length || 0))
      .slice(0, keepCount);
  }

  static expandStops(stops, passengerNeeds) {
    // إضافة محطات جديدة بناءً على احتياجات الركاب
    return stops; // سيتم التوسع لاحقاً
  }

  static optimizeStopsForFuel(stops) {
    // تحسين المحطات لتقليل استهلاك الوقود
    return this.optimizeStopSequence(stops, {});
  }
}

module.exports = RouteOptimizationService;
