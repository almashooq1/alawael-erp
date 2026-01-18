const Feedback = require('../models/Feedback');
const Employee = require('../models/Employee');
const SmartNotificationService = require('./smartNotificationService');

class SmartFeedbackService {
  /**
   * Submit Feedback & Analyze
   */
  static async processFeedback(data) {
    // 1. Simple AI Sentiment Analysis (Mock)
    let sentiment = 'NEUTRAL';
    if (data.npsScore >= 9) sentiment = 'POSITIVE';
    if (data.npsScore <= 6) sentiment = 'NEGATIVE';

    // 2. Determine Follow-up
    const requiresFollowUp = sentiment === 'NEGATIVE';

    const feedback = new Feedback({
      ...data,
      sentiment,
      requiresFollowUp,
    });

    await feedback.save();

    // 3. Alerts
    if (requiresFollowUp) {
      // Alert Manager
      // Assuming we have an admin user ID hardcoded or passed via context.
      // In real app, find Admin users.
      // We'll update the Therapist's "Quality Score" here potentially
    }

    return feedback;
  }

  /**
   * Calculate NPS (Net Promoter Score)
   * NPS = % Promoters (9-10) - % Detractors (0-6)
   */
  static async getNPSAnalytics(month, year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const feedbacks = await Feedback.find({
      createdAt: { $gte: start, $lte: end },
    });

    const total = feedbacks.length;
    if (total === 0) return { nps: 0, promoters: 0, detractors: 0, passives: 0 };

    let promoters = 0;
    let detractors = 0;
    let passives = 0;

    feedbacks.forEach(f => {
      if (f.npsScore >= 9) promoters++;
      else if (f.npsScore <= 6) detractors++;
      else passives++;
    });

    const nps = Math.round(((promoters - detractors) / total) * 100);

    return {
      nps, // Score: -100 to +100
      total,
      breakdown: {
        promoters: Math.round((promoters / total) * 100),
        detractors: Math.round((detractors / total) * 100),
        passives: Math.round((passives / total) * 100),
      },
      recentComments: feedbacks.slice(0, 5).map(f => ({ comment: f.comment, score: f.npsScore })),
    };
  }

  /**
   * Get Detractor List (Unhappy Parents)
   */
  static async getDetractors() {
    return await Feedback.find({
      requiresFollowUp: true,
      followUpStatus: 'OPEN',
    })
      .populate('beneficiary', 'firstName lastName phone')
      .populate('therapist', 'firstName lastName')
      .sort({ createdAt: -1 });
  }
}

module.exports = SmartFeedbackService;
module.exports.instance = new SmartFeedbackService();
