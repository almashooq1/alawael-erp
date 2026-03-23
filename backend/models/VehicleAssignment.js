/**
 * Vehicle Assignment Model - نموذج تعيينات المركبات
 * Driver-vehicle assignment tracking, department allocation, handover
 */

const mongoose = require('mongoose');

const vehicleAssignmentSchema = new mongoose.Schema(
  {
    assignmentNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    previousDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

    department: { type: String },
    branch: { type: String },

    type: {
      type: String,
      enum: ['permanent', 'temporary', 'shared', 'pool', 'emergency', 'rotation'],
      default: 'permanent',
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date },
    expectedReturnDate: { type: Date },

    status: {
      type: String,
      enum: ['active', 'returned', 'transferred', 'suspended', 'expired'],
      default: 'active',
    },

    // Handover details
    handover: {
      date: { type: Date },
      odometerReading: { type: Number },
      fuelLevel: { type: Number, min: 0, max: 100 },
      condition: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      conditionNotes: { type: String },
      photos: [{ type: String }],
      accessories: [
        {
          name: { type: String },
          present: { type: Boolean, default: true },
          condition: { type: String },
        },
      ],
      handoverBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      driverSignature: { type: String },
      supervisorSignature: { type: String },
    },

    // Return details
    returnDetails: {
      date: { type: Date },
      odometerReading: { type: Number },
      fuelLevel: { type: Number, min: 0, max: 100 },
      condition: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      conditionNotes: { type: String },
      photos: [{ type: String }],
      damagesFound: [
        {
          description: { type: String },
          severity: { type: String, enum: ['minor', 'moderate', 'major'] },
          photo: { type: String },
          estimatedCost: { type: Number },
        },
      ],
      returnedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },

    // Usage limits
    maxDailyKm: { type: Number },
    maxMonthlyKm: { type: Number },
    allowedZones: [{ type: String }],
    restrictedHours: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String },
      endTime: { type: String },
    },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

vehicleAssignmentSchema.pre('save', async function (next) {
  if (!this.assignmentNumber) {
    const count = await mongoose.model('VehicleAssignment').countDocuments();
    this.assignmentNumber = `ASN-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

vehicleAssignmentSchema.index({ organization: 1, status: 1 });
vehicleAssignmentSchema.index({ vehicle: 1, status: 1 });
vehicleAssignmentSchema.index({ driver: 1, status: 1 });
vehicleAssignmentSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.models.VehicleAssignment || mongoose.model('VehicleAssignment', vehicleAssignmentSchema);
