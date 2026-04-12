/**
 * Unit tests – DocumentTrashService (in-memory Map + EventEmitter singleton)
 */

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

let service;

beforeEach(() => {
  jest.isolateModules(() => {
    service = require('../../services/documentTrashService');
  });
});

const makeDocData = (overrides = {}) => ({
  documentTitle: 'Test Doc',
  documentCategory: 'contracts',
  fileSize: 1024,
  filePath: '/uploads/test.pdf',
  mimeType: 'application/pdf',
  folder: '/contracts',
  deletedBy: 'user-1',
  deletedByName: 'Ahmed',
  ...overrides,
});

describe('DocumentTrashService', () => {
  // ── moveToTrash ──────────────────────────────────────────────────────────

  describe('moveToTrash', () => {
    it('adds a document to trash', async () => {
      const res = await service.moveToTrash('doc-1', makeDocData());
      expect(res.success).toBe(true);
      expect(res.data.documentId).toBe('doc-1');
      expect(res.data.canRestore).toBe(true);
      expect(res.data.expiresAt).toBeInstanceOf(Date);
    });

    it('rejects duplicates', async () => {
      await service.moveToTrash('doc-1', makeDocData());
      const res = await service.moveToTrash('doc-1', makeDocData());
      expect(res.success).toBe(false);
    });

    it('emits documentTrashed event', async () => {
      const spy = jest.fn();
      service.on('documentTrashed', spy);
      await service.moveToTrash('doc-1', makeDocData());
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  // ── restore ──────────────────────────────────────────────────────────────

  describe('restore', () => {
    it('restores a trashed document', async () => {
      await service.moveToTrash('doc-1', makeDocData());
      const res = await service.restore('doc-1', 'admin');
      expect(res.success).toBe(true);
      expect(res.data.documentId).toBe('doc-1');
    });

    it('fails for non-existing document', async () => {
      const res = await service.restore('doc-nope', 'admin');
      expect(res.success).toBe(false);
    });

    it('fails when canRestore is false', async () => {
      await service.moveToTrash('doc-1', makeDocData());
      // Manually set canRestore to false
      service.trashedDocuments.get('doc-1').canRestore = false;
      const res = await service.restore('doc-1', 'admin');
      expect(res.success).toBe(false);
    });

    it('emits documentRestored event', async () => {
      const spy = jest.fn();
      service.on('documentRestored', spy);
      await service.moveToTrash('doc-1', makeDocData());
      await service.restore('doc-1', 'admin');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  // ── bulkRestore ─────────────────────────────────────────────────────────

  describe('bulkRestore', () => {
    it('restores multiple documents', async () => {
      await service.moveToTrash('doc-1', makeDocData());
      await service.moveToTrash('doc-2', makeDocData());
      const res = await service.bulkRestore(['doc-1', 'doc-2', 'doc-missing'], 'admin');
      expect(res.data.restored).toEqual(['doc-1', 'doc-2']);
      expect(res.data.failed).toHaveLength(1);
    });
  });

  // ── permanentDelete ─────────────────────────────────────────────────────

  describe('permanentDelete', () => {
    it('permanently deletes with confirmation', async () => {
      await service.moveToTrash('doc-1', makeDocData({ fileSize: 2048 }));
      const res = await service.permanentDelete('doc-1', 'admin', 'CONFIRM_DELETE');
      expect(res.success).toBe(true);
      expect(res.freedSpace).toBe(2048);
    });

    it('fails without proper confirmation', async () => {
      await service.moveToTrash('doc-1', makeDocData());
      const res = await service.permanentDelete('doc-1', 'admin', 'wrong');
      expect(res.success).toBe(false);
    });

    it('fails for non-existing document', async () => {
      const res = await service.permanentDelete('doc-nope', 'admin', 'CONFIRM_DELETE');
      expect(res.success).toBe(false);
    });
  });

  // ── bulkPermanentDelete ─────────────────────────────────────────────────

  describe('bulkPermanentDelete', () => {
    it('deletes multiple with confirmation', async () => {
      await service.moveToTrash('doc-1', makeDocData({ fileSize: 100 }));
      await service.moveToTrash('doc-2', makeDocData({ fileSize: 200 }));
      const res = await service.bulkPermanentDelete(
        ['doc-1', 'doc-2'],
        'admin',
        'CONFIRM_DELETE_ALL'
      );
      expect(res.success).toBe(true);
      expect(res.freedSpace).toBe(300);
    });

    it('fails without proper confirmation', async () => {
      const res = await service.bulkPermanentDelete(['doc-1'], 'admin', 'nope');
      expect(res.success).toBe(false);
    });
  });

  // ── emptyTrash ──────────────────────────────────────────────────────────

  describe('emptyTrash', () => {
    it('empties all trash with confirmation', async () => {
      await service.moveToTrash('doc-1', makeDocData({ fileSize: 100 }));
      await service.moveToTrash('doc-2', makeDocData({ fileSize: 200 }));
      const res = await service.emptyTrash(null, 'CONFIRM_EMPTY_TRASH');
      expect(res.success).toBe(true);
      expect(res.deletedCount).toBe(2);
      expect(res.freedSpace).toBe(300);
    });

    it('empties only specific user trash', async () => {
      await service.moveToTrash('doc-1', makeDocData({ deletedBy: 'user-1' }));
      await service.moveToTrash('doc-2', makeDocData({ deletedBy: 'user-2' }));
      const res = await service.emptyTrash('user-1', 'CONFIRM_EMPTY_TRASH');
      expect(res.deletedCount).toBe(1);
    });

    it('fails without confirmation', async () => {
      const res = await service.emptyTrash(null, 'wrong');
      expect(res.success).toBe(false);
    });
  });

  // ── getTrash ────────────────────────────────────────────────────────────

  describe('getTrash', () => {
    beforeEach(async () => {
      await service.moveToTrash(
        'doc-1',
        makeDocData({ documentTitle: 'Alpha', documentCategory: 'HR', deletedBy: 'u1' })
      );
      await service.moveToTrash(
        'doc-2',
        makeDocData({ documentTitle: 'Beta', documentCategory: 'Legal', deletedBy: 'u2' })
      );
      await service.moveToTrash(
        'doc-3',
        makeDocData({ documentTitle: 'Alpha Report', documentCategory: 'HR', deletedBy: 'u1' })
      );
    });

    it('returns all trash items', async () => {
      const res = await service.getTrash();
      expect(res.total).toBe(3);
    });

    it('filters by userId', async () => {
      const res = await service.getTrash('u1');
      expect(res.total).toBe(2);
    });

    it('filters by category', async () => {
      const res = await service.getTrash(null, { category: 'HR' });
      expect(res.total).toBe(2);
    });

    it('searches by title', async () => {
      const res = await service.getTrash(null, { search: 'alpha' });
      expect(res.total).toBe(2);
    });

    it('paginates', async () => {
      const res = await service.getTrash(null, { page: 1, limit: 2 });
      expect(res.data.length).toBe(2);
      expect(res.pages).toBe(2);
    });

    it('includes daysRemaining', async () => {
      const res = await service.getTrash();
      res.data.forEach(d => {
        expect(typeof d.daysRemaining).toBe('number');
      });
    });
  });

  // ── autoPurge ───────────────────────────────────────────────────────────

  describe('autoPurge', () => {
    it('purges expired items', async () => {
      await service.moveToTrash('doc-1', makeDocData({ fileSize: 500 }));
      // Force expiry to past
      service.trashedDocuments.get('doc-1').expiresAt = new Date(Date.now() - 1000);

      const res = await service.autoPurge();
      expect(res.data).toHaveLength(1);
      expect(res.freedSpace).toBe(500);
    });

    it('skips non-expired items', async () => {
      await service.moveToTrash('doc-1', makeDocData());
      const res = await service.autoPurge();
      expect(res.data).toHaveLength(0);
    });
  });

  // ── getStatistics ───────────────────────────────────────────────────────

  describe('getStatistics', () => {
    it('returns trash statistics', async () => {
      await service.moveToTrash('doc-1', makeDocData({ fileSize: 100 }));
      await service.moveToTrash('doc-2', makeDocData({ fileSize: 200 }));
      const res = await service.getStatistics();
      expect(res.success).toBe(true);
      expect(res.data.totalItems).toBe(2);
      expect(res.data.totalSize).toBe(300);
      expect(res.data.purgeAfterDays).toBe(30);
    });

    it('filters stats by userId', async () => {
      await service.moveToTrash('doc-1', makeDocData({ deletedBy: 'u1' }));
      await service.moveToTrash('doc-2', makeDocData({ deletedBy: 'u2' }));
      const res = await service.getStatistics('u1');
      expect(res.data.totalItems).toBe(1);
    });
  });
});
