/**
 * visualization.controller.js — Visualization Controller
 * ═══════════════════════════════════════════════════════
 * Handles chart CRUD, data rendering, and exports.
 */

'use strict';

const VisualizationChart = require('../models/VisualizationChart');

// ─── Chart CRUD ────────────────────────────────────────────────────────────

exports.getCharts = async (req, res, next) => {
  try {
    const { type, dataSource, isPublic } = req.query;
    const query = {};
    if (type) query.type = type;
    if (dataSource) query.dataSource = dataSource;
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';

    const charts = await VisualizationChart.find(query)
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    res.json({ success: true, data: charts });
  } catch (err) {
    next(err);
  }
};

exports.createChart = async (req, res, next) => {
  try {
    const chart = await VisualizationChart.create({
      ...req.body,
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: chart });
  } catch (err) {
    next(err);
  }
};

exports.getChart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const chart = await VisualizationChart.findById(id).lean();
    if (!chart) return res.status(404).json({ success: false, error: { message: 'Chart not found' } });
    res.json({ success: true, data: chart });
  } catch (err) {
    next(err);
  }
};

exports.updateChart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const chart = await VisualizationChart.findByIdAndUpdate(id, req.body, {returnDocument: 'after'});
    if (!chart) return res.status(404).json({ success: false, error: { message: 'Chart not found' } });
    res.json({ success: true, data: chart });
  } catch (err) {
    next(err);
  }
};

exports.deleteChart = async (req, res, next) => {
  try {
    const { id } = req.params;
    await VisualizationChart.findByIdAndDelete(id);
    res.json({ success: true, message: 'Chart deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── Render & Export ───────────────────────────────────────────────────────

exports.renderChart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { filters } = req.body;
    const chart = await VisualizationChart.findById(id).lean();
    if (!chart) return res.status(404).json({ success: false, error: { message: 'Chart not found' } });

    // Apply filters and generate dataset (placeholder: integrate with real data pipeline)
    const dataset = chart.dataset || { labels: [], datasets: [] };

    res.json({
      success: true,
      data: {
        chartId: id,
        type: chart.type,
        config: chart.config,
        dataset,
        filters: filters || chart.filters,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.exportChart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = 'png' } = req.query;
    const chart = await VisualizationChart.findById(id).lean();
    if (!chart) return res.status(404).json({ success: false, error: { message: 'Chart not found' } });

    res.json({
      success: true,
      data: {
        chartId: id,
        format,
        downloadUrl: null, // placeholder: generate and store file
        message: 'Export generation queued',
      },
    });
  } catch (err) {
    next(err);
  }
};
