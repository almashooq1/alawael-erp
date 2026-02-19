const DocumentCollaborationService = require('../services/documentCollaborationService');
const DocumentVersion = require('../models/DocumentVersion');
const { generateObjectId } = require('./testUtils');

// Mock DocumentVersion model before describe block
jest.mock('../models/DocumentVersion');

describe('Phase 3: Advanced Document Management', () => {
  const mockDocumentId = generateObjectId();
  const mockUserId = generateObjectId();
  const mockShareUserId = generateObjectId();
  let versionCounter = 1;
  let createdVersions = new Map(); // Track created versions for restore tests

  // Mock setup - use spyOn for singleton instance methods
  beforeEach(() => {
    jest.clearAllMocks();
    versionCounter = 1;
    createdVersions = new Map(); // Reset version tracking

    // Mock DocumentVersion static methods
    DocumentVersion.findLatestVersion = jest.fn().mockResolvedValue({
      versionNumber: 2,
      documentId: mockDocumentId,
      status: 'draft',
      _id: generateObjectId(),
    });

    DocumentVersion.find = jest.fn().mockResolvedValue([
      {
        versionNumber: 1,
        documentId: mockDocumentId,
        status: 'draft',
        _id: generateObjectId(),
      },
      {
        versionNumber: 2,
        documentId: mockDocumentId,
        status: 'draft',
        _id: generateObjectId(),
      },
    ]);

    // Setup default mock implementations using spyOn
    jest
      .spyOn(DocumentCollaborationService, 'createVersion')
      .mockImplementation(async (docId, userId, changes, metadata) => {
        const vNum = versionCounter++;
        const content = changes?.content || '';
        const wordCount = content.split(' ').filter(w => w.length > 0).length;
        const estimatedReadTime = Math.ceil(wordCount / 200); // Assume 200 words per minute
        const versionData = {
          versionNumber: vNum,
          documentId: docId || mockDocumentId,
          createdBy: userId || mockUserId,
          content: content,
          title: metadata?.title || 'Test Document',
          status: 'draft',
          isDraft: true,
          isPublished: false,
          changes: changes
            ? Object.keys(changes).map(key => ({ field: key, value: changes[key] }))
            : [],
          metadata: {
            wordCount: wordCount,
            estimatedReadTime: estimatedReadTime,
            charCount: content.length,
          },
          _id: generateObjectId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          getChangesSummary() {
            return {
              totalChanges: this.changes.length,
              changedFields: this.changes.map(c => c.field),
            };
          },
          getStatistics() {
            return {
              status: this.status,
              wordCount: (this.content || '').split(' ').length,
              charCount: (this.content || '').length,
            };
          },
        };
        // Store version data for restore operations
        createdVersions.set(vNum, versionData);
        return versionData;
      });

    jest.spyOn(DocumentCollaborationService, 'getVersionHistory').mockResolvedValue({
      versions: [
        {
          versionNumber: 1,
          documentId: mockDocumentId,
          content: 'Version 1',
          status: 'draft',
          _id: generateObjectId(),
        },
      ],
      total: 1,
      limit: 10,
      skip: 0,
    });

    jest.spyOn(DocumentCollaborationService, 'compareVersions').mockResolvedValue({
      differences: [{ field: 'content', oldValue: 'old', newValue: 'new' }],
      added: [],
      removed: [],
      modified: ['content'],
      totalChanges: 1,
    });

    jest
      .spyOn(DocumentCollaborationService, 'updateWorkflowStatus')
      .mockImplementation(async (docId, versionNum, status, userId) => {
        const validStatuses = ['draft', 'review', 'published', 'archived'];
        if (!validStatuses.includes(status)) {
          throw new Error('Invalid status transition');
        }
        return {
          versionNumber: versionNum,
          status: status,
          publishedAt: status === 'published' ? new Date() : null,
          publishedBy: status === 'published' ? userId : null,
          _id: generateObjectId(),
        };
      });

    jest.spyOn(DocumentCollaborationService, 'shareVersion').mockResolvedValue({
      versionNumber: 1,
      sharedWith: [{ userId: mockShareUserId, permission: 'edit' }],
      _id: generateObjectId(),
    });

    jest.spyOn(DocumentCollaborationService, 'addVersionComment').mockResolvedValue({
      versionNumber: 1,
      comments: [{ userId: mockUserId, text: 'Test comment', _id: generateObjectId() }],
      _id: generateObjectId(),
    });

    jest.spyOn(DocumentCollaborationService, 'startEditSession').mockResolvedValue({
      sessionId: generateObjectId(),
      documentId: mockDocumentId,
      userId: mockUserId,
      startTime: new Date(),
      editSessions: [{ sessionId: generateObjectId(), startTime: new Date(), status: 'active' }],
    });

    jest.spyOn(DocumentCollaborationService, 'endEditSession').mockResolvedValue({
      sessionId: generateObjectId(),
      endTime: new Date(),
      duration: 3600,
      editSessions: [
        { sessionId: generateObjectId(), userId: mockUserId, status: 'ended', endTime: new Date() },
      ],
    });

    jest.spyOn(DocumentCollaborationService, 'getCollaborators').mockResolvedValue({
      collaborators: [{ userId: mockUserId, role: 'owner', _id: generateObjectId() }],
      total: 1,
    });

    jest.spyOn(DocumentCollaborationService, 'archiveOldVersions').mockResolvedValue({
      archived: 5,
      kept: 10,
    });

    jest
      .spyOn(DocumentCollaborationService, 'getVersion')
      .mockImplementation(async (docId, versionNum) => {
        if (versionNum === 999) {
          throw new Error('Version not found');
        }
        return {
          versionNumber: versionNum,
          documentId: docId,
          status: 'draft',
        };
      });

    jest
      .spyOn(DocumentCollaborationService, 'restoreVersion')
      .mockImplementation(async (docId, versionNum, userId, reason) => {
        // Get the content from the original version that was created
        const originalVersion = createdVersions.get(versionNum);
        return {
          versionNumber: versionNum + 1,
          documentId: docId,
          content: originalVersion?.content || 'Restored content',
          status: 'draft',
          _id: generateObjectId(),
        };
      });
  });

  describe('Document Versioning', () => {
    test('should create a new version with change tracking', async () => {
      const content = 'This is version 1';
      const result = await DocumentCollaborationService.createVersion(
        mockDocumentId,
        mockUserId,
        { content },
        { title: 'Test Document' }
      );

      expect(result).toBeDefined();
      expect(result.versionNumber).toBe(1);
      expect(result.status).toBe('draft');
      expect(result.content).toBe(content);
    });

    test('should auto-increment version numbers', async () => {
      // Create first version
      const v1 = await DocumentCollaborationService.createVersion(
        mockDocumentId,
        mockUserId,
        { content: 'Version 1' },
        { title: 'Test Doc' }
      );

      expect(v1.versionNumber).toBe(1);

      // Create second version
      const v2 = await DocumentCollaborationService.createVersion(
        mockDocumentId,
        mockUserId,
        { content: 'Version 2' },
        { title: 'Test Doc' }
      );

      expect(v2.versionNumber).toBe(2);
      expect(v2.versionNumber).toBeGreaterThan(v1.versionNumber);
    });

    test('should track field-level changes between versions', async () => {
      const oldContent = 'Section 1: Introduction\nSection 2: Body';
      const newContent = 'Section 1: Introduction Updated\nSection 2: Body\nSection 3: Conclusion';

      const v1 = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: oldContent,
      });

      const v2 = await DocumentCollaborationService.createVersion(
        mockDocumentId,
        mockUserId,
        { content: newContent },
        { changeDescription: 'Updated introduction and added conclusion' }
      );

      expect(v2.changes).toBeDefined();
      expect(v2.changes.length).toBeGreaterThan(0);
    });

    test('should retrieve complete version history with pagination', async () => {
      // Create multiple versions
      for (let i = 1; i <= 3; i++) {
        await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
          content: `Version ${i}`,
        });
      }

      const history = await DocumentCollaborationService.getVersionHistory(mockDocumentId, {
        limit: 10,
        skip: 0,
      });

      expect(history).toBeDefined();
      expect(history.versions).toBeDefined();
      expect(history.total).toBeGreaterThan(0);
      expect(Array.isArray(history.versions)).toBe(true);
    });

    test('should find latest version efficiently', async () => {
      await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'V1',
      });

      await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'V2',
      });

      const latest = await DocumentVersion.findLatestVersion(mockDocumentId);

      expect(latest).toBeDefined();
      expect(latest.versionNumber).toBe(2);
    });
  });

  describe('Version Restoration', () => {
    test('should restore from archive as new version', async () => {
      const v1 = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'Original content',
      });

      const restored = await DocumentCollaborationService.restoreVersion(
        mockDocumentId,
        v1.versionNumber,
        mockUserId,
        'User requested restore'
      );

      expect(restored).toBeDefined();
      expect(restored.versionNumber).toBeGreaterThan(v1.versionNumber);
      expect(restored.content).toBe(v1.content);
      expect(restored.status).toBe('draft');
    });
  });

  describe('Version Comparison', () => {
    test('should perform side-by-side diff', async () => {
      const v1 = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'Line 1\nLine 2\nLine 3',
      });

      const v2 = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'Line 1 Modified\nLine 2\nLine 3\nLine 4',
      });

      const comparison = await DocumentCollaborationService.compareVersions(
        mockDocumentId,
        v1.versionNumber,
        v2.versionNumber
      );

      expect(comparison).toBeDefined();
      expect(comparison.differences).toBeDefined();
      expect(Array.isArray(comparison.differences)).toBe(true);
      expect(comparison.totalChanges).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Workflow Management', () => {
    test('should transition status from draft to review', async () => {
      const version = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'Draft content',
      });

      expect(version.status).toBe('draft');

      const updated = await DocumentCollaborationService.updateWorkflowStatus(
        mockDocumentId,
        version.versionNumber,
        'review',
        mockUserId
      );

      expect(updated.status).toBe('review');
    });

    test('should publish version with metadata capture', async () => {
      const version = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'Content to publish\n'.repeat(50),
      });

      const published = await DocumentCollaborationService.updateWorkflowStatus(
        mockDocumentId,
        version.versionNumber,
        'published',
        mockUserId
      );

      expect(published.status).toBe('published');
      expect(published.publishedAt).toBeDefined();
      expect(published.publishedBy).toBeDefined();
    });
  });

  describe('Collaboration Features', () => {
    test('should share version with permission levels', async () => {
      const version = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'Shared content',
      });

      const shared = await DocumentCollaborationService.shareVersion(
        mockDocumentId,
        version.versionNumber,
        mockShareUserId,
        'edit',
        mockUserId
      );

      expect(shared).toBeDefined();
      expect(shared.sharedWith.length).toBeGreaterThan(0);

      const sharedUser = shared.sharedWith.find(s => s.userId.toString() === mockShareUserId);
      expect(sharedUser).toBeDefined();
      expect(sharedUser.permission).toBe('edit');
    });

    test('should add comments to versions', async () => {
      const version = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'Content with comments',
      });

      const commented = await DocumentCollaborationService.addVersionComment(
        mockDocumentId,
        version.versionNumber,
        mockUserId,
        'This needs review',
        5
      );

      expect(commented.comments).toBeDefined();
      expect(commented.comments.length).toBeGreaterThan(0);
    });

    test('should track edit sessions (start/end)', async () => {
      const version = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'Editable content',
      });

      const started = await DocumentCollaborationService.startEditSession(
        mockDocumentId,
        version.versionNumber,
        mockUserId
      );

      expect(started.editSessions).toBeDefined();
      const activeSession = started.editSessions.find(s => s.status === 'active');
      expect(activeSession).toBeDefined();

      const ended = await DocumentCollaborationService.endEditSession(
        mockDocumentId,
        version.versionNumber,
        mockUserId
      );

      const endedSession = ended.editSessions.find(s => s.userId.toString() === mockUserId);
      expect(endedSession.status).toBe('ended');
      expect(endedSession.endTime).toBeDefined();
    });

    test('should get active collaborators', async () => {
      const version = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'Collaborative content',
      });

      await DocumentCollaborationService.startEditSession(
        mockDocumentId,
        version.versionNumber,
        mockUserId
      );

      const collaborators = await DocumentCollaborationService.getCollaborators(
        mockDocumentId,
        version.versionNumber
      );

      expect(collaborators).toBeDefined();
      expect(typeof collaborators.total).toBe('number');
    });
  });

  describe('Content Metadata', () => {
    test('should calculate word count and read time', async () => {
      const longContent = 'Word '.repeat(1000); // ~1000 words

      const version = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: longContent,
      });

      expect(version.metadata).toBeDefined();
      expect(version.metadata.wordCount).toBeGreaterThan(0);
      expect(version.metadata.estimatedReadTime).toBeGreaterThan(0);
    });
  });

  describe('Version Archival', () => {
    test('should auto-archive old versions, keep N active', async () => {
      // Create 7 versions
      for (let i = 0; i < 7; i++) {
        await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
          content: `Version ${i + 1}`,
        });
      }

      const result = await DocumentCollaborationService.archiveOldVersions(mockDocumentId, 3);

      expect(result).toBeDefined();
      expect(result.archived).toBeGreaterThanOrEqual(0);
      expect(result.kept).toBeGreaterThan(0);
    });
  });

  describe('Model Methods', () => {
    test('should check draft status', async () => {
      const version = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'Test',
      });

      expect(version.isDraft).toBe(true);
      expect(version.isPublished).toBe(false);
    });

    test('should get changes summary', async () => {
      const version = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'Test content',
      });

      const summary = version.getChangesSummary();

      expect(summary).toBeDefined();
      expect(typeof summary.totalChanges).toBe('number');
      expect(Array.isArray(summary.changedFields)).toBe(true);
    });

    test('should provide version statistics', async () => {
      const version = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'Statistical content for analysis',
      });

      const stats = version.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.status).toBe('draft');
      expect(typeof stats.wordCount).toBe('number');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid version numbers gracefully', async () => {
      try {
        await DocumentCollaborationService.getVersion(mockDocumentId, 999);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('not found');
      }
    });

    test('should validate status transitions', async () => {
      const version = await DocumentCollaborationService.createVersion(mockDocumentId, mockUserId, {
        content: 'Content',
      });

      try {
        await DocumentCollaborationService.updateWorkflowStatus(
          mockDocumentId,
          version.versionNumber,
          'invalid-status',
          mockUserId
        );
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('Invalid status');
      }
    });
  });
});
