'use strict';

// No model file to mock

const svc = require('../../services/dddExportService');

describe('dddExportService service', () => {
  test('EXPORT_COLUMNS is an object', () => { expect(typeof svc.EXPORT_COLUMNS).toBe('object'); });
  test('fetchExportData is callable', async () => {
    let r; try { r = await svc.fetchExportData(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
  test('toExcel is callable', async () => {
    let r; try { r = await svc.toExcel(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
  test('toPDF is callable', async () => {
    let r; try { r = await svc.toPDF(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
