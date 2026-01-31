import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { Logger } from '../modules/logger';

const logger = Logger.getInstance();

/**
 * Rate limiter عام للـ API
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // حد أقصى 100 طلب لكل IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
    });
  },
});

/**
 * Rate limiter للـ authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // حد أقصى 5 محاولات تسجيل دخول
  skipSuccessfulRequests: true, // لا تحسب المحاولات الناجحة
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes',
  },
  handler: (req: Request, res: Response) => {
    logger.error('Authentication rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      username: req.body?.username || req.body?.email,
    });
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Your account has been temporarily locked. Please try again in 15 minutes.',
    });
  },
});

/**
 * Rate limiter للـ API الحساسة
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ساعة
  max: 10, // حد أقصى 10 طلبات
  message: {
    error: 'Too many requests to sensitive endpoint',
    retryAfter: '1 hour',
  },
});

/**
 * Rate limiter للـ file uploads
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 دقيقة
  max: 5, // حد أقصى 5 ملفات في الدقيقة
  message: {
    error: 'Too many file uploads',
    retryAfter: '1 minute',
  },
});

/**
 * Dynamic rate limiter حسب المستخدم
 */
export const createUserLimiter = (maxRequests: number, windowMinutes: number = 15) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    keyGenerator: (req: Request) => {
      // استخدام user ID إذا كان مسجلاً، وإلا IP
      return (req as any).user?.id || req.ip || 'unknown';
    },
  });
};

export default {
  generalLimiter,
  authLimiter,
  strictLimiter,
  uploadLimiter,
  createUserLimiter,
};
