'use strict';

/**
 * W1372 — WhatsApp stateful menu-bot engine.
 *
 * Two layers (per the W356-W384 static+behavioral doctrine), both PURE — the
 * FSM does no I/O, so the "behavioral" layer is a deterministic state-machine
 * walk needing no MongoMemoryServer:
 *
 *   1. STATIC drift guard — registry shape (10 units in menu order, steps,
 *      confirm flags, side-effect mapping) + helper correctness (digit folding,
 *      menu-selection parsing, keyword routing, yes/no/cancel/skip detection).
 *   2. BEHAVIORAL — handleTurn() walks: welcome → menu → enter unit → collect →
 *      summary → confirm → closing + side effect; cancel / menu-reset; zero-step
 *      static units; read-only lookup units; home-exercise content; the unit-3
 *      "إلغاء" answer surviving (not mis-read as an abort).
 */

const reg = require('../intelligence/whatsapp-bot-flow.registry');
const engine = require('../intelligence/whatsapp-bot-flow.service');

// Drive a sequence of inbound turns, threading nextFlowState forward.
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

// ════════════════════════════════════════════════════════════════════════════
// 1. STATIC — registry shape
// ════════════════════════════════════════════════════════════════════════════
describe('W1372 static — registry shape', () => {
  test('14 units in menu order with ids + labels (10 base + W1380 service units)', () => {
    expect(reg.UNITS).toHaveLength(14);
    const ids = reg.UNITS.map(u => u.id);
    expect(ids).toEqual([
      'info',
      'register',
      'appointment',
      'attendance',
      'session_reports',
      'home_exercises',
      'billing',
      'notifications',
      'complaint',
      'human',
      'faq',
      'location',
      'satisfaction',
      'emergency',
    ]);
    for (const u of reg.UNITS) {
      expect(typeof u.label).toBe('string');
      expect(u.label.length).toBeGreaterThan(0);
      expect(Array.isArray(u.steps)).toBe(true);
    }
  });

  test('UNIT_BY_ID resolves every unit', () => {
    for (const u of reg.UNITS) expect(reg.UNIT_BY_ID[u.id]).toBe(u);
  });

  test('every collecting step has a non-empty key + prompt', () => {
    for (const u of reg.UNITS) {
      for (const s of u.steps) {
        expect(typeof s.key).toBe('string');
        expect(s.key.length).toBeGreaterThan(0);
        expect(typeof s.prompt).toBe('string');
        expect(s.prompt.length).toBeGreaterThan(0);
      }
    }
  });

  test('confirm flag matches data-changing vs read-only intent', () => {
    const confirm = reg.UNITS.filter(u => u.confirm)
      .map(u => u.id)
      .sort();
    expect(confirm).toEqual(['appointment', 'complaint', 'human', 'register']);
    // read-only / static units do NOT ask for a confirm
    for (const id of [
      'info',
      'attendance',
      'session_reports',
      'home_exercises',
      'billing',
      'notifications',
    ]) {
      expect(reg.UNIT_BY_ID[id].confirm).toBe(false);
    }
  });

  test('side-effect kinds map to the right units', () => {
    expect(reg.UNIT_BY_ID.register.sideEffect).toBe(reg.SIDE_EFFECT.CREATE_REGISTRATION);
    expect(reg.UNIT_BY_ID.appointment.sideEffect).toBe(reg.SIDE_EFFECT.CREATE_APPOINTMENT_REQUEST);
    expect(reg.UNIT_BY_ID.attendance.sideEffect).toBe(reg.SIDE_EFFECT.LOOKUP_ATTENDANCE);
    expect(reg.UNIT_BY_ID.session_reports.sideEffect).toBe(reg.SIDE_EFFECT.LOOKUP_SESSION_REPORT);
    expect(reg.UNIT_BY_ID.billing.sideEffect).toBe(reg.SIDE_EFFECT.LOOKUP_BILLING);
    expect(reg.UNIT_BY_ID.complaint.sideEffect).toBe(reg.SIDE_EFFECT.CREATE_COMPLAINT);
    expect(reg.UNIT_BY_ID.human.sideEffect).toBe(reg.SIDE_EFFECT.CALLBACK_REQUEST);
    expect(reg.UNIT_BY_ID.info.sideEffect).toBe(reg.SIDE_EFFECT.NONE);
    expect(reg.UNIT_BY_ID.notifications.sideEffect).toBe(reg.SIDE_EFFECT.NONE);
    expect(reg.UNIT_BY_ID.home_exercises.sideEffect).toBe(reg.SIDE_EFFECT.NONE);
  });

  test('registration collects the 8 spec fields', () => {
    const keys = reg.UNIT_BY_ID.register.steps.map(s => s.key);
    expect(keys).toEqual([
      'guardianName',
      'beneficiaryName',
      'age',
      'gender',
      'city',
      'guardianPhone',
      'priorDiagnosis',
      'hasReports',
    ]);
  });

  test('HOME_EXERCISES covers the 4 departments', () => {
    expect(Object.keys(reg.HOME_EXERCISES).sort()).toEqual([
      'behavior',
      'occupational',
      'special_education',
      'speech',
    ]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. STATIC — pure helpers
// ════════════════════════════════════════════════════════════════════════════
describe('W1372 static — helpers', () => {
  test('toAsciiDigits folds Arabic-Indic + Extended digits', () => {
    expect(reg.toAsciiDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(reg.toAsciiDigits('۰۱۲۳')).toBe('0123');
    expect(reg.toAsciiDigits('abc')).toBe('abc');
  });

  test('parseMenuSelection accepts 1..10 in ASCII, Arabic-Indic, decorated', () => {
    expect(reg.parseMenuSelection('1')).toBe(1);
    expect(reg.parseMenuSelection('١')).toBe(1);
    expect(reg.parseMenuSelection('10')).toBe(10);
    expect(reg.parseMenuSelection('١٠')).toBe(10);
    expect(reg.parseMenuSelection('رقم 3')).toBe(3);
    expect(reg.parseMenuSelection('1️⃣')).toBe(1);
  });

  test('parseMenuSelection rejects out-of-range + non-numeric', () => {
    expect(reg.parseMenuSelection('0')).toBeNull();
    expect(reg.parseMenuSelection('15')).toBeNull(); // 14 units now; 15 is out of range
    expect(reg.parseMenuSelection('99')).toBeNull();
    expect(reg.parseMenuSelection('مرحبا')).toBeNull();
    expect(reg.parseMenuSelection('')).toBeNull();
    expect(reg.parseMenuSelection('2026-06-20')).toBeNull(); // multi-number → not a selection
  });

  test('resolveUnitId routes free text + numbers to units', () => {
    expect(reg.resolveUnitId('2')).toBe('register');
    expect(reg.resolveUnitId('أبغى أحجز موعد')).toBe('appointment');
    expect(reg.resolveUnitId('حضوره اليوم')).toBe('attendance');
    expect(reg.resolveUnitId('عندي شكوى')).toBe('complaint');
    expect(reg.resolveUnitId('أبي أكلم موظف')).toBe('human');
    expect(reg.resolveUnitId('تمارين في البيت')).toBe('home_exercises');
    expect(reg.resolveUnitId('بلا بلا بلا')).toBeNull();
  });

  test('menu / yes / no / cancel / skip detectors', () => {
    expect(reg.isMenuTrigger('القائمة')).toBe(true);
    expect(reg.isMenuTrigger('menu')).toBe(true);
    expect(reg.isMenuTrigger('شكراً')).toBe(false);

    expect(reg.isYes('نعم')).toBe(true);
    expect(reg.isYes('أكد')).toBe(true);
    expect(reg.isYes('لا')).toBe(false);

    expect(reg.isNo('لا')).toBe(true);
    expect(reg.isNo('إلغاء')).toBe(true);
    expect(reg.isNo('نعم')).toBe(false);

    expect(reg.isCancelTrigger('رجوع')).toBe(true);
    expect(reg.isCancelTrigger('خروج')).toBe(true);
    // "إلغاء" alone is NOT an abort — it's a valid unit-3 action answer.
    expect(reg.isCancelTrigger('إلغاء')).toBe(false);

    expect(reg.isSkip('-')).toBe(true);
    expect(reg.isSkip('تخطي')).toBe(true);
    expect(reg.isSkip('أحمد')).toBe(false);
  });

  test('resolveDepartmentKey maps Arabic department names', () => {
    expect(reg.resolveDepartmentKey('علاج وظيفي')).toBe('occupational');
    expect(reg.resolveDepartmentKey('نطق وتخاطب')).toBe('speech');
    expect(reg.resolveDepartmentKey('تربية خاصة')).toBe('special_education');
    expect(reg.resolveDepartmentKey('تعديل سلوك')).toBe('behavior');
    expect(reg.resolveDepartmentKey('شيء غريب')).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. BEHAVIORAL — FSM walk-through
// ════════════════════════════════════════════════════════════════════════════
describe('W1372 behavioral — state machine', () => {
  test('greeting from idle → welcome menu, stays idle, discloses bot identity', () => {
    const plan = engine.handleTurn(null, 'السلام عليكم');
    expect(plan.handled).toBe(true);
    expect(plan.reply).toMatch(/بوت افتراضي/);
    expect(plan.reply).toMatch(/مساعد الأوائل الذكي/);
    expect(plan.reply).toMatch(/التسجيل الأولي/); // a menu line is present
    expect(plan.nextFlowState.unit).toBeNull();
    expect(plan.sideEffect).toBeNull();
  });

  test('welcome personalizes with guardian name when known', () => {
    const plan = engine.handleTurn(null, 'مرحبا', { guardianName: 'أبو خالد' });
    expect(plan.reply).toMatch(/أبو خالد/);
  });

  test('selecting "2" enters registration at step 0', () => {
    const plan = engine.handleTurn(null, '2');
    expect(plan.nextFlowState.unit).toBe('register');
    expect(plan.nextFlowState.step).toBe(0);
    expect(plan.nextFlowState.phase).toBe('collecting');
    expect(plan.reply).toMatch(/اسم ولي الأمر/);
  });

  test('full registration walk → summary → confirm → side effect', () => {
    const turns = [
      '2', // enter register
      'أحمد علي محمد', // guardianName
      'سارة أحمد علي محمد', // beneficiaryName
      '5 سنوات', // age
      'أنثى', // gender
      'الرياض', // city
      '-', // guardianPhone (skip)
      'تأخر نطق', // priorDiagnosis
      'نعم', // hasReports
    ];
    const { last, finalState } = walk(turns);

    // After the 8th answer we are in the confirming phase with a summary.
    expect(finalState.unit).toBe('register');
    expect(finalState.phase).toBe('confirming');
    expect(last.reply).toMatch(/ملخص طلبك/);
    expect(last.reply).toMatch(/سارة أحمد علي محمد/);
    expect(last.reply).toMatch(/هل تؤكد/);
    // optional skipped field is omitted from the summary
    expect(last.reply).not.toMatch(/رقم جوال ولي/);
    expect(last.sideEffect).toBeNull();

    // Confirm → closing + CREATE_REGISTRATION side effect, back to idle.
    const confirm = engine.handleTurn(finalState, 'نعم');
    expect(confirm.nextFlowState.unit).toBeNull();
    expect(confirm.sideEffect).toEqual({
      kind: reg.SIDE_EFFECT.CREATE_REGISTRATION,
      unit: 'register',
      collected: expect.objectContaining({
        guardianName: 'أحمد علي محمد',
        beneficiaryName: 'سارة أحمد علي محمد',
        guardianPhone: '',
        hasReports: 'نعم',
      }),
    });
    expect(confirm.reply).toMatch(/قسم القبول والتسجيل/);
    expect(confirm.reply).toMatch(/القائمة/); // menu hint footer
  });

  test('declining the confirmation cancels with no side effect', () => {
    const turns = [
      '10', // human callback
      'أحمد', // name
      '0501234567', // contactPhone
      'بعد العصر', // bestTime
      'استفسار تسجيل', // topic
    ];
    const { finalState } = walk(turns);
    expect(finalState.phase).toBe('confirming');

    const declined = engine.handleTurn(finalState, 'لا');
    expect(declined.sideEffect).toBeNull();
    expect(declined.nextFlowState.unit).toBeNull();
    expect(declined.reply).toMatch(/لم يُرسَل/);
  });

  test('"القائمة" resets to the main menu mid-flow', () => {
    const enter = engine.handleTurn(null, '9'); // complaint
    expect(enter.nextFlowState.unit).toBe('complaint');
    const reset = engine.handleTurn(enter.nextFlowState, 'القائمة');
    expect(reset.nextFlowState.unit).toBeNull();
    expect(reset.reply).toMatch(/مساعد الأوائل الذكي/);
  });

  test('"رجوع" aborts an in-progress flow', () => {
    const enter = engine.handleTurn(null, '2');
    const aborted = engine.handleTurn(enter.nextFlowState, 'رجوع');
    expect(aborted.nextFlowState.unit).toBeNull();
    expect(aborted.reply).toMatch(/تم إلغاء العملية/);
  });

  test('zero-step unit (info "1") returns content immediately, stays idle', () => {
    const plan = engine.handleTurn(null, '1');
    expect(plan.nextFlowState.unit).toBeNull();
    expect(plan.reply).toMatch(/الفئات التي نستقبلها|اضطراب طيف التوحد/);
    expect(plan.sideEffect).toBeNull();
  });

  test('read-only attendance lookup collects then escalates without a confirm step', () => {
    const turns = ['4', 'سارة', 'اليوم'];
    const { last } = walk(turns);
    expect(last.nextFlowState.unit).toBeNull(); // no confirm; finalized
    expect(last.sideEffect).toEqual({
      kind: reg.SIDE_EFFECT.LOOKUP_ATTENDANCE,
      unit: 'attendance',
      collected: { beneficiaryName: 'سارة', date: 'اليوم' },
    });
    expect(last.reply).toMatch(/سجل الحضور/);
  });

  test('home-exercises unit returns department-specific content (no side effect)', () => {
    const turns = ['6', 'سارة', 'نطق وتخاطب'];
    const { last } = walk(turns);
    expect(last.sideEffect).toBeNull();
    expect(last.nextFlowState.unit).toBeNull();
    expect(last.reply).toMatch(/نطق وتخاطب/);
    expect(last.reply).toMatch(/تسمية الصور/); // speech-specific exercise
  });

  test('unit-3 "إلغاء" is recorded as the action, not treated as an abort', () => {
    const enter = engine.handleTurn(null, '3');
    expect(enter.nextFlowState.unit).toBe('appointment');
    const afterAction = engine.handleTurn(enter.nextFlowState, 'إلغاء');
    // still inside the flow, advanced to step 1 (beneficiary name)
    expect(afterAction.nextFlowState.unit).toBe('appointment');
    expect(afterAction.nextFlowState.step).toBe(1);
    expect(afterAction.nextFlowState.collected.action).toBe('إلغاء');
  });

  test('free-text keyword (no number) enters the right unit from idle', () => {
    const plan = engine.handleTurn(null, 'أبغى تمارين في البيت');
    expect(plan.nextFlowState.unit).toBe('home_exercises');
  });

  test('invalid answer during confirm re-asks (does not advance or escalate)', () => {
    const turns = ['9', 'أحمد', '0500000000', '-', 'تأخر الموعد', '-'];
    const { finalState } = walk(turns);
    expect(finalState.phase).toBe('confirming');
    const noise = engine.handleTurn(finalState, 'ممكن توضح؟');
    expect(noise.sideEffect).toBeNull();
    expect(noise.nextFlowState.phase).toBe('confirming');
    expect(noise.reply).toMatch(/نعم.*لا|للتأكيد/);
  });

  test('empty / media-only inbound mid-flow re-asks the current prompt', () => {
    const enter = engine.handleTurn(null, '2');
    const empty = engine.handleTurn(enter.nextFlowState, '');
    expect(empty.nextFlowState.unit).toBe('register');
    expect(empty.reply).toMatch(/اسم ولي الأمر/);
  });
});
