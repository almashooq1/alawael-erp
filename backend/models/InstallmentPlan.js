/**
 * InstallmentPlan Model — System 38: Payment Gateway
 * خطط التقسيط (Tabby / Tamara)
 */
const mongoose = require('mongoose');

const installmentScheduleSchema = new mongoose.Schema(
  {
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'cancelled'],
      default: 'pending',
    },
    paidAt: { type: Date },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction' },
  },
  { _id: false }
);

const installmentPlanSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    planNumber: { type: String, unique: true, required: true },
    uuid: { type: String, unique: true, required: true },

    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId }, // مرتبط بالفاتورة

    provider: {
      type: String,
      enum: ['tabby', 'tamara'],
      required: true,
    },
    providerPlanId: { type: String }, // معرف الخطة في Tabby/Tamara

    totalAmount: { type: Number, required: true, min: 0 },
    downPayment: { type: Number, default: 0 },
    installmentsCount: { type: Number, required: true, min: 2 },
    installmentAmount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },

    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled', 'defaulted'],
      default: 'pending',
    },

    firstDueDate: { type: Date },
    lastDueDate: { type: Date },

    paidInstallments: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },

    schedule: [installmentScheduleSchema],

    providerResponse: { type: mongoose.Schema.Types.Mixed },
    checkoutUrl: { type: String }, // رابط إتمام الدفع
    redirectUrl: { type: String },

    notes: { type: String },

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'installment_plans',
  }
);

installmentPlanSchema.index({ branchId: 1, status: 1 });
installmentPlanSchema.index({ beneficiaryId: 1, status: 1 });
installmentPlanSchema.index({ provider: 1, status: 1 });
installmentPlanSchema.index({ providerPlanId: 1 });
installmentPlanSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('InstallmentPlan', installmentPlanSchema);
