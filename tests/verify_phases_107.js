const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/nutrition-smart';
const PATIENT_ID = 'TEST_PATIENT_NUTRITION';

async function verifyNutrition() {
  console.log('---------------------------------------------------');
  console.log('🍎 PHASE 107 VERIFICATION: Smart Metabolic & Nutrition');
  console.log('---------------------------------------------------');

  try {
    // 1. Generate Plan (Triggers Command Center Fetch)
    console.log(`\n1. Generating Dynamic Nutrition Plan for [${PATIENT_ID}]...`);
    const planRes = await axios.get(`${BASE_URL}/plan/${PATIENT_ID}`);

    const plan = planRes.data.plan;
    console.log(`   Date: ${plan.date}`);
    console.log(`   Calorie Target: ${plan.targets.calories} kcal`);
    console.log(`   Hydration Target: ${plan.targets.hydrationML} ml`);
    console.log(`   Logic: ${plan.adjustments.reason}`);
    console.log(`   Temp Logic: ${plan.adjustments.tempFactor}`);

    // 2. Log Meal
    console.log(`\n2. Logging Breakfast...`);
    const logRes = await axios.post(`${BASE_URL}/log-meal`, {
      patientId: PATIENT_ID,
      mealData: { name: 'Oatmeal', calories: 350, protein: 12 },
    });
    console.log(`   Status: ${logRes.data.result.status}`);
    console.log(`   Total Calories Consumed: ${logRes.data.result.totalCaloriesToday}`);

    if (logRes.data.result.totalCaloriesToday === 350) {
      console.log('\n✅ NUTRITION UNIT VERIFIED: Dynamic targets & logging operational.');
      console.log('PHASE 107 VERIFICATION SUCCESSFUL');
      process.exit(0);
    } else {
      throw new Error('Calorie sum mismatch');
    }
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    if (error.response) console.error('Response:', error.response.data);
    process.exit(1);
  }
}

setTimeout(verifyNutrition, 1000);
