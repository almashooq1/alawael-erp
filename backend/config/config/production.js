/**
 * Production Environment Configuration
 * Environment-specific settings and deployment config
 * Phase 11: System Integration
 */

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

const config = {
  // Server Configuration
  server: {
    host: process.env.SERVER_HOST || '0.0.0.0',
    port: process.env.PORT || 3001,
    environment: env,
    isProduction,
    https: isProduction && process.env.USE_HTTPS === 'true',
  },

  // Database Configuration
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_db',
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: isProduction,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: isProduction ? 30000 : 16000,  // FIXED: Longer timeout for reliability
      socketTimeoutMS: 45000,
      maxPoolSize: isProduction ? 20 : 10,
      minPoolSize: isProduction ? 10 : 5,
      family: 4,  // Use IPv4
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retryStrategy: times => Math.min(times * 50, 2000),
    },
  },

  // Cache Configuration
  cache: {
    ttl: isProduction ? 3600 : 600,
    maxSize: isProduction ? 10000 : 1000,
    enabled: isProduction || process.env.ENABLE_CACHE === 'true',
  },

  // API Configuration
  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: isProduction ? 100 : 1000,
    },
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
    timeout: isProduction ? 30000 : 5000,
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtExpiry: process.env.JWT_EXPIRY || '24h',
    bcryptRounds: isProduction ? 12 : 10,
    helmet: {
      contentSecurityPolicy: isProduction,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: isProduction,
        preload: isProduction,
      },
    },
  },

  // Logging Configuration
  logging: {
    level: isProduction ? 'warn' : 'debug',
    format: isProduction ? 'json' : 'pretty',
    filePath: process.env.LOG_PATH || 'logs/app.log',
    maxSize: '10m',
    maxFiles: '30d',
  },

  // Analytics Configuration
  analytics: {
    enabled: isProduction || process.env.ENABLE_ANALYTICS === 'true',
    sampleRate: isProduction ? 0.1 : 1.0,
    metricsInterval: 60000,
  },

  // Performance Configuration
  performance: {
    compression: {
      enabled: true,
      threshold: isProduction ? 1024 : 0,
      level: isProduction ? 6 : 1,
    },
    clustering: {
      enabled: isProduction,
      workers: process.env.CLUSTER_WORKERS || require('os').cpus().length,
    },
  },

  // Feature Flags
  features: {
    searchEngine: true,
    validation: true,
    responseFormatter: true,
    analytics: true,
    monitoring: isProduction,
    clustering: isProduction,
    caching: true,
    rateLimiting: true,
    cors: true,
  },

  // External Services
  externalServices: {
    elasticsearch: {
      host: process.env.ELASTICSEARCH_HOST || 'localhost:9200',
      enabled: process.env.ENABLE_ELASTICSEARCH === 'true',
    },
    sentry: {
      dsn: process.env.SENTRY_DSN,
      enabled: isProduction && !!process.env.SENTRY_DSN,
    },
    datadog: {
      apiKey: process.env.DATADOG_API_KEY,
      enabled: isProduction && !!process.env.DATADOG_API_KEY,
    },
  },

  // Deployment Configuration
  deployment: {
    provider: process.env.DEPLOYMENT_PROVIDER || 'local',
    environment: process.env.DEPLOYMENT_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    buildId: process.env.BUILD_ID || 'local-build',
  },
};

/**
 * Get environment-specific config
 */
const getConfig = () => config;

/**
 * Validate configuration
 */
const validateConfig = () => {
  const required = ['server.port', 'database.mongodb.uri'];

  for (const key of required) {
    const [section, subsection, param] = key.split('.');
    const value = config[section]?.[subsection]?.[param] || config[section]?.[subsection];

    if (!value && isProduction) {
      throw new Error(`Required config missing: ${key}`);
    }
  }

  return true;
};

module.exports = {
  config,
  getConfig,
  validateConfig,
  isProduction,
  env,
};
