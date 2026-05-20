'use strict';

/**
 * BeneficiarySection — Wave 175.
 *
 * "الفصل/المجموعة التخصصية" for day rehab centers (مركز تأهيل نهاري).
 * Each section groups beneficiaries by program (تدخل مبكر / توحد / ذهنية /
 * حركية / متعددة / مهنية), assigns a primary therapist + assistants, and
 * pins to a physical Classroom (room).
 *
 * Distinct from:
 *  • Classroom (الغرفة) — physical room with capacity/equipment.
 *  • Group — generic membership group, not program-aware.
 *  • TherapyGroup — single-session group therapy, not daily roster.
 *
 * Wave-18 invariants:
 *   • name + code unique per branch
 *   • capacity ≥ beneficiaryIds.length
 *   • schedule.startTime < schedule.endTime
 */

const mongoose = require('mongoose');

const PROGRAMS = [
  'early_intervention', // التدخل المبكر (0-6 سنوات)
  'autism', // اضطراب طيف التوحد
  'cognitive', // إعاقات ذهنية
  'motor', // إعاقات حركية
  'multiple', // إعاقات متعددة
  'vocational', // تأهيل مهني
  'sensory', // إعاقات حسية (سمعية/بصرية)
  'language_speech', // اضطرابات النطق واللغة
];

const STATUSES = ['active', 'paused', 'archived'];

const WORKING_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const ScheduleSchema = new mongoose.Schema(
  {
    startTime: { type: String, default: '07:30', match: /^\d{2}:\d{2}$/ }, // HH:MM 24h
    endTime: { type: String, default: '13:30', match: /^\d{2}:\d{2}$/ },
    workingDays: {
      type: [String],
      default: () => ['sun', 'mon', 'tue', 'wed', 'thu'],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.every(d => WORKING_DAYS.includes(d));
        },
        message: 'workingDays values must be sun..sat',
      },
    },
  },
  { _id: false }
);

const BeneficiarySectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    nameEn: { type: String, trim: true, maxlength: 100, default: '' },
    code: { type: String, required: true, uppercase: true, trim: true, maxlength: 20 },
    program: { type: String, enum: PROGRAMS, required: true, index: true },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      default: null,
    },
    primaryTherapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    assistantIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: () => [],
    },
    beneficiaryIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Beneficiary',
      default: () => [],
      index: true,
    },
    ageRange: {
      minMonths: { type: Number, default: null, min: 0 },
      maxMonths: { type: Number, default: null, min: 0 },
    },
    capacity: { type: Number, required: true, min: 1, max: 50, default: 8 },
    schedule: { type: ScheduleSchema, default: () => ({}) },
    status: { type: String, enum: STATUSES, default: 'active', index: true },
    color: { type: String, default: '#3b82f6' },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'beneficiary_sections' }
);

BeneficiarySectionSchema.index({ branchId: 1, code: 1 }, { unique: true });
BeneficiarySectionSchema.index({ branchId: 1, name: 1 });
BeneficiarySectionSchema.index({ program: 1, status: 1 });

BeneficiarySectionSchema.virtual('currentCount').get(function () {
  return Array.isArray(this.beneficiaryIds) ? this.beneficiaryIds.length : 0;
});

BeneficiarySectionSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

BeneficiarySectionSchema.path('__invariants').validate(function () {
  let ok = true;
  if (this.beneficiaryIds && this.beneficiaryIds.length > this.capacity) {
    this.invalidate('beneficiaryIds', `exceeds capacity ${this.capacity}`);
    ok = false;
  }
  if (this.schedule?.startTime && this.schedule?.endTime) {
    if (this.schedule.startTime >= this.schedule.endTime) {
      this.invalidate('schedule.endTime', 'endTime must be after startTime');
      ok = false;
    }
  }
  if (
    this.ageRange?.minMonths != null &&
    this.ageRange?.maxMonths != null &&
    this.ageRange.minMonths > this.ageRange.maxMonths
  ) {
    this.invalidate('ageRange.maxMonths', 'maxMonths must be ≥ minMonths');
    ok = false;
  }
  return ok;
});

BeneficiarySectionSchema.set('toJSON', { virtuals: true });
BeneficiarySectionSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.BeneficiarySection ||
  mongoose.model('BeneficiarySection', BeneficiarySectionSchema);

module.exports.PROGRAMS = PROGRAMS;
module.exports.STATUSES = STATUSES;
module.exports.WORKING_DAYS = WORKING_DAYS;
