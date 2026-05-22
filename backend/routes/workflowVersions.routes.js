/**
 * Workflow Version History — extracted from workflowEnhanced.routes.js.
 *
 * 5 endpoints (URLs unchanged externally):
 *   GET  /versions/:definitionId                       — list
 *   GET  /versions/:definitionId/:version              — single snapshot
 *   POST /versions/:definitionId                       — create snapshot
 *   GET  /versions/:definitionId/compare/:v1/:v2       — diff
 *   POST /versions/:definitionId/:version/restore      — restore (with backup)
 */

'use strict';

const express = require('express');
const router = express.Router();

const { WorkflowDefinition } = require('../workflow/intelligent-workflow-engine');
const { WorkflowVersion } = require('../models/WorkflowEnhanced');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

/** Get version history for a definition */
router.get('/versions/:definitionId', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const versions = await WorkflowVersion.find({ workflowDefinition: req.params.definitionId })
      .populate('createdBy', 'name')
      .sort({ version: -1 })
      .lean();
    res.json({ success: true, data: versions });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Get specific version snapshot */
router.get(
  '/versions/:definitionId/:version',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const ver = await WorkflowVersion.findOne({
        workflowDefinition: req.params.definitionId,
        version: +req.params.version,
      })
        .populate('createdBy', 'name')
        .lean();
      if (!ver) return res.status(404).json({ success: false, message: 'الإصدار غير موجود' });
      res.json({ success: true, data: ver });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

/** Create version snapshot manually */
router.post('/versions/:definitionId', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const def = await WorkflowDefinition.findById(req.params.definitionId).lean();
    if (!def) return res.status(404).json({ success: false, message: 'التعريف غير موجود' });

    const latestVer = await WorkflowVersion.findOne({ workflowDefinition: def._id })
      .sort({ version: -1 })
      .lean();
    const newVersion = (latestVer?.version || 0) + 1;

    const ver = await WorkflowVersion.create({
      workflowDefinition: def._id,
      version: newVersion,
      snapshot: def,
      changeLog: req.body.changeLog || '',
      changeType: req.body.changeType || 'steps_modified',
      createdBy: uid(req),
    });

    res.status(201).json({ success: true, data: ver });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Compare two versions */
router.get(
  '/versions/:definitionId/compare/:v1/:v2',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const [ver1, ver2] = await Promise.all([
        WorkflowVersion.findOne({
          workflowDefinition: req.params.definitionId,
          version: +req.params.v1,
        }).lean(),
        WorkflowVersion.findOne({
          workflowDefinition: req.params.definitionId,
          version: +req.params.v2,
        }).lean(),
      ]);

      if (!ver1 || !ver2) {
        return res.status(404).json({ success: false, message: 'أحد الإصدارات غير موجود' });
      }

      // Simple diff: compare step counts, names, types
      const steps1 = ver1.snapshot.steps || [];
      const steps2 = ver2.snapshot.steps || [];

      const diff = {
        version1: { version: ver1.version, stepsCount: steps1.length, createdAt: ver1.createdAt },
        version2: { version: ver2.version, stepsCount: steps2.length, createdAt: ver2.createdAt },
        addedSteps: steps2
          .filter(s => !steps1.find(x => x.id === s.id))
          .map(s => ({ id: s.id, name: s.name })),
        removedSteps: steps1
          .filter(s => !steps2.find(x => x.id === s.id))
          .map(s => ({ id: s.id, name: s.name })),
        modifiedSteps: steps2
          .filter(s => {
            const orig = steps1.find(x => x.id === s.id);
            return orig && JSON.stringify(orig) !== JSON.stringify(s);
          })
          .map(s => ({ id: s.id, name: s.name })),
        settingsChanged:
          JSON.stringify(ver1.snapshot.settings) !== JSON.stringify(ver2.snapshot.settings),
      };

      res.json({ success: true, data: diff });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

/** Restore a version */
router.post(
  '/versions/:definitionId/:version/restore',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const ver = await WorkflowVersion.findOne({
        workflowDefinition: req.params.definitionId,
        version: +req.params.version,
      }).lean();
      if (!ver) return res.status(404).json({ success: false, message: 'الإصدار غير موجود' });

      // Backup current version first
      const currentDef = await WorkflowDefinition.findById(req.params.definitionId).lean();
      const latestVer = await WorkflowVersion.findOne({ workflowDefinition: currentDef._id })
        .sort({ version: -1 })
        .lean();

      await WorkflowVersion.create({
        workflowDefinition: currentDef._id,
        version: (latestVer?.version || 0) + 1,
        snapshot: currentDef,
        changeLog: `نسخة احتياطية قبل الاستعادة للإصدار ${ver.version}`,
        changeType: 'steps_modified',
        createdBy: uid(req),
      });

      // Restore
      const { _id, __v, _createdAt, _updatedAt, ...restoreData } = ver.snapshot;
      await WorkflowDefinition.findByIdAndUpdate(req.params.definitionId, {
        ...restoreData,
        updatedBy: uid(req),
      });

      res.json({ success: true, message: `تم استعادة الإصدار ${ver.version}` });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

module.exports = router;
