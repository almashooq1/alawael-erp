/**
 * Work Permit & Iqama Model — نموذج تصاريح العمل والإقامات
 *
 * Tracks iqamas, work permits, exit/re-entry visas, and related government documents.
 * Integrates with Saudi MOL (Muqeem) workflows.
 */
const mongoose = require('mongoose');

const WorkPermitSchema = new mongoose.Schema(
  {
    recordNumber: { type: String, unique: true, required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },

    documentType: {
      type: String,
      enum: [
        'إقامة',
        'رخصة عمل',
        'تأشيرة خروج وعودة',
        'تأشيرة خروج نهائي',
        'نقل كفالة',
        'تعديل مهنة',
        'تجديد جواز',
        'رخصة قيادة',
        'بطاقة تأمين صحي',
        'شهادة GOSI',
      ],
      required: true,
    },
    documentNumber: { type: String, required: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    hijriExpiryDate: String,

    status: {
      type: String,
      enum: ['ساري', 'قارب الانتهاء', 'منتهي', 'قيد التجديد', 'ملغي', 'قيد المعالجة'],
      default: 'ساري',
    },

    // Cost tracking
    fees: {
      governmentFee: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      paidBy: { type: String, enum: ['الشركة', 'الموظف', 'مشترك'], default: 'الشركة' },
    },

    // Processing
    requestedDate: Date,
    processStartDate: Date,
    completionDate: Date,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

    // Muqeem integration
    muqeemReferenceNumber: String,
    molReferenceNumber: String,
    borderNumber: String,

    // Visa specifics
    visaDetails: {
      visaType: { type: String, enum: ['مفردة', 'متعددة', ''] },
      duration: String, // e.g. '60 يوم', '90 يوم'
      destination: String,
      travelDate: Date,
      returnDate: Date,
    },

    // Reminders
    reminderDays: { type: Number, default: 30 },
    reminderSent: { type: Boolean, default: false },
    lastReminderDate: Date,

    notes: String,
    attachments: [String],
    renewalHistory: [
      {
        previousNumber: String,
        previousExpiry: Date,
        renewedDate: Date,
        cost: Number,
        processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      },
    ],
  },
  { timestamps: true }
);

WorkPermitSchema.index({ employeeId: 1, documentType: 1 });
WorkPermitSchema.index({ expiryDate: 1, status: 1 });
WorkPermitSchema.index({ status: 1, documentType: 1 });
// recordNumber: removed — unique:true creates implicit index

// Virtual: days until expiry
WorkPermitSchema.virtual('daysUntilExpiry').get(function () {
  if (!this.expiryDate) return null;
  const diff = this.expiryDate.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

WorkPermitSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.models.WorkPermit || mongoose.model('WorkPermit', WorkPermitSchema);
