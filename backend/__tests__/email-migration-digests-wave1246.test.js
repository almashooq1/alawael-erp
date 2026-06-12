'use strict';

/**
 * W1246 — legacy email-helper migration + NBA/weekly digest wiring.
 *
 * Layers:
 *  1. MIGRATION — utils/emailService.js's 3 helpers now render through the
 *     W1242 system: no inline dir="rtl" HTML remains in the file, all 3 call
 *     renderTemplate, and the injection hole is CLOSED (behavioral: a
 *     <script> title renders escaped through the real NEW_COMMUNICATION
 *     template).
 *  2. REGISTRY — the 3 new communication templates exist and are
 *     self-previewable (W1242's own guard re-validates the full catalogue,
 *     including the closed-both-ways contract, automatically).
 *  3. DIGESTS — service exposes the two builders + sendDigests; bootstrap is
 *     env-gated DEFAULT OFF, schedules the two crons Asia/Riyadh, and app.js
 *     wires it.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(BACKEND, rel), 'utf8');

const renderer = require('../services/email/templateRenderer.service');
const { getTemplate } = require('../intelligence/email-templates.registry');

describe('W1246 migration — utils/emailService.js converges on the renderer', () => {
  const src = read('utils/emailService.js');

  test('zero inline dir="rtl" HTML remains', () => {
    expect(src).not.toMatch(/dir="rtl"/);
  });

  test('all 3 helpers call renderTemplate with their registry keys', () => {
    expect((src.match(/renderTemplate\(/g) || []).length).toBe(3);
    expect(src).toContain("renderTemplate('NEW_COMMUNICATION'");
    expect(src).toContain("renderTemplate('APPROVAL_REQUEST'");
    expect(src).toContain("renderTemplate('STATUS_CHANGE'");
  });

  test('helpers keep their public signatures + send text alternative', () => {
    expect(src).toMatch(/async function sendNewCommunicationEmail\(communication, recipientEmail\)/);
    expect(src).toMatch(/async function sendApprovalRequestEmail\(communication, approverEmail, stageIndex\)/);
    expect(src).toMatch(/async function sendStatusChangeEmail\(communication, recipientEmail, oldStatus, newStatus\)/);
    expect((src.match(/text: rendered\.text/g) || []).length).toBe(3);
  });

  test('BEHAVIORAL: the legacy injection hole is closed (escaped via real template)', () => {
    const out = renderer.renderTemplate('NEW_COMMUNICATION', {
      title: '<img src=x onerror=alert(1)>',
      referenceNumber: 'COM-1',
      senderName: 'HR',
      subjectText: '"><script>x</script>',
    });
    expect(out.html).not.toContain('<img src=x');
    expect(out.html).not.toContain('<script>x</script>');
    expect(out.html).toContain('&lt;img');
    expect(out.subject).toContain('<img src=x onerror=alert(1)>'); // subject header stays raw
  });

  test('the 3 communication templates are registered with dual-CTA approval', () => {
    for (const key of ['NEW_COMMUNICATION', 'APPROVAL_REQUEST', 'STATUS_CHANGE']) {
      expect(getTemplate(key)).toBeTruthy();
      expect(renderer.renderSample(key).html).toContain('dir="rtl"');
    }
    const approval = renderer.renderSample('APPROVAL_REQUEST');
    expect(approval.html).toContain('✓ موافقة');
    expect(approval.html).toContain('✗ رفض');
  });
});

describe('W1246 digests — service + bootstrap wiring', () => {
  test('service exposes the two builders + sendDigests and is models-lazy', () => {
    const src = read('services/email/templateDigests.service.js');
    expect(src).toMatch(/buildBaselineDueEmails/);
    expect(src).toMatch(/buildWeeklySupervisorDigest/);
    expect(src).toMatch(/sendDigests/);
    expect(src).toMatch(/mongoose\.model\(/); // lazy lookups
    // refuse-to-fabricate markers
    expect(src).toMatch(/unassignedGoals/);
    expect(src).toMatch(/therapistsWithoutEmail/);
    expect(src).toMatch(/renderTemplate\('BASELINE_DUE'/);
    expect(src).toMatch(/renderTemplate\('WEEKLY_SUPERVISOR_DIGEST'/);
  });

  test('bootstrap: env-gated DEFAULT OFF + two Asia/Riyadh crons + branch list', () => {
    const src = read('startup/emailDigestsBootstrap.js');
    expect(src).toMatch(/ENABLE_EMAIL_DIGESTS/);
    expect(src).toMatch(/EMAIL_DIGEST_BRANCH_IDS/);
    expect(src).toMatch(/'30 7 \* \* \*'/); // daily 07:30
    expect(src).toMatch(/'0 7 \* \* 0'/); // Sunday 07:00
    expect((src.match(/timezone: 'Asia\/Riyadh'/g) || []).length).toBe(2);
  });

  test('BEHAVIORAL: bootstrap is inert by default (no env flag → disabled, no cron)', () => {
    delete process.env.ENABLE_EMAIL_DIGESTS;
    const { wireEmailDigests } = require('../startup/emailDigestsBootstrap');
    const logs = [];
    const out = wireEmailDigests(null, {
      logger: { info: (m) => logs.push(m), warn: (m) => logs.push(m), error: () => {} },
    });
    expect(out.enabled).toBe(false);
    expect(logs.join(' ')).toMatch(/disabled/);
  });

  test('app.js wires the bootstrap after the sweeper chain', () => {
    const src = read('app.js');
    expect(src).toContain("require('./startup/emailDigestsBootstrap').wireEmailDigests(app, { logger });");
  });
});
