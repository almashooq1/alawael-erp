const DocumentVersion = require('../models/DocumentVersion');

/**
 * DocumentCollaborationService
 * Handles document versioning, collaboration, workflow management, and sharing
 */
class DocumentCollaborationService {
  /**
   * Create a new version of a document
   */
  async createVersion(documentId, userId, contentData, options = {}) {
    try {
      const {
        title = 'Untitled',
        changeDescription = '',
        status = 'draft',
        contentType = 'text',
        tags = [],
        category = '',
      } = options;

      // Get the latest version number
      const latestVersion = await DocumentVersion.findLatestVersion(documentId);
      const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

      // Calculate metadata
      const metadata = this.calculateMetadata(contentData.content);

      // Create new version document
      const newVersion = new DocumentVersion({
        documentId,
        versionNumber,
        title,
        content: contentData.content,
        contentType,
        changeDescription,
        createdBy: userId,
        status,
        tags,
        category,
        metadata,
      });

      // Track changes if previous version exists
      if (latestVersion) {
        const changes = this.calculateDifferences(latestVersion.content, contentData.content);
        newVersion.changes = changes;
      }

      await newVersion.save();
      return newVersion;
    } catch (error) {
      throw new Error(`Failed to create version: ${error.message}`);
    }
  }

  /**
   * Get paginated version history
   */
  async getVersionHistory(documentId, options = {}) {
    try {
      return await DocumentVersion.getVersionHistory(documentId, options);
    } catch (error) {
      throw new Error(`Failed to get version history: ${error.message}`);
    }
  }

  /**
   * Get a specific version
   */
  async getVersion(documentId, versionNumber) {
    try {
      const version = await DocumentVersion.findVersionByNumber(documentId, versionNumber);
      if (!version) {
        throw new Error(`Version ${versionNumber} not found`);
      }
      return version;
    } catch (error) {
      throw new Error(`Failed to get version: ${error.message}`);
    }
  }

  /**
   * Restore an older version as a new version
   */
  async restoreVersion(documentId, versionNumber, userId, restoreDescription = '') {
    try {
      // Get the version to restore
      const versionToRestore = await this.getVersion(documentId, versionNumber);

      // Create a new version with the old content
      const newVersion = await this.createVersion(
        documentId,
        userId,
        { content: versionToRestore.content },
        {
          title: versionToRestore.title,
          changeDescription: `Restored from version ${versionNumber}. ${restoreDescription}`,
          status: 'draft',
          contentType: versionToRestore.contentType,
          tags: versionToRestore.tags,
          category: versionToRestore.category,
        }
      );

      return newVersion;
    } catch (error) {
      throw new Error(`Failed to restore version: ${error.message}`);
    }
  }

  /**
   * Compare two versions and return differences
   */
  async compareVersions(documentId, version1Number, version2Number) {
    try {
      const version1 = await this.getVersion(documentId, version1Number);
      const version2 = await this.getVersion(documentId, version2Number);

      const differences = this.calculateDifferences(version1.content, version2.content);

      return {
        version1: {
          number: version1.versionNumber,
          content: version1.content,
        },
        version2: {
          number: version2.versionNumber,
          content: version2.content,
        },
        differences,
        totalChanges: differences.length,
      };
    } catch (error) {
      throw new Error(`Failed to compare versions: ${error.message}`);
    }
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(documentId, versionNumber, newStatus, userId, metadata = {}) {
    try {
      const validStatuses = ['draft', 'review', 'published', 'archived'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const version = await this.getVersion(documentId, versionNumber);

      version.status = newStatus;
      version.updatedBy = userId;

      if (newStatus === 'published') {
        version.publishedAt = new Date();
        version.publishedBy = userId;
      }

      await version.save();
      return version;
    } catch (error) {
      throw new Error(`Failed to update workflow status: ${error.message}`);
    }
  }

  /**
   * Share a version with another user
   */
  async shareVersion(documentId, versionNumber, userId, permission = 'view', sharedBy) {
    try {
      const version = await this.getVersion(documentId, versionNumber);
      const validPermissions = ['view', 'comment', 'edit'];

      if (!validPermissions.includes(permission)) {
        throw new Error(`Invalid permission. Must be one of: ${validPermissions.join(', ')}`);
      }

      await version.shareWith(userId, permission, sharedBy);
      return version;
    } catch (error) {
      throw new Error(`Failed to share version: ${error.message}`);
    }
  }

  /**
   * Revoke access to a version
   */
  async revokeAccess(documentId, versionNumber, userId) {
    try {
      const version = await this.getVersion(documentId, versionNumber);
      await version.revokeAccess(userId);
      return version;
    } catch (error) {
      throw new Error(`Failed to revoke access: ${error.message}`);
    }
  }

  /**
   * Add a comment to a version
   */
  async addVersionComment(documentId, versionNumber, userId, comment, position = 0) {
    try {
      const version = await this.getVersion(documentId, versionNumber);
      await version.addComment(userId, comment, position);
      return version;
    } catch (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }

  /**
   * Resolve a comment
   */
  async resolveComment(documentId, versionNumber, commentId) {
    try {
      const version = await this.getVersion(documentId, versionNumber);
      await version.resolveComment(commentId);
      return version;
    } catch (error) {
      throw new Error(`Failed to resolve comment: ${error.message}`);
    }
  }

  /**
   * Start an edit session
   */
  async startEditSession(documentId, versionNumber, userId) {
    try {
      const version = await this.getVersion(documentId, versionNumber);

      if (!version.canBeEdited) {
        throw new Error('This version cannot be edited');
      }

      await version.startEditSession(userId);
      return version;
    } catch (error) {
      throw new Error(`Failed to start edit session: ${error.message}`);
    }
  }

  /**
   * End an edit session
   */
  async endEditSession(documentId, versionNumber, userId) {
    try {
      const version = await this.getVersion(documentId, versionNumber);
      await version.endEditSession(userId);
      return version;
    } catch (error) {
      throw new Error(`Failed to end edit session: ${error.message}`);
    }
  }

  /**
   * Get active collaborators (currently editing)
   */
  async getCollaborators(documentId, versionNumber) {
    try {
      const version = await this.getVersion(documentId, versionNumber);

      const activeSessions = version.editSessions.filter(s => s.status === 'active');

      return {
        total: activeSessions.length,
        collaborators: activeSessions,
      };
    } catch (error) {
      throw new Error(`Failed to get collaborators: ${error.message}`);
    }
  }

  /**
   * Archive old versions, keeping only the latest N versions
   */
  async archiveOldVersions(documentId, keepVersions = 5) {
    try {
      const allVersions = await DocumentVersion.find({ documentId })
        .sort({ versionNumber: -1 })
        .exec();

      const versionsToArchive = allVersions.slice(keepVersions);

      const updatePromises = versionsToArchive.map(v => {
        if (v.status !== 'archived' && v.status !== 'published') {
          v.status = 'archived';
          return v.save();
        }
        return Promise.resolve(v);
      });

      await Promise.all(updatePromises);

      return {
        archived: versionsToArchive.length,
        kept: Math.min(keepVersions, allVersions.length),
      };
    } catch (error) {
      throw new Error(`Failed to archive old versions: ${error.message}`);
    }
  }

  /**
   * Calculate metadata about document content
   */
  calculateMetadata(content) {
    let contentStr = '';

    if (typeof content === 'string') {
      contentStr = content;
    } else if (typeof content === 'object') {
      contentStr = JSON.stringify(content);
    }

    const wordCount = contentStr.trim().split(/\s+/).length;
    const pageCount = Math.ceil(contentStr.length / 3000); // Approx 3000 chars per page
    const estimatedReadTime = Math.ceil(wordCount / 200); // 200 words per minute

    return {
      wordCount,
      pageCount,
      estimatedReadTime,
      externalLinks: this.extractLinks(contentStr),
    };
  }

  /**
   * Extract links from content
   */
  extractLinks(content) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = content.match(urlRegex);
    return matches || [];
  }

  /**
   * Calculate differences between two content versions
   */
  calculateDifferences(oldContent, newContent) {
    const oldStr = typeof oldContent === 'string' ? oldContent : JSON.stringify(oldContent);
    const newStr = typeof newContent === 'string' ? newContent : JSON.stringify(newContent);

    if (oldStr === newStr) {
      return [];
    }

    // Simple line-by-line comparison
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');

    const differences = [];

    // Find removed lines
    oldLines.forEach((line, idx) => {
      if (!newLines.includes(line) && line.trim()) {
        differences.push({
          type: 'removed',
          line: idx + 1,
          content: line,
          timestamp: new Date(),
        });
      }
    });

    // Find added lines
    newLines.forEach((line, idx) => {
      if (!oldLines.includes(line) && line.trim()) {
        differences.push({
          type: 'added',
          line: idx + 1,
          content: line,
          timestamp: new Date(),
        });
      }
    });

    return differences.sort((a, b) => a.line - b.line);
  }
}

// Export as singleton
module.exports = new DocumentCollaborationService();
