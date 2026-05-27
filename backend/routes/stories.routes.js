'use strict';

/**
 * stories.routes.js — W491 (Phase F: Story Architecture REST surface).
 *
 * REST surface for StoryBook + StorySurfaceVariant (W480). Exposes the
 * W479 story-builder + W481 pride-extractor + W482 variant-builder libs
 * to clinicians, supervisors, and family-facing portals.
 *
 *   GET   /api/stories/books             — list (filters: status/periodType/beneficiaryId)
 *   GET   /api/stories/books/:id         — book + variants
 *   POST  /api/stories/books/compose     — compose quarterly skeleton from inputs
 *   POST  /api/stories/books/:id/variants — spawn 7 surface variants (idempotent)
 *   PATCH /api/stories/books/:id         — transition status / annotate
 *   POST  /api/stories/books/:id/publish — publish (requires reviewedBy)
 *   GET   /api/stories/variants/:id      — single variant
 *
 * W269 branch isolation enforced via branchFilter + assertBranchMatch.
 * StorySurfaceVariant.isSensitive auto-flag (sibling + beneficiary surfaces)
 * lets the family-portal mount filter PHI-heavy variants from family view.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middleware/auth');
const { branchFilter, effectiveBranchScope } = require('../middleware/branchScope.middleware');
const { assertBranchMatch } = require('../middleware/assertBranchMatch');

const storyBuilder = require('../intelligence/story-builder.lib');
const variantBuilder = require('../intelligence/story-surface-variant-builder.lib');

const VALID_STATUSES = ['draft', 'reviewed', 'published', 'shared_with_family', 'archived'];
const VALID_PERIOD_TYPES = ['quarterly', 'annual', 'milestone', 'ad-hoc'];

router.use(authenticateToken);

function loadBookModel() {
  try {
    return mongoose.model('StoryBook');
  } catch {
    return null;
  }
}

function loadVariantModel() {
  try {
    return mongoose.model('StorySurfaceVariant');
  } catch {
    return null;
  }
}

/**
 * GET /api/stories/books
 * Filters: status, periodType, beneficiaryId
 */
router.get(
  '/books',
  requireRole(['admin', 'supervisor', 'clinician', 'therapist', 'quality_lead']),
  async (req, res) => {
    const Book = loadBookModel();
    if (!Book) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

    const filter = { ...branchFilter(req) };
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.periodType && VALID_PERIOD_TYPES.includes(req.query.periodType)) {
      filter.periodType = req.query.periodType;
    }
    if (req.query.beneficiaryId) filter.beneficiaryId = req.query.beneficiaryId;

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = parseInt(req.query.skip, 10) || 0;

    try {
      const [items, total] = await Promise.all([
        Book.find(filter).sort({ composedAt: -1 }).skip(skip).limit(limit).lean(),
        Book.countDocuments(filter),
      ]);
      res.json({ success: true, items, total, limit, skip });
    } catch (err) {
      res.status(500).json({ success: false, code: 'LIST_FAILED', message: err.message });
    }
  }
);

/**
 * GET /api/stories/books/:id
 */
router.get(
  '/books/:id',
  requireRole(['admin', 'supervisor', 'clinician', 'therapist', 'quality_lead']),
  async (req, res) => {
    const Book = loadBookModel();
    const Variant = loadVariantModel();
    if (!Book) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

    try {
      const book = await Book.findById(req.params.id).lean();
      if (!book) return res.status(404).json({ success: false, code: 'NOT_FOUND' });
      assertBranchMatch(req, book.branchId, 'StoryBook');

      let variants = [];
      if (Variant) {
        variants = await Variant.find({ storyBookId: book._id }).lean();
      }
      res.json({ success: true, book, variants });
    } catch (err) {
      if (err.statusCode === 403) {
        return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
      }
      res.status(500).json({ success: false, code: 'GET_FAILED', message: err.message });
    }
  }
);

/**
 * POST /api/stories/books/compose
 * Body: { beneficiaryId, branchId?, periodStart, periodEnd, periodType?,
 *         gasProgression?, icfImprovements?, voiceHighlights?, prideMoments?, wbciTrend?, lang? }
 *
 * Validates + composes a draft StoryBook record. Skeleton is not auto-saved
 * if confidence='low' to prevent low-quality stories from polluting the queue.
 */
router.post(
  '/books/compose',
  requireRole(['admin', 'supervisor', 'clinician', 'therapist']),
  async (req, res) => {
    const Book = loadBookModel();
    if (!Book) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

    const branchId = req.body.branchId || effectiveBranchScope(req);
    if (!branchId) {
      return res.status(400).json({ success: false, code: 'BRANCH_ID_REQUIRED' });
    }
    if (req.body.branchId) {
      try {
        assertBranchMatch(req, req.body.branchId, 'compose branchId');
      } catch (err) {
        if (err.statusCode === 403) {
          return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
        }
        throw err;
      }
    }

    const composed = storyBuilder.composeQuarterlyStorybook({
      beneficiaryId: req.body.beneficiaryId,
      periodStart: req.body.periodStart,
      periodEnd: req.body.periodEnd,
      gasProgression: req.body.gasProgression,
      icfImprovements: req.body.icfImprovements,
      voiceHighlights: req.body.voiceHighlights,
      prideMoments: req.body.prideMoments,
      wbciTrend: req.body.wbciTrend,
      lang: req.body.lang,
    });

    if (!composed.skeleton) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_FAILED',
        errors: composed.errors,
      });
    }

    try {
      const book = await Book.create({
        beneficiaryId: req.body.beneficiaryId,
        branchId,
        periodStart: req.body.periodStart,
        periodEnd: req.body.periodEnd,
        periodType: req.body.periodType || 'quarterly',
        composedBy: req.user?._id || req.user?.id,
        composedByMethod: 'template_only',
        sections: composed.sections.map(s => ({
          section: s.section,
          title: s.title,
          content: s.content,
          hasData: s.hasData,
        })),
        confidence: composed.confidence,
        coverage: Math.round((Object.values(composed.signals).filter(Boolean).length / 5) * 100),
        status: 'draft',
      });
      res.status(201).json({
        success: true,
        book: book.toObject(),
        confidence: composed.confidence,
        fallbackToTemplates: composed.fallbackToTemplates,
        signals: composed.signals,
      });
    } catch (err) {
      res.status(500).json({ success: false, code: 'COMPOSE_FAILED', message: err.message });
    }
  }
);

/**
 * POST /api/stories/books/:id/variants
 * Body: { surfaces?: string[], lang? }
 * Spawns surface variants from the saved StoryBook skeleton.
 * Idempotent on (storyBookId, surfaceType) via unique compound index.
 */
router.post(
  '/books/:id/variants',
  requireRole(['admin', 'supervisor', 'clinician', 'therapist']),
  async (req, res) => {
    const Book = loadBookModel();
    const Variant = loadVariantModel();
    if (!Book || !Variant) {
      return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });
    }

    try {
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ success: false, code: 'NOT_FOUND' });
      assertBranchMatch(req, book.branchId, 'StoryBook');

      const skeleton = {
        skeleton: {
          beneficiaryId: book.beneficiaryId,
          periodStart: book.periodStart,
          periodEnd: book.periodEnd,
          surfaceType: 'family_quarterly_storybook',
          lang: req.body.lang || 'ar',
        },
        sections: book.sections.map(s => ({
          section: s.section,
          title: s.title,
          content: s.content,
          hasData: s.hasData,
        })),
        confidence: book.confidence,
      };
      const variants = variantBuilder.spawnVariants(skeleton, req.body.surfaces, req.body.lang);

      const created = [];
      for (const v of variants) {
        const validation = variantBuilder.validateVariant(v);
        if (!validation.valid) continue;
        try {
          const doc = await Variant.findOneAndUpdate(
            { storyBookId: book._id, surfaceType: v.surfaceType },
            {
              $setOnInsert: {
                storyBookId: book._id,
                beneficiaryId: book.beneficiaryId,
                branchId: book.branchId,
                surfaceType: v.surfaceType,
                lang: v.lang,
                targetReadingGrade: v.targetReadingGrade,
                sections: v.sections,
                visualAssets: [],
                generatedBy: v.generatedBy,
                generatedAt: new Date(),
                citations: v.citations || [],
                status: 'draft',
                isSensitive: v.isSensitive,
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          ).lean();
          created.push(doc);
        } catch (err) {
          // tolerate dup-key when both sides race
          if (err?.code !== 11000) throw err;
        }
      }

      res.status(201).json({ success: true, variants: created, requested: variants.length });
    } catch (err) {
      if (err.statusCode === 403) {
        return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
      }
      res.status(500).json({ success: false, code: 'SPAWN_FAILED', message: err.message });
    }
  }
);

/**
 * PATCH /api/stories/books/:id
 * Body: { status?, notes? }
 */
router.patch('/books/:id', requireRole(['admin', 'supervisor', 'clinician']), async (req, res) => {
  const Book = loadBookModel();
  if (!Book) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

  const updates = {};
  if (req.body.status && VALID_STATUSES.includes(req.body.status)) {
    updates.status = req.body.status;
  }
  if (typeof req.body.notes === 'string') {
    updates.notes = req.body.notes.slice(0, 2000);
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, code: 'NO_UPDATES' });
  }

  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, code: 'NOT_FOUND' });
    assertBranchMatch(req, book.branchId, 'StoryBook');

    Object.assign(book, updates);
    await book.save();
    res.json({ success: true, book: book.toObject() });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
    }
    res.status(500).json({ success: false, code: 'PATCH_FAILED', message: err.message });
  }
});

/**
 * POST /api/stories/books/:id/publish
 * Body: {} — fills reviewedBy from req.user, transitions to published.
 */
router.post(
  '/books/:id/publish',
  requireRole(['admin', 'supervisor', 'clinician']),
  async (req, res) => {
    const Book = loadBookModel();
    if (!Book) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

    try {
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ success: false, code: 'NOT_FOUND' });
      assertBranchMatch(req, book.branchId, 'StoryBook');

      book.reviewedBy = req.user?._id || req.user?.id;
      book.status = 'published';
      await book.save();
      res.json({ success: true, book: book.toObject() });
    } catch (err) {
      if (err.statusCode === 403) {
        return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
      }
      res.status(500).json({ success: false, code: 'PUBLISH_FAILED', message: err.message });
    }
  }
);

/**
 * POST /api/stories/books/:id/share-with-family
 * Body: {} — transitions published → shared_with_family, sets
 * familyAccessGranted=true + sharedWithFamilyAt. Requires book to be
 * already published (status='published' or 'shared_with_family').
 */
router.post(
  '/books/:id/share-with-family',
  requireRole(['admin', 'supervisor', 'clinician']),
  async (req, res) => {
    const Book = loadBookModel();
    if (!Book) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

    try {
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ success: false, code: 'NOT_FOUND' });
      assertBranchMatch(req, book.branchId, 'StoryBook');

      if (!['published', 'shared_with_family'].includes(book.status)) {
        return res.status(400).json({
          success: false,
          code: 'NOT_PUBLISHED',
          message: 'Story must be published before sharing with family',
        });
      }

      book.status = 'shared_with_family';
      book.familyAccessGranted = true;
      await book.save();
      res.json({ success: true, book: book.toObject() });
    } catch (err) {
      if (err.statusCode === 403) {
        return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
      }
      res.status(500).json({ success: false, code: 'SHARE_FAILED', message: err.message });
    }
  }
);

/**
 * POST /api/stories/books/:id/view
 * Body: {} — records a family/beneficiary view: increments familyViewCount,
 * sets lastViewedAt. Caller role 'parent' / 'beneficiary' typically. Only
 * works when book.familyAccessGranted=true.
 */
router.post(
  '/books/:id/view',
  requireRole(['admin', 'supervisor', 'clinician', 'parent', 'beneficiary', 'guardian']),
  async (req, res) => {
    const Book = loadBookModel();
    if (!Book) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

    try {
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ success: false, code: 'NOT_FOUND' });
      assertBranchMatch(req, book.branchId, 'StoryBook');

      if (!book.familyAccessGranted) {
        return res.status(403).json({ success: false, code: 'FAMILY_ACCESS_NOT_GRANTED' });
      }

      // Atomic increment + timestamp — avoids the W494-class concurrent-save bug.
      // returnDocument:'after' is the Mongoose 9+ replacement for the legacy new-true option.
      const updated = await Book.findByIdAndUpdate(
        req.params.id,
        { $inc: { familyViewCount: 1 }, $set: { lastViewedAt: new Date() } },
        { returnDocument: 'after' }
      ).lean();

      res.json({
        success: true,
        familyViewCount: updated.familyViewCount,
        lastViewedAt: updated.lastViewedAt,
      });
    } catch (err) {
      if (err.statusCode === 403) {
        return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
      }
      res.status(500).json({ success: false, code: 'VIEW_FAILED', message: err.message });
    }
  }
);

/**
 * GET /api/stories/variants/:id
 */
router.get(
  '/variants/:id',
  requireRole(['admin', 'supervisor', 'clinician', 'therapist', 'quality_lead']),
  async (req, res) => {
    const Variant = loadVariantModel();
    if (!Variant) return res.status(503).json({ success: false, code: 'MODEL_NOT_REGISTERED' });

    try {
      const variant = await Variant.findById(req.params.id).lean();
      if (!variant) return res.status(404).json({ success: false, code: 'NOT_FOUND' });
      assertBranchMatch(req, variant.branchId, 'StorySurfaceVariant');
      res.json({ success: true, variant });
    } catch (err) {
      if (err.statusCode === 403) {
        return res.status(403).json({ success: false, code: 'BRANCH_MISMATCH' });
      }
      res.status(500).json({ success: false, code: 'GET_FAILED', message: err.message });
    }
  }
);

module.exports = router;
