const SmartSensoryDietService = require('../backend/services/smartSensoryDiet.service');
const SmartNeuroFeedbackService = require('../backend/services/smartNeuroFeedback.service');

async function testPhase93() {
  console.log('Testing Phase 93: Smart Sensory Diet...');
  try {
    const diet = await SmartSensoryDietService.generateDailyDiet('PAT-ZZ', 'SENSORY_SEEKER');
    console.log('Diet Generation (Seeker):', diet.schedule.length === 3 ? 'Success' : 'Failed');

    const suggestion = await SmartSensoryDietService.suggestRegulation('PAT-ZZ', 'Child is Climbing furniture');
    console.log('Regulation Suggestion:', suggestion.state === 'SEEKING_PROPRIOCEPTION' ? 'Success' : 'Failed');
  } catch (e) {
    console.error('Phase 93 Error:', e.message);
  }
}

async function testPhase94() {
  console.log('\nTesting Phase 94: Smart Neuro-Feedback...');
  try {
    // Mock Focused State (High Beta, Low Alpha)
    const focused = await SmartNeuroFeedbackService.processEEGStream('PAT-ZZ', { alpha: 0.1, beta: 0.9, theta: 0.1, delta: 0.1 });
    console.log('EEG Processing (Focused):', focused.computed.state === 'FOCUSED' ? 'Success' : 'Failed');

    // Mock Anomaly (High Delta)
    const anomaly = await SmartNeuroFeedbackService.checkAnomalies({ delta: 0.95 });
    console.log('Anomaly Detection:', anomaly.warning === 'HIGH_DELTA' ? 'Success' : 'Failed');
  } catch (e) {
    console.error('Phase 94 Error:', e.message);
  }
}

(async () => {
  await testPhase93();
  await testPhase94();
})();
