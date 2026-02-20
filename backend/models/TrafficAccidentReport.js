/**
 * Traffic Accident Report Model - نموذج تقرير الحادثة المرورية
 * نموذج شامل ومتكامل لتقارير الحوادث المرورية
 */

const mongoose = require('mongoose');

// ========================================
// Schema للمرفقات
// ========================================
const attachmentSchema = new mongoose.Schema({
  fileName: String,
  fileUrl: String,
  fileType: {
    type: String,
    enum: ['photo', 'video', 'document', 'audio', 'other']
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// ========================================
// Schema للشهود
// ========================================
const witnessSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  address: String,
  identityNumber: String,
  relationship: {
    type: String,
    enum: ['witness', 'third_party', 'passenger', 'bystander'],
    default: 'witness'
  },
  statement: String,
  contactedAt: Date,
  interviewedAt: Date,
  statementVerified: Boolean
});

// ========================================
// Schema للأضرار
// ========================================
const damageSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  type: {
    type: String,
    enum: ['total_loss', 'major', 'moderate', 'minor', 'no_damage'],
    required: true
  },
  estimatedCost: Number,
  damageDescription: String,
  damagePhotos: [String],
  assessedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assessmentDate: Date,
  repairEstimate: String,
  repairs: {
    started: Date,
    completed: Date,
    cost: Number
  }
});

// ========================================
// Schema للإصابات
// ========================================
const injurySchema = new mongoose.Schema({
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  personName: String,
  role: {
    type: String,
    enum: ['driver', 'passenger', 'pedestrian', 'cyclist', 'motorcyclist'],
    required: true
  },
  type: {
    type: String,
    enum: ['fatal', 'serious', 'moderate', 'minor', 'uninjured'],
    required: true
  },
  bodyParts: [String],
  description: String,
  treatmentRequired: Boolean,
  hospitalized: Boolean,
  hospitalName: String,
  medicalReport: String,
  treatmentCost: Number,
  recoveryStatus: {
    type: String,
    enum: ['recovering', 'full_recovery', 'permanent_disability', 'fatal'],
    default: 'recovering'
  }
});

// ========================================
// Schema الرئيسي لتقرير الحادثة المرورية
// ========================================
const trafficAccidentReportSchema = new mongoose.Schema(
  {
    // ===== معلومات التقرير الأساسية =====
    reportNumber: {
      type: String,
      unique: true,
      required: true
    },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'under_investigation',
        'under_review',
        'approved',
        'appeal_pending',
        'resolved',
        'closed',
        'archived'
      ],
      default: 'draft'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'severe', 'critical', 'fatal'],
      required: true
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // ===== معلومات الحادثة =====
    accidentInfo: {
      accidentDateTime: {
        type: Date,
        required: true
      },
      location: {
        address: String,
        city: String,
        region: String,
        coordinates: {
          type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere'
          }
        },
        roadsideDescription: String,
        nearbyLandmarks: String
      },
      weather: {
        type: String,
        enum: ['clear', 'rainy', 'foggy', 'snowy', 'windy', 'sandstorm', 'unknown'],
        default: 'unknown'
      },
      visibility: {
        type: String,
        enum: ['good', 'moderate', 'poor', 'very_poor'],
        default: 'good'
      },
      lightingConditions: {
        type: String,
        enum: ['daylight', 'dusk', 'dawn', 'night_lit', 'night_unlit'],
        required: true
      },
      roadConditions: {
        type: String,
        enum: ['dry', 'wet', 'slippery', 'muddy', 'icy', 'poor'],
        default: 'dry'
      },
      roadType: {
        type: String,
        enum: ['highway', 'main_road', 'secondary_road', 'urban_road', 'residential'],
        required: true
      },
      speedLimit: Number,
      description: {
        type: String,
        required: true
      }
    },

    // ===== معلومات المركبات المتورطة =====
    vehicles: [
      {
        vehicleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vehicle'
        },
        driverId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Driver'
        },
        driverName: String,
        driverLicense: String,
        driverPhone: String,
        plateNumber: {
          type: String
        },
        vehicleType: String,
        make: String,
        model: String,
        year: Number,
        color: String,
        insurer: String,
        policyNumber: String,
        engineNumber: String,
        chasisNumber: String,
        speedAtImpact: Number,
        vehicleRole: {
          type: String,
          enum: ['primary', 'secondary', 'additional'],
          default: 'primary'
        },
        damage: damageSchema,
        insurance: {
          companyName: String,
          policyNumber: String,
          expiryDate: Date,
          claimNumber: String,
          claimStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'paid'],
            default: 'pending'
          }
        }
      }
    ],

    // ===== معلومات الأشخاص المتأثرين =====
    people: {
      drivers: [
        {
          driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Driver'
          },
          name: String,
          license: String,
          violations: [String],
          injuryStatus: injurySchema,
          breathalyzerResult: Number,
          drugTestResult: String,
          statementRecorded: Boolean
        }
      ],
      passengers: [injurySchema],
      pedestrians: [injurySchema],
      injuries: [injurySchema],
      deaths: {
        count: { type: Number, default: 0 },
        details: [
          {
            name: String,
            age: Number,
            role: String,
            description: String
          }
        ]
      }
    },

    // ===== الشهود والإفادات =====
    witnesses: [witnessSchema],
    statements: [
      {
        personId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        personName: String,
        statement: String,
        recordedAt: {
          type: Date,
          default: Date.now
        },
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        verified: Boolean
      }
    ],

    // ===== التحقيق والتحليل =====
    investigation: {
      investigatingOfficer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      startDate: Date,
      completedDate: Date,
      status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'on_hold'],
        default: 'not_started'
      },
      findings: String,
      rootCause: {
        type: String,
        enum: [
          'human_error',
          'mechanical_failure',
          'environmental',
          'pedestrian_violation',
          'unknown'
        ]
      },
      causeFactor: String,
      primaryCause: String,
      contributingFactors: [String],
      analysisNotes: String,
      recommendations: [String]
    },

    // ===== المخالفات والتحميل =====
    violations: [
      {
        violationType: {
          type: String,
          enum: [
            'speeding',
            'reckless_driving',
            'drunk_driving',
            'traffic_light_violation',
            'wrong_direction',
            'no_license',
            'expired_license',
            'uninsured',
            'mechanical_failure',
            'drug_driving',
            'negligent_driving',
            'hit_and_run',
            'other'
          ]
        },
        severity: {
          type: String,
          enum: ['minor', 'moderate', 'serious'],
          default: 'moderate'
        },
        driverId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Driver'
        },
        driverName: String,
        description: String,
        fineAmount: Number,
        points: Number,
        licenseAction: {
          type: String,
          enum: [
            'none',
            'suspension',
            'revocation',
            'warning',
            'mandatory_training'
          ],
          default: 'none'
        }
      }
    ],
    liability: {
      primaryResponsibleParty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
      },
      responsibilityPercentage: Number,
      determination: {
        type: String,
        enum: ['full', 'partial', 'no_fault', 'undetermined'],
        default: 'undetermined'
      }
    },

    // ===== المرفقات والوثائق =====
    attachments: [attachmentSchema],
    documentation: {
      policereport: {
        filed: Boolean,
        reportNumber: String,
        filedAt: Date
      },
      insuranceClaim: {
        filed: Boolean,
        claimNumber: String,
        filedAt: Date,
        responseDate: Date,
        claimAmount: Number
      },
      medicalReports: [String],
      policeStatements: [String],
      expertReports: [String],
      courtDocuments: [String]
    },

    // ===== الخسائر المالية =====
    financialImpact: {
      totalDamageEstimate: Number,
      medicalCosts: Number,
      repairCosts: Number,
      otherCosts: Number,
      insuranceCoverageAmount: Number,
      outOfPocketCost: Number,
      finesAmount: Number,
      totalLoss: {
        type: Number,
        required: true,
        default: 0
      }
    },

    // ===== المتابعة والتحديثات =====
    followUp: {
      nextFollowUpDate: Date,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'resolved'],
        default: 'pending'
      },
      notes: String,
      reminders: [
        {
          date: Date,
          description: String,
          completed: Boolean
        }
      ]
    },

    // ===== التعليقات والملاحظات =====
    comments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        userName: String,
        comment: String,
        timestamp: {
          type: Date,
          default: Date.now
        },
        attachments: [String]
      }
    ],

    // ===== الأرشفة والحذف =====
    archived: {
      type: Boolean,
      default: false
    },
    archivedAt: Date,
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    archivedReason: String,

    // ===== معلومات التدقيق =====
    auditInfo: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      lastModifiedAt: Date,
      viewHistory: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          },
          viewedAt: Date
        }
      ]
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ========================================
// Virtual Fields
// ========================================
trafficAccidentReportSchema.virtual('totalInjured').get(function () {
  return (
    (this.people?.injuries?.length || 0) +
    (this.people?.pedestrians?.length || 0)
  );
});

trafficAccidentReportSchema.virtual('totalDeaths').get(function () {
  return this.people?.deaths?.count || 0;
});

trafficAccidentReportSchema.virtual('daysSinceAccident').get(function () {
  return Math.floor(
    (Date.now() - this.accidentInfo.accidentDateTime) / (1000 * 60 * 60 * 24)
  );
});

trafficAccidentReportSchema.virtual('caseAge').get(function () {
  const days = this.daysSinceAccident;
  if (days === 0) return 'Same Day';
  if (days === 1) return '1 Day';
  if (days < 7) return `${days} Days`;
  if (days < 30) return `${Math.floor(days / 7)} Weeks`;
  if (days < 365) return `${Math.floor(days / 30)} Months`;
  return `${Math.floor(days / 365)} Years`;
});

// ========================================
// Indexes
// ========================================
trafficAccidentReportSchema.index({ reportNumber: 1 });
trafficAccidentReportSchema.index({ status: 1 });
trafficAccidentReportSchema.index({ severity: 1 });
trafficAccidentReportSchema.index({ 'accidentInfo.accidentDateTime': -1 });
trafficAccidentReportSchema.index({ 'reportedBy': 1 });
trafficAccidentReportSchema.index({ archived: 1 });
trafficAccidentReportSchema.index({
  'accidentInfo.location.coordinates': '2dsphere'
});
trafficAccidentReportSchema.index({
  status: 1,
  severity: 1,
  'accidentInfo.accidentDateTime': -1
});

// ========================================
// Methods
// ========================================
trafficAccidentReportSchema.methods.generateReportNumber = function () {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  this.reportNumber = `TAR-${year}${month}-${random}`;
};

trafficAccidentReportSchema.methods.markAsUnderInvestigation = function (
  investigatingOfficerId
) {
  this.status = 'under_investigation';
  this.investigation.status = 'in_progress';
  this.investigation.investigatingOfficer = investigatingOfficerId;
  this.investigation.startDate = new Date();
};

trafficAccidentReportSchema.methods.completeInvestigation = function (
  findings,
  rootCause,
  recommendations
) {
  this.investigation.status = 'completed';
  this.investigation.completedDate = new Date();
  this.investigation.findings = findings;
  this.investigation.rootCause = rootCause;
  this.investigation.recommendations = recommendations;
  this.status = 'under_review';
};

trafficAccidentReportSchema.methods.approve = function () {
  this.status = 'approved';
};

trafficAccidentReportSchema.methods.close = function () {
  this.status = 'closed';
};

trafficAccidentReportSchema.methods.archive = function (userId, reason) {
  this.archived = true;
  this.archivedAt = new Date();
  this.archivedBy = userId;
  this.archivedReason = reason;
  this.status = 'archived';
};

trafficAccidentReportSchema.methods.calculateTotalLoss = function () {
  const medical = this.financialImpact.medicalCosts || 0;
  const repair = this.financialImpact.repairCosts || 0;
  const other = this.financialImpact.otherCosts || 0;
  const fines = this.financialImpact.finesAmount || 0;
  this.financialImpact.totalLoss = medical + repair + other + fines;
  return this.financialImpact.totalLoss;
};

trafficAccidentReportSchema.methods.addComment = function (
  userId,
  userName,
  comment
) {
  this.comments.push({
    userId,
    userName,
    comment,
    timestamp: new Date()
  });
};

trafficAccidentReportSchema.methods.recordView = function (userId) {
  this.auditInfo.viewHistory.push({
    userId,
    viewedAt: new Date()
  });
};

// ========================================
// Statics
// ========================================
trafficAccidentReportSchema.statics.getStatistics = async function (
  filters = {}
) {
  const matchStage = { archived: false };

  if (filters.startDate || filters.endDate) {
    matchStage['accidentInfo.accidentDateTime'] = {};
    if (filters.startDate) {
      matchStage['accidentInfo.accidentDateTime'].$gte = new Date(
        filters.startDate
      );
    }
    if (filters.endDate) {
      matchStage['accidentInfo.accidentDateTime'].$lte = new Date(
        filters.endDate
      );
    }
  }

  if (filters.city) {
    matchStage['accidentInfo.location.city'] = filters.city;
  }

  if (filters.severity) {
    matchStage.severity = filters.severity;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalReports: { $sum: 1 },
        totalInjured: { $sum: { $size: '$people.injuries' } },
        totalDeaths: { $sum: '$people.deaths.count' },
        totalFinancialLoss: { $sum: '$financialImpact.totalLoss' },
        averageFinancialLoss: { $avg: '$financialImpact.totalLoss' },
        criticalSeverity: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        },
        severeSeverity: {
          $sum: { $cond: [{ $eq: ['$severity', 'severe'] }, 1, 0] }
        }
      }
    }
  ]);
};

trafficAccidentReportSchema.statics.getStatusDistribution = async function (
  filters = {}
) {
  const matchStage = { archived: false };

  if (filters.startDate || filters.endDate) {
    matchStage['accidentInfo.accidentDateTime'] = {};
    if (filters.startDate) {
      matchStage['accidentInfo.accidentDateTime'].$gte = new Date(
        filters.startDate
      );
    }
    if (filters.endDate) {
      matchStage['accidentInfo.accidentDateTime'].$lte = new Date(
        filters.endDate
      );
    }
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

trafficAccidentReportSchema.statics.getSeverityDistribution =
  async function (filters = {}) {
    const matchStage = { archived: false };

    if (filters.startDate || filters.endDate) {
      matchStage['accidentInfo.accidentDateTime'] = {};
      if (filters.startDate) {
        matchStage['accidentInfo.accidentDateTime'].$gte = new Date(
          filters.startDate
        );
      }
      if (filters.endDate) {
        matchStage['accidentInfo.accidentDateTime'].$lte = new Date(
          filters.endDate
        );
      }
    }

    return this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  };

// Create the model
const TrafficAccidentReport = mongoose.model(
  'TrafficAccidentReport',
  trafficAccidentReportSchema
);

module.exports = TrafficAccidentReport;
