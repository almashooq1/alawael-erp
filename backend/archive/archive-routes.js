/* eslint-disable no-unused-vars */
/**
 * Archive Routes - مسارات الأرشفة
 * API Endpoints for Electronic Archive System
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { archiveService, archiveConfig, archiveCategories } = require('./archive-service');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, archiveConfig.storage.tempPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: archiveConfig.storage.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).substring(1).toLowerCase();
    // MIME allowlist to prevent extension-spoofing (Round 38)
    const mimeAllowlist = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel', 'text/plain', 'text/csv',
    ];
    if (archiveConfig.storage.allowedTypes.includes(ext) && mimeAllowlist.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${ext}' is not allowed`));
    }
  },
});

/**
 * @route   POST /api/archive/upload
 * @desc    Upload a new document
 * @access  Private
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const metadata = {
      title: req.body.title,
      description: req.body.description,
      category: {
        main: req.body.categoryMain,
        sub: req.body.categorySub,
      },
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      author: req.body.author,
      department: req.body.department,
      source: req.body.source,
      referenceNumber: req.body.referenceNumber,
      classification: req.body.classification,
      documentDate: req.body.documentDate ? new Date(req.body.documentDate) : null,
      validFrom: req.body.validFrom ? new Date(req.body.validFrom) : null,
      validUntil: req.body.validUntil ? new Date(req.body.validUntil) : null,
    };

    // Read file buffer
    const fs = require('fs').promises;
    const buffer = await fs.readFile(req.file.path);

    const file = {
      ...req.file,
      buffer,
      mimetype: req.file.mimetype,
    };

    const document = await archiveService.uploadDocument(file, metadata, {
      userId: req.user?.id,
      tenantId: req.tenantId,
    });

    // Clean up temp file
    await fs.unlink(req.file.path);

    res.status(201).json({
      success: true,
      document: {
        id: document._id,
        documentNumber: document.documentNumber,
        title: document.title,
        status: document.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/documents
 * @desc    List documents with filters
 * @access  Private
 */
router.get('/documents', async (req, res) => {
  try {
    const result = await archiveService.searchDocuments(req.query, {
      tenantId: req.tenantId,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/documents/:id
 * @desc    Get document by ID
 * @access  Private
 */
router.get('/documents/:id', async (req, res) => {
  try {
    const document = await archiveService.getDocument(req.params.id, {
      userId: req.user?.id,
    });

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    res.status(404).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/documents/number/:documentNumber
 * @desc    Get document by document number
 * @access  Private
 */
router.get('/documents/number/:documentNumber', async (req, res) => {
  try {
    const document = await archiveService.getDocumentByNumber(req.params.documentNumber);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/documents/:id/download
 * @desc    Download document file
 * @access  Private
 */
router.get('/documents/:id/download', async (req, res) => {
  try {
    const result = await archiveService.downloadDocument(req.params.id, {
      userId: req.user?.id,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename)}"`
    );
    res.send(result.buffer);
  } catch (error) {
    res.status(404).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   PUT /api/archive/documents/:id
 * @desc    Update document metadata
 * @access  Private
 */
router.put('/documents/:id', async (req, res) => {
  try {
    const document = await archiveService.updateDocument(req.params.id, req.body, {
      userId: req.user?.id,
    });

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   POST /api/archive/documents/:id/version
 * @desc    Create new version of document
 * @access  Private
 */
router.post('/documents/:id/version', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fs = require('fs').promises;
    const buffer = await fs.readFile(req.file.path);

    const file = {
      ...req.file,
      buffer,
    };

    const document = await archiveService.createVersion(req.params.id, file, {
      userId: req.user?.id,
      notes: req.body.notes,
    });

    // Clean up temp file
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   POST /api/archive/documents/:id/archive
 * @desc    Archive a document
 * @access  Private
 */
router.post('/documents/:id/archive', async (req, res) => {
  try {
    const document = await archiveService.archiveDocument(req.params.id, {
      userId: req.user?.id,
    });

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   DELETE /api/archive/documents/:id
 * @desc    Delete document (soft delete)
 * @access  Private
 */
router.delete('/documents/:id', async (req, res) => {
  try {
    const document = await archiveService.deleteDocument(req.params.id, {
      userId: req.user?.id,
    });

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/search
 * @desc    Search documents
 * @access  Private
 */
router.get('/search', async (req, res) => {
  try {
    const result = await archiveService.searchDocuments(req.query, {
      tenantId: req.tenantId,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/statistics
 * @desc    Get archive statistics
 * @access  Private
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await archiveService.getStatistics(req.tenantId);

    res.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/stats
 * @desc    Get archive storage stats (alias for frontend compatibility)
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await archiveService.getStatistics(req.tenantId);

    // Count documents by status
    const Document = archiveService.Document;
    const [totalDocs, archivedDocs, pendingDocs] = await Promise.all([
      Document ? Document.countDocuments({ tenantId: req.tenantId }).catch(() => 0) : 0,
      Document
        ? Document.countDocuments({ tenantId: req.tenantId, status: 'archived' }).catch(() => 0)
        : 0,
      Document
        ? Document.countDocuments({ tenantId: req.tenantId, status: 'pending' }).catch(() => 0)
        : 0,
    ]);

    // Category counts
    const categoryAgg = Document
      ? await Document.aggregate([
          { $match: req.tenantId ? { tenantId: req.tenantId } : {} },
          {
            $group: {
              _id: '$category.main',
              count: { $sum: 1 },
              totalSize: { $sum: '$file.size' },
            },
          },
        ]).catch(() => [])
      : [];

    const categoryCounts = {};
    for (const cat of categoryAgg) {
      if (cat._id) {
        const catDef = archiveCategories.find(c => c.id === cat._id);
        categoryCounts[cat._id] = {
          count: cat.count,
          size: cat.totalSize || 0,
          label: catDef?.label || cat._id,
          icon: catDef?.icon || '📁',
          color: catDef?.color || '#757575',
        };
      }
    }

    res.json({
      success: true,
      totalStorage: 50 * 1024 * 1024 * 1024,
      usedStorage: stats?.totalSize || 0,
      documentsCount: totalDocs,
      archivedCount: archivedDocs,
      pendingCount: pendingDocs,
      categoryCounts,
      monthlyUploads: stats?.monthlyUploads || [],
      fileTypeDistribution: stats?.fileTypeDistribution || [],
      classificationDistribution: stats?.classificationDistribution || [],
      recentSearches: [],
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/activity
 * @desc    Get recent activity log
 * @access  Private
 */
router.get('/activity', async (req, res) => {
  try {
    const Document = archiveService.Document;
    const limit = parseInt(req.query.limit) || 25;

    // Fetch recently modified documents as activity
    const recentDocs = Document
      ? await Document.find(req.tenantId ? { tenantId: req.tenantId } : {})
          .sort({ 'audit.updatedAt': -1, 'audit.createdAt': -1 })
          .limit(limit)
          .select('documentNumber title status audit category')
          .lean()
          .catch(() => [])
      : [];

    const activities = recentDocs.map((doc, i) => ({
      _id: `act-${doc._id || i}`,
      action:
        doc.status === 'archived' ? 'أرشفة' : doc.status === 'deleted' ? 'حذف' : 'تحديث بيانات',
      user: doc.audit?.createdBy || 'النظام',
      document: doc.title || 'مستند',
      documentNumber: doc.documentNumber || '',
      timestamp: doc.audit?.updatedAt || doc.audit?.createdAt || new Date().toISOString(),
      ip: '—',
    }));

    res.json({
      success: true,
      activities,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/retention-report
 * @desc    Get retention policy report
 * @access  Private
 */
router.get('/retention-report', async (req, res) => {
  try {
    const Document = archiveService.Document;
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let expiringSoon = [];
    let expired = [];
    let totalRetained = 0;

    if (Document) {
      // Documents expiring within 30 days
      expiringSoon = await Document.find({
        'retention.expiresAt': { $gt: now, $lte: thirtyDaysLater },
        ...(req.tenantId ? { tenantId: req.tenantId } : {}),
      })
        .lean()
        .catch(() => []);

      expiringSoon = expiringSoon.map(d => ({
        ...d,
        daysLeft: Math.ceil((new Date(d.retention?.expiresAt) - now) / (1000 * 60 * 60 * 24)),
      }));

      // Already expired documents
      expired = await Document.find({
        'retention.expiresAt': { $lte: now },
        ...(req.tenantId ? { tenantId: req.tenantId } : {}),
      })
        .lean()
        .catch(() => []);

      totalRetained = await Document.countDocuments(
        req.tenantId ? { tenantId: req.tenantId } : {}
      ).catch(() => 0);
    }

    res.json({
      success: true,
      expiringSoon,
      expired,
      totalRetained,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/categories
 * @desc    Get archive categories
 * @access  Private
 */
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    categories: archiveCategories,
  });
});

/**
 * @route   GET /api/archive/expired
 * @desc    Get expired documents
 * @access  Private (Admin)
 */
router.get('/expired', async (req, res) => {
  try {
    const documents = await archiveService.getExpiredDocuments();

    res.json({
      success: true,
      documents,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   POST /api/archive/retention/process
 * @desc    Process retention policies
 * @access  Private (Admin)
 */
router.post('/retention/process', async (req, res) => {
  try {
    const result = await archiveService.processRetention();

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   POST /api/archive/folders
 * @desc    Create archive folder
 * @access  Private
 */
router.post('/folders', async (req, res) => {
  try {
    const folder = await archiveService.createFolder(req.body, {
      tenantId: req.tenantId,
    });

    res.status(201).json({
      success: true,
      folder,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/folders/:id/contents
 * @desc    Get folder contents
 * @access  Private
 */
router.get('/folders/:id/contents', async (req, res) => {
  try {
    const contents = await archiveService.getFolderContents(req.params.id, {
      tenantId: req.tenantId,
    });

    res.json({
      success: true,
      ...contents,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   POST /api/archive/documents/:id/ocr
 * @desc    Trigger OCR processing
 * @access  Private
 */
router.post('/documents/:id/ocr', async (req, res) => {
  try {
    await archiveService.processOCR(req.params.id);

    res.json({
      success: true,
      message: 'OCR processing started',
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   POST /api/archive/documents/:id/related
 * @desc    Add related document
 * @access  Private
 */
router.post('/documents/:id/related', async (req, res) => {
  try {
    const { relatedDocumentId, relationship } = req.body;

    const document = await archiveService.Document.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          relatedDocuments: {
            document: relatedDocumentId,
            relationship,
          },
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/documents/:id/related
 * @desc    Get related documents
 * @access  Private
 */
router.get('/documents/:id/related', async (req, res) => {
  try {
    const document = await archiveService.Document.findById(req.params.id).populate(
      'relatedDocuments.document'
    );

    res.json({
      success: true,
      relatedDocuments: document.relatedDocuments,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/documents/:id/history
 * @desc    Get document access history
 * @access  Private
 */
router.get('/documents/:id/history', async (req, res) => {
  try {
    const document = await archiveService.Document.findById(req.params.id);

    res.json({
      success: true,
      history: {
        versions: document.versions,
        workflow: document.workflow?.history || [],
        audit: {
          accessedCount: document.audit.accessedCount,
          lastAccessedAt: document.audit.lastAccessedAt,
          lastAccessedBy: document.audit.lastAccessedBy,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/archive/export
 * @desc    Export documents list
 * @access  Private
 */
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', ...query } = req.query;

    const result = await archiveService.searchDocuments(
      {
        ...query,
        limit: 1000,
      },
      {
        tenantId: req.tenantId,
      }
    );

    if (format === 'csv') {
      const fields = ['documentNumber', 'title', 'category.main', 'status', 'audit.createdAt'];
      const header = fields.join(',');
      const rows = result.documents.map(doc =>
        fields
          .map(f => {
            const value = f.split('.').reduce((obj, key) => obj?.[key], doc);
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          })
          .join(',')
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="archive-export.csv"');
      res.send('\uFEFF' + header + '\n' + rows.join('\n'));
    } else {
      res.json({
        success: true,
        documents: result.documents,
        exportedAt: new Date(),
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

module.exports = router;
