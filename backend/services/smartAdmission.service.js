class SmartAdmissionService {
  /**
   * Simulate Impact of New Admissions
   * "What if we admit X patients of type Y?"
   */
  static async simulateAdmissionScenario(scenario) {
    // Scenario: { count: 5, diagnosis: 'Autism', neededSessionsPerWeek: 3 }

    const count = scenario.count || 1;
    const totalSessionsNeeded = count * (scenario.neededSessionsPerWeek || 2);
    const discipline = scenario.discipline || 'SPEECH'; // Simplified

    // 1. Calculate Revenue Impact
    const averageSessionPrice = 150; // Mock currency
    const monthlyRevenue = totalSessionsNeeded * 4 * averageSessionPrice;

    // 2. Assess Staff Capacity
    // Mock current capacity check
    // Real logic: Query 'User' model for active therapists of type 'discpline' and their open slots
    const activeTherapists = 4;
    const avgSlotsPerTherapist = 30; // per week
    const currentBookedSlots = 90; // mock

    const totalCapacity = activeTherapists * avgSlotsPerTherapist;
    const availableCapacity = totalCapacity - currentBookedSlots; // 120 - 90 = 30

    // 3. Result
    const canAccommodate = availableCapacity >= totalSessionsNeeded;
    const hiringNeeds = canAccommodate ? 0 : Math.ceil((totalSessionsNeeded - availableCapacity) / avgSlotsPerTherapist);

    return {
      scenario: `Admitting ${count} patients for ${discipline}`,
      requirements: {
        weeklySessions: totalSessionsNeeded,
        monthlyRevenueProjected: monthlyRevenue,
      },
      capacityAnalysis: {
        currentAvailableSlots: availableCapacity,
        requiredSlots: totalSessionsNeeded,
        status: canAccommodate ? 'OK' : 'OVERLOAD',
      },
      recommendation: canAccommodate
        ? 'Proceed. Sufficient capacity available.'
        : `STOP. Need to hire ${hiringNeeds} more ${discipline} therapist(s) first.`,
      waitlistPrediction: canAccommodate ? 'No impact on waitlist.' : 'Waitlist will increase by approx 14 days.',
    };
  }
}

module.exports = SmartAdmissionService;
module.exports.instance = new SmartAdmissionService();
