const SmartNotificationService = require('./smartNotificationService');
const Beneficiary = require('../models/Beneficiary'); // Patient
const TherapeuticPlan = require('../models/TherapeuticPlan');

/**
 * PHASE 45: Clinical Decision Support System (CDSS)
 * "The Clinical Brain"
 *
 * This service acts as a real-time safeguard and intelligence layer
 * above the standard EMR. It analyzes cross-disciplinary data to prevent errors
 * and suggest safer, more effective treatment paths.
 */
class SmartCDSSService {
  /**
   * Scans for contraindications between medications and planned physical activities.
   * @param {Array} medications List of patient meds (e.g., ['Beta Blockers', 'Blood Thinners'])
   * @param {String} activityType Type of therapy (e.g., 'High Intensity Cardio', 'Balance Training')
   */
  static checkDrugTherapyConflict(medications, activityType) {
    const alerts = [];

    // Knowledge Base of Contraindications (Simplified Schema)
    const rules = [
      {
        med: 'Beta Blockers',
        activity: 'High Intensity Cardio',
        risk: 'HIGH',
        msg: 'Heart rate response blunted. Use RPE scale instead of HR.',
      },
      {
        med: 'Blood Thinners',
        activity: 'Fall Risk Activities',
        risk: 'CRITICAL',
        msg: 'High bleeding risk on impact. Ensure extra safety harness.',
      },
      { med: 'Muscle Relaxants', activity: 'Balance Training', risk: 'MODERATE', msg: 'Drowsiness/Instability risk. monitor closely.' },
    ];

    medications.forEach(med => {
      rules.forEach(rule => {
        if (med.toLowerCase().includes(rule.med.toLowerCase()) && activityType.toLowerCase().includes(rule.activity.toLowerCase())) {
          alerts.push({
            type: 'DRUG_THERAPY_INTERACTION',
            severity: rule.risk,
            message: `Interaction detected: ${med} + ${activityType}. ${rule.msg}`,
          });
        }
      });
    });

    return alerts;
  }

  /**
   * Analyzes notes from different disciplines to find hidden risks.
   * Example: Speech Therapist notes "Coughing during water" -> Alert OT/Dietician for "Dysphagia"
   */
  static async analyzeCrossDisciplineRisks(patientId) {
    // In a real app, we would query the last 5 session notes from all disciplines
    // For simulation, we'll check the patient's "Critical Alerts" or recent tags

    const patient = await Beneficiary.findById(patientId);
    if (!patient) return [];

    const disciplinaryNotes = [
      { discipline: 'SLP', note: 'Patient exhibited coughing signs while drinking water today.' },
      { discipline: 'PT', note: 'Patient seems fatigued, balance is off.' },
    ];
    // Checks logic would go here scanning for keywords

    const newAlerts = [];

    // SLP -> Nutrition/OT Rule
    const slpNote = disciplinaryNotes.find(n => n.discipline === 'SLP');
    if (slpNote && slpNote.note.toLowerCase().includes('coughing')) {
      newAlerts.push({
        targetDiscipline: 'Occupational Therapy',
        source: 'Speech Therapy',
        alert: 'Possible Dysphagia / Choking Risk detected in SLP session. Please evaluate feeding safety.',
      });
    }

    // PT -> General Rule
    const ptNote = disciplinaryNotes.find(n => n.discipline === 'PT');
    if (ptNote && ptNote.note.toLowerCase().includes('balance')) {
      newAlerts.push({
        targetDiscipline: 'Nursing',
        source: 'Physical Therapy',
        alert: 'Fall Risk elevated based on recent PT balance scores.',
      });
    }

    if (newAlerts.length > 0) {
      // Notify relevant departments
      await SmartNotificationService.broadcastToRole('CLINICAL_MANAGER', 'CDSS Alert: Cross-Discipline Risk Detected', 'WARNING');
    }

    return newAlerts;
  }

  /**
   * Simulates simple Vital Sign monitoring from IoT devices
   * Triggers alert if trend is dangerous
   */
  static analyzeVitalTrends(patientId, vitalsData) {
    // vitalsData: [{ hr: 110, date: '...' }, { hr: 115, date: '...' }]
    const lastReading = vitalsData[vitalsData.length - 1];

    if (lastReading.hr > 120) {
      return {
        status: 'DANGER',
        message: 'Tachycardia alert. Heart rate > 120 bpm at rest.',
      };
    }
    return { status: 'NORMAL', message: 'Vitals stable.' };
  }
}

module.exports = SmartCDSSService;
module.exports.instance = new SmartCDSSService();
