'use strict';

/**
 * session-goal-linkage-wave1149.test.js — R2 static drift guard (golden-thread gap #2).
 *
 * AUDIT-FIRST FINDING (W1149): gap #2 (session ↔ goal) is structurally ALREADY
 * CLOSED on the canonical session model. `ClinicalSession` — the de-facto
 * golden-thread session (it is what `TherapeuticGoal.progressHistory[].sessionId`
 * refs, the official SessionsDomain, the canonical session.* event emitter) —
 * carries a RICH forward link `goalProgress[].goalId` (ref TherapeuticGoal) with
 * per-goal progress, NOT a thin `goalIds[]`. Adding a flat `goalIds[]` would
 * create a second, parallel session→goal mechanism — exactly the fragmentation
 * the golden thread fights. So this wave does NOT add a field; it LOCKS the
 * existing canonical linkage against drift (W325c discipline) and adds the
 * reverse-traversal index.
 *
 * Pure source-text analysis (no mongoose). Paired with the behavioral
 * counterpart `session-goal-linkage-behavioral-wave1149.test.js`.
 *
 * Per docs/blueprint/43-beneficiary-journey-operating-system.md §III gap #2 + §XVII (R2).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/session-goal-linkage-wave1149.test.js
 */

const fs = require('fs');
const path = require('path');

const CLINICAL_SESSION = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'sessions', 'models', 'ClinicalSession.js'),
  'utf-8'
);
const THERAPEUTIC_GOAL = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'goals', 'models', 'TherapeuticGoal.js'),
  'utf-8'
);

describe('R2 (W1149) — canonical session→goal forward link', () => {
  test('ClinicalSession.goalProgress[].goalId refs the CANONICAL TherapeuticGoal', () => {
    expect(CLINICAL_SESSION).toMatch(
      /goalId:\s*\{\s*type:\s*mongoose\.Schema\.Types\.ObjectId,\s*ref:\s*'TherapeuticGoal'\s*\}/
    );
  });

  test('the forward link is NOT pointed at a legacy goal model (no Goal/SmartGoal ref on goalProgress)', () => {
    // isolate the goalProgressSchema block and assert it does not ref a non-canonical goal model
    const start = CLINICAL_SESSION.indexOf('const goalProgressSchema');
    const block = CLINICAL_SESSION.slice(start, start + 600);
    expect(block).toMatch(/ref:\s*'TherapeuticGoal'/);
    expect(block).not.toMatch(/ref:\s*'SmartGoal'/);
    expect(block).not.toMatch(/ref:\s*'Goal'/);
  });
});

describe('R2 (W1149) — canonical session→goal backward link (bidirectional lock)', () => {
  test('TherapeuticGoal.progressHistory[].sessionId refs ClinicalSession (the canonical session)', () => {
    expect(THERAPEUTIC_GOAL).toMatch(
      /sessionId:\s*\{\s*type:\s*mongoose\.Schema\.Types\.ObjectId,\s*ref:\s*'ClinicalSession'\s*\}/
    );
  });
});

describe('R2 (W1149) — reverse-traversal index', () => {
  test('ClinicalSession indexes goalProgress.goalId (efficient "sessions by goal" query)', () => {
    expect(CLINICAL_SESSION).toMatch(/index\(\{\s*'goalProgress\.goalId':\s*1\s*\}\)/);
  });
});

describe('R2 (W1149) — anti-fragmentation: no redundant flat goalIds[]', () => {
  test('ClinicalSession does NOT introduce a parallel flat goalIds[] array', () => {
    // The rich goalProgress[].goalId is the single forward mechanism. A flat
    // goalIds:[{ref:'TherapeuticGoal'}] would be a second, redundant link.
    expect(CLINICAL_SESSION).not.toMatch(/goalIds:\s*\[\s*\{[\s\S]*?ref:\s*'TherapeuticGoal'/);
  });
});
