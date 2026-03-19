/* eslint-disable no-unused-vars */
/**
 * تكوين Express - الإعدادات الأساسية
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const createApp = () => {
  const app = express();

  // ========================================
  // Helmet للأمان
  // ========================================
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // ========================================
  // CORS
  // ========================================
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // ========================================
  // ضغط الاستجابات
  // ========================================
  app.use(compression());

  // ========================================
  // تحليل JSON
  // ========================================
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  return app;
};

// ========================================
// Rate Limiter
// ========================================
const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: options.max || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: options.message || { error: 'طلبات كثيرة جداً، يرجى المحاولة لاحقاً' },
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
};

// ========================================
// المسارات الثابتة
// ========================================
const setupStaticRoutes = app => {
  // الملفات الثابتة
  if (process.env.STATIC_FOLDER) {
    app.use(express.static(process.env.STATIC_FOLDER));
  }

  // تحميل الملفات
  if (process.env.UPLOADS_FOLDER) {
    app.use('/uploads', express.static(process.env.UPLOADS_FOLDER));
  }
};

module.exports = {
  createApp,
  createRateLimiter,
  setupStaticRoutes,
};
