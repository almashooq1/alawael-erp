const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    leave_number: { type: String, unique: true },
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    leave_type: {
      type: String,
      enum: [
        'annual',
        'sick',
        'maternity',
        'paternity',
        'bereavement',
        'hajj',
        'marriage',
        'emergency',
        'study',
        'compensatory',
      ],
      required: true,
    },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    days_requested: { type: Number, required: true },
    days_approved: { type: Number },
    reason: { type: String, maxlength: 1000 },
    attachment_path: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    applied_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewed_at: { type: Date },
    rejection_reason: { type: String },
    is_paid: { type: Boolean, default: true },
    deducted_from_balance: { type: Boolean, default: false },
    notes: { type: String },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

leaveSchema.pre('save', async function (next) {
  if (!this.leave_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      leave_number: new RegExp(`^LV-${year}-`),
    });
    this.leave_number = `LV-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

leaveSchema.virtual('duration_days').get(function () {
  if (!this.start_date || !this.end_date) return 0;
  return Math.ceil((this.end_date - this.start_date) / (1000 * 60 * 60 * 24)) + 1;
});

leaveSchema.statics.maxDaysByType = {
  annual: 21,
  sick: 120,
  maternity: 70,
  paternity: 3,
  bereavement: 5,
  hajj: 15,
  marriage: 5,
  emergency: 3,
  study: 30,
  compensatory: null,
};

leaveSchema.index({ employee_id: 1, start_date: -1 });
leaveSchema.index({ branch_id: 1, status: 1 });
leaveSchema.index({ leave_type: 1 });
leaveSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);
