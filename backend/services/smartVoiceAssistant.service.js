class SmartVoiceAssistantService {
  constructor() {
    this.commandRegistry = [
      {
        intent: 'SCHEDULE_APPOINTMENT',
        keywords: ['book', 'schedule', 'appointment', 'session'],
        requiredParams: ['patient', 'date'],
      },
      {
        intent: 'EMERGENCY_ALERT',
        keywords: ['help', 'emergency', 'pain', 'fallen'],
        requiredParams: [],
      },
      {
        intent: 'GET_PREDICTION',
        keywords: ['prediction', 'forecast', 'outcome', 'simulation'],
        requiredParams: ['intervention'],
      },
    ];
  }

  /**
   * Process raw text from voice input (Speech-to-Text happens on client or earlier layer)
   * @param {string} userId - Who is speaking (Staff/Patient)
   * @param {string} rawText - The transcribed text
   */
  async processCommand(userId, rawText) {
    const normalizedText = rawText.toLowerCase();

    // 1. Intent Recognition (Simple Keyword Matching for Demo)
    const matchedIntent = this.commandRegistry.find(cmd => cmd.keywords.some(k => normalizedText.includes(k)));

    if (!matchedIntent) {
      return {
        success: false,
        response: "I didn't understand that command. Please try again.",
        audioPrompt: 'error_unknown_command',
      };
    }

    // 2. Execute Action based on Intent
    let executionResult = {};
    let verbalResponse = '';

    switch (matchedIntent.intent) {
      case 'SCHEDULE_APPOINTMENT':
        executionResult = await this.mockScheduling(normalizedText);
        verbalResponse = `I have scheduled the session for ${executionResult.date}.`;
        break;

      case 'EMERGENCY_ALERT':
        executionResult = { type: 'ALERT_BROADCAST', priority: 'HIGH' };
        verbalResponse = 'Emergency alert broadcasted to all nearby staff.';
        break;

      case 'GET_PREDICTION':
        executionResult = { type: 'SIMULATION_RUN', predictedScore: 85 };
        verbalResponse = 'Based on the digital twin, this intervention has an 85% success probability.';
        break;
    }

    return {
      success: true,
      intent: matchedIntent.intent,
      actionResult: executionResult,
      response: verbalResponse,
    };
  }

  async mockScheduling(text) {
    // Simple extraction logic or mock
    return { status: 'booked', date: 'tomorrow at 10am' };
  }

  /**
   * Voice Authentication (Biometric Mock)
   * @param {string} audioFingerprint
   */
  async authenticateUser(audioFingerprint) {
    // Mock validation
    const isValid = audioFingerprint && audioFingerprint.length > 5;
    return {
      authenticated: isValid,
      userId: isValid ? 'user_123' : null,
    };
  }
}

module.exports = SmartVoiceAssistantService;
