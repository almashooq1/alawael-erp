'use strict';

/**
 * W1382 — bot intelligence & robustness (expansion bundle C):
 *   - score-based NLU routing (best match wins, not first-in-order)
 *   - idle-flow timeout reset (isFlowStale, pure, injected clock)
 *   - usage-analytics event derivation (deriveBotEvent, pure)
 */

const reg = require('../intelligence/whatsapp-bot-flow.registry');
const engine = require('../intelligence/whatsapp-bot-flow.service');

describe('W1382 — score-based NLU routing', () => {
  test('scoreUnits prefers the strongest keyword evidence', () => {
    // "موعد" (appointment) appears once; a message rich in attendance words
    // should resolve to attendance, not whichever unit is first in order.
    const a = reg.scoreUnits('أبغى أعرف الحضور والانصراف والغياب');
    expect(a.unitId).toBe('attendance');
    const b = reg.scoreUnits('بلا شيء مفهوم هنا');
    expect(b).toBeNull();
  });

  test('existing routings are preserved by the scorer', () => {
    expect(reg.resolveUnitId('أبغى أحجز موعد')).toBe('appointment');
    expect(reg.resolveUnitId('عندي شكوى على الخدمة')).toBe('complaint');
    expect(reg.resolveUnitId('وين موقعكم')).toBe('location');
    expect(reg.resolveUnitId('عندي حالة طارئة')).toBe('emergency');
    expect(reg.resolveUnitId('5')).toBe('session_reports'); // numeric still wins first
  });
});

describe('W1382 — idle-flow timeout (isFlowStale)', () => {
  const now = 1_000_000_000_000; // fixed clock
  const ttl = engine.FLOW_TTL_MS;

  test('idle flow is never stale', () => {
    expect(engine.isFlowStale({ unit: null }, now, ttl)).toBe(false);
    expect(engine.isFlowStale(null, now, ttl)).toBe(false);
  });

  test('active flow older than TTL is stale; fresh is not', () => {
    const fresh = { unit: 'register', step: 2, updatedAt: new Date(now - 60 * 1000) };
    const old = { unit: 'register', step: 2, updatedAt: new Date(now - (ttl + 60 * 1000)) };
    expect(engine.isFlowStale(fresh, now, ttl)).toBe(false);
    expect(engine.isFlowStale(old, now, ttl)).toBe(true);
  });

  test('active flow with unknown age is NOT reset (conservative)', () => {
    expect(engine.isFlowStale({ unit: 'register', step: 1 }, now, ttl)).toBe(false);
  });
});

describe('W1382 — usage analytics (deriveBotEvent)', () => {
  const idle = { unit: null, step: 0, collected: {}, phase: null };

  test('classifies menu / enter / step / complete / idle', () => {
    // menu
    expect(engine.deriveBotEvent(engine.handleTurn(null, 'مرحبا'), idle).event).toBe('menu');

    // enter a multi-step unit
    const enter = engine.handleTurn(null, '2');
    expect(engine.deriveBotEvent(enter, idle)).toEqual({ event: 'enter', unit: 'register' });

    // step within the same flow
    const step = engine.handleTurn(enter.nextFlowState, 'أحمد علي محمد');
    expect(engine.deriveBotEvent(step, enter.nextFlowState)).toEqual({
      event: 'step',
      unit: 'register',
    });

    // complete (side effect) — emergency finishes immediately
    const e1 = engine.handleTurn(null, '14');
    const e2 = engine.handleTurn(e1.nextFlowState, 'سارة');
    const done = engine.handleTurn(e2.nextFlowState, 'حالة عاجلة');
    expect(engine.deriveBotEvent(done, e2.nextFlowState)).toEqual({
      event: 'complete',
      unit: 'emergency',
    });
  });
});
