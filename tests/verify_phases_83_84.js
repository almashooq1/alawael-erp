const SmartQualityControlService = require('../backend/services/smartQualityControl.service');
const SmartKnowledgeGraphService = require('../backend/services/smartKnowledgeGraph.service');

async function testPhase83() {
  console.log('Testing Phase 83: Smart Quality Control...');
  try {
    const audit = await SmartQualityControlService.runMockSurvey('JCI');
    console.log('Mock JCI Survey:', audit ? `Generated (Score: ${audit.overallScore})` : 'Failed');
  } catch (e) {
    console.error('Phase 83 Error:', e.message);
  }
}

async function testPhase84() {
  console.log('\nTesting Phase 84: Smart Knowledge Graph...');
  try {
    const graph = await SmartKnowledgeGraphService.buildEntityGraph('PAT-101', 'Patient');
    console.log('Build Graph:', graph && graph.nodes.length > 0 ? 'Success' : 'Failed');

    const connection = await SmartKnowledgeGraphService.discoverConnections('Staff-A', 'Incident-B');
    console.log('Connection Discovery:', connection ? 'Success' : 'Failed');
  } catch (e) {
    console.error('Phase 84 Error:', e.message);
  }
}

(async () => {
  await testPhase83();
  await testPhase84();
})();
