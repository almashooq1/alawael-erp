#!/usr/bin/env node
'use strict';
/**
 * Remove dead DDD subscriber blocks from integration/dddCrossModuleSubscribers.js.
 * A block is "dead" if its pattern does not resolve to a live contract in
 * events/contracts/dddEventContracts.js (same logic as W389).
 *
 * Usage:
 *   node scripts/clean-dead-subscribers.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const SUBSCRIBERS_FILE = path.join(BACKEND_ROOT, 'integration', 'dddCrossModuleSubscribers.js');
const contracts = require('../events/contracts/dddEventContracts');

const DRY_RUN = process.argv.includes('--dry-run');

function isLiveContract(pattern) {
  const firstDot = pattern.indexOf('.');
  if (firstDot === -1) return false;
  const domain = pattern.slice(0, firstDot);
  const eventType = pattern.slice(firstDot + 1);
  const group = contracts.DDD_CONTRACTS[domain];
  if (!group) return false;
  return Object.values(group).some(evt => evt.eventType === eventType);
}

function main() {
  const src = fs.readFileSync(SUBSCRIBERS_FILE, 'utf8');

  // Match each subscribers.push({ ... }); block, capturing the full block and the pattern literal.
  const blockRe = /\n {2}subscribers\.push\(\{[\s\S]*?\n {2}\}\);/g;
  const blocks = [];
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    const block = m[0];
    const patternMatch = block.match(/pattern:\s*['"]([^'"]+)['"]/);
    const pattern = patternMatch ? patternMatch[1] : null;
    blocks.push({ start: m.index, end: m.index + block.length, block, pattern });
  }

  const dead = blocks.filter(b => !b.pattern || !isLiveContract(b.pattern));
  console.log(`Found ${blocks.length} subscriber blocks, ${dead.length} dead.`);
  if (dead.length > 0) {
    for (const d of dead) {
      console.log(`  - ${d.pattern || '(no pattern)'}`);
    }
  }

  if (DRY_RUN) {
    console.log('Dry-run: no changes written.');
    return;
  }

  if (dead.length === 0) return;

  // Build result by skipping dead blocks.
  let result = src;
  for (let i = dead.length - 1; i >= 0; i--) {
    const d = dead[i];
    result = result.slice(0, d.start) + result.slice(d.end);
  }

  // Clean up multiple consecutive blank lines left by removals.
  result = result.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(SUBSCRIBERS_FILE, result, 'utf8');
  console.log(`Updated ${SUBSCRIBERS_FILE}`);
}

main();
