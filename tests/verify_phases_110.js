const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/gateway-smart';
const PATIENT_ID = 'TEST_PATIENT_DEVICE_01';

async function verifyGateway() {
  console.log('---------------------------------------------------');
  console.log('📶 PHASE 110 VERIFICATION: Smart Device Gateway');
  console.log('---------------------------------------------------');

  try {
    // 1. Simulating Fitbit Webhook
    console.log(`\n1. Simulating Fitbit Webhook Push...`);
    const fitbitPayload = {
      patientId: PATIENT_ID,
      data: {
        activities: [
          {
            heartRate: [{ value: 85 }],
            steps: 4500,
          },
        ],
      },
    };
    const fitbitRes = await axios.post(`${BASE_URL}/fitbit/webhook`, fitbitPayload);
    const fbResult = fitbitRes.data.result;
    console.log(`   Status: ${fbResult.status}`);
    console.log(`   Data: HR=${fbResult.data.heartRate}, Steps=${fbResult.data.steps}`);

    // 2. Simulating Apple Health Upload
    console.log(`\n2. Simulating Apple Health Upload...`);
    const applePayload = {
      patientId: PATIENT_ID,
      metrics: {
        bpm: 88,
        stepCount: 4600,
        flightsClimbed: 5,
      },
    };
    const appleRes = await axios.post(`${BASE_URL}/apple-health/upload`, applePayload);
    const apResult = appleRes.data.result;
    console.log(`   Status: ${apResult.status}`);
    console.log(`   Data: HR=${apResult.data.heartRate}, Steps=${apResult.data.steps}, Floors=${apResult.data.floors}`);

    if (fbResult.data.source === 'FITBIT' && apResult.data.source === 'APPLE_HEALTH') {
      console.log('\n✅ GATEWAY VERIFIED: Successfully normalized external API data.');
      console.log('PHASE 110 VERIFICATION SUCCESSFUL');
      process.exit(0);
    } else {
      throw new Error('Source mismatch in gateway response');
    }
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    if (error.response) console.error('Response:', error.response.data);
    process.exit(1);
  }
}

setTimeout(verifyGateway, 1000);
