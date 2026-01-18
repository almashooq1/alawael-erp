const TherapySession = require('../models/TherapySession');
const TherapeuticPlan = require('../models/TherapeuticPlan');
const TherapyRoom = require('../models/TherapyRoom');
const Employee = require('../models/Employee');

class RehabReportService {
  /**
   * 1. Patient Improvement Rates
   * Calculates percentage of achieved goals per plan
   */
  static async getImprovementRates() {
    const plans = await TherapeuticPlan.find({ status: 'ACTIVE' });

    let totalProgress = 0;
    let count = 0;

    plans.forEach(plan => {
      if (plan.goals && plan.goals.length > 0) {
        const totalGoalProgress = plan.goals.reduce((acc, goal) => acc + (goal.progress || 0), 0);
        const planAvg = totalGoalProgress / plan.goals.length;
        totalProgress += planAvg;
        count++;
      }
    });

    const overallAvg = count > 0 ? (totalProgress / count).toFixed(1) : 0;
    return {
      metric: 'Average Patient Improvement',
      value: `${overallAvg}%`,
      analyzedPlans: count,
    };
  }

  /**
   * 2. Room Occupancy
   * Which rooms are busy?
   */
  static async getRoomOccupancy(dateStr) {
    // Need to link Sessions to Rooms.
    // Assuming we add 'room' field to Session (To be done in next edit) or simulating it.
    // For now, we mock based on total sessions / total rooms capacity

    const totalRooms = await TherapyRoom.countDocuments();
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);

    const sessionsValid = await TherapySession.countDocuments({
      date: { $gte: start, $lte: end },
      status: { $in: ['SCHEDULED', 'COMPLETED'] },
    });

    // Assume 8 hour day * totalRooms available slots
    const capacity = totalRooms * 8;
    const rate = capacity > 0 ? ((sessionsValid / capacity) * 100).toFixed(1) : 0;

    return {
      metric: 'Room Occupancy Rate',
      date: dateStr,
      value: `${rate}%`,
      details: `${sessionsValid} sessions booked out of ${capacity} slots`,
    };
  }

  /**
   * 3. Specialist Productivity
   */
  static async getSpecialistProductivity() {
    // reuse aggregation
    const stats = await TherapySession.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: '$therapist', count: { $sum: 1 } } },
    ]);

    // Enrich with names would happen here
    return stats;
  }
}

module.exports = RehabReportService;
module.exports.instance = new RehabReportService();
