// const openai = require('openai'); // In production, use Whisper API
const fs = require('fs');

class SmartVoiceService {
  /**
   * Transcribe Audio File (Mock)
   * Converts Therapist's voice note to Clinical Text
   */
  static async transcribeAudio(file) {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock transcription based on file size/name or random
    // In real life: call OpenAI Whisper or Google STT

    const mockTranscripts = [
      'Patient showed good improvement in gait today. Was able to walk 10 meters unassisted. Recommended increasing intensity next week.',
      'Child was non-compliant during the sensory session. Showing signs of fatigue. Parents reported poor sleep last night.',
      'Speech articulation exercise focused on letter R. Success rate 40%. Homework assigned to practice tongue positioning.',
    ];

    const text = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];

    return {
      text: text,
      confidence: 0.98,
      duration: '00:45',
    };
  }

  /**
   * Analyze Clinical Note
   * Extracts Keywords, Sentiment, and Suggests Next Steps
   */
  static async analyzeNote(text) {
    const keywords = [];
    const nextSteps = [];
    let sentiment = 'NEUTRAL';

    // simple keyword extraction
    if (text.toLowerCase().includes('improvement') || text.toLowerCase().includes('success')) {
      sentiment = 'POSITIVE';
      keywords.push('Progress');
    }
    if (text.toLowerCase().includes('non-compliant') || text.toLowerCase().includes('fatigue')) {
      sentiment = 'NEGATIVE';
      keywords.push('Barrier');
      nextSteps.push('Review Sleep Hygiene');
      nextSteps.push('Adjust Sensory Load');
    }
    if (text.toLowerCase().includes('gait') || text.toLowerCase().includes('walk')) {
      keywords.push('Motor Function');
      keywords.push('Lower Extremity');
    }
    if (text.toLowerCase().includes('speech') || text.toLowerCase().includes('articulation')) {
      keywords.push('Speech/Language');
    }

    return {
      sentiment,
      tags: keywords,
      suggestedActions: nextSteps,
    };
  }
}

module.exports = SmartVoiceService;
module.exports.instance = new SmartVoiceService();
