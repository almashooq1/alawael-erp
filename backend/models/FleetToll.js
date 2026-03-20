/**
 * Fleet Toll Model - نموذج رسوم المرور والتعرفة
 * Toll gate passages, RFID tags, toll payment reconciliation
 */

const mongoose = require('mongoose');

const fleetTollSchema = new mongoose.Schema(
  {
    tollNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },

    type: {
      type: String,
      enum: [
        'toll_passage',
        'tag_registration',
        'tag_recharge',
        'monthly_subscription',
        'fine',
        'refund',
      ],
      default: 'toll_passage',
    },

    // RFID / Salik tag
    tag: {
      tagId: { type: String },
      tagType: { type: String, enum: ['rfid', 'salik', 'darb', 'obu', 'manual', 'other'] },
      balance: { type: Number },
      status: { type: String, enum: ['active', 'suspended', 'expired', 'lost'], default: 'active' },
    },

    // Toll gate
    gate: {
      gateId: { type: String },
      name: { type: String },
      nameAr: { type: String },
      highway: { type: String },
      direction: {
        type: String,
        enum: ['northbound', 'southbound', 'eastbound', 'westbound', 'entry', 'exit'],
      },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number],
      },
      city: { type: String },
      region: { type: String },
    },

    // Financial
    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    vatAmount: { type: Number, default: 0 },
    totalAmount: { type: Number },
    discountAmount: { type: Number, default: 0 },

    // Payment
    paymentStatus: {
      type: String,
      enum: ['auto_deducted', 'paid', 'pending', 'overdue', 'disputed', 'waived'],
      default: 'auto_deducted',
    },
    paymentMethod: {
      type: String,
      enum: ['rfid_balance', 'prepaid', 'postpaid', 'cash', 'bank_transfer', 'other'],
      default: 'rfid_balance',
    },
    paymentDate: { type: Date },
    invoiceNumber: { type: String },
    receiptNumber: { type: String },

    // Passage details
    passageTime: { type: Date, required: true },
    exitTime: { type: Date },
    vehicleClass: {
      type: String,
      enum: ['light', 'medium', 'heavy', 'extra_heavy', 'bus', 'motorcycle', 'exempt'],
      default: 'light',
    },
    axleCount: { type: Number },
    plateImage: { type: String },

    // Reconciliation
    reconciled: { type: Boolean, default: false },
    reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reconciledAt: { type: Date },
    providerRef: { type: String },
    providerName: { type: String },

    notes: { type: String },
    notesAr: { type: String },

    status: {
      type: String,
      enum: ['active', 'void', 'cancelled'],
      default: 'active',
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

fleetTollSchema.pre('save', async function (next) {
  if (!this.tollNumber) {
    const count = await this.constructor.countDocuments();
    this.tollNumber = `TOLL-${String(count + 1).padStart(6, '0')}`;
  }
  if (this.amount && !this.totalAmount) {
    this.totalAmount = this.amount + (this.vatAmount || 0) - (this.discountAmount || 0);
  }
  next();
});

fleetTollSchema.index({ organization: 1, vehicle: 1, passageTime: -1 });
fleetTollSchema.index({ organization: 1, paymentStatus: 1 });
fleetTollSchema.index({ 'tag.tagId': 1 });
fleetTollSchema.index({ 'gate.gateId': 1 });
fleetTollSchema.index({ 'gate.location': '2dsphere' });

module.exports = mongoose.model('FleetToll', fleetTollSchema);
