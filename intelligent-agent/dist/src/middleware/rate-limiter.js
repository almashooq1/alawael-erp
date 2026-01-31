"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserLimiter = exports.uploadLimiter = exports.strictLimiter = exports.authLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("../modules/logger");
const logger = logger_1.Logger.getInstance();
/**
 * Rate limiter عام للـ API
 */
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100, // حد أقصى 100 طلب لكل IP
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
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
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 5, // حد أقصى 5 محاولات تسجيل دخول
    skipSuccessfulRequests: true, // لا تحسب المحاولات الناجحة
    message: {
        error: 'Too many login attempts, please try again later.',
        retryAfter: '15 minutes',
    },
    handler: (req, res) => {
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
exports.strictLimiter = (0, express_rate_limit_1.default)({
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
exports.uploadLimiter = (0, express_rate_limit_1.default)({
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
const createUserLimiter = (maxRequests, windowMinutes = 15) => {
    return (0, express_rate_limit_1.default)({
        windowMs: windowMinutes * 60 * 1000,
        max: maxRequests,
        keyGenerator: (req) => {
            // استخدام user ID إذا كان مسجلاً، وإلا IP
            return req.user?.id || req.ip || 'unknown';
        },
    });
};
exports.createUserLimiter = createUserLimiter;
exports.default = {
    generalLimiter: exports.generalLimiter,
    authLimiter: exports.authLimiter,
    strictLimiter: exports.strictLimiter,
    uploadLimiter: exports.uploadLimiter,
    createUserLimiter: exports.createUserLimiter,
};
