/**
 * ⭐ نظام تقييم وتقييم أداء السائقين
 * Driver Performance & Rating Service
 *
 * يوفر نظام تقييم شامل لأداء السائقين
 */

class DriverRatingService {
  constructor() {
    this.ratings = [];
    this.performanceMetrics = [];
    this.ratingCounter = 5000;
    this.initializeMockData();
  }

  initializeMockData() {
    this.ratings = [
      {
        id: 5000,
        driverId: 'DRV-001',
        passengerId: 'PASS-001',
        tripId: 'TRIP-001',
        overallRating: 4.5,
        categories: {
          safety: 5,
          comfort: 4,
          professionalism: 4,
          communication: 5,
          punctuality: 4,
        },
        comment: 'سائق ممتاز جداً',
        createdAt: new Date(Date.now() - 86400000),
      },
    ];

    this.performanceMetrics = [
      {
        driverId: 'DRV-001',
        period: 'monthly',
        month: new Date().toISOString().substring(0, 7),
        metrics: {
          totalTrips: 50,
          completedTrips: 49,
          cancelledTrips: 1,
          averageRating: 4.6,
          safetyScore: 95,
          punctualityScore: 92,
          customerSatisfaction: 94,
          totalDistance: 2500,
          totalEarnings: 12500,
        },
      },
    ];
  }

  // إضافة تقييم جديد
  addRating(ratingData) {
    // التحقق من البيانات المطلوبة
    if (!ratingData.driverId || !ratingData.overallRating) {
      return null;
    }

    const rating = {
      id: ++this.ratingCounter,
      ...ratingData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isVerified: false,
    };

    this.ratings.push(rating);

    // تحديث مقاييس الأداء
    this.updatePerformanceMetrics(ratingData.driverId);

    return rating;
  }

  // جلب تقييمات السائق
  getDriverRatings(driverId, limit = 10) {
    const driverRatings = this.ratings.filter(r => r.driverId === driverId);

    return {
      driverId,
      total: driverRatings.length,
      averageRating: this.calculateAverageRating(driverId),
      ratings: driverRatings
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit),
      ratingDistribution: this.getRatingDistribution(driverId),
    };
  }

  // حساب متوسط التقييم
  calculateAverageRating(driverId) {
    const driverRatings = this.ratings.filter(r => r.driverId === driverId);
    if (driverRatings.length === 0) return 0;

    const sum = driverRatings.reduce((total, r) => total + r.overallRating, 0);
    return Math.round((sum / driverRatings.length) * 10) / 10;
  }

  // توزيع التقييمات
  getRatingDistribution(driverId) {
    const driverRatings = this.ratings.filter(r => r.driverId === driverId);
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    driverRatings.forEach(r => {
      const rating = Math.round(r.overallRating);
      distribution[rating]++;
    });

    return distribution;
  }

  // درجة الأداء العام
  getPerformanceScore(driverId) {
    const metrics = this.getDriverMetrics(driverId);
    if (!metrics) return 0;

    const weights = {
      safetyScore: 0.3,
      punctualityScore: 0.2,
      customerSatisfaction: 0.3,
      tripCompletion: 0.2,
    };

    const tripCompletion = (metrics.completedTrips / metrics.totalTrips) * 100;

    const score =
      metrics.safetyScore * weights.safetyScore +
      metrics.punctualityScore * weights.punctualityScore +
      metrics.customerSatisfaction * weights.customerSatisfaction +
      tripCompletion * weights.tripCompletion;

    return Math.round(score);
  }

  // جلب مقاييس الأداء
  getDriverMetrics(driverId, period = 'monthly') {
    const metric = this.performanceMetrics.find(
      m => m.driverId === driverId && m.period === period
    );
    return metric ? metric.metrics : null;
  }

  // تحديث مقاييس الأداء
  updatePerformanceMetrics(driverId) {
    const currentMonth = new Date().toISOString().substring(0, 7);
    let metric = this.performanceMetrics.find(
      m => m.driverId === driverId && m.month === currentMonth
    );

    if (!metric) {
      metric = {
        driverId,
        period: 'monthly',
        month: currentMonth,
        metrics: {
          totalTrips: 0,
          completedTrips: 0,
          cancelledTrips: 0,
          averageRating: 0,
          safetyScore: 100,
          punctualityScore: 100,
          customerSatisfaction: 0,
          totalDistance: 0,
          totalEarnings: 0,
        },
      };
      this.performanceMetrics.push(metric);
    }

    // إعادة حساب المتوسطات
    const driverRatings = this.ratings.filter(r => r.driverId === driverId);
    metric.metrics.customerSatisfaction =
      driverRatings.length > 0
        ? Math.round(
            (driverRatings.reduce((sum, r) => sum + r.overallRating, 0) / driverRatings.length) * 20
          )
        : 0;

    return metric;
  }

  // مستويات الأداء
  getPerformanceLevel(driverId) {
    const score = this.getPerformanceScore(driverId);

    if (score >= 95) {
      return {
        level: 'PLATINUM',
        score,
        badge: '💎',
        benefits: ['مكافآت شهرية', 'أولويات في الحجوزات', 'تأمين محسّن'],
        color: '#FFD700',
      };
    } else if (score >= 85) {
      return {
        level: 'GOLD',
        score,
        badge: '🥇',
        benefits: ['مكافآت ربع سنوية', 'نسبة عمولة محسّنة'],
        color: '#C0C0C0',
      };
    } else if (score >= 75) {
      return {
        level: 'SILVER',
        score,
        badge: '🥈',
        benefits: ['مكافآت سنوية'],
        color: '#808080',
      };
    } else {
      return {
        level: 'BRONZE',
        score,
        badge: '🥉',
        benefits: ['تدريب إضافي مقترح'],
        color: '#A0522D',
      };
    }
  }

  // تحليل نقاط الضعف
  getPerformanceInsights(driverId) {
    const driverRatings = this.ratings.filter(r => r.driverId === driverId);

    if (driverRatings.length === 0) {
      return {
        insights: [],
        recommendations: ['لا توجد بيانات كافية للتحليل'],
      };
    }

    const insights = [];
    const avgByCategory = {
      safety: 0,
      comfort: 0,
      professionalism: 0,
      communication: 0,
      punctuality: 0,
    };

    // حساب المتوسطات
    driverRatings.forEach(r => {
      Object.keys(r.categories || {}).forEach(cat => {
        avgByCategory[cat] += r.categories[cat];
      });
    });

    Object.keys(avgByCategory).forEach(cat => {
      avgByCategory[cat] = Math.round((avgByCategory[cat] / driverRatings.length) * 10) / 10;
    });

    // تحديد نقاط الضعف
    const weakPoints = Object.entries(avgByCategory)
      .filter(([_, score]) => score < 4)
      .map(([category, score]) => ({
        category,
        score,
        recommendation: this.getRecommendation(category, score),
      }));

    return {
      categoryAverages: avgByCategory,
      weakPoints,
      overallTrend: this.calculateTrend(driverId),
      recommendations: weakPoints.map(wp => wp.recommendation),
    };
  }

  // الحصول على توصية
  getRecommendation(category, score) {
    const recommendations = {
      safety: 'تحتاج إلى تحسين معايير السلامة والالتزام بقوانين المرور',
      comfort: 'يرجى تحسين راحة الركاب من خلال صيانة أفضل للمركبة والقيادة الحذرة',
      professionalism: 'يرجى تحسين السلوك المهني والاحترافية في التعامل مع الركاب',
      communication: 'يرجى تحسين التواصل والوضوح مع الركاب',
      punctuality: 'يرجى الالتزام بالمواعيد والحضور في الوقت المحدد',
    };

    return recommendations[category] || 'يرجى تحسين الأداء في هذا المجال';
  }

  // حساب الاتجاه
  calculateTrend(driverId) {
    const driverRatings = this.ratings
      .filter(r => r.driverId === driverId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (driverRatings.length < 2) return 'insufficient-data';

    const recent = driverRatings.slice(-5);
    const older = driverRatings.slice(0, 5);

    const recentAvg = recent.reduce((sum, r) => sum + r.overallRating, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r.overallRating, 0) / older.length;

    if (recentAvg > olderAvg + 0.5) {
      return { trend: 'improving', change: Math.round((recentAvg - olderAvg) * 10) / 10 };
    } else if (recentAvg < olderAvg - 0.5) {
      return { trend: 'declining', change: Math.round((olderAvg - recentAvg) * 10) / 10 };
    } else {
      return { trend: 'stable', change: 0 };
    }
  }

  // تقرير الأداء
  getPerformanceReport(driverId) {
    const avgRating = this.calculateAverageRating(driverId);
    const performanceScore = this.getPerformanceScore(driverId);
    const level = this.getPerformanceLevel(driverId);
    const insights = this.getPerformanceInsights(driverId);
    const metrics = this.getDriverMetrics(driverId);

    return {
      driverId,
      overallRating: avgRating,
      performanceScore,
      performanceLevel: level,
      metrics,
      insights,
      generatedAt: new Date(),
    };
  }

  // مقارنة السائقين
  compareDrivers(driverIds) {
    return driverIds.map(id => ({
      driverId: id,
      averageRating: this.calculateAverageRating(id),
      performanceScore: this.getPerformanceScore(id),
      performanceLevel: this.getPerformanceLevel(id),
      ratingCount: this.ratings.filter(r => r.driverId === id).length,
    }));
  }

  // إشعارات الأداء
  getPerformanceAlerts(driverId) {
    const alerts = [];
    const score = this.getPerformanceScore(driverId);

    if (score < 60) {
      alerts.push({
        severity: 'critical',
        message: 'أداء السائق دون المستوى المطلوب - يحتاج إلى تدخل فوري',
        action: 'تدريب إجباري',
      });
    } else if (score < 75) {
      alerts.push({
        severity: 'warning',
        message: 'أداء السائق بحاجة إلى تحسين',
        action: 'تدريب مقترح',
      });
    }

    const insights = this.getPerformanceInsights(driverId);
    if (insights.weakPoints && insights.weakPoints.length > 0) {
      insights.weakPoints.forEach(wp => {
        alerts.push({
          severity: 'info',
          message: `نقطة ضعف: ${wp.category}`,
          action: wp.recommendation,
        });
      });
    }

    return alerts;
  }
}

module.exports = new DriverRatingService();
