# 🔗 **Phase 9 - Route Integration Guide**

## **Setting Up File Management Routes**

### **File Structure**
```
backend/
├── routes/
│   └── uploadRoutes.js          ← NEW
├── services/
│   └── fileManagement.service.js ← CREATED
├── middleware/
│   └── auth.js                  ← Existing
└── app.js
```

---

## 📋 **Complete Routes Implementation**

**File:** `backend/routes/uploadRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const FileManagementService = require('../services/fileManagement.service');

// Initialize service (singleton)
const fileService = new FileManagementService();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userUploadDir = fileService.getUserUploadDir(req.user.id);
    fileService.ensureUserDir(req.user.id); // Create if not exist
    cb(null, userUploadDir);
  },
  filename: (req, file, cb) => {
    const filename = fileService.generateFilename(file.originalname);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: fileService.MAX_FILE_SIZE // 100MB
  },
  fileFilter: (req, file, cb) => {
    const validation = fileService.validateFile(file);
    if (validation.valid) {
      cb(null, true);
    } else {
      cb(new Error(validation.message));
    }
  }
});

// ========================
// UPLOAD ENDPOINTS
// ========================

/**
 * POST /api/upload/single
 * Upload a single file
 */
router.post('/single', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Check storage quota
    const quotaCheck = fileService.checkStorageQuota(
      req.user.id,
      req.file.size
    );
    
    if (!quotaCheck.allowed) {
      // Delete uploaded file if quota exceeded
      fs.unlinkSync(req.file.path);
      return res.status(507).json({
        success: false,
        message: quotaCheck.message
      });
    }

    // Generate file hash
    const hash = fileService.generateFileHash(req.file.path);

    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        sizeFormatted: fileService.formatBytes(req.file.size),
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        url: `/api/upload/${req.file.filename}`,
        hash: hash
      },
      message: 'File uploaded successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/upload/multiple
 * Upload multiple files
 */
router.post('/multiple', auth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = [];
    let totalSize = 0;

    for (const file of req.files) {
      const quotaCheck = fileService.checkStorageQuota(
        req.user.id,
        file.size
      );

      if (quotaCheck.allowed) {
        uploadedFiles.push({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          sizeFormatted: fileService.formatBytes(file.size),
          mimeType: file.mimetype,
          uploadedAt: new Date().toISOString(),
          status: 'success'
        });
        totalSize += file.size;
      } else {
        // Delete file if quota exceeded
        fs.unlinkSync(file.path);
        uploadedFiles.push({
          filename: file.filename,
          originalName: file.originalname,
          status: 'failed',
          reason: quotaCheck.message
        });
      }
    }

    res.json({
      success: true,
      files: uploadedFiles,
      totalSize: totalSize,
      totalSizeFormatted: fileService.formatBytes(totalSize),
      count: uploadedFiles.filter(f => f.status === 'success').length,
      message: `${uploadedFiles.filter(f => f.status === 'success').length} files uploaded successfully`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ========================
// DOWNLOAD ENDPOINTS
// ========================

/**
 * GET /api/upload/:filename
 * Download a file
 */
router.get('/:filename', auth, (req, res) => {
  try {
    const userUploadDir = fileService.getUserUploadDir(req.user.id);
    const filePath = path.join(userUploadDir, req.params.filename);

    // Security: Prevent path traversal
    if (!filePath.startsWith(userUploadDir)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);

    // Set headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${req.params.filename}"`
    );

    // Stream file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========================
// LIST & VIEW ENDPOINTS
// ========================

/**
 * GET /api/upload/list
 * List all user files
 */
router.get('/list', auth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const sort = req.query.sort || '-uploadedAt';

    const files = fileService.listUserFiles(req.user.id);
    
    // Sort
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    files.sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * sortOrder;
      if (a[sortField] > b[sortField]) return 1 * sortOrder;
      return 0;
    });

    // Paginate
    const start = (page - 1) * limit;
    const paginatedFiles = files.slice(start, start + limit);

    res.json({
      success: true,
      files: paginatedFiles,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(files.length / limit),
        totalFiles: files.length,
        filesPerPage: limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/upload/search?q=keyword
 * Search files
 */
router.get('/search', auth, (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit) || 50;

    const results = fileService.searchFiles(req.user.id, query).slice(0, limit);

    res.json({
      success: true,
      query: query,
      results: results,
      totalResults: results.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/upload/types/:type
 * Filter files by type
 */
router.get('/types/:type', auth, (req, res) => {
  try {
    const validTypes = ['images', 'documents', 'videos', 'archives'];
    
    if (!validTypes.includes(req.params.type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Allowed: ${validTypes.join(', ')}`
      });
    }

    const files = fileService.getFilesByType(req.user.id, req.params.type);

    res.json({
      success: true,
      type: req.params.type,
      files: files,
      total: files.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========================
// STORAGE ENDPOINTS
// ========================

/**
 * GET /api/upload/storage
 * Get storage information
 */
router.get('/storage', auth, (req, res) => {
  try {
    const used = fileService.getUserStorageUsage(req.user.id).total;
    const limit = fileService.MAX_STORAGE_PER_USER;
    const available = limit - used;
    const percentage = (used / limit) * 100;

    res.json({
      success: true,
      used: used,
      usedFormatted: fileService.formatBytes(used),
      limit: limit,
      limitFormatted: fileService.formatBytes(limit),
      percentage: percentage.toFixed(2),
      available: available,
      availableFormatted: fileService.formatBytes(available)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/upload/stats
 * Get file statistics
 */
router.get('/stats', auth, (req, res) => {
  try {
    const stats = fileService.getFileStatistics(req.user.id);

    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========================
// DELETE ENDPOINTS
// ========================

/**
 * DELETE /api/upload/:filename
 * Delete a single file
 */
router.delete('/:filename', auth, (req, res) => {
  try {
    const success = fileService.deleteFile(req.user.id, req.params.filename);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.json({
      success: true,
      filename: req.params.filename,
      message: 'File deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/upload/multiple
 * Delete multiple files
 */
router.delete('/multiple', auth, (req, res) => {
  try {
    const filenames = req.body.filenames || [];
    const results = fileService.deleteMultipleFiles(req.user.id, filenames);

    const deleted = results.filter(r => r.status === 'deleted').length;
    const failed = results.filter(r => r.status === 'failed').length;

    res.json({
      success: true,
      deleted: deleted,
      failed: failed,
      results: results,
      message: `${deleted} files deleted successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========================
// BACKUP ENDPOINTS
// ========================

/**
 * POST /api/upload/backup
 * Create backup
 */
router.post('/backup', auth, (req, res) => {
  try {
    const result = fileService.createBackup(req.user.id);

    res.json({
      success: true,
      backupName: result.backupName,
      timestamp: result.timestamp,
      fileCount: result.fileCount,
      totalSize: result.totalSize,
      totalSizeFormatted: fileService.formatBytes(result.totalSize),
      message: 'Backup created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/upload/backup/:backupName/restore
 * Restore from backup
 */
router.post('/backup/:backupName/restore', auth, (req, res) => {
  try {
    const success = fileService.restoreFromBackup(
      req.user.id,
      req.params.backupName
    );

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    res.json({
      success: true,
      backupName: req.params.backupName,
      message: 'Files restored successfully from backup'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
```

---

## 🔗 **Register Routes in app.js**

**File:** `backend/app.js`

```javascript
const express = require('express');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// ... existing middleware ...

// Register upload routes
app.use('/api/upload', uploadRoutes);

// ... rest of app.js ...

module.exports = app;
```

---

## ✅ **Checklist**

- [ ] Create `routes/uploadRoutes.js`
- [ ] Ensure `services/fileManagement.service.js` exists
- [ ] Import routes in `app.js`
- [ ] Test all endpoints with Postman
- [ ] Verify authentication middleware
- [ ] Test file upload/download
- [ ] Check storage quota enforcement
- [ ] Verify error handling

---

## 🧪 **Testing All Routes**

```bash
# 1. Start server
npm start

# 2. Get authentication token
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.token')

# 3. Test upload
curl -X POST http://localhost:3001/api/upload/single \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf"

# 4. Test list
curl http://localhost:3001/api/upload/list \
  -H "Authorization: Bearer $TOKEN"

# 5. Test storage
curl http://localhost:3001/api/upload/storage \
  -H "Authorization: Bearer $TOKEN"

# 6. Test download
curl -O http://localhost:3001/api/upload/document.pdf \
  -H "Authorization: Bearer $TOKEN"

# 7. Test delete
curl -X DELETE http://localhost:3001/api/upload/document.pdf \
  -H "Authorization: Bearer $TOKEN"
```

---

**Status:** ✅ Ready for Integration  
**Dependencies:** Express, Multer, FileManagementService  
**Authentication:** JWT Required  
*Last Updated: Feb 19, 2026*
