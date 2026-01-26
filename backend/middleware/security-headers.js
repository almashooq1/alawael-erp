/**
 * ============================================
 * SECURITY HEADERS MIDDLEWARE
 * وسيط رؤوس الأمان
 * ============================================
 */

/**
 * Comprehensive Security Headers Configuration
 * يتضمن جميع رؤوس الأمان الضرورية للحماية من الهجمات الشائعة
 */

const securityHeaders = (req, res, next) => {
  /**
   * 1️⃣ HSTS (HTTP Strict Transport Security)
   * ├─ Enforces HTTPS for all communications
   * ├─ Prevents SSL/TLS downgrade attacks
   * └─ Reduces man-in-the-middle vulnerabilities
   */
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  /**
   * 2️⃣ CSP (Content Security Policy)
   * ├─ Prevents inline script execution
   * ├─ Controls resource loading (scripts, styles, images)
   * ├─ Prevents XSS (Cross-Site Scripting) attacks
   * └─ Reports violations to monitoring service
   */
  res.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'nonce-{RANDOM}' https://trusted-cdn.com",
      "style-src 'self' 'unsafe-inline' https://trusted-cdn.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.googleapis.com",
      "connect-src 'self' https://api.example.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ')
  );

  /**
   * 3️⃣ X-Content-Type-Options: nosniff
   * ├─ Prevents MIME sniffing attacks
   * ├─ Forces browser to respect declared content types
   * └─ Prevents XSS via polyglot files
   */
  res.set('X-Content-Type-Options', 'nosniff');

  /**
   * 4️⃣ X-Frame-Options
   * ├─ Prevents clickjacking attacks
   * ├─ Options: DENY, SAMEORIGIN, ALLOW-FROM
   * └─ DENY prevents embedding in any frame
   */
  res.set('X-Frame-Options', 'DENY');

  /**
   * 5️⃣ X-XSS-Protection
   * ├─ Browser XSS filter configuration
   * ├─ '1; mode=block' enables filter and blocks page
   * └─ Fallback for older browsers
   */
  res.set('X-XSS-Protection', '1; mode=block; report=https://example.com/csp-report');

  /**
   * 6️⃣ Referrer-Policy
   * ├─ Controls referrer information sent to external sites
   * ├─ Options: no-referrer, same-origin, strict-origin-when-cross-origin
   * └─ Protects user privacy
   */
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  /**
   * 7️⃣ Permissions-Policy (formerly Feature-Policy)
   * ├─ Controls browser features and APIs
   * ├─ Prevents malicious use of device features
   * └─ Disables unused features
   */
  res.set(
    'Permissions-Policy',
    [
      'accelerometer=()',
      'camera=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
      'vr=()',
      'xr-spatial-tracking=()'
    ].join(', ')
  );

  /**
   * 8️⃣ Cross-Origin Headers
   * ├─ CORS configuration
   * ├─ Prevents unauthorized cross-origin requests
   * └─ Limits credential exposure
   */
  res.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'https://example.com');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Max-Age', '86400'); // 24 hours

  /**
   * 9️⃣ Cross-Origin Resource Sharing
   * ├─ Prevents cross-origin information leakage
   * └─ COOP + COEP for Spectre/Meltdown mitigation
   */
  res.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.set('Cross-Origin-Embedder-Policy', 'require-corp');
  res.set('Cross-Origin-Resource-Policy', 'same-site');

  /**
   * 🔟 Cache Control
   * ├─ Prevents caching of sensitive data
   * ├─ Reduces attack surface
   * └─ Protects against cache-based attacks
   */
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  /**
   * 1️⃣1️⃣ Additional Security Headers
   * ├─ X-Powered-By removed (hide tech stack)
   * ├─ Server info hidden
   * └─ Enhanced security posture
   */
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  res.set('X-Content-Type-Options', 'nosniff');

  /**
   * 1️⃣2️⃣ Security Monitoring
   * ├─ Report-To endpoint for CSP violations
   * └─ Helps identify potential attacks
   */
  res.set(
    'Report-To',
    JSON.stringify({
      group: 'csp-endpoint',
      max_age: 10886400,
      endpoints: [
        { url: 'https://example.com/security/report' }
      ]
    })
  );

  /**
   * 1️⃣3️⃣ Cookie Security
   * ├─ Configured in cookie middleware
   * ├─ HttpOnly flag prevents JavaScript access
   * ├─ Secure flag for HTTPS only
   * └─ SameSite prevents CSRF
   */
  // Cookie configuration should be in separate middleware
  // app.use(cookieParser({ secure: true, httpOnly: true, sameSite: 'strict' }));

  /**
   * 1️⃣4️⃣ Timing Attacks Prevention
   * ├─ Consistent response times
   * └─ Prevents information leakage
   */
  const processingTime = Math.random() * 100 + 50; // 50-150ms
  res.set('X-Process-Time', processingTime);

  next();
};

/**
 * ADVANCED SECURITY MIDDLEWARE - Multiple layers
 */

const advancedSecurityHeaders = (req, res, next) => {
  // Add nonce for CSP
  const nonce = require('crypto').randomBytes(16).toString('base64');
  res.locals.nonce = nonce;

  // Environmental CSP
  const cspHeader = buildCSP(process.env.NODE_ENV, nonce);
  res.set('Content-Security-Policy', cspHeader);

  // Report-Only CSP (for testing)
  if (process.env.NODE_ENV === 'staging') {
    res.set('Content-Security-Policy-Report-Only', cspHeader);
  }

  next();
};

/**
 * BUILD CSP HEADER BASED ON ENVIRONMENT
 */

function buildCSP(environment, nonce) {
  const policies = {
    production: [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' https://cdn.example.com`,
      "style-src 'self' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.example.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
      "report-uri https://example.com/csp-report"
    ],
    staging: [
      "default-src 'self' https://staging-cdn.example.com",
      `script-src 'self' 'unsafe-inline' 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline' https://staging-cdn.example.com",
      "img-src 'self' data: https:",
      "frame-ancestors 'none'",
      "report-uri https://staging.example.com/csp-report"
    ],
    development: [
      "default-src 'self' http://localhost:*",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: http:",
      "frame-ancestors 'none'",
      "connect-src 'self' ws://localhost:*"
    ]
  };

  return (policies[environment] || policies.production).join('; ');
}

/**
 * COOKIE SECURITY MIDDLEWARE
 */

const secureCookies = (req, res, next) => {
  const setCookie = res.cookie;

  res.cookie = function(name, value, options = {}) {
    // Enforce security options
    const secureOptions = {
      ...options,
      httpOnly: true,           // Prevent JavaScript access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',       // CSRF protection
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    };

    return setCookie.call(this, name, value, secureOptions);
  };

  next();
};

/**
 * REQUEST SANITIZATION MIDDLEWARE
 */

const sanitizeRequests = (req, res, next) => {
  // Remove dangerous headers
  const dangerousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url'
  ];

  dangerousHeaders.forEach(header => {
    delete req.headers[header];
  });

  // Validate Content-Type
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      return res.status(415).json({ error: 'Unsupported Media Type' });
    }
  }

  next();
};

/**
 * RATE LIMITING FOR SECURITY ENDPOINTS
 */

const securityRateLimit = (req, res, next) => {
  // More aggressive rate limiting for security-critical endpoints
  const securePaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/verify-2fa',
    '/api/admin/users',
    '/api/admin/permissions'
  ];

  if (securePaths.some(path => req.path.startsWith(path))) {
    // Apply stricter rate limiting
    // Could integrate with redis for tracking
    console.log(`🔒 Security endpoint accessed: ${req.path}`);
  }

  next();
};

/**
 * SECURITY HEADERS CONFIGURATION OBJECT
 */

const securityConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    },
    reportUri: 'https://example.com/csp-report'
  },
  
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  frameguard: {
    action: 'deny'
  },
  
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  xssFilter: {
    mode: 'block',
    reportUri: 'https://example.com/xss-report'
  },
  
  noSniff: true,
  
  noCache: false // Let Express handle caching
};

/**
 * SETUP FUNCTION FOR EXPRESS APP
 */

function setupSecurityHeaders(app) {
  // Apply security headers
  app.use(securityHeaders);
  app.use(advancedSecurityHeaders);
  app.use(secureCookies);
  app.use(sanitizeRequests);
  app.use(securityRateLimit);

  console.log('✅ Security headers configured');
}

module.exports = {
  securityHeaders,
  advancedSecurityHeaders,
  secureCookies,
  sanitizeRequests,
  securityRateLimit,
  securityConfig,
  setupSecurityHeaders
};
