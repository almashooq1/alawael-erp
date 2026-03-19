/* eslint-disable no-unused-vars */
/* eslint-disable no-undef, no-unused-expressions */
/**



 * Document Management Tests
 * اختبارات شاملة لنظام إدارة المستندات
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Document = require('../models/Document');
const User = require('../models/User');

// === Global RBAC Mock ===
jest.mock('../rbac', () => ({
  createRBACMiddleware: () => (req, res, next) => next(),
  checkPermission: () => (req, res, next) => next(),
  RBAC_ROLES: {},
  RBAC_PERMISSIONS: {},
}));
// === Global Auth Mock ===
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] };
    next();
  },
  requireAdmin: (req, res, next) => next(),
  requireAuth: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] };
    next();
  },
  requireRole:
    (...roles) =>
    (req, res, next) =>
      next(),
  optionalAuth: (req, res, next) => next(),
  protect: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] };
    next();
  },
  authorize:
    (...roles) =>
    (req, res, next) =>
      next(),
  authorizeRole:
    (...roles) =>
    (req, res, next) =>
      next(),
  authenticate: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] };
    next();
  },
}));

jest.mock('../middleware/auth.middleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] };
    next();
  },
  requireRole:
    (...roles) =>
    (req, res, next) =>
      next(),
}));
describe('📄 Document Management System', () => {
  let authToken;
  let userId;
  let documentId;
  let userId2;
  let authToken2;

  beforeAll(async () => {
    // Create test users
    const user1 = await User.create({
      name: 'Test User 1',
      email: 'testuser1@example.com',
      password: 'Password@123',
      role: 'analyst',
    });
    userId = user1._id;

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'testuser1@example.com',
      password: 'Password@123',
    });
    authToken = loginRes.body?.data?.accessToken || 'mock-test-token';

    const user2 = await User.create({
      name: 'Test User 2',
      email: 'testuser2@example.com',
      password: 'Password@123',
      role: 'analyst',
    });
    userId2 = user2._id;

    const loginRes2 = await request(app).post('/api/auth/login').send({
      email: 'testuser2@example.com',
      password: 'Password@123',
    });
    authToken2 = loginRes2.body?.data?.accessToken || 'mock-test-token-2';
  });

  afterAll(async () => {
    await Document.deleteMany({});
    await User.deleteMany({});
  });

  describe('1. Upload Documents', () => {
    it('should upload a pdf document successfully', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Test PDF Document')
        .field('description', 'This is a test PDF')
        .field('category', 'مالي')
        .field('tags', 'test,finance,pdf')
        .attach('file', Buffer.from('%PDF-1.4'), 'test.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.title).toBe('Test PDF Document');
      expect(res.body.data.fileType).toBe('pdf');

      documentId = res.body.data._id;
    });

    it('should require title for upload', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('description', 'No title')
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject files without authentication', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .field('title', 'No Auth')
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(res.status).toBe(401);
    });
  });

  describe('2. Retrieve & Search', () => {
    beforeAll(async () => {
      // Create test documents
      await Document.create({
        title: 'Financial Report 2025',
        originalFileName: 'finance.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        filePath: '/uploads/finance.pdf',
        fileName: 'finance.pdf',
        category: 'مالي',
        tags: ['finance', 'report'],
        uploadedBy: userId,
        uploadedByName: 'Test User',
        uploadedByEmail: 'testuser1@example.com',
      });

      await Document.create({
        title: 'HR Policy Document',
        originalFileName: 'hrpolicy.docx',
        fileType: 'docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 2048,
        filePath: '/uploads/hrpolicy.docx',
        fileName: 'hrpolicy.docx',
        category: 'سياسات',
        tags: ['hr', 'policy'],
        uploadedBy: userId,
        uploadedByName: 'Test User',
      });
    });

    it('should retrieve user documents', async () => {
      const res = await request(app)
        .get('/api/documents/my-documents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should search documents by title', async () => {
      const res = await request(app)
        .get('/api/documents/search?q=Financial')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].title).toContain('Financial');
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/documents/my-documents?category=مالي')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.every(d => d.category === 'مالي')).toBe(true);
    });

    it('should get document details', async () => {
      const documents = await Document.find({ uploadedBy: userId });
      const docId = documents[0]._id;

      const res = await request(app)
        .get(`/api/documents/${docId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBeDefined();
      expect(res.body.data.viewCount).toBe(1);
    });
  });

  describe('3. Sharing & Access Control', () => {
    let shareDocId;

    beforeAll(async () => {
      const doc = await Document.create({
        title: 'Shareable Document',
        originalFileName: 'share.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: 512,
        filePath: '/uploads/share.pdf',
        fileName: 'share.pdf',
        uploadedBy: userId,
        uploadedByName: 'Test User',
      });
      shareDocId = doc._id;
    });

    it('should share document with another user', async () => {
      const res = await request(app)
        .post(`/api/documents/${shareDocId}/share`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: userId2,
          email: 'testuser2@example.com',
          name: 'Test User 2',
          permission: 'view',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sharedWith.length).toBe(1);
    });

    it('should allow shared user to view document', async () => {
      const res = await request(app)
        .get(`/api/documents/${shareDocId}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should revoke access from user', async () => {
      const res = await request(app)
        .delete(`/api/documents/${shareDocId}/share/${userId2}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sharedWith.length).toBe(0);
    });

    it('should prevent non-owner from sharing', async () => {
      const res = await request(app)
        .post(`/api/documents/${shareDocId}/share`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          userId: userId,
          permission: 'edit',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Versioning', () => {
    let versionDocId;

    beforeAll(async () => {
      const doc = await Document.create({
        title: 'Versioned Document',
        originalFileName: 'version.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        filePath: '/uploads/version.pdf',
        fileName: 'version.pdf',
        uploadedBy: userId,
        uploadedByName: 'Test User',
        version: 1,
      });
      versionDocId = doc._id;
    });

    it('should create a new version', async () => {
      const res = await request(app)
        .post(`/api/documents/${versionDocId}/new-version`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('changeNotes', 'Updated with new data')
        .attach('file', Buffer.from('v2 content'), 'version_v2.pdf');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe(2);
      expect(res.body.data.previousVersions.length).toBe(1);
    });

    it('should retrieve version history', async () => {
      const res = await request(app)
        .get(`/api/documents/${versionDocId}/versions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.currentVersion).toBeGreaterThan(1);
      expect(Array.isArray(res.body.versions)).toBe(true);
    });
  });

  describe('5. Archive & Delete', () => {
    let archiveDocId;

    beforeAll(async () => {
      const doc = await Document.create({
        title: 'Archivable Document',
        originalFileName: 'archive.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: 256,
        filePath: '/uploads/archive.pdf',
        fileName: 'archive.pdf',
        uploadedBy: userId,
        uploadedByName: 'Test User',
      });
      archiveDocId = doc._id;
    });

    it('should archive document', async () => {
      const res = await request(app)
        .post(`/api/documents/${archiveDocId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isArchived).toBe(true);
      expect(res.body.data.status).toBe('مؤرشف');
    });

    it('should not appear in non-archived list', async () => {
      const res = await request(app)
        .get('/api/documents/my-documents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.data.every(d => !d.isArchived)).toBe(true);
    });
  });

  describe('6. Statistics & Analytics', () => {
    it('should get document statistics', async () => {
      const res = await request(app)
        .get('/api/documents/stats/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalDocuments');
      expect(res.body.data).toHaveProperty('byCategory');
      expect(res.body.data).toHaveProperty('recentUploads');
    });
  });

  describe('7. Document Update', () => {
    let updateDocId;

    beforeAll(async () => {
      const doc = await Document.create({
        title: 'Original Title',
        originalFileName: 'update.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: 512,
        filePath: '/uploads/update.pdf',
        fileName: 'update.pdf',
        uploadedBy: userId,
        uploadedByName: 'Test User',
      });
      updateDocId = doc._id;
    });

    it('should update document metadata', async () => {
      const res = await request(app)
        .put(`/api/documents/${updateDocId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          description: 'New description',
          category: 'مالي',
          tags: 'finance,updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Title');
      expect(res.body.data.description).toBe('New description');
    });

    it('should prevent non-owner from updating', async () => {
      const res = await request(app)
        .put(`/api/documents/${updateDocId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          title: 'Hacked Title',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('8. Access Control & Permissions', () => {
    let permDocId;

    beforeAll(async () => {
      const doc = await Document.create({
        title: 'Permission Test Document',
        originalFileName: 'perms.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: 512,
        filePath: '/uploads/perms.pdf',
        fileName: 'perms.pdf',
        uploadedBy: userId,
        uploadedByName: 'Test User',
      });
      permDocId = doc._id;
    });

    it('should provide full access to owner', async () => {
      const res = await request(app)
        .get(`/api/documents/${permDocId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should deny access to unauthorized users', async () => {
      const res = await request(app)
        .get(`/api/documents/${permDocId}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(403);
    });

    it('should grant access after sharing', async () => {
      // Share with user2
      await request(app)
        .post(`/api/documents/${permDocId}/share`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: userId2,
          email: 'testuser2@example.com',
          permission: 'view',
        });

      // User2 should now have access
      const res = await request(app)
        .get(`/api/documents/${permDocId}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(200);
    });
  });

  describe('9. Activity Logging', () => {
    let activityDocId;

    beforeAll(async () => {
      const doc = await Document.create({
        title: 'Activity Tracked Document',
        originalFileName: 'activity.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: 512,
        filePath: '/uploads/activity.pdf',
        fileName: 'activity.pdf',
        uploadedBy: userId,
        uploadedByName: 'Test User',
      });
      activityDocId = doc._id;
    });

    it('should track view activity', async () => {
      await request(app)
        .get(`/api/documents/${activityDocId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const doc = await Document.findById(activityDocId);
      expect(doc.activityLog.length).toBeGreaterThan(0);
      expect(doc.activityLog.some(a => a.action === 'عرض')).toBe(true);
    });

    it('should track modification activity', async () => {
      await request(app)
        .put(`/api/documents/${activityDocId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Modified Title',
        });

      const doc = await Document.findById(activityDocId);
      expect(doc.activityLog.some(a => a.action === 'تعديل')).toBe(true);
    });
  });
});

describe('📊 Document Statistics', () => {
  let userId;
  let authToken;

  beforeAll(async () => {
    const user = await User.create({
      name: 'Stats Test User',
      email: 'statstestuser@example.com',
      password: 'Password@123',
    });
    userId = user._id;

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'statstestuser@example.com',
      password: 'Password@123',
    });
    authToken = loginRes.body.data.accessToken;

    // Create multiple documents for statistics
    for (let i = 1; i <= 5; i++) {
      await Document.create({
        title: `Test Document ${i}`,
        originalFileName: `doc${i}.pdf`,
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * i,
        filePath: `/uploads/doc${i}.pdf`,
        fileName: `doc${i}.pdf`,
        category: i % 2 === 0 ? 'مالي' : 'سياسات',
        uploadedBy: userId,
        uploadedByName: 'Stats Test User',
      });
    }
  });

  it('should calculate total documents correctly', async () => {
    const res = await request(app)
      .get('/api/documents/stats/overview')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.body.data.totalDocuments).toBe(5);
  });

  it('should group documents by category', async () => {
    const res = await request(app)
      .get('/api/documents/stats/overview')
      .set('Authorization', `Bearer ${authToken}`);

    expect(Array.isArray(res.body.data.byCategory)).toBe(true);
    expect(res.body.data.byCategory.length).toBeGreaterThan(0);
  });
});
