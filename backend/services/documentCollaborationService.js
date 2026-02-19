/**
 * Document Collaboration Service - Phase 3
 * Handles document versioning, collaboration, and workflow management
 */

const DocumentVersion = require('../models/DocumentVersion');
const Document = require('../models/Document');
const { logger } = require('../utils/logger');

class DocumentCollaborationService {
  /**
   * Create a new version from existing document
   */
  async createVersion(documentId, userId, contentData, options = {}) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Get latest version number
      const latestVersion = await DocumentVersion.findLatestVersion(documentId);
      const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

      // Calculate changes if previous version exists
      const changes = [];
      if (latestVersion) {
        const oldContent = JSON.stringify(latestVersion.content);
        const newContent = JSON.stringify(contentData.content);
        if (oldContent !== newContent) {
          changes.push({
            field: 'content',
            oldValue: latestVersion.content,
            newValue: contentData.content,
          });
        }

        if (document.title !== contentData.title) {
          changes.push({
            field: 'title',
            oldValue: document.title,
            newValue: contentData.title,
          });
        }
      }

      // Create version document
      const version = new DocumentVersion({
        documentId,
        versionNumber: nextVersionNumber,
        title: contentData.title,
        content: contentData.content,
        contentType: contentData.contentType || 'text',
        changeDescription: options.changeDescription,
        createdBy: userId,
        changes,
        contentSize: JSON.stringify(contentData.content).length,
        status: options.status || 'draft',
        tags: contentData.tags || [],
        category: contentData.category,
        metadata: this.calculateMetadata(contentData.content),
      });

      await version.save();

      // Update document with latest version info
      await Document.findByIdAndUpdate(
        documentId,
        {
          lastModifiedBy: userId,
          lastModifiedAt: new Date(),
          currentVersionNumber: nextVersionNumber,
        },
        { new: true }
      );

      logger.info(`Version ${nextVersionNumber} created for document ${documentId}`);
      return version;
    } catch (error) {
      logger.error(`Error creating document version: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get document version history
   */
  async getVersionHistory(documentId, options = {}) {
    try {
      const limit = options.limit || 20;
      const skip = options.skip || 0;

      const history = await DocumentVersion.find({ documentId })
        .sort({ versionNumber: -1 })
        .skip(skip)
        .limit(limit)
        .select('-content')
        .populate('createdBy', 'name email')
        .lean();

      const total = await DocumentVersion.countDocuments({ documentId });

      return {
        history,
        total,
        page: Math.floor(skip / limit) + 1,
        pageSize: limit,
      };
    } catch (error) {
      logger.error(`Error retrieving version history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore a specific version
   */
  async restoreVersion(documentId, versionNumber, userId) {
    try {
      const targetVersion = await DocumentVersion.findVersionByNumber(documentId, versionNumber);
      if (!targetVersion) {
        throw new Error(`Version ${versionNumber} not found`);
      }

      // Create new version from restored content
      const newVersion = await this.createVersion(
        documentId,
        userId,
        {
          title: targetVersion.title,
          content: targetVersion.content,
          contentType: targetVersion.contentType,
          tags: targetVersion.tags,
          category: targetVersion.category,
        },
        {
          changeDescription: `Restored from version ${versionNumber}`,
          status: 'draft',
        }
      );

      logger.info(`Version ${versionNumber} restored as new version for document ${documentId}`);
      return newVersion;
    } catch (error) {
      logger.error(`Error restoring version: ${error.message}`);
      throw error;
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(documentId, versionNumber1, versionNumber2) {
    try {
      const version1 = await DocumentVersion.findVersionByNumber(documentId, versionNumber1);
      const version2 = await DocumentVersion.findVersionByNumber(documentId, versionNumber2);

      if (!version1 || !version2) {
        throw new Error('One or both versions not found');
      }

      return {
        version1: {
          number: version1.versionNumber,
          content: version1.content,
          createdAt: version1.createdAt,
          createdBy: version1.createdBy,
        },
        version2: {
          number: version2.versionNumber,
          content: version2.content,
          createdAt: version2.createdAt,
          createdBy: version2.createdBy,
        },
        differences: this.calculateDifferences(version1.content, version2.content),
      };
    } catch (error) {
      logger.error(`Error comparing versions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Manage document workflow (draft -> review -> published)
   */
  async updateWorkflowStatus(documentId, versionNumber, newStatus, userId) {
    try {
      const validStatuses = ['draft', 'review', 'published', 'archived'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      const version = await DocumentVersion.findVersionByNumber(documentId, versionNumber);
      if (!version) {
        throw new Error(`Version ${versionNumber} not found`);
      }

      version.status = newStatus;

      if (newStatus === 'published') {
        version.publishedAt = new Date();
        version.publishedBy = userId;
      }

      await version.save();

      logger.info(`Document ${documentId} v${versionNumber} status updated to ${newStatus}`);
      return version;
    } catch (error) {
      logger.error(`Error updating workflow status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Share document version with users
   */
  async shareVersion(documentId, versionNumber, userId, permission = 'view') {
    try {
      const version = await DocumentVersion.findVersionByNumber(documentId, versionNumber);
      if (!version) {
        throw new Error(`Version ${versionNumber} not found`);
      }

      version.shareWith(userId, permission);
      await version.save();

      logger.info(
        `Document ${documentId} shared with user ${userId} with ${permission} permission`
      );
      return version;
    } catch (error) {
      logger.error(`Error sharing document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add comment to specific version
   */
  async addVersionComment(documentId, versionNumber, userId, comment) {
    try {
      const version = await DocumentVersion.findVersionByNumber(documentId, versionNumber);
      if (!version) {
        throw new Error(`Version ${versionNumber} not found`);
      }

      if (!version.comments) {
        version.comments = [];
      }

      version.comments.push({
        userId,
        text: comment,
        createdAt: new Date(),
      });

      await version.save();
      return version;
    } catch (error) {
      logger.error(`Error adding comment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Track editing sessions for collaborative work
   */
  async startEditSession(documentId, versionNumber, userId) {
    try {
      const version = await DocumentVersion.findVersionByNumber(documentId, versionNumber);
      if (!version) {
        throw new Error(`Version ${versionNumber} not found`);
      }

      const session = {
        userId,
        startTime: new Date(),
      };

      version.editSessions.push(session);
      await version.save();

      return session;
    } catch (error) {
      logger.error(`Error starting edit session: ${error.message}`);
      throw error;
    }
  }

  /**
   * End editing session
   */
  async endEditSession(documentId, versionNumber, userId) {
    try {
      const version = await DocumentVersion.findVersionByNumber(documentId, versionNumber);
      if (!version) {
        throw new Error(`Version ${versionNumber} not found`);
      }

      const session = version.editSessions.find(s => s.userId?.toString() === userId.toString());
      if (session) {
        session.endTime = new Date();
      }

      await version.save();
      return session;
    } catch (error) {
      logger.error(`Error ending edit session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate content metadata
   */
  calculateMetadata(content) {
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const words = contentStr.match(/\b\w+\b/g) || [];
    const wordCount = words.length;
    const estimatedReadTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute

    return {
      wordCount,
      pageCount: Math.ceil(wordCount / 250), // Assuming 250 words per page
      estimatedReadTime,
    };
  }

  /**
   * Calculate differences between two content objects
   */
  calculateDifferences(content1, content2) {
    const diff = {
      added: [],
      removed: [],
      modified: [],
    };

    // Simple comparison for objects/strings
    const str1 = JSON.stringify(content1);
    const str2 = JSON.stringify(content2);

    if (str1 === str2) {
      return null; // No differences
    }

    // Return a basic diff structure
    diff.modified = ['content changed'];
    return diff;
  }

  /**
   * Get active collaborators on a version
   */
  async getCollaborators(documentId, versionNumber) {
    try {
      const version = await DocumentVersion.findVersionByNumber(documentId, versionNumber);
      if (!version) {
        throw new Error(`Version ${versionNumber} not found`);
      }

      const activeSessions = version.editSessions.filter(s => !s.endTime);
      const collaborators = await Promise.all(
        activeSessions.map(async session => {
          // In real implementation, fetch user details
          return {
            userId: session.userId,
            activeFor: new Date() - session.startTime,
          };
        })
      );

      return collaborators;
    } catch (error) {
      logger.error(`Error getting collaborators: ${error.message}`);
      throw error;
    }
  }

  /**
   * Archive old versions (keep only last N versions)
   */
  async archiveOldVersions(documentId, keepVersions = 10) {
    try {
      const versions = await DocumentVersion.find({ documentId })
        .sort({ versionNumber: -1 })
        .select('_id versionNumber');

      if (versions.length > keepVersions) {
        const versionsToArchive = versions.slice(keepVersions);
        const idsToArchive = versionsToArchive.map(v => v._id);

        await DocumentVersion.updateMany({ _id: { $in: idsToArchive } }, { status: 'archived' });

        logger.info(`Archived ${idsToArchive.length} versions for document ${documentId}`);
      }

      return versions.length;
    } catch (error) {
      logger.error(`Error archiving versions: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new DocumentCollaborationService();
