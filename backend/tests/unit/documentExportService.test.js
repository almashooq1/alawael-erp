/**
 * Unit Tests — DocumentExportImportService
 * P#68 - Batch 29
 *
 * Pure in-memory singleton (EventEmitter + crypto).
 * Covers: createExportJob, createImportJob, _validateDocument,
 *         getExportJob, getImportJob, getJobs, exportToCSV, exportToJSON
 */

'use strict';

describe('DocumentExportImportService', () => {
  let service;

  beforeEach(() => {
    jest.isolateModules(() => {
      service = require('../../services/documentExportService');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Initial State                                                      */
  /* ------------------------------------------------------------------ */
  describe('initial state', () => {
    it('starts with empty export and import jobs', () => {
      expect(service.exportJobs.size).toBe(0);
      expect(service.importJobs.size).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  createExportJob                                                     */
  /* ------------------------------------------------------------------ */
  describe('createExportJob', () => {
    it('creates an export job with defaults', async () => {
      const res = await service.createExportJob({
        documentIds: ['d1', 'd2'],
        requestedBy: 'u1',
      });
      expect(res.success).toBe(true);
      expect(res.data.id).toContain('exp_');
      expect(res.data.type).toBe('export');
      expect(res.data.format).toBe('json');
      expect(res.data.documentCount).toBe(2);
      expect(res.data.status).toBe('completed');
      expect(res.data.progress).toBe(100);
      expect(res.data.result).toBeDefined();
      expect(res.data.result.checksum).toBeDefined();
      expect(res.data.result.downloadUrl).toContain(res.data.id);
    });

    it('includes metadata by default', async () => {
      const res = await service.createExportJob({
        documentIds: ['d1'],
        requestedBy: 'u1',
      });
      const doc = res.data.result.data.documents[0];
      expect(doc.metadata).toBeDefined();
      expect(doc.metadata.title).toBeDefined();
    });

    it('excludes metadata when includeMetadata=false', async () => {
      const res = await service.createExportJob({
        documentIds: ['d1'],
        includeMetadata: false,
        requestedBy: 'u1',
      });
      const doc = res.data.result.data.documents[0];
      expect(doc.metadata).toBeUndefined();
    });

    it('includes versions when includeVersions=true', async () => {
      const res = await service.createExportJob({
        documentIds: ['d1'],
        includeVersions: true,
        requestedBy: 'u1',
      });
      const doc = res.data.result.data.documents[0];
      expect(doc.versions).toBeDefined();
    });

    it('includes comments when includeComments=true', async () => {
      const res = await service.createExportJob({
        documentIds: ['d1'],
        includeComments: true,
        requestedBy: 'u1',
      });
      const doc = res.data.result.data.documents[0];
      expect(doc.comments).toBeDefined();
    });

    it('generates SHA-256 checksum', async () => {
      const res = await service.createExportJob({
        documentIds: ['d1'],
        requestedBy: 'u1',
      });
      expect(res.data.result.checksum).toHaveLength(64);
    });

    it('stores job in exportJobs map', async () => {
      const res = await service.createExportJob({
        documentIds: ['d1'],
        requestedBy: 'u1',
      });
      expect(service.exportJobs.has(res.data.id)).toBe(true);
    });

    it('emits "exportStarted" and "exportCompleted" events', async () => {
      const spyStart = jest.fn();
      const spyDone = jest.fn();
      service.on('exportStarted', spyStart);
      service.on('exportCompleted', spyDone);
      await service.createExportJob({ documentIds: ['d1'], requestedBy: 'u1' });
      expect(spyStart).toHaveBeenCalledTimes(1);
      expect(spyDone).toHaveBeenCalledTimes(1);
    });

    it('handles empty documentIds', async () => {
      const res = await service.createExportJob({ requestedBy: 'u1' });
      expect(res.data.documentCount).toBe(0);
      expect(res.data.status).toBe('completed');
    });

    it('preserves requestedByName', async () => {
      const res = await service.createExportJob({
        documentIds: ['d1'],
        requestedBy: 'u1',
        requestedByName: 'Ahmed',
      });
      expect(res.data.requestedByName).toBe('Ahmed');
    });

    it('sets result.size based on JSON length', async () => {
      const res = await service.createExportJob({
        documentIds: ['d1', 'd2', 'd3'],
        requestedBy: 'u1',
      });
      expect(res.data.result.size).toBeGreaterThan(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  createImportJob                                                     */
  /* ------------------------------------------------------------------ */
  describe('createImportJob', () => {
    it('imports documents from sourceData', async () => {
      const res = await service.createImportJob({
        sourceData: {
          documents: [
            { id: 'd1', metadata: { title: 'Doc 1' } },
            { id: 'd2', metadata: { title: 'Doc 2' } },
          ],
        },
        requestedBy: 'u1',
      });
      expect(res.success).toBe(true);
      expect(res.data.status).toBe('completed');
      expect(res.data.results.total).toBe(2);
      expect(res.data.results.imported).toBe(2);
      expect(res.data.results.failed).toBe(0);
    });

    it('validates checksum correctly', async () => {
      const crypto = require('crypto');
      const documents = [{ id: 'd1', metadata: { title: 'Test' } }];
      const checksum = crypto.createHash('sha256').update(JSON.stringify(documents)).digest('hex');
      const res = await service.createImportJob({
        sourceData: { documents, checksum },
        requestedBy: 'u1',
      });
      expect(res.data.status).toBe('completed');
      expect(res.data.results.imported).toBe(1);
    });

    it('fails on checksum mismatch', async () => {
      const res = await service.createImportJob({
        sourceData: {
          documents: [{ id: 'd1', metadata: { title: 'Test' } }],
          checksum: 'invalid_checksum',
        },
        requestedBy: 'u1',
      });
      expect(res.data.status).toBe('failed');
      expect(res.data.error).toContain('checksum');
    });

    it('fails validation for document without id', async () => {
      const res = await service.createImportJob({
        sourceData: {
          documents: [{ metadata: { title: 'No ID' } }],
        },
        requestedBy: 'u1',
      });
      expect(res.data.results.failed).toBe(1);
      expect(res.data.results.errors.length).toBe(1);
    });

    it('fails validation for document without title', async () => {
      const res = await service.createImportJob({
        sourceData: {
          documents: [{ id: 'd1' }],
        },
        requestedBy: 'u1',
      });
      expect(res.data.results.failed).toBe(1);
    });

    it('handles validateOnly=true', async () => {
      const res = await service.createImportJob({
        sourceData: {
          documents: [{ id: 'd1', metadata: { title: 'T' } }],
        },
        validateOnly: true,
        requestedBy: 'u1',
      });
      expect(res.data.status).toBe('completed');
      expect(res.data.results.imported).toBe(1);
      expect(res.message).toContain('التحقق');
    });

    it('stores job in importJobs map', async () => {
      const res = await service.createImportJob({
        sourceData: { documents: [] },
        requestedBy: 'u1',
      });
      expect(service.importJobs.has(res.data.id)).toBe(true);
    });

    it('emits "importStarted" and "importCompleted"', async () => {
      const spyStart = jest.fn();
      const spyDone = jest.fn();
      service.on('importStarted', spyStart);
      service.on('importCompleted', spyDone);
      await service.createImportJob({
        sourceData: { documents: [{ id: 'd1', metadata: { title: 'T' } }] },
        requestedBy: 'u1',
      });
      expect(spyStart).toHaveBeenCalledTimes(1);
      expect(spyDone).toHaveBeenCalledTimes(1);
    });

    it('handles empty documents array', async () => {
      const res = await service.createImportJob({
        sourceData: { documents: [] },
        requestedBy: 'u1',
      });
      expect(res.data.results.total).toBe(0);
    });

    it('defaults mergeStrategy to "skip"', async () => {
      const res = await service.createImportJob({
        sourceData: { documents: [] },
        requestedBy: 'u1',
      });
      expect(res.data.mergeStrategy).toBe('skip');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _validateDocument                                                   */
  /* ------------------------------------------------------------------ */
  describe('_validateDocument', () => {
    it('valid: has id and metadata.title', () => {
      expect(service._validateDocument({ id: '1', metadata: { title: 'T' } })).toEqual({
        valid: true,
      });
    });

    it('invalid: missing id', () => {
      const res = service._validateDocument({ metadata: { title: 'T' } });
      expect(res.valid).toBe(false);
    });

    it('invalid: missing metadata.title', () => {
      const res = service._validateDocument({ id: '1' });
      expect(res.valid).toBe(false);
    });

    it('invalid: empty metadata', () => {
      const res = service._validateDocument({ id: '1', metadata: {} });
      expect(res.valid).toBe(false);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getExportJob / getImportJob                                         */
  /* ------------------------------------------------------------------ */
  describe('getExportJob / getImportJob', () => {
    it('retrieves existing export job', async () => {
      const { data } = await service.createExportJob({ documentIds: ['d1'], requestedBy: 'u1' });
      const res = await service.getExportJob(data.id);
      expect(res.success).toBe(true);
      expect(res.data.id).toBe(data.id);
    });

    it('returns error for non-existent export job', async () => {
      const res = await service.getExportJob('ghost');
      expect(res.success).toBe(false);
    });

    it('retrieves existing import job', async () => {
      const { data } = await service.createImportJob({
        sourceData: { documents: [] },
        requestedBy: 'u1',
      });
      const res = await service.getImportJob(data.id);
      expect(res.success).toBe(true);
    });

    it('returns error for non-existent import job', async () => {
      const res = await service.getImportJob('ghost');
      expect(res.success).toBe(false);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getJobs                                                             */
  /* ------------------------------------------------------------------ */
  describe('getJobs', () => {
    beforeEach(async () => {
      await service.createExportJob({ documentIds: ['d1'], requestedBy: 'u1' });
      await service.createExportJob({ documentIds: ['d2'], requestedBy: 'u2' });
      await service.createImportJob({
        sourceData: { documents: [{ id: 'd3', metadata: { title: 'T' } }] },
        requestedBy: 'u1',
      });
    });

    it('returns only export jobs', async () => {
      const res = await service.getJobs('export');
      expect(res.total).toBe(2);
    });

    it('returns only import jobs', async () => {
      const res = await service.getJobs('import');
      expect(res.total).toBe(1);
    });

    it('returns all jobs when type=null', async () => {
      const res = await service.getJobs(null);
      expect(res.total).toBe(3);
    });

    it('filters by status', async () => {
      const res = await service.getJobs('export', { status: 'completed' });
      expect(res.total).toBe(2);
    });

    it('filters by requestedBy', async () => {
      const res = await service.getJobs('export', { requestedBy: 'u1' });
      expect(res.total).toBe(1);
    });

    it('sorts by createdAt descending', async () => {
      const res = await service.getJobs(null);
      expect(new Date(res.data[0].createdAt) >= new Date(res.data[1].createdAt)).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  exportToCSV                                                         */
  /* ------------------------------------------------------------------ */
  describe('exportToCSV', () => {
    it('generates CSV with BOM and headers', async () => {
      const docs = [{ id: '1', title: 'Doc A', category: 'HR', status: 'active', tags: ['t1'] }];
      const res = await service.exportToCSV(docs);
      expect(res.success).toBe(true);
      expect(res.data.startsWith('\uFEFF')).toBe(true);
      expect(res.data).toContain('المعرف');
      expect(res.data).toContain('Doc A');
      expect(res.mimeType).toBe('text/csv');
      expect(res.filename).toContain('.csv');
    });

    it('handles empty documents', async () => {
      const res = await service.exportToCSV([]);
      expect(res.success).toBe(true);
      expect(res.data).toContain('المعرف'); // headers still present
    });

    it('joins tags with comma', async () => {
      const docs = [{ id: '1', tags: ['sales', 'urgent'] }];
      const res = await service.exportToCSV(docs);
      expect(res.data).toContain('sales, urgent');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  exportToJSON                                                        */
  /* ------------------------------------------------------------------ */
  describe('exportToJSON', () => {
    it('generates JSON report with checksum', async () => {
      const docs = [{ id: '1', title: 'Doc A' }];
      const res = await service.exportToJSON(docs);
      expect(res.success).toBe(true);
      const parsed = JSON.parse(res.data);
      expect(parsed.totalDocuments).toBe(1);
      expect(parsed.checksum).toHaveLength(64);
      expect(parsed.system).toContain('الأوائل');
      expect(res.mimeType).toBe('application/json');
      expect(res.filename).toContain('.json');
    });

    it('maps document fields correctly', async () => {
      const docs = [
        { _id: 'x1', title: 'T', description: 'D', category: 'C', status: 'S', tags: ['tg'] },
      ];
      const res = await service.exportToJSON(docs);
      const parsed = JSON.parse(res.data);
      expect(parsed.documents[0].id).toBe('x1');
      expect(parsed.documents[0].title).toBe('T');
      expect(parsed.documents[0].tags).toEqual(['tg']);
    });

    it('handles empty documents', async () => {
      const res = await service.exportToJSON([]);
      const parsed = JSON.parse(res.data);
      expect(parsed.totalDocuments).toBe(0);
    });
  });
});
