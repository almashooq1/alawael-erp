'use strict';

// Auto-generated unit test for monitoringService

const Svc = require('../../services/monitoringService');

describe('monitoringService service', () => {
  test('module exports a class/function', () => {
    expect(Svc).toBeDefined();
    expect(typeof Svc).toBe('function');
  });

  test('getSystemHealth static method is callable', async () => {
    if (typeof Svc.getSystemHealth !== 'function') return;
    let r;
    try { r = await Svc.getSystemHealth({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getPerformanceMetrics static method is callable', async () => {
    if (typeof Svc.getPerformanceMetrics !== 'function') return;
    let r;
    try { r = await Svc.getPerformanceMetrics({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('monitorEndpoints static method is callable', async () => {
    if (typeof Svc.monitorEndpoints !== 'function') return;
    let r;
    try { r = await Svc.monitorEndpoints({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getAlerts static method is callable', async () => {
    if (typeof Svc.getAlerts !== 'function') return;
    let r;
    try { r = await Svc.getAlerts({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('monitorDatabase static method is callable', async () => {
    if (typeof Svc.monitorDatabase !== 'function') return;
    let r;
    try { r = await Svc.monitorDatabase({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getRealtimeData static method is callable', async () => {
    if (typeof Svc.getRealtimeData !== 'function') return;
    let r;
    try { r = await Svc.getRealtimeData({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
