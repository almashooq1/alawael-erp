'use strict';

/**
 * W1381 — native interactive WhatsApp menu (expansion bundle B).
 *
 * Pure tests for the two-level category-list builders, the namespaced nav-reply
 * parser, category↔unit coverage, and the engine `menu` flag. The dispatcher
 * wiring (sendInteractiveList) is integration-only and smoke-loaded separately.
 */

const reg = require('../intelligence/whatsapp-bot-flow.registry');
const engine = require('../intelligence/whatsapp-bot-flow.service');

describe('W1381 — categories cover every unit exactly once', () => {
  test('all 14 units are reachable via exactly one category', () => {
    const covered = reg.MENU_CATEGORIES.flatMap(c => c.units);
    // every referenced unit exists
    for (const uid of covered) expect(reg.UNIT_BY_ID[uid]).toBeTruthy();
    // no duplicates
    expect(new Set(covered).size).toBe(covered.length);
    // covers all units
    expect(covered.slice().sort()).toEqual(
      reg.UNITS.map(u => u.id).slice().sort()
    );
  });

  test('at most 10 categories (WhatsApp list row cap)', () => {
    expect(reg.MENU_CATEGORIES.length).toBeLessThanOrEqual(10);
  });
});

describe('W1381 — buildMainMenuList', () => {
  test('one row per category, ids namespaced BOTNAV:cat:*', () => {
    const list = reg.buildMainMenuList({ guardianName: 'أبو خالد' });
    expect(list.items).toHaveLength(reg.MENU_CATEGORIES.length);
    expect(list.items.length).toBeLessThanOrEqual(10);
    for (const item of list.items) {
      expect(item.id.startsWith(`${reg.NAV_PREFIX}cat:`)).toBe(true);
      expect(typeof item.title).toBe('string');
    }
    expect(list.bodyText).toMatch(/أبو خالد/); // personalized
    expect(list.buttonLabel.length).toBeLessThanOrEqual(20);
  });
});

describe('W1381 — buildCategoryList', () => {
  test('valid category → unit rows with BOTNAV:unit:* ids and ≤24-char titles', () => {
    const sub = reg.buildCategoryList('services');
    expect(sub.items.map(i => i.id)).toEqual([
      `${reg.NAV_PREFIX}unit:info`,
      `${reg.NAV_PREFIX}unit:register`,
      `${reg.NAV_PREFIX}unit:appointment`,
    ]);
    for (const i of sub.items) expect(i.title.length).toBeLessThanOrEqual(24);
  });

  test('every category builds a non-empty sub-list within WhatsApp limits', () => {
    for (const c of reg.MENU_CATEGORIES) {
      const sub = reg.buildCategoryList(c.id);
      expect(sub).toBeTruthy();
      expect(sub.items.length).toBeGreaterThan(0);
      expect(sub.items.length).toBeLessThanOrEqual(10);
    }
  });

  test('unknown category → null', () => {
    expect(reg.buildCategoryList('nope')).toBeNull();
  });
});

describe('W1381 — parseNav', () => {
  test('parses category + unit taps', () => {
    expect(reg.parseNav('BOTNAV:cat:services')).toEqual({ kind: 'cat', id: 'services' });
    expect(reg.parseNav('BOTNAV:unit:register')).toEqual({ kind: 'unit', id: 'register' });
    expect(reg.parseNav('BOTNAV:unit:emergency')).toEqual({ kind: 'unit', id: 'emergency' });
  });

  test('rejects unknown ids, wrong kinds, foreign + empty reply ids', () => {
    expect(reg.parseNav('BOTNAV:cat:does_not_exist')).toBeNull();
    expect(reg.parseNav('BOTNAV:unit:does_not_exist')).toBeNull();
    expect(reg.parseNav('BOTNAV:bogus:x')).toBeNull();
    expect(reg.parseNav('some_other_button_id')).toBeNull(); // not a bot-menu reply
    expect(reg.parseNav('')).toBeNull();
    expect(reg.parseNav(null)).toBeNull();
  });
});

describe('W1381 — engine menu flag', () => {
  test('welcome result carries menu:true; flow prompts do not', () => {
    const welcome = engine.handleTurn(null, 'مرحبا');
    expect(welcome.menu).toBe(true);

    const inFlow = engine.handleTurn(null, '2'); // enter registration
    expect(inFlow.menu).toBeFalsy();
  });

  test('enterUnit is directly usable for a unit tap', () => {
    const plan = engine.enterUnit('faq', {});
    expect(plan.handled).toBe(true);
    expect(plan.nextFlowState.unit).toBe('faq');
  });
});
