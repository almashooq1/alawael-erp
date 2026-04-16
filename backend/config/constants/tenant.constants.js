/**
 * Tenant (Branch) Constants — ثوابت الفروع والعزل
 *
 * مصدر الحقيقة الوحيد لاسم حقل الفرع في كل النماذج.
 * يُستخدم في: branchScope middleware, multi-tenant-isolator,
 * mongoose branchPlugin, migration scripts.
 */

'use strict';

/**
 * The canonical field name for branch/tenant reference in all models.
 * All new models MUST use this field name.
 */
const TENANT_FIELD = 'branchId';

/**
 * Legacy field names that existed before standardization.
 * Used by migration scripts and backward-compat layers only.
 */
const LEGACY_TENANT_FIELDS = ['branch', 'branch_id'];

/**
 * Models excluded from automatic tenant scoping.
 * These are global/system-level collections.
 */
const TENANT_EXCLUDED_MODELS = [
  'User',
  'Branch',
  'Setting',
  'SystemConfig',
  'AuditLog',
  'BackupMeta',
  'MigrationRecord',
  'ArchiveMeta',
  'Counter',
];

module.exports = {
  TENANT_FIELD,
  LEGACY_TENANT_FIELDS,
  TENANT_EXCLUDED_MODELS,
};
