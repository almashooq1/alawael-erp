/**
 * CrmReferralCommission Model — نموذج عمولات الإحالة
 */
const mongoose = require('mongoose');

const crmReferralCommissionSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmPartner', required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmLead', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', default: null },
    amount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'rejected'],
      default: 'pending',
    },
    referenceNumber: { type: String, maxlength: 100 },
    paymentDate: { type: Date },
    paymentMethod: { type: String, maxlength: 100 },
    notes: { type: String, maxlength: 2000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

crmReferralCommissionSchema.index({ partnerId: 1, status: 1 });
crmReferralCommissionSchema.index({ leadId: 1 });

crmReferralCommissionSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports =
  mongoose.models.CrmReferralCommission ||
  mongoose.model('CrmReferralCommission', crmReferralCommissionSchema);
