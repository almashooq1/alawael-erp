/**
 * ===================================================================
 * STUDENT TRANSPORTATION SYSTEM - Models
 * نظام نقل الطلاب - النماذج
 * ===================================================================
 */

const mongoose = require('mongoose');

// ===================================================================
// 1. STUDENT MODEL - نموذج الطالب
// ===================================================================
const studentSchema = new mongoose.Schema(
  {
    // Personal Information
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
    },
    studentID: {
      type: String,
      required: true,
      unique: true,
    },

    // Location Information
    homeAddress: {
      street: String,
      city: String,
      postalCode: String,
      latitude: Number,
      longitude: Number,
    },
    schoolAddress: {
      street: String,
      city: String,
      postalCode: String,
      latitude: Number,
      longitude: Number,
    },

    // Academic Information
    grade: String,
    schoolName: String,
    academicYear: String,

    // Parent/Guardian Information
    parentName: String,
    parentPhone: String,
    parentEmail: String,

    // Transportation Details
    transportationType: {
      type: String,
      enum: ['bus', 'shuttle', 'van', 'carpool', 'school-bus'],
      default: 'bus',
    },
    assignedBusRoute: mongoose.Schema.Types.ObjectId,
    assignedDriver: mongoose.Schema.Types.ObjectId,

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },

    // Emergency Information
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },

    // Payment Information
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'overdue'],
      default: 'pending',
    },
    monthlyFee: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },

    // Tracking & History
    currentLocation: {
      latitude: Number,
      longitude: Number,
      lastUpdated: Date,
    },
    pickupPoint: String,
    dropoffPoint: String,

    // Audit Fields
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true }
);

studentSchema.index({ email: 1 });
studentSchema.index({ studentID: 1 });

// ===================================================================
// 2. BUS ROUTE MODEL - نموذج مسار الحافلة
// ===================================================================
const busRouteSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: true,
      unique: true,
    },
    routeNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // Route Details
    startingPoint: {
      name: String,
      latitude: Number,
      longitude: Number,
    },
    endingPoint: {
      name: String,
      latitude: Number,
      longitude: Number,
    },

    // Stops along the route
    stops: [
      {
        stopName: String,
        stopNumber: Number,
        latitude: Number,
        longitude: Number,
        estimatedTime: String,
        pickupTime: String,
        dropoffTime: String,
      },
    ],

    // Timing
    departureTime: String, // e.g., "07:00"
    arrivalTime: String, // e.g., "08:30"
    duration: Number, // in minutes

    // Vehicle Assignment
    assignedBus: mongoose.Schema.Types.ObjectId,
    assignedDriver: mongoose.Schema.Types.ObjectId,
    backupDriver: mongoose.Schema.Types.ObjectId,

    // Students on route
    totalStudents: Number,
    enrolledStudents: [mongoose.Schema.Types.ObjectId],

    // Capacity
    busCapacity: Number,
    currentLoad: Number,

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },

    // Route distance and cost
    distanceKm: Number,
    routeCost: Number,
    costPerStudent: Number,

    // Frequency
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily',
    },
    operatingDays: [String], // ['Monday', 'Tuesday', ...]

    // Audit Fields
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true }
);

busRouteSchema.index({ routeNumber: 1 });
busRouteSchema.index({ status: 1 });

// ===================================================================
// 3. DRIVER MODEL - نموذج السائق
// ===================================================================
const driverSchema = new mongoose.Schema(
  {
    // Personal Information
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
    },
    driverID: {
      type: String,
      required: true,
      unique: true,
    },

    // License Information
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
    },
    licenseExpiry: Date,
    licenseClass: String,

    // Employment Details
    employmentDate: Date,
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'on-leave'],
      default: 'active',
    },

    // Assignment
    assignedBus: mongoose.Schema.Types.ObjectId,
    assignedRoutes: [mongoose.Schema.Types.ObjectId],
    assignedStudents: [mongoose.Schema.Types.ObjectId],

    // Contact Information
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },

    // Document Information
    documents: [
      {
        documentType: String, // 'insurance', 'medical', 'background-check'
        expiryDate: Date,
        status: String,
      },
    ],

    // Performance Metrics
    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
    totalTrips: {
      type: Number,
      default: 0,
    },
    incidents: {
      type: Number,
      default: 0,
    },
    safetyScore: {
      type: Number,
      default: 100,
    },

    // Current Status
    currentLocation: {
      latitude: Number,
      longitude: Number,
      lastUpdated: Date,
    },
    isOnDuty: {
      type: Boolean,
      default: false,
    },
    currentRoute: mongoose.Schema.Types.ObjectId,

    // Audit Fields
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true }
);

driverSchema.index({ email: 1 });
driverSchema.index({ status: 1 });

// ===================================================================
// 4. BUS/VEHICLE MODEL - نموذج الحافلة
// ===================================================================
const vehicleSchema = new mongoose.Schema(
  {
    // Vehicle Information
    vehicleName: {
      type: String,
      required: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    vin: {
      type: String,
      required: true,
      unique: true,
    },

    // Details
    vehicleType: {
      type: String,
      enum: ['bus', 'shuttle', 'van'],
      default: 'bus',
    },
    make: String,
    model: String,
    year: Number,

    // Capacity
    seatingCapacity: {
      type: Number,
      required: true,
    },
    currentPassengers: {
      type: Number,
      default: 0,
    },

    // Maintenance
    maintenanceSchedule: Date,
    lastServiceDate: Date,
    nextServiceDate: Date,
    maintenanceStatus: {
      type: String,
      enum: ['good', 'needs-service', 'in-maintenance'],
      default: 'good',
    },

    // Insurance & Registration
    insuranceProvider: String,
    insurancePolicyNumber: String,
    insuranceExpiry: Date,
    registrationExpiry: Date,

    // Fuel & Emissions
    fuelType: String, // 'petrol', 'diesel', 'electric'
    fuelCapacity: Number,
    currentFuel: Number,
    emissionStandard: String,

    // GPS & Tracking
    hasGPS: {
      type: Boolean,
      default: true,
    },
    currentLocation: {
      latitude: Number,
      longitude: Number,
      lastUpdated: Date,
    },

    // Status
    status: {
      type: String,
      enum: ['operational', 'maintenance', 'out-of-service'],
      default: 'operational',
    },

    // Assignment
    assignedDriver: mongoose.Schema.Types.ObjectId,
    assignedRoute: mongoose.Schema.Types.ObjectId,

    // Safety Features
    safetyFeatures: [String], // ['airbags', 'abs', 'speed-limiter']
    hasExtinguisher: Boolean,
    hasFirstAidKit: Boolean,

    // Audit Fields
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true }
);

vehicleSchema.index({ status: 1 });
// Note: registrationNumber has unique: true (creates automatic index)

// ===================================================================
// 5. ATTENDANCE MODEL - نموذج الحضور
// ===================================================================
const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    busRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusRoute',
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
    },

    // Attendance Details
    date: {
      type: Date,
      required: true,
    },
    pickupTime: Date,
    dropoffTime: Date,
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present',
    },

    // Tracking
    pickupLocation: {
      latitude: Number,
      longitude: Number,
    },
    dropoffLocation: {
      latitude: Number,
      longitude: Number,
    },

    // Notes
    notes: String,
    reason: String, // for absences/excuses

    // Audit Fields
    recordedBy: String,
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, date: 1 });

// ===================================================================
// 6. INCIDENT MODEL - نموذج الحادثة
// ===================================================================
const incidentSchema = new mongoose.Schema(
  {
    incidentNumber: {
      type: String,
      required: true,
      unique: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: String,

    // Involved Parties
    student: mongoose.Schema.Types.ObjectId,
    driver: mongoose.Schema.Types.ObjectId,
    vehicle: mongoose.Schema.Types.ObjectId,
    busRoute: mongoose.Schema.Types.ObjectId,

    // Incident Details
    type: {
      type: String,
      enum: ['accident', 'behavioral', 'medical', 'mechanical', 'security', 'other'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    description: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },

    // Actions Taken
    actionTaken: String,
    immediateResponse: String,
    followUpRequired: Boolean,

    // Investigation
    status: {
      type: String,
      enum: ['open', 'under-investigation', 'resolved', 'closed'],
      default: 'open',
    },
    investigationNotes: String,

    // Attached Files
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        uploadDate: Date,
      },
    ],

    // Audit Fields
    reportedBy: String,
    reportedAt: Date,
    resolvedBy: String,
    resolvedAt: Date,
  },
  { timestamps: true }
);

incidentSchema.index({ incidentNumber: 1 });
incidentSchema.index({ status: 1 });

// ===================================================================
// 7. PAYMENT MODEL - نموذج الدفع
// ===================================================================
const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    busRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusRoute',
    },

    // Payment Details
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'SAR',
    },
    month: String, // 'January 2026'
    year: Number,

    // Payment Method
    paymentMethod: {
      type: String,
      enum: ['cash', 'credit-card', 'bank-transfer', 'check', 'online'],
      required: true,
    },
    referenceNumber: String,

    // Status
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },

    // Dates
    invoiceDate: Date,
    dueDate: Date,
    paymentDate: Date,

    // Notes
    notes: String,
    receiptNumber: String,

    // Audit Fields
    createdBy: String,
    processedBy: String,
  },
  { timestamps: true }
);

paymentSchema.index({ student: 1, month: 1 });
paymentSchema.index({ status: 1 });

// ===================================================================
// 8. NOTIFICATION MODEL - نموذج الإخطارات
// ===================================================================
const notificationSchema = new mongoose.Schema(
  {
    recipient: mongoose.Schema.Types.ObjectId, // Student, Parent, or Admin
    recipientType: {
      type: String,
      enum: ['student', 'parent', 'driver', 'admin'],
      required: true,
    },

    // Notification Details
    title: String,
    message: String,
    type: {
      type: String,
      enum: ['pickup', 'dropoff', 'delay', 'incident', 'payment', 'alert', 'general'],
      required: true,
    },

    // Related Entity
    relatedEntity: {
      entityType: String,
      entityId: mongoose.Schema.Types.ObjectId,
    },

    // Status
    status: {
      type: String,
      enum: ['unread', 'read'],
      default: 'unread',
    },
    readAt: Date,

    // Delivery
    deliveryMethod: [String], // ['sms', 'email', 'push']
    deliveryStatus: {
      sms: String,
      email: String,
      push: String,
    },

    // Audit Fields
    sentAt: Date,
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, status: 1 });

// ===================================================================
// Export Models
// ===================================================================
const Student = mongoose.model('TransportStudent', studentSchema);
const BusRoute = mongoose.model('TransportBusRoute', busRouteSchema);
const Driver = mongoose.model('TransportDriver', driverSchema);
const Vehicle = mongoose.model('TransportVehicle', vehicleSchema);
const Attendance = mongoose.model('TransportAttendance', attendanceSchema);
const Incident = mongoose.model('TransportIncident', incidentSchema);
const Payment = mongoose.model('TransportPayment', paymentSchema);
const Notification = mongoose.model('TransportNotification', notificationSchema);

module.exports = {
  Student,
  BusRoute,
  Driver,
  Vehicle,
  Attendance,
  Incident,
  Payment,
  Notification,
};
