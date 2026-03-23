/**
 * Driver Training & Certification Model - نموذج تدريب وشهادات السائقين
 */

const mongoose = require('mongoose');

const driverTrainingSchema = new mongoose.Schema(
  {
    trainingNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    category: {
      type: String,
      enum: [
        'defensive_driving',
        'hazmat_handling',
        'first_aid',
        'fire_safety',
        'student_transport',
        'heavy_vehicle',
        'passenger_safety',
        'eco_driving',
        'navigation_systems',
        'vehicle_maintenance_basics',
        'traffic_laws',
        'fatigue_management',
        'load_securing',
        'winter_driving',
        'desert_driving',
        'emergency_procedures',
        'customer_service',
        'disability_transport',
        'security_awareness',
        'new_driver_orientation',
      ],
      required: true,
    },

    type: {
      type: String,
      enum: ['classroom', 'online', 'practical', 'simulation', 'blended', 'on_the_job'],
      default: 'classroom',
    },

    status: {
      type: String,
      enum: ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'draft',
    },

    instructor: {
      name: { type: String },
      qualification: { type: String },
      contactNumber: { type: String },
      external: { type: Boolean, default: false },
      provider: { type: String },
    },

    schedule: {
      startDate: { type: Date },
      endDate: { type: Date },
      totalHours: { type: Number },
      sessions: [
        {
          date: { type: Date },
          startTime: { type: String },
          endTime: { type: String },
          topic: { type: String },
          location: { type: String },
        },
      ],
    },

    participants: [
      {
        driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
        enrolledAt: { type: Date, default: Date.now },
        attendance: { type: Number, default: 0, min: 0, max: 100 },
        examScore: { type: Number, min: 0, max: 100 },
        practicalScore: { type: Number, min: 0, max: 100 },
        finalScore: { type: Number, min: 0, max: 100 },
        result: {
          type: String,
          enum: ['pending', 'passed', 'failed', 'withdrawn'],
          default: 'pending',
        },
        certificateIssued: { type: Boolean, default: false },
        certificateNumber: { type: String },
        completedAt: { type: Date },
        feedback: { type: String },
        rating: { type: Number, min: 1, max: 5 },
      },
    ],

    passingScore: { type: Number, default: 70 },
    maxParticipants: { type: Number },
    isMandatory: { type: Boolean, default: false },
    recurringInterval: { type: Number },

    materials: [
      {
        title: { type: String },
        type: { type: String, enum: ['document', 'video', 'presentation', 'quiz'] },
        url: { type: String },
      },
    ],

    cost: {
      perParticipant: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      currency: { type: String, default: 'SAR' },
    },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

driverTrainingSchema.index({ organization: 1, category: 1, status: 1 });
driverTrainingSchema.index({ 'participants.driver': 1 });
driverTrainingSchema.index({ 'schedule.startDate': 1 });

driverTrainingSchema.pre('save', async function (next) {
  if (!this.trainingNumber) {
    const count = await mongoose.model('DriverTraining').countDocuments();
    this.trainingNumber = `TRN-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Driver Certification Schema
const driverCertificationSchema = new mongoose.Schema(
  {
    certificationNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },

    name: { type: String, required: true },
    nameAr: { type: String },
    type: {
      type: String,
      enum: [
        'driving_license',
        'hazmat',
        'first_aid',
        'heavy_vehicle',
        'passenger_transport',
        'school_bus',
        'defensive_driving',
        'tachograph',
        'adr',
        'cpc',
        'medical_fitness',
        'security_clearance',
        'custom',
      ],
      required: true,
    },

    issuer: { type: String },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended', 'revoked', 'pending_renewal'],
      default: 'active',
    },

    linkedTraining: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverTraining' },
    documentUrl: { type: String },
    verificationCode: { type: String },

    renewalReminder: {
      enabled: { type: Boolean, default: true },
      daysBefore: [{ type: Number }],
    },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

driverCertificationSchema.index({ driver: 1, type: 1 });
driverCertificationSchema.index({ expiryDate: 1, status: 1 });
driverCertificationSchema.index({ organization: 1, status: 1 });

driverCertificationSchema.pre('save', async function (next) {
  if (!this.certificationNumber) {
    const count = await mongoose.model('DriverCertification').countDocuments();
    this.certificationNumber = `CRT-${String(count + 1).padStart(6, '0')}`;
  }
  if (this.expiryDate && new Date(this.expiryDate) < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

const DriverTraining = mongoose.models.DriverTraining || mongoose.model('DriverTraining', driverTrainingSchema);
const DriverCertification = mongoose.models.DriverCertification || mongoose.model('DriverCertification', driverCertificationSchema);

module.exports = { DriverTraining, DriverCertification };
