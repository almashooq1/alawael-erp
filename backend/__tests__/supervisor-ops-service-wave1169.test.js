'use strict';

/**
 * supervisor-ops-service-wave1169.test.js — pure + source guard for the
 * operational-workflow service (services/supervisorOps.service.js).
 *
 * Covers the genuine new logic: the "In-Process vs Complete" workflow-state
 * derivation (a status=completed session with no SOAP + no goalProgress is
 * "awaiting_documentation", not "documented") + the daily-board summary, plus a
 * read-only guard on the CLI report. Paired with the behavioral counterpart
 * `supervisor-ops-service-behavioral-wave1169.test.js`.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/supervisor-ops-service-wave1169.test.js
 */

const fs = require('fs');
const path = require('path');
const {
  classifySessionWorkflowState,
  isDocumented,
  summarizeDailyOps,
  WORKFLOW_STATES,
} = require('../services/supervisorOps.service');

describe('supervisorOps (W1169) — workflow-state classification (pure)', () => {
  test('exported without opening a DB connection', () => {
    expect(typeof classifySessionWorkflowState).toBe('function');
    expect(WORKFLOW_STATES).toContain('awaiting_documentation');
    expect(WORKFLOW_STATES).toContain('documented');
  });

  test('completed + SOAP filled → documented', () => {
    expect(classifySessionWorkflowState({ status: 'completed', soapNotes: 'progress noted' })).toBe(
      'documented'
    );
  });

  test('completed + goalProgress logged → documented', () => {
    expect(
      classifySessionWorkflowState({ status: 'completed', goalProgress: [{ goalId: 'g' }] })
    ).toBe('documented');
  });

  test('completed + NO documentation → awaiting_documentation (the In-Process tail)', () => {
    expect(classifySessionWorkflowState({ status: 'completed' })).toBe('awaiting_documentation');
    expect(
      classifySessionWorkflowState({ status: 'completed', soapNotes: '   ', goalProgress: [] })
    ).toBe('awaiting_documentation');
  });

  test('in_progress / scheduled / confirmed / no_show / cancelled map correctly', () => {
    expect(classifySessionWorkflowState({ status: 'in_progress' })).toBe('in_progress');
    expect(classifySessionWorkflowState({ status: 'scheduled' })).toBe('scheduled');
    expect(classifySessionWorkflowState({ status: 'confirmed' })).toBe('scheduled');
    expect(classifySessionWorkflowState({ status: 'no_show' })).toBe('no_show');
    expect(classifySessionWorkflowState({ status: 'cancelled' })).toBe('cancelled');
    expect(classifySessionWorkflowState({ status: 'late_cancel' })).toBe('cancelled');
  });

  test('isDocumented: any SOAP field OR goalProgress counts; blanks do not', () => {
    expect(isDocumented({ subjective: 'x' })).toBe(true);
    expect(isDocumented({ plan: 'next week' })).toBe(true);
    expect(isDocumented({ goalProgress: [{ goalId: 'g' }] })).toBe(true);
    expect(isDocumented({ soapNotes: '' })).toBe(false);
    expect(isDocumented({})).toBe(false);
  });
});

describe('supervisorOps (W1169) — summarizeDailyOps (pure)', () => {
  test('counts states, sums delivered minutes (only sessions that happened), and computes documentedRate', () => {
    const r = summarizeDailyOps([
      { status: 'completed', soapNotes: 'done', actualDurationMinutes: 45 }, // documented
      { status: 'completed', actualDurationMinutes: 30 }, // awaiting_documentation
      { status: 'in_progress' },
      { status: 'scheduled' },
      { status: 'no_show', actualDurationMinutes: 0 },
    ]);
    expect(r.total).toBe(5);
    expect(r.counts.documented).toBe(1);
    expect(r.counts.awaiting_documentation).toBe(1);
    expect(r.counts.in_progress).toBe(1);
    expect(r.completed).toBe(2); // documented + awaiting
    expect(r.deliveredMinutes).toBe(75); // 45 + 30 (no_show contributes 0)
    expect(r.documentedRate).toBe(50); // 1 of 2 completed are documented
    expect(r.awaitingDocumentation).toHaveLength(1);
  });

  test('no completed sessions → documentedRate defaults to 100 (nothing pending)', () => {
    expect(summarizeDailyOps([{ status: 'scheduled' }]).documentedRate).toBe(100);
    expect(summarizeDailyOps([]).total).toBe(0);
  });
});

describe('supervisorOps (W1169) — CLI report is read-only + guarded', () => {
  const SRC = fs.readFileSync(
    path.join(__dirname, '..', 'scripts', 'session-documentation-audit.js'),
    'utf-8'
  );
  test('runs main() only when invoked directly', () => {
    expect(SRC).toMatch(/if \(require\.main === module\)/);
  });
  test('performs NO mutation', () => {
    expect(SRC).not.toMatch(
      /\.(save|create|updateOne|updateMany|deleteOne|deleteMany|insertMany|insertOne|findOneAndUpdate|bulkWrite)\(/
    );
  });
});
