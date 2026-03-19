/**
 * Compliance Management Routes — مسارات إدارة الامتثال
 *
 * Unified compliance API using ComplianceControl (InternalControl + ComplianceItem),
 * ComplianceLog, and ComplianceMetric models.
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Safe-require models (project uses safeRequire pattern)
let InternalControl, ComplianceItem, ComplianceLog, ComplianceMetric;
try {
  const cc = require('../models/ComplianceControl');
  InternalControl = cc.InternalControl;
  ComplianceItem = cc.ComplianceItem;
} catch (_e) {
  logger.warn('[Compliance] ComplianceControl model not loaded');
}
try {
  ComplianceLog = require('../models/ComplianceLog');
} catch (_e) {
  /* optional */
}
try {
  ComplianceMetric = require('../models/ComplianceMetric');
} catch (_e) {
  /* optional */
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة تحكم الامتثال
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const results = {};

    if (ComplianceMetric) {
      const metrics = await ComplianceMetric.find().sort({ updatedAt: -1 }).limit(10).lean();
      const statuses = await ComplianceMetric.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      results.metrics = metrics;
      results.metricSummary = Object.fromEntries(statuses.map(s => [s._id, s.count]));
    }

    if (ComplianceLog) {
      const [openIssues, criticalCount, recentLogs] = await Promise.all([
        ComplianceLog.countDocuments({ status: 'OPEN' }),
        ComplianceLog.countDocuments({ severity: 'CRITICAL', status: 'OPEN' }),
        ComplianceLog.find().sort({ detectedAt: -1 }).limit(10).lean(),
      ]);
      results.openIssues = openIssues;
      results.criticalIssues = criticalCount;
      results.recentLogs = recentLogs;
    }

    if (InternalControl) {
      const controlStats = await InternalControl.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      results.controlStatus = Object.fromEntries(controlStats.map(s => [s._id, s.count]));
    }

    if (ComplianceItem) {
      const itemStats = await ComplianceItem.aggregate([
        { $group: { _id: '$complianceStatus', count: { $sum: 1 } } },
      ]);
      results.itemStatus = Object.fromEntries(itemStats.map(s => [s._id, s.count]));
    }

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('[Compliance] Dashboard error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL CONTROLS — الضوابط الداخلية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/controls', async (req, res) => {
  try {
    if (!InternalControl)
      return res.json({ success: true, data: [], message: 'Model not available' });

    const { status, category, riskLevel, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (riskLevel) filter.riskLevel = riskLevel;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [controls, total] = await Promise.all([
      InternalControl.find(filter)
        .populate('owner', 'name email')
        .sort({ riskLevel: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      InternalControl.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: controls,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/controls', async (req, res) => {
  try {
    if (!InternalControl)
      return res.status(501).json({ success: false, error: 'Model not available' });
    const control = await InternalControl.create(req.body);
    res.status(201).json({ success: true, data: control });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/controls/:id', async (req, res) => {
  try {
    if (!InternalControl)
      return res.status(501).json({ success: false, error: 'Model not available' });
    const control = await InternalControl.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!control) return res.status(404).json({ success: false, error: 'الضابط غير موجود' });
    res.json({ success: true, data: control });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/controls/:id/test-result', async (req, res) => {
  try {
    if (!InternalControl)
      return res.status(501).json({ success: false, error: 'Model not available' });
    const control = await InternalControl.findById(req.params.id);
    if (!control) return res.status(404).json({ success: false, error: 'الضابط غير موجود' });

    control.testResults.push({ ...req.body, tester: req.user?._id, testDate: new Date() });
    control.lastTestDate = new Date();
    control.lastTestResult = req.body.result;
    await control.save();

    res.json({ success: true, data: control, message: 'تم إضافة نتيجة الاختبار' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE ITEMS — بنود الامتثال التنظيمي
// ═══════════════════════════════════════════════════════════════════════════

router.get('/items', async (req, res) => {
  try {
    if (!ComplianceItem)
      return res.json({ success: true, data: [], message: 'Model not available' });

    const { complianceStatus, regulatoryBody, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (complianceStatus) filter.complianceStatus = complianceStatus;
    if (regulatoryBody) filter.regulatoryBody = regulatoryBody;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [items, total] = await Promise.all([
      ComplianceItem.find(filter)
        .populate('responsiblePerson', 'name email')
        .sort({ deadline: 1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      ComplianceItem.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/items', async (req, res) => {
  try {
    if (!ComplianceItem)
      return res.status(501).json({ success: false, error: 'Model not available' });
    const item = await ComplianceItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/items/:id', async (req, res) => {
  try {
    if (!ComplianceItem)
      return res.status(501).json({ success: false, error: 'Model not available' });
    const item = await ComplianceItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ success: false, error: 'البند غير موجود' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/items/:id/evidence', async (req, res) => {
  try {
    if (!ComplianceItem)
      return res.status(501).json({ success: false, error: 'Model not available' });
    const item = await ComplianceItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'البند غير موجود' });

    item.evidence.push({ ...req.body, uploadedAt: new Date() });
    await item.save();

    res.json({ success: true, data: item, message: 'تم إضافة الإثبات' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE LOGS — سجلات الامتثال
// ═══════════════════════════════════════════════════════════════════════════

router.get('/logs', async (req, res) => {
  try {
    if (!ComplianceLog)
      return res.json({ success: true, data: [], message: 'Model not available' });

    const { domain, severity, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (domain) filter.domain = domain;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [logs, total] = await Promise.all([
      ComplianceLog.find(filter)
        .sort({ detectedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      ComplianceLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/logs', async (req, res) => {
  try {
    if (!ComplianceLog)
      return res.status(501).json({ success: false, error: 'Model not available' });
    const log = await ComplianceLog.create(req.body);
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/logs/:id/resolve', async (req, res) => {
  try {
    if (!ComplianceLog)
      return res.status(501).json({ success: false, error: 'Model not available' });
    const log = await ComplianceLog.findByIdAndUpdate(
      req.params.id,
      { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy: req.user?._id },
      { new: true }
    );
    if (!log) return res.status(404).json({ success: false, error: 'السجل غير موجود' });
    res.json({ success: true, data: log, message: 'تم حل المشكلة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// METRICS — مقاييس الامتثال
// ═══════════════════════════════════════════════════════════════════════════

router.get('/metrics', async (req, res) => {
  try {
    if (!ComplianceMetric)
      return res.json({ success: true, data: [], message: 'Model not available' });

    const { status, metricType, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (metricType) filter.metricType = metricType;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [metrics, total] = await Promise.all([
      ComplianceMetric.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      ComplianceMetric.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: metrics,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/metrics', async (req, res) => {
  try {
    if (!ComplianceMetric)
      return res.status(501).json({ success: false, error: 'Model not available' });
    const metric = await ComplianceMetric.create(req.body);
    res.status(201).json({ success: true, data: metric });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/metrics/:id', async (req, res) => {
  try {
    if (!ComplianceMetric)
      return res.status(501).json({ success: false, error: 'Model not available' });
    const metric = await ComplianceMetric.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!metric) return res.status(404).json({ success: false, error: 'المقياس غير موجود' });
    res.json({ success: true, data: metric });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
