/**
 * Landing Config Routes — public read + admin write.
 *
 * Phase 25 Commit 2.
 *
 *   GET    /api/v1/landing/config              public — anyone can fetch
 *   PUT    /api/v1/landing/config              admin — replace whole config
 *   PATCH  /api/v1/landing/config              admin — merge partial config
 *   PATCH  /api/v1/landing/config/section/:id  admin — update one section by id
 *   POST   /api/v1/landing/config/section      admin — append a new section
 *   DELETE /api/v1/landing/config/section/:id  admin — remove a section
 *   POST   /api/v1/landing/config/reset        admin — restore defaults
 *
 * Headless-CMS content layer (full rich landing-content object, draft/publish):
 *
 *   GET    /api/v1/landing/content              public — fetch PUBLISHED content
 *   GET    /api/v1/landing/content/draft        admin — fetch draft (or published)
 *   PUT    /api/v1/landing/content/draft        admin — upsert the draft content
 *   POST   /api/v1/landing/content/publish      admin — publish draft → live
 *   POST   /api/v1/landing/content/seed         admin — seed CMS from static content
 *
 * The public GETs are by design unauthenticated — the landing page renders
 * before login. Admin writes are gated to the same role set used by the
 * forms catalog instantiate path: admin / super_admin / forms_admin.
 */

'use strict';

const express = require('express');
const LandingConfig = require('../models/LandingConfig');
const LandingContent = require('../models/LandingContent');
const { authenticate, authorize } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const router = express.Router();

const ADMIN_ROLES = ['admin', 'super_admin', 'site_admin', 'forms_admin'];

// ─── PUBLIC: fetch the live config ───────────────────────────────────────────

router.get('/config', async (_req, res) => {
  try {
    const cfg = await LandingConfig.getOrCreate('default');
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ ok: true, config: cfg.toObject() });
  } catch (err) {
    return safeError(res, err, 'landingConfig', { shape: 'ok' });
  }
});

// ─── PUBLIC: fetch the published CMS content ─────────────────────────────────

router.get('/content', async (_req, res) => {
  try {
    const doc = await LandingContent.findOne({ tenantId: 'default' });
    res.set('Cache-Control', 'public, max-age=60');
    if (!doc || doc.published == null) {
      return res.json({ ok: true, content: null });
    }
    res.json({
      ok: true,
      content: doc.published,
      version: doc.version,
      publishedAt: doc.publishedAt,
    });
  } catch (err) {
    return safeError(res, err, 'landingContent', { shape: 'ok' });
  }
});

// All write paths below require admin auth
router.use(authenticate);
router.use(authorize(ADMIN_ROLES));

// ─── ADMIN: full + partial updates ───────────────────────────────────────────

router.put('/config', async (req, res) => {
  try {
    const cfg = await LandingConfig.getOrCreate('default');
    const allowed = [
      'siteName',
      'siteNameEn',
      'sections',
      'theme',
      'seo',
      'contact',
      'social',
      'customCss',
      'customHead',
    ];
    for (const k of allowed) {
      if (req.body[k] !== undefined) cfg[k] = req.body[k];
    }
    cfg.updatedBy = req.user?._id || req.user?.id;
    cfg.updatedByName = req.user?.name || req.user?.email;
    await cfg.save();
    res.json({ ok: true, config: cfg.toObject() });
  } catch (err) {
    return safeError(res, err, 'landingConfig', { shape: 'ok' });
  }
});

router.patch('/config', async (req, res) => {
  try {
    const cfg = await LandingConfig.getOrCreate('default');
    // Merge top-level fields shallowly. For nested theme/seo/contact, do
    // a one-level merge so partial PATCHes don't blow away other keys.
    const PATCHABLE = ['siteName', 'siteNameEn', 'customCss', 'customHead'];
    for (const k of PATCHABLE) {
      if (req.body[k] !== undefined) cfg[k] = req.body[k];
    }
    if (req.body.theme) cfg.theme = { ...cfg.theme.toObject(), ...req.body.theme };
    if (req.body.seo) cfg.seo = { ...cfg.seo.toObject(), ...req.body.seo };
    if (req.body.contact) cfg.contact = { ...cfg.contact.toObject(), ...req.body.contact };
    if (req.body.social) cfg.social = req.body.social;
    if (Array.isArray(req.body.sections)) cfg.sections = req.body.sections;

    cfg.updatedBy = req.user?._id || req.user?.id;
    cfg.updatedByName = req.user?.name || req.user?.email;
    await cfg.save();
    res.json({ ok: true, config: cfg.toObject() });
  } catch (err) {
    return safeError(res, err, 'landingConfig', { shape: 'ok' });
  }
});

router.patch('/config/section/:id', async (req, res) => {
  try {
    const cfg = await LandingConfig.getOrCreate('default');
    const idx = cfg.sections.findIndex(s => s.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ ok: false, error: 'SECTION_NOT_FOUND' });
    }
    const merged = { ...cfg.sections[idx].toObject(), ...req.body };
    cfg.sections.splice(idx, 1, merged);
    cfg.updatedBy = req.user?._id || req.user?.id;
    cfg.updatedByName = req.user?.name || req.user?.email;
    await cfg.save();
    res.json({ ok: true, section: cfg.sections[idx], version: cfg.version });
  } catch (err) {
    return safeError(res, err, 'landingConfig', { shape: 'ok' });
  }
});

router.post('/config/section', async (req, res) => {
  try {
    const cfg = await LandingConfig.getOrCreate('default');
    const section = req.body || {};
    if (!section.id || !section.type) {
      return res.status(400).json({ ok: false, error: 'id_and_type_required' });
    }
    if (cfg.sections.some(s => s.id === section.id)) {
      return res.status(409).json({ ok: false, error: 'SECTION_ID_EXISTS' });
    }
    if (section.order === undefined) {
      section.order = cfg.sections.length;
    }
    cfg.sections.push(section);
    cfg.updatedBy = req.user?._id || req.user?.id;
    cfg.updatedByName = req.user?.name || req.user?.email;
    await cfg.save();
    res.status(201).json({ ok: true, section, version: cfg.version });
  } catch (err) {
    return safeError(res, err, 'landingConfig', { shape: 'ok' });
  }
});

router.delete('/config/section/:id', async (req, res) => {
  try {
    const cfg = await LandingConfig.getOrCreate('default');
    const before = cfg.sections.length;
    cfg.sections = cfg.sections.filter(s => s.id !== req.params.id);
    if (cfg.sections.length === before) {
      return res.status(404).json({ ok: false, error: 'SECTION_NOT_FOUND' });
    }
    cfg.updatedBy = req.user?._id || req.user?.id;
    cfg.updatedByName = req.user?.name || req.user?.email;
    await cfg.save();
    res.json({ ok: true, version: cfg.version, remaining: cfg.sections.length });
  } catch (err) {
    return safeError(res, err, 'landingConfig', { shape: 'ok' });
  }
});

router.post('/config/reset', async (req, res) => {
  try {
    const fresh = LandingConfig.buildDefault('default');
    const cfg = await LandingConfig.findOneAndUpdate(
      { tenantId: 'default' },
      {
        ...fresh,
        updatedBy: req.user?._id,
        updatedByName: req.user?.name || req.user?.email,
        $inc: { version: 1 },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    res.json({ ok: true, config: cfg.toObject() });
  } catch (err) {
    return safeError(res, err, 'landingConfig', { shape: 'ok' });
  }
});

// ─── ADMIN: CMS content (draft / publish / seed) ─────────────────────────────

router.get('/content/draft', async (_req, res) => {
  try {
    const doc = await LandingContent.findOne({ tenantId: 'default' });
    const content = doc ? (doc.draft != null ? doc.draft : doc.published) : null;
    res.json({
      ok: true,
      content: content != null ? content : null,
      version: doc?.version || 0,
      publishedAt: doc?.publishedAt || null,
    });
  } catch (err) {
    return safeError(res, err, 'landingContent', { shape: 'ok' });
  }
});

router.put('/content/draft', async (req, res) => {
  try {
    const content = req.body?.content;
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return res.status(400).json({ ok: false, error: 'content_object_required' });
    }
    await LandingContent.findOneAndUpdate(
      { tenantId: 'default' },
      { draft: content, updatedBy: req.user?.id || req.user?.email || null },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, 'landingContent', { shape: 'ok' });
  }
});

router.post('/content/publish', async (req, res) => {
  try {
    const doc = await LandingContent.findOne({ tenantId: 'default' });
    if (!doc || doc.draft == null) {
      return res.status(400).json({ ok: false, error: 'no draft to publish' });
    }
    const publishedAt = new Date();
    const updated = await LandingContent.findOneAndUpdate(
      { tenantId: 'default' },
      {
        published: doc.draft,
        publishedAt,
        updatedBy: req.user?.id || req.user?.email || null,
        $inc: { version: 1 },
      },
      {returnDocument: 'after', setDefaultsOnInsert: true }
    );
    res.json({ ok: true, version: updated.version, publishedAt: updated.publishedAt });
  } catch (err) {
    return safeError(res, err, 'landingContent', { shape: 'ok' });
  }
});

router.post('/content/seed', async (req, res) => {
  try {
    const content = req.body?.content;
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return res.status(400).json({ ok: false, error: 'content_object_required' });
    }
    const publish = req.body?.publish === true;
    const update = {
      draft: content,
      updatedBy: req.user?.id || req.user?.email || null,
    };
    if (publish) {
      update.published = content;
      update.publishedAt = new Date();
      update.$inc = { version: 1 };
    }
    await LandingContent.findOneAndUpdate({ tenantId: 'default' }, update, {
      upsert: true, returnDocument: 'after',
      setDefaultsOnInsert: true,
    });
    res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, 'landingContent', { shape: 'ok' });
  }
});

module.exports = router;
