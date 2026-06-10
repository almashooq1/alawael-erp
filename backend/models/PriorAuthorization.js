/**
 * PriorAuthorization Model — System 40: Smart Insurance
 * الموافقات المسبقة (Prior Authorization) عبر NPHIES
 */
const mongoose = require('mongoose');

const priorAuthorizationSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    authNumber: { type: String, unique: true, required: true },
    authUuid: { type: String, unique: true, required: true },
    uuid: { type: String, unique: true, required: true },

    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'InsurancePolicy', required: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // NPHIES
    nphiesAuthId: { type: String },

    // تفاصيل الطلب
    serviceType: { type: String, required: true }, // نوع الخدمة المطلوبة
    clinicalJustification: { type: String, required: true }, // المبرر السريري
    requestedServices: [
      {
        serviceCode: { type: String },
        description: { type: String },
        quantity: { type: Number, default: 1 },
        estimatedCost: { type: Number, default: 0 },
      },
    ],

    // الحالة
    status: {
      type: String,
      enum: [
        'pending',
        'submitted',
        'approved',
        'partially_approved',
        'rejected',
        'expired',
        'cancelled',
      ],
      default: 'pending',
    },

    // التواريخ
    submittedAt: { type: Date },
    respondedAt: { type: Date },
    validFrom: { type: Date },
    validUntil: { type: Date },

    // الرفض
    rejectionReason: { type: String },

    // استجابة NPHIES
    nphiesResponse: { type: mongoose.Schema.Types.Mixed },

    notes: { type: String },

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'prior_authorizations',
  }
);

priorAuthorizationSchema.index({ branchId: 1, status: 1 });
priorAuthorizationSchema.index({ policyId: 1, status: 1 });
priorAuthorizationSchema.index({ beneficiaryId: 1, createdAt: -1 });
priorAuthorizationSchema.index({ nphiesAuthId: 1 });
priorAuthorizationSchema.index({ validUntil: 1, status: 1 });
priorAuthorizationSchema.index({ deletedAt: 1 });

// ── W1052: unified-core linkage ───────────────────────────────────────
// On approval (status → 'approved'), publish prior_authorization.approved so
// the cross-module subscriber records an administrative milestone on the
// beneficiary's CareTimeline. NON-callback hooks only (global async save
// plugin puts Kareem in promise-adapter mode — callback hooks would break).
priorAuthorizationSchema.pre('save', function () {
  this.$__priorAuthApprovedNow =
    this.status === 'approved' && (this.isNew || this.isModified('status'));
});

function emitPriorAuthorizationApproved(doc) {
  if (!doc || !doc.$__priorAuthApprovedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('prior-authorization', 'prior_authorization.approved', {
      authorizationId: String(doc._id),
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : null,
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      serviceType: doc.serviceType,
      approvedAt: doc.respondedAt || doc.updatedAt,
    });
  } catch (_err) {
    /* bus optional — never block the write */
  }
}

priorAuthorizationSchema.post('save', emitPriorAuthorizationApproved);

module.exports =
  mongoose.models.PriorAuthorization ||
  mongoose.model('PriorAuthorization', priorAuthorizationSchema);
