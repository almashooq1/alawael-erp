const SmartNotificationService = require('./smartNotificationService');

/**
 * PHASE 49: Smart Support & Front Desk System
 * Handles: Complaints, Suggestions, Happiness Surveys (NPS)
 */
class SmartSupportService {
  /**
   * Creates a new support ticket (Complaint/Suggestion)
   * Auto-assigns based on Category (e.g. Clinical -> Medical Director)
   */
  static async createTicket(ticketData) {
    // ticketData: { userId, type: 'COMPLAINT', category: 'CLINICAL', description: '...' }
    const ticketId = `TKT-${Date.now()}`;

    let assignedRole = 'ADMIN';
    if (ticketData.category === 'CLINICAL') assignedRole = 'MEDICAL_DIRECTOR';
    if (ticketData.category === 'BILLING') assignedRole = 'FINANCE_MANAGER';
    if (ticketData.category === 'FACILITY') assignedRole = 'FACILITY_MANAGER';

    const newTicket = {
      id: ticketId,
      ...ticketData,
      status: 'OPEN',
      assignedRole,
      createdAt: new Date(),
    };

    // Notify the department head
    await SmartNotificationService.broadcastToRole(assignedRole, `New ${ticketData.type}: ${ticketData.category}`, 'WARNING');

    return newTicket;
  }

  /**
   * Sends Satisfaction Survey (NPS) to parents after session interaction
   * Triggered by: Session Completion or Invoice Payment
   */
  static async triggerSurvey(parentId, triggerEvent) {
    // In real app: Send SMS/WhatsApp link
    return {
      success: true,
      method: 'SMS',
      surveyLink: `https://rehab-portal.com/survey/${parentId}?ref=${triggerEvent}`,
      questions: [
        'How likely are you to recommend us to a friend?', // 0-10
        'How was the reception service today?',
        'Did the therapist start on time?',
      ],
    };
  }

  /**
   * Analyzes Survey Results for "At-Risk" families
   */
  static analyzeFeedback(score, comment) {
    if (score <= 6) {
      // Detractor - Create urgent retention ticket
      return this.createTicket({
        userId: 'SYSTEM',
        type: 'RETENTION_ALERT',
        category: 'ADMIN',
        description: `Low NPS Score (${score}). Comment: ${comment}`,
        priority: 'URGENT',
      });
    }
    return { status: 'LOGGED', sentiment: 'POSITIVE' };
  }
}

module.exports = SmartSupportService;
