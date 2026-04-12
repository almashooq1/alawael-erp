'use strict';
/**
 * LocalizationEngine Routes
 * Auto-extracted from services/dddLocalizationEngine.js
 * 11 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getTranslations, t, getCoverage, refreshCache, setTranslation, listCustomTranslations, deleteTranslation, seedBuiltinTranslations, exportForTranslation, importTranslations } = require('../services/dddLocalizationEngine');
const { validate } = require('../middleware/validate');
const v = require('../validations/localization-engine.validation');

  router.get('/i18n/:locale', authenticate, async (req, res) => {
    try {
    const translations = await getTranslations(req.params.locale, req.query.namespace);
    res.json({
    success: true,
    locale: req.params.locale,
    dir: LOCALE_META[req.params.locale]?.dir || 'rtl',
    count: Object.keys(translations).length,
    translations,
    });
    } catch (e) {
      safeError(res, e, 'localization-engine');
    }
  });

  router.get('/i18n/translate/:key(*)', authenticate, async (req, res) => {
    try {
    const locale = req.query.locale || req.locale || DEFAULT_LOCALE;
    const result = await t(req.params.key, locale, req.query.namespace, req.query);
    res.json({ success: true, key: req.params.key, locale, translation: result });
    } catch (e) {
      safeError(res, e, 'localization-engine');
    }
  });

  router.get('/i18n/stats/coverage', authenticate, async (_req, res) => {
    try {
    const coverage = await getCoverage();
    res.json({ success: true, ...coverage });
    } catch (e) {
      safeError(res, e, 'localization-engine');
    }
  });

  router.get('/i18n/locales', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'localization-engine');
    }
  });

  router.get('/i18n/namespaces', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'localization-engine');
    }
  });

  router.post('/i18n/translations', authenticate, validate(v.createTranslation), async (req, res) => {
    try {
    const result = await setTranslation(req.body.key, req.body.translations, req.body);
    res.status(201).json({ success: true, translation: result });
    } catch (e) {
      safeError(res, e, 'localization-engine');
    }
  });

  router.get('/i18n/translations/custom', authenticate, async (req, res) => {
    try {
    const translations = await listCustomTranslations(req.query);
    res.json({ success: true, count: translations.length, translations });
    } catch (e) {
      safeError(res, e, 'localization-engine');
    }
  });

  router.delete('/i18n/translations/:key(*)', authenticate, async (req, res) => {
    try {
    await deleteTranslation(req.params.key, req.query.namespace);
    res.json({ success: true, message: 'Translation deleted' });
    } catch (e) {
      safeError(res, e, 'localization-engine');
    }
  });

  router.post('/i18n/seed', authenticate, async (_req, res) => {
    try {
    const result = await seedBuiltinTranslations();
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'localization-engine');
    }
  });

  router.get('/i18n/export', authenticate, async (req, res) => {
    try {
    const data = await exportForTranslation(req.query.namespace, req.query.locale || 'ar');
    res.json({ success: true, count: data.length, entries: data });
    } catch (e) {
      safeError(res, e, 'localization-engine');
    }
  });

  router.post('/i18n/import', authenticate, async (req, res) => {
    try {
    const result = await importTranslations(req.body.entries, req.body.locale || 'ar');
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'localization-engine');
    }
  });

module.exports = router;
