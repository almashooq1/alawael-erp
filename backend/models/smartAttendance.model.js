/**
 * SMART ATTENDANCE MODELS - PHASE 85
 * نماذج الحضور والانصراف الذكية المتقدمة
 */

const mongoose = require('mongoose');

/**
 * ATTENDANCE RECORD SCHEMA - تسجيل الحضور الفردي
 */
const SmartAttendanceRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    checkInTime: {
      type: Date,
      required: true,
    },
    checkOutTime: {
      type: Date,
    },
    duration: {
      type: Number, // minutes
    },
    method: {
      type: String,
      enum: ['biometric', 'rfid', 'mobile', 'manual', 'face_recognition', 'qr_code'],
      default: 'biometric',
    },
    location: {
      building: String,
      gate: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: [Number], // [longitude, latitude]
      },
    },
    deviceInfo: {
      deviceId: String,
      ipAddress: String,
      deviceType: String,
      macAddress: String,
    },
    evidence: {
      photo: String,
      video: String,
      timestamp: Date,
    },
    healthData: {
      temperature: Number,
      status: {
        type: String,
        enum: ['NORMAL', 'FEVER', 'UNWELL', 'QUARANTINE'],
        default: 'NORMAL',
      },
      heartRate: Number,
      notes: String,
    },
    status: {
      type: String,
      enum: ['CHECKED_IN', 'CHECKED_OUT', 'ABSENT', 'EXCUSED', 'LATE'],
      default: 'CHECKED_IN',
    },
    flags: {
      isLate: Boolean,
      lateDuration: Number, // minutes
      isEarlyCheckOut: Boolean,
      isAnomalous: Boolean,
    },
    verification: {
      status: {
        type: String,
        enum: ['PENDING', 'VERIFIED', 'REJECTED'],
        default: 'PENDING',
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
      },
      biometricScore: Number, // 0-100
      confidence: Number,
    },
    notifications: {
      sentToParent: Boolean,
      sentToTeacher: Boolean,
      sentToAdmin: Boolean,
      sentAt: Date,
    },
    anomalies: [
      {
        type: String,
        enum: [
          'IMPOSSIBLE_TRAVEL',
          'DEVICE_MISUSE',
          'DUPLICATE_DEVICE',
          'REPEATED_TARDINESS',
          'HEALTH_ALERT',
          'LOCATION_MISMATCH',
          'BIOMETRIC_FAIL',
        ],
      },
    ],
    notes: String,
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'smart_attendance_records',
    indexes: [
      { studentId: 1, date: 1 },
      { classId: 1, date: 1 },
      { checkInTime: 1 },
      { 'location.coordinates': '2dsphere' },
      { createdAt: -1 },
    ],
  }
);

/**
 * ATTENDANCE BEHAVIOR PATTERN SCHEMA
 */
const AttendanceBehaviorPatternSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
    },
    academicYear: String,
    semester: String,
    period: {
      startDate: Date,
      endDate: Date,
      daysAnalyzed: Number,
    },
    statistics: {
      totalDays: Number,
      presentDays: Number,
      absentDays: Number,
      lateArrivals: Number,
      earlyDepartures: Number,
      excusedAbsences: Number,
      attendanceRate: Number, // percentage
    },
    patterns: {
      dayOfWeekPattern: {
        Monday: { present: Number, rate: Number },
        Tuesday: { present: Number, rate: Number },
        Wednesday: { present: Number, rate: Number },
        Thursday: { present: Number, rate: Number },
        Friday: { present: Number, rate: Number },
      },
      cyclicalPattern: {
        type: String,
        enum: ['WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'NONE', 'RANDOM'],
      },
      seasonalTrend: String,
      typicalArrivalTime: String,
      averageLateDuration: Number, // minutes
    },
    risks: {
      riskLevel: {
        type: String,
        enum: ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
        default: 'LOW',
      },
      riskScore: Number, // 0-100
      dropoutProbability: Number, // 0-1
      factors: [String],
    },
    predictions: {
      nextWeekAttendanceRate: Number,
      nextMonthAttendanceRate: Number,
      likelyAbsentDays: [String], // Dates
      recommendedInterventions: [String],
    },
    trends: {
      direction: {
        type: String,
        enum: ['IMPROVING', 'DECLINING', 'STABLE'],
      },
      changeRate: Number, // percentage change
      negativeTriggersIdentified: [String],
    },
    lastAnalyzedAt: { type: Date, default: Date.now },
  },
  { collection: 'attendance_behavior_patterns' }
);

/**
 * ATTENDANCE APPEAL & CORRECTION
 */
const AttendanceAppealSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    attendanceRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SmartAttendanceRecord',
      required: true,
    },
    appealReason: {
      category: {
        type: String,
        enum: [
          'ILLNESS',
          'FAMILY_EMERGENCY',
          'TRANSPORTATION',
          'SYSTEM_ERROR',
          'EXEMPTION',
          'OTHER',
        ],
      },
      description: String,
    },
    supportingEvidence: [
      {
        documentType: String,
        documentUrl: String,
        verificationStatus: {
          type: String,
          enum: ['PENDING', 'VERIFIED', 'REJECTED'],
        },
        uploadedAt: Date,
      },
    ],
    requestedAction: {
      type: String,
      enum: ['MARK_PRESENT', 'MARK_EXCUSED', 'REMOVE_LATE_FLAG'],
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
      default: 'SUBMITTED',
    },
    reviewProcess: {
      submittedAt: { type: Date, default: Date.now },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
      },
      reviewedAt: Date,
      decision: String,
      reviewNotes: String,
      approvalLevel: {
        type: String,
        enum: ['TEACHER', 'COORDINATOR', 'DIRECTOR'],
      },
    },
    validity: {
      expiryDate: Date,
      isValid: Boolean,
    },
  },
  { collection: 'attendance_appeals' }
);

/**
 * PARENT/GUARDIAN NOTIFICATION PREFERENCES
 */
const ParentNotificationPreferencesSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
    },
    parentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Parent',
      },
    ],
    communicationChannels: {
      email: {
        enabled: Boolean,
        addresses: [String],
      },
      sms: {
        enabled: Boolean,
        numbers: [String],
      },
      pushNotification: {
        enabled: Boolean,
      },
      whatsapp: {
        enabled: Boolean,
        numbers: [String],
      },
      inApp: {
        enabled: Boolean,
      },
    },
    alertPreferences: {
      lateArrival: {
        enabled: Boolean,
        threshold: {
          type: String,
          enum: ['any', '5', '10', '15', 'none'],
          default: 'any',
        },
        frequency: {
          type: String,
          enum: ['immediate', 'daily_summary', 'weekly_summary'],
        },
      },
      absence: {
        enabled: Boolean,
        notifyImmediately: Boolean,
      },
      earlyDeparture: {
        enabled: Boolean,
      },
      healthAlert: {
        enabled: Boolean,
        alertOnFever: Boolean,
        threshold: Number,
      },
      behavioralAlert: {
        enabled: Boolean,
      },
      monthlyReport: {
        enabled: Boolean,
        deliveryDate: Number, // Day of month
      },
    },
    quietHours: {
      enabled: Boolean,
      startTime: String, // HH:mm
      endTime: String,
      daysApplicable: [String], // Monday, Tuesday, etc.
    },
    language: {
      type: String,
      enum: ['AR', 'EN'],
      default: 'AR',
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'parent_notification_preferences' }
);

/**
 * BIOMETRIC TEMPLATE SCHEMA
 */
const BiometricEnrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
    },
    enrollmentStatus: {
      type: String,
      enum: ['PENDING', 'INCOMPLETE', 'COMPLETED', 'FAILED', 'EXPIRED'],
      default: 'PENDING',
    },
    biometricData: {
      fingerprint: {
        enrolled: Boolean,
        template: Buffer,
        quality: Number,
        enrollmentDate: Date,
        fingers: [String], // Which fingers are enrolled
      },
      faceRecognition: {
        enrolled: Boolean,
        faceVector: [Number],
        embedding: Buffer,
        photoUrl: String,
        enrollmentDate: Date,
        qualityScore: Number,
      },
      iris: {
        enrolled: Boolean,
        template: Buffer,
        enrollmentDate: Date,
      },
      voiceId: {
        enrolled: Boolean,
        voiceSample: String,
        enrollmentDate: Date,
      },
    },
    rfidCard: {
      cardId: String,
      issuedDate: Date,
      expiryDate: Date,
      status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE', 'LOST', 'EXPIRED'],
      },
    },
    enrollmentHistory: [
      {
        date: Date,
        method: String,
        status: String,
        notes: String,
      },
    ],
    enrollmentProcessStatus: {
      step: Number,
      completionPercentage: Number,
      nextStep: String,
      requiredActions: [String],
    },
    enrolledAt: Date,
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'biometric_enrollments' }
);

/**
 * ATTENDANCE ANOMALY ALERT SCHEMA
 */
const AttendanceAnomalyAlertSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    anomalyType: {
      type: String,
      enum: [
        'DEVICE_SHARING',
        'IMPOSSIBLE_TRAVEL',
        'LOCATION_MISMATCH',
        'REPEATED_TARDINESS',
        'UNAUTHORIZED_LOCATION',
        'BIOMETRIC_FAILURE',
        'SPOOFING_ATTEMPT',
        'TIME_MANIPULATION',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    description: String,
    detectionTime: Date,
    evidence: {
      previousRecord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SmartAttendanceRecord',
      },
      currentRecord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SmartAttendanceRecord',
      },
      distance: Number, // km
      timeDifference: Number, // minutes
      location1: String,
      location2: String,
    },
    status: {
      type: String,
      enum: ['DETECTED', 'INVESTIGATING', 'CONFIRMED', 'FALSE_ALARM'],
      default: 'DETECTED',
    },
    actionTaken: String,
    notificationsAlertSent: {
      security: Boolean,
      admin: Boolean,
      parent: Boolean,
    },
    resolvedAt: Date,
    resolution: String,
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: 'attendance_anomaly_alerts' }
);

/**
 * ATTENDANCE SUMMARY & REPORTING
 */
const AttendanceSummaryReportSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    reportPeriod: {
      type: String,
      enum: ['WEEKLY', 'MONTHLY', 'SEMESTER', 'ANNUAL'],
    },
    periodDates: {
      startDate: Date,
      endDate: Date,
    },
    summary: {
      totalSchoolDays: Number,
      presentDays: Number,
      absentDays: Number,
      excusedAbsentDays: Number,
      lateDays: Number,
      earlyDepartureDays: Number,
      attendancePercentage: Number,
    },
    indicators: {
      status: {
        type: String,
        enum: ['EXCELLENT', 'GOOD', 'SATISFACTORY', 'POOR', 'CRITICAL'],
      },
      impactsAcademicStanding: Boolean,
      impactsMentionOnCertificate: Boolean,
      affectsPromotion: Boolean,
    },
    recommendations: [String],
    parentNotification: {
      sent: Boolean,
      sentAt: Date,
      method: String,
      acknowledged: Boolean,
    },
    generatedAt: { type: Date, default: Date.now },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { collection: 'attendance_summary_reports' }
);

/**
 * CAMERA DEVICE SCHEMA - إدارة أجهزة الكاميرا
 */
const CameraDeviceSchema = new mongoose.Schema(
  {
    cameraId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    location: {
      building: String,
      gate: String,
      description: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: [Number], // [longitude, latitude]
      },
    },
    type: {
      type: String,
      enum: ['IP_CAMERA', 'USB_CAMERA', 'RTSP_CAMERA', 'THERMAL_CAMERA'],
      default: 'IP_CAMERA',
    },
    connectionConfig: {
      ipAddress: String,
      rtspUrl: String,
      port: Number,
      protocol: String,
    },
    specifications: {
      resolution: String, // 480p, 720p, 1080p, 4K
      fps: Number,
      lens: String,
      sensorType: String,
      viewAngle: Number,
    },
    capabilities: [
      {
        type: String,
        enum: ['FACE_RECOGNITION', 'MOTION_DETECTION', 'THERMAL_IMAGING', 'NIGHT_VISION'],
      },
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OFFLINE'],
      default: 'ACTIVE',
    },
    connectionStatus: {
      type: String,
      enum: ['ONLINE', 'OFFLINE'],
      default: 'OFFLINE',
    },
    calibration: {
      brightness: { type: Number, default: 1.0 },
      contrast: { type: Number, default: 1.0 },
      saturation: { type: Number, default: 1.0 },
      hueRotation: { type: Number, default: 0 },
      calibratedAt: Date,
    },
    health: {
      uptime: Number, // milliseconds
      frameDropRate: { type: Number, default: 0 },
      errorCount: { type: Number, default: 0 },
      lastHealthCheck: Date,
      cpuUsage: Number, // percentage
      diskUsage: Number, // percentage
    },
    recording: {
      enabled: Boolean,
      storage: {
        type: String,
        enum: ['LOCAL', 'CLOUD', 'NAS'],
      },
      retention: Number, // days
      quality: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'MAXIMUM'],
      },
    },
    faceDetection: {
      enabled: Boolean,
      confidence: { type: Number, default: 0.95 },
      processInterval: Number, // milliseconds
      detectUnknownFaces: Boolean,
      sendAlert: Boolean,
    },
    statistics: {
      facesDetected: { type: Number, default: 0 },
      recognitions: { type: Number, default: 0 },
      successRate: Number, // percentage
      totalFramesProcessed: { type: Number, default: 0 },
    },
    registeredAt: { type: Date, default: Date.now },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    lastConnected: Date,
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'camera_devices',
    indexes: [{ cameraId: 1 }, { location: '2dsphere' }, { status: 1 }, { connectionStatus: 1 }],
  }
);

/**
 * BIOMETRIC DEVICE SCHEMA - أجهزة البصمة والتحقق
 */
const BiometricDeviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'FINGERPRINT_SCANNER',
        'IRIS_SCANNER',
        'FACIAL_RECOGNITION',
        'VOICE_ID',
        'MULTI_MODAL',
      ],
      required: true,
    },
    location: {
      building: String,
      gate: String,
      description: String,
    },
    specifications: {
      modelNumber: String,
      manufacturer: String,
      scanningResolution: Number, // DPI for fingerprint
      captureTime: Number, // milliseconds
      templateSize: Number, // bytes
    },
    connectionConfig: {
      port: String, // COM port or IP
      baudRate: Number,
      protocol: String,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
      default: 'ACTIVE',
    },
    connectionStatus: {
      type: String,
      enum: ['ONLINE', 'OFFLINE'],
      default: 'OFFLINE',
    },
    enrollment: {
      totalEnrolled: { type: Number, default: 0 },
      enrolledStudents: [
        {
          studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
          },
          enrollmentDate: Date,
          quality: Number,
          status: {
            type: String,
            enum: ['PENDING', 'VERIFIED', 'ACTIVE', 'REJECTED'],
          },
        },
      ],
      templateCount: { type: Number, default: 0 },
    },
    authentication: {
      totalAttempts: { type: Number, default: 0 },
      successfulAuthentications: { type: Number, default: 0 },
      failedAttempts: { type: Number, default: 0 },
      successRate: Number, // percentage
      averageMatchingTime: Number, // milliseconds
      falseAcceptRate: Number, // FAR percentage
      falseRejectRate: Number, // FRR percentage
    },
    quality: {
      minQualityScore: { type: Number, default: 0.85 },
      avgQualityScore: Number,
      qualityThreshold: String,
    },
    maintenance: {
      lastMaintenance: Date,
      maintenanceInterval: Number, // days
      nextMaintenanceDate: Date,
      cleaningRequired: Boolean,
      calibrationNeeded: Boolean,
    },
    statistics: {
      dailyUsage: [
        {
          date: Date,
          usageCount: Number,
          successCount: Number,
          failureCount: Number,
        },
      ],
      monthlyStatistics: {
        totalUses: Number,
        successRate: Number,
        averageWaitTime: Number,
      },
    },
    registeredAt: { type: Date, default: Date.now },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    lastConnected: Date,
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'biometric_devices',
    indexes: [{ deviceId: 1 }, { type: 1 }, { status: 1 }, { connectionStatus: 1 }],
  }
);

/**
 * FACE RECOGNITION DATA SCHEMA - بيانات التعرف على الوجه
 */
const FaceRecognitionDataSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    enrollmentId: {
      type: String,
      unique: true,
    },
    faceTemplate: {
      embedding: [Number], // 128-dimensional vector
      modelVersion: String,
      quality: Number, // 0-100
      confidence: Number,
      generatedAt: Date,
    },
    biometricSamples: [
      {
        sampleId: String,
        imageUrl: String,
        timestamp: Date,
        quality: Number,
        landmarks: {
          leftEye: { x: Number, y: Number },
          rightEye: { x: Number, y: Number },
          nose: { x: Number, y: Number },
          mouth: { x: Number, y: Number },
        },
        metadata: {
          brightness: Number,
          angle: Number,
          expression: String,
        },
      },
    ],
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'ACTIVE', 'REJECTED'],
      default: 'PENDING',
    },
    verification: {
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
      },
      verifiedAt: Date,
      manualReview: Boolean,
      notes: String,
    },
    enrollmentDate: { type: Date, default: Date.now },
    lastUpdateDate: Date,
    recognitionHistory: [
      {
        timestamp: Date,
        cameraId: String,
        location: String,
        confidence: Number,
        recognized: Boolean,
      },
    ],
  },
  {
    collection: 'face_recognition_data',
    indexes: [{ studentId: 1 }, { enrollmentId: 1 }, { status: 1 }],
  }
);

/**
 * FINGERPRINT DATA SCHEMA - بيانات البصمات
 */
const FingerprintDataSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    enrollmentId: {
      type: String,
      unique: true,
    },
    fingerprints: [
      {
        fingerIndex: { type: Number, min: 0, max: 9 }, // 0-9 for ten fingers
        template: {
          minutiae: [
            {
              x: Number,
              y: Number,
              angle: Number,
              type: String, // ridge_ending, bifurcation
            },
          ],
          quality: Number, // 0-100
          imageSize: {
            width: Number,
            height: Number,
          },
        },
        generatedAt: Date,
        enrollmentDevice: String,
        status: {
          type: String,
          enum: ['PENDING', 'VERIFIED', 'ACTIVE', 'REJECTED'],
        },
      },
    ],
    enrollmentDate: { type: Date, default: Date.now },
    lastUpdateDate: Date,
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    verifiedAt: Date,
    recognitionHistory: [
      {
        timestamp: Date,
        fingerIndex: Number,
        deviceId: String,
        confidence: Number,
        quality: Number,
        recognized: Boolean,
      },
    ],
    statistics: {
      totalAttempts: { type: Number, default: 0 },
      successfulMatches: { type: Number, default: 0 },
      failedMatches: { type: Number, default: 0 },
      successRate: Number, // percentage
      averageMatchingTime: Number, // milliseconds
    },
  },
  {
    collection: 'fingerprint_data',
    indexes: [{ studentId: 1 }, { enrollmentId: 1 }, { fingerIndex: 1 }],
  }
);

/**
 * ATTENDANCE VIA CAMERA SCHEMA - تسجيل الحضور عبر الكاميرا
 */
const AttendanceViaCameraSchema = new mongoose.Schema(
  {
    attendanceId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
    cameraId: {
      type: String,
      ref: 'CameraDevice',
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: ['FACE_RECOGNITION', 'FINGERPRINT', 'RFID', 'THERMAL'],
      default: 'FACE_RECOGNITION',
    },
    biometricData: {
      confidence: Number, // 0-1
      quality: Number, // 0-100
      matchingTime: Number, // milliseconds
      templateId: String,
      overallScore: Number, // 0-100
    },
    evidence: {
      snapshotUrl: String,
      videoClipUrl: String,
      processingTime: Number, // milliseconds
      frameNumber: Number,
    },
    location: {
      building: String,
      gate: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: [Number], // [longitude, latitude]
      },
    },
    verification: {
      status: {
        type: String,
        enum: ['PENDING', 'VERIFIED', 'MANUAL_REVIEW', 'REJECTED'],
        default: 'PENDING',
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
      },
      verifiedAt: Date,
      reviewNotes: String,
    },
    linkToAttendanceRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SmartAttendanceRecord',
    },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    collection: 'attendance_via_camera',
    indexes: [
      { studentId: 1, timestamp: -1 },
      { cameraId: 1, timestamp: -1 },
      { 'location.coordinates': '2dsphere' },
    ],
  }
);

// Create models
const SmartAttendanceRecord = mongoose.model('SmartAttendanceRecord', SmartAttendanceRecordSchema);
const AttendanceBehaviorPattern = mongoose.model(
  'AttendanceBehaviorPattern',
  AttendanceBehaviorPatternSchema
);
const AttendanceAppeal = mongoose.model('AttendanceAppeal', AttendanceAppealSchema);
const ParentNotificationPreferences = mongoose.model(
  'ParentNotificationPreferences',
  ParentNotificationPreferencesSchema
);
const BiometricEnrollment = mongoose.model('BiometricEnrollment', BiometricEnrollmentSchema);
const AttendanceAnomalyAlert = mongoose.model(
  'AttendanceAnomalyAlert',
  AttendanceAnomalyAlertSchema
);
const AttendanceSummaryReport = mongoose.model(
  'AttendanceSummaryReport',
  AttendanceSummaryReportSchema
);
const CameraDevice = mongoose.model('CameraDevice', CameraDeviceSchema);
const BiometricDevice = mongoose.model('BiometricDevice', BiometricDeviceSchema);
const FaceRecognitionData = mongoose.model('FaceRecognitionData', FaceRecognitionDataSchema);
const FingerprintData = mongoose.model('FingerprintData', FingerprintDataSchema);
const AttendanceViaCamera = mongoose.model('AttendanceViaCamera', AttendanceViaCameraSchema);

module.exports = {
  SmartAttendanceRecord,
  AttendanceBehaviorPattern,
  AttendanceAppeal,
  ParentNotificationPreferences,
  BiometricEnrollment,
  AttendanceAnomalyAlert,
  AttendanceSummaryReport,
  CameraDevice,
  BiometricDevice,
  FaceRecognitionData,
  FingerprintData,
  AttendanceViaCamera,
};
