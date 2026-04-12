'use strict';
/**
 * MentorshipProgram Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddMentorshipProgram.js
 */

const {
  DDDMentorshipPair,
  DDDMentorMeeting,
  DDDMentorFeedback,
  DDDMentorshipProgram,
  MENTORSHIP_TYPES,
  MENTORSHIP_STATUSES,
  GOAL_STATUSES,
  MEETING_FORMATS,
  FEEDBACK_TYPES,
  COMPETENCY_DOMAINS,
  BUILTIN_PROGRAM_TEMPLATES,
} = require('../models/DddMentorshipProgram');

const BaseCrudService = require('./base/BaseCrudService');

class MentorshipProgram extends BaseCrudService {
  constructor() {
    super('MentorshipProgram', {}, {
      mentorshipPairs: DDDMentorshipPair,
      mentorMeetings: DDDMentorMeeting,
      mentorFeedbacks: DDDMentorFeedback,
      mentorshipPrograms: DDDMentorshipProgram,
    });
  }

  /* ── Pairs ── */
  async createPair(data) { return this._create(DDDMentorshipPair, data); }
  async listPairs(filter = {}, page = 1, limit = 20) { return this._list(DDDMentorshipPair, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async getPairById(id) { return this._getById(DDDMentorshipPair, id); }
  async updatePair(id, data) { return this._update(DDDMentorshipPair, id, data); }

  /* ── Meetings ── */
  async createMeeting(data) {
    const meeting = await DDDMentorMeeting.create(data);
    await DDDMentorshipPair.findByIdAndUpdate(data.pairId, { $inc: { totalMeetings: 1 } });
    return meeting;
  }
  async listMeetings(filter = {}, page = 1, limit = 20) { return this._list(DDDMentorMeeting, filter, { page: page, limit: limit, sort: { date: -1 } }); }

  /* ── Feedback ── */
  async createFeedback(data) { return this._create(DDDMentorFeedback, data); }
  async listFeedback(filter = {}, page = 1, limit = 20) { return this._list(DDDMentorFeedback, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  /* ── Programs ── */
  async createProgram(data) { return this._create(DDDMentorshipProgram, data); }
  async listPrograms(filter = {}) { return this._list(DDDMentorshipProgram, filter); }
  async updateProgram(id, data) { return this._update(DDDMentorshipProgram, id, data); }

  /* ── Analytics ── */
  async getProgramStats() {
    const [totalPairs, active, completed, programs] = await Promise.all([
      DDDMentorshipPair.countDocuments(),
      DDDMentorshipPair.countDocuments({ status: 'active' }),
      DDDMentorshipPair.countDocuments({ status: 'completed' }),
      DDDMentorshipProgram.countDocuments({ isActive: true }),
    ]);
    return { totalPairs, active, completed, activePrograms: programs };
  }

  async getMentorLoad(mentorId) {
    return DDDMentorshipPair.countDocuments({ mentorId, status: 'active' });
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new MentorshipProgram();
