'use strict';

/**
 * W1457 — privilege-ceiling guard for the admin user-management surface.
 *
 * `routes/user-management.routes.js` admits `manager` (level 70) and `hr` (60) to its
 * router, and its update paths hand-copy `role` / `customPermissions` / `deniedPermissions`
 * from the request body (deliberately bypassing `stripUpdateMeta`) with only a `super_admin`
 * carve-out. A manager/hr operator could therefore set `role: "admin"` on any user — or on
 * themselves — and grant arbitrary `customPermissions` (incl. `*:*`): a vertical
 * privilege-escalation. This pure guard enforces the missing ceiling:
 *   - you cannot assign a role HIGHER than your own,
 *   - you cannot change your OWN role or permissions on this admin surface,
 *   - granting custom/denied permissions requires admin-tier.
 *
 * Pure (no I/O) so it is unit-testable; the route maps {ok:false} → res.status(status).
 */

const { getRoleLevel } = require('../config/rbac.config');

/**
 * @param {object} p
 * @param {string} p.actorRole      - req.user.role
 * @param {string} p.actorId        - req.user.id / _id
 * @param {string} p.targetUserId   - the user being mutated (req.params.id)
 * @param {string} [p.newRole]      - the role being assigned (undefined if not changing role)
 * @param {boolean} [p.settingPermissions] - true if custom/denied permissions are being set
 * @returns {{ok: true} | {ok: false, status: number, message: string}}
 */
function assertUserMutationAllowed({
  actorRole,
  actorId,
  targetUserId,
  newRole,
  settingPermissions = false,
}) {
  const actorLevel = getRoleLevel(actorRole);
  const isSelf =
    actorId && targetUserId && String(actorId) === String(targetUserId);

  if (isSelf && (newRole !== undefined || settingPermissions)) {
    return { ok: false, status: 403, message: 'لا يمكنك تعديل دورك أو صلاحياتك الخاصة' };
  }
  if (newRole !== undefined && getRoleLevel(newRole) > actorLevel) {
    return { ok: false, status: 403, message: 'لا يمكنك تعيين دور أعلى من دورك' };
  }
  if (settingPermissions && actorLevel < getRoleLevel('admin')) {
    return { ok: false, status: 403, message: 'تعيين الصلاحيات المخصصة يتطلب صلاحية مدير' };
  }
  return { ok: true };
}

module.exports = { assertUserMutationAllowed };
