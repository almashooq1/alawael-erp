const TherapySession = require('../models/TherapySession');
const Waitlist = require('../models/Waitlist');
const Employee = require('../models/Employee');
const SmartNotificationService = require('./smartNotificationService');

class SmartSchedulingService {
  /**
   * Find available slots for a given discipline
   * Scans next 7 days for gaps in therapist schedules
   */
  static async findNextAvailableSlots(department, count = 5) {
    // 1. Find Therapists in this department
    const therapists = await Employee.find({
      department: department,
      status: 'ACTIVE',
      role: 'THERAPIST',
    });

    if (therapists.length === 0) return [];

    const therapistIds = therapists.map(t => t._id);
    const slots = [];

    // Scan next 7 working days
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);

      // Skip weekends (Fri/Sat usually in MENA, adjust as needed)
      const day = checkDate.getDay();
      if (day === 5 || day === 6) continue;

      // Hardcoded "Business Hours" for logic simplicity: 09:00 to 17:00
      // In a real system, this comes from Shift model
      const possibleTimes = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

      for (const therapist of therapists) {
        // Get booked sessions for this therapist on this date
        const booked = await TherapySession.find({
          therapist: therapist._id,
          date: {
            $gte: new Date(checkDate.setHours(0, 0, 0, 0)),
            $lte: new Date(checkDate.setHours(23, 59, 59, 999)),
          },
          status: { $in: ['SCHEDULED', 'CONFIRMED'] },
        });

        const bookedTimes = booked.map(s => s.startTime);

        // Find gaps
        for (const time of possibleTimes) {
          if (!bookedTimes.includes(time)) {
            slots.push({
              date: checkDate,
              time: time,
              therapistName: therapist.fullName,
              therapistId: therapist._id,
            });
            if (slots.length >= count) return slots;
          }
        }
      }
    }
    return slots;
  }

  /**
   * Handle Cancellation Intelligence
   * When a session is cancelled, find a Waitlist candidate to take the spot
   */
  static async processCancellation(sessionId, cancelledByUserId) {
    const session = await TherapySession.findById(sessionId).populate('therapist');
    if (!session) return;

    // Release slot logic could go here

    // Find matching waitlist entry
    // Converting Date day to String (e.g. 0 = SUN)
    const daysMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayStr = daysMap[session.date.getDay()];

    const candidates = await Waitlist.find({
      status: 'WAITING',
      department: session.therapist.department, // Assuming match
      // Simple match: if they preferred this day
      preferredDays: dayStr,
    }).populate('beneficiary', 'firstName lastName phone');

    if (candidates.length > 0) {
      // Notify Admin or Auto-Offer
      const bestCandidate = candidates[0]; // Priority 1 ( FIFO or High Priority )

      await SmartNotificationService.send(
        cancelledByUserId, // Or admin
        'Gap Filler Opportunity',
        `Session cancelled on ${session.date.toDateString()}. ${bestCandidate.beneficiary.firstName} is on waitlist for this time!`,
        'info',
        `/rehab/waitlist/${bestCandidate._id}`,
      );

      return { foundReplacement: true, candidate: bestCandidate };
    }

    return { foundReplacement: false };
  }
}

module.exports = SmartSchedulingService;
module.exports.instance = new SmartSchedulingService();
