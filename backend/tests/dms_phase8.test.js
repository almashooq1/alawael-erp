const DmsServiceClass = require('../services/dmsService');
const dmsService = new DmsServiceClass();
const Document = require('../models/Document');
const User = require('../models/User');

// Mock Mongoose Models
jest.mock('../models/Document');
jest.mock('../models/User');

const dmsInstance = dmsService;

describe('Phase 8: Document Management+ (DMS)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Version Control', () => {
    test('createNewVersion should archive old version and update text', async () => {
      const mockDoc = {
        _id: 'doc123',
        version: 1,
        lastModified: new Date('2025-01-01'),
        lastModifiedBy: 'user1Old',
        filePath: 'old/path.pdf',
        fileSize: 100,
        previousVersions: [],
        save: jest.fn().mockResolvedValue('savedMockDoc'),
      };

      Document.findById.mockResolvedValue(mockDoc);

      const newFile = { path: 'new/path.docx', size: 200 };
      const userId = 'user2New';

      const result = await dmsInstance.createNewVersion('doc123', newFile, userId);

      // Expect old version to be pushed to previousVersions
      expect(mockDoc.previousVersions).toHaveLength(1);
      expect(mockDoc.previousVersions[0].versionNumber).toBe(1);
      expect(mockDoc.previousVersions[0].filePath).toBe('old/path.pdf');

      // Expect document to be updated
      expect(mockDoc.version).toBe(2);
      expect(mockDoc.filePath).toBe('new/path.docx');
      expect(mockDoc.fileSize).toBe(200);
      expect(mockDoc.lastModifiedBy).toBe(userId);

      expect(mockDoc.save).toHaveBeenCalled();
      expect(result).toBe('savedMockDoc');
    });

    test('createNewVersion should throw if document not found', async () => {
      Document.findById.mockResolvedValue(null);

      await expect(dmsInstance.createNewVersion('badId', {}, 'u1')).rejects.toThrow('Document not found');
    });
  });

  // Add signature test later if needed, but versioning is core to "Document Management+"
});
