const helmet = require('helmet');

/**
 * Security headers configuration using Helmet
 * Protects against common web vulnerabilities
 */
const helmetMiddleware = helmet({
  // Content Security Policy
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
      // Explicitly disable upgrade-insecure-requests (breaks HTTP-only IP access)
      upgradeInsecureRequests: null,
    },
  },

  // Cross-Origin Resource Policy — allow cross-origin API calls from frontend
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // Cross-Origin Opener Policy — allow popups from same origin
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },

  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },

  // Frame Guard (X-Frame-Options)
  frameguard: {
    action: 'deny',
  },

  // Hide Powered By
  hidePoweredBy: true,

  // HSTS — disabled: site is accessed via HTTP on bare IP with self-signed cert.
  // Enable only when a real TLS certificate is deployed.
  hsts: false,

  // IE No Open
  ieNoOpen: true,

  // No Sniff (X-Content-Type-Options)
  noSniff: true,

  // Permitted Cross Domain Policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },

  // Referrer Policy
  referrerPolicy: {
    policy: 'same-origin',
  },

  // XSS Filter
  xssFilter: true,
});

// Compose Helmet with additional security headers
const securityHeaders = (req, res, next) => {
  // Permissions-Policy (not natively covered by Helmet)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  );

  // Prevent caching of sensitive API responses
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/v1/auth')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }

  helmetMiddleware(req, res, next);
};

module.exports = securityHeaders;
