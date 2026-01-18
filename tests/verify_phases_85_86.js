const SmartAlumniService = require('../backend/services/smartAlumni.service');
const SmartLibraryService = require('../backend/services/smartLibrary.service');

async function testPhase85() {
  console.log('Testing Phase 85: Smart Alumni...');
  try {
    const survey = await SmartAlumniService.conduclFollowUp('AL-001');
    console.log('Follow Up Survey:', survey ? 'Generated' : 'Failed');

    const story = await SmartAlumniService.generateSuccessStory('AL-001');
    console.log('Success Story:', story ? 'Drafted' : 'Failed');
  } catch (e) {
    console.error('Phase 85 Error:', e.message);
  }
}

async function testPhase86() {
  console.log('\nTesting Phase 86: Smart Library...');
  try {
    // Test Checkout Logic
    try {
      await SmartLibraryService.checkOutItem('BK-55', 'User-1'); // Should fail (Status LOANED)
    } catch (e) {
      console.log('Expected Block (Loaned Item):', e.message === 'Item is currently unavailable' ? 'Success' : 'Failed');
    }

    // Test Recommendation
    const recs = await SmartLibraryService.recommendToy({ type: 'Seeker' });
    console.log('AI Recommendations:', recs.recommendedItems.length > 0 ? 'Success' : 'Failed');

    // Test Return Process
    const returnProcess = await SmartLibraryService.markReturned('TOY-101');
    console.log('Sanitization Flag:', returnProcess.quarantineRequired ? 'Success' : 'Failed');
  } catch (e) {
    console.error('Phase 86 Error:', e.message);
  }
}

(async () => {
  await testPhase85();
  await testPhase86();
})();
