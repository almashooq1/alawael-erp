const express = require('express');
const router = express.Router({ mergeParams: true });
const DocumentCollaborationService = require('../services/documentCollaborationService');

/**
 * Advanced Document Routes (Phase 3)
 * Base URL: /api/documents-advanced
 */

// Middleware
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  // Simplified auth - in production use JWT verification
  req.userId = req.body.userId || 'user-123';
  next();
};

router.use(authMiddleware);

/**
 * POST /api/documents-advanced/:documentId/versions
 * Create a new version
 */
router.post(
  '/:documentId/versions',
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { content, title, changeDescription, tags, category } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const newVersion = await DocumentCollaborationService.createVersion(
      documentId,
      req.userId,
      { content },
      {
        title: title || 'Untitled',
        changeDescription: changeDescription || '',
        tags: tags || [],
        category: category || '',
      }
    );

    res.status(201).json({
      success: true,
      data: newVersion,
      message: `Version ${newVersion.versionNumber} created successfully`,
    });
  })
);

/**
 * GET /api/documents-advanced/:documentId/versions
 * Get paginated version history
 */
router.get(
  '/:documentId/versions',
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { limit = 20, skip = 0, sortBy = 'versionNumber' } = req.query;

    const history = await DocumentCollaborationService.getVersionHistory(documentId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      sortBy,
    });

    res.status(200).json({
      success: true,
      data: history,
    });
  })
);

/**
 * GET /api/documents-advanced/:documentId/versions/:versionNumber
 * Get a specific version
 */
router.get(
  '/:documentId/versions/:versionNumber',
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;

    const version = await DocumentCollaborationService.getVersion(
      documentId,
      parseInt(versionNumber)
    );

    res.status(200).json({
      success: true,
      data: version,
    });
  })
);

/**
 * POST /api/documents-advanced/:documentId/versions/:versionNumber/restore
 * Restore an archived version as a new draft
 */
router.post(
  '/:documentId/versions/:versionNumber/restore',
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;
    const { restoreDescription = '' } = req.body;

    const restoredVersion = await DocumentCollaborationService.restoreVersion(
      documentId,
      parseInt(versionNumber),
      req.userId,
      restoreDescription
    );

    res.status(201).json({
      success: true,
      data: restoredVersion,
      message: `Version ${versionNumber} restored as version ${restoredVersion.versionNumber}`,
    });
  })
);

/**
 * PATCH /api/documents-advanced/:documentId/versions/:versionNumber/status
 * Update workflow status
 */
router.patch(
  '/:documentId/versions/:versionNumber/status',
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const updatedVersion = await DocumentCollaborationService.updateWorkflowStatus(
      documentId,
      parseInt(versionNumber),
      status,
      req.userId
    );

    res.status(200).json({
      success: true,
      data: updatedVersion,
      message: `Version status updated to ${status}`,
    });
  })
);

/**
 * GET /api/documents-advanced/:documentId/versions/:version1/compare/:version2
 * Compare two versions
 */
router.get(
  '/:documentId/versions/:version1/compare/:version2',
  asyncHandler(async (req, res) => {
    const { documentId, version1, version2 } = req.params;

    const comparison = await DocumentCollaborationService.compareVersions(
      documentId,
      parseInt(version1),
      parseInt(version2)
    );

    res.status(200).json({
      success: true,
      data: comparison,
    });
  })
);

/**
 * POST /api/documents-advanced/:documentId/versions/:versionNumber/share
 * Share a version with another user
 */
router.post(
  '/:documentId/versions/:versionNumber/share',
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;
    const { userId, permission = 'view' } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const sharedVersion = await DocumentCollaborationService.shareVersion(
      documentId,
      parseInt(versionNumber),
      userId,
      permission,
      req.userId
    );

    res.status(200).json({
      success: true,
      data: sharedVersion,
      message: `Version shared with permission: ${permission}`,
    });
  })
);

/**
 * POST /api/documents-advanced/:documentId/versions/:versionNumber/comments
 * Add a comment to a version
 */
router.post(
  '/:documentId/versions/:versionNumber/comments',
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;
    const { comment, position = 0 } = req.body;

    if (!comment) {
      return res.status(400).json({ success: false, error: 'Comment is required' });
    }

    const versionWithComment = await DocumentCollaborationService.addVersionComment(
      documentId,
      parseInt(versionNumber),
      req.userId,
      comment,
      position
    );

    res.status(201).json({
      success: true,
      data: versionWithComment,
      message: 'Comment added successfully',
    });
  })
);

/**
 * POST /api/documents-advanced/:documentId/versions/:versionNumber/edit-session/start
 * Start an edit session
 */
router.post(
  '/:documentId/versions/:versionNumber/edit-session/start',
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;

    const version = await DocumentCollaborationService.startEditSession(
      documentId,
      parseInt(versionNumber),
      req.userId
    );

    res.status(200).json({
      success: true,
      data: version,
      message: 'Edit session started',
    });
  })
);

/**
 * POST /api/documents-advanced/:documentId/versions/:versionNumber/edit-session/end
 * End an edit session
 */
router.post(
  '/:documentId/versions/:versionNumber/edit-session/end',
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;

    const version = await DocumentCollaborationService.endEditSession(
      documentId,
      parseInt(versionNumber),
      req.userId
    );

    res.status(200).json({
      success: true,
      data: version,
      message: 'Edit session ended',
    });
  })
);

/**
 * GET /api/documents-advanced/:documentId/versions/:versionNumber/collaborators
 * Get active collaborators on a version
 */
router.get(
  '/:documentId/versions/:versionNumber/collaborators',
  asyncHandler(async (req, res) => {
    const { documentId, versionNumber } = req.params;

    const collaborators = await DocumentCollaborationService.getCollaborators(
      documentId,
      parseInt(versionNumber)
    );

    res.status(200).json({
      success: true,
      data: collaborators,
    });
  })
);

/**
 * POST /api/documents-advanced/:documentId/versions/archive
 * Archive old versions
 */
router.post(
  '/:documentId/versions/archive',
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { keepVersions = 5 } = req.body;

    const result = await DocumentCollaborationService.archiveOldVersions(documentId, keepVersions);

    res.status(200).json({
      success: true,
      data: result,
      message: `Archived ${result.archived} versions, keeping ${result.kept} active`,
    });
  })
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Phase 3 Route Error:', error);

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
