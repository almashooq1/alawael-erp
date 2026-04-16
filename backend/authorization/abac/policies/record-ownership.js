/**
 * Policy: record-ownership
 *
 * A user may edit a draft record they created within a grace window.
 * After the window OR after submission for approval, write authority
 * moves to the approver / supervisor.
 *
 * Default grace window: 24 hours. Override via rule attributes.
 */

'use strict';

const DEFAULT_GRACE_MS = 24 * 60 * 60 * 1000;

const DRAFT_TYPES = new Set([
  'IRP',
  'Assessment',
  'SessionNote',
  'Invoice', // draft
  'PurchaseOrder', // draft
  'ClinicalNote',
  'Report',
]);

module.exports = {
  id: 'record-ownership',
  description: 'Draft creator may edit within grace window; after submit, approver takes over.',

  applies({ action, resource }) {
    if (!resource || !DRAFT_TYPES.has(resource.type)) return false;
    if (!['update', 'delete'].includes(action)) return false;
    return true;
  },

  evaluate({ subject, resource, env }) {
    const status = resource.status || 'draft';
    const ownerId = String(resource.createdBy || resource.ownerId || '');
    const userId = String(subject.userId || '');
    const now = env.time instanceof Date ? env.time.getTime() : Date.now();
    const createdAt =
      resource.createdAt instanceof Date
        ? resource.createdAt.getTime()
        : new Date(resource.createdAt || 0).getTime();
    const graceMs = resource.ownershipGraceMs || DEFAULT_GRACE_MS;

    // Draft state: only owner can modify within grace window.
    if (status === 'draft') {
      if (ownerId && ownerId !== userId) {
        return { effect: 'deny', reason: 'not_record_owner' };
      }
      if (createdAt && now - createdAt > graceMs) {
        return { effect: 'deny', reason: 'ownership_grace_expired' };
      }
      return { effect: 'permit' };
    }

    // Submitted / approved / active: ownership no longer applies here —
    // leave decision to other policies (session-amendment-window, etc.)
    return { effect: 'not_applicable' };
  },
};
