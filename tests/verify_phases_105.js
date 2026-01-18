const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/psychotherapy-smart';
const PATIENT_ID = 'TEST_PATIENT_PSYCHO';

async function verifyPsychotherapy() {
  console.log('---------------------------------------------------');
  console.log('🧠 PHASE 105 VERIFICATION: Smart Psychotherapy Unit');
  console.log('---------------------------------------------------');

  try {
    // 1. Fetch CBT Flow
    console.log(`\n1. Fetching Anxiety CBT Flow...`);
    const flowRes = await axios.get(`${BASE_URL}/cbt-flow/ANXIETY`);
    console.log(`   Flow Title: ${flowRes.data.data.title}`);
    console.log(`   Steps: ${flowRes.data.data.steps.length}`);

    // 2. Submit Assessment (GAD-7)
    console.log(`\n2. Submitting GAD-7 Assessment (Simulating Severe Anxiety)...`);
    const assessRes = await axios.post(`${BASE_URL}/assessment`, {
      patientId: PATIENT_ID,
      type: 'GAD-7',
      responses: { q1: 3, q2: 3, q3: 2, q4: 3, q5: 2, q6: 3, q7: 2 }, // High score
    });
    console.log(`   Score: ${assessRes.data.result.score}`);
    console.log(`   Interpretation: ${assessRes.data.result.interpretation}`);

    if (assessRes.data.result.interpretation !== 'SEVERE_ANXIETY') {
      throw new Error('Assessment scoring logic failed');
    }

    // 3. Thought Record
    console.log(`\n3. Recording Automatic Thought...`);
    const thoughtRes = await axios.post(`${BASE_URL}/thought-record`, {
      patientId: PATIENT_ID,
      thoughtData: {
        situation: 'Presentation at work',
        thought: 'Everyone will laugh at me',
        emotion: 'Fear',
        alternative: 'I have prepared well, and colleagues are supportive.',
      },
    });
    console.log(`   Alternative Thought: ${thoughtRes.data.result.alternativeThought}`);

    console.log('\n✅ PSYCHOTHERAPY UNIT VERIFIED: Flows, Assessments, and Records operational.');
    console.log('PHASE 105 VERIFICATION SUCCESSFUL');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    if (error.response) console.error('Response:', error.response.data);
    process.exit(1);
  }
}

setTimeout(verifyPsychotherapy, 1000);
