/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Patient Transport — Phase 24 · Transportation & Logistics
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Patient-specific transport: trip requests, accessibility needs,
 * medical escort requirements, pickup/dropoff coordination.
 *
 * Aggregates
 *   DDDTransportRequest  — patient trip request
 *   DDDTripRecord        — completed / in-progress trip
 *   DDDAccessibilityNeed — patient accessibility requirements
 *   DDDMedicalEscort     — medical escort assignment
 *
 * Canonical links
 *   beneficiaryId → Beneficiary
 *   vehicleId     → DDDVehicle
 *   driverId      → DDDDriver
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

const REQUEST_STATUSES = [
  'pending',
  'confirmed',
  'assigned',
  'driver_en_route',
  'patient_picked_up',
  'in_transit',
  'arrived',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
  'rejected',
];

const TRIP_TYPES = [
  'therapy_session',
  'medical_appointment',
  'diagnostic_test',
  'home_to_clinic',
  'clinic_to_home',
  'inter_facility',
  'emergency_transport',
  'group_therapy',
  'field_trip',
  'assessment_visit',
  'school_transport',
  'community_outing',
];

const ACCESSIBILITY_TYPES = [
  'wheelchair_standard',
  'wheelchair_motorized',
  'stretcher',
  'walker_assist',
  'visual_impairment',
  'hearing_impairment',
  'cognitive_support',
  'oxygen_equipment',
  'behavioral_support',
  'pediatric_car_seat',
  'bariatric_transport',
  'sensory_sensitivity',
];

const ESCORT_TYPES = [
  'nurse',
  'therapist',
  'behavioral_specialist',
  'paramedic',
  'caregiver',
  'family_member',
  'social_worker',
  'interpreter',
  'respiratory_therapist',
  'occupational_therapist',
];

const CANCELLATION_REASONS = [
  'patient_request',
  'medical_condition',
  'weather',
  'vehicle_unavailable',
  'driver_unavailable',
  'schedule_conflict',
  'no_show',
  'facility_closure',
  'insurance_issue',
  'other',
];

const TRIP_PRIORITIES = ['emergency', 'urgent', 'high', 'normal', 'low', 'scheduled'];

/* ── Built-in accessibility profiles ────────────────────────────────────── */
const BUILTIN_ACCESSIBILITY_PROFILES = [
  {
    code: 'ACCP-WC',
    name: 'Wheelchair User',
    nameAr: 'مستخدم كرسي متحرك',
    needs: ['wheelchair_standard'],
    vehicleRequirement: 'wheelchair_van',
  },
  {
    code: 'ACCP-MWC',
    name: 'Motorized Wheelchair',
    nameAr: 'كرسي متحرك آلي',
    needs: ['wheelchair_motorized'],
    vehicleRequirement: 'wheelchair_van',
  },
  {
    code: 'ACCP-STR',
    name: 'Stretcher Patient',
    nameAr: 'مريض نقالة',
    needs: ['stretcher'],
    vehicleRequirement: 'stretcher_van',
  },
  {
    code: 'ACCP-VIS',
    name: 'Visual Impairment',
    nameAr: 'إعاقة بصرية',
    needs: ['visual_impairment'],
    vehicleRequirement: 'any',
  },
  {
    code: 'ACCP-HEAR',
    name: 'Hearing Impairment',
    nameAr: 'إعاقة سمعية',
    needs: ['hearing_impairment'],
    vehicleRequirement: 'any',
  },
  {
    code: 'ACCP-COG',
    name: 'Cognitive Support',
    nameAr: 'دعم معرفي',
    needs: ['cognitive_support', 'behavioral_support'],
    vehicleRequirement: 'any',
  },
  {
    code: 'ACCP-O2',
    name: 'Oxygen Equipment',
    nameAr: 'معدات أكسجين',
    needs: ['oxygen_equipment'],
    vehicleRequirement: 'specialized_medical',
  },
  {
    code: 'ACCP-PED',
    name: 'Pediatric Transport',
    nameAr: 'نقل أطفال',
    needs: ['pediatric_car_seat'],
    vehicleRequirement: 'minivan',
  },
  {
    code: 'ACCP-BAR',
    name: 'Bariatric Transport',
    nameAr: 'نقل وزن زائد',
    needs: ['bariatric_transport'],
    vehicleRequirement: 'specialized_medical',
  },
  {
    code: 'ACCP-SENS',
    name: 'Sensory Sensitivity',
    nameAr: 'حساسية حسية',
    needs: ['sensory_sensitivity'],
    vehicleRequirement: 'any',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Transport Request ─────────────────────────────────────────────────── */
const transportRequestSchema = new Schema(
  {
    requestCode: { type: String, required: true, unique: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    tripType: { type: String, enum: TRIP_TYPES, required: true },
    status: { type: String, enum: REQUEST_STATUSES, default: 'pending' },
    priority: { type: String, enum: TRIP_PRIORITIES, default: 'normal' },
    pickupLocation: { address: String, lat: Number, lng: Number, notes: String },
    dropoffLocation: { address: String, lat: Number, lng: Number, notes: String },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String },
    returnTrip: { type: Boolean, default: false },
    returnTime: { type: String },
    accessibilityNeeds: [{ type: String, enum: ACCESSIBILITY_TYPES }],
    escortRequired: { type: Boolean, default: false },
    escortType: { type: String, enum: ESCORT_TYPES },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'DDDVehicle' },
    driverId: { type: Schema.Types.ObjectId, ref: 'DDDDriver' },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    cancellationReason: { type: String, enum: CANCELLATION_REASONS },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

transportRequestSchema.index({ beneficiaryId: 1, scheduledDate: 1 });
transportRequestSchema.index({ status: 1, scheduledDate: 1 });

const DDDTransportRequest =
  mongoose.models.DDDTransportRequest ||
  mongoose.model('DDDTransportRequest', transportRequestSchema);

/* ── Trip Record ───────────────────────────────────────────────────────── */
const tripRecordSchema = new Schema(
  {
    tripCode: { type: String, required: true, unique: true },
    requestId: { type: Schema.Types.ObjectId, ref: 'DDDTransportRequest' },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'DDDVehicle' },
    driverId: { type: Schema.Types.ObjectId, ref: 'DDDDriver' },
    tripType: { type: String, enum: TRIP_TYPES },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'incident'],
    },
    pickupTime: { type: Date },
    dropoffTime: { type: Date },
    actualPickupTime: { type: Date },
    actualDropoffTime: { type: Date },
    distanceKm: { type: Number },
    durationMinutes: { type: Number },
    startOdometer: { type: Number },
    endOdometer: { type: Number },
    route: [{ lat: Number, lng: Number, timestamp: Date }],
    passengerCount: { type: Number, default: 1 },
    escortId: { type: Schema.Types.ObjectId, ref: 'User' },
    incidents: [{ type: String, description: String, timestamp: Date }],
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

tripRecordSchema.index({ beneficiaryId: 1, pickupTime: -1 });
tripRecordSchema.index({ driverId: 1, pickupTime: -1 });

const DDDTripRecord =
  mongoose.models.DDDTripRecord || mongoose.model('DDDTripRecord', tripRecordSchema);

/* ── Accessibility Need ────────────────────────────────────────────────── */
const accessibilityNeedSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    needs: [{ type: String, enum: ACCESSIBILITY_TYPES }],
    vehicleRequirement: { type: String },
    specialInstructions: { type: String },
    medicalEquipment: [{ name: String, description: String }],
    emergencyProtocol: { type: String },
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDAccessibilityNeed =
  mongoose.models.DDDAccessibilityNeed ||
  mongoose.model('DDDAccessibilityNeed', accessibilityNeedSchema);

/* ── Medical Escort ────────────────────────────────────────────────────── */
const medicalEscortSchema = new Schema(
  {
    escortCode: { type: String, required: true, unique: true },
    tripId: { type: Schema.Types.ObjectId, ref: 'DDDTripRecord' },
    requestId: { type: Schema.Types.ObjectId, ref: 'DDDTransportRequest' },
    escortUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    escortType: { type: String, enum: ESCORT_TYPES, required: true },
    status: { type: String, enum: ['assigned', 'confirmed', 'on_trip', 'completed', 'cancelled'] },
    specialInstructions: { type: String },
    medicalNotes: { type: String },
    equipmentNeeded: [{ name: String, quantity: Number }],
    assignedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    report: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDMedicalEscort =
  mongoose.models.DDDMedicalEscort || mongoose.model('DDDMedicalEscort', medicalEscortSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class PatientTransport extends BaseDomainModule {
  constructor() {
    super('PatientTransport', {
      description: 'Patient-specific transport requests & trip management',
      version: '1.0.0',
    });
  }

  async initialize() {
    this.log('Patient Transport initialised ✓');
    return true;
  }

  /* ── Requests ── */
  async listRequests(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.status) q.status = filters.status;
    if (filters.tripType) q.tripType = filters.tripType;
    return DDDTransportRequest.find(q).sort({ scheduledDate: -1 }).limit(100).lean();
  }
  async getRequest(id) {
    return DDDTransportRequest.findById(id).lean();
  }
  async createRequest(data) {
    if (!data.requestCode) data.requestCode = `TREQ-${Date.now()}`;
    return DDDTransportRequest.create(data);
  }
  async updateRequest(id, data) {
    return DDDTransportRequest.findByIdAndUpdate(id, data, { new: true });
  }
  async cancelRequest(id, reason) {
    return DDDTransportRequest.findByIdAndUpdate(
      id,
      { status: 'cancelled', cancellationReason: reason },
      { new: true }
    );
  }

  /* ── Trip Records ── */
  async listTrips(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.driverId) q.driverId = filters.driverId;
    if (filters.status) q.status = filters.status;
    return DDDTripRecord.find(q).sort({ pickupTime: -1 }).limit(100).lean();
  }
  async startTrip(data) {
    if (!data.tripCode) data.tripCode = `TRIP-${Date.now()}`;
    data.status = 'in_progress';
    data.actualPickupTime = new Date();
    return DDDTripRecord.create(data);
  }
  async completeTrip(id, details) {
    return DDDTripRecord.findByIdAndUpdate(
      id,
      { ...details, status: 'completed', actualDropoffTime: new Date() },
      { new: true }
    );
  }

  /* ── Accessibility ── */
  async listAccessibilityNeeds(beneficiaryId) {
    const q = beneficiaryId ? { beneficiaryId } : {};
    return DDDAccessibilityNeed.find(q).lean();
  }
  async setAccessibilityNeed(data) {
    if (!data.code) data.code = `ACCN-${Date.now()}`;
    return DDDAccessibilityNeed.create(data);
  }
  async updateAccessibilityNeed(id, data) {
    return DDDAccessibilityNeed.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Escorts ── */
  async listEscorts(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    return DDDMedicalEscort.find(q).sort({ assignedAt: -1 }).lean();
  }
  async assignEscort(data) {
    if (!data.escortCode) data.escortCode = `ESC-${Date.now()}`;
    return DDDMedicalEscort.create(data);
  }

  /* ── Analytics ── */
  async getPatientTransportAnalytics() {
    const [requests, trips, escorts] = await Promise.all([
      DDDTransportRequest.countDocuments(),
      DDDTripRecord.countDocuments(),
      DDDMedicalEscort.countDocuments(),
    ]);
    const pendingRequests = await DDDTransportRequest.countDocuments({ status: 'pending' });
    const activeTrips = await DDDTripRecord.countDocuments({ status: 'in_progress' });
    return { requests, trips, escorts, pendingRequests, activeTrips };
  }

  async healthCheck() {
    const [pending, active] = await Promise.all([
      DDDTransportRequest.countDocuments({ status: 'pending' }),
      DDDTripRecord.countDocuments({ status: 'in_progress' }),
    ]);
    return { status: 'healthy', pendingRequests: pending, activeTrips: active };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createPatientTransportRouter() {
  const router = Router();
  const svc = new PatientTransport();

  /* Requests */
  router.get('/patient-transport/requests', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequests(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/patient-transport/requests/:id', async (req, res) => {
    try {
      const d = await svc.getRequest(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/patient-transport/requests', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequest(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/patient-transport/requests/:id/cancel', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.cancelRequest(req.params.id, req.body.reason) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Trips */
  router.get('/patient-transport/trips', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTrips(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/patient-transport/trips/start', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.startTrip(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/patient-transport/trips/:id/complete', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeTrip(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Accessibility */
  router.get('/patient-transport/accessibility', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAccessibilityNeeds(req.query.beneficiaryId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/patient-transport/accessibility', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.setAccessibilityNeed(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Escorts */
  router.get('/patient-transport/escorts', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEscorts(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/patient-transport/escorts', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.assignEscort(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/patient-transport/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getPatientTransportAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/patient-transport/health', async (_req, res) => {
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
  PatientTransport,
  DDDTransportRequest,
  DDDTripRecord,
  DDDAccessibilityNeed,
  DDDMedicalEscort,
  REQUEST_STATUSES,
  TRIP_TYPES,
  ACCESSIBILITY_TYPES,
  ESCORT_TYPES,
  CANCELLATION_REASONS,
  TRIP_PRIORITIES,
  BUILTIN_ACCESSIBILITY_PROFILES,
  createPatientTransportRouter,
};
