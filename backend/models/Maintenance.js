const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  // Core
  title: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    index: true
  },

  // Maintenance Type
  type: {
    type: String,
    enum: ['preventive', 'corrective', 'predictive', 'emergency'],
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['mechanical', 'electrical', 'software', 'structural', 'other'],
    index: true
  },

  // Scheduling
  scheduledDate: Date,
  startDate: Date,
  completionDate: Date,
  estimatedDuration: Number, // hours
  actualDuration: Number, // hours

  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Details
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  issueDescription: String,
  workCompleted: String,
  partsReplaced: [String],
  materialsUsed: [String],
  tools: [String],

  // Financial
  estimatedCost: Number,
  actualCost: Number,
  invoiceNumber: String,
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },

  // Status
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'on-hold'],
    default: 'scheduled',
    index: true
  },

  // Impact
  downtime: Number, // minutes
  affectedSystems: [String],
  resolutionNotes: String,

  // Quality & Verification
  qualityCheck: {
    performed: Boolean,
    result: String,
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checkedDate: Date
  },

  // Metadata
  tags: [String],
  attachments: [String],
  createdAt: {
    type: Date,
    default: Date.now,
    index: -1
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for common queries
maintenanceSchema.index({ assetId: 1, status: 1 });
maintenanceSchema.index({ assignedTo: 1, status: 1 });
maintenanceSchema.index({ type: 1, status: 1 });
maintenanceSchema.index({ scheduledDate: 1, status: 1 });
maintenanceSchema.index({ createdBy: 1, createdAt: -1 });
maintenanceSchema.index({ status: 1, priority: 1 });

// Pre-save middleware
maintenanceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);
