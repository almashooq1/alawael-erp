const BeneficiaryFile = require('../models/BeneficiaryFile');
const TherapeuticPlan = require('../models/TherapeuticPlan');
const TherapySession = require('../models/TherapySession');
const StandardizedAssessment = require('../models/StandardizedAssessment');
const GoalProgressHistory = require('../models/GoalProgressHistory');
const { BeneficiaryWallet } = require('../models/Gamification');
const SmartHomeCareService = require('./smartHomeCare.service');

class SmartPatientService {
  /**
   * 360-Degree Unified Patient View
   * Aggregates data from 6 different modules into one EMR object
   */
  static async getUnifiedFile(beneficiaryId) {
    // 1. Demographics
    const profile = await BeneficiaryFile.findById(beneficiaryId)
      .populate('user', 'email') // Parent login info
      .lean();

    if (!profile) throw new Error('Patient not found');

    // 2. Clinical Status (Active Plan)
    const activePlan = await TherapeuticPlan.findOne({
      beneficiary: beneficiaryId,
      status: 'ACTIVE',
    }).populate('assignedTherapists', 'firstName lastName position');

    // 3. Documented History (Last 5 Assessments)
    const assessments = await StandardizedAssessment.find({ beneficiary: beneficiaryId }).sort({ date: -1 }).limit(5);

    // 4. Operational (Upcoming Sessions)
    const upcoming = await TherapySession.find({
      beneficiary: beneficiaryId,
      status: { $in: ['SCHEDULED', 'CONFIRMED'] },
      date: { $gte: new Date() },
    })
      .sort({ date: 1 })
      .limit(3)
      .populate('therapist', 'firstName lastName');

    // 5. Engagement (Home Care Adherence)
    const adherence = await SmartHomeCareService.getAdherenceReport(beneficiaryId);

    // 6. Gamification Status
    const wallet = await BeneficiaryWallet.findOne({ beneficiary: beneficiaryId }).lean();

    return {
      profile,
      clinical: {
        activePlanId: activePlan?._id,
        diagnosis: activePlan?.initialAssessment || profile.medicalRecord?.diagnosis,
        team: activePlan?.assignedTherapists || [],
        goals: activePlan?.goals || [],
      },
      history: {
        assessments,
        totalSessionsCompleted: await TherapySession.countDocuments({ beneficiary: beneficiaryId, status: 'COMPLETED' }),
      },
      schedule: upcoming,
      engagement: {
        homeAdherence: adherence,
        gamification: {
          level: wallet?.currentLevel || 1,
          points: wallet?.totalPoints || 0,
        },
      },
    };
  }

  /**
   * Update Goal Progress & Record History
   * Used when a therapist documents a session
   */
  static async updateGoalProgress(planId, goalId, newPercentage, note, userId, sessionId) {
    const plan = await TherapeuticPlan.findById(planId);
    if (!plan) throw new Error('Plan not found');

    // Find goal subdocument
    const goal = plan.goals.id(goalId);
    if (!goal) throw new Error('Goal not found in plan');

    // Update current state
    goal.progress = newPercentage;
    if (newPercentage >= 100) goal.status = 'ACHIEVED';
    else if (newPercentage > 0) goal.status = 'IN_PROGRESS';

    await plan.save();

    // Record History Point (for graphing)
    await GoalProgressHistory.create({
      planId,
      goalId,
      percentage: newPercentage,
      note,
      recordedBy: userId,
      sessionRef: sessionId,
    });

    return goal;
  }

  /**
   * Get Progress Chart Data for a Goal
   */
  static async getGoalTrend(goalId) {
    return await GoalProgressHistory.find({ goalId }).sort({ recordedDate: 1 }).select('percentage recordedDate note');
  }
}

module.exports = SmartPatientService;
module.exports.instance = new SmartPatientService();
