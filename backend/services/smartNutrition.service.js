/**
 * PHASE 107: Smart Metabolic & Nutrition Unit (Advanced)
 * "The Fuel System" - Manages the biochemical inputs required for recovery.
 * Dynamically adjusts calorie/hydration targets based on Real-Time Activity (Phase 97) and Environment (Phase 96).
 *
 * *Refactored from Phase 55 Prototype to Phase 107 Production Standard*
 */

const SmartClinicalCommandService = require('./smartClinicalCommand.service');

class SmartNutritionService {
  constructor() {
    console.log('System: Smart Metabolic & Nutrition Unit - Initialized');
    this.dailyLogs = new Map(); // patientId -> { date, meals: [], waterML: 0 }
  }

  /**
   * Generates a dynamic metabolic plan for the day.
   * @param {string} patientId
   */
  async generateDailyPlan(patientId) {
    // 1. Fetch Context from the Hub
    const snapshot = await SmartClinicalCommandService.getPatientCommandSnapshot(patientId);

    // 2. Extract Variables
    // Assuming wearable snapshot provides liveHeartRate.
    // Logic: Avg HR above 80 implies an active day.
    // We handle potential missing data gracefully
    const wearable = snapshot.modules.wearable || {};
    const activityLevel = wearable.liveHeartRate > 80 ? 'HIGH' : 'MODERATE';

    // IoT Temp from Phase 96
    const iot = snapshot.modules.iot || {};
    const ambientTemp = iot.roomTemp || 22;

    // 3. Calculate Dynamic Targets
    // Base BMR (Mocked) + Activity Factor
    let calorieTarget = 2000;
    if (activityLevel === 'HIGH') calorieTarget += 300; // Extra fuel for rehab

    // Hydration: Base 2500ml + 100ml for every degree over 24C
    let hydrationTarget = 2500;
    if (ambientTemp > 24) {
      hydrationTarget += (ambientTemp - 24) * 100;
    }

    // 4. Generate Menu (AI Mock)
    const recommendedMenu = {
      breakfast: 'Oatmeal with Walnuts (Brain Health)',
      lunch: 'Grilled Chicken Salad (Protein)',
      dinner: 'Salmon with Quinoa (Omega-3)',
      snacks: activityLevel === 'HIGH' ? ['Protein Shake', 'Banana'] : ['Apple'],
    };

    return {
      date: new Date().toISOString().split('T')[0],
      targets: {
        calories: calorieTarget,
        protein: Math.round((calorieTarget * 0.25) / 4), // 25% protein
        hydrationML: hydrationTarget,
      },
      adjustments: {
        reason: activityLevel === 'HIGH' ? 'High active rehab session detected' : 'Standard day',
        tempFactor: ambientTemp > 24 ? 'Increased hydration due to heat' : 'Normal hydration',
      },
      menu: recommendedMenu,
    };
  }

  /**
   * Log a meal consumption
   */
  async logMeal(patientId, mealData) {
    // mealData: { name: "Apple", calories: 95, protein: 0.5 }
    const log = this._getDailyLog(patientId);
    log.meals.push(mealData);
    return { status: 'LOGGED', totalCaloriesToday: this._sumCalories(log) };
  }

  _getDailyLog(patientId) {
    if (!this.dailyLogs.has(patientId)) {
      this.dailyLogs.set(patientId, { meals: [], waterML: 0 });
    }
    return this.dailyLogs.get(patientId);
  }

  _sumCalories(log) {
    return log.meals.reduce((sum, item) => sum + item.calories, 0);
  }

  // Legacy support for Phase 55 correlation if needed
  async analyzeGutBrainAxis(patientId) {
    return { insight: 'Legacy analysis moved to Advanced Analytics Module.' };
  }
}

module.exports = SmartNutritionService;
