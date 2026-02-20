/**
 * Error Handler Utility - معالج الأخطاء الشاملة
 */

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async Handler - لفافة لمعالجة الأخطاء في المسارات غير المتزامنة
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global Error Middleware
 */
const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // خطأ MongoDB - معرّف غير صالح
  if (err.name === 'CastError') {
    const message = `المورد غير موجود. معرّف غير صالح: ${err.value}`;
    err = new AppError(message, 400);
  }

  // خطأ MongoDB - مفتاح فريد مكرر
  if (err.code === 11000) {
    const message = `حقل مكرر: ${Object.keys(err.keyValue)}`;
    err = new AppError(message, 400);
  }

  // خطأ JWT - توكن غير صالح
  if (err.name === 'JsonWebTokenError') {
    const message = 'توكن غير صالح';
    err = new AppError(message, 400);
  }

  // خطأ JWT - توكن منتهي الصلاحية
  if (err.name === 'TokenExpiredError') {
    const message = 'توكن منتهي الصلاحية';
    err = new AppError(message, 401);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  AppError,
  asyncHandler,
  errorMiddleware
};
