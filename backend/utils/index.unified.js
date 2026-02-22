/**
 * 🛠️ Unified Utils - الأدوات المساعدة الموحدة
 * @version 2.0.0
 */

// ============================================
// التشفير - Encryption
// ============================================

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

const hashString = (str, algorithm = 'sha256') => {
  return crypto.createHash(algorithm).update(str).digest('hex');
};

// ============================================
// JWT - JSON Web Token
// ============================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const signToken = (payload, expiresIn = JWT_EXPIRES_IN) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

// ============================================
// التحقق - Validation
// ============================================

const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const isValidPhone = (phone) => {
  const regex = /^(\+966|0)?5\d{8}$/;
  return regex.test(phone.replace(/\s/g, ''));
};

const isValidPassword = (password) => {
  // على الأقل 8 أحرف، حرف كبير، حرف صغير، رقم
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .trim();
};

// ============================================
// التاريخ - Date Utils
// ============================================

const formatDate = (date, format = 'YYYY-MM-DD') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
  if (format === 'ar') return d.toLocaleDateString('ar-SA');

  return d.toISOString();
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getDaysDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const isWeekend = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  // في السعودية: الجمعة (5) والسبت (6)
  return day === 5 || day === 6;
};

// ============================================
// الاستجابة - Response Utils
// ============================================

const successResponse = (res, data, message = 'تم بنجاح', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date()
  });
};

const errorResponse = (res, message = 'حدث خطأ', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    timestamp: new Date()
  });
};

const paginatedResponse = (res, data, page, limit, total) => {
  return res.json({
    success: true,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
};

// ============================================
// الترقيم - Pagination
// ============================================

const getPaginationParams = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// ============================================
// التصفية - Filtering
// ============================================

const buildFilter = (query, allowedFields) => {
  const filter = {};

  for (const field of allowedFields) {
    if (query[field] !== undefined) {
      filter[field] = query[field];
    }
  }

  return filter;
};

// ============================================
// الترتيب - Sorting
// ============================================

const buildSort = (query, defaultSort = '-createdAt') => {
  const sortBy = query.sortBy || query.sort || defaultSort;

  if (sortBy.startsWith('-')) {
    return { [sortBy.slice(1)]: -1 };
  }

  return { [sortBy]: 1 };
};

// ============================================
// التسجيل - Logging
// ============================================

const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
  },
  error: (message, error = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  },
  warn: (message, data = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data);
  },
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data);
    }
  }
};

// ============================================
// التحليل - Analytics
// ============================================

const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

const calculateTrend = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// ============================================
// التنسيق - Formatting
// ============================================

const formatCurrency = (amount, currency = 'SAR') => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency
  }).format(amount);
};

const formatNumber = (num) => {
  return new Intl.NumberFormat('ar-SA').format(num);
};

const formatPercentage = (value) => {
  return `${value}%`;
};

// ============================================
// تصدير
// ============================================

module.exports = {
  // التشفير
  hashPassword,
  comparePassword,
  generateToken,
  hashString,

  // JWT
  signToken,
  verifyToken,
  decodeToken,

  // التحقق
  isValidEmail,
  isValidPhone,
  isValidPassword,
  sanitizeInput,

  // التاريخ
  formatDate,
  addDays,
  getDaysDifference,
  isWeekend,

  // الاستجابة
  successResponse,
  errorResponse,
  paginatedResponse,

  // الترقيم والتصفية
  getPaginationParams,
  buildFilter,
  buildSort,

  // التسجيل
  logger,

  // التحليل
  calculatePercentage,
  calculateTrend,

  // التنسيق
  formatCurrency,
  formatNumber,
  formatPercentage
};
