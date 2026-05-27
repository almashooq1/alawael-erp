/**
 * Generic CRUD Router Factory — مصنع مسارات CRUD العامة
 *
 * ينشئ Express Router كامل الوظائف لأي وحدة موسعة.
 * يدعم: إنشاء، قراءة، تحديث، حذف، لوحة تحكم.
 *
 * @module domains/extensions/routes/generic-crud.factory
 * @param {string} moduleName - اسم الوحدة (slug)
 * @returns {express.Router}
 */

const express = require('express');
const mongoose = require('mongoose');
const { ExtensionRecord } = require('../models/ExtensionRecord');
const { validateCreateRecord, validate } = require('../validators/extensions.validator');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * @param {string} moduleName
 * @returns {import('express').Router}
 */
function makeGenericCrudRouter(moduleName) {
  const router = express.Router();

  // ─── GET /dashboard ─────────────────────────────────────────────────
  router.get(
    '/dashboard',
    asyncHandler(async (req, res) => {
      const [total, active, recent] = await Promise.all([
        ExtensionRecord.countDocuments({ module: moduleName }),
        ExtensionRecord.countDocuments({ module: moduleName, status: 'active' }),
        ExtensionRecord.find({ module: moduleName }).sort({ createdAt: -1 }).limit(5).lean(),
      ]);
      return res.json({ success: true, data: { total, active, recent } });
    })
  );

  // ─── POST / ──────────────────────────────────────────────────────────
  router.post(
    '/',
    validate(validateCreateRecord),
    asyncHandler(async (req, res) => {
      const record = new ExtensionRecord({
        module: moduleName,
        ...req.body,
        createdBy: req.user?._id,
      });
      await record.save();
      return res.status(201).json({ success: true, data: record });
    })
  );

  // ─── GET / ───────────────────────────────────────────────────────────
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { status, beneficiaryId, episodeId, page = 1, limit = 50, search } = req.query;

      const filter = { module: moduleName };
      if (status) filter.status = status;
      if (beneficiaryId && mongoose.Types.ObjectId.isValid(beneficiaryId))
        filter.beneficiaryId = beneficiaryId;
      if (episodeId && mongoose.Types.ObjectId.isValid(episodeId)) filter.episodeId = episodeId;
      if (search) filter['data.name'] = { $regex: search, $options: 'i' };

      const skip = (Number(page) - 1) * Number(limit);
      const [records, total] = await Promise.all([
        ExtensionRecord.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
        ExtensionRecord.countDocuments(filter),
      ]);

      return res.json({
        success: true,
        data: records,
        total,
        page: Number(page),
        limit: Number(limit),
      });
    })
  );

  // ─── GET /:id ────────────────────────────────────────────────────────
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid id' });
      }
      const record = await ExtensionRecord.findOne({
        _id: req.params.id,
        module: moduleName,
      }).lean();
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      return res.json({ success: true, data: record });
    })
  );

  // ─── PUT /:id ────────────────────────────────────────────────────────
  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid id' });
      }
      const update = { ...req.body, updatedBy: req.user?._id };
      delete update.module; // prevent module override
      const record = await ExtensionRecord.findOneAndUpdate(
        { _id: req.params.id, module: moduleName },
        update,
        { returnDocument: 'after', runValidators: false }
      ).lean();
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      return res.json({ success: true, data: record });
    })
  );

  // ─── DELETE /:id ─────────────────────────────────────────────────────
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid id' });
      }
      const record = await ExtensionRecord.findOneAndDelete({
        _id: req.params.id,
        module: moduleName,
      });
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      return res.json({ success: true, message: 'Deleted' });
    })
  );

  return router;
}

module.exports = makeGenericCrudRouter;
