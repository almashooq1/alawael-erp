'use strict';
/**
 * InspectionTracker Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddInspectionTracker.js
 */

const {
  DDDInspection,
  DDDInspectionItem,
  DDDFollowUpAction,
  DDDInspectionSchedule,
  INSPECTION_TYPES,
  INSPECTION_STATUSES,
  INSPECTOR_TYPES,
  COMPLIANCE_LEVELS,
  AREA_CATEGORIES,
  FOLLOW_UP_PRIORITIES,
  BUILTIN_INSPECTION_TEMPLATES,
} = require('../models/DddInspectionTracker');

const BaseCrudService = require('./base/BaseCrudService');

class InspectionTracker extends BaseCrudService {
  constructor() {
    super('InspectionTracker', {}, {
      inspections: DDDInspection,
      inspectionItems: DDDInspectionItem,
      followUpActions: DDDFollowUpAction,
      inspectionSchedules: DDDInspectionSchedule,
    });
  }

  /* ── Inspections ── */
  async createInspection(data) { return this._create(DDDInspection, data); }
  async listInspections(filter = {}, page = 1, limit = 20) { return this._list(DDDInspection, filter, { page: page, limit: limit, sort: { scheduledDate: -1 } }); }
  async getInspectionById(id) { return this._getById(DDDInspection, id); }
  async updateInspection(id, data) { return this._update(DDDInspection, id, data); }

  /* ── Items ── */
  async createItem(data) { return this._create(DDDInspectionItem, data); }
  async listItems(inspectionId) {
    return DDDInspectionItem.find({ inspectionId }).lean();
  }

  /* ── Follow-Up Actions ── */
  async createFollowUp(data) { return this._create(DDDFollowUpAction, data); }
  async listFollowUps(filter = {}, page = 1, limit = 20) { return this._list(DDDFollowUpAction, filter, { page: page, limit: limit, sort: { dueDate: 1 } }); }
  async updateFollowUp(id, data) { return this._update(DDDFollowUpAction, id, data); }

  /* ── Schedules ── */
  async createSchedule(data) { return this._create(DDDInspectionSchedule, data); }
  async listSchedules(filter = {}) { return this._list(DDDInspectionSchedule, filter, { sort: { nextDueDate: 1 } }); }

  /* ── Analytics ── */
  async getComplianceSummary() {
    return DDDInspection.aggregate([
      { $match: { overallResult: { $ne: null } } },
      { $group: { _id: '$overallResult', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }
  async getOverdueFollowUps() {
    return DDDFollowUpAction.find({
      status: { $in: ['open', 'in_progress'] },
      dueDate: { $lt: new Date() },
    })
      .sort({ dueDate: 1 })
      .lean();
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new InspectionTracker();
