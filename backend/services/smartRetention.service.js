const TherapySession = require('../models/TherapySession');
const Feedback = require('../models/Feedback');
const TherapeuticPlan = require('../models/TherapeuticPlan');
const SmartNotificationService = require('./smartNotificationService');

class SmartRetentionService {
  /**
   * Calculate Churn Risk Score (0-100)
   * Higher score = Higher risk of leaving the center
   */
  static async calculateRiskScore(beneficiaryId) {
    let riskScore = 0;
    const reasons = [];

    // 1. Attendance Analysis (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await TherapySession.find({
      beneficiary: beneficiaryId,
      date: { $gte: thirtyDaysAgo },
      status: { $in: ['COMPLETED', 'CANCELLED_BY_PATIENT', 'NO_SHOW'] },
    });

    if (sessions.length === 0) {
      // Check last seen ever
      const lastSeen = await TherapySession.findOne({
        beneficiary: beneficiaryId,
        status: 'COMPLETED',
      }).sort({ date: -1 });

      if (!lastSeen) return { score: 0, level: 'NEW', reasons: [] }; // Brand new

      const daysSince = Math.ceil((new Date() - lastSeen.date) / (1000 * 60 * 60 * 24));
      if (daysSince > 14) {
        riskScore += 50;
        reasons.push(`Absent for ${daysSince} days`);
      }
    } else {
      // Calculate Cancellation Rate
      const badSessions = sessions.filter(s => ['CANCELLED_BY_PATIENT', 'NO_SHOW'].includes(s.status)).length;
      const rate = badSessions / sessions.length;

      if (rate > 0.5) {
        riskScore += 30;
        reasons.push(`High Cancellation Rate (${Math.round(rate * 100)}%)`);
      }
    }

    // 2. Satisfaction Analysis (NPS)
    const lastFeedback = await Feedback.findOne({ beneficiary: beneficiaryId }).sort({ createdAt: -1 });
    if (lastFeedback) {
      if (lastFeedback.npsScore <= 6) {
        riskScore += 25;
        reasons.push('Low Satisfaction (Detractor)');
      }
    }

    // 3. Clinical Stagnation
    // If goals show no progress updates in 45 days
    const activePlan = await TherapeuticPlan.findOne({ beneficiary: beneficiaryId, status: 'ACTIVE' });
    if (activePlan) {
      // Check if updatedAt is old
      const planIdleDays = Math.ceil((new Date() - activePlan.updatedAt) / (1000 * 60 * 60 * 24));
      if (planIdleDays > 45) {
        riskScore += 15;
        reasons.push('Stalled Clinical Progress');
      }
    }

    // Cap at 100
    riskScore = Math.min(riskScore, 100);

    let level = 'LOW';
    if (riskScore >= 75) level = 'CRITICAL';
    else if (riskScore >= 50) level = 'HIGH';
    else if (riskScore >= 25) level = 'MODERATE';

    return { score: riskScore, level, reasons };
  }

  /**
   * Run Batch Analysis for All Active Patients
   */
  static async identifyAtRiskPatients(adminUserId) {
    // Find beneficiaries with Active Plans
    const plans = await TherapeuticPlan.find({ status: 'ACTIVE' }).populate('beneficiary', 'firstName lastName fileNumber phone');

    const atRiskList = [];

    for (const plan of plans) {
      if (!plan.beneficiary) continue;

      const analysis = await this.calculateRiskScore(plan.beneficiary._id);

      if (analysis.score >= 50) {
        // High Risk Cutoff
        atRiskList.push({
          patient: plan.beneficiary,
          risk: analysis,
        });
      }
    }

    // Notify if Critical counts found
    const criticalCount = atRiskList.filter(x => x.risk.level === 'CRITICAL').length;
    if (criticalCount > 0) {
      await SmartNotificationService.send(
        adminUserId,
        'Retention Alert',
        `Identified ${criticalCount} patients at CRITICAL risk of leaving. Action required.`,
        'CRITICAL',
        '/crm/retention',
      );
    }

    return { count: atRiskList.length, data: atRiskList.sort((a, b) => b.risk.score - a.risk.score) };
  }
}

module.exports = SmartRetentionService;
module.exports.instance = new SmartRetentionService();
