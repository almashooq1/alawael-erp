/**
 * نموذج طلبات الصيانة
 * Maintenance Request Model
 */
const mongoose = require('mongoose');

const maintenanceRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, unique: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    type: {
      type: String,
      enum: ['electrical', 'plumbing', 'hvac', 'furniture', 'cleaning', 'it', 'safety', 'other'],
      default: 'other',
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['new', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'new',
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedByName: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedToName: { type: String },
    estimatedCost: { type: Number },
    actualCost: { type: Number },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    photos: [{ url: String, caption: String }],
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-generate request ID
maintenanceRequestSchema.pre('save', async function () {
  if (!this.requestId) {
    const count = await mongoose.model('MaintenanceRequest').countDocuments();
    this.requestId = `MR-${String(count + 1).padStart(5, '0')}`;
  }
});

maintenanceRequestSchema.index({ room: 1, status: 1 });
maintenanceRequestSchema.index({ priority: 1 });
maintenanceRequestSchema.index({ assignedTo: 1 });

module.exports =
  mongoose.models.MaintenanceRequest ||
  mongoose.model('MaintenanceRequest', maintenanceRequestSchema);
