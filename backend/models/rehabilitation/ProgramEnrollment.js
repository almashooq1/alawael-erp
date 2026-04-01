/**
 * ProgramEnrollment.js — نموذج التسجيل في البرامج
 * Program Enrollment Model
 *
 * يتتبع تسجيل المستفيد في برنامج تأهيلي معين، مع:
 *  - حالة التسجيل (نشط، متوقف، مكتمل، خروج، محول)
 *  - عدد الجلسات المحضورة والمغيبة
 *  - التحقق من الحد الأقصى لمدة التسجيل (3 سنوات حسب اللائحة)
 */

'use strict';

const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    // ── الروابط الأساسية ─────────────────────────────────────
    beneficiary_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: [true, 'المستفيد مطلوب'],
      index: true,
    },
    program_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RehabProgram',
      required: [true, 'البرنامج مطلوب'],
      index: true,
    },
    specialist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'الأخصائي المسؤول مطلوب'],
    },
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },

    // ── التواريخ ─────────────────────────────────────────────
    enrollment_date: { type: Date, default: Date.now },
    start_date: { type: Date, required: [true, 'تاريخ البدء مطلوب'] },
    expected_end_date: { type: Date },
    actual_end_date: { type: Date },

    // ── حالة التسجيل ─────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['active', 'paused', 'completed', 'discharged', 'transferred'],
        message: 'حالة التسجيل غير صحيحة',
      },
      default: 'active',
      index: true,
    },

    // ── إحصائيات الجلسات ─────────────────────────────────────
    sessions_attended: { type: Number, default: 0, min: 0 },
    sessions_missed: { type: Number, default: 0, min: 0 },

    // ── الخروج من البرنامج ───────────────────────────────────
    discharge_reason: { type: String, trim: true },
    discharge_summary: { type: String, trim: true },
    progress_at_discharge: { type: String, trim: true },

    // ── ملاحظات ──────────────────────────────────────────────
    enrollment_notes: { type: String, trim: true },
    notes: { type: String, trim: true },

    // ── المعتمد والمُسجِّل ───────────────────────────────────
    enrolled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── الحذف الناعم ─────────────────────────────────────────
    is_deleted: { type: Boolean, default: false, index: true },
    deleted_at: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'rehab_enrollments',
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
enrollmentSchema.index({ beneficiary_id: 1, program_id: 1, status: 1 });
enrollmentSchema.index({ beneficiary_id: 1, program_id: 1, start_date: 1 }, { unique: true });
enrollmentSchema.index({ specialist_id: 1, status: 1 });
enrollmentSchema.index({ expected_end_date: 1, status: 1 });

// ── Virtuals ─────────────────────────────────────────────────────────────────
enrollmentSchema.virtual('attendance_rate').get(function () {
  const total = (this.sessions_attended || 0) + (this.sessions_missed || 0);
  if (total === 0) return 0;
  return Math.round(((this.sessions_attended || 0) / total) * 100 * 10) / 10;
});

enrollmentSchema.virtual('duration_months').get(function () {
  if (!this.start_date) return 0;
  const end = this.actual_end_date || new Date();
  const startMs = new Date(this.start_date).getTime();
  const endMs = new Date(end).getTime();
  return Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24 * 30));
});

enrollmentSchema.virtual('is_expiring_soon').get(function () {
  if (!this.expected_end_date || this.status !== 'active') return false;
  const daysLeft =
    (new Date(this.expected_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysLeft >= 0 && daysLeft <= 30;
});

enrollmentSchema.virtual('is_overdue').get(function () {
  if (!this.expected_end_date || this.status !== 'active') return false;
  return new Date(this.expected_end_date) < new Date();
});

const ProgramEnrollment =
  mongoose.models.ProgramEnrollment || mongoose.model('ProgramEnrollment', enrollmentSchema);

module.exports = ProgramEnrollment;
