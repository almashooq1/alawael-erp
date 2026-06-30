'use strict';

/**
 * W1424g — sendNotification enqueues to the DLQ on a terminal failure.
 *
 * The automation/subscriber sends (post-session summary, complaint-resolved,
 * waitlist, appointment reminders) all route through whatsappService.
 * sendNotification, NOT through the routes' withSendGuards — so a Meta failure
 * after the in-call retries dropped the notification with no replay. This guard
 * locks the DLQ enqueue + the exact replay payload shape.
 *
 * (Static guard: in test mode sendTemplate STUB-succeeds, so the failure branch
 * can't be exercised without a real failing Meta call, and the internal
 * sendTemplate call isn't separately mockable. The shape is verified statically.)
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'whatsapp', 'whatsappService.js'),
  'utf8'
);
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

function region() {
  const start = CODE.indexOf('async function sendNotification');
  expect(start).toBeGreaterThan(-1);
  return CODE.slice(start, start + 1500);
}

describe('W1424g sendNotification DLQ-on-failure (static)', () => {
  test('enqueues a DLQ entry gated on send failure', () => {
    const r = region();
    expect(r).toMatch(/result\.success\s*===\s*false|!result/);
    expect(r).toMatch(/\.enqueue\(\s*['"]template['"]/);
  });

  test('the DLQ payload matches dispatchByType(template) replay shape', () => {
    const r = region();
    expect(r).toMatch(/templateName:\s*['"]notification['"]/);
    expect(r).toMatch(/language:\s*['"]ar['"]/);
    expect(r).toMatch(/components/);
    expect(r).toMatch(/to,/); // payload.to
  });

  test('accepts an optional ctx param forwarded to the DLQ entry', () => {
    const r = region();
    expect(r).toMatch(/sendNotification\(to,\s*title,\s*body,\s*ctx/);
  });

  test('the send result is still returned (DLQ is best-effort, non-masking)', () => {
    const r = region();
    expect(r).toMatch(/return result;/);
  });
});
