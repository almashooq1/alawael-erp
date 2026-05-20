'use strict';

/**
 * FieldTrip — Wave 202b.
 *
 * "الرحلات الميدانية" — supervised outings for day-rehab beneficiaries.
 * Regulatory requirements:
 *   • Written parental consent per enrolled beneficiary
 *   • Adequate staff:beneficiary ratio (CBAHI typical: 1:3 special-needs)
 *   • Risk assessment + emergency plan
 *   • Documented attendance + return roll-call
 *
 * Workflow:
 *   planning → consents_pending → approved → in_progress → completed
 *   (or → cancelled at any point before in_progress)
 *
 * Wave-18 invariants:
 *   • tripDate in future when status='planning'
 *   • status='approved' requires every enrolled beneficiary to have a
 *     signed consent (enforced at API layer)
 *   • status='in_progress' requires status was 'approved'
 *   • endDate ≥ tripDate
 */

const mongoose = require('mongoose');

const TYPES = ['educational', 'recreational', 'therapeutic', 'community'];
const STATUSES = [
  'planning',
  'consents_pending',
  'approved',
  'in_progress',
  'completed',
  'cancelled',
];
const CONSENT_STATUSES = ['pending', 'signed', 'declined'];

const EnrollmentSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    consentStatus: { type: String, enum: CONSENT_STATUSES, default: 'pending' },
    consentSignedBy: { type: String, default: '', maxlength: 100 },
    consentSignedAt: { type: Date, default: null },
    declineReason: { type: String, default: '', maxlength: 300 },
    actualAttended: { type: Boolean, default: false },
    notes: { type: String, default: '', maxlength: 300 },
  },
  { _id: true }
);

const FieldTripSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 150 },
    destination: { type: String, required: true, maxlength: 200 },
    address: { type: String, default: '', maxlength: 300 },
    tripType: { type: String, enum: TYPES, default: 'educational' },

    tripDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null },
    departureTime: { type: String, default: '08:00', match: /^\d{2}:\d{2}$/ },
    returnTime: { type: String, default: '13:00', match: /^\d{2}:\d{2}$/ },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiarySection',
      default: null,
    },

    // Staff
    leadStaffName: { type: String, default: '', maxlength: 100 },
    staffParticipants: { type: [String], default: () => [] }, // names
    requiredStaffRatio: { type: Number, default: 3, min: 1, max: 10 }, // 1:N

    // Enrollment
    enrollments: { type: [EnrollmentSchema], default: () => [] },

    // Logistics
    transportMethod: {
      type: String,
      enum: ['center_bus', 'rented_transport', 'parent_dropoff', 'walking'],
      default: 'center_bus',
    },
    estimatedCostSAR: { type: Number, default: null, min: 0 },

    // Safety
    riskAssessment: { type: String, default: '', maxlength: 2000 },
    emergencyPlan: { type: String, default: '', maxlength: 1000 },
    emergencyContactName: { type: String, default: '', maxlength: 100 },
    emergencyContactPhone: { type: String, default: '', maxlength: 20 },
    suppliesNeeded: { type: [String], default: () => [] },

    status: { type: String, enum: STATUSES, default: 'planning', index: true },

    // Post-trip
    actualDepartureTime: { type: Date, default: null },
    actualReturnTime: { type: Date, default: null },
    incidentsReported: { type: Boolean, default: false },
    postTripNotes: { type: String, default: '', maxlength: 2000 },

    createdByName: { type: String, default: '', maxlength: 100 },
    approvedByName: { type: String, default: '', maxlength: 100 },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'field_trips' }
);

FieldTripSchema.index({ tripDate: -1, status: 1 });
FieldTripSchema.index({ status: 1, tripDate: 1 });
FieldTripSchema.index({ 'enrollments.beneficiaryId': 1 });

FieldTripSchema.virtual('enrolledCount').get(function () {
  return Array.isArray(this.enrollments) ? this.enrollments.length : 0;
});
FieldTripSchema.virtual('signedCount').get(function () {
  if (!Array.isArray(this.enrollments)) return 0;
  return this.enrollments.filter(e => e.consentStatus === 'signed').length;
});
FieldTripSchema.virtual('staffCount').get(function () {
  return Array.isArray(this.staffParticipants) ? this.staffParticipants.length : 0;
});
FieldTripSchema.virtual('currentRatio').get(function () {
  const sc = Array.isArray(this.staffParticipants) ? this.staffParticipants.length : 0;
  const bc = Array.isArray(this.enrollments) ? this.enrollments.length : 0;
  return sc > 0 ? Number((bc / sc).toFixed(1)) : null;
});

FieldTripSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

FieldTripSchema.path('__invariants').validate(function () {
  let ok = true;
  if (this.endDate && this.tripDate && this.endDate < this.tripDate) {
    this.invalidate('endDate', 'must be ≥ tripDate');
    ok = false;
  }
  if (this.status === 'in_progress' && !this.actualDepartureTime) {
    // soft check — will be auto-set in route handler
  }
  return ok;
});

FieldTripSchema.set('toJSON', { virtuals: true });
FieldTripSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.FieldTrip || mongoose.model('FieldTrip', FieldTripSchema);

module.exports.TYPES = TYPES;
module.exports.STATUSES = STATUSES;
module.exports.CONSENT_STATUSES = CONSENT_STATUSES;
