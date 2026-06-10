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
    // W1193 — required with NO default while no caller ever set it
    // (smartInsurance.service sets authUuid only) → every requestPriorAuth()
    // threw ValidationError. Schema-side default fixes all callers.
    uuid: { type: String, unique: true, required: true, default: () => require('crypto').randomUUID() },

    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'InsurancePolicy', required: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    // W1193 — written by smartInsurance.service since day one but never
    // declared (strict mode silently dropped them; caught by
    // check:phantom-writes).
    insuranceCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceCompany' },

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
    // W1193 — see insuranceCompanyId note above.
    estimatedStartDate: { type: Date },
    estimatedEndDate: { type: Date },

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

module.exports =
  mongoose.models.PriorAuthorization ||
  mongoose.model('PriorAuthorization', priorAuthorizationSchema);
