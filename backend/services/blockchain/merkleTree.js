/**
 * Merkle Tree — شجرة ميركل
 *
 * Pure SHA-256 binary merkle tree for batch certificate anchoring.
 * Lets us anchor N certs with a single chain transaction (the root) and
 * still prove individual cert membership offline.
 *
 * Conventions:
 *   - leaves: hex strings (already SHA-256 of the cert payload)
 *   - hash pair: sha256(concat(left, right)) on raw bytes (not hex chars)
 *   - odd nodes are duplicated (Bitcoin-style) so the tree is always balanced
 *   - proof: ordered siblings from leaf → root, each tagged left/right
 */

'use strict';

const crypto = require('crypto');

const ZERO = '0'.repeat(64);

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function hashPair(leftHex, rightHex) {
  return sha256Hex(Buffer.concat([Buffer.from(leftHex, 'hex'), Buffer.from(rightHex, 'hex')]));
}

function isHex64(s) {
  return typeof s === 'string' && /^[a-f0-9]{64}$/i.test(s);
}

/**
 * Build the full level-by-level tree from an array of leaf hashes.
 * Returns { root, levels } where levels[0] === leaves.
 */
function buildTree(leaves) {
  if (!Array.isArray(leaves) || leaves.length === 0) {
    return { root: ZERO, levels: [[]] };
  }
  for (const leaf of leaves) {
    if (!isHex64(leaf)) throw new Error('merkle: leaves must be 64-char hex sha256 strings');
  }
  const levels = [leaves.slice()];
  let current = leaves.slice();
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = i + 1 < current.length ? current[i + 1] : left; // duplicate odd
      next.push(hashPair(left, right));
    }
    levels.push(next);
    current = next;
  }
  return { root: current[0], levels };
}

/**
 * Build the proof path for the leaf at `index`.
 * Returns an array of { sibling, position: 'left'|'right' } from leaf-level upward.
 */
function buildProof(levels, index) {
  if (!Array.isArray(levels) || levels.length === 0) return [];
  if (index < 0 || index >= levels[0].length) {
    throw new Error('merkle: index out of range');
  }
  const proof = [];
  let idx = index;
  for (let level = 0; level < levels.length - 1; level += 1) {
    const nodes = levels[level];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    const sibling = siblingIdx < nodes.length ? nodes[siblingIdx] : nodes[idx]; // self-duplicate
    proof.push({ sibling, position: isRight ? 'left' : 'right' });
    idx = Math.floor(idx / 2);
  }
  return proof;
}

/**
 * Verify a proof: walk leaf → root using the sibling list and compare to expected root.
 */
function verifyProof(leafHex, proof, rootHex) {
  if (!isHex64(leafHex) || !isHex64(rootHex)) return false;
  if (!Array.isArray(proof)) return false;
  let cursor = leafHex;
  for (const step of proof) {
    if (!step || !isHex64(step.sibling)) return false;
    cursor =
      step.position === 'left' ? hashPair(step.sibling, cursor) : hashPair(cursor, step.sibling);
  }
  return cursor === rootHex;
}

/**
 * Convenience: build tree + proofs for all leaves in one call.
 * Returns { root, proofs: string[][] } where each proof is just the sibling list
 * (positions reconstructable, but we keep them for explicit verification).
 */
function buildTreeWithProofs(leaves) {
  const { root, levels } = buildTree(leaves);
  const proofs = leaves.map((_, i) => buildProof(levels, i));
  return { root, levels, proofs };
}

module.exports = {
  buildTree,
  buildProof,
  verifyProof,
  buildTreeWithProofs,
  sha256Hex,
  ZERO,
};
