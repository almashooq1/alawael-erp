const helmet = require('helmet');

/**
 * Security headers configuration using Helmet
 * Protects against common web vulnerabilities
 */
const securityHeaders = helmet({
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
    },
  },

  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },

  // Expect-CT
  expectCt: {
    maxAge: 86400,
    enforce: true,
  },

  // Frame Guard (X-Frame-Options)
  frameguard: {
    action: 'deny',
  },

  // Hide Powered By
  hidePoweredBy: true,

  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

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

module.exports = securityHeaders;
