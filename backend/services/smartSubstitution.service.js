const User = require('../models/User');
const TherapySession = require('../models/TherapySession');

class SmartSubstitutionService {
  /**
   * Find best replacement therapist for a specific slot
   * @param {string} originalTherapistId
   * @param {Date} date
   * @param {string} startTime (HH:mm)
   * @param {string} endTime (HH:mm)
   * @param {string} patientId (Optional - for continuity score)
   */
  static async findReplacement(originalTherapistId, date, startTime, endTime, patientId) {
    const originalTherapist = await User.findById(originalTherapistId);
    if (!originalTherapist) throw new Error('Therapist not found');

    // 1. Find all therapists with same Specialty
    // Assuming 'specialization' field exists on User
    const candidates = await User.find({
      role: 'THERAPIST',
      specialization: originalTherapist.specialization,
      _id: { $ne: originalTherapistId },
      isActive: true,
    });

    const scoredCandidates = [];

    for (const candidate of candidates) {
      // 2. Availability Check
      // Check if they have a session overlapping this time
      const isBusy = await this.checkOverlap(candidate._id, date, startTime, endTime);
      if (isBusy) continue; // Skip if busy

      let score = 0;
      const reasons = [];

      // 3. Continuity Score (Have they treated this patient before?)
      if (patientId) {
        const history = await TherapySession.countDocuments({
          therapist: candidate._id,
          beneficiary: patientId,
          status: 'COMPLETED',
        });

        if (history > 0) {
          score += 10;
          reasons.push(`Has treated patient ${history} times`);
        }
      }

      // 4. Workload Balance (Prioritize those with fewer sessions today)
      const dailyLoad = await TherapySession.countDocuments({
        therapist: candidate._id,
        date: {
          $gte: new Date(new Date(date).setHours(0, 0, 0)),
          $lt: new Date(new Date(date).setHours(23, 59, 59)),
        },
        status: { $ne: 'CANCELLED' },
      });

      if (dailyLoad < 4) {
        score += 5;
        reasons.push('Light schedule today');
      } else if (dailyLoad > 6) {
        score -= 5;
        reasons.push('Heavily booked');
      }

      scoredCandidates.push({
        therapist: {
          _id: candidate._id,
          name: `${candidate.firstName} ${candidate.lastName}`,
          specialization: candidate.specialization,
        },
        score,
        reasons,
      });
    }

    // Sort by Score Descending
    return scoredCandidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Check if a time slot overlaps with existing sessions
   */
  static async checkOverlap(therapistId, date, start, end) {
    // Simple logic: Convert to minutes and compare
    // In real app, date objects would be precise.
    // This assumes simple string comparison for demo or need robust date parsing

    // Let's assume sessions are stored with full Date objects 'date' (which includes time?)
    // OR 'date' + 'time' string.
    // Based on Phase 19 (Capacity), we likely use simple checks.

    // Let's query sessions for that therapist on that day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59);

    const sessions = await TherapySession.find({
      therapist: therapistId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ['CANCELLED', 'CANCELLED_BY_PATIENT'] },
    });

    // Convert query slot to minutes
    const qStart = this.toMinutes(start);
    const qEnd = this.toMinutes(end);

    for (const s of sessions) {
      // Assuming session has startTime/endTime or similar.
      // If schema uses just 'date', we might need duration.
      // Fallback: check if session.time (string) overlaps.
      if (!s.time) continue;

      const sStart = this.toMinutes(s.time);
      const sEnd = sStart + 45; // Assume 45 min session default if no end time

      if (qStart < sEnd && qEnd > sStart) {
        return true; // Overlap found
      }
    }

    return false;
  }

  static toMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }
}

module.exports = SmartSubstitutionService;
module.exports.instance = new SmartSubstitutionService();
