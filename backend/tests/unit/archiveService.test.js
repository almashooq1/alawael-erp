/**
 * Unit tests — archiveService.js
 * Static class + Archive Mongoose model + logger
 */
'use strict';

/* ── model mock ─────────────────────────────────────────────────── */
const mockCreate = jest.fn();
const mockFindOne = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();
const mockFindByIdAndUpdate = jest.fn();

jest.mock('mongoose', () => {
  const schema = function () {};
  schema.prototype.index = jest.fn();
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    Schema: Object.assign(schema, {
      Types: actual.Schema.Types,
    }),
    models: {},
    model: jest.fn(() => ({
      create: mockCreate,
      findOne: mockFindOne,
      find: mockFind,
      countDocuments: mockCountDocuments,
      findByIdAndUpdate: mockFindByIdAndUpdate,
    })),
  };
});

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const ArchiveService = require('../../services/archiveService');

beforeEach(() => {
  jest.clearAllMocks();
});

/* ================================================================ */
describe('ArchiveService', () => {
  /* ────────────────────────────────────────────────────────────── */
  describe('archiveDocument', () => {
    it('creates archive record and returns success', async () => {
      mockCreate.mockResolvedValue({
        _id: 'ARC-1',
        documentType: 'notification',
        documentId: 'N-1',
        meta: {},
        status: 'archived',
        createdAt: new Date('2025-01-01'),
      });

      const res = await ArchiveService.archiveDocument({
        documentType: 'notification',
        documentId: 'N-1',
        content: { text: 'hi' },
        meta: {},
        archivedBy: 'USER-1',
      });

      expect(res.success).toBe(true);
      expect(res.archive.id).toBe('ARC-1');
      expect(res.archive.checksum).toBeDefined();
      expect(res.message).toContain('بنجاح');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ documentType: 'notification', status: 'archived' })
      );
    });

    it('handles string content for checksum', async () => {
      mockCreate.mockResolvedValue({
        _id: 'ARC-2',
        documentType: 'doc',
        documentId: 'D1',
        meta: {},
        status: 'archived',
        createdAt: new Date(),
      });
      const res = await ArchiveService.archiveDocument({
        documentType: 'doc',
        documentId: 'D1',
        content: 'raw string',
      });
      expect(res.success).toBe(true);
    });

    it('returns failure on error', async () => {
      mockCreate.mockRejectedValue(new Error('DB down'));
      const res = await ArchiveService.archiveDocument({
        documentType: 'x',
        documentId: '1',
        content: {},
      });
      expect(res.success).toBe(false);
      expect(res.message).toBe('DB down');
    });

    it('defaults archivedBy to null and meta to {}', async () => {
      mockCreate.mockResolvedValue({
        _id: 'ARC-3',
        documentType: 't',
        documentId: 'd',
        meta: {},
        status: 'archived',
        createdAt: new Date(),
      });
      await ArchiveService.archiveDocument({ documentType: 't', documentId: 'd', content: {} });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ archivedBy: null, meta: {} })
      );
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getArchive', () => {
    it('finds by documentType + documentId', async () => {
      const lean = jest.fn().mockResolvedValue({ _id: 'A1' });
      mockFindOne.mockReturnValue({ lean });

      const res = await ArchiveService.getArchive('notification', 'N1');
      expect(res._id).toBe('A1');
      expect(mockFindOne).toHaveBeenCalledWith({
        documentType: 'notification',
        documentId: 'N1',
        status: 'archived',
      });
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('listArchives', () => {
    it('returns paginated records', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([{ _id: 'A1' }]),
            }),
          }),
        }),
      });
      mockCountDocuments.mockResolvedValue(1);

      const res = await ArchiveService.listArchives({ page: 1, limit: 10 });
      expect(res.records).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.totalPages).toBe(1);
    });

    it('applies documentType and status filters', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockCountDocuments.mockResolvedValue(0);

      await ArchiveService.listArchives({ documentType: 'doc', status: 'restored' });
      expect(mockFind).toHaveBeenCalledWith({ documentType: 'doc', status: 'restored' });
    });

    it('defaults page to 1 and limit to 20', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockCountDocuments.mockResolvedValue(0);

      const res = await ArchiveService.listArchives();
      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('restoreDocument', () => {
    it('marks archive as restored', async () => {
      mockFindByIdAndUpdate.mockResolvedValue({ _id: 'A1', status: 'restored' });
      const res = await ArchiveService.restoreDocument('A1');
      expect(res.success).toBe(true);
      expect(res.message).toContain('بنجاح');
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'A1',
        expect.objectContaining({ status: 'restored' }),
        { new: true }
      );
    });

    it('returns failure when record not found', async () => {
      mockFindByIdAndUpdate.mockResolvedValue(null);
      const res = await ArchiveService.restoreDocument('bad');
      expect(res.success).toBe(false);
      expect(res.message).toContain('غير موجود');
    });
  });
});
