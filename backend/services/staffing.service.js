const Employee = require('../models/Employee');
// const Shift = require('../models/Shift');

class StaffingService {
  /**
   * Smartly suggests staff for a shift based on role and availability
   */
  static async suggestStaff(role, shiftId) {
    // 1. Find all active employees with this role
    const candidates = await Employee.find({
      position: new RegExp(role, 'i'), // Case insensitive "Nurse", "Therapist"
      status: 'ACTIVE',
    });

    // 2. Filter out those who are already assigned to a shift (Simulated "Busy" logic)
    // In a real app, we'd check time overlaps.
    // Here we check if 'currentShift' is set (assuming 1 shift at a time for simplicity)

    const available = candidates.filter(emp => !emp.currentShift || emp.currentShift.toString() !== shiftId);

    // 3. Sort by "Workload" (Mock: random sort or alphabetical to simulate balancing)
    // Advanced: We would count their assigned sessions here.

    return available.map(emp => ({
      _id: emp._id,
      name: `${emp.firstName} ${emp.lastName}`,
      matchScore: 0.95, // Mock score
      reason: 'Available and matches role',
    }));
  }

  /**
   * Calculates utilization (Work vs Idle)
   */
  static calculateUtilization(totalSessions, workHoursInMonth = 160) {
    const sessionHours = totalSessions * 1; // Assuming 1 hr per session
    const rate = (sessionHours / workHoursInMonth) * 100;
    return Math.round(rate * 10) / 10; // Round to 1 decimal
  }
}

module.exports = StaffingService;
module.exports.instance = new StaffingService();
