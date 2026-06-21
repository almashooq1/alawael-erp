/**
 * ticket-sla-scheduler-wave1437.test.js
 *
 * W1437 — SLA scheduler must use $in with active statuses instead of $nin
 * against ['resolved', 'closed'], which cannot use the status-leading
 * compound indexes and causes full collection scans in production.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/ticket-sla-scheduler-wave1437.test.js --runInBand
 */

'use strict';

const {
  checkResponseBreaches,
  checkResolutionBreaches,
  assignMissingSlaDeadlines,
  getSlaStats,
} = require('../services/ticketSlaScheduler');

function buildFakeModel() {
  const calls = [];
  return {
    calls,
    async find(q) {
      calls.push({ method: 'find', q });
      return [];
    },
    async countDocuments(q) {
      calls.push({ method: 'countDocuments', q });
      return 0;
    },
    async findByIdAndUpdate() {
      return null;
    },
  };
}

describe('W1437 — ticketSlaScheduler avoids $nin on status', () => {
  it('checkResponseBreaches queries open/in_progress with $in', async () => {
    const fakeModel = buildFakeModel();
    await checkResponseBreaches({ AdvancedTicket: fakeModel });

    const findCall = fakeModel.calls.find(c => c.method === 'find');
    expect(findCall).toBeDefined();
    expect(findCall.q.status.$in).toEqual(['open', 'in_progress']);
    expect(findCall.q.status.$nin).toBeUndefined();
  });

  it('checkResolutionBreaches queries active statuses with $in', async () => {
    const fakeModel = buildFakeModel();
    await checkResolutionBreaches({ AdvancedTicket: fakeModel });

    const findCall = fakeModel.calls.find(c => c.method === 'find');
    expect(findCall).toBeDefined();
    expect(findCall.q).toEqual({
      status: { $in: ['open', 'in_progress', 'waiting_on_customer', 'escalated'] },
    });
    expect(findCall.q.status.$nin).toBeUndefined();
  });

  it('assignMissingSlaDeadlines queries active statuses with $in', async () => {
    const fakeModel = buildFakeModel();
    await assignMissingSlaDeadlines({ AdvancedTicket: fakeModel });

    const findCall = fakeModel.calls.find(c => c.method === 'find');
    expect(findCall).toBeDefined();
    expect(findCall.q.status.$in).toEqual([
      'open',
      'in_progress',
      'waiting_on_customer',
      'escalated',
    ]);
    expect(findCall.q.status.$nin).toBeUndefined();
  });

  it('getSlaStats counts active statuses with $in', async () => {
    const fakeModel = buildFakeModel();
    await getSlaStats({ AdvancedTicket: fakeModel });

    const countCalls = fakeModel.calls.filter(c => c.method === 'countDocuments');
    expect(countCalls.length).toBe(4);
    const withActiveStatusIn = countCalls.filter(c => c.q.status && c.q.status.$in);
    expect(withActiveStatusIn.length).toBe(3);
    for (const c of withActiveStatusIn) {
      expect(c.q.status.$in).toEqual(['open', 'in_progress', 'waiting_on_customer', 'escalated']);
      expect(c.q.status.$nin).toBeUndefined();
    }
    const escalatedCall = countCalls.find(c => c.q.status === 'escalated');
    expect(escalatedCall).toBeDefined();
  });
});
