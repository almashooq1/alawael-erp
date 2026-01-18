/**
 * PHASE 100: Smart Cognitive Training Unit
 * Provides computerized cognitive exercises with auto-adaptive difficulty.
 * Domains: Attention, Memory, Processing Speed, Executive Functions.
 */

const SmartDigitalTwinService = require('./smartDigitalTwin.service'); // To update the twin
// const Patient = require('../models/Beneficiary'); // Assuming we link to patient

class SmartCognitiveService {
  constructor() {
    this.userProgress = new Map(); // patientId -> { domain -> { level, history } }

    // Exercise Library (Mock)
    this.exerciseLibrary = {
      ATTENTION: {
        id: 'ATT_001',
        name: 'Focus Hunter',
        levels: 10,
        description: 'Identify the target shape among distractors.',
      },
      MEMORY: {
        id: 'MEM_001',
        name: 'Pattern Recall',
        levels: 10,
        description: 'Remember and reproduce the sequence of lights.',
      },
      EXECUTIVE: {
        id: 'EXE_001',
        name: 'Tower Planner',
        levels: 10,
        description: 'Move discs to target configuration with minimal moves.',
      },
    };
  }

  /**
   * Get the next appropriate exercise configuration for a patient.
   * Auto-adaptive: Fetches current level and parameters.
   */
  async getNextExercise(patientId, domain) {
    if (!this.exerciseLibrary[domain]) throw new Error(`Domain ${domain} not supported`);

    // Get patient state
    let progress = this.userProgress.get(patientId);
    if (!progress) {
      progress = {};
      this.userProgress.set(patientId, progress);
    }

    if (!progress[domain]) {
      progress[domain] = { level: 1, history: [] };
    }

    const currentLevel = progress[domain].level;
    const config = this.generateExerciseConfig(domain, currentLevel);

    return {
      exerciseId: this.exerciseLibrary[domain].id,
      name: this.exerciseLibrary[domain].name,
      domain,
      level: currentLevel,
      config,
      sessionToken: `sess_${Date.now()}_${patientId}`,
    };
  }

  /**
   * Generates specific parameters based on domain and level.
   */
  generateExerciseConfig(domain, level) {
    const difficultyMultiplier = 1 + level * 0.2;

    switch (domain) {
      case 'ATTENTION':
        return {
          targets: Math.floor(3 * difficultyMultiplier),
          distractors: Math.floor(5 * difficultyMultiplier * 2),
          durationSeconds: 60,
          targetType: 'SHAPES',
        };
      case 'MEMORY':
        return {
          sequenceLength: Math.floor(2 + level / 2),
          displayTimeMs: Math.max(500, 2000 - level * 100),
          gridSize: level > 5 ? 4 : 3,
        };
      case 'EXECUTIVE':
        return {
          discs: Math.floor(2 + level / 3),
          minMoves: Math.floor(Math.pow(2, Math.floor(2 + level / 3)) - 1),
        };
      default:
        return {};
    }
  }

  /**
   * Process results from the completed exercise.
   * Updates adaptive level and feeds data to Digital Twin.
   */
  async submitSessionResult(patientId, sessionData) {
    // sessionData: { domain, level, score (0-100), reactionTimeMs, correctCount, errorCount }
    const { domain, level, score } = sessionData;

    let progress = this.userProgress.get(patientId);
    if (!progress || !progress[domain]) {
      // Initialize if somehow missing
      await this.getNextExercise(patientId, domain);
      progress = this.userProgress.get(patientId);
    }

    // 1. Adaptive Logic
    let levelChange = 0;
    let feedback = '';

    if (score >= 85) {
      levelChange = 1;
      feedback = 'Excellent! Leveling up.';
    } else if (score < 50) {
      levelChange = -1;
      feedback = "Let's try something a bit easier to build confidence.";
    } else {
      feedback = 'Good job. Staying at this level to consolidate skills.';
    }

    // Apply Change (Boundaries applied)
    let newLevel = progress[domain].level + levelChange;
    if (newLevel < 1) newLevel = 1;
    if (newLevel > 10) newLevel = 10;

    // Update State
    progress[domain].level = newLevel;
    progress[domain].history.push({
      date: new Date(),
      level,
      score,
      metrics: sessionData,
    });

    // 2. Integration: Update Rehabilitation Plan / Digital Twin
    try {
      // In a full system, this would call the Twin service
      // const twinUpdate = await SmartDigitalTwinService.updateCognitiveState(...)
    } catch (e) {
      console.warn('Twin update skipped in mock');
    }

    return {
      success: true,
      previousLevel: level,
      newLevel: newLevel,
      levelChange: levelChange > 0 ? 'UP' : levelChange < 0 ? 'DOWN' : 'SAME',
      feedback,
      nextSessionReady: true,
    };
  }

  /**
   * Get cognitive profile for the dashboard.
   */
  async getCognitiveProfile(patientId) {
    const progress = this.userProgress.get(patientId) || {};
    const summary = {};

    Object.keys(progress).forEach(domain => {
      summary[domain] = {
        currentLevel: progress[domain].level,
        sessionsCompleted: progress[domain].history.length,
        averageScore: progress[domain].history.reduce((a, b) => a + b.score, 0) / (progress[domain].history.length || 1),
      };
    });

    return summary;
  }
}

module.exports = SmartCognitiveService;
