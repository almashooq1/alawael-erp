'use strict';
/**
 * DddFacilityManager — Mongoose Models & Constants
 * Auto-extracted from services/dddFacilityManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Models ═══════════════════ */

const DDDBuilding = mongoose.models.DDDBuilding || mongoose.model('DDDBuilding', buildingSchema);

/* ── Floor ─────────────────────────────────────────────────────────────── */
const DDDFloor = mongoose.models.DDDFloor || mongoose.model('DDDFloor', floorSchema);

/* ── Room ──────────────────────────────────────────────────────────────── */
const DDDRoom = mongoose.models.DDDRoom || mongoose.model('DDDRoom', roomSchema);

/* ── Facility Inspection ───────────────────────────────────────────────── */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  BUILDING_TYPES,
  BUILDING_STATUSES,
  ROOM_TYPES,
  ROOM_STATUSES,
  ACCESSIBILITY_FEATURES,
  INSPECTION_TYPES,
  BUILTIN_BUILDINGS,
  DDDBuilding,
  DDDFloor,
  DDDRoom,
  DDDFacilityInspection,
};
