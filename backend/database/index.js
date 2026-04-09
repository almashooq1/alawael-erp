/**
 * Database Module - Central Export - Al-Awael ERP
 * نقطة التصدير المركزية لوحدة قاعدة البيانات الذكية
 *
 * Provides a unified API for all database operations:
 *  - Smart Query Builder    باني الاستعلامات الذكي
 *  - Transaction Manager    مدير المعاملات الآمنة
 *  - Event Bus (Change Streams)  ناقل الأحداث
 *  - Data Archiver          نظام الأرشفة
 *  - Field Encryption       تشفير الحقول
 *  - Migration Runner       نظام الهجرات
 *  - Query Cache            التخزين المؤقت للاستعلامات
 *  - Analytics & Monitoring  التحليلات والمراقبة
 *  - Schema Registry        سجل المخططات
 *  - Circuit Breaker        قاطع الدائرة
 *  - Smart Index Optimizer  محسّن الفهارس الذكي
 *  - Seeder Framework       إطار البذر
 *  - Connection Pool        مدير مجمع الاتصالات
 *  - Backup & Restore       النسخ الاحتياطي والاستعادة
 *  - Audit Trail            تتبع التغييرات والمراجعة
 *  - Multi-Tenant Isolator  عزل البيانات متعدد المستأجرين
 *  - Data Masking           إخفاء البيانات الديناميكي
 *  - Query Governor         حاكم موارد الاستعلامات
 *  - Referential Integrity  سلامة البيانات المرجعية
 *  - TTL Lifecycle Manager  مدير دورة حياة البيانات
 *  - Plugins, Validators, Cache, Pipelines, Health
 *
 * Usage:
 *   const db = require('./database');
 *   const { SmartQueryBuilder, withTransaction, cacheService } = require('./database');
 */

'use strict';

// ══════════════════════════════════════════════════════════════════
// 1. Core Plugins
// ══════════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════════
// 2. Counters (Auto-numbering)
// ══════════════════════════════════════════════════════════════════
const {
  getNextNumber,
  peekCurrent,
  resetCounter,
  initializeCounters,
  getAllCounters,
  checkAndResetCounters,
  autoNumberPlugin,
} = require('./utils/counter');

// ══════════════════════════════════════════════════════════════════
// 3. Saudi Validators
// ══════════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════════
// 4. Redis Cache Service
// ══════════════════════════════════════════════════════════════════
const {
  cacheService,
  CacheService,
  cacheMiddleware,
  cacheResponse,
  TTL,
  PREFIX,
} = require('./cache/cache-service');

// ══════════════════════════════════════════════════════════════════
// 5. Aggregation Pipelines
// ══════════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════════
// 6. Health Checks
// ══════════════════════════════════════════════════════════════════
const { checkDatabaseHealth, dbHealthMiddleware } = require('./health/db-health');

// ══════════════════════════════════════════════════════════════════
// 7. Smart Query Builder  باني الاستعلامات الذكي
// ══════════════════════════════════════════════════════════════════
const { SmartQueryBuilder, queryFromRequest } = require('./smart-query-builder');

// ══════════════════════════════════════════════════════════════════
// 8. Transaction Manager  مدير المعاملات
// ══════════════════════════════════════════════════════════════════
const {
  TransactionManager,
  transactionManager,
  withTransaction,
} = require('./transaction-manager');

// ══════════════════════════════════════════════════════════════════
// 9. Event Bus (Change Streams)  ناقل الأحداث
// ══════════════════════════════════════════════════════════════════
const { DatabaseEventBus, databaseEventBus } = require('./event-bus');

// ══════════════════════════════════════════════════════════════════
// 10. Data Archiver  نظام الأرشفة
// ══════════════════════════════════════════════════════════════════
const { DataArchiver, dataArchiver, ArchiveMeta } = require('./data-archiver');

// ══════════════════════════════════════════════════════════════════
// 11. Field Encryption  تشفير الحقول
// ══════════════════════════════════════════════════════════════════
const {
  encrypt,
  decrypt,
  deterministicHash,
  maskValue,
  encryptedFieldsPlugin,
  initEncryption,
} = require('./plugins/field-encryption');

// ══════════════════════════════════════════════════════════════════
// 12. Migration Runner  نظام الهجرات
// ══════════════════════════════════════════════════════════════════
const { MigrationRunner, migrationRunner, MigrationRecord } = require('./migration-runner');

// ══════════════════════════════════════════════════════════════════
// 13. Query Cache Layer  طبقة التخزين المؤقت
// ══════════════════════════════════════════════════════════════════
const {
  QueryCacheLayer,
  LRUCache,
  queryCache,
  queryCacheMiddleware,
  MODEL_TTL,
} = require('./query-cache');

// ══════════════════════════════════════════════════════════════════
// 14. Database Analytics  تحليلات قاعدة البيانات
// ══════════════════════════════════════════════════════════════════
const { DatabaseAnalytics, dbAnalytics } = require('./analytics');

// ══════════════════════════════════════════════════════════════════
// 15. Schema Registry  سجل المخططات
// ══════════════════════════════════════════════════════════════════
const { SchemaRegistry, schemaRegistry } = require('./schema-registry');

// ══════════════════════════════════════════════════════════════════
// 16. Circuit Breaker  قاطع الدائرة
// ══════════════════════════════════════════════════════════════════
const { CircuitBreaker, dbCircuitBreaker, circuitBreakerMiddleware } = require('./circuit-breaker');

// ══════════════════════════════════════════════════════════════════
// 17. Smart Index Optimizer  محسّن الفهارس الذكي
// ══════════════════════════════════════════════════════════════════
const { SmartIndexOptimizer, indexOptimizer } = require('./smart-index-optimizer');

// ══════════════════════════════════════════════════════════════════
// 18. Seeder Framework  إطار البذر
// ══════════════════════════════════════════════════════════════════
const { SeederFramework, seederFramework, defineSeed } = require('./seeder-framework');

// ══════════════════════════════════════════════════════════════════
// 19. Connection Pool Manager  مدير مجمع الاتصالات
// ══════════════════════════════════════════════════════════════════
const { ConnectionPoolManager, poolManager } = require('./connection-pool');

// ══════════════════════════════════════════════════════════════════
// 20. Backup & Restore  النسخ الاحتياطي والاستعادة
// ══════════════════════════════════════════════════════════════════
const { BackupRestoreManager, backupRestore, BackupMeta } = require('./backup-restore');

// ══════════════════════════════════════════════════════════════════
// 21. Audit Trail  تتبع التغييرات والمراجعة
// ══════════════════════════════════════════════════════════════════
const { AuditTrail, auditTrail, AuditLog } = require('./audit-trail');

// ══════════════════════════════════════════════════════════════════
// 22. Multi-Tenant Isolator  عزل البيانات متعدد المستأجرين
// ══════════════════════════════════════════════════════════════════
const { MultiTenantIsolator, tenantIsolator, tenantStore } = require('./multi-tenant-isolator');

// ══════════════════════════════════════════════════════════════════
// 23. Data Masking  إخفاء البيانات الديناميكي
// ══════════════════════════════════════════════════════════════════
const {
  DataMaskingEngine,
  dataMasking,
  STRATEGIES: MASKING_STRATEGIES,
} = require('./data-masking');

// ══════════════════════════════════════════════════════════════════
// 24. Query Governor  حاكم موارد الاستعلامات
// ══════════════════════════════════════════════════════════════════
const { QueryGovernor, queryGovernor } = require('./query-governor');

// ══════════════════════════════════════════════════════════════════
// 25. Referential Integrity  سلامة البيانات المرجعية
// ══════════════════════════════════════════════════════════════════
const { ReferentialIntegrityManager, refIntegrity } = require('./referential-integrity');

// ══════════════════════════════════════════════════════════════════
// 26. TTL Lifecycle Manager  مدير دورة حياة البيانات
// ══════════════════════════════════════════════════════════════════
const {
  TTLLifecycleManager,
  lifecycleManager,
  LifecyclePolicy,
} = require('./ttl-lifecycle-manager');

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
  encryption: encryptedFieldsPlugin,
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

const query = {
  SmartQueryBuilder,
  queryFromRequest,
  for: model => SmartQueryBuilder.for(model),
};

const transactions = {
  TransactionManager,
  manager: transactionManager,
  run: (...args) => withTransaction(...args),
};

const events = {
  DatabaseEventBus,
  bus: databaseEventBus,
};

const archiver = {
  DataArchiver,
  instance: dataArchiver,
  ArchiveMeta,
};

const encryption = {
  encrypt,
  decrypt,
  hash: deterministicHash,
  mask: maskValue,
  plugin: encryptedFieldsPlugin,
  init: initEncryption,
};

const migrations = {
  MigrationRunner,
  runner: migrationRunner,
  MigrationRecord,
  generate: MigrationRunner.generate,
};

const queryCaching = {
  QueryCacheLayer,
  LRUCache,
  instance: queryCache,
  middleware: queryCacheMiddleware,
  MODEL_TTL,
};

const analytics = {
  DatabaseAnalytics,
  instance: dbAnalytics,
};

const registry = {
  SchemaRegistry,
  instance: schemaRegistry,
};

const circuitBreaker = {
  CircuitBreaker,
  instance: dbCircuitBreaker,
  middleware: circuitBreakerMiddleware,
};

const indexOptimization = {
  SmartIndexOptimizer,
  instance: indexOptimizer,
};

const seeder = {
  SeederFramework,
  instance: seederFramework,
  define: defineSeed,
};

const pool = {
  ConnectionPoolManager,
  instance: poolManager,
};

const backup = {
  BackupRestoreManager,
  instance: backupRestore,
  BackupMeta,
};

const audit = {
  AuditTrail,
  instance: auditTrail,
  AuditLog,
};

const tenant = {
  MultiTenantIsolator,
  instance: tenantIsolator,
  store: tenantStore,
};

const masking = {
  DataMaskingEngine,
  instance: dataMasking,
  strategies: MASKING_STRATEGIES,
};

const governor = {
  QueryGovernor,
  instance: queryGovernor,
};

const integrity = {
  ReferentialIntegrityManager,
  instance: refIntegrity,
};

const lifecycle = {
  TTLLifecycleManager,
  instance: lifecycleManager,
  LifecyclePolicy,
};

// ══════════════════════════════════════════════════════════════════
// Default Export (flat + namespaced)
// ══════════════════════════════════════════════════════════════════

module.exports = {
  // ── Namespaced exports ──
  plugins,
  counters,
  validators,
  cache,
  pipelines,
  health,
  query,
  transactions,
  events,
  archiver,
  encryption,
  migrations,
  queryCaching,
  analytics,
  registry,
  circuitBreaker,
  indexOptimization,
  seeder,
  pool,
  backup,
  audit,
  tenant,
  masking,
  governor,
  integrity,
  lifecycle,

  // ── Flat: Plugins ──
  registerGlobalPlugins,
  autoNumberPlugin,
  encryptedFieldsPlugin,

  // ── Flat: Counters ──
  getNextNumber,
  initializeCounters,
  checkAndResetCounters,

  // ── Flat: Validators ──
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

  // ── Flat: Cache ──
  cacheService,
  cacheMiddleware,
  cacheResponse,
  TTL,
  PREFIX,

  // ── Flat: Pipelines ──
  buildPaginatedPipeline,
  flattenPaginationResult,
  beneficiaryPipelines,
  hrPipelines,
  financialPipelines,
  rehabPipelines,
  dashboardPipelines,

  // ── Flat: Health ──
  checkDatabaseHealth,
  dbHealthMiddleware,

  // ── Flat: Smart Query Builder ──
  SmartQueryBuilder,
  queryFromRequest,

  // ── Flat: Transaction Manager ──
  TransactionManager,
  transactionManager,
  withTransaction,

  // ── Flat: Event Bus ──
  DatabaseEventBus,
  databaseEventBus,

  // ── Flat: Data Archiver ──
  DataArchiver,
  dataArchiver,
  ArchiveMeta,

  // ── Flat: Encryption ──
  encrypt,
  decrypt,
  deterministicHash,
  maskValue,
  initEncryption,

  // ── Flat: Migrations ──
  MigrationRunner,
  migrationRunner,
  MigrationRecord,

  // ── Flat: Query Cache ──
  QueryCacheLayer,
  queryCache,
  queryCacheMiddleware,
  MODEL_TTL,

  // ── Flat: Analytics ──
  DatabaseAnalytics,
  dbAnalytics,

  // ── Flat: Schema Registry ──
  SchemaRegistry,
  schemaRegistry,

  // ── Flat: Circuit Breaker ──
  CircuitBreaker,
  dbCircuitBreaker,
  circuitBreakerMiddleware,

  // ── Flat: Smart Index Optimizer ──
  SmartIndexOptimizer,
  indexOptimizer,

  // ── Flat: Seeder Framework ──
  SeederFramework,
  seederFramework,
  defineSeed,

  // ── Flat: Connection Pool ──
  ConnectionPoolManager,
  poolManager,

  // ── Flat: Backup & Restore ──
  BackupRestoreManager,
  backupRestore,
  BackupMeta,

  // ── Flat: Audit Trail ──
  AuditTrail,
  auditTrail,
  AuditLog,

  // ── Flat: Multi-Tenant Isolator ──
  MultiTenantIsolator,
  tenantIsolator,
  tenantStore,

  // ── Flat: Data Masking ──
  DataMaskingEngine,
  dataMasking,
  MASKING_STRATEGIES,

  // ── Flat: Query Governor ──
  QueryGovernor,
  queryGovernor,

  // ── Flat: Referential Integrity ──
  ReferentialIntegrityManager,
  refIntegrity,

  // ── Flat: TTL Lifecycle ──
  TTLLifecycleManager,
  lifecycleManager,
  LifecyclePolicy,
};
