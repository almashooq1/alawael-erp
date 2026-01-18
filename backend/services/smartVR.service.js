/**
 * PHASE 104: Smart VR Neuro-Feedback Integration
 * "The Reality Interface" - Connects the Therapeutic Plan to an immersive VR environment.
 * Allows patients to visualize their recovery and perform "gamified" neuro-rehab.
 */

const SmartAutoPrescriptionService = require('./smartAutoPrescription.service');

class SmartVRService {
  constructor() {
    console.log('System: Smart VR Neuro-Feedback Engine - Initialized');
    this.activeSessions = new Map();
  }

  /**
   * Initializes a VR session based on the prescribed plan
   * @param {string} patientId
   * @param {string} deviceId
   */
  async initializeVRSession(patientId, deviceId) {
    // 1. Fetch the Auto-Prescription (Phase 103)
    // In a real app we would adhere to the schedule. For demo, we force-start.
    const plan = await SmartAutoPrescriptionService.generateAutoPlan(patientId);

    const sessionToken = `VR_SESSION_${Date.now()}_${patientId}`;

    // 2. Configure the Environment
    // If the plan prioritizes "MEMORY", we load the "Memory Palace" environment.
    // If "ATTENTION", we load "Space Focus".
    const hasMemoryFocus = plan.schedule.dailyRoutine.some(r => r.priorityDomain === 'MEMORY');

    const sessionConfig = {
      token: sessionToken,
      environment: hasMemoryFocus ? 'MEMORY_PALACE_V2' : 'ZEN_GARDEN_FOCUS',
      difficulty: plan.schedule.dailyRoutine[1].difficultyStart || 1,
      neuroFeedbackEnabled: true,
      hapticFeedbackLevel: 'MEDIUM',
      durationMinutes: 30,
    };

    this.activeSessions.set(sessionToken, {
      patientId,
      startTime: Date.now(),
      status: 'RUNNING',
      dataPoints: [],
    });

    return sessionConfig;
  }

  /**
   * Receives real-time streams from the VR Headset (EEG/Focus/Eye-Tracking)
   * @param {string} sessionToken
   * @param {Object} telemetryData
   */
  async processRealTimeTelemetry(sessionToken, telemetryData) {
    if (!this.activeSessions.has(sessionToken)) throw new Error('Invalid Session Token');

    const session = this.activeSessions.get(sessionToken);

    // 3. Neuro-Feedback Loop
    // If 'Focus' drops, we might instruct the VR client to brighten the clues.
    let feedbackInstruction = 'MAINTAIN';

    if (telemetryData.focusLevel < 40) {
      feedbackInstruction = 'BOOST_VISUAL_CUES'; // Help the patient
    } else if (telemetryData.focusLevel > 90) {
      feedbackInstruction = 'INCREASE_DISTRACTORS'; // Challenge the patient
    }

    session.dataPoints.push({
      timestamp: Date.now(),
      ...telemetryData,
    });

    return {
      status: 'PROCESSED',
      adjustEnvironment: feedbackInstruction,
    };
  }
}

module.exports = SmartVRService;
