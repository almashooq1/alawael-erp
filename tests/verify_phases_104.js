const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/vr-smart';
const PATIENT_ID = 'TEST_PATIENT_VR_USER';
const DEVICE_ID = 'OCULUS_PRO_X1';

async function verifyVRIntegration() {
  console.log('---------------------------------------------------');
  console.log('🥽 PHASE 104 VERIFICATION: Smart VR Neuro-Feedback');
  console.log('---------------------------------------------------');

  try {
    console.log(`\n1. Initializing VR Session for [${PATIENT_ID}]...`);
    const initResponse = await axios.post(`${BASE_URL}/init-session`, {
      patientId: PATIENT_ID,
      deviceId: DEVICE_ID,
    });

    if (!initResponse.data.success) throw new Error('Init Failed');

    const config = initResponse.data.config;
    console.log('✅ VR Session Initialized.');
    console.log(`   Token: ${config.token}`);
    console.log(`   Environment: ${config.environment}`);
    console.log(`   NeuroFeedback: ${config.neuroFeedbackEnabled ? 'ON' : 'OFF'}`);

    console.log("\n2. Sending 'Low Focus' Telemetry (Simulating Distraction)...");
    const lowFocusResponse = await axios.post(`${BASE_URL}/telemetry`, {
      sessionToken: config.token,
      telemetry: { focusLevel: 35, eyeTrackingVariance: 0.8 },
    });

    console.log(`   Feedback Received: ${lowFocusResponse.data.feedback.adjustEnvironment}`);
    if (lowFocusResponse.data.feedback.adjustEnvironment !== 'BOOST_VISUAL_CUES') {
      throw new Error('Expected BOOST_VISUAL_CUES for low focus');
    }

    console.log("\n3. Sending 'High Focus' Telemetry (Simulating Flow State)...");
    const highFocusResponse = await axios.post(`${BASE_URL}/telemetry`, {
      sessionToken: config.token,
      telemetry: { focusLevel: 95, eyeTrackingVariance: 0.1 },
    });

    console.log(`   Feedback Received: ${highFocusResponse.data.feedback.adjustEnvironment}`);
    if (highFocusResponse.data.feedback.adjustEnvironment !== 'INCREASE_DISTRACTORS') {
      throw new Error('Expected INCREASE_DISTRACTORS for high focus');
    }

    console.log('\n✅ VR INTEGRATION VERIFIED: Full Close-Loop System.');
    console.log('PHASE 104 VERIFICATION SUCCESSFUL');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    if (error.response) console.error('Response:', error.response.data);
    process.exit(1);
  }
}

setTimeout(verifyVRIntegration, 1000);
