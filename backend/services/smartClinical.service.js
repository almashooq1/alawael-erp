const GoalBank = require('../models/GoalBank');
const TherapeuticPlan = require('../models/TherapeuticPlan');
const SmartNotificationService = require('./smartNotificationService');

class SmartClinicalService {
  /**
   * seed default goals if empty (For demo)
   */
  static async initSeed() {
    const count = await GoalBank.countDocuments();
    if (count === 0) {
      await GoalBank.insertMany([
        {
          domain: 'SPEECH',
          category: 'Articulation',
          description: 'Produce /s/ sound correctly in initial position of words.',
          targetAgeMin: 4,
          targetAgeMax: 7,
          difficulty: 'BEGINNER',
        },
        {
          domain: 'SPEECH',
          category: 'Vocabulary',
          description: 'Identify and name 10 common household objects.',
          targetAgeMin: 2,
          targetAgeMax: 4,
          difficulty: 'BEGINNER',
        },
        {
          domain: 'OCCUPATIONAL',
          category: 'Fine Motor',
          description: 'Hold a pencil using a tripod grasp dynamically.',
          targetAgeMin: 4,
          targetAgeMax: 6,
          difficulty: 'INTERMEDIATE',
        },
        {
          domain: 'BEHAVIORAL',
          category: 'Social',
          description: 'Maintain eye contact for 3 seconds during conversation.',
          targetAgeMin: 3,
          targetAgeMax: 10,
          difficulty: 'BEGINNER',
        },
        {
          domain: 'PHYSICAL',
          category: 'Balance',
          description: 'Stand on one foot for 5 seconds without support.',
          targetAgeMin: 4,
          targetAgeMax: 6,
          difficulty: 'INTERMEDIATE',
        },
      ]);
      console.log('Goal Bank Seeded');
    }
  }

  /**
   * Suggest Goals based on Patient Profile
   */
  static async suggestGoals(domain, age) {
    // Find matching goals
    return await GoalBank.find({
      domain: domain.toUpperCase(),
      targetAgeMin: { $lte: age },
      targetAgeMax: { $gte: age },
    }).limit(10);
  }

  /**
   * Analyze Plans for "Stagnation"
   * Finds active plans where progress hasn't changed in 30 days
   */
  static async checkStalledProgress(adminUserId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find Active Plans updated BEFORE 30 days ago
    const stalledPlans = await TherapeuticPlan.find({
      status: 'ACTIVE',
      updatedAt: { $lt: thirtyDaysAgo },
    }).populate('beneficiary', 'firstName lastName');

    if (stalledPlans.length > 0) {
      for (const plan of stalledPlans) {
        // Determine manager (careManager or system admin)
        const recipient = plan.careManager || adminUserId;

        // Alert
        await SmartNotificationService.send(
          recipient,
          'Clinical Alert: Stalled Progress',
          `Therapy plan for ${plan.beneficiary.firstName} hasn't been updated in 30 days. Review required.`,
          'WARNING',
          `/rehab/plans/${plan._id}`,
        );
      }
      return { message: `Flagged ${stalledPlans.length} stalled plans.` };
    }
    return { message: 'All plans represent recent activity.' };
  }
}

module.exports = SmartClinicalService;
module.exports.instance = new SmartClinicalService();
