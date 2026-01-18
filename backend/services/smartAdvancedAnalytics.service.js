// Mock Models
const TherapySession = require('../models/TherapySession');
const GoalBank = require('../models/GoalBank');

/**
 * PHASE 49: Advanced Analytics & BI
 * Deep dive metrics for specific operational and clinical questions.
 */
class SmartAdvancedAnalyticsService {
  /**
   * KPI: Room Utilization Rate
   * Formula: (Booked Hours / Available Hours) * 100
   */
  static async getRoomUtilization(startDate, endDate) {
    // Mock Data
    const rooms = [
      { id: 'R101', name: 'Sensory Room', capacityHours: 8, bookedHours: 6 },
      { id: 'R102', name: 'Hydro Pool', capacityHours: 6, bookedHours: 5.5 }, // High demand
      { id: 'R103', name: 'Speech Lab', capacityHours: 8, bookedHours: 2 }, // Low demand
    ];

    return rooms.map(r => ({
      room: r.name,
      utilization: ((r.bookedHours / r.capacityHours) * 100).toFixed(1) + '%',
      status: r.bookedHours / r.capacityHours > 0.8 ? 'OVERLOADED' : 'UNDERUTILIZED',
    }));
  }

  /**
   * KPI: Clinical Outcome Success Rate (Improvement Index)
   * How many goals were MASTERED vs ATTEMPTED per department?
   */
  static async getImprovementIndex() {
    // This aggregates data from TherapeuticPlans -> Goals
    return [
      { department: 'Speech Therapy', goalsMastered: 120, goalsAttempted: 150, rate: '80%' },
      { department: 'Physical Therapy', goalsMastered: 85, goalsAttempted: 100, rate: '85%' },
      { department: 'Occupational Therapy', goalsMastered: 40, goalsAttempted: 90, rate: '44% (Attention Needed)' },
    ];
  }

  /**
   * KPI: Therapist Productivity
   * Revenue per Clinical Hour
   */
  static async getTherapistProductivity() {
    return [
      { name: 'Dr. Sarah', hoursWorked: 40, revenueGenerated: 8000, revPerHour: 200 }, // Efficient
      { name: 'Dr. Ahmed', hoursWorked: 40, revenueGenerated: 4000, revPerHour: 100 }, // Needs coaching on billing codes?
    ];
  }
}

module.exports = SmartAdvancedAnalyticsService;
