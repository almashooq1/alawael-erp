/**
 * Advanced Database Schema & Setup
 * قاعدة البيانات المتقدمة والفهارس والتحسينات
 */

const mongoose = require('mongoose');

// ====== 1. مخطط المركبة المحسّن ======

const vehicleSchema = new mongoose.Schema({
  plateNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  type: {
    type: String,
    enum: ['bus', 'truck', 'van'],
    required: true
  },

  manufacturer: String,
  year: Number,
  
  engine: {
    type: String,
    horsepower: Number,
    capacity: Number,
    lastServiceDate: Date,
    totalHours: Number
  },

  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    maxLoad: Number
  },

  status: {
    type: String,
    enum: ['active', 'maintenance', 'breakdown', 'inactive'],
    default: 'active',
    index: true
  },

  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    address: String,
    lastUpdate: Date
  },

  currentTrip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  },

  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },

  fuelLevel: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },

  fuel: {
    type: {
      current: Number,
      capacity: Number,
      efficiency: Number, // لتر / 100كم
      lastRefuel: Date
    }
  },

  gps: {
    speed: { type: Number, default: 0 },
    heading: Number,
    altitude: Number,
    accuracy: Number,
    lastSignal: Date
  },

  maintenance: {
    nextDueDate: Date,
    nextDueMileage: Number,
    history: [{
      date: Date,
      type: String,
      description: String,
      cost: Number,
      technician: String
    }]
  },

  violations: [{
    date: Date,
    type: String,
    severity: String,
    driverId: mongoose.Schema.Types.ObjectId,
    description: String
  }],

  sensors: {
    temperature: Number,
    pressure: Number,
    batteryHealth: Number,
    lastSensorUpdate: Date
  },

  insurance: {
    provider: String,
    policyNumber: String,
    expiryDate: Date,
    coverage: [String]
  },

  documents: {
    registration: { expiryDate: Date, number: String },
    inspection: { expiryDate: Date, date: Date },
    insurance: { expiryDate: Date }
  },

  statistics: {
    totalDistance: { type: Number, default: 0 },
    totalTrips: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    averageSpeed: { type: Number, default: 0 },
    accidentsCount: { type: Number, default: 0 },
    violationsCount: { type: Number, default: 0 },
    fuelEfficiency: { type: Number, default: 0 },
    lastUpdateDate: Date
  },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  collection: 'vehicles'
});

// الفهارس الجغرافية
vehicleSchema.index({ 'currentLocation': '2dsphere' });
vehicleSchema.index({ 'status': 1, 'createdAt': -1 });
vehicleSchema.index({ 'driver': 1 });

// ====== 2. مخطط الرحلة المحسّن ======

const tripSchema = new mongoose.Schema({
  tripNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
    index: true
  },

  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    index: true
  },

  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  },

  route: {
    startPoint: {
      coordinates: [Number],
      address: String,
      timestamp: Date
    },
    endPoint: {
      coordinates: [Number],
      address: String,
      timestamp: Date
    },
    plannedRoute: [
      {
        coordinates: [Number],
        address: String,
        estimatedArrival: Date
      }
    ],
    actualRoute: [{
      coordinates: [Number],
      timestamp: Date,
      speed: Number,
      bearing: Number
    }]
  },

  schedule: {
    scheduledStart: { type: Date, index: true },
    actualStart: Date,
    scheduledEnd: Date,
    actualEnd: Date,
    delay: Number // بالدقائق
  },

  distance: {
    planned: Number, // كم
    actual: Number,  // كم
    deviation: Number // النسبة المئوية
  },

  duration: {
    planned: Number, // بالدقائق
    actual: Number
  },

  fuel: {
    plannedConsumption: Number, // لتر
    actualConsumption: Number,
    startLevel: Number,
    endLevel: Number
  },

  efficiency: {
    averageSpeed: Number,
    maxSpeed: Number,
    minSpeed: Number,
    harshBrakes: Number,
    harshAccelerations: Number,
    roughTurns: Number
  },

  passengers: {
    scheduled: Number,
    actual: Number,
    boardingPoints: [{
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number]
      },
      timestamp: Date,
      passengersBoarded: Number
    }],
    alightingPoints: [{
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number]
      },
      timestamp: Date,
      passengersAlighted: Number
    }]
  },

  incidents: [{
    timestamp: Date,
    type: String,
    severity: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
      address: String
    },
    description: String,
    evidence: {
      photos: [String],
      videos: [String],
      audioRecording: String
    }
  }],

  riskMetrics: {
    overallRisk: Number, // 0-100
    accidentProbability: Number,
    maintenanceRisk: Number,
    delayProbability: Number,
    fuelRisk: Number
  },

  breaks: [{
    startTime: Date,
    endTime: Date,
    duration: Number,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
      address: String
    },
    reason: String,
    driverFatigue: Number
  }],

  notes: String,
  cost: {
    fuel: Number,
    maintenance: Number,
    labor: Number,
    other: Number,
    total: Number
  },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  collection: 'trips'
});

// الفهارس
tripSchema.index({ 'vehicle': 1, 'schedule.scheduledStart': -1 });
tripSchema.index({ 'driver': 1, 'status': 1 });
tripSchema.index({ 'route.startPoint.coordinates': '2dsphere' });

// ====== 3. مخطط السائق المحسّن ======

const driverSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },

  lastName: {
    type: String,
    required: true
  },

  email: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },

  phone: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  license: {
    number: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    type: String,
    issueDate: Date,
    expiryDate: {
      type: Date,
      index: true
    },
    category: [String]
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'retired'],
    default: 'active',
    index: true
  },

  personalInfo: {
    dateOfBirth: Date,
    nationality: String,
    idNumber: String,
    address: String,
    emergencyContact: {
      name: String,
      phone: String
    }
  },

  employment: {
    startDate: Date,
    endDate: Date,
    department: String,
    salary: Number,
    contract: String
  },

  assignments: {
    currentVehicle: mongoose.Schema.Types.ObjectId,
    assignedVehicles: [mongoose.Schema.Types.ObjectId],
    routes: [mongoose.Schema.Types.ObjectId]
  },

  performance: {
    totalTrips: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    accidentsCount: { type: Number, default: 0 },
    violationsCount: { type: Number, default: 0 },
    safetyScore: { type: Number, default: 100, min: 0, max: 100 },
    averageSpeed: { type: Number, default: 0 },
    fuelEfficiency: { type: Number, default: 0 },
    onTimePercentage: { type: Number, default: 100 },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    lastEvaluationDate: Date
  },

  violations: [{
    date: Date,
    type: String,
    severity: String,
    points: Number,
    description: String,
    resolved: Boolean
  }],

  training: [{
    name: String,
    provider: String,
    completionDate: Date,
    expiryDate: Date,
    certificate: String,
    status: String
  }],

  medicalCheckup: {
    lastCheckupDate: Date,
    nextCheckupDate: Date,
    status: String,
    notes: String
  },

  bankDetails: {
    accountHolder: String,
    accountNumber: String,
    bankName: String,
    routingNumber: String,
    iban: String
  },

  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  },

  documents: {
    passport: { expiryDate: Date },
    visa: { expiryDate: Date },
    workPermit: { expiryDate: Date }
  },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  collection: 'drivers'
});

// ====== 4. مخطط الإخطار ======

const notificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: ['accident', 'maintenance', 'safety', 'fuel', 'location', 'report', 'custom'],
    index: true
  },

  title: String,
  message: String,
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
    index: true
  },

  read: {
    type: Boolean,
    default: false,
    index: true
  },

  readAt: Date,

  channels: [String],

  deliveryStatus: {
    sms: { sent: Boolean, deliveryTime: Date, messageId: String },
    email: { sent: Boolean, deliveryTime: Date, messageId: String },
    push: { sent: Boolean, deliveryTime: Date, messageId: String },
    inApp: { delivered: Boolean, deliveryTime: Date }
  },

  data: mongoose.Schema.Types.Mixed,

  timestamp: { type: Date, default: Date.now, index: true },
  expiresAt: {
    type: Date,
    index: true,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 أيام
  }
}, { 
  timestamps: true,
  collection: 'notifications',
  ttl: 2592000 // 30 أيام للحذف التلقائي
});

// ====== 5. مخطط سجل الدخول والأمان ======

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },

  action: {
    type: String,
    required: true,
    index: true
  },

  resource: String,
  resourceId: String,
  changeDetails: mongoose.Schema.Types.Mixed,
  
  ipAddress: String,
  userAgent: String,
  
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success'
  },

  errorMessage: String,

  timestamp: { type: Date, default: Date.now, index: true },
  expiresAt: {
    type: Date,
    index: true,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // سنة واحدة
  }
}, { 
  timestamps: true,
  collection: 'audit_logs',
  ttl: 31536000 // سنة واحدة للحذف التلقائي
});

// ====== 6. مخطط التقارير ======

const reportSchema = new mongoose.Schema({
  reportName: {
    type: String,
    required: true,
    index: true
  },

  reportType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    index: true
  },

  generatedBy: String,
  generatedAt: { type: Date, default: Date.now, index: true },

  period: {
    startDate: Date,
    endDate: Date
  },

  filters: {
    vehicles: [mongoose.Schema.Types.ObjectId],
    drivers: [mongoose.Schema.Types.ObjectId],
    routes: [mongoose.Schema.Types.ObjectId]
  },

  summary: {
    totalTrips: Number,
    totalDistance: Number,
    totalHours: Number,
    totalFuelCost: Number,
    averageFuelEfficiency: Number,
    safetyIncidents: Number,
    maintenanceIssues: Number
  },

  metrics: {
    operational: {
      utilizationRate: Number,
      onTimePercentage: Number,
      capacityUtilization: Number
    },
    financial: {
      totalCost: Number,
      costPerKM: Number,
      costPerTrip: Number,
      fuelCost: Number,
      maintenanceCost: Number,
      laborCost: Number
    },
    safety: {
      safetyScore: Number,
      incidents: Number,
      violations: Number,
      riskLevel: String
    },
    environmental: {
      emissionsCO2: Number,
      emittedParticles: Number,
      fuelConsumption: Number
    }
  },

  data: {
    vehicleData: [mongoose.Schema.Types.Mixed],
    driverData: [mongoose.Schema.Types.Mixed],
    tripData: [mongoose.Schema.Types.Mixed],
    incidentData: [mongoose.Schema.Types.Mixed]
  },

  attachments: [{
    fileName: String,
    fileType: String,
    filePath: String,
    fileSize: Number,
    uploadDate: Date
  }],

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  collection: 'reports'
});

module.exports = {
  Vehicle: mongoose.model('Vehicle', vehicleSchema),
  Trip: mongoose.model('Trip', tripSchema),
  Driver: mongoose.model('Driver', driverSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
  Report: mongoose.model('Report', reportSchema)
};
