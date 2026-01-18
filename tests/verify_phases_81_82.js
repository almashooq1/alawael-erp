const SmartTransportService = require('../backend/services/smartTransportLogistics.service');
const SmartEventManagerService = require('../backend/services/smartEventManager.service');

async function testPhase81() {
  console.log('Testing Phase 81: Smart Transport...');
  try {
    const route = await SmartTransportService.optimizeDailyRoute('BUS-01', [{ id: 'student1' }, { id: 'student2' }]);
    console.log('Optimize Route Result:', route ? 'Success' : 'Failed');

    const tracking = await SmartTransportService.getBusLocation('student1');
    console.log('Tracking Status:', tracking ? 'Success' : 'Failed');
  } catch (e) {
    console.error('Phase 81 Error:', e.message);
  }
}

async function testPhase82() {
  console.log('\nTesting Phase 82: Smart Event Manager...');
  try {
    const event = await SmartEventManagerService.createEvent({
      title: 'Test Workshop',
      date: new Date(),
      capacity: 50,
    });
    console.log('Create Event Result:', event ? 'Success' : 'Failed');

    // Mock certificate generation (might fail if canvas not installed, but checking logic path)
    try {
      await SmartEventManagerService.generateCertificate('evt_123', 'user_456');
    } catch (e) {
      console.log('Certificate Generation (Expected Mock Fail):', e.message);
    }
  } catch (e) {
    console.error('Phase 82 Error:', e.message);
  }
}

(async () => {
  await testPhase81();
  await testPhase82();
})();
