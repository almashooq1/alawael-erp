const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
  beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
  status: {
    type: String,
    enum: ['scheduled', 'picked_up', 'dropped_off', 'absent', 'cancelled'],
    default: 'scheduled',
  },
  pickup_time_actual: { type: Date },
  dropoff_time_actual: { type: Date },
  pickup_lat: { type: Number },
  pickup_lng: { type: Number },
  notes: { type: String },
});

const tripSchema = new mongoose.Schema(
  {
    trip_number: { type: String, unique: true },
    route_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute', required: true },
    vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    supervisor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    trip_date: { type: Date, required: true },
    trip_type: {
      type: String,
      enum: ['morning_pickup', 'afternoon_dropoff', 'special'],
      required: true,
    },
    scheduled_departure: { type: Date },
    actual_departure: { type: Date },
    scheduled_arrival: { type: Date },
    actual_arrival: { type: Date },
    passengers: [passengerSchema],
    total_passengers: { type: Number, default: 0 },
    picked_up_count: { type: Number, default: 0 },
    absent_count: { type: Number, default: 0 },
    // فحص ما قبل الرحلة
    pre_trip_inspection: {
      completed: { type: Boolean, default: false },
      completed_at: { type: Date },
      fuel_level: { type: String, enum: ['full', 'three_quarter', 'half', 'quarter', 'low'] },
      tire_condition: { type: Boolean },
      lights_working: { type: Boolean },
      brakes_ok: { type: Boolean },
      first_aid_kit: { type: Boolean },
      fire_extinguisher: { type: Boolean },
      seat_belts_ok: { type: Boolean },
      wheelchair_lock_ok: { type: Boolean },
      ac_working: { type: Boolean },
      cleanliness_ok: { type: Boolean },
      odometer_start: { type: Number },
      odometer_end: { type: Number },
      notes: { type: String },
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'delayed'],
      default: 'scheduled',
    },
    delay_minutes: { type: Number, default: 0 },
    delay_reason: { type: String },
    distance_km: { type: Number },
    fuel_consumed: { type: Number },
    notes: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

tripSchema.pre('save', async function (next) {
  if (!this.trip_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      trip_number: new RegExp(`^TRIP-${year}-`),
    });
    this.trip_number = `TRIP-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  if (this.passengers) {
    this.total_passengers = this.passengers.length;
    this.picked_up_count = this.passengers.filter(
      p => p.status === 'picked_up' || p.status === 'dropped_off'
    ).length;
    this.absent_count = this.passengers.filter(p => p.status === 'absent').length;
  }
  next();
});

// REMOVED DUPLICATE: tripSchema.index({ trip_number: 1 }); — field already has index:true
tripSchema.index({ route_id: 1, trip_date: -1 });
tripSchema.index({ vehicle_id: 1, trip_date: -1 });
tripSchema.index({ driver_id: 1, trip_date: -1 });
tripSchema.index({ branch_id: 1, trip_date: -1 });
tripSchema.index({ status: 1 });
tripSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.Trip || mongoose.model('Trip', tripSchema);
