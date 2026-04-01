const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    payment_number: { type: String, unique: true },
    invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    payment_date: { type: Date, required: true, default: Date.now },
    amount: { type: Number, required: true },
    payment_method: {
      type: String,
      enum: [
        'cash',
        'card',
        'mada',
        'apple_pay',
        'stc_pay',
        'bank_transfer',
        'insurance',
        'cheque',
      ],
      required: true,
    },
    reference_number: { type: String }, // رقم العملية البنكية
    bank_name: { type: String },
    cheque_number: { type: String },
    cheque_date: { type: Date },
    // تفاصيل بطاقة (مشفرة)
    card_last_four: { type: String },
    card_type: { type: String, enum: ['visa', 'mastercard', 'mada', 'amex'] },
    pos_terminal_id: { type: String },
    // تأمين
    payer_type: {
      type: String,
      enum: ['patient', 'insurance', 'government', 'other'],
      default: 'patient',
    },
    insurance_company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceCompany' },
    insurance_claim_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceClaim' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
      default: 'completed',
    },
    refund_amount: { type: Number, default: 0 },
    refund_reason: { type: String },
    refunded_at: { type: Date },
    notes: { type: String },
    received_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.pre('save', async function (next) {
  if (!this.payment_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      payment_number: new RegExp(`^PMT-${year}-`),
    });
    this.payment_number = `PMT-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

paymentSchema.index({ payment_number: 1 });
paymentSchema.index({ invoice_id: 1 });
paymentSchema.index({ beneficiary_id: 1 });
paymentSchema.index({ branch_id: 1, payment_date: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ deleted_at: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
