'use strict';

/**
 * Role — RBAC role entity (collection of permissions).
 *
 * Schema migrated from `backend/permissions/permission-service.js` to this
 * canonical location per the empty-shim pattern documented in
 * `docs/architecture/canonical-location-pattern.md` §"Exception: the
 * empty-shim pattern". The previous file here was a `strict:false`
 * placeholder; the rich schema lived in the service. W340 drift guard
 * tolerated the duplicate as a baseline entry until this consolidation.
 *
 * Callers that previously did `connection.model('Role', schema)` inside
 * the service now do `mongoose.model('Role')` lookup against this
 * canonical schema.
 */

const mongoose = require('mongoose');

const ROLE_SCOPE_TYPES = ['global', 'tenant', 'department', 'team', 'custom'];

const RoleSchema = new mongoose.Schema(
  {
    // Role identification
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,

    // Permissions
    permissions: [
      {
        permission: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission' },
        level: { type: Number, default: 1 },
        conditions: mongoose.Schema.Types.Mixed,
        grantedAt: { type: Date, default: Date.now },
        grantedBy: String,
      },
    ],

    // Inheritance
    inherits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],

    // Scope
    scope: {
      type: {
        type: String,
        enum: ROLE_SCOPE_TYPES,
        default: 'tenant',
      },
      value: String,
    },

    // Hierarchy level
    level: { type: Number, default: 0 },

    // Metadata
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Tenant
    tenantId: String,

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
  },
  {
    collection: 'roles',
  }
);

module.exports = mongoose.models.Role || mongoose.model('Role', RoleSchema);
module.exports.ROLE_SCOPE_TYPES = ROLE_SCOPE_TYPES;
