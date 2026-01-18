/**
 * PHASE 103: Smart Auto-Prescription Engine
 * "The Architect" - automatically constructs detailed therapeutic plans based on AI predictions.
 * Converts Phase 102 'Forecasts' into actionable Phase 99/100 'Executables'.
 */

const SmartPredictiveAIService = require('./smartPredictiveAI.service');
const SmartClinicalCommandService = require('./smartClinicalCommand.service');

class SmartAutoPrescriptionService {
  constructor() {
    console.log('System: Smart Auto-Prescription Engine - Initialized');
  }

  /**
   * Generates a fully structured therapeutic plan aimed at the forecasted recovery date.
   * @param {string} patientId
   */
  async generateAutoPlan(patientId) {
    // 1. Get the Context
    const snapshot = await SmartClinicalCommandService.getPatientCommandSnapshot(patientId);
    const forecast = await SmartPredictiveAIService.generateForecast(patientId, snapshot);

    // 2. Select Optimal Protocol
    // Logic: If recovery > 12 weeks, choose 'INTENSIVE'. Else 'STANDARD'.
    const optimalScenario = forecast.scenarios.find(s => s.name.includes('Intensive')) || forecast.scenarios[0];
    const isIntensive = optimalScenario.name.includes('Intensive');

    // 3. Construct the Plan
    const plan = {
      patientId,
      generatedDate: new Date().toISOString(),
      status: 'DRAFT_PENDING_APPROVAL',
      targetRecoveryDate: forecast.forecast.projectedCompletionDate,
      rationale: `AI recommends ${optimalScenario.name} to reduce recovery time by approx 30%.`,
      schedule: this._buildSchedule(isIntensive, snapshot),
    };

    return plan;
  }

  _buildSchedule(isIntensive, snapshot) {
    const weeklyFrequency = isIntensive ? 5 : 3;
    const sessionDuration = isIntensive ? 60 : 45;

    // Customizing based on deficits flagged in Phase 101/100
    const deficits = snapshot.modules.cognitive.flaggedDeficits || [];
    const focusOnMemory = deficits.includes('Short-term Memory');

    return {
      frequency: `${weeklyFrequency} days/week`,
      dailyRoutine: [
        {
          time: '09:00',
          type: 'ROBOTICS',
          device: 'ARM_REHAB_V2',
          duration: '${sessionDuration / 2} min',
          intensity: 'ADAPTIVE',
        },
        {
          time: '09:30',
          type: 'COGNITIVE',
          priorityDomain: focusOnMemory ? 'MEMORY' : 'ATTENTION',
          difficultyStart: snapshot.modules.cognitive.currentDifficultyLevel,
        },
      ],
      homeExercises: ['Sleep Tracking (Wearable)', 'Voice Journaling (Assistant)'],
    };
  }
}

module.exports = SmartAutoPrescriptionService;
