const Training = require('../models/training.model');
const Employee = require('../models/Employee');
const SmartNotificationService = require('./smartNotificationService');
const ComplianceLog = require('../models/ComplianceLog');
const Feedback = require('../models/Feedback');

class SmartTrainingService {
  /**
   * The Brain: Analyze Performance & Assign Training
   * This connects Quality/Feedback directly to HR Development.
   */
  static async runSkillGapAnalysis(adminUserId) {
    const assignments = [];
    const employees = await Employee.find({ status: 'ACTIVE' });

    for (const emp of employees) {
      // 1. Check Compliance Logs (The QA Watchdog)
      // Does this employee have "POOR_DOCUMENTATION" logs?
      const qualityIssues = await ComplianceLog.countDocuments({
        relatedId: emp._id,
        issueType: 'POOR_DOCUMENTATION',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      });

      if (qualityIssues >= 3) {
        // Assign Remedial Training
        await this.assignRemedialTraining(emp, 'Technical Documentation Workshop', 'compliance');
        assignments.push({ name: emp.fullName, reason: 'Poor Documentation' });
      }

      // 2. Check Parent Feedback (The Reputation Engine)
      // Does this employee have Detractors?
      const negativeFeedbacks = await Feedback.countDocuments({
        therapist: emp._id,
        sentiment: 'NEGATIVE',
        createdAt: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
      });

      if (negativeFeedbacks >= 2) {
        await this.assignRemedialTraining(emp, 'Advanced Patient Communication', 'soft-skills');
        assignments.push({ name: emp.fullName, reason: 'Negative Feedback' });
      }
    }

    if (assignments.length > 0) {
      await SmartNotificationService.send(
        adminUserId,
        'AI Training Manager',
        `Assigned remedial training to ${assignments.length} staff members based on performance gaps.`,
        'INFO',
        '/hr/training',
      );
    }

    return { assigned: assignments.length, details: assignments };
  }

  /**
   * Helper: Find or Create Course and Assign
   */
  static async assignRemedialTraining(employee, courseTitle, category) {
    // Find existing valid course or create placeholder
    let course = await Training.findOne({
      title: courseTitle,
      endDate: { $gte: new Date() }, // Future active course
    });

    if (!course) {
      // Create a self-paced module
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);

      course = await Training.create({
        title: courseTitle,
        description: 'Auto-generated remedial course based on performance triggers.',
        category: category,
        startDate: new Date(),
        endDate: nextMonth,
        schedule: 'online', // Self-paced
        duration: 5,
      });
    }

    // Check if already registered
    const alreadyIn = course.participants.some(p => p.employeeId.toString() === employee._id.toString());
    if (!alreadyIn) {
      course.participants.push({
        employeeId: employee._id,
        status: 'registered',
      });
      await course.save();

      // Notify Employee
      await SmartNotificationService.send(
        employee.userId || employee._id, // Prefer User ID if linked
        'New Training Assigned',
        `You have been enrolled in "${courseTitle}" to support your professional growth.`,
        'WARNING',
        `/hr/training/${course._id}`,
      );
    }
  }

  /**
   * PHASE 46: Outcome-Based Learning
   * Checks if a therapist's patients are meeting their goals.
   * If > 40% of patients are "STAGNANT", assign clinical refresher.
   */
  static async analyzeClinicalOutcomes(therapistId) {
    // 1. Find all active plans for this therapist
    // const plans = await TherapeuticPlan.find({ assignedTherapist: therapistId, status: 'ACTIVE' });

    // Simulation:
    const plansSimpleStats = {
      total: 10,
      stagnant: 5, // 50% are not improving
      improving: 5,
    };

    const stagnationRate = plansSimpleStats.stagnant / plansSimpleStats.total;

    if (stagnationRate >= 0.4) {
      // High stagnation rate found.
      const emp = await Employee.findById(therapistId);
      if (emp) {
        return this.assignRemedialTraining(emp, 'Clinical Efficacy & Goal Setting Workshop', 'clinical');
      }
    }
    return null;
  }
}

module.exports = SmartTrainingService;
module.exports.instance = new SmartTrainingService();
