/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Centralized Error Codes — رموز الأخطاء الموحّدة
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Machine-readable error codes for the entire application.
 * Clients can match on `code` to show localised messages or handle
 * specific error types without relying on message strings.
 *
 * Usage:
 *   const { ERROR_CODES } = require('../errors/errorCodes');
 *   throw new AppError('...', 400, ERROR_CODES.INVALID_INPUT);
 */

'use strict';

const ERROR_CODES = Object.freeze({
  // ─── Generic HTTP ──────────────────────────────────────────────────
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_GATEWAY: 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // ─── Authentication & Authorization ────────────────────────────────
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  MFA_REQUIRED: 'MFA_REQUIRED',
  MFA_INVALID: 'MFA_INVALID',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // ─── Validation ────────────────────────────────────────────────────
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_OBJECT_ID: 'INVALID_OBJECT_ID',
  FIELD_REQUIRED: 'FIELD_REQUIRED',
  FIELD_TOO_SHORT: 'FIELD_TOO_SHORT',
  FIELD_TOO_LONG: 'FIELD_TOO_LONG',
  PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',

  // ─── User / Employee ──────────────────────────────────────────────
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',

  // ─── Finance ──────────────────────────────────────────────────────
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INVOICE_NOT_FOUND: 'INVOICE_NOT_FOUND',
  DUPLICATE_TRANSACTION: 'DUPLICATE_TRANSACTION',

  // ─── Beneficiary / Student ────────────────────────────────────────
  BENEFICIARY_NOT_FOUND: 'BENEFICIARY_NOT_FOUND',
  ENROLLMENT_CONFLICT: 'ENROLLMENT_CONFLICT',

  // ─── Attendance / Session ─────────────────────────────────────────
  ATTENDANCE_ALREADY_RECORDED: 'ATTENDANCE_ALREADY_RECORDED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_FULL: 'SESSION_FULL',
  SESSION_OVERLAP: 'SESSION_OVERLAP',

  // ─── Document ─────────────────────────────────────────────────────
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',

  // ─── Infrastructure ───────────────────────────────────────────────
  DATABASE_ERROR: 'DATABASE_ERROR',
  REDIS_ERROR: 'REDIS_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT: 'TIMEOUT',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
});

module.exports = { ERROR_CODES };
