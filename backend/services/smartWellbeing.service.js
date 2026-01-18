// Mock Models
const Employee = require('../models/Employee');
const SmartNotificationService = require('./smartNotificationService');

/**
 * PHASE 59: Staff Resilience & Burnout AI
 * "Caring for the Carers"
 * Monitors staff wellbeing to prevent burnout and ensure quality of care.
 */
class SmartWellbeingService {
  /**
   * Calculates Burnout Risk Score (0-100)
   * Factors:
   * 1. Caseload Severity (Are they seeing only severe cases?)
   * 2. Overtime Hours (Are they staying late?)
   * 3. Administration Burden (Time spent on paperwork)
   */
  static async calculateBurnoutRisk(therapistId) {
    // Mock Data Fetch
    const workload = {
      totalSessions: 35, // High
      severeCasesRatio: 0.8, // 80% severe - Very draining
      adminHours: 10,
      lateLogins: 4, // Logged in after 8 PM 4 times this week
    };

    let riskScore = 0;

    // Scoring Logic
    if (workload.totalSessions > 30) riskScore += 20;
    if (workload.severeCasesRatio > 0.6) riskScore += 30; // Emotional toll
    if (workload.lateLogins > 2) riskScore += 25; // Lack of work-life balance

    // Sentiment Analysis on Interaction Notes (Simulated)
    // If notes become brief and robotic, it's a sign of detachment (burnout symptom).
    const noteQuality = 'ROBOTIC';
    if (noteQuality === 'ROBOTIC') riskScore += 15;

    return {
      therapistId,
      riskScore, // 90
      riskLevel: riskScore > 80 ? 'CRITICAL' : riskScore > 50 ? 'MODERATE' : 'LOW',
      contributingFactors: ['High Severity Ratio', 'After-hours work detected', 'Decreased note quality'],
    };
  }

  /**
   * Recommends "Micro-Interventions" for staff.
   */
  static async recommendWellbeingAction(therapistId, riskAnalysis) {
    if (riskAnalysis.riskLevel === 'CRITICAL') {
      // Serious Intervention
      await SmartNotificationService.send(
        therapistId,
        'Wellness Check-in',
        'We noticed you have been working very hard on difficult cases. Please see the Clinical Director to adjust your schedule.',
        'INFO',
      );
      return { action: 'SCHEDULE_ADJUSTMENT', reason: 'Critical Burnout Risk' };
    }

    if (riskAnalysis.riskLevel === 'MODERATE') {
      return { action: 'SUGGEST_HALF_DAY', reason: 'Preventative' };
    }

    return { action: 'KUDOS', reason: 'Healthy Balance' };
  }
}

module.exports = SmartWellbeingService;
