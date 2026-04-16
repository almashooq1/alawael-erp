/**
 * Policy: session-amendment-window
 *
 * Finalized SessionNotes may be amended only:
 *   - by the original signer
 *   - within 24 hours of signing
 * Beyond that, a supervisor approval is required (surfaced as deny with a
 * machine-readable reason so the caller can trigger the approval flow).
 */

'use strict';

const AMENDMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

module.exports = {
  id: 'session-amendment-window',
  description: 'Restricts SessionNote amendment after 24h without approval.',

  applies({ action, resource }) {
    return (
      (action === 'update' || action === 'amend') &&
      resource.type === 'SessionNote' &&
      resource.status === 'finalized'
    );
  },

  evaluate({ subject, resource, env }) {
    const now = env.time instanceof Date ? env.time.getTime() : Date.now();
    const signedAt = resource.signedAt instanceof Date
      ? resource.signedAt.getTime()
      : new Date(resource.signedAt || 0).getTime();
    const withinWindow = signedAt > 0 && now - signedAt < AMENDMENT_WINDOW_MS;
    const sameSigner = String(resource.signedBy || '') === String(subject.userId || '');

    if (withinWindow && sameSigner) return { effect: 'permit' };
    return {
      effect: 'deny',
      reason: withinWindow ? 'not_original_signer' : 'outside_amendment_window_approval_required',
    };
  },
};
