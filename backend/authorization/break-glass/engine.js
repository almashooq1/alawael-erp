/**
 * Break-glass (emergency access) engine — stateful + auditable.
 *
 * Supports:
 *   - activate(): user requests elevation, system creates a session
 *   - isActive(): returns active session for a user at `now`
 *   - coSign(): second-signature from L2+ within the window
 *   - close(): end a session (manual or automatic on expiry)
 *   - listPending(): sessions that still need a co-sign
 *
 * Storage injected via constructor ({ sessions: Map | array-adapter }).
 * Rate limit configurable per month.
 */

'use strict';

const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000;
const DEFAULT_COSIGN_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MONTHLY_LIMIT = 3;

const ALLOWED_SCOPES = new Set(['clinical_read', 'financial_read', 'platform_read']);

class BreakGlassEngine {
  /**
   * @param {Object} opts
   * @param {any} [opts.storage] optional Map-like { get(id), set(id,v), values(), delete(id) }
   * @param {number} [opts.durationMs]
   * @param {number} [opts.coSignWindowMs]
   * @param {number} [opts.monthlyLimit]
   * @param {(ev: object) => void} [opts.onActivate]
   * @param {(ev: object) => void} [opts.onCoSign]
   * @param {(ev: object) => void} [opts.onExpire]
   * @param {() => Date} [opts.now]
   */
  constructor(opts = {}) {
    this.storage = opts.storage || new Map();
    this.durationMs = opts.durationMs ?? DEFAULT_DURATION_MS;
    this.coSignWindowMs = opts.coSignWindowMs ?? DEFAULT_COSIGN_WINDOW_MS;
    this.monthlyLimit = opts.monthlyLimit ?? DEFAULT_MONTHLY_LIMIT;
    this.onActivate = opts.onActivate || (() => {});
    this.onCoSign = opts.onCoSign || (() => {});
    this.onExpire = opts.onExpire || (() => {});
    this.now = opts.now || (() => new Date());
    this._idSeq = 1;
  }

  /**
   * Activate a break-glass session.
   * @returns session
   */
  activate({ userId, scope, purpose, branchId, resourceHint }) {
    if (!userId) throw new Error('break_glass_requires_userId');
    if (!ALLOWED_SCOPES.has(scope)) throw new Error(`break_glass_scope_invalid:${scope}`);
    if (!purpose || purpose.length < 10) throw new Error('break_glass_purpose_too_short');

    const now = this.now();
    const recent = this._recentByUser(userId, now);
    if (recent.length >= this.monthlyLimit) {
      const err = new Error('break_glass_monthly_limit_reached');
      err.count = recent.length;
      throw err;
    }

    const id = `bg-${now.getTime()}-${this._idSeq++}`;
    const session = {
      id,
      userId,
      scope,
      purpose,
      branchId: branchId || null,
      resourceHint: resourceHint || null,
      activatedAt: now,
      expiresAt: new Date(now.getTime() + this.durationMs),
      coSignRequiredBy: new Date(now.getTime() + this.coSignWindowMs),
      coSignedAt: null,
      coSignedBy: null,
      closedAt: null,
      actions: [],
    };
    this.storage.set(id, session);
    this.onActivate(session);
    return session;
  }

  /**
   * Co-sign by an L2+ user. Must happen within the window.
   */
  coSign(sessionId, { approverUserId, approverRoles = [], note }) {
    const s = this.storage.get(sessionId);
    if (!s) throw new Error('break_glass_not_found');
    if (s.coSignedAt) throw new Error('break_glass_already_cosigned');
    const now = this.now();
    if (now > s.coSignRequiredBy) {
      throw new Error('break_glass_cosign_window_closed');
    }
    // Require an L2+ role (head_office_*, compliance, super_admin, dpo).
    const L2_APPROVERS = new Set([
      'super_admin',
      'head_office_admin',
      'hq_ceo',
      'hq_cfo',
      'hq_cmo',
      'hq_cqo',
      'hq_chro',
      'compliance_officer',
      'dpo',
    ]);
    if (!approverRoles.some(r => L2_APPROVERS.has(r))) {
      throw new Error('break_glass_cosign_requires_L2_plus_role');
    }
    if (String(approverUserId) === String(s.userId)) {
      throw new Error('break_glass_cosign_cannot_be_self');
    }
    s.coSignedAt = now;
    s.coSignedBy = approverUserId;
    s.coSignNote = note || null;
    this.storage.set(s.id, s);
    this.onCoSign(s);
    return s;
  }

  /** Is a valid (unexpired, unclosed) session present for user? */
  isActive(userId, now = this.now()) {
    const sessions = this._byUser(userId);
    const live = sessions.find(s => !s.closedAt && s.expiresAt > now);
    return live || null;
  }

  /** Close a session early (admin or user-initiated). */
  close(sessionId, { actorId, reason } = {}) {
    const s = this.storage.get(sessionId);
    if (!s) throw new Error('break_glass_not_found');
    if (s.closedAt) return s;
    s.closedAt = this.now();
    s.closedBy = actorId || null;
    s.closeReason = reason || null;
    this.storage.set(sessionId, s);
    return s;
  }

  /**
   * Sweep — mark expired sessions that haven't been co-signed.
   * Returns the list of sessions flagged for review.
   */
  sweepExpired(now = this.now()) {
    const flagged = [];
    for (const s of this.storage.values()) {
      const pastCoSignWindow = now > s.coSignRequiredBy && !s.coSignedAt && !s.flaggedForReview;
      if (pastCoSignWindow) {
        s.flaggedForReview = true;
        this.storage.set(s.id, s);
        this.onExpire(s);
        flagged.push(s);
      }
    }
    return flagged;
  }

  /** List sessions awaiting co-sign (not yet signed, window still open). */
  listPending(now = this.now()) {
    return Array.from(this.storage.values()).filter(
      s => !s.coSignedAt && !s.closedAt && now <= s.coSignRequiredBy
    );
  }

  /** Append an action performed under this session (for audit). */
  recordAction(sessionId, action) {
    const s = this.storage.get(sessionId);
    if (!s) return null;
    s.actions.push({ at: this.now(), ...action });
    this.storage.set(sessionId, s);
    return s;
  }

  _byUser(userId) {
    return Array.from(this.storage.values()).filter(s => String(s.userId) === String(userId));
  }

  _recentByUser(userId, now) {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this._byUser(userId).filter(s => s.activatedAt >= monthAgo);
  }
}

module.exports = { BreakGlassEngine, DEFAULT_DURATION_MS, ALLOWED_SCOPES };
