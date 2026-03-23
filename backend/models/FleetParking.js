/**
 * Fleet Parking Model - نموذج إدارة مواقف الأسطول
 * Parking zones, assigned spots, violations, cost allocation
 */

const mongoose = require('mongoose');

const fleetParkingSchema = new mongoose.Schema(
  {
    parkingNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    type: {
      type: String,
      enum: ['parking_zone', 'assigned_spot', 'violation', 'entry_log'],
      required: true,
    },

    // Zone details (when type = parking_zone)
    zone: {
      name: { type: String },
      nameAr: { type: String },
      location: { type: String },
      capacity: { type: Number },
      occupiedSpots: { type: Number, default: 0 },
      zoneType: {
        type: String,
        enum: ['open', 'covered', 'underground', 'multi_story', 'street', 'private'],
      },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] },
      },
      hourlyRate: { type: Number, default: 0 },
      monthlyRate: { type: Number, default: 0 },
    },

    // Spot assignment (when type = assigned_spot)
    spot: {
      spotNumber: { type: String },
      floor: { type: String },
      section: { type: String },
      vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
      driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
      assignedFrom: { type: Date },
      assignedTo: { type: Date },
      zoneRef: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetParking' },
    },

    // Entry log (when type = entry_log)
    entryLog: {
      vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
      driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
      zoneRef: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetParking' },
      entryTime: { type: Date },
      exitTime: { type: Date },
      duration: { type: Number },
      cost: { type: Number, default: 0 },
    },

    // Violation (when type = violation)
    violation: {
      vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
      driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
      violationType: {
        type: String,
        enum: [
          'no_parking',
          'expired_meter',
          'double_parking',
          'handicap_zone',
          'fire_lane',
          'wrong_spot',
          'overtime',
          'other',
        ],
      },
      location: { type: String },
      fineAmount: { type: Number, default: 0 },
      issueDate: { type: Date },
      dueDate: { type: Date },
      paidDate: { type: Date },
      photo: { type: String },
      violationStatus: {
        type: String,
        enum: ['issued', 'pending_payment', 'paid', 'disputed', 'waived'],
        default: 'issued',
      },
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'full', 'maintenance', 'closed'],
      default: 'active',
    },

    currency: { type: String, default: 'SAR' },
    notes: { type: String },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

fleetParkingSchema.pre('save', async function (next) {
  if (!this.parkingNumber) {
    const count = await mongoose.model('FleetParking').countDocuments();
    this.parkingNumber = `PRK-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

fleetParkingSchema.index({ organization: 1, type: 1 });
fleetParkingSchema.index({ 'spot.vehicle': 1 });
fleetParkingSchema.index({ 'violation.vehicle': 1 });
fleetParkingSchema.index({ status: 1 });

module.exports = mongoose.models.FleetParking || mongoose.model('FleetParking', fleetParkingSchema);
