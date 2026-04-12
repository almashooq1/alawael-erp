'use strict';
/**
 * DddPatientTransport — Mongoose Models & Constants
 * Auto-extracted from services/dddPatientTransport.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  REQUEST_STATUSES,
  TRIP_TYPES,
  ACCESSIBILITY_TYPES,
  ESCORT_TYPES,
  CANCELLATION_REASONS,
  TRIP_PRIORITIES,
  BUILTIN_ACCESSIBILITY_PROFILES,
  DDDTransportRequest,
  DDDTripRecord,
  DDDAccessibilityNeed,
  DDDMedicalEscort,
};
