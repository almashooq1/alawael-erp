'use strict';
/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Patient Experience — Phase 27                       ██
 * ██  Patient journey mapping, touchpoints & experience mgmt  ██
 * ██████████████████████████████████████████████████████████████
 */

const { DDDJourneyMap, DDDTouchpoint, DDDExperienceScore, DDDExperienceInsight, JOURNEY_STAGES, JOURNEY_STATUSES, TOUCHPOINT_TYPES, TOUCHPOINT_CHANNELS, EMOTION_RATINGS, EXPERIENCE_DIMENSIONS, BUILTIN_JOURNEY_TEMPLATES } = require('../models/DddPatientExperience');

const BaseCrudService = require('./base/BaseCrudService');

class PatientExperience extends BaseCrudService {
  constructor() {
    super('PatientExperience');
  }

  /* Journey Maps */
  async listJourneys(filter = {}) { return this._list(DDDJourneyMap, filter, { sort: { startDate: -1 } }); }
  async getJourney(id) { return this._getById(DDDJourneyMap, id); }
  async createJourney(data) {
    data.journeyId = data.journeyId || `JRN-${Date.now()}`;
    return DDDJourneyMap.create(data);
  }
  async updateJourney(id, data) { return this._update(DDDJourneyMap, id, data); }
  async advanceStage(id, stage) {
    const journey = await DDDJourneyMap.findById(id);
    if (!journey) throw new Error('Journey not found');
    journey.stages.push({ stage, enteredAt: new Date() });
    journey.currentStage = stage;
    return journey.save();
  }

  /* Touchpoints */
  async listTouchpoints(filter = {}) { return this._list(DDDTouchpoint, filter, { sort: { occurredAt: -1 } }); }
  async recordTouchpoint(data) {
    data.touchpointId = data.touchpointId || `TP-${Date.now()}`;
    return DDDTouchpoint.create(data);
  }
  async updateTouchpoint(id, data) { return this._update(DDDTouchpoint, id, data); }

  /* Experience Scores */
  async listExperienceScores(filter = {}) { return this._list(DDDExperienceScore, filter, { sort: { collectedAt: -1 } }); }
  async recordExperienceScore(data) {
    data.scoreId = data.scoreId || `EXS-${Date.now()}`;
    return DDDExperienceScore.create(data);
  }

  /* Insights */
  async listInsights(filter = {}) { return this._list(DDDExperienceInsight, filter, { sort: { generatedAt: -1 } }); }
  async generateInsight(data) {
    data.insightId = data.insightId || `INS-${Date.now()}`;
    return DDDExperienceInsight.create(data);
  }

  /* Analytics */
  async getExperienceAnalytics(filter = {}) {
    const [journeys, touchpoints, scores, insights] = await Promise.all([
      DDDJourneyMap.countDocuments(filter),
      DDDTouchpoint.countDocuments(),
      DDDExperienceScore.countDocuments(),
      DDDExperienceInsight.countDocuments(),
    ]);
    return {
      totalJourneys: journeys,
      totalTouchpoints: touchpoints,
      totalScores: scores,
      totalInsights: insights,
    };
  }

}

module.exports = new PatientExperience();
