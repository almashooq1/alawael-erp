'use strict';

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    code: { type: String, required: true, trim: true }, // R-001
    nameAr: { type: String, required: true },
    nameEn: { type: String, default: null },
    type: {
      type: String,
      enum: [
        'therapy',
        'assessment',
        'sensory',
        'gym',
        'classroom',
        'meeting',
        'office',
        'waiting',
        'storage',
      ],
      required: true,
    },
    floor: { type: String, default: null },
    building: { type: String, default: null },
    capacity: { type: Number, default: 1 },
    areaSqm: { type: Number, default: null },
    equipment: { type: [String], default: [] },
    features: { type: [String], default: [] }, // ['soundproof', 'camera', 'ac']
    isAccessible: { type: Boolean, default: true },
    hasCamera: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance', 'reserved'],
      default: 'available',
    },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

roomSchema.index({ branchId: 1, code: 1 }, { unique: true });
roomSchema.index({ branchId: 1, status: 1 });

module.exports = mongoose.model('Room', roomSchema);
