/**
 * نموذج الغرف والمرافق
 * Room Model — Rooms, labs, offices, training halls
 */
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: { type: String, unique: true, sparse: true, maxlength: 20 },
    type: {
      type: String,
      enum: [
        'office',
        'meeting_room',
        'training_hall',
        'therapy_room',
        'lab',
        'classroom',
        'storage',
        'common_area',
        'other',
      ],
      default: 'office',
    },
    building: { type: String },
    floor: { type: Number },
    capacity: { type: Number, default: 1 },
    area: { type: Number },
    status: {
      type: String,
      enum: ['available', 'occupied', 'under_maintenance', 'reserved', 'closed'],
      default: 'available',
    },
    equipment: [
      {
        name: { type: String },
        quantity: { type: Number, default: 1 },
        condition: { type: String, enum: ['good', 'fair', 'poor'], default: 'good' },
      },
    ],
    amenities: [{ type: String }],
    department: { type: String },
    responsiblePerson: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    photos: [{ url: String, caption: String }],
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

roomSchema.index({ type: 1, status: 1 });
roomSchema.index({ building: 1, floor: 1 });

module.exports = mongoose.models.Room || mongoose.model('Room', roomSchema);
