const DmsServiceClass = require('../services/dmsService');
const dmsService = new DmsServiceClass();
const Document = require('../models/Document');

jest.mock('../models/Document');

describe('DmsService Phase 8', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNewVersion', () => {
    it('should archive old version and update to new', async () => {
      const mockDoc = {
        _id: 'doc1',
        version: 1,
        lastModified: new Date(),
        filePath: 'old.pdf',
        fileSize: 500,
        previousVersions: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Document.findById.mockResolvedValue(mockDoc);

      await dmsService.createNewVersion('doc1', { path: 'new.pdf', size: 1000 }, 'user1');

      expect(mockDoc.previousVersions).toHaveLength(1);
      expect(mockDoc.version).toBe(2);
      expect(mockDoc.filePath).toBe('new.pdf');
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });

  describe('signDocument', () => {
    it('should add signature to document', async () => {
      const mockDoc = {
        _id: 'doc1',
        signatures: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Document.findById.mockResolvedValue(mockDoc);

      await dmsService.signDocument('doc1', 'user1', '1234');

      expect(mockDoc.signatures).toHaveLength(1);
      expect(mockDoc.signatures[0].signedBy).toBe('user1');
      expect(mockDoc.signatures[0].status).toBe('signed');
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });

  describe('grantAccess', () => {
    it('should add user to sharedWith list', async () => {
      const mockDoc = {
        _id: 'doc1',
        sharedWith: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Document.findById.mockResolvedValue(mockDoc);

      await dmsService.grantAccess('doc1', 'user2', 'edit');

      expect(mockDoc.sharedWith).toHaveLength(1);
      expect(mockDoc.sharedWith[0].userId).toBe('user2');
      expect(mockDoc.sharedWith[0].permission).toBe('edit');
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });
});
