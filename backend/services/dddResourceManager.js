'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Resource Manager — Phase 14 (1/4)
 *  Staff, rooms, equipment management & availability tracking
 * ═══════════════════════════════════════════════════════════════
 */
const mongoose = require('mongoose');
const { Router } = require('express');

/* ── helpers ── */
const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};
const oid = v => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return v;
  }
};
const safe = fn => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    next(e);
  }
};

/* ══════════════════════════════════════════════════════════════
   1) RESOURCE TYPES & CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const RESOURCE_TYPES = [
  'therapist',
  'physician',
  'nurse',
  'technician',
  'admin_staff',
  'therapy_room',
  'consultation_room',
  'gym',
  'pool',
  'sensory_room',
  'equipment',
  'vehicle',
];

const RESOURCE_STATUSES = ['available', 'busy', 'on_leave', 'maintenance', 'reserved', 'offline'];

const AVAILABILITY_PATTERNS = [
  'weekly_recurring',
  'biweekly_recurring',
  'custom',
  'on_demand',
  'shift_based',
];

const SKILL_CATEGORIES = [
  'speech_therapy',
  'occupational_therapy',
  'physical_therapy',
  'behavioral_therapy',
  'psychology',
  'social_work',
  'special_education',
  'audiology',
  'nutrition',
  'nursing',
];

const BUILTIN_RESOURCES = [
  {
    code: 'RES-THERAPY-ROOM-1',
    name: 'Therapy Room 1',
    nameAr: 'غرفة العلاج 1',
    type: 'therapy_room',
    capacity: 2,
  },
  {
    code: 'RES-THERAPY-ROOM-2',
    name: 'Therapy Room 2',
    nameAr: 'غرفة العلاج 2',
    type: 'therapy_room',
    capacity: 3,
  },
  {
    code: 'RES-CONSULT-1',
    name: 'Consultation Room 1',
    nameAr: 'غرفة الاستشارة 1',
    type: 'consultation_room',
    capacity: 4,
  },
  {
    code: 'RES-GYM-1',
    name: 'Rehabilitation Gym',
    nameAr: 'صالة التأهيل',
    type: 'gym',
    capacity: 10,
  },
  {
    code: 'RES-POOL-1',
    name: 'Hydrotherapy Pool',
    nameAr: 'مسبح العلاج المائي',
    type: 'pool',
    capacity: 6,
  },
  {
    code: 'RES-SENSORY-1',
    name: 'Sensory Room',
    nameAr: 'غرفة الحسية',
    type: 'sensory_room',
    capacity: 3,
  },
  {
    code: 'RES-VEHICLE-1',
    name: 'Transport Van 1',
    nameAr: 'مركبة النقل 1',
    type: 'vehicle',
    capacity: 8,
  },
  {
    code: 'RES-VEHICLE-2',
    name: 'Transport Van 2',
    nameAr: 'مركبة النقل 2',
    type: 'vehicle',
    capacity: 8,
  },
];

/* ══════════════════════════════════════════════════════════════
   2) SCHEMAS
   ══════════════════════════════════════════════════════════════ */

/* ── Resource Schema ── */
const resourceSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: String,
    type: { type: String, enum: RESOURCE_TYPES, required: true, index: true },
    status: { type: String, enum: RESOURCE_STATUSES, default: 'available', index: true },
    capacity: { type: Number, default: 1 },
    location: {
      building: String,
      floor: String,
      room: String,
      coordinates: { lat: Number, lng: Number },
    },
    skills: [{ type: String, enum: SKILL_CATEGORIES }],
    certifications: [
      {
        name: String,
        issuer: String,
        expiresAt: Date,
        verified: { type: Boolean, default: false },
      },
    ],
    linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: String,
    costPerHour: Number,
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
    tags: [String],
    isActive: { type: Boolean, default: true, index: true },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDResource = model('DDDResource') || mongoose.model('DDDResource', resourceSchema);

/* ── Availability Slot Schema ── */
const availabilitySlotSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDResource',
      required: true,
      index: true,
    },
    pattern: { type: String, enum: AVAILABILITY_PATTERNS, default: 'weekly_recurring' },
    dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sunday
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true }, // HH:mm
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: Date,
    isOverride: { type: Boolean, default: false },
    overrideDate: Date,
    overrideReason: String,
    maxBookings: { type: Number, default: 1 },
    currentBookings: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

availabilitySlotSchema.index({ resourceId: 1, dayOfWeek: 1, startTime: 1 });

const DDDAvailabilitySlot =
  model('DDDAvailabilitySlot') || mongoose.model('DDDAvailabilitySlot', availabilitySlotSchema);

/* ── Resource Allocation Schema ── */
const resourceAllocationSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDResource',
      required: true,
      index: true,
    },
    allocationType: {
      type: String,
      enum: ['session', 'block', 'maintenance', 'event', 'reserved'],
      required: true,
    },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    episodeId: { type: mongoose.Schema.Types.ObjectId },
    sessionId: { type: mongoose.Schema.Types.ObjectId },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['confirmed', 'tentative', 'cancelled', 'completed'],
      default: 'confirmed',
    },
    priority: { type: Number, default: 5, min: 1, max: 10 },
    notes: String,
    allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

resourceAllocationSchema.index({ resourceId: 1, startAt: 1, endAt: 1 });

const DDDResourceAllocation =
  model('DDDResourceAllocation') ||
  mongoose.model('DDDResourceAllocation', resourceAllocationSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE — ResourceManager
   ══════════════════════════════════════════════════════════════ */

class ResourceManagerService {
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

  async createResource(data) {
    return DDDResource.create(data);
  }

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

const resourceManagerService = new ResourceManagerService();

/* ══════════════════════════════════════════════════════════════
   4) ROUTER
   ══════════════════════════════════════════════════════════════ */

function createResourceManagerRouter() {
  const r = Router();

  /* ── Resources CRUD ── */
  r.get(
    '/resource-manager/resources',
    safe(async (req, res) => {
      res.json({ success: true, ...(await resourceManagerService.listResources(req.query)) });
    })
  );

  r.get(
    '/resource-manager/resources/:id',
    safe(async (req, res) => {
      const doc = await resourceManagerService.getResource(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  r.post(
    '/resource-manager/resources',
    safe(async (req, res) => {
      const doc = await resourceManagerService.createResource(req.body);
      res.status(201).json({ success: true, data: doc });
    })
  );

  r.put(
    '/resource-manager/resources/:id',
    safe(async (req, res) => {
      const doc = await resourceManagerService.updateResource(req.params.id, req.body);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  r.delete(
    '/resource-manager/resources/:id',
    safe(async (req, res) => {
      await resourceManagerService.deleteResource(req.params.id);
      res.json({ success: true, message: 'Soft-deleted' });
    })
  );

  /* ── Availability ── */
  r.get(
    '/resource-manager/resources/:id/availability',
    safe(async (req, res) => {
      const slots = await resourceManagerService.listAvailability(req.params.id, req.query);
      res.json({ success: true, data: slots });
    })
  );

  r.put(
    '/resource-manager/resources/:id/availability',
    safe(async (req, res) => {
      const slots = await resourceManagerService.setAvailability(
        req.params.id,
        req.body.slots || []
      );
      res.json({ success: true, data: slots });
    })
  );

  r.post(
    '/resource-manager/resources/:id/availability/override',
    safe(async (req, res) => {
      const slot = await resourceManagerService.addOverride(req.params.id, req.body);
      res.status(201).json({ success: true, data: slot });
    })
  );

  /* ── Allocations ── */
  r.get(
    '/resource-manager/allocations',
    safe(async (req, res) => {
      const allocs = await resourceManagerService.listAllocations(req.query);
      res.json({ success: true, data: allocs });
    })
  );

  r.post(
    '/resource-manager/allocations',
    safe(async (req, res) => {
      const result = await resourceManagerService.allocateResource(req.body);
      if (result.conflict) return res.status(409).json({ success: false, ...result });
      res.status(201).json({ success: true, data: result.allocation });
    })
  );

  r.delete(
    '/resource-manager/allocations/:id',
    safe(async (req, res) => {
      await resourceManagerService.cancelAllocation(req.params.id);
      res.json({ success: true, message: 'Cancelled' });
    })
  );

  /* ── Utilization ── */
  r.get(
    '/resource-manager/resources/:id/utilization',
    safe(async (req, res) => {
      const { from, to } = req.query;
      if (!from || !to)
        return res.status(400).json({ success: false, error: 'from & to required' });
      const data = await resourceManagerService.getUtilization(req.params.id, from, to);
      res.json({ success: true, data });
    })
  );

  /* ── Find available ── */
  r.get(
    '/resource-manager/find-available',
    safe(async (req, res) => {
      const { type, startAt, endAt, skills } = req.query;
      if (!type || !startAt || !endAt)
        return res.status(400).json({ success: false, error: 'type, startAt, endAt required' });
      const skillArr = skills ? skills.split(',') : [];
      const data = await resourceManagerService.findAvailable(type, startAt, endAt, skillArr);
      res.json({ success: true, data });
    })
  );

  /* ── Stats ── */
  r.get(
    '/resource-manager/stats',
    safe(async (req, res) => {
      const data = await resourceManagerService.getStats(req.query.tenant);
      res.json({ success: true, data });
    })
  );

  /* ── Meta ── */
  r.get('/resource-manager/meta', (_req, res) => {
    res.json({
      success: true,
      resourceTypes: RESOURCE_TYPES,
      resourceStatuses: RESOURCE_STATUSES,
      availabilityPatterns: AVAILABILITY_PATTERNS,
      skillCategories: SKILL_CATEGORIES,
      builtinResources: BUILTIN_RESOURCES,
    });
  });

  return r;
}

/* ══════════════════════════════════════════════════════════════
   5) EXPORTS
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDResource,
  DDDAvailabilitySlot,
  DDDResourceAllocation,
  ResourceManagerService,
  resourceManagerService,
  createResourceManagerRouter,
  RESOURCE_TYPES,
  RESOURCE_STATUSES,
  AVAILABILITY_PATTERNS,
  SKILL_CATEGORIES,
  BUILTIN_RESOURCES,
};
