'use strict';

/**
 * Permission — RBAC fine-grained permission entity.
 *
 * Schema migrated from `backend/permissions/permission-service.js` to this
 * canonical location per the empty-shim pattern documented in
 * `docs/architecture/canonical-location-pattern.md` §"Exception: the
 * empty-shim pattern". The previous file here was a `strict:false`
 * placeholder; the rich schema lived in the service. W340 drift guard
 * tolerated the duplicate as a baseline entry until this consolidation.
 *
 * Callers that previously did `connection.model('Permission', schema)`
 * inside the service now do `mongoose.model('Permission')` lookup against
 * this canonical schema.
 */

const mongoose = require('mongoose');

const PERMISSION_TYPES = ['read', 'write', 'delete', 'admin', 'approve', 'export'];

const PermissionSchema = new mongoose.Schema(
  {
    // Permission identification
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    category: { type: String, default: 'general' },

    // Permission details
    type: { type: String, enum: PERMISSION_TYPES, default: 'read' },
    level: { type: Number, default: 1 },

    // Resource
    resource: {
      type: { type: String }, // module, feature, data, api
      module: String,
      action: String,
      conditions: mongoose.Schema.Types.Mixed,
    },

    // Hierarchy
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission' },
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],

    // Metadata
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
  },
  {
    collection: 'permissions',
  }
);

module.exports = mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);
module.exports.PERMISSION_TYPES = PERMISSION_TYPES;
