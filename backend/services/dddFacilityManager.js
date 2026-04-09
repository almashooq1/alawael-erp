/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Facility Manager — Phase 19 · Facility & Environment Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Building management, floors, rooms, facility master data, facility
 * inspections, and overall physical infrastructure for rehabilitation centres.
 *
 * Aggregates
 *   DDDBuilding          — physical building / site master
 *   DDDFloor             — floor within a building
 *   DDDRoom              — individual room / space
 *   DDDFacilityInspection — periodic facility inspection records
 *
 * Canonical links
 *   locationId   → DDDBranch (dddTenantManager)
 *   managerId    → User
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const BUILDING_TYPES = [
  'main_hospital',
  'outpatient_clinic',
  'rehabilitation_centre',
  'therapy_wing',
  'administrative',
  'research_lab',
  'residential_care',
  'day_centre',
  'warehouse',
  'training_facility',
  'community_centre',
  'mobile_unit',
];

const BUILDING_STATUSES = [
  'operational',
  'under_construction',
  'renovation',
  'temporary_closure',
  'decommissioned',
  'planned',
  'partially_operational',
  'emergency_only',
];

const ROOM_TYPES = [
  'therapy_room',
  'consultation_room',
  'assessment_room',
  'group_therapy',
  'sensory_room',
  'hydrotherapy_pool',
  'gym',
  'office',
  'reception',
  'waiting_area',
  'storage',
  'pharmacy',
  'laboratory',
  'meeting_room',
  'break_room',
  'server_room',
  'bathroom',
  'corridor',
];

const ROOM_STATUSES = [
  'available',
  'occupied',
  'reserved',
  'maintenance',
  'out_of_service',
  'cleaning',
  'setup',
  'closed',
  'restricted',
  'quarantine',
];

const ACCESSIBILITY_FEATURES = [
  'wheelchair_accessible',
  'hearing_loop',
  'braille_signage',
  'visual_alerts',
  'adjustable_furniture',
  'wide_doorways',
  'ramp_access',
  'elevator_nearby',
  'accessible_bathroom',
  'tactile_flooring',
  'automatic_doors',
  'low_counter',
];

const INSPECTION_TYPES = [
  'fire_safety',
  'health_safety',
  'accessibility_audit',
  'electrical',
  'plumbing',
  'hvac',
  'structural',
  'infection_control',
  'security',
  'environmental',
  'equipment_safety',
  'general',
];

/* ── Built-in buildings ─────────────────────────────────────────────────── */
const BUILTIN_BUILDINGS = [
  {
    code: 'BLD-MAIN',
    name: 'Main Rehabilitation Centre',
    nameAr: 'مركز التأهيل الرئيسي',
    type: 'rehabilitation_centre',
    floors: 4,
  },
  {
    code: 'BLD-OPD',
    name: 'Outpatient Department',
    nameAr: 'قسم العيادات الخارجية',
    type: 'outpatient_clinic',
    floors: 2,
  },
  {
    code: 'BLD-ADMIN',
    name: 'Administrative Building',
    nameAr: 'المبنى الإداري',
    type: 'administrative',
    floors: 3,
  },
  {
    code: 'BLD-THER',
    name: 'Therapy Wing',
    nameAr: 'جناح العلاج',
    type: 'therapy_wing',
    floors: 2,
  },
  {
    code: 'BLD-RES',
    name: 'Residential Care Facility',
    nameAr: 'مرفق الرعاية السكنية',
    type: 'residential_care',
    floors: 3,
  },
  {
    code: 'BLD-DAY',
    name: 'Day Care Centre',
    nameAr: 'مركز الرعاية النهارية',
    type: 'day_centre',
    floors: 1,
  },
  {
    code: 'BLD-TRAIN',
    name: 'Training & Education Centre',
    nameAr: 'مركز التدريب والتعليم',
    type: 'training_facility',
    floors: 2,
  },
  {
    code: 'BLD-COMM',
    name: 'Community Integration Centre',
    nameAr: 'مركز الدمج المجتمعي',
    type: 'community_centre',
    floors: 1,
  },
  {
    code: 'BLD-HYDRO',
    name: 'Hydrotherapy Building',
    nameAr: 'مبنى العلاج المائي',
    type: 'rehabilitation_centre',
    floors: 1,
  },
  {
    code: 'BLD-STORE',
    name: 'Central Warehouse',
    nameAr: 'المستودع المركزي',
    type: 'warehouse',
    floors: 1,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Building ──────────────────────────────────────────────────────────── */
const buildingSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: BUILDING_TYPES, required: true },
    status: { type: String, enum: BUILDING_STATUSES, default: 'operational' },
    locationId: { type: Schema.Types.ObjectId },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
      coordinates: { lat: Number, lng: Number },
    },
    totalFloors: { type: Number, default: 1 },
    totalArea: { type: Number },
    yearBuilt: { type: Number },
    lastRenovation: { type: Date },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    emergencyContact: { name: String, phone: String, email: String },
    operatingHours: {
      weekdays: { open: String, close: String },
      weekends: { open: String, close: String },
    },
    accessibilityFeatures: [{ type: String, enum: ACCESSIBILITY_FEATURES }],
    certifications: [{ name: String, issuedDate: Date, expiryDate: Date }],
    images: [{ url: String, caption: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

buildingSchema.index({ type: 1, status: 1 });
buildingSchema.index({ code: 1 });

const DDDBuilding = mongoose.models.DDDBuilding || mongoose.model('DDDBuilding', buildingSchema);

/* ── Floor ─────────────────────────────────────────────────────────────── */
const floorSchema = new Schema(
  {
    buildingId: { type: Schema.Types.ObjectId, ref: 'DDDBuilding', required: true },
    floorNumber: { type: Number, required: true },
    name: { type: String },
    nameAr: { type: String },
    totalArea: { type: Number },
    usableArea: { type: Number },
    floorPlanUrl: { type: String },
    isAccessible: { type: Boolean, default: true },
    hasElevator: { type: Boolean, default: false },
    departments: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

floorSchema.index({ buildingId: 1, floorNumber: 1 });

const DDDFloor = mongoose.models.DDDFloor || mongoose.model('DDDFloor', floorSchema);

/* ── Room ──────────────────────────────────────────────────────────────── */
const roomSchema = new Schema(
  {
    buildingId: { type: Schema.Types.ObjectId, ref: 'DDDBuilding', required: true },
    floorId: { type: Schema.Types.ObjectId, ref: 'DDDFloor' },
    roomNumber: { type: String, required: true },
    name: { type: String },
    nameAr: { type: String },
    type: { type: String, enum: ROOM_TYPES, required: true },
    status: { type: String, enum: ROOM_STATUSES, default: 'available' },
    capacity: { type: Number, default: 1 },
    area: { type: Number },
    department: { type: String },
    equipment: [{ name: String, quantity: Number, condition: String }],
    amenities: [{ type: String }],
    accessibilityFeatures: [{ type: String, enum: ACCESSIBILITY_FEATURES }],
    isBookable: { type: Boolean, default: true },
    hourlyRate: { type: Number, default: 0 },
    images: [{ url: String, caption: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

roomSchema.index({ buildingId: 1, type: 1, status: 1 });
roomSchema.index({ roomNumber: 1 });

const DDDRoom = mongoose.models.DDDRoom || mongoose.model('DDDRoom', roomSchema);

/* ── Facility Inspection ───────────────────────────────────────────────── */
const facilityInspectionSchema = new Schema(
  {
    buildingId: { type: Schema.Types.ObjectId, ref: 'DDDBuilding', required: true },
    floorId: { type: Schema.Types.ObjectId, ref: 'DDDFloor' },
    roomId: { type: Schema.Types.ObjectId, ref: 'DDDRoom' },
    type: { type: String, enum: INSPECTION_TYPES, required: true },
    inspectorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'failed', 'cancelled'],
      default: 'scheduled',
    },
    result: { type: String, enum: ['pass', 'pass_with_remarks', 'fail', 'pending'] },
    score: { type: Number, min: 0, max: 100 },
    findings: [
      {
        category: String,
        severity: { type: String, enum: ['critical', 'major', 'minor', 'observation'] },
        description: String,
        recommendation: String,
        resolved: { type: Boolean, default: false },
        resolvedDate: Date,
      },
    ],
    attachments: [{ name: String, url: String, type: String }],
    nextInspectionDate: { type: Date },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

facilityInspectionSchema.index({ buildingId: 1, type: 1, status: 1 });

const DDDFacilityInspection =
  mongoose.models.DDDFacilityInspection ||
  mongoose.model('DDDFacilityInspection', facilityInspectionSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class FacilityManager extends BaseDomainModule {
  constructor() {
    super('FacilityManager', {
      description: 'Building & facility management for rehabilitation centres',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedBuildings();
    this.log('Facility Manager initialised ✓');
    return true;
  }

  async _seedBuildings() {
    for (const b of BUILTIN_BUILDINGS) {
      const exists = await DDDBuilding.findOne({ code: b.code }).lean();
      if (!exists) await DDDBuilding.create({ ...b, status: 'operational', totalFloors: b.floors });
    }
  }

  /* ── Buildings CRUD ── */
  async listBuildings(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDBuilding.find(q).sort({ name: 1 }).lean();
  }
  async getBuilding(id) {
    return DDDBuilding.findById(id).lean();
  }
  async createBuilding(data) {
    return DDDBuilding.create(data);
  }
  async updateBuilding(id, data) {
    return DDDBuilding.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Floors CRUD ── */
  async listFloors(buildingId) {
    return DDDFloor.find({ buildingId }).sort({ floorNumber: 1 }).lean();
  }
  async getFloor(id) {
    return DDDFloor.findById(id).lean();
  }
  async createFloor(data) {
    return DDDFloor.create(data);
  }
  async updateFloor(id, data) {
    return DDDFloor.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Rooms CRUD ── */
  async listRooms(filters = {}) {
    const q = {};
    if (filters.buildingId) q.buildingId = filters.buildingId;
    if (filters.floorId) q.floorId = filters.floorId;
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.isBookable !== undefined) q.isBookable = filters.isBookable;
    return DDDRoom.find(q).sort({ roomNumber: 1 }).lean();
  }
  async getRoom(id) {
    return DDDRoom.findById(id).lean();
  }
  async createRoom(data) {
    return DDDRoom.create(data);
  }
  async updateRoom(id, data) {
    return DDDRoom.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async updateRoomStatus(id, status) {
    return DDDRoom.findByIdAndUpdate(id, { status }, { new: true });
  }

  /* ── Inspections CRUD ── */
  async listInspections(filters = {}) {
    const q = {};
    if (filters.buildingId) q.buildingId = filters.buildingId;
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDFacilityInspection.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async getInspection(id) {
    return DDDFacilityInspection.findById(id).lean();
  }
  async createInspection(data) {
    return DDDFacilityInspection.create(data);
  }
  async completeInspection(id, data) {
    return DDDFacilityInspection.findByIdAndUpdate(
      id,
      {
        ...data,
        status: 'completed',
        completedDate: new Date(),
      },
      { new: true, runValidators: true }
    );
  }

  /* ── Analytics ── */
  async getFacilityAnalytics() {
    const [buildings, floors, rooms, inspections] = await Promise.all([
      DDDBuilding.countDocuments(),
      DDDFloor.countDocuments(),
      DDDRoom.countDocuments(),
      DDDFacilityInspection.countDocuments(),
    ]);
    const operational = await DDDBuilding.countDocuments({ status: 'operational' });
    const availableRooms = await DDDRoom.countDocuments({ status: 'available' });
    const pendingInspections = await DDDFacilityInspection.countDocuments({ status: 'scheduled' });
    return {
      buildings,
      operational,
      floors,
      rooms,
      availableRooms,
      inspections,
      pendingInspections,
    };
  }

  async healthCheck() {
    const [buildings, floors, rooms, inspections] = await Promise.all([
      DDDBuilding.countDocuments(),
      DDDFloor.countDocuments(),
      DDDRoom.countDocuments(),
      DDDFacilityInspection.countDocuments(),
    ]);
    return { status: 'healthy', buildings, floors, rooms, inspections };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createFacilityManagerRouter() {
  const router = Router();
  const svc = new FacilityManager();

  /* Buildings */
  router.get('/facility/buildings', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listBuildings(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/facility/buildings/:id', async (req, res) => {
    try {
      const d = await svc.getBuilding(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/facility/buildings', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createBuilding(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/facility/buildings/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateBuilding(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Floors */
  router.get('/facility/buildings/:buildingId/floors', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFloors(req.params.buildingId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/facility/floors', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createFloor(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Rooms */
  router.get('/facility/rooms', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRooms(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/facility/rooms/:id', async (req, res) => {
    try {
      const d = await svc.getRoom(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/facility/rooms', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRoom(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/facility/rooms/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateRoom(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.patch('/facility/rooms/:id/status', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateRoomStatus(req.params.id, req.body.status) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Inspections */
  router.get('/facility/inspections', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listInspections(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/facility/inspections/:id', async (req, res) => {
    try {
      const d = await svc.getInspection(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/facility/inspections', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createInspection(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/facility/inspections/:id/complete', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeInspection(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/facility/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getFacilityAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/facility/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  FacilityManager,
  DDDBuilding,
  DDDFloor,
  DDDRoom,
  DDDFacilityInspection,
  BUILDING_TYPES,
  BUILDING_STATUSES,
  ROOM_TYPES,
  ROOM_STATUSES,
  ACCESSIBILITY_FEATURES,
  INSPECTION_TYPES,
  BUILTIN_BUILDINGS,
  createFacilityManagerRouter,
};
