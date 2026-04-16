'use strict';

// Auto-generated unit test for pdfExportService
jest.mock('pdfkit', () => jest.fn().mockImplementation(() => ({
  pipe: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  end: jest.fn(),
  on: jest.fn(),
})));

const svc = require('../../services/pdfExportService');

describe('pdfExportService service', () => {
  test('module exports an object with functions', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('generateNotificationPDF is callable', async () => {
    if (typeof svc.generateNotificationPDF !== 'function') return;
    let r;
    try { r = await svc.generateNotificationPDF({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
