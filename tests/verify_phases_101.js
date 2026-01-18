const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/command-center-smart';
const PATIENT_ID = 'TEST_PATIENT_101';

async function verifyCommandCenter() {
  console.log('---------------------------------------------------');
  console.log('🔍 PHASE 101 VERIFICATION: Smart Clinical Command Center');
  console.log('---------------------------------------------------');

  try {
    console.log(`\n1. Fetching Holistic Snapshot for [${PATIENT_ID}]...`);
    const response = await axios.get(`${BASE_URL}/snapshot/${PATIENT_ID}`);

    if (response.status === 200 && response.data.success) {
      console.log('✅ Snapshot Retrieved Successfully.');

      const data = response.data.data;
      console.log('\n--- CLINICAL COMMAND SNAPSHOT ---');
      console.log(`ID: ${data.meta.patientId}`);
      console.log(`Timestamp: ${data.meta.timestamp}`);
      console.log(`Overall State: [ ${data.status.overallState} ]`);

      console.log('\n--- INTEGRATED MODULES ---');
      console.log(`⌚ Wearable HR: ${data.modules.wearable.liveHeartRate} bpm`);
      console.log(`🤖 Robot Status: ${data.modules.robotics.calibrationStatus}`);
      console.log(`🧠 Cognitive Lvl: ${data.modules.cognitive.currentDifficultyLevel}`);
      console.log(`🏠 Env Temp: ${data.modules.iot.roomTemp}°C`);

      console.log('\n--- AI INSIGHT ---');
      console.log(`💡 ${data.clinicalInsight}`);

      // Validation Logic
      if (data.modules.wearable && data.modules.robotics && data.modules.cognitive) {
        console.log('\n✅ DATA FUSION VERIFIED: All streams present.');
        console.log('PHASE 101 VERIFICATION SUCCESSFUL');
        process.exit(0);
      } else {
        throw new Error('Missing data streams in snapshot');
      }
    } else {
      throw new Error('API returned failure status');
    }
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    if (error.response) console.error('Response:', error.response.data);
    process.exit(1);
  }
}

// Wait for server to be ready (if run in parallel, though usually run against running server)
setTimeout(verifyCommandCenter, 1000);
