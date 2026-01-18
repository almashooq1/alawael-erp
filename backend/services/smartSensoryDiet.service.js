/**
 * Smart Sensory Diet Service (Phase 93)
 *
 * Manages individual "Sensory Diets" - a personalized schedule of sensory activities
 * designed to keep a child regulated (Just Right State) throughout the day.
 */

class SmartSensoryDietService {
  constructor() {
    this.diets = new Map();

    // Sensory Activities Database
    this.activities = {
      PROPRIOCEPTIVE: [
        { id: 'ACT-01', name: 'Weighted Vest', type: 'Calming', duration: '20m' },
        { id: 'ACT-02', name: 'Wall Push-ups', type: 'Organizing', duration: '5m' },
      ],
      VESTIBULAR: [
        { id: 'ACT-03', name: 'Linear Swinging', type: 'Calming', duration: '10m' },
        { id: 'ACT-04', name: 'Spinning', type: 'Alerting', duration: '2m' },
      ],
      TACTILE: [{ id: 'ACT-05', name: 'Bin of Rice', type: 'Calming', duration: '15m' }],
    };
  }

  /**
   * Generate Daily Sensory Diet
   * Based on Child's Sensory Profile (e.g., "Seeker" vs "Avoider")
   */
  async generateDailyDiet(patientId, profileType) {
    console.log(`Generating Sensory Diet for ${patientId} (${profileType})...`);

    let dietPlan = [];

    if (profileType === 'SENSORY_SEEKER') {
      // Need intense input to register
      dietPlan.push({ time: '08:00', activity: this.activities.PROPRIOCEPTIVE[1] }); // Wall Push-ups (Wake up)
      dietPlan.push({ time: '10:00', activity: this.activities.VESTIBULAR[1] }); // Spinning (Break)
      dietPlan.push({ time: '12:00', activity: this.activities.PROPRIOCEPTIVE[0] }); // Weighted Vest (Focus for lunch)
    } else if (profileType === 'SENSORY_AVOIDER') {
      // Need calming, predictable input
      dietPlan.push({ time: '08:00', activity: this.activities.PROPRIOCEPTIVE[0] }); // Weighted Vest (Calm arrival)
      dietPlan.push({ time: '10:00', activity: this.activities.VESTIBULAR[0] }); // Linear Swing (Regulation)
    }

    return {
      dietId: 'DIET-' + Date.now(),
      patientId,
      profile: profileType,
      schedule: dietPlan,
      instructions: 'Monitor for signs of over-stimulation (red ears, hiccups).',
    };
  }

  /**
   * Just-in-Time Regulation Strategy
   * "Child is currently climbing walls (Dysregulated)" -> Suggest activity
   */
  async suggestRegulation(patientId, observedBehavior) {
    // Simple logic map
    if (observedBehavior.includes('Climbing') || observedBehavior.includes('Crashing')) {
      return {
        state: 'SEEKING_PROPRIOCEPTION',
        suggestion: this.activities.PROPRIOCEPTIVE[1], // Wall Pushups/Heavy Work
        rationale: 'Child needs heavy work to organize body.',
      };
    } else if (observedBehavior.includes('Covering Ears') || observedBehavior.includes('Hiding')) {
      return {
        state: 'OVERWHELMED_AUDITORY',
        suggestion: { name: 'Noise Cancelling Headphones + Deep Pressure', type: 'Calming' },
        rationale: 'Reduce sensory load immediately.',
      };
    }
    return null;
  }
}

module.exports = SmartSensoryDietService;
