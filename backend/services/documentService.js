/**
 * Document Service - Complete Implementation
 * Provides comprehensive document management functionality
 * خدمة المستندات - تطبيق شامل
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Document = require('../models/Document');
const User = require('../models/User');
const AppError = require('../utils/AppError');

class DocumentService {
  /**
   * Upload a new document
   * رفع مستند جديد
   */
  async uploadDocument(file, metadata, uploadedBy) {
    try {
      if (!file) {
        throw new AppError('No file provided', 400);
      }

      // Generate file hash
      const fileHash = this.generateFileHash(file.buffer);

      // Create document record
      const documentData = {
        title: metadata.title,
        description: metadata.description || '',
        originalFileName: file.originalname,
        fileName: file.filename,
        fileType: path.extname(file.originalname).substring(1),
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath: `/uploads/${file.filename}`,
        fileHash,
        category: metadata.category || 'عام',
        tags: metadata.tags ? metadata.tags.split(',') : [],
        uploadedBy,
        uploadedByName: metadata.uploadedByName,
        uploadedByEmail: metadata.uploadedByEmail,
        version: 1,
        status: 'نشط',
        activityLog: [{
          action: 'إنشاء',
          performer: uploadedBy,
          timestamp: new Date(),
          details: { fileName: file.originalname }
        }]
      };

      const document = await Document.create(documentData);
      return document;
    } catch (error) {
      throw new AppError(`Failed to upload document: ${error.message}`, 500);
    }
  }

  /**
   * Create a new version of a document
   * إنشاء نسخة جديدة من المستند
   */
  async createVersion(documentId, newFile, uploadedBy, changeNotes) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new AppError('Document not found', 404);
      }

      // Store previous version
      const previousVersion = {
        version: document.version,
        fileName: document.fileName,
        filePath: document.filePath,
        fileSize: document.fileSize,
        uploadedAt: document.updatedAt,
        uploadedBy: document.uploadedBy,
        fileHash: document.fileHash,
        changeNotes: changeNotes || 'No notes provided'
      };

      // Update document with new file
      const fileHash = this.generateFileHash(newFile.buffer);
      
      document.previousVersions.push(previousVersion);
      document.version += 1;
      document.fileName = newFile.filename;
      document.filePath = `/uploads/${newFile.filename}`;
      document.fileSize = newFile.size;
      document.fileHash = fileHash;
      document.updatedAt = new Date();

      // Add to activity log
      document.activityLog.push({
        action: 'نسخة جديدة',
        performer: uploadedBy,
        timestamp: new Date(),
        details: {
          newVersion: document.version,
          changeNotes,
          previousVersion: previousVersion.version
        }
      });

      await document.save();
      return document;
    } catch (error) {
      throw new AppError(`Failed to create version: ${error.message}`, 500);
    }
  }

  /**
   * Share a document with users
   * مشاركة المستند مع المستخدمين
   */
  async shareDocument(documentId, shareData, sharedBy) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new AppError('Document not found', 404);
      }

      // Check if user already has access
      const existingShare = document.sharedWith.find(s => s.userId.toString() === shareData.userId);
      if (existingShare) {
        // Update existing share
        existingShare.permission = shareData.permission;
        existingShare.expiresAt = shareData.expiresAt || null;
      } else {
        // Add new share
        document.sharedWith.push({
          userId: shareData.userId,
          email: shareData.email,
          name: shareData.name,
          permission: shareData.permission,
          sharedAt: new Date(),
          sharedBy,
          expiresAt: shareData.expiresAt || null,
          message: shareData.message || ''
        });
      }

      // Add to activity log
      document.activityLog.push({
        action: 'مشاركة',
        performer: sharedBy,
        timestamp: new Date(),
        details: {
          sharedWith: shareData.email,
          permission: shareData.permission
        }
      });

      await document.save();
      return document;
    } catch (error) {
      throw new AppError(`Failed to share document: ${error.message}`, 500);
    }
  }

  /**
   * Revoke access from a user
   * إلغاء الوصول من مستخدم
   */
  async revokeAccess(documentId, userId, revokedBy) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new AppError('Document not found', 404);
      }

      // Remove user from sharedWith
      const userIndex = document.sharedWith.findIndex(s => s.userId.toString() === userId);
      if (userIndex !== -1) {
        const revokedUser = document.sharedWith[userIndex];
        document.sharedWith.splice(userIndex, 1);

        // Add to activity log
        document.activityLog.push({
          action: 'إلغاء مشاركة',
          performer: revokedBy,
          timestamp: new Date(),
          details: { revokedFrom: revokedUser.email }
        });

        await document.save();
      }

      return document;
    } catch (error) {
      throw new AppError(`Failed to revoke access: ${error.message}`, 500);
    }
  }

  /**
   * Track document download
   * تتبع تحميل المستند
   */
  async downloadDocument(documentId, downloadedBy) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new AppError('Document not found', 404);
      }

      // Increment download count
      document.downloadCount = (document.downloadCount || 0) + 1;
      document.lastAccessedBy = downloadedBy;
      document.lastAccessedAt = new Date();

      // Add to activity log
      document.activityLog.push({
        action: 'تحميل',
        performer: downloadedBy,
        timestamp: new Date()
      });

      await document.save();
      return document;
    } catch (error) {
      throw new AppError(`Failed to track download: ${error.message}`, 500);
    }
  }

  /**
   * Archive a document
   * أرشفة المستند
   */
  async archiveDocument(documentId, archivedBy) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new AppError('Document not found', 404);
      }

      document.status = 'مؤرشف';
      document.isArchived = true;
      document.archivedAt = new Date();
      document.archivedBy = archivedBy;

      // Add to activity log
      document.activityLog.push({
        action: 'أرشفة',
        performer: archivedBy,
        timestamp: new Date()
      });

      await document.save();
      return document;
    } catch (error) {
      throw new AppError(`Failed to archive document: ${error.message}`, 500);
    }
  }

  /**
   * Restore an archived document
   * استعادة مستند مؤرشف
   */
  async restoreDocument(documentId, restoredBy) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new AppError('Document not found', 404);
      }

      document.status = 'نشط';
      document.isArchived = false;
      document.archivedAt = null;
      document.archivedBy = null;

      // Add to activity log
      document.activityLog.push({
        action: 'استعادة',
        performer: restoredBy,
        timestamp: new Date()
      });

      await document.save();
      return document;
    } catch (error) {
      throw new AppError(`Failed to restore document: ${error.message}`, 500);
    }
  }

  /**
   * Delete a document permanently
   * حذف المستند بشكل دائم
   */
  async deleteDocument(documentId, deletedBy) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new AppError('Document not found', 404);
      }

      // Delete file from storage
      try {
        const filePath = path.join(__dirname, '../../public', document.filePath);
        await fs.unlink(filePath);
      } catch (err) {
        // Continue even if file deletion fails
        console.warn(`Could not delete file: ${err.message}`);
      }

      // Delete document from database
      await Document.findByIdAndDelete(documentId);

      return { success: true, message: 'Document deleted successfully' };
    } catch (error) {
      throw new AppError(`Failed to delete document: ${error.message}`, 500);
    }
  }

  /**
   * Search documents with filters
   * البحث عن المستندات مع التصفية
   */
  async searchDocuments(query, filters = {}, userId) {
    try {
      const searchQuery = {
        $and: [
          {
            $or: [
              { title: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
              { tags: { $regex: query, $options: 'i' } }
            ]
          },
          {
            $or: [
              { uploadedBy: userId },
              { 'sharedWith.userId': userId }
            ]
          }
        ]
      };

      // Apply filters
      if (filters.category) {
        searchQuery.$and[0].category = filters.category;
      }
      if (filters.status) {
        searchQuery.$and[0].status = filters.status;
      }
      if (filters.from || filters.to) {
        searchQuery.$and[0].createdAt = {};
        if (filters.from) {
          searchQuery.$and[0].createdAt.$gte = new Date(filters.from);
        }
        if (filters.to) {
          searchQuery.$and[0].createdAt.$lte = new Date(filters.to);
        }
      }

      const documents = await Document.find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(100);

      return documents;
    } catch (error) {
      throw new AppError(`Search failed: ${error.message}`, 500);
    }
  }

  /**
   * Get document statistics
   * الحصول على إحصائيات المستندات
   */
  async getStatistics(userId) {
    try {
      const stats = {
        totalDocuments: 0,
        totalSize: 0,
        byCategory: {},
        recentUploads: [],
        sharedDocuments: 0,
        archivedDocuments: 0,
        mostDownloaded: [],
        topCollaborators: []
      };

      // Get user documents
      const userDocs = await Document.find({
        uploadedBy: userId,
        isArchived: false
      });

      // Get shared documents
      const sharedDocs = await Document.find({
        'sharedWith.userId': userId,
        isArchived: false
      });

      const allDocs = [...userDocs, ...sharedDocs];

      // Calculate statistics
      stats.totalDocuments = allDocs.length;
      stats.totalSize = allDocs.reduce((sum, doc) => sum + doc.fileSize, 0);
      stats.sharedDocuments = sharedDocs.length;
      stats.archivedDocuments = await Document.countDocuments({
        uploadedBy: userId,
        isArchived: true
      });

      // Group by category
      allDocs.forEach(doc => {
        stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + 1;
      });

      // Recent uploads
      stats.recentUploads = userDocs
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map(d => ({ title: d.title, createdAt: d.createdAt }));

      // Most downloaded
      stats.mostDownloaded = userDocs
        .filter(d => d.downloadCount > 0)
        .sort((a, b) => b.downloadCount - a.downloadCount)
        .slice(0, 5)
        .map(d => ({ title: d.title, downloadCount: d.downloadCount }));

      return stats;
    } catch (error) {
      throw new AppError(`Failed to get statistics: ${error.message}`, 500);
    }
  }

  /**
   * Generate SHA-256 hash for file
   * إنشاء بصمة SHA-256 للملف
   */
  generateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get document with access verification
   * الحصول على المستند مع التحقق من الوصول
   */
  async getDocument(documentId, userId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new AppError('Document not found', 404);
      }

      // Check access
      const hasAccess = 
        document.uploadedBy.toString() === userId ||
        document.sharedWith.some(s => s.userId.toString() === userId);

      if (!hasAccess) {
        throw new AppError('Access denied to this document', 403);
      }

      // Track view
      document.viewCount = (document.viewCount || 0) + 1;
      document.lastAccessedBy = userId;
      document.lastAccessedAt = new Date();
      document.activityLog.push({
        action: 'عرض',
        performer: userId,
        timestamp: new Date()
      });

      await document.save();
      return document;
    } catch (error) {
      throw new AppError(`Failed to get document: ${error.message}`, 500);
    }
  }

  /**
   * Get user documents
   * الحصول على مستندات المستخدم
   */
  async getUserDocuments(userId, filters = {}) {
    try {
      const query = {
        $or: [
          { uploadedBy: userId },
          { 'sharedWith.userId': userId }
        ]
      };

      // Apply filters
      if (filters.category) {
        query.category = filters.category;
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.isArchived !== undefined) {
        query.isArchived = filters.isArchived;
      }

      const documents = await Document.find(query)
        .sort({ createdAt: -1 })
        .skip((filters.page - 1) * filters.limit || 0)
        .limit(filters.limit || 10);

      const total = await Document.countDocuments(query);

      return {
        documents,
        total,
        page: filters.page || 1,
        limit: filters.limit || 10,
        pages: Math.ceil(total / (filters.limit || 10))
      };
    } catch (error) {
      throw new AppError(`Failed to get documents: ${error.message}`, 500);
    }
  }

  /**
   * Update document metadata
   * تحديث بيانات المستند
   */
  async updateDocumentMetadata(documentId, metadata, updatedBy) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new AppError('Document not found', 404);
      }

      // Update metadata
      if (metadata.title) document.title = metadata.title;
      if (metadata.description !== undefined) document.description = metadata.description;
      if (metadata.category) document.category = metadata.category;
      if (metadata.tags) document.tags = metadata.tags.split(',');

      // Add to activity log
      document.activityLog.push({
        action: 'تعديل',
        performer: updatedBy,
        timestamp: new Date(),
        details: { modifiedFields: Object.keys(metadata) }
      });

      await document.save();
      return document;
    } catch (error) {
      throw new AppError(`Failed to update metadata: ${error.message}`, 500);
    }
  }
}

module.exports = DocumentService;
module.exports.DocumentService = DocumentService;
