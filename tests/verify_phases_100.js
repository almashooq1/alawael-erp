const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function verifyCognitiveUnit() {
  console.log('\n--- Verifying Phase 100: Smart Cognitive Training ---');
  try {
    const patientId = 'p_cognitive_100';
    const domain = 'MEMORY';

    // 1. Get Initial Exercise (Should be Level 1)
    console.log('1. Fetching Initial Exercise Configuration...');
    const initRes = await axios.get(`${BASE_URL}/cognitive-smart/exercise`, {
      params: { patientId, domain },
    });

    if (initRes.data.success && initRes.data.data.level === 1) {
      console.log(
        `   ✓ Received Level 1 Config: Grid Size ${initRes.data.data.config.gridSize}, Sequence ${initRes.data.data.config.sequenceLength}`,
      );
    } else {
      throw new Error('Initial level check failed');
    }

    // 2. Submit High Score -> Expect Level Up
    console.log('2. Submitting High Score (95%) -> Expecting Level Up...');
    const resultUp = await axios.post(`${BASE_URL}/cognitive-smart/submit`, {
      patientId,
      sessionData: {
        domain,
        level: 1,
        score: 95,
        reactionTimeMs: 400,
      },
    });

    if (resultUp.data.newLevel === 2 && resultUp.data.levelChange === 'UP') {
      console.log(`   ✓ Adaptation Successful: Level Increased to ${resultUp.data.newLevel}`);
      console.log(`   ✓ Feedback: "${resultUp.data.feedback}"`);
    } else {
      throw new Error('Level up logic failed');
    }

    // 3. Submit Low Score -> Expect Level Down
    console.log('3. Submitting Low Score (40%) -> Expecting Level Down...');
    const resultDown = await axios.post(`${BASE_URL}/cognitive-smart/submit`, {
      patientId,
      sessionData: {
        domain,
        level: 2,
        score: 40,
        reactionTimeMs: 1200,
      },
    });

    if (resultDown.data.newLevel === 1 && resultDown.data.levelChange === 'DOWN') {
      console.log(`   ✓ Adaptation Successful: Level Decreased to ${resultDown.data.newLevel}`);
    } else {
      throw new Error('Level down logic failed');
    }

    // 4. Verify Profile
    console.log('4. Checking Cognitive Profile...');
    const profileRes = await axios.get(`${BASE_URL}/cognitive-smart/profile/${patientId}`);
    const memStats = profileRes.data.profile.MEMORY;

    if (memStats.sessionsCompleted === 2) {
      console.log('   ✓ Profile Updated Correctly');
      console.log(`   ✓ Current Level: ${memStats.currentLevel}`);
      console.log(`   ✓ Avg Score: ${memStats.averageScore}`);
    } else {
      throw new Error('Profile stats incorrect');
    }
  } catch (error) {
    console.error('❌ Phase 100 Failed:', error.message);
    if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
    process.exit(1);
  }
}

async function run() {
  await verifyCognitiveUnit();
  console.log('\n✅ PHASE 100 VERIFICATION SUCCESSFUL\n');
}

run();
