const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/predictive-ai-smart';
const PATIENT_ID = 'TEST_PATIENT_FUTURE';

async function verifyPredictiveAI() {
    console.log("---------------------------------------------------");
    console.log("🔮 PHASE 102 VERIFICATION: Predictive Recovery AI");
    console.log("---------------------------------------------------");

    try {
        console.log(`\n1. Requesting Future Forecast for [${PATIENT_ID}]...`);
        // This implicitly triggers Phase 101 data collection first
        const response = await axios.get(`${BASE_URL}/forecast/${PATIENT_ID}`);
        
        if (response.status === 200 && response.data.success) {
            console.log("✅ Forecast Generated Successfully.");
            
            const data = response.data.data;
            console.log("\n--- RECOVERY FORECAST ---");
            console.log(`Used Model: ${data.modelUsed}`);
            console.log(`Est. Weeks to Recovery: ${data.forecast.weeksToRecovery}`);
            console.log(`Projected Date: ${data.forecast.projectedCompletionDate}`);
            
            console.log("\n--- SCENARIO ANALYSIS ---");
            data.scenarios.forEach(s => {
                console.log(`> [${s.name}]: ${s.outcome}`);
            });

            // Validation logic
            if (data.forecast.weeksToRecovery > 0 && data.scenarios.length > 0) {
                 console.log("\n✅ AI LOGIC VERIFIED: Valid projections returned.");
                 console.log("PHASE 102 VERIFICATION SUCCESSFUL");
                 process.exit(0);
            } else {
                 throw new Error("Invalid forecast data (Zero weeks or missing scenarios)");
            }

        } else {
            throw new Error("API returned failure status");
        }

    } catch (error) {
        console.error("\n❌ VERIFICATION FAILED:", error.message);
        if (error.response) console.error("Response:", error.response.data);
        process.exit(1);
    }
}

setTimeout(verifyPredictiveAI, 1000);
