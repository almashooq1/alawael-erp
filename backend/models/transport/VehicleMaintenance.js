const mongoose = require('mongoose');

const vehicleMaintenanceSchema = new mongoose.Schema(
  {
    maintenance_number: { type: String, unique: true },
    vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    maintenance_type: {
      type: String,
      enum: ['scheduled', 'corrective', 'emergency', 'inspection', 'tires', 'oil_change'],
      required: true,
    },
    description_ar: { type: String, required: true },
    reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    reported_at: { type: Date, default: Date.now },
    scheduled_date: { type: Date },
    start_date: { type: Date },
    completion_date: { type: Date },
    workshop_name: { type: String },
    workshop_contact: { type: String },
    odometer_at_maintenance: { type: Number },
    next_maintenance_km: { type: Number },
    next_maintenance_date: { type: Date },
    parts_replaced: [
      {
        part_name: { type: String },
        part_number: { type: String },
        quantity: { type: Number, default: 1 },
        cost: { type: Number, default: 0 },
      },
    ],
    labor_cost: { type: Number, default: 0 },
    parts_cost: { type: Number, default: 0 },
    total_cost: { type: Number, default: 0 },
    invoice_number: { type: String },
    status: {
      type: String,
      enum: ['reported', 'scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'reported',
    },
    notes: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

vehicleMaintenanceSchema.pre('save', async function (next) {
  if (!this.maintenance_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      maintenance_number: new RegExp(`^MNT-${year}-`),
    });
    this.maintenance_number = `MNT-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  this.parts_cost = (this.parts_replaced || []).reduce(
    (s, p) => s + (p.cost || 0) * (p.quantity || 1),
    0
  );
  this.total_cost = this.labor_cost + this.parts_cost;
  next();
});

vehicleMaintenanceSchema.index({ vehicle_id: 1, scheduled_date: -1 });
vehicleMaintenanceSchema.index({ branch_id: 1, status: 1 });
vehicleMaintenanceSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.VehicleMaintenance ||
  mongoose.models.VehicleMaintenance ||
  mongoose.model('VehicleMaintenance', vehicleMaintenanceSchema);
