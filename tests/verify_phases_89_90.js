const SmartCreativeArtsService = require('../backend/services/smartCreativeArts.service');
const SmartSleepService = require('../backend/services/smartSleep.service');

async function testPhase89() {
  console.log('Testing Phase 89: Smart Creative Arts...');
  try {
    const art = await SmartCreativeArtsService.analyzeArtwork('PAT-10', '/images/drawing1.jpg');
    console.log('Art Analysis Mood:', art.detectedMood === 'Agitated/Intense' ? 'Success' : 'Failed');

    const playlist = await SmartCreativeArtsService.generatePlaylist('PAT-10', 'CALM');
    console.log('Music Therapy Playlist:', playlist.tracks.includes('Ocean Sounds.mp3') ? 'Success' : 'Failed');
  } catch (e) {
    console.error('Phase 89 Error:', e.message);
  }
}

async function testPhase90() {
  console.log('\nTesting Phase 90: Smart Sleep...');
  try {
    // Test Good Sleep
    const goodLog = await SmartSleepService.logSleep('PAT-10', '2026-01-15', 8, 'GOOD');
    console.log('Normal Sleep Entry:', goodLog.alert === null ? 'Success' : 'Failed');

    // Test Bad Sleep (Alert Trigger)
    const badLog = await SmartSleepService.logSleep('PAT-10', '2026-01-16', 4, 'POOR');
    console.log('Sleep Deprivation Alert:', badLog.alert.type === 'SLEEP_DEPRIVATION' ? 'Success' : 'Failed');

    const window = await SmartSleepService.predictAlertnessWindow('PAT-10');
    console.log('Bio-Rhythm Prediction:', window.peakWindow.start === '08:00' ? 'Success' : 'Failed');
  } catch (e) {
    console.error('Phase 90 Error:', e.message);
  }
}

(async () => {
  await testPhase89();
  await testPhase90();
})();
