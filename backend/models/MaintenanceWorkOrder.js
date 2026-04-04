/**
 * MaintenanceWorkOrder Model — أوامر عمل الصيانة الوقائية والتصحيحية
 * النظام 34: إدارة الأصول والموارد
 */
const mongoose = require('mongoose');

const maintenanceWorkOrderSchema = new mongoose.Schema(
  {
    workOrderNumber: { type: String, required: true, unique: true, uppercase: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    type: {
      type: String,
      enum: ['preventive', 'corrective', 'emergency', 'inspection', 'calibration'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'in_progress', 'on_hold', 'completed', 'cancelled'],
      default: 'pending',
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    startedDate: { type: Date },
    completedDate: { type: Date },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    estimatedCost: { type: Number, min: 0 },
    actualCost: { type: Number, min: 0 },
    partsUsed: [
      {
        partName: String,
        partNumber: String,
        quantity: Number,
        unitCost: Number,
      },
    ],
    findings: { type: String },
    resolution: { type: String },
    warrantyClaim: { type: String },
    isWarrantyCovered: { type: Boolean, default: false },
    attachments: [{ fileName: String, fileUrl: String, uploadedAt: Date }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'maintenance_work_orders' }
);

maintenanceWorkOrderSchema.index({ workOrderNumber: 1 });
maintenanceWorkOrderSchema.index({ status: 1 });
maintenanceWorkOrderSchema.index({ type: 1 });
maintenanceWorkOrderSchema.index({ scheduledDate: 1 });
maintenanceWorkOrderSchema.index({ assetId: 1 });
maintenanceWorkOrderSchema.index({ branchId: 1 });

module.exports =
  mongoose.models.MaintenanceWorkOrder ||
  mongoose.model('MaintenanceWorkOrder', maintenanceWorkOrderSchema);
