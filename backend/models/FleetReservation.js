/**
 * Fleet Reservation / Booking Model - نموذج حجوزات الأسطول
 * Vehicle booking calendar, availability, approval workflow
 */

const mongoose = require('mongoose');

const fleetReservationSchema = new mongoose.Schema(
  {
    reservationNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String },

    purpose: {
      type: String,
      enum: [
        'business_trip',
        'client_visit',
        'delivery',
        'field_work',
        'maintenance_run',
        'executive',
        'training',
        'event',
        'emergency',
        'other',
      ],
      required: true,
    },
    purposeDetails: { type: String },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startOdometer: { type: Number },
    endOdometer: { type: Number },

    pickupLocation: { type: String },
    returnLocation: { type: String },
    destination: { type: String },
    estimatedDistance: { type: Number },

    passengers: { type: Number, default: 1 },
    passengerNames: [{ type: String }],

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled', 'no_show'],
      default: 'pending',
    },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },

    isRecurring: { type: Boolean, default: false },
    recurringPattern: {
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
      endDate: { type: Date },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    },

    // Post-trip
    actualReturnDate: { type: Date },
    fuelLevel: { type: Number, min: 0, max: 100 },
    condition: { type: String, enum: ['good', 'minor_issues', 'damaged'], default: 'good' },
    damageNotes: { type: String },

    priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
    notes: { type: String },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

fleetReservationSchema.pre('save', async function (next) {
  if (!this.reservationNumber) {
    const count = await mongoose.model('FleetReservation').countDocuments();
    this.reservationNumber = `RSV-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

fleetReservationSchema.index({ organization: 1, status: 1 });
fleetReservationSchema.index({ vehicle: 1, startDate: 1, endDate: 1 });
fleetReservationSchema.index({ requestedBy: 1 });
fleetReservationSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.models.FleetReservation || mongoose.model('FleetReservation', fleetReservationSchema);
