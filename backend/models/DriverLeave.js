/**
 * Driver Leave / Absence Model - نموذج إجازات وغياب السائقين
 * Leave requests, sick days, substitution, shift coverage
 */

const mongoose = require('mongoose');

const driverLeaveSchema = new mongoose.Schema(
  {
    leaveNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    substituteDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

    type: {
      type: String,
      enum: [
        'annual',
        'sick',
        'emergency',
        'unpaid',
        'maternity',
        'paternity',
        'bereavement',
        'hajj',
        'marriage',
        'training',
        'suspension',
        'rest_day',
        'compensatory',
        'other',
      ],
      required: true,
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number },
    halfDay: { type: Boolean, default: false },
    halfDayPeriod: { type: String, enum: ['morning', 'afternoon'] },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'active', 'completed'],
      default: 'pending',
    },

    reason: { type: String, required: true },
    reasonAr: { type: String },

    // Medical
    medicalCertificate: { type: String },
    doctorName: { type: String },
    hospitalName: { type: String },

    // Approval
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },

    // Coverage
    coverageArranged: { type: Boolean, default: false },
    affectedTrips: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Trip' }],
    affectedShifts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DriverShift' }],
    reassignmentNotes: { type: String },

    // Balance tracking
    balanceBefore: { type: Number },
    balanceAfter: { type: Number },

    attachments: [
      {
        filename: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    notes: { type: String },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

driverLeaveSchema.pre('save', async function (next) {
  if (!this.leaveNumber) {
    const count = await mongoose.model('DriverLeave').countDocuments();
    this.leaveNumber = `LV-${String(count + 1).padStart(6, '0')}`;
  }
  // Calculate total days
  if (this.startDate && this.endDate && !this.totalDays) {
    const diff = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
    this.totalDays = this.halfDay ? 0.5 : Math.max(diff, 1);
  }
  next();
});

driverLeaveSchema.index({ organization: 1, status: 1 });
driverLeaveSchema.index({ driver: 1, startDate: 1, endDate: 1 });
driverLeaveSchema.index({ substituteDriver: 1 });
driverLeaveSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('DriverLeave', driverLeaveSchema);
