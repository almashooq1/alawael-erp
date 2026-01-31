import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware باستخدام Helmet
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // للتطوير فقط
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.example.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // Cross Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // قد تحتاج لتعطيله حسب الحاجة

  // Cross Origin Resource Policy
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },

  // Frameguard
  frameguard: { action: 'deny' },

  // Hide Powered By
  hidePoweredBy: true,

  // HSTS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // IE No Open
  ieNoOpen: true,

  // No Sniff
  noSniff: true,

  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // XSS Filter
  xssFilter: true,
});

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const whitelist = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://yourdomain.com',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // السماح بالطلبات بدون origin (مثل mobile apps أو Postman)
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
};

/**
 * Sanitize user input لمنع XSS
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // إزالة HTML tags و JavaScript
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }

    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }

  if (req.query) {
    req.query = sanitize(req.query);
  }

  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

/**
 * منع SQL Injection (للـ NoSQL أيضاً)
 */
export const preventInjection = (req: Request, res: Response, next: NextFunction) => {
  const checkInjection = (obj: any): boolean => {
    if (typeof obj === 'string') {
      const injectionPatterns = [
        /(\$gt|\$lt|\$gte|\$lte|\$ne|\$in|\$nin|\$or|\$and)/i, // MongoDB operators
        /(union|select|insert|update|delete|drop|create|alter|exec|script)/i, // SQL keywords
        /[;<>]/g, // خطير في contexts معينة
      ];

      return injectionPatterns.some(pattern => pattern.test(obj));
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (checkInjection(key) || checkInjection(obj[key])) {
          return true;
        }
      }
    }

    return false;
  };

  if (checkInjection(req.body) || checkInjection(req.query) || checkInjection(req.params)) {
    return res.status(400).json({
      error: 'Invalid input detected',
      message: 'Your request contains potentially malicious content.',
    });
  }

  next();
};

/**
 * File upload security
 */
export const fileUploadSecurity = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5, // حد أقصى 5 ملفات
  },

  fileFilter: (req: Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error('Invalid file type'), false);
    }
  },
};

export default {
  securityHeaders,
  corsOptions,
  sanitizeInput,
  preventInjection,
  fileUploadSecurity,
};
