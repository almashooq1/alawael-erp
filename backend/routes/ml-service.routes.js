/**
 * AI/ML Service - Predictive Analytics
 * Predictions, recommendations, anomaly detection
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');

// ML Model Schema
const MLPredictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  predictionType: String, // 'recovery-progress', 'program-completion', 'risk-assessment'
  prediction: {
    probability: Number,
    confidence: Number,
    timeframe: String,
    recommendation: String,
  },
  factors: [String],
  createdAt: { type: Date, default: Date.now, index: true },
  accuracy: Number, // Updated when actual outcome known
});

const MLPrediction = mongoose.model('MLPrediction', MLPredictionSchema);

// Recommendation Schema
const RecommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  recommendationType: String, // 'program', 'exercise', 'therapist', 'adjustment'
  recommendation: String,
  reasoning: [String],
  score: Number,
  userResponse: { type: String, enum: ['accepted', 'rejected', 'pending'] },
  createdAt: { type: Date, default: Date.now },
});

const Recommendation = mongoose.model('Recommendation', RecommendationSchema);

// Anomaly Detection Schema
const AnomalySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  anomalyType: String, // 'unusual-activity', 'regression', 'concerning-pattern'
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  description: String,
  suggestedAction: String,
  reviewed: { type: Boolean, default: false },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

const Anomaly = mongoose.model('Anomaly', AnomalySchema);

class MLService {
  /**
   * Predict recovery progress
   */
  async predictRecoveryProgress(userId) {
    try {
      const User = mongoose.model('User');
      const Program = mongoose.model('Program');
      const Goal = mongoose.model('Goal');
      const Session = mongoose.model('Session');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Gather training data
      const programs = await Program.find({ userId });
      const completedGoals = await Goal.countDocuments({
        userId,
        status: 'completed',
      });
      const sessions = await Session.find({ userId });

      // Simple ML logic
      const completionRate =
        programs.length > 0
          ? (programs.filter(p => p.status === 'completed').length / programs.length) * 100
          : 0;

      const sessionConsistency = this.calculateSessionConsistency(sessions);
      const adherenceRate = this.calculateAdherence(sessions);

      // Predict next milestone
      const daysInSystem = Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24));
      const progressVelocity = completionRate / Math.max(1, daysInSystem);

      const prediction = {
        probability: Math.min(100, completionRate * (sessionConsistency / 100)),
        confidence: Math.min(95, (sessions.length / 10) * 100),
        timeframe: this.estimateTimeframe(progressVelocity, completedGoals),
        recommendation: this.generateRecommendation(sessionConsistency, adherenceRate),
      };

      // Save prediction
      const mlPrediction = new MLPrediction({
        userId,
        predictionType: 'recovery-progress',
        prediction,
        factors: [
          `Completion Rate: ${completionRate.toFixed(2)}%`,
          `Session Consistency: ${sessionConsistency.toFixed(2)}%`,
          `Adherence Rate: ${adherenceRate.toFixed(2)}%`,
        ],
      });

      await mlPrediction.save();

      return prediction;
    } catch (error) {
      console.error('Recovery prediction error:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations
   */
  async generateRecommendations(userId) {
    try {
      const Program = mongoose.model('Program');
      const Goal = mongoose.model('Goal');
      const Session = mongoose.model('Session');

      const programs = await Program.find({ userId }).populate('therapistId');
      const goals = await Goal.find({ userId });
      const sessions = await Session.find({ userId }).sort({ date: -1 }).limit(10);

      const recommendations = [];

      // Recommendation 1: Program adjustment
      const poorPerformingPrograms = programs.filter(
        p => p.completionRate < 50 && p.status === 'active'
      );

      if (poorPerformingPrograms.length > 0) {
        recommendations.push({
          recommendationType: 'adjustment',
          recommendation: `قد تحتاج إلى تعديل برنامج "${poorPerformingPrograms[0].name}" لتحسين معدل الإكمال`,
          reasoning: ['معدل إكمال منخفض', 'عدم توافق مع الأهداف'],
          score: 0.8,
        });
      }

      // Recommendation 2: New exercise
      if (sessions.length >= 5) {
        const completedExercises = new Set();
        sessions.forEach(s => {
          s.exercises?.forEach(e => completedExercises.add(e.exerciseId));
        });

        recommendations.push({
          recommendationType: 'exercise',
          recommendation: 'جرب تمرين جديد يتناسب مع مستوى تقدمك الحالي',
          reasoning: ['لديك تاريخ قوي من الالتزام', 'جاهز للتقدم'],
          score: 0.7,
        });
      }

      // Save recommendations
      for (const rec of recommendations) {
        const recommendation = new Recommendation({
          userId,
          ...rec,
        });
        await recommendation.save();
      }

      return recommendations;
    } catch (error) {
      console.error('Recommendations generation error:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies
   */
  async detectAnomalies(userId) {
    try {
      const Session = mongoose.model('Session');
      const Goal = mongoose.model('Goal');
      const User = mongoose.model('User');

      const recentSessions = await Session.find({ userId }).sort({ date: -1 }).limit(20);

      const user = await User.findById(userId);
      const anomalies = [];

      // Anomaly 1: Sudden drop in activity
      if (recentSessions.length >= 10) {
        const recentActivity = recentSessions.slice(0, 5).length;
        const previousActivity = recentSessions.slice(5, 10).length;

        if (recentActivity < previousActivity * 0.5) {
          anomalies.push({
            anomalyType: 'unusual-activity',
            severity: 'high',
            description: 'انخفاض حاد في نشاطك مؤخراً',
            suggestedAction: 'يرجى التحقق من الأسباب والتواصل مع معالجك إذا لزم الأمر',
          });
        }
      }

      // Anomaly 2: Regression in goals
      const incompletedGoals = await Goal.countDocuments({
        userId,
        status: 'incomplete',
      });

      if (incompletedGoals > 5) {
        anomalies.push({
          anomalyType: 'regression',
          severity: 'medium',
          description: 'عدد كبير من الأهداف غير المكتملة',
          suggestedAction: 'قد تحتاج إلى إعادة تقييم الأهداف أو طلب مساعدة',
        });
      }

      // Save anomalies
      for (const anomaly of anomalies) {
        const anomalyRecord = new Anomaly({
          userId,
          ...anomaly,
        });
        await anomalyRecord.save();
      }

      return anomalies;
    } catch (error) {
      console.error('Anomaly detection error:', error);
      throw error;
    }
  }

  /**
   * Calculate session consistency
   */
  calculateSessionConsistency(sessions) {
    if (sessions.length < 2) return 0;

    const dates = sessions.map(s => new Date(s.date).getTime()).sort((a, b) => a - b);
    const gaps = [];

    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24)); // Days between sessions
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);

    // Lower std deviation = more consistent
    return Math.max(0, 100 - stdDev * 10);
  }

  /**
   * Calculate adherence rate
   */
  calculateAdherence(sessions) {
    if (sessions.length === 0) return 0;

    const completedSessions = sessions.filter(s => s.completed).length;
    return (completedSessions / sessions.length) * 100;
  }

  /**
   * Estimate timeframe for milestone
   */
  estimateTimeframe(velocity, milestonesCompleted) {
    if (velocity <= 0) return 'Unknown';

    const milestonesPerMonth = velocity * 30;
    const monthsToNextMilestone = 1 / Math.max(0.1, milestonesPerMonth);

    if (monthsToNextMilestone < 1) return 'في غضون أسابيع';
    if (monthsToNextMilestone < 3) return 'في غضون 1-3 أشهر';
    if (monthsToNextMilestone < 6) return 'في غضون 3-6 أشهر';
    return 'بعد 6 أشهر';
  }

  /**
   * Generate recommendation text
   */
  generateRecommendation(consistency, adherence) {
    if (consistency > 80 && adherence > 80) {
      return 'أنت تسير بشكل ممتاز! استمر بنفس الوتيرة';
    }
    if (consistency > 60 && adherence > 60) {
      return 'تقدم جيد، حاول تحسين الاتساق قليلاً';
    }
    return 'قد تحتاج إلى مزيد من التركيز والالتزام';
  }

  /**
   * Get user insights
   */
  async getUserInsights(userId) {
    try {
      const predictions = await MLPrediction.find({ userId }).sort({ createdAt: -1 }).limit(5);

      const recommendations = await Recommendation.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5);

      const anomalies = await Anomaly.find({ userId, reviewed: false }).sort({ createdAt: -1 });

      return {
        predictions,
        recommendations,
        anomalies,
      };
    } catch (error) {
      console.error('Get insights error:', error);
      throw error;
    }
  }
}

// Routes
const mlService = new MLService();

/**
 * Get predictions
 * GET /api/ml/predictions
 */
router.get('/predictions', authenticate, async (req, res) => {
  try {
    const prediction = await mlService.predictRecoveryProgress(req.user.id);
    res.json({ success: true, prediction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get recommendations
 * GET /api/ml/recommendations
 */
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const recommendations = await mlService.generateRecommendations(req.user.id);
    res.json({ success: true, recommendations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get anomalies
 * GET /api/ml/anomalies
 */
router.get('/anomalies', authenticate, async (req, res) => {
  try {
    const anomalies = await mlService.detectAnomalies(req.user.id);
    res.json({ success: true, anomalies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user insights
 * GET /api/ml/insights
 */
router.get('/insights', authenticate, async (req, res) => {
  try {
    const insights = await mlService.getUserInsights(req.user.id);
    res.json({ success: true, insights });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark recommendation as accepted
 * POST /api/ml/recommendations/:id/accept
 */
router.post('/recommendations/:id/accept', authenticate, async (req, res) => {
  try {
    const recommendation = await Recommendation.findByIdAndUpdate(
      req.params.id,
      { userResponse: 'accepted' },
      { new: true }
    );

    res.json({ success: true, recommendation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark anomaly as reviewed
 * POST /api/ml/anomalies/:id/review
 */
router.post('/anomalies/:id/review', authenticate, async (req, res) => {
  try {
    const anomaly = await Anomaly.findByIdAndUpdate(
      req.params.id,
      {
        reviewed: true,
        reviewedBy: req.user.id,
      },
      { new: true }
    );

    res.json({ success: true, anomaly });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.MLService = MLService;

