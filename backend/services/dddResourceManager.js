'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Resource Manager — Phase 14 (1/4)
 *  Staff, rooms, equipment management & availability tracking
 * ═══════════════════════════════════════════════════════════════
 */

const { RESOURCE_TYPES, RESOURCE_STATUSES, AVAILABILITY_PATTERNS, SKILL_CATEGORIES, BUILTIN_RESOURCES } = require('../models/DddResourceManager');

const BaseCrudService = require('./base/BaseCrudService');

class ResourceManagerService extends BaseCrudService {
  /* ── Resources CRUD ── */
  async listResources(filter = {}) {
    const q = { isActive: true };
    if (filter.type) q.type = filter.type;
    if (filter.status) q.status = filter.status;
    if (filter.department) q.department = filter.department;
    if (filter.skill) q.skills = filter.skill;
    if (filter.tenant) q.tenant = filter.tenant;
    if (filter.search) {
      q.$or = [
        { name: new RegExp(filter.search, 'i') },
        { nameAr: new RegExp(filter.search, 'i') },
        { code: new RegExp(filter.search, 'i') },
      ];
    }
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDResource.find(q)
        .sort({ type: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDResource.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getResource(id) {
    return DDDResource.findById(oid(id)).lean();
  }

  async createResource(data) { return this._create(DDDResource, data); }

  async updateResource(id, data) {
    return DDDResource.findByIdAndUpdate(
      oid(id),
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
  }

  async deleteResource(id) {
    return DDDResource.findByIdAndUpdate(
      oid(id),
      { $set: { isActive: false } },
      { new: true }
    ).lean();
  }

  /* ── Availability CRUD ── */
  async listAvailability(resourceId, filter = {}) {
    const q = { resourceId: oid(resourceId), isActive: true };
    if (filter.dayOfWeek !== undefined) q.dayOfWeek = parseInt(filter.dayOfWeek);
    return DDDAvailabilitySlot.find(q).sort({ dayOfWeek: 1, startTime: 1 }).lean();
  }

  async setAvailability(resourceId, slots) {
    // Replace all slots for resource
    await DDDAvailabilitySlot.updateMany(
      { resourceId: oid(resourceId), isOverride: false },
      { $set: { isActive: false } }
    );
    const docs = slots.map(s => ({ ...s, resourceId: oid(resourceId), isActive: true }));
    return DDDAvailabilitySlot.insertMany(docs);
  }

  async addOverride(resourceId, override) {
    return DDDAvailabilitySlot.create({
      ...override,
      resourceId: oid(resourceId),
      isOverride: true,
      isActive: true,
    });
  }

  /* ── Allocations ── */
  async allocateResource(data) {
    // Check for conflicts
    const conflicts = await DDDResourceAllocation.find({
      resourceId: oid(data.resourceId),
      status: { $in: ['confirmed', 'tentative'] },
      startAt: { $lt: new Date(data.endAt) },
      endAt: { $gt: new Date(data.startAt) },
    }).lean();

    if (conflicts.length > 0) {
      const resource = await DDDResource.findById(oid(data.resourceId)).lean();
      const maxConcurrent = resource?.capacity || 1;
      if (conflicts.length >= maxConcurrent) {
        return { conflict: true, conflicts, message: 'Resource fully booked for this time slot' };
      }
    }

    const alloc = await DDDResourceAllocation.create(data);
    return { conflict: false, allocation: alloc };
  }

  async listAllocations(filter = {}) {
    const q = {};
    if (filter.resourceId) q.resourceId = oid(filter.resourceId);
    if (filter.beneficiaryId) q.beneficiaryId = oid(filter.beneficiaryId);
    if (filter.status) q.status = filter.status;
    if (filter.from || filter.to) {
      q.startAt = {};
      if (filter.from) q.startAt.$gte = new Date(filter.from);
      if (filter.to) q.startAt.$lte = new Date(filter.to);
    }
    return DDDResourceAllocation.find(q)
      .sort({ startAt: 1 })
      .populate('resourceId', 'name code type')
      .lean();
  }

  async cancelAllocation(id) {
    return DDDResourceAllocation.findByIdAndUpdate(
      oid(id),
      { $set: { status: 'cancelled' } },
      { new: true }
    ).lean();
  }

  /* ── Utilization ── */
  async getUtilization(resourceId, dateFrom, dateTo) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const allocations = await DDDResourceAllocation.find({
      resourceId: oid(resourceId),
      status: { $in: ['confirmed', 'completed'] },
      startAt: { $gte: from },
      endAt: { $lte: to },
    }).lean();

    let totalMinutes = 0;
    for (const a of allocations) {
      totalMinutes += (new Date(a.endAt) - new Date(a.startAt)) / 60000;
    }

    const totalAvailableMinutes = ((to - from) / 60000) * 0.6; // assume 60% availability
    const utilization =
      totalAvailableMinutes > 0 ? Math.min(100, (totalMinutes / totalAvailableMinutes) * 100) : 0;

    return {
      resourceId,
      period: { from, to },
      totalBookedMinutes: Math.round(totalMinutes),
      totalAvailableMinutes: Math.round(totalAvailableMinutes),
      utilizationPercent: Math.round(utilization * 10) / 10,
      allocationCount: allocations.length,
    };
  }

  /* ── Find available resources ── */
  async findAvailable(type, startAt, endAt, skills = []) {
    const q = { type, status: 'available', isActive: true };
    if (skills.length) q.skills = { $all: skills };

    const resources = await DDDResource.find(q).lean();
    const available = [];

    for (const r of resources) {
      const conflicts = await DDDResourceAllocation.countDocuments({
        resourceId: r._id,
        status: { $in: ['confirmed', 'tentative'] },
        startAt: { $lt: new Date(endAt) },
        endAt: { $gt: new Date(startAt) },
      });
      if (conflicts < (r.capacity || 1)) {
        available.push({ ...r, currentBookings: conflicts });
      }
    }

    return available;
  }

  /* ── Stats ── */
  async getStats(tenant = 'default') {
    const q = { isActive: true, tenant };
    const [total, byType, byStatus] = await Promise.all([
      DDDResource.countDocuments(q),
      DDDResource.aggregate([
        { $match: q },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      DDDResource.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    return {
      total,
      byType: Object.fromEntries(byType.map(r => [r._id, r.count])),
      byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
      builtinCount: BUILTIN_RESOURCES.length,
    };
  }
}

module.exports = new ResourceManagerService();
