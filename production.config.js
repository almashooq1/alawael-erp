/**
 * Production Configuration
 * إعدادات بيئة الإنتاج الشاملة
 */

const dotenv = require('dotenv');
const path = require('path');

// تحميل المتغيرات
dotenv.config({ path: path.join(__dirname, '.env.production') });

module.exports = {
  // Server Config
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: 'production',
    trustProxy: true,
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['https://yourdomain.com', 'https://www.yourdomain.com'],
  },

  // Database Config
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/app',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      retryReads: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    },
  },

  // JWT Config
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key',
    expiresIn: '7d',
    refreshExpiresIn: '30d',
    algorithm: 'HS256',
  },

  // Logging Config
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    transport: {
      file: {
        filename: 'logs/app.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        compress: true,
      },
      error: {
        filename: 'logs/error.log',
        maxsize: 5242880,
        maxFiles: 5,
        compress: true,
      },
      combined: {
        filename: 'logs/combined.log',
        maxsize: 5242880,
        maxFiles: 5,
        compress: true,
      },
    },
  },

  // Cache Config
  cache: {
    enabled: true,
    type: 'redis', // or 'memory'
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: 0,
      ttl: 3600, // 1 hour
    },
    memory: {
      max: 100,
      maxSize: 50000000, // 50MB
    },
  },

  // Security Config
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
    },
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
  },

  // CDN Config
  cdn: {
    enabled: process.env.CDN_ENABLED === 'true',
    provider: process.env.CDN_PROVIDER || 'cloudflare', // cloudflare, aws-cloudfront, fastly
    cloudflare: {
      zoneId: process.env.CLOUDFLARE_ZONE_ID,
      apiKey: process.env.CLOUDFLARE_API_KEY,
      domain: process.env.CLOUDFLARE_DOMAIN,
    },
    awsCloudFront: {
      distributionId: process.env.AWS_CLOUDFRONT_DIST_ID,
      region: process.env.AWS_REGION || 'us-east-1',
    },
    imageOptimization: {
      enabled: true,
      sizes: [320, 640, 1024, 1920],
      formats: ['webp', 'avif', 'jpg'],
    },
  },

  // HTTPS Config
  https: {
    enabled: process.env.HTTPS_ENABLED !== 'false',
    certPath: process.env.SSL_CERT_PATH || '/etc/ssl/certs/server.crt',
    keyPath: process.env.SSL_KEY_PATH || '/etc/ssl/private/server.key',
    caPath: process.env.SSL_CA_PATH,
    ciphers: 'ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384',
  },

  // Email Config
  email: {
    provider: process.env.EMAIL_PROVIDER || 'sendgrid', // sendgrid, mailgun, smtp
    from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
    },
    mailgun: {
      domain: process.env.MAILGUN_DOMAIN,
      apiKey: process.env.MAILGUN_API_KEY,
    },
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
  },

  // Storage Config
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // local, s3, gcs
    local: {
      path: process.env.UPLOAD_PATH || './uploads',
      maxFileSize: 100 * 1024 * 1024, // 100MB
    },
    s3: {
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      cdnUrl: process.env.AWS_S3_CDN_URL,
    },
    gcs: {
      projectId: process.env.GCS_PROJECT_ID,
      keyFilename: process.env.GCS_KEY_FILE,
      bucket: process.env.GCS_BUCKET,
    },
  },

  // Monitoring Config
  monitoring: {
    enabled: true,
    sentry: {
      enabled: process.env.SENTRY_ENABLED === 'true',
      dsn: process.env.SENTRY_DSN,
      environment: 'production',
      tracesSampleRate: 0.1,
    },
    datadog: {
      enabled: process.env.DATADOG_ENABLED === 'true',
      apiKey: process.env.DATADOG_API_KEY,
      appKey: process.env.DATADOG_APP_KEY,
      site: process.env.DATADOG_SITE || 'datadoghq.com',
    },
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED === 'true',
      port: 9090,
    },
  },

  // Analytics Config
  analytics: {
    google: {
      enabled: process.env.GOOGLE_ANALYTICS_ENABLED === 'true',
      trackingId: process.env.GOOGLE_ANALYTICS_ID,
    },
    mixpanel: {
      enabled: process.env.MIXPANEL_ENABLED === 'true',
      token: process.env.MIXPANEL_TOKEN,
    },
  },

  // Performance Config
  performance: {
    enableCompression: true,
    enableCaching: true,
    enableMinification: true,
    enableCodeSplitting: true,
    preloadAssets: true,
  },
};
