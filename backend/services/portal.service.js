const BeneficiaryFile = require('../models/BeneficiaryFile');
const TherapySession = require('../models/TherapySession');
const Invoice = require('../models/Invoice');
const TherapeuticPlan = require('../models/TherapeuticPlan');
const Notification = require('../models/Notification');

class PortalService {
  /**
   * Get all children linked to this parent user
   */
  static async getChildren(userId) {
    return await BeneficiaryFile.find({ user: userId }).select('firstName lastName fileNumber status dob gender');
  }

  /**
   * Get a consolidated timeline for a specific child
   * (Sessions, Invoices, Plans)
   */
  static async getChildTimeline(childId) {
    // Parallel fetch for speed
    const [sessions, invoices, plans] = await Promise.all([
      TherapySession.find({ beneficiary: childId, status: 'COMPLETED' })
        .sort({ date: -1 })
        .limit(5)
        .populate('therapist', 'firstName lastName'),

      Invoice.find({ beneficiary: childId }).sort({ createdAt: -1 }).limit(5),

      TherapeuticPlan.find({ beneficiary: childId, status: 'ACTIVE' }),
    ]);

    return {
      recentSessions: sessions.map(s => ({
        id: s._id,
        date: s.date,
        therapist: s.therapist ? `${s.therapist.firstName} ${s.therapist.lastName}` : 'System',
        status: s.status,
        rating: s.rating,
      })),
      invoices: invoices.map(i => ({
        id: i._id,
        number: i.invoiceNumber,
        amount: i.totalAmount,
        status: i.status,
        date: i.createdAt,
      })),
      activePlans: plans.map(p => ({
        id: p._id,
        startDate: p.startDate,
        goalsCount: p.goals.length,
        progress: p.goals.reduce((acc, g) => acc + g.progress, 0) / (p.goals.length || 1),
      })),
    };
  }

  /**
   * Parent acknowledges a completed session
   */
  static async acknowledgeSession(sessionId, parentRating, comment) {
    // Logic to update session with parent feedback
    const session = await TherapySession.findById(sessionId);
    if (!session) throw new Error('Session not found');

    // Assuming we add a 'parentFeedback' field to TherapySession schema
    // For now, we update generic notes or just log it

    return { message: 'Feedback received', sessionId };
  }
}

module.exports = PortalService;
module.exports.instance = new PortalService();
