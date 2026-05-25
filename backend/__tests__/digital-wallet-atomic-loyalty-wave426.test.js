'use strict';

/**
 * W426 — anti-regression guard for digitalWallet atomic loyalty operations.
 *
 * The W425 parallel-agent commit (57c4c5002) made `redeemLoyaltyPoints`
 * atomic via `findOneAndUpdate({_id, loyaltyPoints: {$gte}}, {$inc})`.
 * Sweep-extension audit surfaced TWO more lost-update races in the same
 * service that W425 didn't touch:
 *
 *   - `addLoyaltyPoints` (line ~349): pre-W426 did
 *       `wallet.loyaltyPoints += points; wallet.save();`
 *     PLUS a logic bug — `if (!wallet.isModified)` is `!truthy === false`
 *     because `wallet.isModified` is a function reference, so `save()`
 *     was effectively never called. Earning points was a silent no-op.
 *
 *   - `expireLoyaltyPoints` (line ~499): pre-W426 did
 *       `findById; if (>=); -=; save;`
 *     in a sweep loop, racing against user redemptions AND its own
 *     re-runs.
 *
 * Both converted to atomic Mongo ops in the same commit. W426 verifies
 * the source no longer contains the unsafe patterns.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'services', 'digitalWallet.service.js');

describe('W426 digitalWallet atomic loyalty-point ops', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FILE, 'utf8');
  });

  describe('addLoyaltyPoints', () => {
    it('no "wallet.loyaltyPoints += points" mutation remains (pre-W426 race)', () => {
      // Comment lines mentioning the pattern as doc are fine; actual code is not.
      // Strip comment lines first.
      const noComments = src.replace(/^\s*\/\/.*$/gm, '');
      expect(noComments).not.toMatch(/wallet\.loyaltyPoints\s*\+=\s*points/);
    });

    it('no `wallet.isModified` save-guard remains (pre-W426 dead save bug)', () => {
      const noComments = src.replace(/^\s*\/\/.*$/gm, '');
      // The OLD pattern: `if (!wallet.isModified) await wallet.save();`
      // `wallet.isModified` is a method reference (truthy) so save() was
      // effectively never called. W426 removed it entirely.
      expect(noComments).not.toMatch(/if\s*\(\s*!wallet\.isModified\s*\)/);
    });

    it('uses atomic findByIdAndUpdate with $inc for the earn path', () => {
      // Strict pattern: $inc on loyaltyPoints inside findByIdAndUpdate
      expect(src).toMatch(
        /findByIdAndUpdate\([\s\S]{0,200}\$inc:\s*\{\s*loyaltyPoints:\s*pts\s*\}/
      );
    });

    it('the W426 marker comment is present (catches accidental revert)', () => {
      expect(src).toMatch(/W426/);
    });
  });

  describe('expireLoyaltyPoints', () => {
    it('no findById-then-decrement pattern remains in the sweep loop', () => {
      const noComments = src.replace(/^\s*\/\/.*$/gm, '');
      // Pre-W426 pattern: const wallet = await DigitalWallet.findById(pts.walletId);
      // followed shortly by `wallet.loyaltyPoints -= pts.points;`
      // Both gone after W426 — replaced by atomic findOneAndUpdate.
      expect(noComments).not.toMatch(/wallet\.loyaltyPoints\s*-=\s*pts\.points/);
    });

    it('uses atomic findOneAndUpdate with $gte filter + $inc decrement', () => {
      // The atomic pattern: filter contains `loyaltyPoints: { $gte: pts.points }`
      // and update contains `$inc: { loyaltyPoints: -pts.points }`.
      expect(src).toMatch(
        /findOneAndUpdate\(\s*\{[\s\S]{0,200}loyaltyPoints:\s*\{\s*\$gte:\s*pts\.points\s*\}/
      );
      expect(src).toMatch(/\$inc:\s*\{\s*loyaltyPoints:\s*-pts\.points\s*\}/);
    });
  });

  describe('service file integrity', () => {
    it('file parses (require succeeds without throw)', () => {
      // We avoid actually loading the module here (it would touch mongoose),
      // but parsing as a Node module catches syntactic errors. The
      // no-broken-requires drift guard covers full require-time
      // verification across the codebase.
      expect(() => new Function('require', 'module', 'exports', src)).not.toThrow();
    });
  });
});
