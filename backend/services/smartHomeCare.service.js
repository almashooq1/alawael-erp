const HomeAssignment = require('../models/HomeAssignment');
const SmartNotificationService = require('./smartNotificationService');

class SmartHomeCareService {
  /**
   * Calculate how well a family is following instructions
   * Adherence Rate = (Submissions / Expected Days) * 100
   */
  static async getAdherenceReport(beneficiaryId) {
    const assignments = await HomeAssignment.find({
      beneficiary: beneficiaryId,
      status: 'ACTIVE',
    });

    if (assignments.length === 0) return { score: 0, level: 'NO_ASSIGNMENTS' };

    let totalExpected = 0;
    let totalDone = 0;

    const now = new Date();

    assignments.forEach(assign => {
      const start = new Date(assign.startDate);
      const daysActive = Math.ceil((now - start) / (1000 * 60 * 60 * 24));

      // Simple logic for Daily frequency
      if (assign.frequency === 'DAILY') {
        totalExpected += daysActive;
      } else if (assign.frequency === 'WEEKLY') {
        totalExpected += Math.ceil(daysActive / 7);
      }

      // Count Valid Submissions
      totalDone += assign.submissions.filter(s => s.status === 'DONE').length;
    });

    const score = totalExpected === 0 ? 100 : Math.round((totalDone / totalExpected) * 100);

    let level = 'GOOD';
    if (score < 50) level = 'POOR';
    else if (score < 80) level = 'AVERAGE';

    return { score, level, activeAssignments: assignments.length };
  }

  /**
   * Check for families who stopped engaging
   * Run this weekly via cron job (simulated)
   */
  static async checkDropoutRisk(adminUserId) {
    const activeAssignments = await HomeAssignment.find({ status: 'ACTIVE' })
      .populate('beneficiary', 'firstName lastName')
      .populate('assignedBy', '_id'); // Therapist

    const atRisk = [];

    // Check last submission date
    for (const assign of activeAssignments) {
      const lastSub = assign.submissions.sort((a, b) => b.date - a.date)[0];

      // If no submission in last 7 days from start date
      const lastActivity = lastSub ? new Date(lastSub.date) : new Date(assign.startDate);
      const diffDays = Math.ceil((new Date() - lastActivity) / (1000 * 60 * 60 * 24));

      if (diffDays > 7) {
        // Alert Therapist
        await SmartNotificationService.send(
          assign.assignedBy._id,
          'Home Care Alert: Family Inactive',
          `Family of ${assign.beneficiary.firstName} hasn't logged home exercises in ${diffDays} days. Please follow up.`,
          'WARNING',
          `/rehab/home-care/${assign._id}`,
        );

        atRisk.push({
          beneficiary: assign.beneficiary.firstName,
          daysInactive: diffDays,
        });
      }
    }
    return { count: atRisk.length, details: atRisk };
  }
}

module.exports = SmartHomeCareService;
module.exports.instance = new SmartHomeCareService();
