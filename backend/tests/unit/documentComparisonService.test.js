/**
 * Unit Tests — documentComparisonService.js
 * In-memory singleton — NO mocks needed
 */
'use strict';

const service = require('../../services/documentComparisonService');

// Reset history between tests
beforeEach(() => {
  service.comparisonHistory = [];
});

// ═══════════════════════════════════════
//  compare
// ═══════════════════════════════════════
describe('compare', () => {
  it('compares two identical documents', async () => {
    const doc = { id: 'd1', title: 'Doc', content: 'Hello\nWorld', tags: ['a'], hash: 'abc' };
    const r = await service.compare(doc, doc);
    expect(r.success).toBe(true);
    expect(r.data.summary.identical).toBe(true);
    expect(r.data.summary.similarity).toBe(100);
    expect(r.data.summary.overallAssessment).toBe('متطابق تماماً');
    expect(r.data.contentDiff.changePercentage).toBe(0);
  });

  it('detects metadata changes', async () => {
    const docA = { id: 'd1', title: 'Title A', status: 'draft' };
    const docB = { id: 'd2', title: 'Title B', status: 'published' };
    const r = await service.compare(docA, docB);
    expect(r.data.metadataDiff.changed).toBeGreaterThan(0);
    const titleDiff = r.data.metadataDiff.details.find(d => d.field === 'title');
    expect(titleDiff.changed).toBe(true);
    expect(titleDiff.valueA).toBe('Title A');
    expect(titleDiff.valueB).toBe('Title B');
  });

  it('detects content differences', async () => {
    const docA = { id: 'd1', content: 'Line 1\nLine 2\nLine 3' };
    const docB = { id: 'd2', content: 'Line 1\nModified\nLine 3\nNew Line' };
    const r = await service.compare(docA, docB);
    expect(r.data.contentDiff.modified).toBe(1);
    expect(r.data.contentDiff.added).toBe(1);
    expect(r.data.contentDiff.unchanged).toBe(2);
    expect(r.data.contentDiff.changePercentage).toBeGreaterThan(0);
  });

  it('detects tag differences', async () => {
    const docA = { id: 'd1', tags: ['a', 'b', 'c'] };
    const docB = { id: 'd2', tags: ['b', 'c', 'd'] };
    const r = await service.compare(docA, docB);
    expect(r.data.tagsDiff.added).toEqual(['d']);
    expect(r.data.tagsDiff.removed).toEqual(['a']);
    expect(r.data.tagsDiff.common).toEqual(['b', 'c']);
  });

  it('handles missing content gracefully', async () => {
    const r = await service.compare({ id: 'd1' }, { id: 'd2' });
    expect(r.success).toBe(true);
    expect(r.data.contentDiff).toBeUndefined();
  });

  it('stores comparison in history', async () => {
    await service.compare({ id: 'd1' }, { id: 'd2' });
    expect(service.comparisonHistory.length).toBe(1);
  });

  it('hashMatch null when no hashes', async () => {
    const r = await service.compare({ id: 'd1' }, { id: 'd2' });
    expect(r.data.hashMatch).toBeNull();
  });

  it('hashMatch false for different hashes', async () => {
    const r = await service.compare({ id: 'd1', hash: 'abc' }, { id: 'd2', hash: 'def' });
    expect(r.data.hashMatch).toBe(false);
    expect(r.data.summary.identical).toBe(false);
  });
});

// ═══════════════════════════════════════
//  _compareMetadata
// ═══════════════════════════════════════
describe('_compareMetadata', () => {
  it('returns Arabic field names', () => {
    const r = service._compareMetadata({ title: 'x' }, { title: 'y' });
    const titleDiff = r.details.find(d => d.field === 'title');
    expect(titleDiff.fieldAr).toBe('العنوان');
  });

  it('marks unchanged fields', () => {
    const r = service._compareMetadata({ title: 'same' }, { title: 'same' });
    const titleDiff = r.details.find(d => d.field === 'title');
    expect(titleDiff.changed).toBe(false);
  });

  it('counts totals', () => {
    const r = service._compareMetadata({}, {});
    expect(r.total).toBe(9); // 9 metadata fields
    expect(r.changed + r.unchanged).toBe(9);
  });
});

// ═══════════════════════════════════════
//  _getFieldNameAr
// ═══════════════════════════════════════
describe('_getFieldNameAr', () => {
  it('maps known fields', () => {
    expect(service._getFieldNameAr('title')).toBe('العنوان');
    expect(service._getFieldNameAr('category')).toBe('التصنيف');
    expect(service._getFieldNameAr('fileSize')).toBe('حجم الملف');
  });

  it('returns field name for unknown', () => {
    expect(service._getFieldNameAr('something')).toBe('something');
  });
});

// ═══════════════════════════════════════
//  _compareContent
// ═══════════════════════════════════════
describe('_compareContent', () => {
  it('all unchanged for identical content', () => {
    const r = service._compareContent('a\nb', 'a\nb');
    expect(r.added).toBe(0);
    expect(r.removed).toBe(0);
    expect(r.modified).toBe(0);
    expect(r.unchanged).toBe(2);
    expect(r.changePercentage).toBe(0);
  });

  it('detects added lines', () => {
    const r = service._compareContent('a', 'a\nb');
    expect(r.added).toBe(1);
    expect(r.totalLinesA).toBe(1);
    expect(r.totalLinesB).toBe(2);
  });

  it('detects removed lines', () => {
    const r = service._compareContent('a\nb', 'a');
    expect(r.removed).toBe(1);
  });

  it('handles empty strings', () => {
    const r = service._compareContent('', '');
    expect(r.unchanged).toBe(1); // empty line
    expect(r.changePercentage).toBe(0);
  });
});

// ═══════════════════════════════════════
//  _compareChars
// ═══════════════════════════════════════
describe('_compareChars', () => {
  it('detects char-level changes', () => {
    const r = service._compareChars('abc', 'axc');
    expect(r.length).toBe(1);
    expect(r[0].start).toBe(1);
    expect(r[0].type).toBe('modified');
  });

  it('no changes for identical', () => {
    expect(service._compareChars('same', 'same')).toEqual([]);
  });

  it('detects appended chars', () => {
    const r = service._compareChars('ab', 'abcd');
    expect(r.length).toBe(1);
    expect(r[0].type).toBe('added');
  });
});

// ═══════════════════════════════════════
//  _compareTags
// ═══════════════════════════════════════
describe('_compareTags', () => {
  it('empty sets', () => {
    const r = service._compareTags([], []);
    expect(r.added).toEqual([]);
    expect(r.removed).toEqual([]);
    expect(r.common).toEqual([]);
  });
});

// ═══════════════════════════════════════
//  _generateSummary
// ═══════════════════════════════════════
describe('_generateSummary', () => {
  it('classifies similarity levels', () => {
    const base = {
      metadataDiff: { total: 10, unchanged: 10, changed: 0 },
      tagsDiff: { added: [], removed: [] },
    };

    // No content, no hash → metadata-based similarity
    expect(service._generateSummary({ ...base, hashMatch: null }).similarity).toBe(100);
    expect(service._generateSummary({ ...base, hashMatch: null }).overallAssessment).toBe(
      'متطابق تماماً'
    );

    // Low similarity via content
    const lowSim = {
      ...base,
      hashMatch: false,
      contentDiff: { changePercentage: 60 },
    };
    expect(service._generateSummary(lowSim).similarity).toBe(40);
    expect(service._generateSummary(lowSim).overallAssessment).toBe('مختلف بشكل كبير');
  });
});

// ═══════════════════════════════════════
//  getHistory
// ═══════════════════════════════════════
describe('getHistory', () => {
  it('returns paginated history', async () => {
    await service.compare({ id: 'd1' }, { id: 'd2' });
    await service.compare({ id: 'd3' }, { id: 'd4' });
    const r = await service.getHistory({});
    expect(r.success).toBe(true);
    expect(r.data.length).toBe(2);
    expect(r.total).toBe(2);
  });

  it('filters by documentId', async () => {
    await service.compare({ id: 'd1' }, { id: 'd2' });
    await service.compare({ id: 'd3' }, { id: 'd4' });
    const r = await service.getHistory({ documentId: 'd1' });
    expect(r.data.length).toBe(1);
  });

  it('paginates', async () => {
    for (let i = 0; i < 5; i++) {
      await service.compare({ id: `a${i}` }, { id: `b${i}` });
    }
    const r = await service.getHistory({ page: 1, limit: 2 });
    expect(r.data.length).toBe(2);
    expect(r.total).toBe(5);
  });
});

// ═══════════════════════════════════════
//  batchCompare
// ═══════════════════════════════════════
describe('batchCompare', () => {
  it('fails for fewer than 2 versions', async () => {
    const r = await service.batchCompare([{ id: 'd1' }]);
    expect(r.success).toBe(false);
  });

  it('compares consecutive pairs', async () => {
    const versions = [
      { id: 'd1', version: 1, content: 'v1' },
      { id: 'd1', version: 2, content: 'v2' },
      { id: 'd1', version: 3, content: 'v3' },
    ];
    const r = await service.batchCompare(versions);
    expect(r.success).toBe(true);
    expect(r.data.length).toBe(2);
    expect(r.summary.totalComparisons).toBe(2);
    expect(r.summary.versions).toBe(3);
  });

  it('fails for null', async () => {
    const r = await service.batchCompare(null);
    expect(r.success).toBe(false);
  });
});
