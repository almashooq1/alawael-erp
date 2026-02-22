/**
 * Advanced Document Routes - Phase 3
 * Handles document versioning, collaboration, and workflow management
 */

const express = require('express');
const router = express.Router();
const documentCollaborationService = require('../services/documentCollaborationService');
const { authMiddleware, asyncHandler } = require('../middleware');

// Create a new version
router.post(
  '/:documentId/versions',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { content, title, contentType, changeDescription, status, tags, category } = req.body;
    const userId = req.user?._id || req.userId || 'user-123';

    if (!content || !title) {
      return res.status(400).json({ error: 'Content and title are required' });
    }

    const version = await documentCollaborationService.createVersion(
      documentId,
      userId,
      { content, title, contentType, tags, category },
      { changeDescription, status }
    );

    res.status(201).json({
      success: true,
      message: 'Document version created',
      version,
    });
  })
);

// Get document version history
router.get(
  '/:documentId/versions',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const history = await documentCollaborationService.getVersionHistory(documentId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
    });

    res.status(200).json({
      success: true,
      ...history,
    });
  })
);

// Get specific version
router.get(
  '/:documentId/versions/:versionNumber',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const DocumentVersion = require('../models/DocumentVersion');
    const { documentId, versionNumber } = req.params;

    const version = await DocumentVersion.findVersionByNumber(documentId, parseInt(versionNumber));
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.status(200).json({
      success: true,
      version,
    });
  })
);

// Restore version
router.post(
  '/:documentId/versions/:versionNumber/restore',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;
    const userId = req.user?._id || req.userId || 'user-123';

    const newVersion = await documentCollaborationService.restoreVersion(
      documentId,
      parseInt(versionNumber),
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Version restored successfully',
      version: newVersion,
    });
  })
);

// Compare versions
router.get(
  '/:documentId/versions/:version1/compare/:version2',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentId, version1, version2 } = req.params;

    const comparison = await documentCollaborationService.compareVersions(
      documentId,
      parseInt(version1),
      parseInt(version2)
    );

    res.status(200).json({
      success: true,
      comparison,
    });
  })
);

// Update workflow status
router.patch(
  '/:documentId/versions/:versionNumber/status',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;
    const { status } = req.body;
    const userId = req.user?._id || req.userId || 'user-123';

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const version = await documentCollaborationService.updateWorkflowStatus(
      documentId,
      parseInt(versionNumber),
      status,
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Workflow status updated',
      version,
    });
  })
);

// Share version with user
router.post(
  '/:documentId/versions/:versionNumber/share',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;
    const { userId, permission = 'view' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const version = await documentCollaborationService.shareVersion(
      documentId,
      parseInt(versionNumber),
      userId,
      permission
    );

    res.status(200).json({
      success: true,
      message: 'Document version shared',
      version,
    });
  })
);

// Add comment to version
router.post(
  '/:documentId/versions/:versionNumber/comments',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;
    const { comment } = req.body;
    const userId = req.user?._id || req.userId || 'user-123';

    if (!comment) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const version = await documentCollaborationService.addVersionComment(
      documentId,
      parseInt(versionNumber),
      userId,
      comment
    );

    res.status(200).json({
      success: true,
      message: 'Comment added',
      version,
    });
  })
);

// Start edit session
router.post(
  '/:documentId/versions/:versionNumber/edit-session/start',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;
    const userId = req.user?._id || req.userId || 'user-123';

    const session = await documentCollaborationService.startEditSession(
      documentId,
      parseInt(versionNumber),
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Edit session started',
      session,
    });
  })
);

// End edit session
router.post(
  '/:documentId/versions/:versionNumber/edit-session/end',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;
    const userId = req.user?._id || req.userId || 'user-123';

    const session = await documentCollaborationService.endEditSession(
      documentId,
      parseInt(versionNumber),
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Edit session ended',
      session,
    });
  })
);

// Get active collaborators
router.get(
  '/:documentId/versions/:versionNumber/collaborators',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;

    const collaborators = await documentCollaborationService.getCollaborators(
      documentId,
      parseInt(versionNumber)
    );

    res.status(200).json({
      success: true,
      collaborators,
    });
  })
);

// Archive old versions
router.post(
  '/:documentId/versions/archive',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { keepVersions = 10 } = req.body;

    const count = await documentCollaborationService.archiveOldVersions(documentId, keepVersions);

    res.status(200).json({
      success: true,
      message: 'Old versions archived',
      totalVersions: count,
    });
  })
);

module.exports = router;
