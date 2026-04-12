'use strict';
/**
 * DddResourceManager Model
 * Auto-extracted from services/dddResourceManager.js
 * Schemas, constants, and Mongoose model registrations.
 */
const mongoose = require('mongoose');

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

const DDDResource = mongoose.models.DDDResource || mongoose.model('DDDResource', resourceSchema);

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
  mongoose.models.DDDAvailabilitySlot || mongoose.model('DDDAvailabilitySlot', availabilitySlotSchema);

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
  mongoose.models.DDDResourceAllocation || mongoose.model('DDDResourceAllocation', resourceAllocationSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE — ResourceManager
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  RESOURCE_TYPES,
  RESOURCE_STATUSES,
  AVAILABILITY_PATTERNS,
  SKILL_CATEGORIES,
  BUILTIN_RESOURCES,
};
