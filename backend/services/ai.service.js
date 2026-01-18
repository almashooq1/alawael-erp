// Mock AI Service until real model integration
class AIService {
  static async summarizeNotes(text) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!text) return '';

    return {
      summary: 'Patient showed progress in focus. Requires follow up on motor skills.',
      sentiment: 'POSITIVE',
      keywords: ['progress', 'focus', 'motor skills'],
      suggestedNextSteps: ['Increase difficulty', 'Home exercises'],
    };
  }

  static async predictNoShow(beneficiaryId, history) {
    // Advanced logic would go here
    return {
      probability: 0.15, // 15% chance
      riskLevel: 'LOW',
      factors: ['Good attendance record', 'Confirmed via SMS'],
    };
  }
}

module.exports = AIService;
module.exports.instance = new AIService();
