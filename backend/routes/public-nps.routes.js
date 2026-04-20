/**
 * public-nps.routes.js — Guardian-facing NPS submission, no auth.
 *
 * Mount at /api/public/nps. Designed for WhatsApp/SMS link delivery:
 *
 *   https://app.alawael.com/survey?key=2026-Q2&g=<guardianId>&b=<beneficiaryId>
 *
 * The frontend calls POST /submit with the same params + score +
 * optional comment. No JWT needed — guardian is identified by the
 * link parameters. Production hardening should add HMAC signature
 * validation on the link itself; for now we rely on the unique-index
 * constraint to prevent ballot-stuffing per (surveyKey, guardianId,
 * beneficiaryId).
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const NpsResponse = require('../models/NpsResponse');
const Guardian = require('../models/Guardian');
const nps = require('../services/npsService');
const safeError = require('../utils/safeError');

// ── POST /submit — guardian-self-service NPS submission ────────────────
router.post('/submit', async (req, res) => {
  try {
    const { surveyKey, guardianId, beneficiaryId, score, comment, sourceChannel, locale } =
      req.body || {};

    if (!surveyKey?.trim?.()) {
      return res.status(400).json({ success: false, message: 'surveyKey مطلوب' });
    }
    if (!guardianId || !mongoose.isValidObjectId(guardianId)) {
      return res.status(400).json({ success: false, message: 'guardianId مطلوب' });
    }
    const s = Number(score);
    if (!Number.isFinite(s) || s < 0 || s > 10) {
      return res.status(400).json({ success: false, message: 'score يجب أن يكون 0..10' });
    }

    // Verify the guardian actually exists — prevents random IDs being
    // sprayed to inflate sample size.
    const guardian = await Guardian.findById(guardianId).select('branchId').lean();
    if (!guardian) {
      return res.status(404).json({ success: false, message: 'الولي غير موجود' });
    }

    try {
      const row = await NpsResponse.create({
        surveyKey: String(surveyKey).trim(),
        guardianId,
        beneficiaryId:
          beneficiaryId && mongoose.isValidObjectId(beneficiaryId) ? beneficiaryId : undefined,
        branchId: guardian.branchId,
        score: s,
        bucket: nps.bucket(s),
        comment: comment ? String(comment).slice(0, 2000) : undefined,
        sourceChannel: sourceChannel || 'web',
        locale: locale || 'ar',
        submittedAt: new Date(),
      });
      res.status(201).json({
        success: true,
        message: 'شكراً لمشاركتك',
        id: row._id,
      });
    } catch (createErr) {
      // Unique constraint hit = guardian already responded for this campaign.
      if (createErr.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'تم تسجيل ردك سابقاً لهذه الحملة — شكراً.',
        });
      }
      throw createErr;
    }
  } catch (err) {
    return safeError(res, err, 'public-nps.submit');
  }
});

// ── GET /verify — link sanity check before showing the form ─────────────
// Returns { ok: true, guardianName } if the link's guardianId resolves.
// Used by the frontend to render "أهلاً يا <name>" before the form.
router.get('/verify', async (req, res) => {
  try {
    const { guardianId, surveyKey } = req.query;
    if (!guardianId || !mongoose.isValidObjectId(guardianId) || !surveyKey) {
      return res.status(400).json({ success: false, message: 'الرابط غير صالح' });
    }
    const guardian = await Guardian.findById(guardianId).select('firstName_ar lastName_ar').lean();
    if (!guardian) {
      return res.status(404).json({ success: false, message: 'الولي غير موجود' });
    }
    // Check if already responded for this campaign.
    const existing = await NpsResponse.findOne({ surveyKey: String(surveyKey), guardianId })
      .select('_id')
      .lean();
    res.json({
      success: true,
      guardianName: [guardian.firstName_ar, guardian.lastName_ar].filter(Boolean).join(' ') || '—',
      alreadyResponded: !!existing,
    });
  } catch (err) {
    return safeError(res, err, 'public-nps.verify');
  }
});

module.exports = router;
