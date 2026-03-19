/**
 * Application Constants
 */

// API endpoints
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
export const API_TIMEOUT = process.env.REACT_APP_API_TIMEOUT || 10000;

// Portal types
export const PORTAL_TYPES = {
  BENEFICIARY: 'beneficiary',
  GUARDIAN: 'guardian',
};

// User roles
export const USER_ROLES = {
  STUDENT: 'student',
  PARENT: 'parent',
  TEACHER: 'teacher',
  ADMIN: 'admin',
};

// Grade scale
export const GRADE_SCALE = {
  A: { min: 90, label: 'Excellent' },
  B: { min: 80, label: 'Good' },
  C: { min: 70, label: 'Satisfactory' },
  D: { min: 60, label: 'Fair' },
  F: { min: 0, label: 'Fail' },
};

// Attendance status
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
};

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

// Notification types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

// Message status
export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  ARCHIVED: 'archived',
};

// Date formats
export const DATE_FORMATS = {
  SHORT: 'DD/MM/YYYY',
  LONG: 'DD MMMM YYYY',
  TIME: 'HH:mm',
  DATETIME: 'DD/MM/YYYY HH:mm',
  ISO: 'YYYY-MM-DD',
};

// Language codes
export const LANGUAGES = {
  EN: 'en',
  AR: 'ar',
};

// Color palette
export const COLORS = {
  PRIMARY: '#667eea',
  SECONDARY: '#764ba2',
  SUCCESS: '#48bb78',
  WARNING: '#ed8936',
  ERROR: '#f56565',
  INFO: '#4299e1',
  LIGHT_GRAY: '#f7fafc',
  DARK_GRAY: '#2d3748',
};

// Chart colors
export const CHART_COLORS = [
  '#667eea',
  '#764ba2',
  '#48bb78',
  '#ed8936',
  '#f56565',
  '#4299e1',
  '#38a169',
  '#dd6b20',
];

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  LIMITS: [10, 25, 50, 100],
};

// File upload constraints
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
  ],
};

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_PORTAL: 'userPortal',
  USER_DATA: 'user',
  LANGUAGE: 'language',
  THEME: 'theme',
  REMEMBERED_EMAIL: 'rememberedEmail',
  REMEMBERED_PORTAL: 'rememberedPortal',
};

// API response codes
export const API_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
};

// Cache durations (in milliseconds)
export const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 24 * 60 * 60 * 1000, // 24 hours
};

// Regular expressions
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  URL: /^https?:\/\/.+/,
  ARABIC: /[\u0600-\u06FF]/,
};

// Animation durations (in milliseconds)
export const ANIMATION_DURATION = {
  QUICK: 200,
  STANDARD: 300,
  SLOW: 500,
};

// Breakpoints (Material-UI)
export const BREAKPOINTS = {
  XS: 0,
  SM: 600,
  MD: 960,
  LG: 1280,
  XL: 1920,
};

export default {
  API_BASE_URL,
  API_TIMEOUT,
  PORTAL_TYPES,
  USER_ROLES,
  GRADE_SCALE,
  ATTENDANCE_STATUS,
  PAYMENT_STATUS,
  NOTIFICATION_TYPES,
  MESSAGE_STATUS,
  DATE_FORMATS,
  LANGUAGES,
  COLORS,
  CHART_COLORS,
  PAGINATION,
  FILE_UPLOAD,
  STORAGE_KEYS,
  API_CODES,
  CACHE_DURATION,
  REGEX,
  ANIMATION_DURATION,
  BREAKPOINTS,
};
