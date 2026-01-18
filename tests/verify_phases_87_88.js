const SmartEthicsService = require('../backend/services/smartEthics.service');
const SmartSportsService = require('../backend/services/smartSports.service');

async function testPhase87() {
  console.log('Testing Phase 87: Smart Ethics...');
  try {
    // Test Valid Consent
    const consent = await SmartEthicsService.captureConsent('PAT-1', 'GUARDIAN-1', 'HIPAA', 'valid_hash_123456');
    console.log('Valid Consent Capture:', consent ? 'Success' : 'Failed');

    // Test Invalid Video
    try {
      await SmartEthicsService.captureConsent('PAT-1', 'GUARDIAN-1', 'HIPAA', 'Bad');
    } catch (e) {
      console.log('Invalid Video Block:', e.message === 'Video verification failed.' ? 'Success' : 'Failed');
    }

    // Test AI Flagging
    const flag = await SmartEthicsService.flagForReview('AI-DEC-99', 'Impact too high');
    console.log('Ethical Review Queue:', flag.status === 'PENDING_HUMAN_REVIEW' ? 'Success' : 'Failed');
  } catch (e) {
    console.error('Phase 87 Error:', e.message);
  }
}

async function testPhase88() {
  console.log('\nTesting Phase 88: Smart Sports...');
  try {
    const stats = await SmartSportsService.logMatchPerformance('ATHLETE-1', 'MATCH-1', { sportsmanship: 'High' });
    console.log('Sports Logic (Badges):', stats.badgesEarned.includes('Fair Play Award') ? 'Success' : 'Failed');

    const scout = await SmartSportsService.scoutTalent();
    console.log('Talent Scout:', scout.candidates.length > 0 ? 'Success' : 'Failed');
  } catch (e) {
    console.error('Phase 88 Error:', e.message);
  }
}

(async () => {
  await testPhase87();
  await testPhase88();
})();
