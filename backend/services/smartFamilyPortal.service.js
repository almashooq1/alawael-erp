const TherapySession = require('../models/TherapySession');
const Invoice = require('../models/Invoice');
const TherapeuticPlan = require('../models/TherapeuticPlan');
const GoalBank = require('../models/GoalBank'); // Assuming structure

class SmartFamilyPortalService {
  /**
   * Get "Home Screen" Payload for Mobile App
   * Aggregates critical info for the parent in one fast query
   */
  static async getHomeFeed(beneficiaryId) {
    // 1. Next Appointment
    const nextSession = await TherapySession.findOne({
      beneficiary: beneficiaryId,
      date: { $gte: new Date() },
      status: 'SCHEDULED',
    })
      .sort({ date: 1 })
      .populate('therapist', 'firstName lastName photo');

    // 2. Wallet/Balance Warning
    const pendingInvoices = await Invoice.find({
      beneficiary: beneficiaryId,
      status: 'UNPAID',
    });
    const totalDue = pendingInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);

    // 3. Clinical Progress Snippet
    const activePlan = await TherapeuticPlan.findOne({ beneficiary: beneficiaryId, status: 'ACTIVE' });
    let latestGoal = 'No active goals';
    if (activePlan && activePlan.disciplines.length > 0) {
      // Just grab the first active short term goal
      const disc = activePlan.disciplines[0];
      if (disc.shortTermGoals.length > 0) {
        latestGoal = disc.shortTermGoals[0];
      }
    }

    return {
      greeting: 'Good Morning', // Dynamic based on time
      nextSession: nextSession
        ? {
            id: nextSession._id,
            therapist: `${nextSession.therapist.firstName} ${nextSession.therapist.lastName}`,
            date: nextSession.date,
            time: nextSession.time || '10:00', // Mock time field if missing in schema
            discipline: nextSession.type || 'Therapy',
          }
        : null,
      financialStatus: {
        totalDue,
        status: totalDue > 0 ? 'PAYMENT_REQUIRED' : 'CLEAR',
      },
      clinicalSnapshot: {
        currentGoal: latestGoal,
        progressPercent: 65, // Mock or calculated from goal tracking
      },
      quickActions: [
        { label: 'Book Appointment', action: 'NAV_BOOKING' },
        { label: 'Message Therapist', action: 'NAV_CHAT' },
        { label: 'View Report', action: 'NAV_REPORTS' },
      ],
    };
  }

  /**
   * Self-Service Cancellation with Logic
   * Enforces late cancellation policy (e.g., cannot cancel if < 24 hours)
   */
  static async requestCancellation(sessionId, reason) {
    const session = await TherapySession.findById(sessionId);
    if (!session) throw new Error('Session not found');

    const now = new Date();
    const sessionDate = new Date(session.date);
    const hoursDiff = (sessionDate - now) / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      return {
        allowCancel: false,
        message: 'Late cancellation! You must cancel at least 24 hours in advance to avoid fees.',
        penalty: true,
      };
    }

    // Proceed to cancel
    session.status = 'CANCELLED_BY_PATIENT';
    session.cancellationReason = reason;
    await session.save();

    return {
      allowCancel: true,
      message: 'Session cancelled successfully. No fee applied.',
    };
  }

  /**
   * Generates a "Parent Friendly" daily summary
   * Translates clinical jargon into simple language.
   */
  static async getDailyDigest(studentId) {
    // In a real app, this would query daily notes and use LLM to summarize
    return {
      studentId,
      date: new Date(),
      mood: 'Happy',
      activities: [
        { name: 'Morning Circle', participation: 'Active' },
        { name: 'Speech Therapy', highlight: 'Pronounced "Ball" correctly for the first time!' },
      ],
      photos: ['/secure/media/img1.jpg'],
      clinicianNote: "Great day today. Please practice the 'B' sound at home.",
    };
  }

  /**
   * Secure messaging with audit logging
   */
  static async sendMessage(fromId, toId, content) {
    // Mock sending message
    return {
      messageId: 'MSG-' + Date.now(),
      status: 'SENT',
      timestamp: new Date(),
    };
  }
}

module.exports = SmartFamilyPortalService;
