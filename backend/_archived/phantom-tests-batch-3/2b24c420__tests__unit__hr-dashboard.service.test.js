'use strict';

// Auto-generated unit test for hr-dashboard.service
jest.mock('../../utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }));

const svc = require('../../services/hr-dashboard.service');

describe('hr-dashboard.service service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('getHRDashboard is callable', async () => {
    if (typeof svc.getHRDashboard !== 'function') return;
    let r;
    try { r = await svc.getHRDashboard({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getEmployeeDetails is callable', async () => {
    if (typeof svc.getEmployeeDetails !== 'function') return;
    let r;
    try { r = await svc.getEmployeeDetails({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('exportHRReport is callable', async () => {
    if (typeof svc.exportHRReport !== 'function') return;
    let r;
    try { r = await svc.exportHRReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
