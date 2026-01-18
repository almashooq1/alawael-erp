const SmartPatientService = require('./smartPatient.service');
const TherapySession = require('../models/TherapySession');

class SmartReportService {
  /**
   * Generate a Comprehensive Medical Progress Report
   * Aggregates data to save therapist time.
   */
  static async generateProgressReport(beneficiaryId, startDate, endDate, generatedById) {
    // 1. Fetch Core Data
    const emrData = await SmartPatientService.getUnifiedFile(beneficiaryId);

    // 2. Filter Sessions in Date Range
    const sessions = await TherapySession.find({
      beneficiary: beneficiaryId,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: 'COMPLETED',
    }).sort({ date: 1 });

    if (sessions.length === 0) {
      throw new Error('No completed sessions found in this period.');
    }

    // 3. Clinical Synthesis (The "Smart" Part)

    // A. Attendance Stats
    const attendanceSummary = `Patient attended ${sessions.length} sessions during this period.`;

    // B. Goal Progression
    // Filter goals active in this period (from emrData.clinical.goals)
    const goalsStatus = emrData.clinical.goals.map(g => ({
      description: g.description,
      status: g.status,
      progress: g.progress + '%',
    }));

    // C. Narrative Summary (Auto-Summarization)
    // Concatenate the "Plan/Assessment" notes from the last 3 sessions to give recent context
    const recentNotes = sessions
      .slice(-3)
      .map(s => `[${s.date.toISOString().split('T')[0]}]: ${s.notes?.assessment || 'No assessment recorded.'}`)
      .join('\n');

    // D. Recommendations
    const recommendations = 'Continue current therapeutic plan. Review goals in 3 months.';

    // E. Digital Signature Stub
    // In real app, fetch User signature image URL

    const reportPayload = {
      reportId: `REP-${Date.now()}`,
      generatedDate: new Date(),
      period: { start: startDate, end: endDate },
      patient: {
        name: `${emrData.profile.firstName} ${emrData.profile.lastName}`,
        id: emrData.profile.fileNumber,
        age: new Date().getFullYear() - new Date(emrData.profile.dob).getFullYear(),
        diagnosis: emrData.clinical.diagnosis || 'N/A',
      },
      sections: {
        attendance: attendanceSummary,
        goalsTable: goalsStatus,
        clinicalNarrative: recentNotes,
        recommendations: recommendations,
      },
      status: 'DRAFT', // Therapist reviews this before Finalizing
    };

    return reportPayload;
  }

  /**
   * Generate Discharge Summary
   * When a patient finishes their journey
   */
  static async generateDischargeSummary(beneficiaryId) {
    // Similar logic but focuses on "Outcome vs Baseline"
    return { message: 'Discharge summary generation logic placeholder.' };
  }
}

module.exports = SmartReportService;
module.exports.instance = new SmartReportService();
