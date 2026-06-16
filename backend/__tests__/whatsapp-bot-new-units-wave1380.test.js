'use strict';

/**
 * W1380 — new WhatsApp bot service units (expansion bundle A):
 *   11 FAQ · 12 location/directions · 13 satisfaction survey · 14 emergency.
 *
 * Pure static + behavioral FSM tests, no DB (the engine is side-effect free).
 */

const reg = require('../intelligence/whatsapp-bot-flow.registry');
const engine = require('../intelligence/whatsapp-bot-flow.service');

function walk(turns, ctx = {}) {
  let state = { unit: null, step: 0, collected: {}, phase: null };
  const out = [];
  for (const text of turns) {
    const plan = engine.handleTurn(state, text, ctx);
    state = plan.nextFlowState;
    out.push(plan);
  }
  return { plans: out, finalState: state, last: out[out.length - 1] };
}

describe('W1380 static — new units registered', () => {
  test('the 4 new units exist at menu positions 11-14', () => {
    const ids = reg.UNITS.map(u => u.id);
    expect(ids.slice(10)).toEqual(['faq', 'location', 'satisfaction', 'emergency']);
  });

  test('new side-effect kinds + per-unit mapping', () => {
    expect(reg.SIDE_EFFECT.SUBMIT_SATISFACTION).toBe('submit_satisfaction');
    expect(reg.SIDE_EFFECT.EMERGENCY_ESCALATION).toBe('emergency_escalation');
    expect(reg.UNIT_BY_ID.faq.sideEffect).toBe(reg.SIDE_EFFECT.NONE);
    expect(reg.UNIT_BY_ID.location.sideEffect).toBe(reg.SIDE_EFFECT.NONE);
    expect(reg.UNIT_BY_ID.satisfaction.sideEffect).toBe(reg.SIDE_EFFECT.SUBMIT_SATISFACTION);
    expect(reg.UNIT_BY_ID.emergency.sideEffect).toBe(reg.SIDE_EFFECT.EMERGENCY_ESCALATION);
  });

  test('none of the new units ask for a confirm step', () => {
    for (const id of ['faq', 'location', 'satisfaction', 'emergency']) {
      expect(reg.UNIT_BY_ID[id].confirm).toBe(false);
    }
  });

  test('FAQ has 6 topics; emergency intro warns about 997', () => {
    expect(Object.keys(reg.FAQ_ANSWERS).sort()).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(reg.UNIT_BY_ID.emergency.intro).toMatch(/997/);
  });
});

describe('W1380 static — helpers', () => {
  test('parseMenuSelection now accepts 11-14', () => {
    expect(reg.parseMenuSelection('11')).toBe(11);
    expect(reg.parseMenuSelection('14')).toBe(14);
    expect(reg.parseMenuSelection('١٤')).toBe(14); // Arabic-Indic 14
    expect(reg.parseMenuSelection('15')).toBeNull();
  });

  test('resolveFaqAnswer maps numbers to answers + graceful fallback', () => {
    expect(reg.resolveFaqAnswer('1')).toMatch(/أوقات العمل/);
    expect(reg.resolveFaqAnswer('5')).toMatch(/خطوات التسجيل/);
    expect(reg.resolveFaqAnswer('٦')).toMatch(/النقل|المواصلات/); // Arabic digit
    expect(reg.resolveFaqAnswer('9')).toMatch(/لم أتعرّف/);
    expect(reg.resolveFaqAnswer('')).toMatch(/لم أتعرّف/);
  });

  test('keyword routing reaches the new units', () => {
    expect(reg.resolveUnitId('وين موقعكم')).toBe('location');
    expect(reg.resolveUnitId('أبغى أقيّم الخدمة')).toBe('satisfaction');
    expect(reg.resolveUnitId('عندي حالة طارئة')).toBe('emergency');
    expect(reg.resolveUnitId('عندي سؤال')).toBe('faq');
  });
});

describe('W1380 behavioral — FSM walks', () => {
  test('FAQ: select 11 → pick topic 1 → working-hours answer, back to idle', () => {
    const enter = engine.handleTurn(null, '11');
    expect(enter.nextFlowState.unit).toBe('faq');
    expect(enter.reply).toMatch(/الأسئلة الشائعة/);
    const ans = engine.handleTurn(enter.nextFlowState, '1');
    expect(ans.nextFlowState.unit).toBeNull();
    expect(ans.reply).toMatch(/أوقات العمل/);
    expect(ans.sideEffect).toBeNull();
  });

  test('location (12): static info immediately, idle, no side effect', () => {
    const plan = engine.handleTurn(null, '12');
    expect(plan.nextFlowState.unit).toBeNull();
    expect(plan.reply).toMatch(/موقع|أوقات العمل/);
    expect(plan.sideEffect).toBeNull();
  });

  test('satisfaction (13): collect rating + comments → SUBMIT_SATISFACTION, no confirm', () => {
    const { last } = walk(['13', '5', 'الطاقم متعاون', '-']);
    expect(last.nextFlowState.unit).toBeNull();
    expect(last.sideEffect).toEqual({
      kind: reg.SIDE_EFFECT.SUBMIT_SATISFACTION,
      unit: 'satisfaction',
      collected: expect.objectContaining({ rating: '5', liked: 'الطاقم متعاون', improve: '' }),
    });
    expect(last.reply).toMatch(/شكراً/);
  });

  test('emergency (14): collect → EMERGENCY_ESCALATION immediately (no confirm) + 997 note', () => {
    const enter = engine.handleTurn(null, '14');
    expect(enter.nextFlowState.unit).toBe('emergency');
    const name = engine.handleTurn(enter.nextFlowState, 'سارة أحمد');
    const done = engine.handleTurn(name.nextFlowState, 'سقوط أثناء الجلسة');
    expect(done.nextFlowState.unit).toBeNull();
    expect(done.sideEffect).toEqual({
      kind: reg.SIDE_EFFECT.EMERGENCY_ESCALATION,
      unit: 'emergency',
      collected: { beneficiaryName: 'سارة أحمد', description: 'سقوط أثناء الجلسة' },
    });
    expect(done.reply).toMatch(/997/);
  });

  test('welcome menu now lists the new units', () => {
    const plan = engine.handleTurn(null, 'مرحبا');
    expect(plan.reply).toMatch(/الأسئلة الشائعة/);
    expect(plan.reply).toMatch(/بلاغ عاجل/);
    expect(plan.reply).toMatch(/الموقع والاتجاهات/);
  });
});
