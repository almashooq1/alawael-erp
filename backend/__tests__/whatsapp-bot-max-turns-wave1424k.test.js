'use strict';

/**
 * W1424k — bot auto-escalation after N consecutive unmatched / confirm-reprompt
 * turns. Before this, an idle unmatched message just re-showed the menu forever
 * and a non-yes/no reply in CONFIRMING re-asked the confirm prompt forever — a
 * confused guardian could ping-pong with the bot indefinitely with no human
 * handoff. handleTurn now counts consecutive dead-end turns and returns an
 * escalation result (escalate:true) after MAX_UNMATCHED (3).
 *
 * handleTurn is a pure function (no DB/LLM) so this is a direct behavioral test.
 */

const botFlow = require('../intelligence/whatsapp-bot-flow.service');

describe('W1424k bot max-turns auto-escalation', () => {
  test('idle unmatched escalates to a human after 3 consecutive dead-ends', () => {
    const r1 = botFlow.handleTurn({ ...botFlow.IDLE, lang: 'ar' }, 'xyzzy plugh frobnicate', {});
    expect(r1.escalate).toBeFalsy();
    expect(r1.nextFlowState.unmatchedCount).toBe(1);

    const r2 = botFlow.handleTurn(r1.nextFlowState, 'qwoeiruty zxcv', {});
    expect(r2.escalate).toBeFalsy();
    expect(r2.nextFlowState.unmatchedCount).toBe(2);

    const r3 = botFlow.handleTurn(r2.nextFlowState, 'mnbvcxz lkjhg', {});
    expect(r3.escalate).toBe(true); // 3rd consecutive dead-end → escalate
    expect(r3.handled).toBe(true);
    expect(typeof r3.reply).toBe('string');
    expect(r3.reply.length).toBeGreaterThan(0);
    expect(r3.nextFlowState.unit).toBeNull(); // flow reset to idle
    expect(r3.nextFlowState.unmatchedCount || 0).toBe(0);
  });

  test('a fresh idle turn carries no stale counter (count is per-consecutive)', () => {
    const first = botFlow.handleTurn({ ...botFlow.IDLE, lang: 'ar' }, 'asdfgh zxcvb', {});
    expect(first.nextFlowState.unmatchedCount).toBe(1);
    const fresh = botFlow.handleTurn({ ...botFlow.IDLE, lang: 'ar' }, 'poiuy mnbv', {});
    expect(fresh.escalate).toBeFalsy();
    expect(fresh.nextFlowState.unmatchedCount).toBe(1); // fresh state → 1, not 2
  });
});
