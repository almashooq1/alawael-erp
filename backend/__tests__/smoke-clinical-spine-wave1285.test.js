'use strict';

/**
 * W1285 — guard for the clinical-value-loop smoke script.
 *
 * The script runs LIVE against a DB (verified on prod by hand), so this guard
 * is STATIC: it locks the script's safety + coverage contract so a future edit
 * can't silently turn it into an unsafe or hollow smoke.
 *
 *  1. SAFE-BY-DESIGN — collects created ids and deletes them in `finally`;
 *     no .deleteMany / dropDatabase (would touch real data).
 *  2. COVERS THE SPINE — touches all five layers it claims (goal↔measure /
 *     golden-thread trace / NBA / outcomes roll-up) via the real services.
 *  3. REFUSE-TO-FABRICATE — an empty measures_library SKIPS the goal step
 *     (skip()) instead of failing or inventing a measure.
 *  4. WIRED — npm run smoke:clinical-spine exists.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(BACKEND, 'scripts', 'smoke-clinical-spine.js'), 'utf8');
const PKG = JSON.parse(fs.readFileSync(path.join(BACKEND, 'package.json'), 'utf8'));

describe('W1285 clinical-spine smoke — safety contract', () => {
  test('collects created docs and deletes them in a finally block', () => {
    expect(SRC).toMatch(/created\.push\(/);
    expect(SRC).toMatch(/finally\s*\{/);
    expect(SRC).toMatch(/\.deleteOne\(\{ _id: id \}\)/);
  });

  test('NEVER uses bulk-destructive ops (would touch real data)', () => {
    expect(SRC).not.toMatch(/deleteMany|dropDatabase|drop\(\)|remove\(\{\}\)/);
  });

  test('cleanup never throws out (best-effort try/catch inside the loop)', () => {
    const finallyBlock = SRC.slice(SRC.indexOf('} finally {'));
    expect(finallyBlock).toMatch(/try\s*\{[\s\S]*deleteOne[\s\S]*catch/);
  });
});

describe('W1285 clinical-spine smoke — coverage contract', () => {
  test('exercises all five spine layers through the real services', () => {
    expect(SRC).toMatch(/EpisodeOfCare\.create|EpisodeOfCare\b/); // scaffold
    expect(SRC).toMatch(/measureLinks:\s*\[/); // R3 goal↔measure
    expect(SRC).toMatch(/linkType: 'PRIMARY'/);
    expect(SRC).toMatch(/goldenThread\.traceByBeneficiary/); // thread
    expect(SRC).toMatch(/nba\.computeForBeneficiary/); // NBA fusion
    expect(SRC).toMatch(/rollup\.rollupForBeneficiary/); // outcomes roll-up
  });

  test('asserts NBA non-degraded (all source models registered)', () => {
    expect(SRC).toMatch(/degradedSources/);
    expect(SRC).toMatch(/require\('\.\.\/domains\/sessions\/models\/ClinicalSession'\)/);
    expect(SRC).toMatch(/require\('\.\.\/models\/RiskSnapshot'\)/);
    expect(SRC).toMatch(/require\('\.\.\/domains\/goals\/models\/MeasureAlert'\)/);
  });

  test('refuse-to-fabricate: empty measures_library SKIPS the goal step', () => {
    expect(SRC).toMatch(/function skip\(/);
    expect(SRC).toMatch(/if \(!measure\)/);
    expect(SRC).toMatch(/skip\('R3 goal/);
  });
});

describe('W1285 clinical-spine smoke — wiring', () => {
  test('npm run smoke:clinical-spine exists', () => {
    expect(PKG.scripts['smoke:clinical-spine']).toBe('node scripts/smoke-clinical-spine.js');
  });

  test('exit-code contract: 0 on all-pass, 1 otherwise', () => {
    expect(SRC).toMatch(/process\.exit\(0\)/);
    expect(SRC).toMatch(/process\.exit\(1\)/);
  });
});
