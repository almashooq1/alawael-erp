'use strict';
/**
 * DDD Space Management Service
 * ─────────────────────────────
 * Phase 34 – Environmental & Facility Management (Module 3/4)
 *
 * Manages facility spaces, room booking, capacity planning,
 * floor plans, utilization analytics, and space optimization.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const SPACE_TYPES = [
  'therapy_room',
  'consultation_room',
  'group_therapy',
  'gymnasium',
  'hydrotherapy_pool',
  'sensory_room',
  'office',
  'waiting_area',
  'reception',
  'conference',
  'storage',
  'staff_lounge',
];

const SPACE_STATUSES = [
  'available',
  'occupied',
  'reserved',
  'maintenance',
  'cleaning',
  'closed',
  'renovation',
  'restricted',
  'overflow',
  'decommissioned',
];

const BOOKING_STATUSES = [
  'confirmed',
  'tentative',
  'cancelled',
  'completed',
  'no_show',
  'checked_in',
  'checked_out',
  'waitlisted',
  'rescheduled',
  'pending',
];

const ACCESSIBILITY_FEATURES = [
  'wheelchair_accessible',
  'hearing_loop',
  'braille_signage',
  'adjustable_height',
  'wide_doorway',
  'grab_bars',
  'visual_alerts',
  'tactile_flooring',
  'automatic_doors',
  'accessible_restroom',
];

const AMENITIES = [
  'projector',
  'whiteboard',
  'video_conferencing',
  'air_conditioning',
  'natural_light',
  'sound_insulation',
  'adjustable_lighting',
  'sink',
  'mirror_wall',
  'treatment_table',
];

const FLOOR_LEVELS = [
  'basement_2',
  'basement_1',
  'ground',
  'mezzanine',
  'floor_1',
  'floor_2',
  'floor_3',
  'floor_4',
  'floor_5',
  'rooftop',
];

const BUILTIN_ROOM_TEMPLATES = [
  { code: 'PT_ROOM', name: 'Physical Therapy Room', type: 'therapy_room', capacity: 2, area: 20 },
  {
    code: 'OT_ROOM',
    name: 'Occupational Therapy Room',
    type: 'therapy_room',
    capacity: 3,
    area: 25,
  },
  {
    code: 'SP_ROOM',
    name: 'Speech Therapy Room',
    type: 'consultation_room',
    capacity: 2,
    area: 15,
  },
  { code: 'GROUP_RM', name: 'Group Therapy Room', type: 'group_therapy', capacity: 12, area: 50 },
  {
    code: 'SENSORY',
    name: 'Sensory Integration Room',
    type: 'sensory_room',
    capacity: 3,
    area: 30,
  },
  { code: 'GYM_MAIN', name: 'Main Gymnasium', type: 'gymnasium', capacity: 20, area: 150 },
  { code: 'POOL', name: 'Hydrotherapy Pool', type: 'hydrotherapy_pool', capacity: 6, area: 80 },
  {
    code: 'CONSULT',
    name: 'Medical Consultation',
    type: 'consultation_room',
    capacity: 3,
    area: 18,
  },
  { code: 'CONF_LG', name: 'Large Conference Room', type: 'conference', capacity: 20, area: 40 },
  { code: 'WAIT_MAIN', name: 'Main Waiting Area', type: 'waiting_area', capacity: 30, area: 60 },
];

/* ═══════════════════ Schemas ═══════════════════ */
const facilitySpaceSchema = new Schema(
  {
    name: { type: String, required: true },
    spaceType: { type: String, enum: SPACE_TYPES, required: true },
    status: { type: String, enum: SPACE_STATUSES, default: 'available' },
    floor: { type: String, enum: FLOOR_LEVELS },
    building: { type: String },
    roomNumber: { type: String },
    capacity: { type: Number },
    areaSqm: { type: Number },
    accessibility: [{ type: String, enum: ACCESSIBILITY_FEATURES }],
    amenities: [{ type: String, enum: AMENITIES }],
    operatingHours: { open: String, close: String, days: [String] },
    departmentId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
facilitySpaceSchema.index({ spaceType: 1, status: 1 });
facilitySpaceSchema.index({ floor: 1, building: 1 });

const roomBookingSchema = new Schema(
  {
    spaceId: { type: Schema.Types.ObjectId, ref: 'DDDFacilitySpace', required: true },
    title: { type: String, required: true },
    status: { type: String, enum: BOOKING_STATUSES, default: 'confirmed' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    bookedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    sessionId: { type: Schema.Types.ObjectId },
    attendees: { type: Number },
    purpose: { type: String },
    isRecurring: { type: Boolean, default: false },
    recurringRule: { type: String },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
roomBookingSchema.index({ spaceId: 1, startTime: 1, endTime: 1 });
roomBookingSchema.index({ bookedBy: 1, status: 1 });

const utilizationRecordSchema = new Schema(
  {
    spaceId: { type: Schema.Types.ObjectId, ref: 'DDDFacilitySpace', required: true },
    date: { type: Date, required: true },
    totalMinutes: { type: Number, default: 0 },
    bookedMinutes: { type: Number, default: 0 },
    usedMinutes: { type: Number, default: 0 },
    bookingCount: { type: Number, default: 0 },
    peakOccupancy: { type: Number },
    avgOccupancy: { type: Number },
    noShows: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
utilizationRecordSchema.index({ spaceId: 1, date: -1 });

const maintenanceRequestSchema = new Schema(
  {
    spaceId: { type: Schema.Types.ObjectId, ref: 'DDDFacilitySpace', required: true },
    requestType: {
      type: String,
      enum: ['repair', 'cleaning', 'upgrade', 'inspection', 'safety', 'pest_control'],
      required: true,
    },
    priority: { type: String, enum: ['urgent', 'high', 'medium', 'low'], default: 'medium' },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'open',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    requestedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    cost: { type: Number },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
maintenanceRequestSchema.index({ spaceId: 1, status: 1 });
maintenanceRequestSchema.index({ priority: 1, status: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDFacilitySpace =
  mongoose.models.DDDFacilitySpace || mongoose.model('DDDFacilitySpace', facilitySpaceSchema);
const DDDRoomBooking =
  mongoose.models.DDDRoomBooking || mongoose.model('DDDRoomBooking', roomBookingSchema);
const DDDUtilizationRecord =
  mongoose.models.DDDUtilizationRecord ||
  mongoose.model('DDDUtilizationRecord', utilizationRecordSchema);
const DDDSpaceMaintenanceReq =
  mongoose.models.DDDSpaceMaintenanceReq ||
  mongoose.model('DDDSpaceMaintenanceReq', maintenanceRequestSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class SpaceManagement {
  async createSpace(data) {
    return DDDFacilitySpace.create(data);
  }
  async listSpaces(filter = {}, page = 1, limit = 20) {
    return DDDFacilitySpace.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateSpace(id, data) {
    return DDDFacilitySpace.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async createBooking(data) {
    return DDDRoomBooking.create(data);
  }
  async listBookings(filter = {}, page = 1, limit = 20) {
    return DDDRoomBooking.find(filter)
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async recordUtilization(data) {
    return DDDUtilizationRecord.create(data);
  }
  async listUtilization(filter = {}, page = 1, limit = 30) {
    return DDDUtilizationRecord.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createMaintenanceReq(data) {
    return DDDSpaceMaintenanceReq.create(data);
  }
  async listMaintenanceReqs(filter = {}, page = 1, limit = 20) {
    return DDDSpaceMaintenanceReq.find(filter)
      .sort({ requestedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async getSpaceStats() {
    const [spaces, bookings, openReqs, utilRecs] = await Promise.all([
      DDDFacilitySpace.countDocuments({ status: 'available' }),
      DDDRoomBooking.countDocuments({ status: 'confirmed' }),
      DDDSpaceMaintenanceReq.countDocuments({ status: 'open' }),
      DDDUtilizationRecord.countDocuments(),
    ]);
    return {
      availableSpaces: spaces,
      confirmedBookings: bookings,
      openMaintenanceReqs: openReqs,
      utilizationRecords: utilRecs,
    };
  }

  async healthCheck() {
    const [spaces, bookings, utilization, requests] = await Promise.all([
      DDDFacilitySpace.countDocuments(),
      DDDRoomBooking.countDocuments(),
      DDDUtilizationRecord.countDocuments(),
      DDDSpaceMaintenanceReq.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'SpaceManagement',
      counts: { spaces, bookings, utilization, requests },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createSpaceManagementRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new SpaceManagement();

  router.get('/space-management/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/space-management/spaces', async (req, res) => {
    try {
      res.status(201).json(await svc.createSpace(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/space-management/spaces', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listSpaces(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/space-management/spaces/:id', async (req, res) => {
    try {
      res.json(await svc.updateSpace(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/space-management/bookings', async (req, res) => {
    try {
      res.status(201).json(await svc.createBooking(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/space-management/bookings', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listBookings(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/space-management/utilization', async (req, res) => {
    try {
      res.status(201).json(await svc.recordUtilization(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/space-management/utilization', async (req, res) => {
    try {
      const { page = 1, limit = 30, ...f } = req.query;
      res.json(await svc.listUtilization(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/space-management/maintenance-requests', async (req, res) => {
    try {
      res.status(201).json(await svc.createMaintenanceReq(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/space-management/maintenance-requests', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listMaintenanceReqs(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/space-management/stats', async (_req, res) => {
    try {
      res.json(await svc.getSpaceStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  SPACE_TYPES,
  SPACE_STATUSES,
  BOOKING_STATUSES,
  ACCESSIBILITY_FEATURES,
  AMENITIES,
  FLOOR_LEVELS,
  BUILTIN_ROOM_TEMPLATES,
  DDDFacilitySpace,
  DDDRoomBooking,
  DDDUtilizationRecord,
  DDDSpaceMaintenanceReq,
  SpaceManagement,
  createSpaceManagementRouter,
};
