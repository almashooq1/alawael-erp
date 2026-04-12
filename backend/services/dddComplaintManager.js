'use strict';
/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Complaint Manager — Phase 27                        ██
 * ██  Handle complaints, grievances & resolution tracking     ██
 * ██████████████████████████████████████████████████████████████
 */

const { DDDComplaint, DDDResolution, DDDEscalation, DDDComplaintAnalytics, COMPLAINT_TYPES, COMPLAINT_STATUSES, COMPLAINT_PRIORITIES, RESOLUTION_TYPES, ESCALATION_LEVELS, GRIEVANCE_CATEGORIES, BUILTIN_RESOLUTION_TEMPLATES } = require('../models/DddComplaintManager');

const BaseCrudService = require('./base/BaseCrudService');

class ComplaintManager extends BaseCrudService {
  constructor() {
    super('ComplaintManager');
  }

  /* Complaints */
  async listComplaints(filter = {}) { return this._list(DDDComplaint, filter); }
  async getComplaint(id) { return this._getById(DDDComplaint, id); }
  async fileComplaint(data) {
    data.complaintId = data.complaintId || `CMP-${Date.now()}`;
    return DDDComplaint.create(data);
  }
  async updateComplaint(id, data) { return this._update(DDDComplaint, id, data); }

  /* Resolutions */
  async listResolutions(filter = {}) { return this._list(DDDResolution, filter); }
  async createResolution(data) {
    data.resolutionId = data.resolutionId || `RES-${Date.now()}`;
    data.resolvedAt = data.resolvedAt || new Date();
    return DDDResolution.create(data);
  }
  async updateResolution(id, data) { return this._update(DDDResolution, id, data); }

  /* Escalations */
  async listEscalations(filter = {}) { return this._list(DDDEscalation, filter, { sort: { escalatedAt: -1 } }); }
  async escalate(data) {
    data.escalationId = data.escalationId || `ESC-${Date.now()}`;
    return DDDEscalation.create(data);
  }
  async resolveEscalation(id, outcome) {
    return DDDEscalation.findByIdAndUpdate(
      id,
      { outcome, resolvedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* Analytics */
  async getComplaintAnalytics(filter = {}) { return this._list(DDDComplaintAnalytics, filter, { sort: { periodStart: -1 } }); }
  async generateAnalytics(data) {
    data.analyticsId = data.analyticsId || `CMAN-${Date.now()}`;
    return DDDComplaintAnalytics.create(data);
  }

}

module.exports = new ComplaintManager();
