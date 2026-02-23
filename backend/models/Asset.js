const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['vehicles', 'office', 'equipment', 'property', 'other']
  },
  description: {
    type: String,
    default: ''
  },
  value: {
    type: Number,
    default: 0,
    min: 0
  },
  location: {
    type: String,
    default: 'Unknown'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'disposed'],
    default: 'active'
  },
  depreciationRate: {
    type: Number,
    default: 0.10,
    min: 0,
    max: 1
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  lastMaintenanceDate: {
    type: Date,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'assets'
});

// Index for frequently queried fields
assetSchema.index({ category: 1, status: 1 });
assetSchema.index({ createdBy: 1, createdAt: -1 });
assetSchema.index({ location: 1 });

// Middleware to update updatedAt
assetSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Asset', assetSchema);
