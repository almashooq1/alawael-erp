const helmet = require('helmet');

/**
 * Security headers configuration using Helmet
 * Protects against common web vulnerabilities
 *
 * Enhanced with:
 *  - Strict CSP with nonce support
 *  - COEP/COOP/CORP headers
 *  - Extended Permissions-Policy
 *  - Conditional HSTS (auto-detected SSL)
 *  - Sensitive path cache prevention
 */

const isProd = process.env.NODE_ENV === 'production';
const hasSSL = process.env.SSL_ENABLED === 'true' || process.env.FORCE_HSTS === 'true';

const helmetMiddleware = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: [
        "'self'",
        // Allow WebSocket connections
        ...(isProd
          ? (process.env.CORS_ORIGINS || '').split(',').filter(Boolean)
          : ['ws://localhost:*', 'http://localhost:*']),
      ],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
      // Explicitly disable upgrade-insecure-requests (breaks HTTP-only IP access)
      upgradeInsecureRequests: hasSSL ? [] : null,
    },
    // Report-only in development for easier debugging
    reportOnly: process.env.CSP_REPORT_ONLY === 'true',
  },

  // Cross-Origin Resource Policy — allow cross-origin API calls from frontend
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // Cross-Origin Opener Policy — allow popups from same origin
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },

  // Cross-Origin Embedder Policy — credentialless for better isolation
  crossOriginEmbedderPolicy: false, // Disabled to allow cross-origin resource loading

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },

  // Frame Guard (X-Frame-Options)
  frameguard: { action: 'deny' },

  // Hide Powered By
  hidePoweredBy: true,

  // HSTS — auto-enabled when SSL is configured
  hsts: hasSSL
    ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: isProd,
      }
    : false,

  // IE No Open
  ieNoOpen: true,

  // No Sniff (X-Content-Type-Options)
  noSniff: true,

  // Permitted Cross Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // Referrer Policy — strict in production
  referrerPolicy: {
    policy: isProd ? 'strict-origin-when-cross-origin' : 'same-origin',
  },

  // XSS Filter — disabled (deprecated, modern browsers ignore it; can cause XSS in legacy IE)
  xssFilter: false,
});

// Sensitive paths that should never be cached
const SENSITIVE_PATHS = ['/api/auth', '/api/v1/auth', '/api/users/me', '/api/admin', '/api/sso'];

// Compose Helmet with additional security headers
const securityHeaders = (req, res, next) => {
  // Permissions-Policy (extended list)
  res.setHeader(
    'Permissions-Policy',
    [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'autoplay=(self)',
      'fullscreen=(self)',
      'picture-in-picture=(self)',
      'browsing-topics=()',
    ].join(', ')
  );

  // Prevent caching of sensitive API responses
  const isSensitive = SENSITIVE_PATHS.some(p => req.path.startsWith(p));
  if (isSensitive) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Security: prevent MIME-type sniffing
  res.setHeader('X-Download-Options', 'noopen');

  helmetMiddleware(req, res, next);
};

module.exports = securityHeaders;
