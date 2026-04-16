/**
 * Policy: break-glass-active
 *
 * When `env.breakGlass` is present and valid (unexpired), permit
 * elevated *reads* that would otherwise deny for lack of normal
 * authority. This policy does NOT override restricted/SoD/write rules;
 * those remain deny.
 */

'use strict';

const READ_ACTIONS = new Set(['read', 'list', 'export']);

module.exports = {
  id: 'break-glass-active',
  description: 'An active break-glass session elevates read scope for its duration.',

  applies({ env, action }) {
    if (!env || !env.breakGlass) return false;
    return READ_ACTIONS.has(action);
  },

  evaluate({ env }) {
    const bg = env.breakGlass;
    const now = env.time instanceof Date ? env.time.getTime() : Date.now();
    const expiresAt =
      bg.expiresAt instanceof Date ? bg.expiresAt.getTime() : new Date(bg.expiresAt || 0).getTime();

    if (!expiresAt || expiresAt <= now) {
      return { effect: 'deny', reason: 'break_glass_expired' };
    }
    if (!bg.purpose || !bg.approvedBy) {
      return { effect: 'deny', reason: 'break_glass_invalid_record' };
    }
    return { effect: 'permit', audit: 'break_glass_used' };
  },
};
