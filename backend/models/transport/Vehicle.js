const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicle_number: { type: String, unique: true }, // VH-001
    license_plate: { type: String, required: true, unique: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    make: { type: String }, // تويوتا، هايس...
    model: { type: String },
    year: { type: Number },
    color: { type: String },
    vehicle_type: {
      type: String,
      enum: ['van', 'minibus', 'bus', 'car', 'wheelchair_van'],
      default: 'van',
    },
    capacity: { type: Number, default: 10 }, // عدد المقاعد
    wheelchair_accessible: { type: Boolean, default: false },
    wheelchair_capacity: { type: Number, default: 0 },
    // GPS
    gps_device_id: { type: String },
    gps_provider: { type: String },
    last_known_lat: { type: Number },
    last_known_lng: { type: Number },
    last_gps_update: { type: Date },
    // الوثائق
    registration_number: { type: String },
    registration_expiry: { type: Date },
    insurance_number: { type: String },
    insurance_expiry: { type: Date },
    inspection_expiry: { type: Date },
    // السائق الحالي
    current_driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    // الحالة
    status: {
      type: String,
      enum: ['active', 'maintenance', 'out_of_service', 'retired'],
      default: 'active',
    },
    odometer_km: { type: Number, default: 0 },
    fuel_type: {
      type: String,
      enum: ['petrol', 'diesel', 'electric', 'hybrid'],
      default: 'petrol',
    },
    notes: { type: String },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

vehicleSchema.pre('save', async function (next) {
  if (!this.vehicle_number) {
    const count = await this.constructor.countDocuments({ deleted_at: null });
    this.vehicle_number = `VH-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

vehicleSchema.virtual('is_registration_expiring').get(function () {
  if (!this.registration_expiry) return false;
  const days = Math.ceil((this.registration_expiry - new Date()) / (1000 * 60 * 60 * 24));
  return days <= 30;
});

vehicleSchema.index({ branch_id: 1, status: 1 });
// REMOVED DUPLICATE: vehicleSchema.index({ license_plate: 1 }); — field already has index:true
vehicleSchema.index({ gps_device_id: 1 });
vehicleSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);
