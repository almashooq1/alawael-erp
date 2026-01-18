const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/patient-integrator-smart';
const PATIENT_ID = 'TEST_DIGITAL_TWIN_01';

async function verifyIntegrator() {
  console.log('---------------------------------------------------');
  console.log('🧬 PHASE 108 VERIFICATION: Smart Patient Digital Twin');
  console.log('---------------------------------------------------');

  try {
    console.log(`\n1. Requesting Digital Twin for [${PATIENT_ID}]...`);
    const res = await axios.get(`${BASE_URL}/digital-twin/${PATIENT_ID}`);

    const twin = res.data.data;
    console.log(`   Status: ${twin.holisticStatus}`);
    console.log(`   Integrated Score: ${twin.integratedScore}/100`);
    console.log(`   Recommendation: ${twin.recommendation}`);

    console.log('\n   [Layers Integration Check]:');
    console.log(`   - Physical (Phase 101): HR ${twin.layers.physical.data.liveHeartRate} bpm`);
    console.log(`   - Mental (Phase 105): Score ${twin.layers.mental.score}`);
    console.log(`   - Future (Phase 102): Recovery Prob ${(twin.layers.future_outlook.recoveryProbability * 100).toFixed(1)}%`);
    console.log(`   - Metabolic (Phase 107): Target Water ${twin.layers.metabolic.targetHydration}ml`);

    if (twin.integratedScore && twin.layers.physical && twin.layers.metabolic) {
      console.log('\n✅ INTEGRATOR VERIFIED: Successfully aggregated all bio-psycho-social layers.');
      console.log('PHASE 108 VERIFICATION SUCCESSFUL');
      process.exit(0);
    } else {
      throw new Error('Missing layer data in Digital Twin');
    }
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    if (error.response) console.error('Response:', error.response.data);
    process.exit(1);
  }
}

setTimeout(verifyIntegrator, 1000);
