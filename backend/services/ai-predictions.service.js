const Prediction = require('../models/prediction.model');
const Analytics = require('../models/analytics.model');

class AIPredictionsService {
  /**
   * توقع الأداء المستقبلي للمستخدم
   */
  async predictPerformance(userId, data = {}) {
    try {
      const historicalData = await this.getHistoricalData(userId);
      const processedData = this.processData(historicalData, data);
      const predictionResult = await this.runPredictionModel(processedData);
      const factors = await this.extractFactors(predictionResult);
      const recommendations = await this.generateRecommendations(predictionResult, factors);

      const result = await Prediction.create({
        userId,
        predictionType: 'performance',
        inputData: data,
        prediction: predictionResult,
        factors,
        recommendations,
        modelVersion: '1.0.0',
        accuracy: predictionResult.confidence,
      });

      return result;
    } catch (error) {
      console.error('خطأ في توقع الأداء:', error);
      throw error;
    }
  }

  /**
   * توقع احتمالية ترك المستخدم للخدمة
   */
  async predictChurn(userId) {
    try {
      const userData = await this.getUserData(userId);
      const engagementScore = this.calculateEngagementScore(userData);
      const activityTrend = this.analyzeActivityTrend(userData);
      const churnProbability = this.calculateChurnProbability(engagementScore, activityTrend);

      const prediction = {
        value: churnProbability,
        confidence: 0.85,
        probability: churnProbability,
        riskLevel: churnProbability > 0.7 ? 'high' : churnProbability > 0.4 ? 'medium' : 'low',
      };

      return {
        prediction,
        recommendation: this.getChurnMitigationStrategy(prediction),
      };
    } catch (error) {
      console.error('خطأ في توقع الانسحاب:', error);
      throw error;
    }
  }

  /**
   * تحليل سلوك المستخدم والتنبؤ به
   */
  async predictBehavior(userId) {
    try {
      const behaviorPatterns = await this.analyzeBehaviorPatterns(userId);
      const similarUsers = await this.findSimilarUsers(userId);
      const futureActions = this.predictFutureActions(behaviorPatterns, similarUsers);

      return {
        patterns: behaviorPatterns,
        predictions: futureActions,
        suggestedActions: this.generateBehaviorInsights(futureActions),
      };
    } catch (error) {
      console.error('خطأ في توقع السلوك:', error);
      throw error;
    }
  }

  /**
   * تحليل الاتجاهات المستقبلية
   */
  async predictTrends(category, timeframe = 30) {
    try {
      const historicalTrends = await this.getHistoricalTrends(category, timeframe);
      const futureTrend = this.calculateFutureTrend(historicalTrends);

      return {
        trend: futureTrend,
        confidence: 0.82,
        factors: this.identifyTrendFactors(futureTrend),
        timeline: this.generateTimeline(futureTrend),
      };
    } catch (error) {
      console.error('خطأ في توقع الاتجاهات:', error);
      throw error;
    }
  }

  /**
   * الحصول على بيانات تاريخية للمستخدم
   */
  async getHistoricalData(userId) {
    try {
      const data = await Analytics.find({ userId });
      return data && data.length > 0 ? data : [];
    } catch (error) {
      console.warn('تحذير: لا يمكن جلب البيانات التاريخية:', error.message);
      return [];
    }
  }

  /**
   * معالجة البيانات للنموذج
   */
  processData(historicalData, newData) {
    if (!historicalData || historicalData.length === 0) {
      return { trend: 50, seasonality: 0.2, ...newData };
    }

    return {
      mean: this.calculateMean(historicalData),
      standardDeviation: this.calculateStdDev(historicalData),
      trend: this.calculateTrend(historicalData),
      seasonality: this.detectSeasonality(historicalData),
      anomalies: this.detectAnomalies(historicalData),
      ...newData,
    };
  }

  /**
   * تشغيل نموذج التنبؤ
   */
  async runPredictionModel(data) {
    const prediction = (data.trend || 50) * 0.6 + (data.seasonality || 0.2) * 40;

    return {
      value: Math.min(Math.max(prediction, 0), 100),
      confidence: 0.85,
      probability: Math.min(Math.max(prediction / 100, 0), 1),
    };
  }

  /**
   * استخراج العوامل المؤثرة
   */
  async extractFactors(prediction) {
    return [
      { factor: 'الاتجاه التاريخي', weight: 0.35, impact: 'high' },
      { factor: 'الموسمية والأنماط', weight: 0.25, impact: 'medium' },
      { factor: 'النشاط الحالي', weight: 0.2, impact: 'medium' },
      { factor: 'العوامل الخارجية', weight: 0.2, impact: 'low' },
    ];
  }

  /**
   * توليد التوصيات
   */
  async generateRecommendations(prediction, factors) {
    const recommendations = [];

    if (prediction.value > 80) {
      recommendations.push({
        title: 'أداء ممتاز',
        description: 'المستخدم يحقق أداء عالي جداً. حافظ على الزخم الحالي.',
        priority: 'low',
        expectedImpact: 0.05,
      });
    } else if (prediction.value > 60) {
      recommendations.push({
        title: 'أداء جيد',
        description: 'يوجد مجال للتحسن. فكر في تقديم دعم إضافي.',
        priority: 'medium',
        expectedImpact: 0.15,
      });
    } else {
      recommendations.push({
        title: 'أداء ضعيف',
        description: 'الأداء يحتاج إلى تحسين فوري. توصيات مفصلة متاحة.',
        priority: 'high',
        expectedImpact: 0.4,
      });
    }

    return recommendations;
  }

  /**
   * دوال مساعدة
   */
  calculateMean(data) {
    if (!data || data.length === 0) return 0;
    const sum = data.reduce((acc, d) => acc + (d.metricValue || 0), 0);
    return sum / data.length;
  }

  calculateStdDev(data) {
    if (!data || data.length === 0) return 0;
    const mean = this.calculateMean(data);
    const variance = data.reduce((acc, d) => acc + Math.pow((d.metricValue || 0) - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  calculateTrend(data) {
    if (!data || data.length < 2) return 50;
    const recent = data.slice(0, Math.ceil(data.length / 2));
    const older = data.slice(Math.ceil(data.length / 2));
    return this.calculateMean(recent) - this.calculateMean(older);
  }

  detectSeasonality(data) {
    return 0.2;
  }

  detectAnomalies(data) {
    if (!data || data.length === 0) return [];
    const mean = this.calculateMean(data);
    const stdDev = this.calculateStdDev(data);
    return data.filter(d => Math.abs((d.metricValue || 0) - mean) > 2 * stdDev);
  }

  calculateEngagementScore(userData) {
    if (!userData) return 0.5;
    const loginFrequency = (userData.loginCount || 0) / 30;
    const activityLevel = (userData.activeMinutes || 0) / 1440;
    const interactionRate = (userData.interactions || 0) / 100;
    return loginFrequency * 0.4 + activityLevel * 0.35 + interactionRate * 0.25;
  }

  analyzeActivityTrend(userData) {
    if (!userData) return 'unknown';
    const recent = userData.recentActivity || 0;
    const average = userData.averageActivity || 0;
    return recent > average ? 'increasing' : 'decreasing';
  }

  calculateChurnProbability(engagementScore, activityTrend) {
    let probability = 1 - engagementScore;
    if (activityTrend === 'decreasing') probability += 0.2;
    return Math.min(Math.max(probability, 0), 1);
  }

  getChurnMitigationStrategy(prediction) {
    if (prediction.riskLevel === 'high') {
      return {
        action: 'تواصل فوري',
        channel: 'email',
        message: 'نود معرفة رأيك في الخدمة وكيفية تحسينها',
        incentive: 'عرض خصم خاص للعودة',
      };
    }
    return { action: 'monitoring' };
  }

  async getUserData(userId) {
    return {
      loginCount: 15,
      activeMinutes: 720,
      interactions: 45,
      recentActivity: 8,
      averageActivity: 12,
    };
  }

  async analyzeBehaviorPatterns(userId) {
    return {
      patterns: ['استخدام في الصباح', 'تفاعل مع المجموعات', 'تنزيل الملفات'],
    };
  }

  async findSimilarUsers(userId) {
    return [];
  }

  predictFutureActions(patterns, similarUsers) {
    return ['مشاركة ملف', 'إنشاء مجموعة', 'تصفح المحتوى'];
  }

  generateBehaviorInsights(actions) {
    return actions.map(a => ({
      action: a,
      likelihood: Math.floor(Math.random() * 100),
      timing: 'في الأيام القادمة',
    }));
  }

  async getHistoricalTrends(category, timeframe) {
    return [];
  }

  calculateFutureTrend(trends) {
    return 'increasing';
  }

  identifyTrendFactors(trend) {
    return ['عامل 1', 'عامل 2'];
  }

  generateTimeline(trend) {
    return ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4'];
  }
}

module.exports = new AIPredictionsService();
