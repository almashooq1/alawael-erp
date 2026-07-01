'use strict';

/**
 * W1604 — two reporting-subsystem silent-failure guards (found in prod logs).
 *
 * BUG B — `recipientResolver(<role>): User.find is not a function` (22×/day):
 *   recipientResolver's `getModel(m) => m && (m.model || m)` unwrapped `.model`
 *   even for a REAL Mongoose model — but a model's `.model` is a truthy static
 *   method, so it returned that method (no `.find`). Notification/report
 *   recipient resolution silently returned [] for supervisor/executive/quality/
 *   hr/finance/branch_manager. Fixed: use the model directly when it has `.find`.
 *
 * BUG C — `[reports-scheduler] … ReportApprovalRequest validation failed:
 *   requestedBy is required` (every scheduled report): the model required
 *   `requestedBy`, but the scheduler (a cron, no user) creates the approval with
 *   requestedBy=null → every monthly/quarterly/semiannual exec/finance/quality
 *   report crashed. Fixed: `requestedBy` is optional.
 */

const path = require('path');
const fs = require('fs');

const { createRecipientResolver } = require('../services/reporting/recipientResolver');

describe('reporting recipientResolver + ReportApprovalRequest (W1604)', () => {
  test('getModel uses a real Mongoose model, not its `.model` static — resolve() returns recipients', async () => {
    const fakeUser = { _id: 'u1', email: 'a@b.com', name: 'Exec' };
    // Mimics a real Mongoose model: has `.find` AND a truthy `.model` static
    // method (the exact trap the old getModel fell into).
    const UserModel = {
      find: async () => [fakeUser],
      model: function () {},
    };
    const resolver = createRecipientResolver({
      UserModel,
      roleMap: { executive: ['ceo'] },
    });

    const recipients = await resolver.resolve('executive', null);

    // With the bug, getModel returned UserModel.model → User.find threw → the
    // resolver's catch swallowed it → []. Fixed → the real .find runs.
    expect(Array.isArray(recipients)).toBe(true);
    expect(recipients.length).toBe(1);
  });

  test('ReportApprovalRequest.requestedBy is optional (scheduled/system reports have no requester)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '..', 'models', 'ReportApprovalRequest.js'),
      'utf8'
    );
    // requestedBy must NOT be required, or the scheduler's null crashes it.
    expect(src).toMatch(/requestedBy:\s*\{[^}]*required:\s*false/);
    expect(src).not.toMatch(/requestedBy:\s*\{[^}]*required:\s*true/);
  });
});
