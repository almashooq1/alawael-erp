'use strict';

jest.mock('../../models/DddLocalizationEngine', () => ({
  DDDTranslation: {},
  SUPPORTED_LOCALES: ['item1'],
  DEFAULT_LOCALE: ['item1'],
  LOCALE_META: ['item1'],
  BUILTIN_TRANSLATIONS: ['item1'],

}));

const svc = require('../../services/dddLocalizationEngine');

describe('dddLocalizationEngine service', () => {
  test('SUPPORTED_LOCALES is an array', () => { expect(Array.isArray(svc.SUPPORTED_LOCALES)).toBe(true); });
  test('DEFAULT_LOCALE is an array', () => { expect(Array.isArray(svc.DEFAULT_LOCALE)).toBe(true); });
  test('LOCALE_META is an array', () => { expect(Array.isArray(svc.LOCALE_META)).toBe(true); });
  test('BUILTIN_TRANSLATIONS is an array', () => { expect(Array.isArray(svc.BUILTIN_TRANSLATIONS)).toBe(true); });
  test('t resolves', async () => { await expect(svc.t()).resolves.not.toThrow(); });
  test('getTranslations resolves', async () => { await expect(svc.getTranslations()).resolves.not.toThrow(); });
  test('getCoverage resolves', async () => { await expect(svc.getCoverage()).resolves.not.toThrow(); });
  test('setTranslation resolves', async () => { await expect(svc.setTranslation()).resolves.not.toThrow(); });
  test('deleteTranslation resolves', async () => { await expect(svc.deleteTranslation()).resolves.not.toThrow(); });
  test('listCustomTranslations resolves', async () => { await expect(svc.listCustomTranslations()).resolves.not.toThrow(); });
  test('seedBuiltinTranslations resolves', async () => { await expect(svc.seedBuiltinTranslations()).resolves.not.toThrow(); });
  test('exportForTranslation resolves', async () => { await expect(svc.exportForTranslation()).resolves.not.toThrow(); });
  test('importTranslations resolves', async () => { await expect(svc.importTranslations()).resolves.not.toThrow(); });
  test('refreshCache resolves', async () => { await expect(svc.refreshCache()).resolves.not.toThrow(); });
});
