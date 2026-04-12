'use strict';
/**
 * VolunteerManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddVolunteerManager.js
 */

const {
  DDDVolunteer,
  DDDVolunteerShift,
  DDDVolunteerSkill,
  DDDVolunteerRecognition,
  VOLUNTEER_STATUSES,
  VOLUNTEER_CATEGORIES,
  SHIFT_STATUSES,
  SKILL_LEVELS,
  RECOGNITION_TYPES,
  AVAILABILITY_PATTERNS,
  BUILTIN_VOLUNTEER_ROLES,
} = require('../models/DddVolunteerManager');

const BaseCrudService = require('./base/BaseCrudService');

class VolunteerManager extends BaseCrudService {
  constructor() {
    super('VolunteerManager', {
      description: 'Volunteer registration, scheduling & recognition',
      version: '1.0.0',
    }, {
      volunteers: DDDVolunteer,
      volunteerShifts: DDDVolunteerShift,
      volunteerSkills: DDDVolunteerSkill,
      volunteerRecognitions: DDDVolunteerRecognition,
    })
  }

  async initialize() {
    this.log('Volunteer Manager initialised ✓');
    return true;
  }

  /* ── Volunteers ── */
  async listVolunteers(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.category) q.category = filters.category;
    return DDDVolunteer.find(q).sort({ name: 1 }).lean();
  }
  async getVolunteer(id) { return this._getById(DDDVolunteer, id); }
  async registerVolunteer(data) {
    if (!data.volunteerCode) data.volunteerCode = `VOL-${Date.now()}`;
    return DDDVolunteer.create(data);
  }
  async updateVolunteer(id, data) { return this._update(DDDVolunteer, id, data); }

  /* ── Shifts ── */
  async listShifts(filters = {}) {
    const q = {};
    if (filters.volunteerId) q.volunteerId = filters.volunteerId;
    if (filters.status) q.status = filters.status;
    return DDDVolunteerShift.find(q).sort({ scheduledDate: -1 }).limit(200).lean();
  }
  async scheduleShift(data) {
    if (!data.shiftCode) data.shiftCode = `VSHIFT-${Date.now()}`;
    return DDDVolunteerShift.create(data);
  }
  async completeShift(id, details) {
    return DDDVolunteerShift.findByIdAndUpdate(
      id,
      { ...details, status: 'completed', actualEndTime: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Skills ── */
  async listSkills(volunteerId) {
    return DDDVolunteerSkill.find({ volunteerId }).lean();
  }
  async addSkill(data) { return this._create(DDDVolunteerSkill, data); }

  /* ── Recognition ── */
  async listRecognitions(volunteerId) {
    const q = volunteerId ? { volunteerId } : {};
    return DDDVolunteerRecognition.find(q).sort({ awardedDate: -1 }).lean();
  }
  async grantRecognition(data) {
    if (!data.recognitionCode) data.recognitionCode = `VREC-${Date.now()}`;
    return DDDVolunteerRecognition.create(data);
  }

  /* ── Analytics ── */
  async getVolunteerAnalytics() {
    const [volunteers, shifts, skills, recognitions] = await Promise.all([
      DDDVolunteer.countDocuments(),
      DDDVolunteerShift.countDocuments(),
      DDDVolunteerSkill.countDocuments(),
      DDDVolunteerRecognition.countDocuments(),
    ]);
    const activeVolunteers = await DDDVolunteer.countDocuments({
      status: 'active',
      isActive: true,
    });
    return { volunteers, shifts, skills, recognitions, activeVolunteers };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new VolunteerManager();
