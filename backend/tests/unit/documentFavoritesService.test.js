/**
 * Unit tests – DocumentFavoritesService (in-memory Map + EventEmitter singleton)
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
    service = require('../../services/documentFavoritesService');
  });
});

describe('DocumentFavoritesService', () => {
  // ── addFavorite / removeFavorite ──────────────────────────────────────

  describe('addFavorite', () => {
    it('adds a document to favorites', async () => {
      const res = await service.addFavorite('u1', 'doc-1', { note: 'important' });
      expect(res.success).toBe(true);
      expect(res.data.documentId).toBe('doc-1');
      expect(res.data.note).toBe('important');
      expect(res.data.priority).toBe('normal');
    });

    it('rejects duplicate favorites', async () => {
      await service.addFavorite('u1', 'doc-1');
      const res = await service.addFavorite('u1', 'doc-1');
      expect(res.success).toBe(false);
    });

    it('emits favoriteAdded event', async () => {
      const spy = jest.fn();
      service.on('favoriteAdded', spy);
      await service.addFavorite('u1', 'doc-2');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].documentId).toBe('doc-2');
    });
  });

  describe('removeFavorite', () => {
    it('removes an existing favorite', async () => {
      await service.addFavorite('u1', 'doc-1');
      const res = await service.removeFavorite('u1', 'doc-1');
      expect(res.success).toBe(true);
    });

    it('fails for non-existing favorite', async () => {
      const res = await service.removeFavorite('u1', 'doc-nope');
      expect(res.success).toBe(false);
    });
  });

  // ── toggleFavorite ──────────────────────────────────────────────────────

  describe('toggleFavorite', () => {
    it('adds then removes on successive toggles', async () => {
      const add = await service.toggleFavorite('u1', 'doc-1');
      expect(add.success).toBe(true);
      expect(add.data).toBeDefined(); // added

      const remove = await service.toggleFavorite('u1', 'doc-1');
      expect(remove.success).toBe(true); // removed
    });
  });

  // ── getFavorites ────────────────────────────────────────────────────────

  describe('getFavorites', () => {
    beforeEach(async () => {
      await service.addFavorite('u1', 'doc-A', { priority: 'high', tags: ['report'] });
      await service.addFavorite('u1', 'doc-B', { priority: 'low' });
      await service.addFavorite('u1', 'doc-C', { priority: 'high' });
    });

    it('returns all favorites for a user', async () => {
      const res = await service.getFavorites('u1');
      expect(res.success).toBe(true);
      expect(res.total).toBe(3);
    });

    it('filters by priority', async () => {
      const res = await service.getFavorites('u1', { priority: 'high' });
      expect(res.total).toBe(2);
    });

    it('filters by tag', async () => {
      const res = await service.getFavorites('u1', { tag: 'report' });
      expect(res.total).toBe(1);
    });

    it('paginates results', async () => {
      const res = await service.getFavorites('u1', { page: 1, limit: 2 });
      expect(res.data.length).toBe(2);
      expect(res.pages).toBe(2);
    });

    it('returns empty for unknown user', async () => {
      const res = await service.getFavorites('ghost');
      expect(res.total).toBe(0);
    });
  });

  // ── isFavorited ─────────────────────────────────────────────────────────

  describe('isFavorited', () => {
    it('returns true for existing favorite', async () => {
      await service.addFavorite('u1', 'doc-1');
      const res = await service.isFavorited('u1', 'doc-1');
      expect(res.isFavorited).toBe(true);
    });

    it('returns false for non-favorite', async () => {
      const res = await service.isFavorited('u1', 'doc-nope');
      expect(res.isFavorited).toBe(false);
    });
  });

  // ── updateFavorite ──────────────────────────────────────────────────────

  describe('updateFavorite', () => {
    it('updates an existing favorite', async () => {
      await service.addFavorite('u1', 'doc-1');
      const res = await service.updateFavorite('u1', 'doc-1', { priority: 'urgent', note: 'hey' });
      expect(res.success).toBe(true);
      expect(res.data.priority).toBe('urgent');
      expect(res.data.note).toBe('hey');
      expect(res.data.updatedAt).toBeInstanceOf(Date);
    });

    it('fails for non-existing favorite', async () => {
      const res = await service.updateFavorite('u1', 'doc-nope', {});
      expect(res.success).toBe(false);
    });
  });

  // ── recordAccess ────────────────────────────────────────────────────────

  describe('recordAccess', () => {
    it('increments accessCount', async () => {
      await service.addFavorite('u1', 'doc-1');
      await service.recordAccess('u1', 'doc-1');
      await service.recordAccess('u1', 'doc-1');
      const { data } = await service.getFavorites('u1');
      expect(data[0].accessCount).toBe(2);
    });
  });

  // ── Collections ─────────────────────────────────────────────────────────

  describe('createCollection', () => {
    it('creates a collection', async () => {
      const res = await service.createCollection('u1', { name: 'Work Docs' });
      expect(res.success).toBe(true);
      expect(res.data.name).toBe('Work Docs');
      expect(res.data.id).toMatch(/^col_/);
    });
  });

  describe('getCollections', () => {
    it('returns collections with document counts', async () => {
      const { data: col } = await service.createCollection('u1', { name: 'C1' });
      await service.addFavorite('u1', 'doc-1', { collectionId: col.id });
      await service.addFavorite('u1', 'doc-2', { collectionId: col.id });
      const res = await service.getCollections('u1');
      expect(res.data[0].documentsCount).toBe(2);
    });

    it('returns empty for user with no collections', async () => {
      const res = await service.getCollections('ghost');
      expect(res.data).toEqual([]);
    });
  });

  describe('deleteCollection', () => {
    it('deletes collection and unlinks favorites', async () => {
      const { data: col } = await service.createCollection('u1', { name: 'C1' });
      await service.addFavorite('u1', 'doc-1', { collectionId: col.id });
      const res = await service.deleteCollection('u1', col.id);
      expect(res.success).toBe(true);

      // Favorite's collectionId should be null now
      const { data: favs } = await service.getFavorites('u1');
      expect(favs[0].collectionId).toBeNull();
    });

    it('fails for non-existing collection', async () => {
      const res = await service.deleteCollection('u1', 'col_nope');
      expect(res.success).toBe(false);
    });
  });

  // ── getStatistics ───────────────────────────────────────────────────────

  describe('getStatistics', () => {
    it('returns aggregate stats', async () => {
      await service.addFavorite('u1', 'doc-1', { priority: 'high' });
      await service.addFavorite('u1', 'doc-2', { priority: 'low' });
      await service.createCollection('u1', { name: 'C1' });
      await service.recordAccess('u1', 'doc-1');
      await service.recordAccess('u1', 'doc-1');

      const res = await service.getStatistics('u1');
      expect(res.success).toBe(true);
      expect(res.data.totalFavorites).toBe(2);
      expect(res.data.totalCollections).toBe(1);
      expect(res.data.byPriority.high).toBe(1);
      expect(res.data.topAccessed[0].documentId).toBe('doc-1');
    });

    it('returns zeros for unknown user', async () => {
      const res = await service.getStatistics('ghost');
      expect(res.data.totalFavorites).toBe(0);
    });
  });
});
