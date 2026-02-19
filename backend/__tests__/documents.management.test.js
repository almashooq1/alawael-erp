/**
 * Document Management Tests
 * اختبارات شاملة لنظام إدارة المستندات
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Document = require('../../models/Document');
const User = require('../../models/User');

describe('📄 Document Management System', () => {
  let authToken;
  let userId;
  let documentId;
  let userId2;
  let authToken2;

  before(async () => {
    // Create test users
    const user1 = await User.create({
      name: 'Test User 1',
      email: 'testuser1@example.com',
      password: 'Password@123',
      role: 'analyst',
    });
    userId = user1._id;
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser1@example.com',
        password: 'Password@123',
      });
    authToken = loginRes.body.data.accessToken;

    const user2 = await User.create({
      name: 'Test User 2',
      email: 'testuser2@example.com',
      password: 'Password@123',
      role: 'analyst',
    });
    userId2 = user2._id;

    const loginRes2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser2@example.com',
        password: 'Password@123',
      });
    authToken2 = loginRes2.body.data.accessToken;
  });

  after(async () => {
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

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('_id');
      expect(res.body.data.title).to.equal('Test PDF Document');
      expect(res.body.data.fileType).to.equal('pdf');

      documentId = res.body.data._id;
    });

    it('should require title for upload', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('description', 'No title')
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });

    it('should reject files without authentication', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .field('title', 'No Auth')
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(res.status).to.equal(401);
    });
  });

  describe('2. Retrieve & Search', () => {
    before(async () => {
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

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.be.greaterThan(0);
    });

    it('should search documents by title', async () => {
      const res = await request(app)
        .get('/api/documents/search?q=Financial')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array');
      expect(res.body.data[0].title).to.include('Financial');
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/documents/my-documents?category=مالي')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.every(d => d.category === 'مالي')).to.be.true;
    });

    it('should get document details', async () => {
      const documents = await Document.find({ uploadedBy: userId });
      const docId = documents[0]._id;

      const res = await request(app)
        .get(`/api/documents/${docId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.title).to.exist;
      expect(res.body.data.viewCount).to.equal(1);
    });
  });

  describe('3. Sharing & Access Control', () => {
    let shareDocId;

    before(async () => {
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

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.sharedWith.length).to.equal(1);
    });

    it('should allow shared user to view document', async () => {
      const res = await request(app)
        .get(`/api/documents/${shareDocId}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
    });

    it('should revoke access from user', async () => {
      const res = await request(app)
        .delete(`/api/documents/${shareDocId}/share/${userId2}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.sharedWith.length).to.equal(0);
    });

    it('should prevent non-owner from sharing', async () => {
      const res = await request(app)
        .post(`/api/documents/${shareDocId}/share`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          userId: userId,
          permission: 'edit',
        });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
    });
  });

  describe('4. Versioning', () => {
    let versionDocId;

    before(async () => {
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

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.version).to.equal(2);
      expect(res.body.data.previousVersions.length).to.equal(1);
    });

    it('should retrieve version history', async () => {
      const res = await request(app)
        .get(`/api/documents/${versionDocId}/versions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.currentVersion).to.be.greaterThan(1);
      expect(res.body.versions).to.be.an('array');
    });
  });

  describe('5. Archive & Delete', () => {
    let archiveDocId;

    before(async () => {
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

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.isArchived).to.be.true;
      expect(res.body.data.status).to.equal('مؤرشف');
    });

    it('should not appear in non-archived list', async () => {
      const res = await request(app)
        .get('/api/documents/my-documents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.data.every(d => !d.isArchived)).to.be.true;
    });
  });

  describe('6. Statistics & Analytics', () => {
    it('should get document statistics', async () => {
      const res = await request(app)
        .get('/api/documents/stats/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('totalDocuments');
      expect(res.body.data).to.have.property('byCategory');
      expect(res.body.data).to.have.property('recentUploads');
    });
  });

  describe('7. Document Update', () => {
    let updateDocId;

    before(async () => {
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

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.title).to.equal('Updated Title');
      expect(res.body.data.description).to.equal('New description');
    });

    it('should prevent non-owner from updating', async () => {
      const res = await request(app)
        .put(`/api/documents/${updateDocId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          title: 'Hacked Title',
        });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
    });
  });

  describe('8. Access Control & Permissions', () => {
    let permDocId;

    before(async () => {
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

      expect(res.status).to.equal(200);
    });

    it('should deny access to unauthorized users', async () => {
      const res = await request(app)
        .get(`/api/documents/${permDocId}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).to.equal(403);
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

      expect(res.status).to.equal(200);
    });
  });

  describe('9. Activity Logging', () => {
    let activityDocId;

    before(async () => {
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
      expect(doc.activityLog.length).to.be.greaterThan(0);
      expect(doc.activityLog.some(a => a.action === 'عرض')).to.be.true;
    });

    it('should track modification activity', async () => {
      await request(app)
        .put(`/api/documents/${activityDocId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Modified Title',
        });

      const doc = await Document.findById(activityDocId);
      expect(doc.activityLog.some(a => a.action === 'تعديل')).to.be.true;
    });
  });
});

describe('📊 Document Statistics', () => {
  let userId;
  let authToken;

  before(async () => {
    const user = await User.create({
      name: 'Stats Test User',
      email: 'statstestuser@example.com',
      password: 'Password@123',
    });
    userId = user._id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
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

    expect(res.body.data.totalDocuments).to.equal(5);
  });

  it('should group documents by category', async () => {
    const res = await request(app)
      .get('/api/documents/stats/overview')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.body.data.byCategory).to.be.an('array');
    expect(res.body.data.byCategory.length).to.be.greaterThan(0);
  });
});
