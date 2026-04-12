/**
 * Unit Tests — DocumentWatermarkService
 * P#66 - Batch 26
 *
 * Pure in-memory singleton (EventEmitter + crypto).
 * Covers: getPresets, applyWatermark, removeWatermark, getDocumentWatermarks,
 *         createTemplate, getTemplates, verifyWatermark,
 *         _generateCSSWatermark, _generateSVGWatermark
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('DocumentWatermarkService', () => {
  let service;

  beforeEach(() => {
    jest.isolateModules(() => {
      service = require('../../services/documentWatermarkService');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Presets                                                             */
  /* ------------------------------------------------------------------ */
  describe('getPresets', () => {
    it('returns all watermark presets', () => {
      const res = service.getPresets();
      expect(res.success).toBe(true);
      expect(res.data.length).toBe(8);
    });

    it('each preset has required fields', () => {
      const { data } = service.getPresets();
      data.forEach(p => {
        expect(p).toHaveProperty('id');
        expect(p).toHaveProperty('text');
        expect(p).toHaveProperty('color');
        expect(p).toHaveProperty('fontSize');
        expect(p).toHaveProperty('rotation');
        expect(p).toHaveProperty('position');
      });
    });

    it('WATERMARK_PRESETS constant is accessible', () => {
      expect(service.WATERMARK_PRESETS).toBeDefined();
      expect(service.WATERMARK_PRESETS.CONFIDENTIAL).toBeDefined();
      expect(service.WATERMARK_PRESETS.DRAFT).toBeDefined();
      expect(service.WATERMARK_PRESETS.VOID).toBeDefined();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  applyWatermark                                                      */
  /* ------------------------------------------------------------------ */
  describe('applyWatermark', () => {
    it('applies a basic text watermark', async () => {
      const res = await service.applyWatermark(
        'doc1',
        { text: 'SECRET' },
        { id: 'u1', name: 'Ali' }
      );
      expect(res.success).toBe(true);
      expect(res.data.documentId).toBe('doc1');
      expect(res.data.text).toContain('SECRET');
      expect(res.data.isActive).toBe(true);
      expect(res.data.hash).toBeDefined();
      expect(res.data.css).toBeDefined();
      expect(res.data.svg).toBeDefined();
    });

    it('applies a preset watermark', async () => {
      const res = await service.applyWatermark('doc2', { preset: 'CONFIDENTIAL' });
      expect(res.data.text).toContain('سري');
    });

    it('includes date when includeDate=true', async () => {
      const res = await service.applyWatermark('doc3', { text: 'WM', includeDate: true });
      // Date part is appended with ' | '
      expect(res.data.text).toContain('|');
    });

    it('includes user name when includeUserName=true', async () => {
      const res = await service.applyWatermark(
        'doc4',
        { text: 'WM', includeUserName: true },
        { id: 'u1', name: 'Ahmed' }
      );
      expect(res.data.text).toContain('Ahmed');
    });

    it('includes docId suffix when includeDocId=true', async () => {
      const docId = 'abc12345678';
      const res = await service.applyWatermark(docId, { text: 'WM', includeDocId: true });
      expect(res.data.text).toContain('#');
    });

    it('generates unique id and hash per watermark', async () => {
      const r1 = await service.applyWatermark('doc5', { text: 'A' });
      const r2 = await service.applyWatermark('doc5', { text: 'B' });
      expect(r1.data.id).not.toBe(r2.data.id);
      expect(r1.data.hash).not.toBe(r2.data.hash);
    });

    it('emits "watermarkApplied" event', async () => {
      const spy = jest.fn();
      service.on('watermarkApplied', spy);
      await service.applyWatermark('docE', { text: 'ev' });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('stores watermark in history', async () => {
      await service.applyWatermark('docH', { text: 'H' });
      expect(service.watermarkHistory.length).toBe(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _generateCSSWatermark                                               */
  /* ------------------------------------------------------------------ */
  describe('_generateCSSWatermark', () => {
    it('generates repeating watermark when repeat=true', () => {
      const css = service._generateCSSWatermark({
        text: 'test',
        color: 'red',
        fontSize: 40,
        fontFamily: 'Arial',
        rotation: -45,
        position: 'center',
        opacity: 0.15,
        repeat: true,
        spacing: 200,
      });
      expect(css.type).toBe('repeating');
      expect(css.style.backgroundRepeat).toBe('repeat');
    });

    it('generates single watermark at center', () => {
      const css = service._generateCSSWatermark({
        text: 'test',
        color: 'red',
        fontSize: 40,
        fontFamily: 'Arial',
        rotation: -45,
        position: 'center',
        opacity: 0.15,
        repeat: false,
        spacing: 200,
      });
      expect(css.type).toBe('single');
      expect(css.text).toBe('test');
      expect(css.style.position).toBe('absolute');
    });

    it('supports different positions', () => {
      const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      positions.forEach(pos => {
        const css = service._generateCSSWatermark({
          text: 'x',
          color: '#000',
          fontSize: 20,
          fontFamily: 'Arial',
          rotation: 0,
          position: pos,
          opacity: 0.1,
          repeat: false,
          spacing: 100,
        });
        expect(css.type).toBe('single');
      });
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _generateSVGWatermark                                               */
  /* ------------------------------------------------------------------ */
  describe('_generateSVGWatermark', () => {
    it('generates SVG string', () => {
      const svg = service._generateSVGWatermark({
        text: 'Secret',
        color: 'red',
        fontSize: 40,
        rotation: -45,
        repeat: false,
      });
      expect(svg).toContain('<svg');
      expect(svg).toContain('Secret');
      expect(svg).toContain('width="600"');
    });

    it('uses smaller dimensions when repeat=true', () => {
      const svg = service._generateSVGWatermark({
        text: 'Rep',
        color: '#000',
        fontSize: 20,
        rotation: 0,
        repeat: true,
      });
      expect(svg).toContain('width="300"');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  removeWatermark                                                     */
  /* ------------------------------------------------------------------ */
  describe('removeWatermark', () => {
    it('deactivates an existing watermark', async () => {
      const { data } = await service.applyWatermark('doc1', { text: 'x' });
      const res = await service.removeWatermark(data.id, { id: 'admin' });
      expect(res.success).toBe(true);
      const wm = service.watermarkHistory.find(w => w.id === data.id);
      expect(wm.isActive).toBe(false);
      expect(wm.removedAt).toBeDefined();
    });

    it('returns error for non-existent watermark', async () => {
      const res = await service.removeWatermark('ghost');
      expect(res.success).toBe(false);
    });

    it('emits "watermarkRemoved" event', async () => {
      const spy = jest.fn();
      service.on('watermarkRemoved', spy);
      const { data } = await service.applyWatermark('doc2', { text: 'y' });
      await service.removeWatermark(data.id);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getDocumentWatermarks                                               */
  /* ------------------------------------------------------------------ */
  describe('getDocumentWatermarks', () => {
    it('returns active watermarks for a document', async () => {
      await service.applyWatermark('docA', { text: 'A1' });
      await service.applyWatermark('docA', { text: 'A2' });
      await service.applyWatermark('docB', { text: 'B1' });
      const res = await service.getDocumentWatermarks('docA');
      expect(res.data.length).toBe(2);
    });

    it('filters inactive when activeOnly=true (default)', async () => {
      const { data } = await service.applyWatermark('docC', { text: 'C1' });
      await service.applyWatermark('docC', { text: 'C2' });
      await service.removeWatermark(data.id);
      const res = await service.getDocumentWatermarks('docC', true);
      expect(res.data.length).toBe(1);
    });

    it('includes inactive when activeOnly=false', async () => {
      const { data } = await service.applyWatermark('docD', { text: 'D1' });
      await service.applyWatermark('docD', { text: 'D2' });
      await service.removeWatermark(data.id);
      const res = await service.getDocumentWatermarks('docD', false);
      expect(res.data.length).toBe(2);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Templates                                                           */
  /* ------------------------------------------------------------------ */
  describe('createTemplate / getTemplates', () => {
    it('creates a custom template for org', async () => {
      const res = await service.createTemplate('org1', { name: 'Logo WM', nameAr: 'علامة شعار' });
      expect(res.success).toBe(true);
      expect(res.data.orgId).toBe('org1');
      expect(res.data.id).toContain('wmt_');
    });

    it('getTemplates returns presets + custom', async () => {
      await service.createTemplate('org1', { name: 'Custom1' });
      const res = await service.getTemplates('org1');
      // 8 presets + 1 custom
      expect(res.data.length).toBe(9);
    });

    it('getTemplates returns only presets when no customs', async () => {
      const res = await service.getTemplates('org99');
      expect(res.data.length).toBe(8);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  verifyWatermark                                                     */
  /* ------------------------------------------------------------------ */
  describe('verifyWatermark', () => {
    it('verifies a valid watermark hash', async () => {
      const { data } = await service.applyWatermark('docV', { text: 'verify' });
      const res = await service.verifyWatermark(data.hash);
      expect(res.success).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.data.documentId).toBe('docV');
    });

    it('rejects invalid hash', async () => {
      const res = await service.verifyWatermark('invalidhash');
      expect(res.success).toBe(false);
      expect(res.verified).toBe(false);
    });
  });
});
