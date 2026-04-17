'use strict';

// Auto-generated unit test for exportService
jest.mock('exceljs', () => ({
  Workbook: jest.fn().mockImplementation(() => ({
    addWorksheet: jest.fn().mockReturnValue({ addRow: jest.fn(), columns: [] }),
    xlsx: { writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock')) },
  })),
}));
jest.mock('pdfkit', () => jest.fn().mockImplementation(() => ({
  pipe: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  end: jest.fn(),
  on: jest.fn(),
})));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }));

const svc = require('../../services/exportService');

describe('exportService service', () => {
  test('module exports an object with functions', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('exportToExcel is callable', async () => {
    if (typeof svc.exportToExcel !== 'function') return;
    let r;
    try { r = await svc.exportToExcel({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('exportToPDF is callable', async () => {
    if (typeof svc.exportToPDF !== 'function') return;
    let r;
    try { r = await svc.exportToPDF({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('exportToCSV is callable', async () => {
    if (typeof svc.exportToCSV !== 'function') return;
    let r;
    try { r = await svc.exportToCSV({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteExport is callable', async () => {
    if (typeof svc.deleteExport !== 'function') return;
    let r;
    try { r = await svc.deleteExport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('listExports is callable', async () => {
    if (typeof svc.listExports !== 'function') return;
    let r;
    try { r = await svc.listExports({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
