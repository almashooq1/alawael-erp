const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/auto-prescription-smart';
const PATIENT_ID = 'TEST_PATIENT_ARCHITECT';

async function verifyAutoPrescription() {
  console.log('---------------------------------------------------');
  console.log('📜 PHASE 103 VERIFICATION: Smart Auto-Prescription');
  console.log('---------------------------------------------------');

  try {
    console.log(`\n1. Commanding AI to Generate Plan for [${PATIENT_ID}]...`);
    // This triggers the full chain: Command Center -> Predictive AI -> Prescription Engine
    const response = await axios.post(`${BASE_URL}/generate/${PATIENT_ID}`);

    if (response.status === 200 && response.data.success) {
      console.log('✅ Plan Created Successfully.');

      const plan = response.data.data;
      console.log('\n--- GENERATED THERAPEUTIC PLAN ---');
      console.log(`Status: ${plan.status}`);
      console.log(`Rationale: ${plan.rationale}`);
      console.log(`Target Recovery: ${plan.targetRecoveryDate}`);

      console.log('\n--- SCHEDULE ---');
      console.log(`Frequency: ${plan.schedule.frequency}`);
      console.log(`Morning Routine:`);
      plan.schedule.dailyRoutine.forEach(item => {
        console.log(`   - [${item.time}] ${item.type}: ${item.device || item.priorityDomain}`);
      });

      // Validation logic
      if (plan.schedule.dailyRoutine.length > 0 && plan.rationale.includes('AI recommends')) {
        console.log('\n✅ INTEGRATION VERIFIED: Prediction converted to Action.');
        console.log('PHASE 103 VERIFICATION SUCCESSFUL');
        process.exit(0);
      } else {
        throw new Error('Plan was generated but content is malformed');
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

setTimeout(verifyAutoPrescription, 1000);
