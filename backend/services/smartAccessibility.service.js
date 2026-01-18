// Mock NLP Service
const SmartNotificationService = require('./smartNotificationService');

/**
 * PHASE 51: Cognitive Accessibility & Universal Design
 * Ensures the system works for EVERYONE, including patients with disabilities.
 */
class SmartAccessibilityService {
  /**
   * Converts complex medical text into "Easy Read" format (Plain Language).
   * Useful for patients with cognitive impairments or ID.
   */
  static convertToEasyRead(text) {
    // In a real app, this calls an LLM (e.g. GPT-4) with "Explain like I'm 5" prompt.

    // Mocking the result
    let simplified = text;
    if (text.includes('bilateral coordination deficits')) {
      simplified = 'Trouble using both hands together (like catching a ball).';
    }
    if (text.includes('hypertonia')) {
      simplified = 'Muscles are very tight/stiff.';
    }
    if (text.includes('proprioceptive dysfunction')) {
      simplified = 'Hard to know where body parts are without looking.';
    }

    return {
      original: text,
      easyRead: simplified,
      readingLevel: 'Grade 3',
    };
  }

  /**
   * Generates a TTS (Text-to-Speech) Audio Stream URL for a Home Plan.
   * Allows patients who cannot read to listen to their homework.
   */
  static generateAudioGuide(planId, steps) {
    // input: steps ["Lift arm", "Hold 5 seconds"]
    // output: audio file url
    return {
      planId,
      audioUrl: `https://api.rehab-center.com/tts/v1/stream?voice=ar-SA-Standard-C&content=${encodeURIComponent(steps.join('. '))}`,
      durationSeconds: steps.length * 5,
    };
  }

  /**
   * Visual Schedule Generator (PECS)
   * Returns Image Icons for daily routines.
   */
  static getVisualSchedule(tasks) {
    // [ 'Brush Teeth', 'Breakfast' ]
    const iconMap = {
      'Brush Teeth': '/icons/brushing.png',
      Breakfast: '/icons/eating.png',
      Therapy: '/icons/hospital.png',
    };

    return tasks.map(task => ({
      task,
      icon: iconMap[task] || '/icons/default.png',
    }));
  }
}

module.exports = SmartAccessibilityService;
