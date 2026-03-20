/**
 * Fleet Accident Model - نموذج حوادث الأسطول
 * Full accident documentation, insurance claims, witness management
 */

const mongoose = require('mongoose');

const fleetAccidentSchema = new mongoose.Schema(
  {
    accidentNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },

    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major', 'severe', 'fatal'],
      required: true,
    },

    type: {
      type: String,
      enum: [
        'collision_rear',
        'collision_front',
        'collision_side',
        'rollover',
        'hit_and_run',
        'pedestrian',
        'animal',
        'single_vehicle',
        'multi_vehicle',
        'fire',
        'weather_related',
        'mechanical_failure',
        'tire_blowout',
        'cargo_spill',
        'hazmat_incident',
        'other',
      ],
      required: true,
    },

    // Date & Location
    accidentDate: { type: Date, required: true },
    reportedDate: { type: Date, default: Date.now },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    address: { type: String },
    addressAr: { type: String },
    city: { type: String },
    region: { type: String },
    roadType: {
      type: String,
      enum: ['highway', 'urban', 'rural', 'intersection', 'parking', 'other'],
    },
    weatherCondition: {
      type: String,
      enum: ['clear', 'rain', 'fog', 'sandstorm', 'wind', 'snow', 'night', 'other'],
    },
    roadCondition: {
      type: String,
      enum: ['dry', 'wet', 'icy', 'sandy', 'construction', 'potholed', 'other'],
    },

    // Description
    description: { type: String, required: true },
    descriptionAr: { type: String },

    // Injuries
    injuries: {
      driverInjured: { type: Boolean, default: false },
      driverInjuryDetails: { type: String },
      passengerCount: { type: Number, default: 0 },
      passengersInjured: { type: Number, default: 0 },
      thirdPartyInjured: { type: Number, default: 0 },
      fatalities: { type: Number, default: 0 },
      hospitalizations: { type: Number, default: 0 },
    },

    // Vehicle damage
    vehicleDamage: {
      level: { type: String, enum: ['none', 'cosmetic', 'minor', 'moderate', 'major', 'totaled'] },
      areas: [
        {
          type: String,
          enum: [
            'front',
            'rear',
            'left_side',
            'right_side',
            'roof',
            'undercarriage',
            'windshield',
            'lights',
            'mirrors',
          ],
        },
      ],
      description: { type: String },
      driveable: { type: Boolean, default: true },
      towRequired: { type: Boolean, default: false },
      estimatedRepairCost: { type: Number },
      actualRepairCost: { type: Number },
    },

    // Other parties
    otherParties: [
      {
        name: { type: String },
        phone: { type: String },
        vehicle: { type: String },
        plateNumber: { type: String },
        insuranceCompany: { type: String },
        policyNumber: { type: String },
        atFault: { type: Boolean },
      },
    ],

    // Witnesses
    witnesses: [
      {
        name: { type: String },
        phone: { type: String },
        email: { type: String },
        statement: { type: String },
        statementDate: { type: Date },
      },
    ],

    // Police report
    policeReport: {
      reportNumber: { type: String },
      stationName: { type: String },
      officerName: { type: String },
      officerBadge: { type: String },
      faultDetermination: {
        type: String,
        enum: ['our_driver', 'other_party', 'shared', 'undetermined', 'no_fault'],
      },
      reportDate: { type: Date },
      reportFile: { type: String },
    },

    // Insurance claim
    insuranceClaim: {
      claimNumber: { type: String },
      insuranceCompany: { type: String },
      policyNumber: { type: String },
      claimStatus: {
        type: String,
        enum: [
          'not_filed',
          'filed',
          'under_review',
          'additional_info_needed',
          'approved',
          'partially_approved',
          'denied',
          'paid',
          'closed',
        ],
        default: 'not_filed',
      },
      claimAmount: { type: Number },
      approvedAmount: { type: Number },
      paidAmount: { type: Number },
      deductible: { type: Number },
      filedDate: { type: Date },
      settledDate: { type: Date },
      adjusterName: { type: String },
      adjusterPhone: { type: String },
    },

    // Photos & evidence
    photos: [
      {
        url: String,
        caption: String,
        type: { type: String, enum: ['scene', 'damage', 'document', 'other'] },
      },
    ],
    documents: [{ url: String, title: String, type: { type: String } }],

    // Post-accident actions
    postAccident: {
      vehicleStatus: {
        type: String,
        enum: [
          'in_service',
          'in_repair',
          'awaiting_parts',
          'awaiting_inspection',
          'scrapped',
          'returned_to_service',
        ],
        default: 'in_repair',
      },
      repairShop: { type: String },
      repairStartDate: { type: Date },
      repairEndDate: { type: Date },
      returnToServiceDate: { type: Date },
      driverStatus: {
        type: String,
        enum: ['active', 'suspended', 'retraining', 'terminated', 'medical_leave'],
      },
      correctiveActions: [
        {
          action: String,
          dueDate: Date,
          completedDate: Date,
          assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
      ],
      lessonsLearned: { type: String },
    },

    status: {
      type: String,
      enum: [
        'reported',
        'under_investigation',
        'pending_insurance',
        'in_repair',
        'resolved',
        'closed',
        'reopened',
      ],
      default: 'reported',
    },

    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

fleetAccidentSchema.pre('save', async function (next) {
  if (!this.accidentNumber) {
    const count = await this.constructor.countDocuments();
    this.accidentNumber = `ACC-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

fleetAccidentSchema.index({ organization: 1, vehicle: 1, accidentDate: -1 });
fleetAccidentSchema.index({ organization: 1, driver: 1, accidentDate: -1 });
fleetAccidentSchema.index({ organization: 1, severity: 1, status: 1 });
fleetAccidentSchema.index({ 'insuranceClaim.claimStatus': 1 });
fleetAccidentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('FleetAccident', fleetAccidentSchema);
