/**
 * Database Module - Central Export - Al-Awael ERP
 * نقطة التصدير المركزية لوحدة قاعدة البيانات
 *
 * Usage:
 *   const db = require('./database');
 *   const { cacheService, TTL, validateNationalId, getNextNumber } = require('./database');
 */

'use strict';

// ── Plugins ────────────────────────────────────────────────────────
const {
  registerGlobalPlugins,
  timestampsPlugin,
  softDeletePlugin,
  paginationPlugin,
  toJSONPlugin,
  auditPlugin,
  branchPlugin,
  statusHistoryPlugin,
  searchablePlugin,
} = require('./plugins/mongoose-plugins');

// ── Counters ───────────────────────────────────────────────────────
const {
  getNextNumber,
  peekCurrent,
  resetCounter,
  initializeCounters,
  getAllCounters,
  checkAndResetCounters,
  autoNumberPlugin,
} = require('./utils/counter');

// ── Saudi Validators ───────────────────────────────────────────────
const {
  validateNationalId,
  validateIqama,
  validateIdNumber,
  validateSaudiPhone,
  validateSaudiIBAN,
  validateCRNumber,
  validateVATNumber,
  validatePostalCode,
  validateVehiclePlate,
  validateGOSINumber,
  validateEmail,
  validateAge,
  validatePassword,
  luhnCheck,
  mongooseValidators,
} = require('./validators/saudi-validators');

// ── Cache ──────────────────────────────────────────────────────────
const {
  cacheService,
  CacheService,
  cacheMiddleware,
  cacheResponse,
  TTL,
  PREFIX,
} = require('./cache/cache-service');

// ── Aggregation Pipelines ──────────────────────────────────────────
const {
  stages,
  beneficiaryPipelines,
  hrPipelines,
  financialPipelines,
  rehabPipelines,
  dashboardPipelines,
  buildPaginatedPipeline,
  flattenPaginationResult,
} = require('./aggregations/common-pipelines');

// ── Health ─────────────────────────────────────────────────────────
const { checkDatabaseHealth, dbHealthMiddleware } = require('./health/db-health');

// ══════════════════════════════════════════════════════════════════
// Namespace Exports (grouped by domain)
// ══════════════════════════════════════════════════════════════════

const plugins = {
  registerGlobalPlugins,
  timestamps: timestampsPlugin,
  softDelete: softDeletePlugin,
  pagination: paginationPlugin,
  toJSON: toJSONPlugin,
  audit: auditPlugin,
  branch: branchPlugin,
  statusHistory: statusHistoryPlugin,
  searchable: searchablePlugin,
  autoNumber: autoNumberPlugin,
};

const counters = {
  getNext: getNextNumber,
  peek: peekCurrent,
  reset: resetCounter,
  init: initializeCounters,
  getAll: getAllCounters,
  checkAndReset: checkAndResetCounters,
};

const validators = {
  nationalId: validateNationalId,
  iqama: validateIqama,
  idNumber: validateIdNumber,
  phone: validateSaudiPhone,
  iban: validateSaudiIBAN,
  crNumber: validateCRNumber,
  vatNumber: validateVATNumber,
  postalCode: validatePostalCode,
  vehiclePlate: validateVehiclePlate,
  gosiNumber: validateGOSINumber,
  email: validateEmail,
  age: validateAge,
  password: validatePassword,
  luhn: luhnCheck,
  mongoose: mongooseValidators,
};

const cache = {
  service: cacheService,
  CacheService,
  middleware: cacheMiddleware,
  response: cacheResponse,
  TTL,
  PREFIX,
};

const pipelines = {
  stages,
  beneficiary: beneficiaryPipelines,
  hr: hrPipelines,
  financial: financialPipelines,
  rehab: rehabPipelines,
  dashboard: dashboardPipelines,
  paginate: buildPaginatedPipeline,
  flatten: flattenPaginationResult,
};

const health = {
  check: checkDatabaseHealth,
  middleware: dbHealthMiddleware,
};

// ══════════════════════════════════════════════════════════════════
// Default Export (flat + namespaced)
// ══════════════════════════════════════════════════════════════════

module.exports = {
  // Namespaced
  plugins,
  counters,
  validators,
  cache,
  pipelines,
  health,

  // Flat exports (most commonly used)
  // Plugins
  registerGlobalPlugins,
  autoNumberPlugin,

  // Counters
  getNextNumber,
  initializeCounters,
  checkAndResetCounters,

  // Validators
  validateNationalId,
  validateIqama,
  validateIdNumber,
  validateSaudiPhone,
  validateSaudiIBAN,
  validateCRNumber,
  validateVATNumber,
  validatePostalCode,
  validateVehiclePlate,
  validateGOSINumber,
  validateEmail,
  validateAge,
  validatePassword,
  mongooseValidators,

  // Cache
  cacheService,
  cacheMiddleware,
  cacheResponse,
  TTL,
  PREFIX,

  // Pipelines
  buildPaginatedPipeline,
  flattenPaginationResult,
  beneficiaryPipelines,
  hrPipelines,
  financialPipelines,
  rehabPipelines,
  dashboardPipelines,

  // Health
  checkDatabaseHealth,
  dbHealthMiddleware,
};
