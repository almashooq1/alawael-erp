/* eslint-disable no-unused-vars */
/**
 * Electronic Directives Routes - مسارات التوجيه الإلكتروني
 */

const express = require('express');
const router = express.Router();
const {
  directivesService,
  ElectronicDirectivesService,
} = require('./electronic-directives-service');
const authMiddleware = require('../middleware/advancedAuth');
const { stripUpdateMeta } = require('../utils/sanitize');

// Apply authentication to all routes
router.use(authMiddleware.authenticate);

// ============================================
// Directive Management
// ============================================

/**
 * @route   POST /api/directives
 * @desc    Create a new directive
 * @access  Private (Admin/Manager)
 */
router.post(
  '/',
  authMiddleware.authorize(['admin', 'manager', 'department_head']),
  async (req, res) => {
    try {
      const directive = await directivesService.createDirective(req.body, req.user._id);
      res.status(201).json({
        success: true,
        data: directive,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'حدث خطأ داخلي',
      });
    }
  }
);

/**
 * @route   GET /api/directives
 * @desc    Get all directives (with filters)
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { page, limit, status, type, priority, query } = req.query;

    let result;
    if (query) {
      result = await directivesService.searchDirectives(query, { page, limit });
    } else {
      result = await directivesService.getDirectivesForRecipient(req.user._id, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status,
        type,
        priority,
      });
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   GET /api/directives/overdue
 * @desc    Get directives with overdue actions
 * @access  Private
 */
router.get('/overdue', async (req, res) => {
  try {
    const overdueActions = await directivesService.getOverdueActions();
    res.json({
      success: true,
      data: overdueActions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   GET /api/directives/statistics
 * @desc    Get directive statistics
 * @access  Private
 */
router.get('/statistics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await directivesService.getStatistics({ startDate, endDate });
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   GET /api/directives/:id
 * @desc    Get directive by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const directive = await directivesService.Directive.findById(req.params.id);
    if (!directive) {
      return res.status(404).json({
        success: false,
        message: 'Directive not found',
      });
    }
    res.json({
      success: true,
      data: directive,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   PUT /api/directives/:id
 * @desc    Update directive (draft only)
 * @access  Private (Creator only)
 */
router.put('/:id', async (req, res) => {
  try {
    const directive = await directivesService.Directive.findById(req.params.id);
    if (!directive) {
      return res.status(404).json({
        success: false,
        message: 'Directive not found',
      });
    }

    if (directive.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft directives can be updated',
      });
    }

    if (directive.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this directive',
      });
    }

    Object.assign(directive, stripUpdateMeta(req.body));
    directive.updatedBy = req.user._id;
    directive.updatedAt = new Date();
    await directive.save();

    res.json({
      success: true,
      data: directive,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   POST /api/directives/:id/issue
 * @desc    Issue a directive
 * @access  Private (Admin/Manager)
 */
router.post(
  '/:id/issue',
  authMiddleware.authorize(['admin', 'manager', 'department_head']),
  async (req, res) => {
    try {
      const directive = await directivesService.issueDirective(req.params.id, req.user._id);
      res.json({
        success: true,
        message: 'Directive issued successfully',
        data: directive,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'حدث خطأ داخلي',
      });
    }
  }
);

/**
 * @route   POST /api/directives/:id/cancel
 * @desc    Cancel a directive
 * @access  Private (Admin/Manager)
 */
router.post('/:id/cancel', authMiddleware.authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required',
      });
    }

    const directive = await directivesService.cancelDirective(req.params.id, req.user._id, reason);

    res.json({
      success: true,
      message: 'Directive cancelled successfully',
      data: directive,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// Recipient Actions
// ============================================

/**
 * @route   POST /api/directives/:id/read
 * @desc    Mark directive as read
 * @access  Private
 */
router.post('/:id/read', async (req, res) => {
  try {
    const directive = await directivesService.markAsRead(req.params.id, req.user._id);
    res.json({
      success: true,
      message: 'Directive marked as read',
      data: directive,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   POST /api/directives/:id/acknowledge
 * @desc    Acknowledge a directive
 * @access  Private
 */
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { response, location } = req.body;

    const result = await directivesService.acknowledgeDirective(req.params.id, req.user._id, {
      response,
      deviceInfo: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      location,
    });

    res.json({
      success: true,
      message: 'Directive acknowledged successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// Required Actions
// ============================================

/**
 * @route   POST /api/directives/:id/actions
 * @desc    Add required action to directive
 * @access  Private (Creator only)
 */
router.post('/:id/actions', async (req, res) => {
  try {
    const directive = await directivesService.Directive.findById(req.params.id);
    if (!directive) {
      return res.status(404).json({
        success: false,
        message: 'Directive not found',
      });
    }

    if (directive.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const updated = await directivesService.addRequiredAction(req.params.id, req.body);
    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   PUT /api/directives/:id/actions/:actionIndex/complete
 * @desc    Complete an action
 * @access  Private (Assignee only)
 */
router.put('/:id/actions/:actionIndex/complete', async (req, res) => {
  try {
    const { notes } = req.body;
    const directive = await directivesService.Directive.findById(req.params.id);

    if (!directive) {
      return res.status(404).json({
        success: false,
        message: 'Directive not found',
      });
    }

    const action = directive.requiredActions[req.params.actionIndex];
    if (!action) {
      return res.status(404).json({
        success: false,
        message: 'Action not found',
      });
    }

    if (action.assignee && action.assignee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this action',
      });
    }

    const updated = await directivesService.completeAction(
      req.params.id,
      parseInt(req.params.actionIndex),
      req.user._id,
      notes
    );

    res.json({
      success: true,
      message: 'Action completed successfully',
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// Attachments
// ============================================

/**
 * @route   POST /api/directives/:id/attachments
 * @desc    Upload attachment to directive
 * @access  Private (Creator only)
 */
router.post('/:id/attachments', async (req, res) => {
  try {
    const directive = await directivesService.Directive.findById(req.params.id);
    if (!directive) {
      return res.status(404).json({
        success: false,
        message: 'Directive not found',
      });
    }

    if (directive.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Assuming multer middleware handles file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    directive.attachments.push({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedBy: req.user._id,
    });

    await directive.save();

    res.json({
      success: true,
      message: 'Attachment uploaded successfully',
      data: directive.attachments[directive.attachments.length - 1],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   DELETE /api/directives/:id/attachments/:attachmentId
 * @desc    Remove attachment from directive
 * @access  Private (Creator only)
 */
router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const directive = await directivesService.Directive.findById(req.params.id);
    if (!directive) {
      return res.status(404).json({
        success: false,
        message: 'Directive not found',
      });
    }

    if (directive.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    directive.attachments = directive.attachments.filter(
      a => a._id.toString() !== req.params.attachmentId
    );

    await directive.save();

    res.json({
      success: true,
      message: 'Attachment removed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

module.exports = router;
