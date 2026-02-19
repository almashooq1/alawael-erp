/**
 * Document Management Tests - Jest Version
 * اختبارات شاملة لنظام إدارة المستندات باستخدام Jest
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

  beforeAll(async () => {
    // Create test users
    const user1 = await User.create({
      name: 'Test User 1',
      email: 'testdoc1@example.com',
      password: 'Password@123',
      role: 'analyst',
    });
    userId = user1._id;
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testdoc1@example.com',
        password: 'Password@123',
      });
    authToken = loginRes.body.data.accessToken;

    const user2 = await User.create({
      name: 'Test User 2',
      email: 'testdoc2@example.com',
      password: 'Password@123',
      role: 'analyst',
    });
    userId2 = user2._id;

    const loginRes2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testdoc2@example.com',
        password: 'Password@123',
      });
    authToken2 = loginRes2.body.data.accessToken;
  });

  afterAll(async () => {
    await Document.deleteMany({});
    await User.deleteMany({});
  });

  describe('1️⃣ Upload Documents', () => {
    test('should upload a document successfully', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Test Document')
        .field('description', 'Test Description')
        .field('category', 'مالي')
        .attach('file', Buffer.from('test content'), 'test.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.title).toBe('Test Document');
      
      documentId = res.body.data._id;
    });

    test('should require title for upload', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('description', 'No title')
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should reject files without authentication', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .field('title', 'No Auth')
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(res.status).toBe(401);
    });
  });

  describe('2️⃣ Sharing & Access Control', () => {
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

    test('should share document with another user', async () => {
      const res = await request(app)
        .post(`/api/documents/${shareDocId}/share`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: userId2,
          email: 'testdoc2@example.com',
          name: 'Test User 2',
          permission: 'view',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sharedWith.length).toBeGreaterThan(0);
    });

    test('should allow shared user to view document', async () => {
      const res = await request(app)
        .get(`/api/documents/${shareDocId}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should revoke access from user', async () => {
      const res = await request(app)
        .delete(`/api/documents/${shareDocId}/share/${userId2}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sharedWith.length).toBe(0);
    });
  });

  describe('3️⃣ Versioning', () => {
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

    test('should create a new version', async () => {
      const res = await request(app)
        .post(`/api/documents/${versionDocId}/new-version`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('changeNotes', 'Updated with new data')
        .attach('file', Buffer.from('v2 content'), 'version_v2.pdf');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe(2);
      expect(res.body.data.previousVersions.length).toBeGreaterThan(0);
    });

    test('should retrieve version history', async () => {
      const res = await request(app)
        .get(`/api/documents/${versionDocId}/versions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.versions).toEqual(expect.any(Array));
    });
  });

  describe('4️⃣ Statistics & Analytics', () => {
    test('should get document statistics', async () => {
      const res = await request(app)
        .get('/api/documents/stats/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalDocuments');
      expect(res.body.data).toHaveProperty('byCategory');
    });
  });

  describe('5️⃣ Document Search', () => {
    test('should get user documents', async () => {
      const res = await request(app)
        .get('/api/documents/my-documents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should search documents', async () => {
      const res = await request(app)
        .get('/api/documents/search?q=Test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('6️⃣ Document Update', () => {
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

    test('should update document metadata', async () => {
      const res = await request(app)
        .put(`/api/documents/${updateDocId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          description: 'New description',
          category: 'مالي',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Title');
    });

    test('should prevent non-owner from updating', async () => {
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

  describe('7️⃣ Access Control', () => {
    let permDocId;

    beforeAll(async () => {
      const doc = await Document.create({
        title: 'Permission Test',
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

    test('should provide full access to owner', async () => {
      const res = await request(app)
        .get(`/api/documents/${permDocId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    test('should deny access to unauthorized users', async () => {
      const res = await request(app)
        .get(`/api/documents/${permDocId}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.status).toBe(403);
    });
  });
});
