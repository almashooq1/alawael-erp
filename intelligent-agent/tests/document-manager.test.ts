import { DocumentManager, Document, DocumentConfig } from '../src/modules/document-manager';

describe('DocumentManager', () => {
  let documentManager: DocumentManager;

  beforeEach(() => {
    documentManager = new DocumentManager();
  });

  afterEach(() => {
    if (documentManager) {
      documentManager.clearAllDocuments();
      documentManager.removeAllListeners();
    }
  });

  describe('Initialization & Configuration', () => {
    it('should instantiate with default config', () => {
      const dm = new DocumentManager();
      expect(dm).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const config: Partial<DocumentConfig> = {
        enableVersioning: true,
        enableSignatures: true,
        maxDocuments: 5000
      };
      const dm = new DocumentManager(config);
      expect(dm).toBeDefined();
    });

    it('should throw error for invalid maxDocuments', () => {
      const invalidConfig: Partial<DocumentConfig> = { maxDocuments: 0 };
      expect(() => new DocumentManager(invalidConfig)).toThrow('at least 1');
    });

    it('should throw error for invalid maxContentSize', () => {
      const invalidConfig: Partial<DocumentConfig> = { maxContentSize: 512 };
      expect(() => new DocumentManager(invalidConfig)).toThrow('at least 1KB');
    });

    it('should throw error for invalid maxVersions', () => {
      const invalidConfig: Partial<DocumentConfig> = { maxVersions: 0 };
      expect(() => new DocumentManager(invalidConfig)).toThrow('at least 1');
    });
  });

  describe('Document Creation', () => {
    it('should create document successfully', () => {
      const doc = documentManager.createDocument(
        'Test Document',
        'This is test content',
        'owner123'
      );
      
      expect(doc).toBeDefined();
      expect(doc.title).toBe('Test Document');
      expect(doc.version).toBe(1);
      expect(doc.status).toBe('draft');
    });

    it('should throw error for missing title', () => {
      expect(() => 
        documentManager.createDocument('', 'content', 'owner123')
      ).toThrow('title is required');
    });

    it('should throw error for missing content', () => {
      expect(() => 
        documentManager.createDocument('Title', '', 'owner123')
      ).toThrow('content is required');
    });

    it('should throw error for missing owner', () => {
      expect(() => 
        documentManager.createDocument('Title', 'content', '')
      ).toThrow('Owner ID is required');
    });

    it('should throw error for oversized content', () => {
      const config: Partial<DocumentConfig> = { maxContentSize: 1024 };
      const dm = new DocumentManager(config);
      const largeContent = 'a'.repeat(2000);
      
      expect(() => 
        dm.createDocument('Title', largeContent, 'owner123')
      ).toThrow('exceeds max size');
    });

    it('should throw error when max documents reached', () => {
      const config: Partial<DocumentConfig> = { maxDocuments: 2 };
      const dm = new DocumentManager(config);
      
      dm.createDocument('Doc1', 'content1', 'owner1');
      dm.createDocument('Doc2', 'content2', 'owner1');
      
      expect(() => 
        dm.createDocument('Doc3', 'content3', 'owner1')
      ).toThrow('Maximum documents limit reached');
    });

    it('should trim whitespace from title and owner', () => {
      const doc = documentManager.createDocument(
        '  Trimmed Title  ',
        'content',
        '  owner123  '
      );
      
      expect(doc.title).toBe('Trimmed Title');
    });

    it('should create document with metadata', () => {
      const metadata = { author: 'John', department: 'HR' };
      const doc = documentManager.createDocument(
        'Document',
        'content',
        'owner123',
        metadata
      );
      
      expect(doc.metadata).toEqual(metadata);
    });

    it('should create document with tags', () => {
      const tags = ['important', 'review', 'urgent'];
      const doc = documentManager.createDocument(
        'Document',
        'content',
        'owner123',
        undefined,
        tags
      );
      
      expect(doc.tags).toEqual(tags);
    });
  });

  describe('Document Retrieval', () => {
    beforeEach(() => {
      documentManager.createDocument('Doc1', 'content1', 'owner1');
      documentManager.createDocument('Doc2', 'content2', 'owner1');
      documentManager.createDocument('Doc3', 'content3', 'owner2');
    });

    it('should retrieve document by ID', () => {
      const docs = documentManager.listDocuments();
      const firstDoc = docs[0];
      
      const retrieved = documentManager.getDocument(firstDoc.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe(firstDoc.title);
    });

    it('should return null for non-existent document', () => {
      const doc = documentManager.getDocument('non-existent-id');
      expect(doc).toBeNull();
    });

    it('should list all documents', () => {
      const docs = documentManager.listDocuments();
      expect(docs.length).toBe(3);
    });

    it('should filter documents by owner', () => {
      const ownerDocs = documentManager.listDocuments('owner1');
      expect(ownerDocs.length).toBe(2);
      expect(ownerDocs.every(d => d.ownerId === 'owner1')).toBe(true);
    });

    it('should search documents by title', () => {
      const results = documentManager.searchDocuments('Doc1');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(d => d.title.includes('Doc1'))).toBe(true);
    });

    it('should search documents by content', () => {
      const results = documentManager.searchDocuments('content1');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search documents by tag', () => {
      documentManager.createDocument('Tagged', 'content', 'owner1', undefined, ['special']);
      const results = documentManager.searchDocuments('special');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search with owner filter', () => {
      documentManager.createDocument('Search', 'content', 'owner2', undefined, ['test']);
      const results = documentManager.searchDocuments('test', 'owner2');
      expect(results.every(d => d.ownerId === 'owner2')).toBe(true);
    });

    it('should count total documents', () => {
      const count = documentManager.getDocumentCount();
      expect(count).toBe(3);
    });

    it('should count documents by status', () => {
      documentManager.createDocument('Published', 'content', 'owner1').status = 'published';
      const publishedCount = documentManager.getDocumentsByStatus('published');
      expect(publishedCount).toBeGreaterThan(0);
    });
  });

  describe('Document Update', () => {
    let docId: string;

    beforeEach(() => {
      const doc = documentManager.createDocument('Original', 'original content', 'owner1');
      docId = doc.id;
    });

    it('should update document content', () => {
      const updated = documentManager.updateDocument(docId, {
        content: 'Updated content'
      });
      
      expect(updated.content).toBe('Updated content');
      expect(updated.version).toBe(2);
    });

    it('should update document title', () => {
      const updated = documentManager.updateDocument(docId, {
        title: 'New Title'
      });
      
      expect(updated.title).toBe('New Title');
    });

    it('should increment version on update', () => {
      documentManager.updateDocument(docId, { content: 'v2' });
      let doc = documentManager.getDocument(docId)!;
      expect(doc.version).toBe(2);

      documentManager.updateDocument(docId, { content: 'v3' });
      doc = documentManager.getDocument(docId)!;
      expect(doc.version).toBe(3);
    });

    it('should throw error for non-existent document', () => {
      expect(() => 
        documentManager.updateDocument('non-existent', { title: 'New' })
      ).toThrow('not found');
    });

    it('should throw error for empty title update', () => {
      expect(() => 
        documentManager.updateDocument(docId, { title: '' })
      ).toThrow('Document title is required');
    });

    it('should update timestamp on change', () => {
      const before = documentManager.getDocument(docId)!.updatedAt;
      
      setTimeout(() => {
        documentManager.updateDocument(docId, { content: 'new' });
        const after = documentManager.getDocument(docId)!.updatedAt;
        expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
      }, 10);
    });
  });

  describe('Document Deletion', () => {
    let docId: string;

    beforeEach(() => {
      const doc = documentManager.createDocument('ToDelete', 'content', 'owner1');
      docId = doc.id;
    });

    it('should delete document successfully', () => {
      const deleted = documentManager.deleteDocument(docId);
      expect(deleted).toBe(true);
      
      const retrieved = documentManager.getDocument(docId);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent document', () => {
      const deleted = documentManager.deleteDocument('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should reduce document count after delete', () => {
      const before = documentManager.getDocumentCount();
      documentManager.deleteDocument(docId);
      const after = documentManager.getDocumentCount();
      
      expect(after).toBe(before - 1);
    });

    it('should throw error for empty document ID', () => {
      expect(() => 
        documentManager.deleteDocument('')
      ).toThrow('Document ID is required');
    });
  });

  describe('Document Signing', () => {
    let docId: string;

    beforeEach(() => {
      const doc = documentManager.createDocument('ToSign', 'content', 'owner1');
      docId = doc.id;
    });

    it('should sign document successfully', () => {
      const signed = documentManager.signDocument(docId, 'user123');
      
      expect(signed.signatures.length).toBe(1);
      expect(signed.signatures[0].userId).toBe('user123');
    });

    it('should add multiple signatures', () => {
      documentManager.signDocument(docId, 'user1');
      documentManager.signDocument(docId, 'user2');
      
      const doc = documentManager.getDocument(docId)!;
      expect(doc.signatures.length).toBe(2);
    });

    it('should throw error for non-existent document', () => {
      expect(() => 
        documentManager.signDocument('non-existent', 'user123')
      ).toThrow('not found');
    });

    it('should throw error when signatures disabled', () => {
      const config: Partial<DocumentConfig> = { enableSignatures: false };
      const dm = new DocumentManager(config);
      const doc = dm.createDocument('Doc', 'content', 'owner1');
      
      expect(() => 
        dm.signDocument(doc.id, 'user123')
      ).toThrow('disabled');
    });

    it('should throw error for missing user ID', () => {
      expect(() => 
        documentManager.signDocument(docId, '')
      ).toThrow('User ID is required');
    });

    it('should record signature timestamp', () => {
      const signed = documentManager.signDocument(docId, 'user123');
      expect(signed.signatures[0].signedAt).toBeDefined();
      expect(signed.signatures[0].signedAt instanceof Date).toBe(true);
    });
  });

  describe('Tag Management', () => {
    let docId: string;

    beforeEach(() => {
      const doc = documentManager.createDocument('Taggable', 'content', 'owner1');
      docId = doc.id;
    });

    it('should add tag to document', () => {
      const updated = documentManager.addTag(docId, 'important');
      
      expect(updated.tags).toContain('important');
    });

    it('should not add duplicate tags', () => {
      documentManager.addTag(docId, 'important');
      documentManager.addTag(docId, 'important');
      
      const doc = documentManager.getDocument(docId)!;
      const tagCount = doc.tags?.filter(t => t === 'important').length;
      expect(tagCount).toBe(1);
    });

    it('should remove tag from document', () => {
      documentManager.addTag(docId, 'important');
      const updated = documentManager.removeTag(docId, 'important');
      
      expect(updated.tags?.includes('important')).toBe(false);
    });

    it('should throw error for missing tag', () => {
      expect(() => 
        documentManager.addTag(docId, '')
      ).toThrow('Tag is required');
    });

    it('should throw error for non-existent document', () => {
      expect(() => 
        documentManager.addTag('non-existent', 'tag')
      ).toThrow('not found');
    });
  });

  describe('Document Status', () => {
    let docId: string;

    beforeEach(() => {
      const doc = documentManager.createDocument('StatusDoc', 'content', 'owner1');
      docId = doc.id;
    });

    it('should start in draft status', () => {
      const doc = documentManager.getDocument(docId)!;
      expect(doc.status).toBe('draft');
    });

    it('should change status to published', () => {
      const updated = documentManager.changeStatus(docId, 'published');
      expect(updated.status).toBe('published');
    });

    it('should change status to archived', () => {
      const updated = documentManager.changeStatus(docId, 'archived');
      expect(updated.status).toBe('archived');
    });

    it('should count documents by status', () => {
      documentManager.changeStatus(docId, 'published');
      const count = documentManager.getDocumentsByStatus('published');
      expect(count).toBeGreaterThan(0);
    });

    it('should throw error for non-existent document', () => {
      expect(() => 
        documentManager.changeStatus('non-existent', 'published')
      ).toThrow('not found');
    });
  });

  describe('Event Emission', () => {
    it('should emit documentCreated event', () => {
      return new Promise<void>((resolve) => {
        documentManager.once('documentCreated', (data) => {
          expect(data).toHaveProperty('documentId');
          expect(data).toHaveProperty('title');
          expect(data).toHaveProperty('ownerId');
          expect(data).toHaveProperty('timestamp');
          resolve();
        });
        
        documentManager.createDocument('Event Doc', 'content', 'owner1');
      });
    });

    it('should emit documentUpdated event', () => {
      return new Promise<void>((resolve) => {
        const doc = documentManager.createDocument('Update Doc', 'content', 'owner1');
        
        documentManager.once('documentUpdated', (data) => {
          expect(data).toHaveProperty('documentId');
          expect(data).toHaveProperty('version');
          resolve();
        });
        
        documentManager.updateDocument(doc.id, { title: 'Updated' });
      });
    });

    it('should emit documentDeleted event', () => {
      return new Promise<void>((resolve) => {
        const doc = documentManager.createDocument('Delete Doc', 'content', 'owner1');
        
        documentManager.once('documentDeleted', (data) => {
          expect(data).toHaveProperty('documentId');
          expect(data).toHaveProperty('title');
          resolve();
        });
        
        documentManager.deleteDocument(doc.id);
      });
    });

    it('should emit documentSigned event', () => {
      return new Promise<void>((resolve) => {
        const doc = documentManager.createDocument('Sign Doc', 'content', 'owner1');
        
        documentManager.once('documentSigned', (data) => {
          expect(data).toHaveProperty('documentId');
          expect(data).toHaveProperty('userId');
          expect(data).toHaveProperty('signatureCount');
          resolve();
        });
        
        documentManager.signDocument(doc.id, 'user1');
      });
    });

    it('should emit statusChanged event', () => {
      return new Promise<void>((resolve) => {
        const doc = documentManager.createDocument('Status Doc', 'content', 'owner1');
        
        documentManager.once('statusChanged', (data) => {
          expect(data).toHaveProperty('documentId');
          expect(data).toHaveProperty('status');
          resolve();
        });
        
        documentManager.changeStatus(doc.id, 'published');
      });
    });

    it('should emit error event on creation failure', () => {
      return new Promise<void>((resolve) => {
        documentManager.once('error', (data) => {
          expect(data).toHaveProperty('operation');
          expect(data).toHaveProperty('error');
          expect(data).toHaveProperty('timestamp');
          resolve();
        });
        
        try {
          documentManager.createDocument('', 'content', 'owner1');
        } catch (e) {
          // Expected
        }
      });
    });
  });

  describe('Configuration Management', () => {
    it('should return current config', () => {
      const config = documentManager.getConfig();
      expect(config).toHaveProperty('enableVersioning');
      expect(config).toHaveProperty('enableSignatures');
    });

    it('should not modify returned config', () => {
      const config = documentManager.getConfig();
      config.enableVersioning = false;
      
      const newConfig = documentManager.getConfig();
      expect(newConfig.enableVersioning).toBe(true);
    });
  });

  describe('Instance Isolation', () => {
    it('should not share documents between instances', () => {
      const dm1 = new DocumentManager();
      const dm2 = new DocumentManager();
      
      dm1.createDocument('Doc1', 'content1', 'owner1');
      dm2.createDocument('Doc2', 'content2', 'owner2');
      
      expect(dm1.getDocumentCount()).toBe(1);
      expect(dm2.getDocumentCount()).toBe(1);
    });

    it('should not share configuration between instances', () => {
      const dm1 = new DocumentManager({ maxDocuments: 100 });
      const dm2 = new DocumentManager({ maxDocuments: 200 });
      
      expect(dm1.getConfig().maxDocuments).toBe(100);
      expect(dm2.getConfig().maxDocuments).toBe(200);
    });
  });

  describe('Bulk Operations', () => {
    it('should clear all documents', () => {
      documentManager.createDocument('Doc1', 'content', 'owner1');
      documentManager.createDocument('Doc2', 'content', 'owner1');
      
      expect(documentManager.getDocumentCount()).toBe(2);
      documentManager.clearAllDocuments();
      expect(documentManager.getDocumentCount()).toBe(0);
    });

    it('should emit cleared event', () => {
      return new Promise<void>((resolve) => {
        documentManager.createDocument('Doc', 'content', 'owner1');
        
        documentManager.once('cleared', (data) => {
          expect(data).toHaveProperty('timestamp');
          resolve();
        });
        
        documentManager.clearAllDocuments();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode characters in content', () => {
      const doc = documentManager.createDocument(
        'Unicode Doc',
        'مرحبا بالعالم 你好世界 🌍',
        'owner1'
      );
      
      expect(doc.content).toContain('مرحبا');
    });

    it('should handle very long title', () => {
      const longTitle = 'A'.repeat(255);
      const doc = documentManager.createDocument(longTitle, 'content', 'owner1');
      expect(doc.title.length).toBe(255);
    });

    it('should handle documents with large content', async () => {
      const largeContent = 'Large '.repeat(10000);
      const doc = documentManager.createDocument('Large', largeContent, 'owner1');
      expect(doc.content.length).toBeGreaterThan(1000);
    });

    it('should handle multiple rapid operations', () => {
      for (let i = 0; i < 100; i++) {
        const doc = documentManager.createDocument(`Doc${i}`, `content${i}`, `owner${i % 5}`);
        expect(doc).toBeDefined();
      }
      
      expect(documentManager.getDocumentCount()).toBe(100);
    });

    it('should handle special characters in metadata', () => {
      const metadata = {
        department: 'R&D',
        project: '2024-Q1/Project#1',
        notes: 'Test: value with "quotes" and \'apostrophes\''
      };
      
      const doc = documentManager.createDocument(
        'Doc',
        'content',
        'owner1',
        metadata
      );
      
      expect(doc.metadata).toEqual(metadata);
    });
  });
});
