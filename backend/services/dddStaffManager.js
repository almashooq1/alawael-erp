'use strict';
/**
 * StaffManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddStaffManager.js
 */

const {
  DDDStaffProfile,
  DDDDepartment,
  DDDPosition,
  DDDQualification,
  STAFF_TYPES,
  STAFF_STATUSES,
  DEPARTMENT_TYPES,
  POSITION_LEVELS,
  QUALIFICATION_TYPES,
  EMPLOYMENT_TYPES,
  BUILTIN_DEPARTMENTS,
} = require('../models/DddStaffManager');

const BaseCrudService = require('./base/BaseCrudService');

class StaffManager extends BaseCrudService {
  constructor() {
    super('StaffManager', {
      description: 'Staff profiles, departments, positions & qualifications',
      version: '1.0.0',
    }, {
      staffProfiles: DDDStaffProfile,
      departments: DDDDepartment,
      positions: DDDPosition,
      qualifications: DDDQualification,
    })
  }

  async initialize() {
    await this._seedDepartments();
    this.log('Staff Manager initialised ✓');
    return true;
  }

  async _seedDepartments() {
    for (const d of BUILTIN_DEPARTMENTS) {
      const exists = await DDDDepartment.findOne({ code: d.code }).lean();
      if (!exists) await DDDDepartment.create({ ...d, isActive: true });
    }
  }

  /* ── Staff Profiles ── */
  async listStaff(filters = {}) {
    const q = {};
    if (filters.staffType) q.staffType = filters.staffType;
    if (filters.status) q.status = filters.status;
    if (filters.departmentId) q.departmentId = filters.departmentId;
    if (filters.employmentType) q.employmentType = filters.employmentType;
    return DDDStaffProfile.find(q).sort({ lastName: 1 }).lean();
  }
  async getStaff(id) { return this._getById(DDDStaffProfile, id); }
  async getStaffByCode(code) {
    return DDDStaffProfile.findOne({ staffCode: code }).lean();
  }

  async createStaff(data) {
    if (!data.staffCode) data.staffCode = `STF-${Date.now()}`;
    return DDDStaffProfile.create(data);
  }
  async updateStaff(id, data) { return this._update(DDDStaffProfile, id, data, { runValidators: true }); }
  async deactivateStaff(id, reason) {
    return DDDStaffProfile.findByIdAndUpdate(
      id,
      { status: 'terminated', endDate: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Departments ── */
  async listDepartments(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDDepartment.find(q).sort({ name: 1 }).lean();
  }
  async getDepartment(id) { return this._getById(DDDDepartment, id); }
  async createDepartment(data) { return this._create(DDDDepartment, data); }
  async updateDepartment(id, data) { return this._update(DDDDepartment, id, data, { runValidators: true }); }

  /* ── Positions ── */
  async listPositions(filters = {}) {
    const q = {};
    if (filters.departmentId) q.departmentId = filters.departmentId;
    if (filters.level) q.level = filters.level;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDPosition.find(q).sort({ level: 1 }).lean();
  }
  async getPosition(id) { return this._getById(DDDPosition, id); }
  async createPosition(data) { return this._create(DDDPosition, data); }
  async updatePosition(id, data) { return this._update(DDDPosition, id, data, { runValidators: true }); }

  /* ── Qualifications ── */
  async listQualifications(staffId) {
    return DDDQualification.find({ staffId }).sort({ issueDate: -1 }).lean();
  }
  async addQualification(data) { return this._create(DDDQualification, data); }
  async updateQualification(id, data) { return this._update(DDDQualification, id, data, { runValidators: true }); }
  async getExpiringQualifications(daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    return DDDQualification.find({
      expiryDate: { $lte: futureDate, $gte: new Date() },
      verificationStatus: { $ne: 'revoked' },
    })
      .sort({ expiryDate: 1 })
      .lean();
  }

  /* ── Analytics ── */
  async getStaffAnalytics() {
    const [staff, departments, positions, qualifications] = await Promise.all([
      DDDStaffProfile.countDocuments(),
      DDDDepartment.countDocuments(),
      DDDPosition.countDocuments(),
      DDDQualification.countDocuments(),
    ]);
    const activeStaff = await DDDStaffProfile.countDocuments({ status: 'active' });
    const onLeave = await DDDStaffProfile.countDocuments({ status: 'on_leave' });
    return { staff, activeStaff, onLeave, departments, positions, qualifications };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new StaffManager();
