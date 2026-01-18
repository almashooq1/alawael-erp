/**
 * Camera System Configuration
 * إعدادات نظام كاميرات المراقبة
 */

module.exports = {
  // ========================
  // Hikvision Configuration
  // ========================
  hikvision: {
    defaultPort: 8000,
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
    autoReconnect: true,
    reconnectInterval: 30000, // 30 seconds

    // Streaming protocols
    protocols: ['rtsp', 'http', 'wss'],
    defaultProtocol: 'rtsp',

    // Video settings
    resolutions: ['480p', '720p', '1080p', '2K', '4K'],
    defaultResolution: '1080p',
    defaultFrameRate: 25,
    defaultBitrate: 2048,

    // Motion detection
    motionDetection: {
      defaultEnabled: true,
      minSensitivity: 1,
      maxSensitivity: 100,
      defaultSensitivity: 50,
    },

    // Recording
    recording: {
      defaultEnabled: true,
      qualities: ['low', 'medium', 'high', 'ultra'],
      defaultQuality: 'high',
      defaultSchedule: {
        monday: { from: '00:00', to: '23:59' },
        tuesday: { from: '00:00', to: '23:59' },
        wednesday: { from: '00:00', to: '23:59' },
        thursday: { from: '00:00', to: '23:59' },
        friday: { from: '00:00', to: '23:59' },
        saturday: { from: '00:00', to: '23:59' },
        sunday: { from: '00:00', to: '23:59' },
      },
    },
  },

  // ========================
  // Cloud Storage Configuration
  // ========================
  cloudStorage: {
    // AWS S3
    aws: {
      enabled: process.env.AWS_ACCESS_KEY_ID ? true : false,
      region: process.env.AWS_REGION || 'us-east-1',
      bucketName: process.env.S3_BUCKET_NAME,
      chunkSize: 5 * 1024 * 1024, // 5 MB
      encryption: 'AES256',
      retentionDays: 30,
      storageClass: 'STANDARD', // or INTELLIGENT_TIERING
    },

    // Google Cloud Storage
    gcs: {
      enabled: process.env.GOOGLE_PROJECT_ID ? true : false,
      projectId: process.env.GOOGLE_PROJECT_ID,
      bucketName: process.env.GCS_BUCKET_NAME,
      retentionDays: 30,
    },

    // Local Storage
    local: {
      enabled: true,
      basePath: process.env.UPLOAD_DIR || './uploads',
      maxSize: 500 * 1024 * 1024 * 1024, // 500 GB
    },

    // Default provider
    defaultProvider: 'aws-s3',
  },

  // ========================
  // Recording Configuration
  // ========================
  recording: {
    // Storage limits
    maxStoragePerBranch: 500, // GB
    maxStoragePerCamera: 100, // GB

    // Retention policies
    retentionPolicies: {
      permanent: { deleteAfterDays: null },
      auto30: { deleteAfterDays: 30 },
      auto15: { deleteAfterDays: 15 },
      auto7: { deleteAfterDays: 7 },
      auto3: { deleteAfterDays: 3 },
    },
    defaultRetention: 'auto30',

    // Processing
    videoCodec: 'h264', // or h265
    videoContainer: 'mp4',
    enableThumbnails: true,
    enableTranscoding: false,
    compressionQuality: 85,

    // Upload settings
    uploadStrategy: 'continuous', // continuous, scheduled, on-motion
    uploadSchedule: '2:00 AM', // للتحميل المجدول
    maxConcurrentUploads: 5,
    uploadRetries: 3,
  },

  // ========================
  // Motion Detection Configuration
  // ========================
  motionDetection: {
    enabled: true,
    defaultSensitivity: 50,
    minAreaPercentage: 1, // الحد الأدنى لمساحة الكشف
    debounceTime: 3000, // تأخير للتحقق من الحركة المتكررة
    maxEventsPerCamera: 100, // عدد الأحداث المحفوظ

    // Alerts
    alertsEnabled: true,
    alertChannels: ['email', 'push', 'sms'],
    alertDelay: 5000, // تأخير التنبيه بـ ميلي ثانية
  },

  // ========================
  // Database Configuration
  // ========================
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cameras',
    connectionOptions: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      minPoolSize: 5,
    },

    // Indexes
    indexes: {
      enableTextSearch: true,
      analyzeQueryPlans: true,
    },

    // TTL (Time To Live)
    ttlIndexes: {
      recordings: 2592000, // 30 days
      logs: 7776000, // 90 days
      sessions: 604800, // 7 days
    },
  },

  // ========================
  // API Configuration
  // ========================
  api: {
    version: 'v1',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
    },
    pagination: {
      defaultLimit: 50,
      maxLimit: 1000,
    },
    timeout: 30000, // 30 seconds
  },

  // ========================
  // Authentication Configuration
  // ========================
  auth: {
    // JWT
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: '7d',
      refreshExpiresIn: '30d',
    },

    // Password
    password: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },

    // Session
    session: {
      maxSessions: 5,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
    },
  },

  // ========================
  // Permissions Configuration
  // ========================
  permissions: {
    roles: {
      admin: ['create', 'read', 'update', 'delete', 'share', 'admin'],
      supervisor: ['create', 'read', 'update', 'share'],
      operator: ['read', 'update'],
      viewer: ['read'],
    },

    resources: {
      branches: ['admin'],
      cameras: ['admin', 'supervisor'],
      recordings: ['admin', 'supervisor', 'operator'],
      reports: ['admin', 'supervisor'],
      users: ['admin'],
    },
  },

  // ========================
  // Notification Configuration
  // ========================
  notifications: {
    email: {
      enabled: process.env.SMTP_ENABLED === 'true',
      provider: 'sendgrid', // sendgrid, mailgun, smtp
      from: process.env.NOTIFICATION_EMAIL,
      templates: {
        motionAlert: 'motion-detected',
        connectionError: 'camera-offline',
        storageWarning: 'storage-low',
        uploadSuccess: 'upload-completed',
      },
    },

    push: {
      enabled: true,
      provider: 'fcm', // Firebase Cloud Messaging
      retries: 3,
    },

    sms: {
      enabled: process.env.SMS_ENABLED === 'true',
      provider: 'twilio',
      maxCharsPerMessage: 160,
    },
  },

  // ========================
  // Logging Configuration
  // ========================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    files: {
      enabled: true,
      directory: './logs',
      maxSize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 10,
    },

    logEvents: {
      connectionErrors: true,
      motionDetections: true,
      uploads: true,
      accessLog: true,
      errorLog: true,
    },
  },

  // ========================
  // Monitoring & Analytics
  // ========================
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 1 minute

    // System metrics
    trackCpuUsage: true,
    trackMemoryUsage: true,
    trackDiskUsage: true,

    // Business metrics
    trackUptime: true,
    trackUploadTimes: true,
    trackStreamQuality: true,

    // Providers
    providers: {
      prometheus: {
        enabled: false,
        port: 9090,
      },
      datadog: {
        enabled: false,
        apiKey: process.env.DATADOG_API_KEY,
      },
      sentry: {
        enabled: false,
        dsn: process.env.SENTRY_DSN,
      },
    },
  },

  // ========================
  // Feature Flags
  // ========================
  features: {
    // Video
    liveStreaming: true,
    videoPlayback: true,
    videoDownload: true,
    videoClipping: false,

    // Motion Detection
    motionDetection: true,
    motionTracking: false,
    objectDetection: false,

    // Storage
    localStorage: true,
    awsS3: process.env.AWS_ACCESS_KEY_ID ? true : false,
    googleCloud: process.env.GOOGLE_PROJECT_ID ? true : false,

    // Advanced
    analytics: true,
    reports: true,
    webhooks: false,
    api: true,
  },

  // ========================
  // Development Configuration
  // ========================
  development: {
    mockCameras: process.env.NODE_ENV === 'development',
    mockHikvision: false,
    apiDebugLogging: true,
    skipMotionDetection: false,
  },
};
