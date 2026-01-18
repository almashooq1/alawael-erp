const SmartBehaviorService = require('../backend/services/smartBehavior.service');
const SmartAACService = require('../backend/services/smartAAC.service');

async function testPhase91() {
  console.log('Testing Phase 91: Smart Behavior...');
  try {
    const incident = await SmartBehaviorService.logIncident('PAT-XY', { trigger: 'Loud Noise', behavior: 'Crying' });
    console.log('Incident Logged:', incident.logId ? 'Success' : 'Failed');
    console.log('AI Insight:', incident.immediateInsight ? 'Generated' : 'None');

    const risk = await SmartBehaviorService.predictMeltdownRisk('PAT-XY', { noiseLevel: '80dB', crowdDensity: 'High' });
    console.log('Risk Prediction:', risk.riskLevel === 'HIGH' ? 'Success' : 'Failed');
  } catch (e) {
    console.error('Phase 91 Error:', e.message);
  }
}

async function testPhase92() {
  console.log('\nTesting Phase 92: Smart AAC...');
  try {
    // Test Lunch Context
    const lunchPred = await SmartAACService.predictNextSymbol('USER-1', 'I want', { time: '12:30', location: 'Cafeteria' });
    console.log('Context Prediction (Lunch):', lunchPred.predictedSymbols.includes('Water') ? 'Success' : 'Failed');

    // Test Playground Context
    const playPred = await SmartAACService.predictNextSymbol('USER-1', 'I want', { location: 'Playground' });
    console.log('Context Prediction (Play):', playPred.predictedSymbols.includes('Swing') ? 'Success' : 'Failed');

    const board = await SmartAACService.generateDynamicBoard('Zoo Trip');
    console.log('Board Generation:', board.symbols.length > 0 ? 'Success' : 'Failed');
  } catch (e) {
    console.error('Phase 92 Error:', e.message);
  }
}

(async () => {
  await testPhase91();
  await testPhase92();
})();
