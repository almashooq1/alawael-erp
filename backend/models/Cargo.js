/**
 * Cargo / Load Management Model - نموذج إدارة الشحنات والحمولات
 * Load tracking, weight compliance, delivery confirmation
 */

const mongoose = require('mongoose');

const cargoSchema = new mongoose.Schema(
  {
    cargoNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    // Assignment
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
    dispatchOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'DispatchOrder' },

    // Cargo details
    type: {
      type: String,
      enum: [
        'general',
        'fragile',
        'hazardous',
        'perishable',
        'refrigerated',
        'oversized',
        'livestock',
        'liquid',
        'bulk',
        'container',
        'documents',
        'valuable',
        'other',
      ],
      required: true,
    },
    description: { type: String, required: true },
    descriptionAr: { type: String },

    // Weight & dimensions
    weight: { type: Number },
    weightUnit: { type: String, enum: ['kg', 'ton', 'lb'], default: 'kg' },
    maxWeight: { type: Number },
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    dimensionUnit: { type: String, enum: ['cm', 'm', 'in', 'ft'], default: 'cm' },
    volume: { type: Number },
    numberOfPieces: { type: Number, default: 1 },

    // Shipper / Consignee
    shipper: {
      name: { type: String, required: true },
      phone: { type: String },
      address: { type: String },
      city: { type: String },
    },
    consignee: {
      name: { type: String, required: true },
      phone: { type: String },
      address: { type: String },
      city: { type: String },
    },

    // Locations
    pickupLocation: {
      address: { type: String },
      city: { type: String },
      coordinates: { type: [Number] },
    },
    deliveryLocation: {
      address: { type: String },
      city: { type: String },
      coordinates: { type: [Number] },
    },

    // Timeline
    pickupDate: { type: Date },
    expectedDeliveryDate: { type: Date },
    actualPickupDate: { type: Date },
    actualDeliveryDate: { type: Date },

    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'loading',
        'loaded',
        'in_transit',
        'arrived',
        'unloading',
        'delivered',
        'returned',
        'cancelled',
        'damaged',
      ],
      default: 'pending',
    },

    // Proof of delivery
    proofOfDelivery: {
      signature: { type: String },
      signedBy: { type: String },
      signedAt: { type: Date },
      photo: { type: String },
      notes: { type: String },
    },

    // Financial
    freightCharge: { type: Number, default: 0 },
    insuranceValue: { type: Number, default: 0 },
    declaredValue: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },

    // Compliance
    weightCompliant: { type: Boolean, default: true },
    hazmatCompliant: { type: Boolean },
    specialHandling: [{ type: String }],
    temperature: {
      required: { type: Boolean, default: false },
      min: { type: Number },
      max: { type: Number },
      unit: { type: String, enum: ['celsius', 'fahrenheit'], default: 'celsius' },
    },

    notes: { type: String },
    tags: [{ type: String }],

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

cargoSchema.pre('save', async function (next) {
  if (!this.cargoNumber) {
    const count = await mongoose.model('Cargo').countDocuments();
    this.cargoNumber = `CRG-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

cargoSchema.index({ organization: 1, status: 1 });
cargoSchema.index({ vehicle: 1, status: 1 });
cargoSchema.index({ driver: 1 });
cargoSchema.index({ pickupDate: 1, expectedDeliveryDate: 1 });

module.exports = mongoose.models.Cargo || mongoose.model('Cargo', cargoSchema);
