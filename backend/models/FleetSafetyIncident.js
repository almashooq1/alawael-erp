/**
 * Fleet Safety Incident Model - نموذج السلامة والحوادث
 *
 * إدارة حوادث السلامة وتسجيل المخالفات والتدريب التصحيحي
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const fleetSafetyIncidentSchema = new Schema(
  {
    // معرف الحادث
    incidentNumber: { type: String, unique: true },

    // النوع
    type: {
      type: String,
      enum: [
        'collision',
        'rollover',
        'fire',
        'theft',
        'vandalism',
        'near_miss',
        'harsh_braking',
        'harsh_acceleration',
        'speeding',
        'drowsy_driving',
        'distracted_driving',
        'seatbelt_violation',
        'red_light',
        'wrong_way',
        'overloading',
        'cargo_spill',
        'mechanical_failure',
        'tire_blowout',
        'weather_related',
        'road_hazard',
        'pedestrian_involved',
        'animal_collision',
        'other',
      ],
      required: true,
    },

    // الخطورة
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major', 'severe', 'fatal'],
      required: true,
    },

    // الحالة
    status: {
      type: String,
      enum: [
        'reported',
        'under_investigation',
        'action_required',
        'resolved',
        'closed',
        'disputed',
      ],
      default: 'reported',
    },

    // المركبة والسائق
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    driver: { type: Schema.Types.ObjectId, ref: 'Driver' },
    trip: { type: Schema.Types.ObjectId, ref: 'Trip' },

    // تفاصيل الحادث
    details: {
      date: { type: Date, required: true },
      time: String,
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number],
      },
      address: String,
      description: String,
      descriptionAr: String,
      weatherConditions: {
        type: String,
        enum: ['clear', 'rain', 'fog', 'sandstorm', 'wind', 'snow', 'night', 'other'],
      },
      roadConditions: {
        type: String,
        enum: ['dry', 'wet', 'icy', 'sandy', 'construction', 'pothole', 'other'],
      },
      speedAtIncident: Number,
      speedLimit: Number,
    },

    // الأطراف المعنية
    involvedParties: [
      {
        type: {
          type: String,
          enum: ['driver', 'passenger', 'pedestrian', 'other_vehicle', 'property'],
        },
        name: String,
        contact: String,
        vehiclePlate: String,
        insuranceInfo: String,
        injuries: String,
        injurySeverity: { type: String, enum: ['none', 'minor', 'moderate', 'severe', 'fatal'] },
      },
    ],

    // الأضرار
    damages: {
      vehicleDamage: {
        description: String,
        estimatedCost: Number,
        actualCost: Number,
        photos: [String],
      },
      propertyDamage: {
        description: String,
        estimatedCost: Number,
        owner: String,
      },
      injuries: {
        count: { type: Number, default: 0 },
        details: String,
        medicalCosts: Number,
      },
      totalEstimatedCost: Number,
      totalActualCost: Number,
    },

    // التأمين
    insurance: {
      claimFiled: { type: Boolean, default: false },
      claimNumber: String,
      claimDate: Date,
      claimStatus: { type: String, enum: ['pending', 'approved', 'denied', 'settled'] },
      payout: Number,
      deductible: Number,
    },

    // التحقيق
    investigation: {
      investigator: { type: Schema.Types.ObjectId, ref: 'User' },
      startDate: Date,
      completionDate: Date,
      findings: String,
      rootCause: String,
      driverAtFault: { type: Boolean },
      faultPercentage: Number,
      witnesses: [
        {
          name: String,
          contact: String,
          statement: String,
        },
      ],
      policeReportNumber: String,
      policeReportFiled: { type: Boolean, default: false },
    },

    // الإجراءات التصحيحية
    correctiveActions: [
      {
        description: String,
        type: {
          type: String,
          enum: [
            'training',
            'warning',
            'suspension',
            'termination',
            'vehicle_repair',
            'policy_change',
            'process_improvement',
          ],
        },
        assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
        dueDate: Date,
        completedDate: Date,
        status: {
          type: String,
          enum: ['pending', 'in_progress', 'completed', 'overdue'],
          default: 'pending',
        },
      },
    ],

    // الوثائق
    documents: [
      {
        name: String,
        url: String,
        type: {
          type: String,
          enum: [
            'photo',
            'video',
            'police_report',
            'medical_report',
            'insurance_claim',
            'witness_statement',
            'diagram',
            'other',
          ],
        },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // سجل الأحداث
    timeline: [
      {
        event: String,
        timestamp: { type: Date, default: Date.now },
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        details: String,
      },
    ],

    // تقييم السلامة والنقاط
    safetyScore: {
      pointsDeducted: { type: Number, default: 0 },
      driverScoreBefore: Number,
      driverScoreAfter: Number,
    },

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

fleetSafetyIncidentSchema.index({ type: 1, severity: 1 });
fleetSafetyIncidentSchema.index({ status: 1 });
fleetSafetyIncidentSchema.index({ vehicle: 1, 'details.date': -1 });
fleetSafetyIncidentSchema.index({ driver: 1, 'details.date': -1 });
fleetSafetyIncidentSchema.index({ organization: 1 });

// ترقيم تلقائي
fleetSafetyIncidentSchema.pre('validate', async function (next) {
  if (!this.incidentNumber) {
    const count = await mongoose.model('FleetSafetyIncident').countDocuments();
    this.incidentNumber = `INC-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('FleetSafetyIncident', fleetSafetyIncidentSchema);
