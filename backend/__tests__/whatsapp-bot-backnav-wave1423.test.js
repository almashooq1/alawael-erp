/**
 * W1423 — WhatsApp bot mid-flow back-navigation (edit a previous answer).
 *
 * Before W1423 the only way out of a multi-step flow was "رجوع" — which CANCELS
 * the whole flow (all answers lost). A user who mistyped one field had to restart.
 * W1423 adds DISTINCTIVE back triggers ("رجوع خطوة", "الخطوة السابقة", …) that
 * step back ONE question while keeping the rest of the collected data. Checked
 * before cancel so "رجوع خطوة" steps back yet a bare "رجوع" still cancels; the
 * triggers are distinctive enough not to collide with real answers.
 */
'use strict';

const flow = require('../intelligence/whatsapp-bot-flow.service');
const reg = require('../intelligence/whatsapp-bot-flow.registry');
const AR = { lang: 'ar' };

describe('W1423 — isBackTrigger (collision-safe)', () => {
  test('fires on the distinctive back phrases', () => {
    expect(reg.isBackTrigger('رجوع خطوة')).toBe(true);
    expect(reg.isBackTrigger('الخطوة السابقة')).toBe(true);
    expect(reg.isBackTrigger('go back')).toBe(true);
  });
  test('does NOT fire on cancel / valid answers (no collision)', () => {
    expect(reg.isBackTrigger('رجوع')).toBe(false); // bare cancel
    expect(reg.isBackTrigger('حجز')).toBe(false); // appointment action answer
    expect(reg.isBackTrigger('إلغاء')).toBe(false); // appointment "cancel appointment" answer
    expect(reg.isBackTrigger('محمد علي')).toBe(false); // a name answer
  });
});

describe('W1423 — back-navigation in a collecting flow', () => {
  function driveToStep2() {
    let s = { unit: null, step: 0, collected: {}, phase: null };
    s = flow.handleTurn(s, 'احجز موعد', AR).nextFlowState; // enter → step 0
    s = flow.handleTurn(s, 'حجز', AR).nextFlowState; // action → step 1
    s = flow.handleTurn(s, 'محمد علي', AR).nextFlowState; // name → step 2
    return s;
  }

  test('steps back one question and PRESERVES the collected data', () => {
    const s = driveToStep2();
    expect(s.step).toBe(2);
    const p = flow.handleTurn(s, 'رجوع خطوة', AR);
    expect(p.nextFlowState.step).toBe(1); // back to the name step
    expect(p.nextFlowState.collected).toMatchObject({ action: 'حجز', beneficiaryName: 'محمد علي' });
    expect(p.nextFlowState.phase).toBe(reg.PHASE.COLLECTING);
    expect(p.reply).toContain('رجعنا خطوة'); // the back ack
  });

  test('the back trigger text is NOT stored as an answer', () => {
    const s = driveToStep2();
    const p = flow.handleTurn(s, 'رجوع خطوة', AR);
    // step-1 key (beneficiaryName) keeps its real value, not "رجوع خطوة"
    expect(p.nextFlowState.collected.beneficiaryName).toBe('محمد علي');
  });

  test('back at the first step stays at step 0 (no underflow, no store)', () => {
    let s = { unit: null, step: 0, collected: {}, phase: null };
    s = flow.handleTurn(s, 'احجز موعد', AR).nextFlowState; // step 0
    const p = flow.handleTurn(s, 'رجوع خطوة', AR);
    expect(p.nextFlowState.step).toBe(0);
    expect(p.nextFlowState.collected.action).toBeUndefined();
  });

  test('a bare "رجوع" still CANCELS the whole flow', () => {
    const s = driveToStep2();
    const p = flow.handleTurn(s, 'رجوع', AR);
    expect(p.nextFlowState.unit).toBeNull(); // back to idle
  });
});

describe('W1423 — back from the confirm summary edits the last answer', () => {
  test('from CONFIRMING, back returns to the last step (collecting) keeping data', () => {
    const unit = reg.UNIT_BY_ID.appointment;
    const last = unit.steps.length - 1;
    const collected = { action: 'حجز', beneficiaryName: 'سارة', department: 'نطق', preferredDay: 'الأحد', preferredPeriod: 'صباح' };
    const state = { unit: 'appointment', step: last, collected, phase: reg.PHASE.CONFIRMING, lang: 'ar' };
    const p = flow.handleTurn(state, 'رجوع خطوة', AR);
    expect(p.nextFlowState.phase).toBe(reg.PHASE.COLLECTING);
    expect(p.nextFlowState.step).toBe(last);
    expect(p.nextFlowState.collected).toMatchObject(collected);
  });
});
