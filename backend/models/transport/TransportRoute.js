const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
  address: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  pickup_time: { type: String }, // HH:MM
  dropoff_time: { type: String },
  waypoint_type: {
    type: String,
    enum: ['pickup', 'dropoff', 'center', 'waypoint'],
    default: 'pickup',
  },
  notes: { type: String },
});

const transportRouteSchema = new mongoose.Schema(
  {
    route_number: { type: String, unique: true },
    route_name_ar: { type: String, required: true },
    route_name_en: { type: String },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    route_type: {
      type: String,
      enum: ['morning_pickup', 'afternoon_dropoff', 'both', 'special'],
      default: 'both',
    },
    vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    supervisor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    waypoints: [waypointSchema],
    // إعدادات التحسين
    optimized: { type: Boolean, default: false },
    optimization_algorithm: { type: String, default: 'nearest_neighbor_2opt' },
    total_distance_km: { type: Number },
    estimated_duration_minutes: { type: Number },
    // أيام التشغيل
    operating_days: {
      type: [String],
      default: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    },
    morning_departure_time: { type: String }, // HH:MM
    afternoon_departure_time: { type: String },
    is_active: { type: Boolean, default: true },
    notes: { type: String },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

transportRouteSchema.pre('save', async function (next) {
  if (!this.route_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      route_number: new RegExp(`^RT-${year}-`),
    });
    this.route_number = `RT-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

transportRouteSchema.index({ branch_id: 1, is_active: 1 });
transportRouteSchema.index({ vehicle_id: 1 });
transportRouteSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.TransportRoute || mongoose.model('TransportRoute', transportRouteSchema);
