const SmartClinicalCommandService = require('./smartClinicalCommand.service');
const SmartPredictiveService = require('./smartPredictiveAI.service');
const SmartPsychotherapyService = require('./smartPsychotherapy.service');
const SmartNutritionService = require('./smartNutrition.service');

class SmartPatientIntegratorService {
  // THE DIGITAL TWIN AGGREGATOR
  static async getPatientDigitalTwin(patientId) {
    console.log(`[Integrator] Building Digital Twin for ${patientId}...`);

    try {
      // 1. Fetch from Command Center (The Physical Body)
      // Use the comprehensive snapshot method which simulates fetching relevant modules
      const snapshot = await SmartClinicalCommandService.getPatientCommandSnapshot(patientId);
      const vitals = snapshot.modules.wearable || { liveHeartRate: 75, liveSpO2: 98, stressIndex: 10 };

      // 2. Fetch AI Prediction (The Future)
      // Passes the current snapshot to the AI engine
      const prediction = await SmartPredictiveService.generateForecast(patientId, snapshot);

      // 3. Fetch Psych State (The Mind)
      // Access internal store of the Psych service instance
      let psychScore = 5; // Default low anxiety
      const psychData = SmartPsychotherapyService.patientRecords ? SmartPsychotherapyService.patientRecords.get(patientId) : null;
      if (psychData && psychData.assessments && psychData.assessments.length > 0) {
        // Get latest assessment
        const lastAsmt = psychData.assessments[psychData.assessments.length - 1];
        psychScore = lastAsmt.score;
      }

      // 4. Fetch Nutrition (The Fuel)
      const nutrition = await SmartNutritionService.generateDailyPlan(patientId);

      // 5. Calculate Holistic Health Score (0-100)
      const scores = {
        // Determine physical score based on SpO2 (Simple logic)
        physical: vitals.liveSpO2 && vitals.liveSpO2 >= 95 ? 100 : 80,

        // GAD-7: 0-21. Low is good. Score = 100 - (GAD * 4). e.g. GAD 0 -> 100. GAD 21 -> 16.
        mental: Math.max(0, 100 - psychScore * 4),

        // Nutrition Score
        nutritional: nutrition.targets && nutrition.targets.calories > 1500 ? 100 : 90,
      };

      const holisticScore = Math.round((scores.physical + scores.mental + scores.nutritional) / 3);

      let status = 'BALANCED';
      if (holisticScore < 70) status = 'REQUIRING_ATTENTION';
      if (holisticScore < 50) status = 'CRITICAL';

      return {
        patientId,
        timestamp: new Date(),
        holisticStatus: status,
        integratedScore: holisticScore,
        layers: {
          physical: {
            source: 'Phase 101',
            data: vitals,
            score: scores.physical,
          },
          mental: {
            source: 'Phase 105',
            data: psychData ? 'Active Records' : 'No Data',
            score: scores.mental,
          },
          future_outlook: {
            source: 'Phase 102',
            recoveryProbability: prediction.forecast ? prediction.forecast.confidenceScore / 100 : 0,
          },
          metabolic: {
            source: 'Phase 107',
            targetHydration: nutrition.targets.hydrationML,
          },
        },
        recommendation: this.generateHolisticRecommendation(status, scores),
      };
    } catch (error) {
      console.error('Integrator Error:', error);
      throw { message: 'Failed to build Digital Twin', error: error.message };
    }
  }

  static generateHolisticRecommendation(status, scores) {
    if (status === 'CRITICAL') return 'IMMEDIATE INTERVENTION: Multi-disciplinary team review required.';

    if (scores.mental < 70) return 'Suggest increasing Meditation VR sessions (Phase 104) and CBT flow (Phase 105).';
    if (scores.physical < 80) return 'Review Clinical Vitals and adjust Medication (Phase 103).';

    return 'Maintain current integral therapy plan.';
  }
}

module.exports = SmartPatientIntegratorService;
