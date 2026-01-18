const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
// Use unique IDs to avoid conflicts during repeated runs
const TEST_TIMESTAMP = Date.now();
const PATIENT_ID = `p_97_98_${TEST_TIMESTAMP}`;
const DEVICE_ID = `dev_97_${TEST_TIMESTAMP}`;

async function verifyWearable() {
  console.log('\n--- Verifying Phase 97: Smart Wearable (IoT) ---');

  try {
    // 1. Register Device
    console.log('1. Registering Device...');
    const regRes = await axios.post(`${BASE_URL}/wearable-smart/register`, {
      patientId: PATIENT_ID,
      deviceId: DEVICE_ID,
      deviceType: 'APPLE_WATCH',
    });

    if (regRes.data.success) {
      console.log('   ✓ Device Registered');
    } else {
      throw new Error('Registration failed');
    }

    // 2. Ingest Telemetry (Normal)
    console.log('2. Ingesting Normal Telemetry...');
    await axios.post(`${BASE_URL}/wearable-smart/telemetry`, {
      deviceId: DEVICE_ID,
      data: { heartRate: 75, spo2: 98, activityLevel: 'WALKING', stressLevel: 20 },
    });
    console.log('   ✓ Normal Telemetry Ingested');

    // 3. Ingest Telemetry (Anomaly)
    console.log('3. Ingesting Anomaly Telemetry (High Stress)...');
    const anomalyRes = await axios.post(`${BASE_URL}/wearable-smart/telemetry`, {
      deviceId: DEVICE_ID,
      data: { heartRate: 110, spo2: 96, activityLevel: 'REST', stressLevel: 85 },
    });

    if (anomalyRes.data.analysis.anomalies.includes('HIGH_STRESS')) {
      console.log('   ✓ Anomaly Detected: HIGH_STRESS');
      console.log(`   ✓ Recommendation: ${anomalyRes.data.analysis.recommendation}`);
    } else {
      throw new Error('Anomaly detection failed');
    }
  } catch (error) {
    console.error('❌ Phase 97 Failed:', error.message);
    if (error.code) console.error('Error Code:', error.code);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

async function verifyVoiceAssistant() {
  console.log('\n--- Verifying Phase 98: Smart Voice Assistant ---');

  try {
    // 1. Check Intents
    const intentsRes = await axios.get(`${BASE_URL}/voice-assistant-smart/intents`);
    if (intentsRes.data.intents.length > 0) {
      console.log('   ✓ Intents Registry Verified');
    }

    // 2. Process Command (Schedule)
    console.log('2. Testing Voice Command: "Schedule an appointment"...');
    const cmdRes = await axios.post(`${BASE_URL}/voice-assistant-smart/command`, {
      userId: 'staff_01',
      text: 'Please schedule an appointment for patient X',
    });

    if (cmdRes.data.success && cmdRes.data.intent === 'SCHEDULE_APPOINTMENT') {
      console.log(`   ✓ Intent Recognized: ${cmdRes.data.intent}`);
      console.log(`   ✓ Response: "${cmdRes.data.response}"`);
    } else {
      throw new Error('Voice command processing failed');
    }

    // 3. Process Command (Prediction Integration)
    console.log('3. Testing Integration Command: "Get prediction"...');
    const predRes = await axios.post(`${BASE_URL}/voice-assistant-smart/command`, {
      userId: 'admin_01',
      text: 'Get prediction for this intervention',
    });

    if (predRes.data.intent === 'GET_PREDICTION') {
      console.log(`   ✓ Complex Intent Recognized: ${predRes.data.intent}`);
    } else {
      throw new Error('Prediction intent failed');
    }
  } catch (error) {
    console.error('❌ Phase 98 Failed:', error.message);
    if (error.response) console.error(error.response.data);
    process.exit(1);
  }
}

async function run() {
  await verifyWearable();
  await verifyVoiceAssistant();
  console.log('\n✅ PHASES 97 & 98 VERIFICATION SUCCESSFUL\n');
}

run();
