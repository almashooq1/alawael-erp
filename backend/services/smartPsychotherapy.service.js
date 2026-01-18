/**
 * PHASE 105: Smart Psychotherapy Integration Unit
 * Provides Digital CBT Flows, Mood Tracking, and Automated Assessments.
 * Integrates Mental Health into the Smart Rehabilitation Ecosystem.
 */

class SmartPsychotherapyService {
  constructor() {
    console.log('System: Smart Psychotherapy Unit - Initialized');
    this.patientRecords = new Map(); // Mock DB: patientId -> { moods: [], thoughts: [], assessments: [] }
  }

  /**
   * Returns a structured Digital CBT Session Flow
   * @param {string} flowType - 'ANXIETY', 'DEPRESSION', 'PTSD'
   */
  getCBTFlow(flowType) {
    const flows = {
      ANXIETY: {
        title: 'Anxiety Deconstruction',
        steps: [
          { id: 1, type: 'CHECK_IN', prompt: 'Current Anxiety Level (0-10)?' },
          { id: 2, type: 'TRIGGER_ID', prompt: 'What situation triggered this feeling?' },
          { id: 3, type: 'THOUGHT_CATCHING', prompt: 'What is the worst-case scenario you are imagining?' },
          { id: 4, type: 'COGNITIVE_RESTRUCTURING', prompt: 'What is the evidence AGAINST this thought?' },
          { id: 5, type: 'HOMEWORK', task: 'Practice Deep Breathing for 5 mins' },
        ],
      },
      DEPRESSION: {
        title: 'Behavioral Activation',
        steps: [
          { id: 1, type: 'MOOD_LOG', prompt: 'Current Mood?' },
          { id: 2, type: 'ACTIVITY_REVIEW', prompt: 'List 3 things you did today.' },
          { id: 3, type: 'PLEASURE_RATING', prompt: 'Rate pleasure for each (0-10).' },
          { id: 4, type: 'PLANNING', prompt: 'Schedule one enjoyable activity for tomorrow.' },
        ],
      },
    };
    return flows[flowType] || flows['ANXIETY'];
  }

  /**
   * Submit a Standardized Questionnaire (GAD-7, PHQ-9, DASS-21)
   */
  async submitQuestionnaire(patientId, type, responses) {
    // Simple scoring logic
    let score = 0;
    Object.values(responses).forEach(val => (score += val));

    let interpretation = 'NORMAL';
    if (type === 'GAD-7') {
      if (score >= 15) interpretation = 'SEVERE_ANXIETY';
      else if (score >= 10) interpretation = 'MODERATE_ANXIETY';
      else if (score >= 5) interpretation = 'MILD_ANXIETY';
    }

    const result = {
      date: new Date().toISOString(),
      type,
      score,
      interpretation,
    };

    this._saveRecord(patientId, 'assessments', result);
    return result;
  }

  /**
   * Record a Mood Entry linked to Cognitive Status
   */
  async recordMood(patientId, moodData) {
    const entry = {
      date: new Date().toISOString(),
      valence: moodData.valence, // 1-5 (Sad to Happy)
      arousal: moodData.arousal, // 1-5 (Calm to Excited)
      tags: moodData.tags || [], // ['Tired', 'Optimistic']
      associatedExercise: moodData.context || null, // linked to Phase 100
    };
    this._saveRecord(patientId, 'moods', entry);
    return entry;
  }

  /**
   * Log a CBT Automatic Thought Record
   */
  async recordThought(patientId, thoughtData) {
    const entry = {
      date: new Date().toISOString(),
      situation: thoughtData.situation,
      automaticThought: thoughtData.thought,
      emotion: thoughtData.emotion,
      alternativeThought: thoughtData.alternative,
    };
    this._saveRecord(patientId, 'thoughts', entry);
    return entry;
  }

  _saveRecord(patientId, collection, data) {
    if (!this.patientRecords.has(patientId)) {
      this.patientRecords.set(patientId, { moods: [], thoughts: [], assessments: [] });
    }
    this.patientRecords.get(patientId)[collection].push(data);
  }
}

module.exports = SmartPsychotherapyService;
