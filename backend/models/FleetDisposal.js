/**
 * Fleet Disposal Model - نموذج التخلص من المركبات
 * End-of-life vehicle management, auction, disposal records
 */

const mongoose = require('mongoose');

const fleetDisposalSchema = new mongoose.Schema(
  {
    disposalNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },

    type: {
      type: String,
      enum: [
        'auction',
        'trade_in',
        'private_sale',
        'scrap',
        'donation',
        'transfer',
        'lease_return',
        'insurance_total_loss',
        'other',
      ],
      required: true,
    },

    // Retirement criteria
    retirementReason: {
      type: String,
      enum: [
        'age_limit',
        'mileage_limit',
        'high_repair_cost',
        'accident_totaled',
        'regulatory_non_compliant',
        'fleet_downsizing',
        'model_upgrade',
        'fuel_inefficient',
        'safety_concerns',
        'lease_expiry',
        'other',
      ],
      required: true,
    },

    // Vehicle condition at disposal
    condition: {
      overall: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'salvage', 'scrap'],
        required: true,
      },
      ageYears: { type: Number },
      totalMileage: { type: Number },
      engineCondition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'non_functional'],
      },
      bodyCondition: { type: String, enum: ['excellent', 'good', 'fair', 'poor', 'damaged'] },
      interiorCondition: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      tiresCondition: { type: String, enum: ['new', 'good', 'fair', 'worn', 'bald'] },
      lastServiceDate: { type: Date },
      knownIssues: [{ issue: String, severity: String }],
      inspectionDate: { type: Date },
      inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      inspectionReport: { type: String },
      photos: [{ url: String, caption: String }],
    },

    // Valuation
    valuation: {
      bookValue: { type: Number },
      marketValue: { type: Number },
      scrapValue: { type: Number },
      appraiser: { type: String },
      appraisalDate: { type: Date },
      appraisalReport: { type: String },
    },

    // Auction specific
    auction: {
      auctionHouse: { type: String },
      auctionDate: { type: Date },
      lotNumber: { type: String },
      reservePrice: { type: Number },
      startingBid: { type: Number },
      listingUrl: { type: String },
      bids: [
        {
          bidder: { type: String },
          amount: { type: Number },
          bidDate: { type: Date },
          isWinning: { type: Boolean, default: false },
        },
      ],
      winningBid: { type: Number },
      winnerName: { type: String },
      winnerContact: { type: String },
    },

    // Sale / disposal
    sale: {
      buyerName: { type: String },
      buyerContact: { type: String },
      buyerIdNumber: { type: String },
      salePrice: { type: Number },
      saleDate: { type: Date },
      paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'cheque', 'trade_in_credit', 'other'],
      },
      paymentReceived: { type: Boolean, default: false },
      paymentDate: { type: Date },
      invoiceNumber: { type: String },
      tradeInVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
      tradeInValue: { type: Number },
    },

    // Financial
    financial: {
      originalPurchasePrice: { type: Number },
      depreciation: { type: Number },
      totalMaintenanceCost: { type: Number },
      totalFuelCost: { type: Number },
      totalInsuranceCost: { type: Number },
      disposalCost: { type: Number },
      saleProceeds: { type: Number },
      gainLoss: { type: Number },
      currency: { type: String, default: 'SAR' },
    },

    // Regulatory
    regulatory: {
      plateReturned: { type: Boolean, default: false },
      plateReturnDate: { type: Date },
      deregistered: { type: Boolean, default: false },
      deregistrationDate: { type: Date },
      deregistrationRef: { type: String },
      insuranceCancelled: { type: Boolean, default: false },
      insuranceCancelDate: { type: Date },
      insuranceRefund: { type: Number },
      documentsReturned: [{ document: String, returnedDate: Date }],
      environmentalClearance: { type: Boolean },
      environmentalCertificate: { type: String },
    },

    // Approvals
    approvals: [
      {
        approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        decision: { type: String, enum: ['approved', 'rejected', 'pending'] },
        date: { type: Date },
        comments: { type: String },
      },
    ],

    // Timeline
    timeline: {
      initiatedDate: { type: Date, default: Date.now },
      approvedDate: { type: Date },
      listedDate: { type: Date },
      soldDate: { type: Date },
      completedDate: { type: Date },
    },

    // Documents
    documents: [{ url: String, title: String, type: String }],

    status: {
      type: String,
      enum: [
        'initiated',
        'assessment',
        'approved',
        'listed',
        'bidding',
        'sold',
        'pending_payment',
        'completed',
        'cancelled',
      ],
      default: 'initiated',
    },

    notes: { type: String },
    notesAr: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

fleetDisposalSchema.pre('save', async function (next) {
  if (!this.disposalNumber) {
    const count = await this.constructor.countDocuments();
    this.disposalNumber = `DSP-${String(count + 1).padStart(6, '0')}`;
  }
  // Auto-calc gain/loss
  if (
    this.financial &&
    this.financial.saleProceeds != null &&
    this.valuation &&
    this.valuation.bookValue != null
  ) {
    this.financial.gainLoss =
      this.financial.saleProceeds - this.valuation.bookValue - (this.financial.disposalCost || 0);
  }
  next();
});

fleetDisposalSchema.index({ organization: 1, status: 1 });
fleetDisposalSchema.index({ organization: 1, vehicle: 1 });
fleetDisposalSchema.index({ organization: 1, type: 1 });
fleetDisposalSchema.index({ 'timeline.completedDate': 1 });

module.exports = mongoose.models.FleetDisposal || mongoose.model('FleetDisposal', fleetDisposalSchema);
