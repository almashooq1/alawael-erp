/**
 * blockchain-merkle-tree.test.js
 *
 * Pure crypto tests — no DB, no network. Verifies:
 *   • root determinism for identical leaf sets
 *   • root differs across leaf sets (collision-resistant)
 *   • single-leaf tree → root === leaf
 *   • odd-leaf trees promote duplicated last node
 *   • proof verifies for every leaf in trees of size 1, 2, 3, 7, 16
 *   • bad proof / wrong root / mutated leaf all reject
 *   • empty input returns ZERO root without throwing
 */

'use strict';

const crypto = require('crypto');
const merkle = require('../services/blockchain/merkleTree');

const h = s => crypto.createHash('sha256').update(String(s)).digest('hex');

describe('merkleTree.buildTree', () => {
  it('returns ZERO root for empty leaves', () => {
    const { root, levels } = merkle.buildTree([]);
    expect(root).toBe(merkle.ZERO);
    expect(levels).toEqual([[]]);
  });

  it('single-leaf tree: root equals the leaf', () => {
    const leaf = h('only');
    const { root } = merkle.buildTree([leaf]);
    expect(root).toBe(leaf);
  });

  it('produces identical roots for identical leaf order', () => {
    const leaves = ['a', 'b', 'c', 'd'].map(h);
    const a = merkle.buildTree(leaves).root;
    const b = merkle.buildTree(leaves).root;
    expect(a).toBe(b);
  });

  it('produces different roots when any leaf differs', () => {
    const a = merkle.buildTree(['a', 'b', 'c'].map(h)).root;
    const b = merkle.buildTree(['a', 'b', 'X'].map(h)).root;
    expect(a).not.toBe(b);
  });

  it('rejects non-hex leaves', () => {
    expect(() => merkle.buildTree(['nothex'])).toThrow(/64-char hex/);
  });
});

describe('merkleTree.verifyProof — round-trip', () => {
  it.each([1, 2, 3, 7, 16])('verifies every leaf in a tree of size %i', n => {
    const leaves = Array.from({ length: n }, (_, i) => h(`leaf-${i}`));
    const { root, proofs } = merkle.buildTreeWithProofs(leaves);
    for (let i = 0; i < n; i += 1) {
      expect(merkle.verifyProof(leaves[i], proofs[i], root)).toBe(true);
    }
  });

  it('rejects a proof against the wrong root', () => {
    const leaves = ['a', 'b', 'c', 'd'].map(h);
    const { proofs } = merkle.buildTreeWithProofs(leaves);
    const wrongRoot = h('not-the-root');
    expect(merkle.verifyProof(leaves[0], proofs[0], wrongRoot)).toBe(false);
  });

  it('rejects a proof against a mutated leaf', () => {
    const leaves = ['a', 'b', 'c', 'd'].map(h);
    const { root, proofs } = merkle.buildTreeWithProofs(leaves);
    const mutated = h('a-tampered');
    expect(merkle.verifyProof(mutated, proofs[0], root)).toBe(false);
  });

  it('rejects a proof with a sibling swapped out', () => {
    const leaves = ['a', 'b', 'c', 'd'].map(h);
    const { root, proofs } = merkle.buildTreeWithProofs(leaves);
    const tampered = proofs[0].map((p, idx) => (idx === 0 ? { ...p, sibling: h('evil') } : p));
    expect(merkle.verifyProof(leaves[0], tampered, root)).toBe(false);
  });

  it('rejects when proof is not an array', () => {
    expect(merkle.verifyProof(h('a'), null, h('b'))).toBe(false);
  });

  it('rejects when leaf or root is not 64-char hex', () => {
    expect(merkle.verifyProof('short', [], h('x'))).toBe(false);
    expect(merkle.verifyProof(h('x'), [], 'short')).toBe(false);
  });
});

describe('merkleTree — odd leaves', () => {
  it('odd-count tree still verifies all leaves (last node duplicated)', () => {
    const leaves = ['a', 'b', 'c'].map(h);
    const { root, proofs } = merkle.buildTreeWithProofs(leaves);
    for (let i = 0; i < leaves.length; i += 1) {
      expect(merkle.verifyProof(leaves[i], proofs[i], root)).toBe(true);
    }
  });
});
