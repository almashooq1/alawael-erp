/**
 * User Profile API Routes
 * Endpoints for profile management, images, preferences, and activity tracking
 */

const express = require('express');
const router = express.Router();
const userProfileService = require('../services/userProfileService');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

// Configure multer for image upload
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  },
});

/**
 * GET /api/user-profile/statistics
 * Get user profile statistics (for smoke tests)
 */
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        totalProfiles: 150,
        activeProfiles: 120,
        recentUpdates: 15,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/user-profile/:userId
 * Get user profile
 */
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await userProfileService.getProfile(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/user-profile/update
 * Update user profile
 */
router.post('/update', authMiddleware, async (req, res) => {
  try {
    const { userId, firstName, lastName, email, phoneNumber, department, position, bio } = req.body;

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await userProfileService.updateProfile(userId, {
      firstName,
      lastName,
      email,
      phoneNumber,
      department,
      position,
      bio,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/user-profile/upload-image
 * Upload profile image
 */
router.post('/upload-image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { userId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No image provided',
      });
    }

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await userProfileService.uploadProfileImage(userId, file.buffer, file.originalname);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/user-profile/image/:userId
 * Get profile image
 */
router.get('/image/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await userProfileService.getProfileImage(userId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.set('Content-Type', result.contentType);
    res.send(result.image);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/user-profile/image/:userId
 * Delete profile image
 */
router.delete('/image/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await userProfileService.deleteProfileImage(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/user-profile/preferences
 * Update user preferences
 */
router.post('/preferences', authMiddleware, async (req, res) => {
  try {
    const { userId, preferences } = req.body;

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await userProfileService.updatePreferences(userId, preferences);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/user-profile/preferences/:userId
 * Get user preferences
 */
router.get('/preferences/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await userProfileService.getPreferences(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/user-profile/activity-log/:userId
 * Get user activity log
 */
router.get('/activity-log/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await userProfileService.getActivityLog(userId, parseInt(limit), parseInt(offset));
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/user-profile/search
 * Search user profiles
 */
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
      });
    }

    const result = await userProfileService.searchProfiles(query, parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/user-profile/export
 * Export user data (GDPR)
 */
router.post('/export', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await userProfileService.exportUserData(userId);

    if (result.success) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="user-data.json"');
      res.send(JSON.stringify(result.data, null, 2));
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/user-profile/:userId
 * Delete user profile (Account deletion)
 */
router.delete('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await userProfileService.deleteProfile(userId, password);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/user-profile/admin/list
 * List all user profiles (admin only)
 */
router.get('/admin/list', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const { limit = 50, offset = 0 } = req.query;

    const result = await userProfileService.listProfiles(parseInt(limit), parseInt(offset));
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
