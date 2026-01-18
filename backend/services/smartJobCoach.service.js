/**
 * Smart Job Coach & Employer Integration Service (Phase 79)
 *
 * Extends the Vocational Rehab system to support "Supported Employment".
 * Bridges the gap between the Rehab Center, the Job Coach (in field), and the Employer.
 */

class SmartJobCoachService {
  constructor() {
    this.placements = new Map();
  }

  /**
   * Log a Job Coaching Site Visit
   * Used by coaches via mobile app when visiting a beneficiary at work.
   * @param {string} placementId
   * @param {object} geolocation { lat, long } - GPS Verification
   * @param {object} observation
   */
  async logSiteVisit(placementId, coachId, geolocation, observation) {
    console.log(`[JOB COACH] Visit to ${placementId} by ${coachId}`);

    // Logic: Verify GPS matches Employer Location (Mocked)
    const isLocationValid = true;

    const visitLog = {
      id: 'VISIT-' + Date.now(),
      timestamp: new Date(),
      verifiedLocation: isLocationValid,
      behavioralScore: observation.behavioralScore, // 1-10
      taskPerformance: observation.taskPerformance, // 1-10
      interventionProvided: observation.intervention || 'None',
      coachNotes: observation.notes,
    };

    // Trigger Alert if performance is dropping
    let alert = null;
    if (observation.taskPerformance < 5) {
      alert = {
        type: 'RISK_OF_TERMINATION',
        msg: 'Performance dropping. Urgent meeting with Employer required.',
      };
    }

    return {
      success: true,
      logId: visitLog.id,
      alert,
      nextVisitDue: new Date(Date.now() + 86400000 * 7), // +7 days
    };
  }

  /**
   * Submit Employer Feedback (Employer Portal)
   * Allows the boss to rate the beneficiary's work directly.
   */
  async submitEmployerFeedback(placementId, employerId, feedback) {
    const sentiment = this._analyzeSentiment(feedback.comments);

    return {
      submissionId: 'FDBK-' + Date.now(),
      score: (feedback.punctuality + feedback.quality) / 2,
      aiSentiment: sentiment,
      actionItem: sentiment === 'NEGATIVE' ? 'Schedule Retraining' : 'Send Appreciation Certificate',
    };
  }

  _analyzeSentiment(text) {
    if (!text) return 'NEUTRAL';
    return text.includes('late') || text.includes('issue') ? 'NEGATIVE' : 'POSITIVE';
  }
}

module.exports = SmartJobCoachService;
