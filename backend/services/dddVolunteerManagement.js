'use strict';
/**
 * VolunteerManagement Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddVolunteerManagement.js
 */

const {
  DDDVolunteerProfile,
  DDDVolMgmtShift,
  DDDVolunteerTraining,
  DDDVolMgmtRecognition,
  VOLUNTEER_ROLES,
  VOLUNTEER_STATUSES,
  SKILL_CATEGORIES,
  SHIFT_TYPES,
  RECOGNITION_TYPES,
  TRAINING_MODULES,
  BUILTIN_VOLUNTEER_CONFIGS,
} = require('../models/DddVolunteerManagement');

const BaseCrudService = require('./base/BaseCrudService');

class VolunteerManagement extends BaseCrudService {
  constructor() {
    super('VolunteerManagement', {}, {
      volunteerProfiles: DDDVolunteerProfile,
      volMgmtShifts: DDDVolMgmtShift,
      volunteerTrainings: DDDVolunteerTraining,
      volMgmtRecognitions: DDDVolMgmtRecognition,
    });
  }

  async createVolunteer(data) { return this._create(DDDVolunteerProfile, data); }
  async listVolunteers(filter = {}, page = 1, limit = 20) { return this._list(DDDVolunteerProfile, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateVolunteer(id, data) { return this._update(DDDVolunteerProfile, id, data); }

  async createShift(data) { return this._create(DDDVolMgmtShift, data); }
  async listShifts(filter = {}, page = 1, limit = 20) { return this._list(DDDVolMgmtShift, filter, { page: page, limit: limit, sort: { scheduledDate: -1 } }); }

  async assignTraining(data) { return this._create(DDDVolunteerTraining, data); }
  async listTraining(filter = {}, page = 1, limit = 20) { return this._list(DDDVolunteerTraining, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async giveRecognition(data) { return this._create(DDDVolMgmtRecognition, data); }
  async listRecognitions(filter = {}, page = 1, limit = 20) { return this._list(DDDVolMgmtRecognition, filter, { page: page, limit: limit, sort: { awardedAt: -1 } }); }

  async getVolunteerStats() {
    const [total, active, hoursThisMonth, recognitions] = await Promise.all([
      DDDVolunteerProfile.countDocuments(),
      DDDVolunteerProfile.countDocuments({ status: 'active' }),
      DDDVolMgmtShift.countDocuments({ status: 'completed' }),
      DDDVolMgmtRecognition.countDocuments(),
    ]);
    return {
      totalVolunteers: total,
      activeVolunteers: active,
      completedShifts: hoursThisMonth,
      totalRecognitions: recognitions,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new VolunteerManagement();
