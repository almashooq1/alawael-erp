'use strict';

/**
 * TherapyEquipment — therapy room equipment with booking timeline.
 * Used by `routes/therapistUltra.routes.js` `/equipment`. Differs from
 * `models/InventoryStock.js` Asset model: this is the bookable item
 * (with checked-out state) the therapist reserves for a session.
 */

const mongoose = require('mongoose');

if (mongoose.models.TherapyEquipment) {
  module.exports = mongoose.models.TherapyEquipment;
} else {
  const bookingSchema = new mongoose.Schema(
    {
      bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      from: { type: Date, required: true },
      to: { type: Date, required: true },
      purpose: { type: String, default: null },
      returnedAt: { type: Date, default: null },
    },
    { _id: true }
  );

  const schema = new mongoose.Schema(
    {
      assetTag: { type: String, unique: true, sparse: true },
      name: { type: String, required: true, trim: true },
      category: { type: String, default: null },
      status: {
        type: String,
        enum: ['available', 'in_use', 'maintenance', 'retired'],
        default: 'available',
      },
      currentHolder: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
      location: { type: String, default: null },
      bookings: { type: [bookingSchema], default: [] },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'therapyequipment' }
  );

  schema.index({ status: 1 });

  module.exports =
    mongoose.models.TherapyEquipment || mongoose.model('TherapyEquipment', schema);
}
