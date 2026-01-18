/**
 * Advanced User Profile Service
 * Manages user profiles with advanced features
 */

const fs = require('fs').promises;
const path = require('path');
const bcryptjs = require('bcryptjs');

// In-memory storage for demo (replace with MongoDB)
let userProfiles = new Map();
let profileImages = new Map();

class UserProfileService {
  /**
   * Create or update user profile
   */
  async updateProfile(userId, profileData) {
    try {
      const profile = userProfiles.get(userId) || {
        userId,
        createdAt: new Date(),
        activityLog: [],
      };

      Object.assign(profile, profileData);
      profile.updatedAt = new Date();

      userProfiles.set(userId, profile);

      this.logActivity(userId, 'PROFILE_UPDATED', profileData);

      return {
        success: true,
        message: 'Profile updated successfully',
        profile,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    try {
      const profile = userProfiles.get(userId);

      if (!profile) {
        return {
          success: false,
          error: 'Profile not found',
        };
      }

      return {
        success: true,
        profile,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(userId, imageBuffer, filename) {
    try {
      const uploadDir = path.join(__dirname, '../../uploads/profiles');
      await fs.mkdir(uploadDir, { recursive: true });

      const imagePath = path.join(uploadDir, `${userId}-${Date.now()}.jpg`);
      await fs.writeFile(imagePath, imageBuffer);

      // Store image metadata
      profileImages.set(userId, {
        path: imagePath,
        filename: path.basename(imagePath),
        uploadedAt: new Date(),
        size: imageBuffer.length,
      });

      // Update profile
      const profile = userProfiles.get(userId) || { userId };
      profile.profileImage = path.basename(imagePath);
      userProfiles.set(userId, profile);

      this.logActivity(userId, 'PROFILE_IMAGE_UPLOADED', { filename });

      return {
        success: true,
        message: 'Profile image uploaded successfully',
        imageUrl: `/uploads/profiles/${path.basename(imagePath)}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get profile image
   */
  async getProfileImage(userId) {
    try {
      const imageData = profileImages.get(userId);

      if (!imageData) {
        return {
          success: false,
          error: 'Profile image not found',
        };
      }

      const imageBuffer = await fs.readFile(imageData.path);

      return {
        success: true,
        data: imageBuffer,
        metadata: imageData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete profile image
   */
  async deleteProfileImage(userId) {
    try {
      const imageData = profileImages.get(userId);

      if (!imageData) {
        return {
          success: false,
          error: 'Profile image not found',
        };
      }

      await fs.unlink(imageData.path);
      profileImages.delete(userId);

      // Update profile
      const profile = userProfiles.get(userId);
      if (profile) {
        profile.profileImage = null;
      }

      this.logActivity(userId, 'PROFILE_IMAGE_DELETED');

      return {
        success: true,
        message: 'Profile image deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId, preferences) {
    try {
      const profile = userProfiles.get(userId) || { userId };

      profile.preferences = {
        ...profile.preferences,
        ...preferences,
        updatedAt: new Date(),
      };

      userProfiles.set(userId, profile);

      this.logActivity(userId, 'PREFERENCES_UPDATED', preferences);

      return {
        success: true,
        message: 'Preferences updated successfully',
        preferences: profile.preferences,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId) {
    try {
      const profile = userProfiles.get(userId);
      const preferences = profile?.preferences || {};

      return {
        success: true,
        preferences: {
          language: preferences.language || 'ar',
          theme: preferences.theme || 'light',
          notifications: preferences.notifications || true,
          emailUpdates: preferences.emailUpdates || false,
          privateProfile: preferences.privateProfile || false,
          showActivity: preferences.showActivity || true,
          ...preferences,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Log user activity
   */
  logActivity(userId, action, details = {}) {
    try {
      const profile = userProfiles.get(userId) || { userId, activityLog: [] };

      if (!profile.activityLog) {
        profile.activityLog = [];
      }

      profile.activityLog.push({
        action,
        details,
        timestamp: new Date(),
        ipAddress: details.ipAddress || 'unknown',
      });

      // Keep only last 100 activities
      if (profile.activityLog.length > 100) {
        profile.activityLog = profile.activityLog.slice(-100);
      }

      userProfiles.set(userId, profile);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  /**
   * Get activity log
   */
  async getActivityLog(userId, limit = 50, offset = 0) {
    try {
      const profile = userProfiles.get(userId);

      if (!profile || !profile.activityLog) {
        return {
          success: true,
          activities: [],
          total: 0,
        };
      }

      const activities = profile.activityLog.reverse().slice(offset, offset + limit);

      return {
        success: true,
        activities,
        total: profile.activityLog.length,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(profile.activityLog.length / limit),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clear activity log
   */
  async clearActivityLog(userId) {
    try {
      const profile = userProfiles.get(userId);

      if (profile) {
        profile.activityLog = [];
      }

      this.logActivity(userId, 'ACTIVITY_LOG_CLEARED');

      return {
        success: true,
        message: 'Activity log cleared successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Export user data
   */
  async exportUserData(userId) {
    try {
      const profile = userProfiles.get(userId);
      const imageData = profileImages.get(userId);

      const exportData = {
        profile,
        profileImage: imageData
          ? {
              filename: imageData.filename,
              size: imageData.size,
              uploadedAt: imageData.uploadedAt,
            }
          : null,
        exportedAt: new Date(),
      };

      this.logActivity(userId, 'DATA_EXPORTED');

      return {
        success: true,
        data: exportData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete user profile
   */
  async deleteProfile(userId) {
    try {
      // Delete image if exists
      const imageData = profileImages.get(userId);
      if (imageData) {
        await fs.unlink(imageData.path).catch(() => {});
      }

      userProfiles.delete(userId);
      profileImages.delete(userId);

      return {
        success: true,
        message: 'Profile deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all profiles (admin only)
   */
  async getAllProfiles(limit = 100, offset = 0) {
    try {
      const profiles = Array.from(userProfiles.values()).slice(offset, offset + limit);

      return {
        success: true,
        profiles,
        total: userProfiles.size,
        page: Math.floor(offset / limit) + 1,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Search profiles
   */
  async searchProfiles(query, limit = 20) {
    try {
      const results = Array.from(userProfiles.values())
        .filter(p => {
          const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
          const email = (p.email || '').toLowerCase();
          const phone = (p.phone || '').toLowerCase();
          const q = query.toLowerCase();

          return fullName.includes(q) || email.includes(q) || phone.includes(q);
        })
        .slice(0, limit);

      return {
        success: true,
        results,
        count: results.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = UserProfileService;
