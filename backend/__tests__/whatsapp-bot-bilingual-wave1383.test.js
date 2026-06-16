'use strict';

/**
 * W1383 — bilingual (AR/EN) bot (expansion bundle D).
 *
 * Verifies the i18n overlay resolver, language detection/toggle, and that the
 * engine renders + persists the active language. Arabic remains the default and
 * the non-breaking fallback for any untranslated field.
 */

const engine = require('../intelligence/whatsapp-bot-flow.service');
const i18n = require('../intelligence/whatsapp-bot-flow.i18n');

describe('W1383 — i18n resolver + detection', () => {
  test('pick returns English only when lang=en AND a value exists', () => {
    expect(i18n.pick('عربي', 'English', 'en')).toBe('English');
    expect(i18n.pick('عربي', 'English', 'ar')).toBe('عربي');
    expect(i18n.pick('عربي', null, 'en')).toBe('عربي'); // fallback when no en
    expect(i18n.pick('عربي', '', 'en')).toBe('عربي');
  });

  test('unit labels + framework strings localize', () => {
    expect(i18n.unitLabel('register', 'تسجيل', 'en')).toBe('New beneficiary registration');
    expect(i18n.unitLabel('register', 'تسجيل', 'ar')).toBe('تسجيل');
    expect(i18n.fw('menuHint', 'en')).toMatch(/menu/i);
    expect(i18n.fw('menuHint', 'ar')).toMatch(/القائمة/);
    expect(i18n.fw('greetingNamed', 'en', 'Sara')).toBe('Hello Sara 👋');
  });

  test('detectLangPreference switches only on explicit triggers (sticky otherwise)', () => {
    expect(i18n.detectLangPreference('english', 'ar')).toBe('en');
    expect(i18n.detectLangPreference('عربي', 'en')).toBe('ar');
    expect(i18n.detectLangPreference('en', 'ar')).toBe('en'); // whole-message short trigger
    expect(i18n.detectLangPreference('أحمد علي', 'ar')).toBe('ar'); // a normal answer keeps lang
    expect(i18n.detectLangPreference('my son', 'en')).toBe('en');
  });
});

describe('W1383 — engine renders + persists language', () => {
  test('default welcome is Arabic; ctx.lang=en yields an English welcome', () => {
    const ar = engine.handleTurn(null, 'مرحبا');
    expect(ar.reply).toMatch(/مساعد الأوائل الذكي/);
    expect(ar.nextFlowState.lang).toBe('ar');

    const en = engine.handleTurn(null, 'hi', { lang: 'en' });
    expect(en.reply).toMatch(/Smart Assistant/);
    expect(en.reply).toMatch(/About the center/); // a localized menu label
    expect(en.nextFlowState.lang).toBe('en');
  });

  test('explicit "english" switch → English menu + acknowledgement + sticky lang', () => {
    const sw = engine.handleTurn({ unit: null, lang: 'ar' }, 'english');
    expect(sw.reply).toMatch(/Language set to English/);
    expect(sw.reply).toMatch(/New beneficiary registration/);
    expect(sw.nextFlowState.lang).toBe('en');
    expect(sw.menu).toBe(true);
  });

  test('flows run in the sticky language end-to-end (English registration)', () => {
    // Enter registration while lang=en
    const enter = engine.handleTurn({ unit: null, lang: 'en' }, '2');
    expect(enter.reply).toMatch(/Guardian's full name/);
    expect(enter.nextFlowState.lang).toBe('en');

    // Walk to the summary — prompts + confirm question are English
    let state = enter.nextFlowState;
    for (const ans of ['Ahmed Ali', 'Sara Ahmed', '5y', 'female', 'Riyadh', '-', 'speech delay']) {
      state = engine.handleTurn(state, ans).nextFlowState;
    }
    const summary = engine.handleTurn(state, 'yes'); // hasReports answer → summary
    expect(summary.reply).toMatch(/Your request summary/);
    expect(summary.reply).toMatch(/Do you confirm/);
    expect(summary.nextFlowState.lang).toBe('en');

    // Confirm → English closing + side effect
    const done = engine.handleTurn(summary.nextFlowState, 'yes');
    expect(done.reply).toMatch(/admissions team/);
    expect(done.sideEffect.kind).toBe('create_registration');
    expect(done.nextFlowState.lang).toBe('en');
  });

  test('Arabic flows are unchanged (regression guard)', () => {
    const enter = engine.handleTurn(null, '2');
    expect(enter.reply).toMatch(/اسم ولي الأمر/);
    expect(enter.nextFlowState.lang).toBe('ar');
  });
});
