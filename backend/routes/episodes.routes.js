'use strict';

/**
 * episodes.routes.js — Episode of Care CRUD
 *
 * Mounted at /api/episodes (and /api/v1/episodes).
 *
 *   GET    /                          — list + filters + pagination
 *   GET    /stats                     — phase/status distribution counters
 *   GET    /beneficiary/:beneficiaryId — all episodes for a beneficiary
 *   GET    /:id                        — single episode (full)
 *   POST   /                          — create episode
 *   PATCH  /:id                        — update episode
 *   PATCH  /:id/phase                  — advance to a new phase
 *   DELETE /:id                        — archive (soft-delete)
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { branchScopedBeneficiaryParam } = require('../middleware/assertBranchMatch');
// W440: auto-enforce branch ownership on every :beneficiaryId param.
router.param('beneficiaryId', branchScopedBeneficiaryParam);

const EpisodeOfCare = require('../models/EpisodeOfCare');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'specialist',
  'coordinator',
  'social_worker',
  'nurse',
  'psychologist',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'specialist',
  'coordinator',
];

/* ── GET /stats ── */
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const [byPhase, byStatus, total] = await Promise.all([
      EpisodeOfCare.aggregate([
        { $match: { isArchived: false } },
        { $group: { _id: '$currentPhase', count: { $sum: 1 } } },
      ]),
      EpisodeOfCare.aggregate([
        { $match: { isArchived: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      EpisodeOfCare.countDocuments({ isArchived: false }),
    ]);
    return res.json({ success: true, data: { total, byPhase, byStatus } });
  } catch (err) {
    return safeError(res, err);
  }
});

/* ── GET /beneficiary/:beneficiaryId ── */
router.get('/beneficiary/:beneficiaryId', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.beneficiaryId)) {
      return res.status(400).json({ success: false, error: 'Invalid beneficiary ID' });
    }
    const episodes = await EpisodeOfCare.find({
      beneficiary: req.params.beneficiaryId,
      isArchived: false,
    })
      .populate('primaryTherapist', 'firstName lastName role')
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: episodes });
  } catch (err) {
    return safeError(res, err);
  }
});

/* ── GET / ── */
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { page = 1, limit = 15, search = '', status, currentPhase, beneficiary } = req.query;

    const filter = { isArchived: false };
    if (status) filter.status = status;
    if (currentPhase) filter.currentPhase = currentPhase;
    if (beneficiary && mongoose.Types.ObjectId.isValid(beneficiary)) {
      filter.beneficiary = beneficiary;
    }
    if (search) {
      filter.$or = [
        { episodeNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { primaryDiagnosis: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      EpisodeOfCare.find(filter)
        .populate('beneficiary', 'firstNameAr lastNameAr firstNameEn lastNameEn fileNumber')
        .populate('primaryTherapist', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      EpisodeOfCare.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return safeError(res, err);
  }
});

/* ── GET /:id ── */
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }
    const episode = await EpisodeOfCare.findById(req.params.id)
      .populate('beneficiary', 'firstNameAr lastNameAr firstNameEn lastNameEn fileNumber photo')
      .populate('primaryTherapist', 'firstName lastName role')
      .populate('team', 'firstName lastName role')
      .populate('assessments', 'type date status')
      .populate('carePlan', 'planNumber status');
    if (!episode) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }
    return res.json({ success: true, data: episode });
  } catch (err) {
    return safeError(res, err);
  }
});

/* ── POST / ── */
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const episode = new EpisodeOfCare({
      ...req.body,
      createdBy: req.user._id || req.user.id,
      phaseHistory: [
        {
          phase: req.body.currentPhase || 'referral',
          enteredAt: new Date(),
          enteredBy: req.user._id || req.user.id,
        },
      ],
    });
    await episode.save();
    logger.info(`EpisodeOfCare created: ${episode.episodeNumber} by ${req.user._id}`);
    return res.status(201).json({ success: true, data: episode });
  } catch (err) {
    return safeError(res, err);
  }
});

/* ── PATCH /:id ── */
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }
    const { currentPhase: _currentPhase, phaseHistory: _phaseHistory, ...rest } = req.body; // phase change handled separately
    const episode = await EpisodeOfCare.findByIdAndUpdate(
      req.params.id,
      { $set: rest },
      { new: true, runValidators: true }
    );
    if (!episode) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }
    return res.json({ success: true, data: episode });
  } catch (err) {
    return safeError(res, err);
  }
});

/* ── PATCH /:id/phase ── */
router.patch('/:id/phase', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }
    const { phase, notes } = req.body;
    if (!phase) {
      return res.status(400).json({ success: false, error: 'phase is required' });
    }
    const episode = await EpisodeOfCare.findById(req.params.id);
    if (!episode) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }

    // Close out current phase in history
    const now = new Date();
    const lastHistory = episode.phaseHistory[episode.phaseHistory.length - 1];
    if (lastHistory && !lastHistory.exitedAt) {
      lastHistory.exitedAt = now;
      lastHistory.durationDays = Math.floor((now - lastHistory.enteredAt) / (1000 * 60 * 60 * 24));
    }

    episode.currentPhase = phase;
    episode.phaseHistory.push({
      phase,
      enteredAt: now,
      notes,
      enteredBy: req.user._id || req.user.id,
    });
    await episode.save();
    return res.json({ success: true, data: episode });
  } catch (err) {
    return safeError(res, err);
  }
});

/* ── DELETE /:id (soft) ── */
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }
    const episode = await EpisodeOfCare.findByIdAndUpdate(
      req.params.id,
      { isArchived: true },
      { new: true }
    );
    if (!episode) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }
    return res.json({ success: true, message: 'Episode archived' });
  } catch (err) {
    return safeError(res, err);
  }
});

module.exports = router;
