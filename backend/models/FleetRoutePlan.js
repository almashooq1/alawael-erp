/**
 * Fleet Route Plan Model - نموذج تخطيط المسارات
 * Persistent route plans with waypoints, scheduling, planned-vs-actual
 */

const mongoose = require('mongoose');

const fleetRoutePlanSchema = new mongoose.Schema(
  {
    planNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },

    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },

    type: {
      type: String,
      enum: [
        'one_way',
        'round_trip',
        'multi_stop',
        'circuit',
        'shuttle',
        'delivery_route',
        'school_run',
        'patrol',
        'other',
      ],
      required: true,
    },

    // Origin
    origin: {
      name: { type: String, required: true },
      nameAr: { type: String },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number],
      },
      address: { type: String },
      scheduledDeparture: { type: Date },
      actualDeparture: { type: Date },
    },

    // Destination
    destination: {
      name: { type: String, required: true },
      nameAr: { type: String },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number],
      },
      address: { type: String },
      scheduledArrival: { type: Date },
      actualArrival: { type: Date },
    },

    // Waypoints
    waypoints: [
      {
        order: { type: Number, required: true },
        name: { type: String },
        nameAr: { type: String },
        location: {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: [Number],
        },
        address: { type: String },
        scheduledArrival: { type: Date },
        actualArrival: { type: Date },
        scheduledDeparture: { type: Date },
        actualDeparture: { type: Date },
        dwellTime: { type: Number }, // minutes
        purpose: {
          type: String,
          enum: [
            'pickup',
            'delivery',
            'rest_stop',
            'fuel_stop',
            'inspection',
            'checkpoint',
            'customer_visit',
            'other',
          ],
        },
        completed: { type: Boolean, default: false },
        skipped: { type: Boolean, default: false },
        skipReason: { type: String },
      },
    ],

    // Distance & time
    plannedDistance: { type: Number }, // km
    actualDistance: { type: Number },
    plannedDuration: { type: Number }, // minutes
    actualDuration: { type: Number },
    plannedFuelConsumption: { type: Number }, // liters
    actualFuelConsumption: { type: Number },

    // Recurring
    recurring: {
      enabled: { type: Boolean, default: false },
      pattern: {
        type: String,
        enum: ['daily', 'weekdays', 'weekly', 'biweekly', 'monthly', 'custom'],
      },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }],
      startDate: { type: Date },
      endDate: { type: Date },
      exceptions: [{ date: Date, reason: String }],
    },

    // Load specifications
    loadSpecs: {
      maxWeight: { type: Number },
      actualWeight: { type: Number },
      loadType: { type: String },
      hazmat: { type: Boolean, default: false },
      temperatureControlled: { type: Boolean, default: false },
      requiredTemp: { min: Number, max: Number },
    },

    // Performance
    performance: {
      onTimeStatus: {
        type: String,
        enum: ['on_time', 'early', 'late', 'very_late', 'not_started'],
        default: 'not_started',
      },
      delayMinutes: { type: Number, default: 0 },
      delayReason: { type: String },
      deviationKm: { type: Number, default: 0 },
      deviationAlerts: [
        {
          time: Date,
          location: { type: { type: String }, coordinates: [Number] },
          distanceFromRoute: Number,
        },
      ],
      score: { type: Number, min: 0, max: 100 },
    },

    // Toll estimate
    estimatedTollCost: { type: Number },
    actualTollCost: { type: Number },

    // Approvals
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },

    status: {
      type: String,
      enum: ['draft', 'planned', 'approved', 'in_progress', 'completed', 'cancelled', 'aborted'],
      default: 'draft',
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

fleetRoutePlanSchema.pre('save', async function (next) {
  if (!this.planNumber) {
    const count = await this.constructor.countDocuments();
    this.planNumber = `RTP-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

fleetRoutePlanSchema.index({ organization: 1, vehicle: 1, 'origin.scheduledDeparture': -1 });
fleetRoutePlanSchema.index({ organization: 1, driver: 1, status: 1 });
fleetRoutePlanSchema.index({ organization: 1, status: 1 });
fleetRoutePlanSchema.index({ 'origin.location': '2dsphere' });
fleetRoutePlanSchema.index({ 'destination.location': '2dsphere' });

module.exports = mongoose.models.FleetRoutePlan || mongoose.model('FleetRoutePlan', fleetRoutePlanSchema);
