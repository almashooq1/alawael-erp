/**
 * Smart Simulation & Forecasting Service (Phase 96)
 *
 * Uses the Digital Twin (Phase 95) to run "What-If" Scenarios.
 * "If we increase speech therapy by 2 hours, what happens to burnout?"
 */

class SmartSimulationService {
  /**
   * Run Scenario Simulation (Phase 96 Integration)
   */
  async simulateIntervention(patientId, currentTwin, proposedChange) {
    // proposedChange: { type: 'INCREASE_THERAPY', hours: 2, discipline: 'SPEECH' }
    console.log(`Simulating future for ${patientId} with change: ${proposedChange.type}`);

    // Mock Prediction Logic (The "Crystal Ball")
    const prediction = {
      scenarioId: 'SIM-' + Date.now(),
      timeframe: '3 Months',
      outcomes: {},
      sideEffects: [],
    };

    if (proposedChange.type === 'INCREASE_THERAPY') {
      // Positive: Communication goes up
      prediction.outcomes.communicationScore = '+15%';

      // Negative: If Twin has low sleep, Burnout goes up
      if (currentTwin.physiological.sleepQuality === 'DEFICIT') {
        prediction.sideEffects.push({
          risk: 'BURNOUT',
          probability: '85%',
          warning: 'Child is already sleep deprived. Adding hours will cause regression.',
        });
      } else {
        prediction.outcomes.socialConfidence = '+5%';
      }
    }

    return prediction;
  }

  /**
   * Optimize Resource Allocation
   * "How do we spend the budget to get the MAX independence score?"
   */
  async optimizeAllocation(budget) {
    // Mock Linear Programming / AI Optimization
    return {
      budgetProvided: budget,
      strategy: 'Balanced Approach',
      allocation: [
        { service: 'Speech Therapy', percent: '40%', reason: 'Highest ROI for this age' },
        { service: 'Occupational Therapy', percent: '30%', reason: 'Needed for regulation' },
        { service: 'Parent Coaching', percent: '30%', reason: 'Home generalization' },
      ],
      projectedGrowth: '22% over 6 months',
    };
  }

  // Legacy Code below preserved
  // Mock Models
  // const ScheduleModeule = require('../models/TherapySession');

  /**
   * (Legacy Phase 50 Logic - Merged)
   * Simulates physical flow and time-based events to optimize center operations.
   */
  static async runDailyFlowSimulation(date, dayProfile = 'AVERAGE') {
    // dayProfile: 'AVERAGE', 'BUSY', 'LOW'

    // Mock generating 100 appointments for the day
    const appointments = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      time: 8 + Math.floor(i / 10), // 8:00 to 18:00
      duration: 45,
      therapist: `Therapist ${i % 10}`,
    }));

    const simulationLog = [];
    let waitingRoomCount = 0;
    let parkingSpotsOccupied = 0;
    const waitingRoomCapacity = 20;
    const parkingCapacity = 50;

    // Hour by hour simulation
    for (let hour = 8; hour <= 18; hour++) {
      // Arrivals (Patients come 15 mins early)
      const arrivals = appointments.filter(a => a.time === hour).length;

      // Departures (Patients leave after session)
      const departures = appointments.filter(a => a.time === hour - 1).length;

      waitingRoomCount += arrivals;
      waitingRoomCount -= departures; // Assuming previous hour patients leave waiting or building

      // Adjust logic: Patients move from Waiting -> Therapy Room
      // Real waiting room count is: Arrivals - (Sessions Started) + (Parents waiting)
      // Lets simplify: Parents wait during session.
      const parentsWaiting = appointments.filter(a => a.time === hour).length; // ongoing sessions

      const totalInBuilding = parentsWaiting * 2; // Patient + Parent

      // Parking Simulation
      parkingSpotsOccupied = totalInBuilding * 0.8; // 80% come by car

      simulationLog.push({
        time: `${hour}:00`,
        waitingRoomStatus: parentsWaiting > waitingRoomCapacity ? 'OVERCROWDED' : 'OK',
        peopleCount: parentsWaiting,
        parkingStatus: parkingSpotsOccupied > parkingCapacity ? 'FULL' : 'AVAILABLE',
        parkingUtilization: `${((parkingSpotsOccupied / parkingCapacity) * 100).toFixed(0)}%`,
      });
    }

    return {
      date,
      profile: dayProfile,
      bottlenecks: simulationLog.filter(l => l.waitingRoomStatus === 'OVERCROWDED' || l.parkingStatus === 'FULL'),
      hourlyFlow: simulationLog,
    };
  }

  /**
   * "Chaos Monkey" for Schedule
   * Simulates a disruption (e.g., Lead Therapist Call-in Sick)
   */
  static async simulateDisruption(type) {
    if (type === 'STAFF_SICK') {
      return {
        event: 'Key PT Staff Sick',
        impact: {
          cancelledSessions: 8,
          revenueLoss: 1200,
          rescheduleBurden: 'High - No open slots for 3 days',
          satisfactionRisk: 'Medium',
        },
      };
    }
    return { message: 'Unknown disruption' };
  }
}

module.exports = SmartSimulationService;
