/**
 * Unit tests – DocumentAnnotationService (in-memory Map + EventEmitter singleton)
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
    service = require('../../services/documentAnnotationService');
  });
});

describe('DocumentAnnotationService', () => {
  // ── Annotations ─────────────────────────────────────────────────────────

  describe('addAnnotation', () => {
    it('adds an annotation with defaults', async () => {
      const res = await service.addAnnotation('doc-1', {
        authorId: 'u1',
        authorName: 'Ahmed',
        content: 'Needs review',
      });
      expect(res.success).toBe(true);
      expect(res.data.id).toMatch(/^ann_/);
      expect(res.data.type).toBe('highlight');
      expect(res.data.status).toBe('active');
    });

    it('emits annotationAdded event', async () => {
      const spy = jest.fn();
      service.on('annotationAdded', spy);
      await service.addAnnotation('doc-1', { authorId: 'u1' });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('supports custom type and color', async () => {
      const res = await service.addAnnotation('doc-1', {
        authorId: 'u1',
        type: 'note',
        color: '#F44336',
      });
      expect(res.data.type).toBe('note');
      expect(res.data.color).toBe('#F44336');
    });
  });

  describe('getAnnotations', () => {
    beforeEach(async () => {
      await service.addAnnotation('doc-1', { authorId: 'u1', type: 'highlight', page: 1 });
      await service.addAnnotation('doc-1', { authorId: 'u2', type: 'note', page: 2 });
      await service.addAnnotation('doc-1', {
        authorId: 'u1',
        type: 'highlight',
        page: 1,
        isPrivate: true,
      });
    });

    it('returns all public annotations for a user', async () => {
      const res = await service.getAnnotations('doc-1', 'u2');
      // u2 sees: 2 public + 0 private-from-u1 = 2
      expect(res.total).toBe(2);
    });

    it('owner sees own private annotations', async () => {
      const res = await service.getAnnotations('doc-1', 'u1');
      expect(res.total).toBe(3);
    });

    it('filters by type', async () => {
      const res = await service.getAnnotations('doc-1', 'u1', { type: 'note' });
      expect(res.total).toBe(1);
    });

    it('filters by page', async () => {
      const res = await service.getAnnotations('doc-1', 'u1', { page: 1 });
      expect(res.total).toBe(2);
    });

    it('returns empty for unknown document', async () => {
      const res = await service.getAnnotations('doc-nope', 'u1');
      expect(res.total).toBe(0);
    });
  });

  describe('updateAnnotation', () => {
    it('updates fields on existing annotation', async () => {
      const { data: ann } = await service.addAnnotation('doc-1', { authorId: 'u1' });
      const res = await service.updateAnnotation('doc-1', ann.id, { content: 'updated' });
      expect(res.success).toBe(true);
      expect(res.data.content).toBe('updated');
    });

    it('fails for unknown document', async () => {
      const res = await service.updateAnnotation('doc-nope', 'ann_x', {});
      expect(res.success).toBe(false);
    });

    it('fails for unknown annotation', async () => {
      await service.addAnnotation('doc-1', { authorId: 'u1' });
      const res = await service.updateAnnotation('doc-1', 'ann_nope', {});
      expect(res.success).toBe(false);
    });
  });

  describe('deleteAnnotation', () => {
    it('soft-deletes the annotation (owner only)', async () => {
      const { data: ann } = await service.addAnnotation('doc-1', { authorId: 'u1' });
      const res = await service.deleteAnnotation('doc-1', ann.id, 'u1');
      expect(res.success).toBe(true);

      // Should not appear in getAnnotations
      const list = await service.getAnnotations('doc-1', 'u1');
      expect(list.total).toBe(0);
    });

    it('rejects deletion by non-owner', async () => {
      const { data: ann } = await service.addAnnotation('doc-1', { authorId: 'u1' });
      const res = await service.deleteAnnotation('doc-1', ann.id, 'u2');
      expect(res.success).toBe(false);
    });
  });

  // ── Comments ────────────────────────────────────────────────────────────

  describe('addComment', () => {
    it('adds a comment with mentions extracted', async () => {
      const res = await service.addComment('doc-1', {
        content: 'Check this @ahmed and @sara',
        authorId: 'u1',
        authorName: 'Ali',
      });
      expect(res.success).toBe(true);
      expect(res.data.mentions).toEqual(['ahmed', 'sara']);
    });

    it('emits commentAdded and usersMentioned', async () => {
      const commentSpy = jest.fn();
      const mentionSpy = jest.fn();
      service.on('commentAdded', commentSpy);
      service.on('usersMentioned', mentionSpy);

      await service.addComment('doc-1', {
        content: 'Hey @admin',
        authorId: 'u1',
        authorName: 'Ali',
      });
      expect(commentSpy).toHaveBeenCalledTimes(1);
      expect(mentionSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getComments (threaded)', () => {
    let rootId;

    beforeEach(async () => {
      const root = await service.addComment('doc-1', {
        content: 'Root comment',
        authorId: 'u1',
      });
      rootId = root.data.id;
      await service.replyToComment('doc-1', rootId, {
        content: 'Reply 1',
        authorId: 'u2',
      });
      await service.replyToComment('doc-1', rootId, {
        content: 'Reply 2',
        authorId: 'u3',
      });
    });

    it('builds threaded structure by default', async () => {
      const res = await service.getComments('doc-1');
      expect(res.total).toBe(3);
      expect(res.data.length).toBe(1); // 1 root
      expect(res.data[0].replies.length).toBe(2);
      expect(res.data[0].replyCount).toBe(2);
    });

    it('returns flat list when threaded=false', async () => {
      const res = await service.getComments('doc-1', { threaded: false });
      expect(res.data.length).toBe(3);
    });
  });

  describe('editComment', () => {
    it('edits owned comment and tracks history', async () => {
      const { data: cmt } = await service.addComment('doc-1', {
        content: 'Original',
        authorId: 'u1',
      });
      const res = await service.editComment('doc-1', cmt.id, 'Updated', 'u1');
      expect(res.success).toBe(true);
      expect(res.data.content).toBe('Updated');
      expect(res.data.isEdited).toBe(true);
      expect(res.data.editHistory).toHaveLength(1);
      expect(res.data.editHistory[0].oldContent).toBe('Original');
    });

    it('rejects edit by non-owner', async () => {
      const { data: cmt } = await service.addComment('doc-1', {
        content: 'X',
        authorId: 'u1',
      });
      const res = await service.editComment('doc-1', cmt.id, 'Evil', 'u2');
      expect(res.success).toBe(false);
    });
  });

  describe('deleteComment', () => {
    it('soft-deletes owned comment', async () => {
      const { data: cmt } = await service.addComment('doc-1', {
        content: 'X',
        authorId: 'u1',
      });
      const res = await service.deleteComment('doc-1', cmt.id, 'u1');
      expect(res.success).toBe(true);
    });

    it('rejects deletion by non-owner', async () => {
      const { data: cmt } = await service.addComment('doc-1', {
        content: 'X',
        authorId: 'u1',
      });
      const res = await service.deleteComment('doc-1', cmt.id, 'u2');
      expect(res.success).toBe(false);
    });
  });

  describe('toggleResolveComment', () => {
    it('resolves then unresolves', async () => {
      const { data: cmt } = await service.addComment('doc-1', {
        content: 'Issue',
        authorId: 'u1',
      });

      const r1 = await service.toggleResolveComment('doc-1', cmt.id, 'u2');
      expect(r1.data.status).toBe('resolved');
      expect(r1.data.resolvedBy).toBe('u2');

      const r2 = await service.toggleResolveComment('doc-1', cmt.id, 'u2');
      expect(r2.data.status).toBe('active');
      expect(r2.data.resolvedBy).toBeNull();
    });
  });

  describe('addReaction', () => {
    it('adds a reaction', async () => {
      const { data: cmt } = await service.addComment('doc-1', {
        content: 'Nice',
        authorId: 'u1',
      });
      const res = await service.addReaction('doc-1', cmt.id, '👍', 'u2');
      expect(res.data.reactions).toHaveLength(1);
      expect(res.data.reactions[0].emoji).toBe('👍');
    });

    it('toggles off the same reaction', async () => {
      const { data: cmt } = await service.addComment('doc-1', {
        content: 'test',
        authorId: 'u1',
      });
      await service.addReaction('doc-1', cmt.id, '👍', 'u2');
      const res = await service.addReaction('doc-1', cmt.id, '👍', 'u2');
      expect(res.data.reactions).toHaveLength(0);
    });
  });

  // ── Statistics ──────────────────────────────────────────────────────────

  describe('getStatistics', () => {
    it('returns annotation and comment stats', async () => {
      await service.addAnnotation('doc-1', { authorId: 'u1', type: 'highlight' });
      await service.addAnnotation('doc-1', { authorId: 'u2', type: 'note' });
      const { data: cmt } = await service.addComment('doc-1', {
        content: 'test',
        authorId: 'u1',
      });
      await service.addReaction('doc-1', cmt.id, '❤️', 'u2');
      await service.toggleResolveComment('doc-1', cmt.id, 'u1');

      const res = await service.getStatistics('doc-1');
      expect(res.data.totalAnnotations).toBe(2);
      expect(res.data.totalComments).toBe(1);
      expect(res.data.resolvedComments).toBe(1);
      expect(res.data.uniqueContributors).toBe(2);
      expect(res.data.totalReactions).toBe(1);
      expect(res.data.byAnnotationType.highlight).toBe(1);
    });
  });

  // ── Static metadata helpers ─────────────────────────────────────────────

  describe('getStampTypes / getAnnotationTypes', () => {
    it('returns stamp types', () => {
      const res = service.getStampTypes();
      expect(res.success).toBe(true);
      expect(res.data).toHaveProperty('APPROVED');
      expect(res.data).toHaveProperty('DRAFT');
    });

    it('returns annotation types and colors', () => {
      const res = service.getAnnotationTypes();
      expect(res.success).toBe(true);
      expect(res.data.types).toHaveProperty('HIGHLIGHT');
      expect(res.data.colors).toHaveProperty('YELLOW');
    });
  });

  // ── _extractMentions ────────────────────────────────────────────────────

  describe('_extractMentions', () => {
    it('extracts @mentions from text', () => {
      expect(service._extractMentions('Hello @ahmed and @sara')).toEqual(['ahmed', 'sara']);
    });

    it('returns empty for no mentions', () => {
      expect(service._extractMentions('no mentions here')).toEqual([]);
    });

    it('returns empty for null/undefined', () => {
      expect(service._extractMentions(null)).toEqual([]);
      expect(service._extractMentions(undefined)).toEqual([]);
    });
  });
});
