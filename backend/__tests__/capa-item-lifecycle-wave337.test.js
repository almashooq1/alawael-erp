'use strict';

/**
 * W337 — CapaItem lifecycle + schema drift guard.
 *
 * Mirrors W325 P2 measure-lifecycle + W334 ai-recommendation-lifecycle test patterns:
 *   - pure-lib tests run directly (no mongoose)
 *   - schema-shape tests use static analysis on source (W325 P1/P2/P3 + W332 pattern)
 *     because backend/jest.setup.js fully mocks mongoose; runtime schema introspection
 *     returns undefined values inside Jest.
 */

const fs = require('fs');
const path = require('path');
const lib = require('../intelligence/capa-lifecycle.lib');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'quality', 'CapaItem.model.js'),
  'utf8'
);

describe('W337 — CapaItem lifecycle state machine', () => {
  it('exposes the 7 documented states', () => {
    expect(lib.LIFECYCLE_STATES).toEqual([
      'OPEN',
      'IN_PROGRESS',
      'IMPLEMENTED',
      'VERIFIED',
      'CLOSED',
      'REJECTED',
      'CANCELLED',
    ]);
  });

  it('declares 3 terminal states (CLOSED + REJECTED + CANCELLED)', () => {
    expect([...lib.TERMINAL_STATES].sort()).toEqual(['CANCELLED', 'CLOSED', 'REJECTED']);
    for (const t of lib.TERMINAL_STATES) {
      expect(lib.VALID_TRANSITIONS[t]).toEqual([]);
    }
  });

  it('OPEN can fan out to IN_PROGRESS + REJECTED + CANCELLED only', () => {
    expect([...lib.VALID_TRANSITIONS.OPEN].sort()).toEqual([
      'CANCELLED',
      'IN_PROGRESS',
      'REJECTED',
    ]);
  });

  it('IMPLEMENTED supports back-to-IN_PROGRESS for failed verification', () => {
    expect(lib.VALID_TRANSITIONS.IMPLEMENTED).toContain('IN_PROGRESS');
    expect(lib.VALID_TRANSITIONS.IMPLEMENTED).toContain('VERIFIED');
    expect(lib.VALID_TRANSITIONS.IMPLEMENTED).toContain('CANCELLED');
  });

  it('VERIFIED can ONLY go to CLOSED (no reopen)', () => {
    expect(lib.VALID_TRANSITIONS.VERIFIED).toEqual(['CLOSED']);
  });

  it('forbids skipping IN_PROGRESS (OPEN→IMPLEMENTED rejected)', () => {
    expect(lib.isValidLifecycleTransition('OPEN', 'IMPLEMENTED')).toBe(false);
  });

  it('forbids skipping VERIFIED (IMPLEMENTED→CLOSED rejected)', () => {
    expect(lib.isValidLifecycleTransition('IMPLEMENTED', 'CLOSED')).toBe(false);
  });

  it('forbids reopen of terminal states', () => {
    for (const term of lib.TERMINAL_STATES) {
      for (const s of lib.LIFECYCLE_STATES) {
        expect(lib.isValidLifecycleTransition(term, s)).toBe(false);
      }
    }
  });
});

describe('W337 — reasonCode + MFA tier rules', () => {
  it('rejection from OPEN/IN_PROGRESS requires reasonCode', () => {
    expect(lib.reasonCodeRequired('OPEN', 'REJECTED')).toBe(true);
    expect(lib.reasonCodeRequired('IN_PROGRESS', 'REJECTED')).toBe(true);
  });

  it('cancellation requires reasonCode from any non-terminal state', () => {
    expect(lib.reasonCodeRequired('OPEN', 'CANCELLED')).toBe(true);
    expect(lib.reasonCodeRequired('IN_PROGRESS', 'CANCELLED')).toBe(true);
    expect(lib.reasonCodeRequired('IMPLEMENTED', 'CANCELLED')).toBe(true);
  });

  it('verification failure (IMPLEMENTED→IN_PROGRESS) requires reasonCode', () => {
    expect(lib.reasonCodeRequired('IMPLEMENTED', 'IN_PROGRESS')).toBe(true);
  });

  it('VERIFIED→CLOSED requires MFA tier 2 (final sign-off)', () => {
    expect(lib.requiredMfaTier('VERIFIED', 'CLOSED')).toBe(2);
  });

  it('REJECTED transitions require MFA tier 2', () => {
    expect(lib.requiredMfaTier('OPEN', 'REJECTED')).toBe(2);
    expect(lib.requiredMfaTier('IN_PROGRESS', 'REJECTED')).toBe(2);
  });

  it('OPEN→IN_PROGRESS is routine (no MFA tier requirement)', () => {
    expect(lib.requiredMfaTier('OPEN', 'IN_PROGRESS')).toBeNull();
  });
});

describe('W337 — validateTransition end-to-end', () => {
  it('happy path returns ok:true with a frozen audit entry', () => {
    const r = lib.validateTransition({
      from: 'OPEN',
      to: 'IN_PROGRESS',
      actor: 'u1',
      notes: 'starting work',
    });
    expect(r.ok).toBe(true);
    expect(r.entry.fromStatus).toBe('OPEN');
    expect(r.entry.toStatus).toBe('IN_PROGRESS');
    expect(Object.isFrozen(r.entry)).toBe(true);
  });

  it('INVALID_TRANSITION on forbidden edge', () => {
    const r = lib.validateTransition({ from: 'OPEN', to: 'CLOSED' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('INVALID_TRANSITION');
  });

  it('REASON_CODE_REQUIRED when missing', () => {
    const r = lib.validateTransition({ from: 'OPEN', to: 'REJECTED', mfaTier: 2 });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('REASON_CODE_REQUIRED');
  });

  it('MFA_TIER_INSUFFICIENT when below required', () => {
    const r = lib.validateTransition({
      from: 'VERIFIED',
      to: 'CLOSED',
      actor: 'u1',
      mfaTier: 1,
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('MFA_TIER_INSUFFICIENT');
  });

  it('all three guards pass together for VERIFIED→CLOSED with tier 2', () => {
    const r = lib.validateTransition({
      from: 'VERIFIED',
      to: 'CLOSED',
      actor: 'u1',
      mfaTier: 2,
    });
    expect(r.ok).toBe(true);
  });
});

describe('W337 — buildTransitionEntry purity', () => {
  it('returns frozen object with all fields populated', () => {
    const e = lib.buildTransitionEntry({
      from: 'IN_PROGRESS',
      to: 'IMPLEMENTED',
      actor: 'u1',
      notes: 'action complete',
    });
    expect(Object.isFrozen(e)).toBe(true);
    expect(e.fromStatus).toBe('IN_PROGRESS');
    expect(e.toStatus).toBe('IMPLEMENTED');
    expect(e.actor).toBe('u1');
    expect(e.reasonCode).toBeNull();
    expect(e.notes).toBe('action complete');
    expect(e.at).toBeInstanceOf(Date);
  });
});

describe('W337 — schema canonical refs + dynamic enum binding', () => {
  it('ownerUserId refs canonical User (W327)', () => {
    expect(MODEL_SRC).toMatch(/ownerUserId:\s*\{[^}]*ref:\s*['"]User['"]/);
  });

  it('verifierUserId refs canonical User', () => {
    expect(MODEL_SRC).toMatch(/verifierUserId:\s*\{[^}]*ref:\s*['"]User['"]/);
  });

  it('branchId refs canonical Branch (W326)', () => {
    expect(MODEL_SRC).toMatch(/branchId:\s*\{[^}]*ref:\s*['"]Branch['"]/);
  });

  it('createdBy/updatedBy/closedBy ALL ref User', () => {
    expect(MODEL_SRC).toMatch(/createdBy:\s*\{[^}]*ref:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/updatedBy:\s*\{[^}]*ref:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/closedBy:\s*\{[^}]*ref:\s*['"]User['"]/);
  });

  it('status enum is bound to lib.LIFECYCLE_STATES (W332 sync pattern)', () => {
    expect(MODEL_SRC).toMatch(/status:\s*\{[^}]*enum:\s*lib\.LIFECYCLE_STATES/);
  });

  it('lifecycleHistory subdoc enums are bound to lib.LIFECYCLE_STATES', () => {
    expect(MODEL_SRC).toMatch(/fromStatus:\s*\{[^}]*enum:\s*lib\.LIFECYCLE_STATES/);
    expect(MODEL_SRC).toMatch(/toStatus:\s*\{[^}]*enum:\s*lib\.LIFECYCLE_STATES/);
  });

  it('source.module enum is bound to lib.SOURCE_MODULES (no inline enum)', () => {
    expect(MODEL_SRC).toMatch(/module:\s*\{[^}]*enum:\s*lib\.SOURCE_MODULES/);
  });

  it('registers as canonical "CapaItem" (idempotent)', () => {
    expect(MODEL_SRC).toMatch(
      /mongoose\.models\.CapaItem\s*\|\|\s*mongoose\.model\(\s*['"]CapaItem['"],\s*capaItemSchema\s*\)/
    );
  });

  it('source.refId is polymorphic (no static ref — validated at service layer)', () => {
    // refId should NOT carry a ref: clause (since it's polymorphic).
    expect(MODEL_SRC).toMatch(
      /refId:\s*\{\s*type:\s*Schema\.Types\.ObjectId,\s*default:\s*null\s*\}/
    );
  });
});
