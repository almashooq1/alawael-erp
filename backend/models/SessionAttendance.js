/**
 * SessionAttendance — did the beneficiary show up for a therapy session?
 *
 * Distinct from the session's own status (SCHEDULED/COMPLETED/…) because
 * a session can be `COMPLETED` (therapist ran the hour) while the
 * beneficiary was `absent` (parent came alone for consultation) or
 * `no_show` (nobody showed — billable per policy).
 *
 * Not the same thing as BeneficiaryManagement/AttendanceRecord, which is
 * course-keyed (day-school attendance). That model stays for the school
 * side; this one is session-keyed for the clinical side.
 *
 * One attendance row per session — (sessionId) is unique.
 */

'use strict';

const mongoose = require('mongoose');

const SessionAttendanceSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapySession',
      required: true,
      unique: true,
      index: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },

    scheduledDate: { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: ['present', 'late', 'absent', 'no_show', 'cancelled'],
      required: true,
      index: true,
    },

    // Only meaningful when status=present|late
    checkInTime: Date,
    checkOutTime: Date,

    // Billing: no-shows often billable per policy; actual absences may
    // not be. The service layer's stats honor this flag, not status
    // directly, so policy changes don't force a data migration.
    billable: { type: Boolean, default: false },

    // Required when status in {absent, no_show, cancelled}. The route
    // enforces this; model accepts empty to allow intermediate states.
    reason: { type: String, trim: true },

    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    markedAt: Date,

    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Primary query: attendance history for a beneficiary over a window.
SessionAttendanceSchema.index({ beneficiaryId: 1, scheduledDate: -1 });
// Daily front-desk view: today's attendance by branch.
SessionAttendanceSchema.index({ branchId: 1, scheduledDate: -1, status: 1 });
// Therapist dashboard: their session attendance.
SessionAttendanceSchema.index({ therapistId: 1, scheduledDate: -1 });

module.exports =
  mongoose.models.SessionAttendance || mongoose.model('SessionAttendance', SessionAttendanceSchema);
