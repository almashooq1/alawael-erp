/**
 * reportTemplate.controller.js — Report Template Controller
 * ═══════════════════════════════════════════════════════════
 * Handles report template CRUD and versioning.
 */

'use strict';

const ReportTemplate = require('../models/ReportTemplate');
const mongoose = require('mongoose');

// ─── Template CRUD ───────────────────────────────────────────────────────

exports.getTemplates = async (req, res, next) => {
  try {
    const { category, isActive, tags, page = 1, limit = 20 } = req.query;
    const query = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (tags) query.tags = { $in: tags.split(',') };

    const [templates, total] = await Promise.all([
      ReportTemplate.find(query)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      ReportTemplate.countDocuments(query),
    ]);

    const categories = await ReportTemplate.distinct('category');

    res.json({
      success: true,
      data: templates,
      meta: { total, page: Number(page), limit: Number(limit), categories },
    });
  } catch (err) {
    next(err);
  }
};

exports.createTemplate = async (req, res, next) => {
  try {
    const template = await ReportTemplate.create({
      ...req.body,
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
};

exports.getTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await ReportTemplate.findById(id).lean();
    if (!template) return res.status(404).json({ success: false, error: { message: 'Template not found' } });
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
};

exports.updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await ReportTemplate.findByIdAndUpdate(id, req.body, {returnDocument: 'after'});
    if (!template) return res.status(404).json({ success: false, error: { message: 'Template not found' } });
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
};

exports.deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    await ReportTemplate.findByIdAndDelete(id);
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── Versioning ────────────────────────────────────────────────────────────

exports.cloneTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const original = await ReportTemplate.findById(id).lean();
    if (!original) return res.status(404).json({ success: false, error: { message: 'Template not found' } });

    const clone = await ReportTemplate.create({
      ...original,
      _id: undefined,
      name: `${original.name} (Copy)`,
      version: original.version + 1,
      parentTemplate: original._id,
      createdBy: req.user?._id,
    });

    res.status(201).json({ success: true, data: clone });
  } catch (err) {
    next(err);
  }
};

exports.getTemplateVersions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const versions = await ReportTemplate.find({
      $or: [{ _id: id }, { parentTemplate: id }],
    }).sort({ version: -1 }).lean();

    res.json({ success: true, data: versions });
  } catch (err) {
    next(err);
  }
};
