'use strict';
/**
 * DddSpaceManagement — Mongoose Models & Constants
 * Auto-extracted from services/dddSpaceManagement.js
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
};
