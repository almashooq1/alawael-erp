/**
 * SMART ATTENDANCE SYSTEM CONFIGURATION
 * إعدادات نظام الحضور والانصراف الذكي
 */

module.exports = {
  // ================================
  // 1. ATTENDANCE SETTINGS
  // ================================
  attendance: {
    // Standard check-in/out times
    standardCheckInTime: '08:00', // 8 AM
    standardCheckOutTime: '14:00', // 2 PM
    lateThreshold: 5, // minutes (5 minutes late = mark as late)
    earlyCheckOutThreshold: 30, // minutes (leave 30 min early = flag)

    // Grace periods
    gracePeriodMinutes: 0, // No grace period
    lunchBreakStart: '11:30',
    lunchBreakEnd: '12:30',

    // Attendance status thresholds
    excellentAttendanceRate: 95, // >= 95%
    goodAttendanceRate: 85, // >= 85%
    satisfactoryAttendanceRate: 75, // >= 75% (minimum to avoid penalties)
    poorAttendanceRate: 70, // < 70%

    // Absence handling
    maxConsecutiveAbsences: 5, // Alert after 5 consecutive absences
    alertAbsenceAfterDays: 3, // Alert after 3 absences in a month
    minimumAttendanceForPromotion: 75, // percentage
    minimumAttendanceForCertificate: 80, // percentage
  },

  // ================================
  // 2. BIOMETRIC SETTINGS
  // ================================
  biometric: {
    // Face Recognition
    faceRecognition: {
      enabled: true,
      minQualityScore: 85, // out of 100
      minMatchScore: 95, // confidence threshold
      retries: 3,
      timeoutSeconds: 10,
    },

    // Fingerprint
    fingerprint: {
      enabled: true,
      minQualityScore: 90,
      minMatchScore: 98,
      retries: 3,
      fingersRequired: 2, // Enroll at least 2 fingers
    },

    // Iris Recognition
    iris: {
      enabled: false, // Optional
      minQualityScore: 90,
      minMatchScore: 99,
    },

    // RFID
    rfid: {
      enabled: true,
      expiryDays: 365,
      reEnrollmentReminderDays: 30,
    },

    // General
    enrollmentRetries: 5,
    enrollmentTimeoutMinutes: 15,
    spoofingDetection: true, // Detect fake biometric attempts
  },

  // ================================
  // 3. NOTIFICATION SETTINGS
  // ================================
  notifications: {
    // Default preferences
    defaultChannels: ['email', 'sms', 'pushNotification'],
    defaultLanguage: 'AR', // Arabic

    // Alert thresholds
    alerts: {
      lateArrival: {
        enabled: true,
        threshold: 'any', // 'any', '5', '10', '15', 'none'
        channels: ['pushNotification', 'sms'],
        delayMinutes: 0, // Send immediately
      },
      absence: {
        enabled: true,
        channels: ['email', 'sms', 'whatsapp'],
        sendImmediately: true,
      },
      earlyDeparture: {
        enabled: true,
        channels: ['pushNotification'],
        delayMinutes: 0,
      },
      healthAlert: {
        enabled: true,
        channels: ['pushNotification', 'email'],
        delayMinutes: 0,
        temperatureThreshold: 37.5, // Celsius
      },
      anomalyDetected: {
        enabled: true,
        channels: ['email', 'pushNotification'],
        delayMinutes: 0,
        severity: 'MEDIUM_AND_ABOVE',
      },
    },

    // Quiet hours (no notifications)
    quietHours: {
      enabled: true,
      startTime: '22:00', // 10 PM
      endTime: '06:00', // 6 AM
      applyToWeekends: true,
      exceptions: ['healthAlert', 'anomalyDetected'], // Always send these
    },

    // Sending limits
    maxNotificationsPerDay: 10,
    resendFailedAfterMinutes: 5,
    maxRetries: 3,

    // Bulk notifications
    batchSizeForBulkNotifications: 100,
    delayBetweenBatchesMs: 1000,
  },

  // ================================
  // 4. SECURITY & ANOMALY DETECTION
  // ================================
  security: {
    // Impossible travel detection
    impossibleTravel: {
      enabled: true,
      maxSpeedKmH: 80, // Realistic max speed
      minTimeBetweenLocationsMinutes: 15,
    },

    // Device misuse detection
    deviceMisuse: {
      enabled: true,
      maxStudentsPerDevicePerDay: 1,
      maxRecordsPerDevicePerMinute: 3,
    },

    // Repeated tardiness detection
    repeatedTardiness: {
      enabled: true,
      threshold: 5, // Alert after 5 late arrivals in a month
      window: 30, // days
    },

    // Biometric failure detection
    biometricFailure: {
      enabled: true,
      maxFailedAttemptsBeforeManualVerification: 3,
      requireAlternativeVerificationAfterFailures: true,
    },

    // Location validation
    locationValidation: {
      enabled: true,
      allowedGateways: ['MAIN_GATE', 'SIDE_GATE', 'CLASSROOM'],
      restrictedHours: null,
    },

    // Audit logging
    auditLogging: {
      enabled: true,
      logAllAttempts: true,
      logBiometricMatches: false, // For privacy
      retentionDays: 365,
    },
  },

  // ================================
  // 5. ANALYTICS & PREDICTIONS
  // ================================
  analytics: {
    // Pattern detection
    patterns: {
      detectWeeklyPatterns: true,
      detectMonthlyPatterns: true,
      detectSeasonalPatterns: true,
      minDataPointsRequired: 10,
    },

    // Risk assessment
    riskAssessment: {
      enabled: true,
      evaluationFrequency: 'WEEKLY', // DAILY, WEEKLY, MONTHLY
      factors: {
        absenceRate: { weight: 0.4 },
        lateArrivalRate: { weight: 0.2 },
        patternAnomalies: { weight: 0.2 },
        behavioralFlags: { weight: 0.2 },
      },
      riskThresholds: {
        low: 0.3,
        medium: 0.6,
        high: 0.75,
        critical: 0.9,
      },
    },

    // Predictions
    predictions: {
      enabled: true,
      forecastDays: 30,
      useMachineLearning: true,
      confidenceThreshold: 0.85,
    },

    // Data retention
    dataRetention: {
      rawRecords: 730, // 2 years
      summaries: 1825, // 5 years
      patterns: 1825, // 5 years
      anomalies: 365, // 1 year
      appeals: 1095, // 3 years
    },
  },

  // ================================
  // 6. SCHEDULED TASKS
  // ================================
  scheduledTasks: {
    // Daily reports
    dailyAbsenceReport: {
      enabled: true,
      time: '16:30', // 4:30 PM
      recipients: ['teachers', 'parents', 'admin'],
    },

    // Weekly reports
    weeklyAttendanceSummary: {
      enabled: true,
      time: '17:00', // 5 PM
      day: 'Friday',
      recipients: ['parents', 'admin'],
    },

    // Monthly reports
    monthlyParentNotification: {
      enabled: true,
      time: '09:00', // 9 AM
      dayOfMonth: 1, // 1st day of month
      recipients: ['parents'],
    },

    // Risk assessment
    riskAssessmentTask: {
      enabled: true,
      time: '08:00',
      days: ['Tuesday', 'Friday'], // Twice a week
      recipients: ['admin', 'counselors'],
    },

    // Data cleanup
    dataCleanupTask: {
      enabled: true,
      time: '02:00', // 2 AM
      day: 'Sunday',
      archiveOld: true,
    },

    // Biometric re-enrollment reminder
    biometricReEnrollmentReminder: {
      enabled: true,
      daysBeforeExpiry: 30,
    },

    // Appeals review reminder
    appealsReviewReminder: {
      enabled: true,
      time: '09:00',
      daysToReview: 7,
    },
  },

  // ================================
  // 7. WEBHOOK CONFIGURATION
  // ================================
  webhooks: {
    enabled: true,
    timeout: 10000, // 10 seconds
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    events: {
      attendanceRecorded: {
        enabled: true,
        deliveryAttempts: 3,
      },
      anomalyDetected: {
        enabled: true,
        deliveryAttempts: 3,
      },
      appealSubmitted: {
        enabled: true,
        deliveryAttempts: 2,
      },
      reportGenerated: {
        enabled: true,
        deliveryAttempts: 1,
      },
    },
  },

  // ================================
  // 8. API CONFIGURATION
  // ================================
  api: {
    // Rate limiting
    rateLimit: {
      enabled: true,
      windowMs: 60000, // 1 minute
      maxRequests: 1000, // per minute
      keyGenerator: 'ip', // 'ip' or 'userId'
    },

    // Pagination
    pagination: {
      defaultPageSize: 20,
      maxPageSize: 100,
    },

    // Response format
    responseFormat: 'JSON',
    includeTimestamps: true,
    includeMetadata: true,

    // Cache
    enableCache: true,
    cacheDurationMinutes: 5,
  },

  // ================================
  // 9. DATABASE CONFIGURATION
  // ================================
  database: {
    // Connection
    useReplicaSet: true,
    autoIndex: true,

    // Indexes
    ensureIndexes: true,
    indexBuildStrategy: 'background', // 'foreground', 'background'

    // Backup
    enableBackups: true,
    backupFrequency: 'DAILY', // HOURLY, DAILY, WEEKLY
    backupRetention: 30, // days
  },

  // ================================
  // 10. INTEGRATION SETTINGS
  // ================================
  integrations: {
    // Academic system
    academic: {
      enabled: true,
      minimumAttendanceRate: 75,
      syncFrequency: 'DAILY',
    },

    // Email service
    email: {
      enabled: true,
      provider: 'SMTP', // SMTP, SendGrid, AWS SES
      from: 'attendance@alawael.com',
      replyTo: 'support@alawael.com',
      templates: {
        lateArrival: 'late_arrival_notification',
        absence: 'absence_notification',
        report: 'monthly_report',
      },
    },

    // SMS service
    sms: {
      enabled: true,
      provider: 'TWILIO', // TWILIO, AWS SNS
      countryCode: '+966', // Saudi Arabia
      templateIds: {
        lateArrival: 'SMS_LATE',
        absence: 'SMS_ABSENT',
      },
    },

    // WhatsApp integration
    whatsapp: {
      enabled: true,
      provider: 'WHATSAPP_BUSINESS_API',
      businessAccountId: 'YOUR_ACCOUNT_ID',
      messageTemplates: {
        lateArrival: 'late_arrival_wa',
        absence: 'absence_wa',
      },
    },

    // Firebase (Push notifications)
    firebase: {
      enabled: true,
      serviceAccountPath: './config/firebase-key.json',
      projectId: 'your-project-id',
    },

    // Analytics
    analytics: {
      enabled: true,
      provider: 'MIXPANEL', // MIXPANEL, AMPLITUDE, CUSTOM
      trackEvents: true,
    },

    // Security & Compliance
    compliance: {
      gdprEnabled: true,
      hipaaEnabled: false,
      saudiComplianceEnabled: true,
      dataClassification: 'SENSITIVE',
    },
  },

  // ================================
  // 11. FEATURE FLAGS
  // ================================
  features: {
    smartNotifications: true,
    behavioralAnalytics: true,
    predictiveAlerts: true,
    appealsSystem: true,
    biometricIntegration: true,
    mobileApp: true,
    advancedReporting: true,
    parentPortal: true,
    teacherDashboard: true,
    adminDashboard: true,
  },

  // ================================
  // 12. LOCALIZATION
  // ================================
  localization: {
    defaultLanguage: 'AR', // Arabic
    supportedLanguages: ['AR', 'EN'],
    timezone: 'Asia/Riyadh',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    currencySymbol: 'ر.س', // Saudi Riyal
  },
};
