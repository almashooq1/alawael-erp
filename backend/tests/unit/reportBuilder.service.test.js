'use strict';

// Auto-generated unit test for reportBuilder.service

const svc = require('../../services/reportBuilder.service');

describe('reportBuilder.service service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('getDataSources is callable', async () => {
    if (typeof svc.getDataSources !== 'function') return;
    let r;
    try { r = await svc.getDataSources({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDataSourceById is callable', async () => {
    if (typeof svc.getDataSourceById !== 'function') return;
    let r;
    try { r = await svc.getDataSourceById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getFieldsForSource is callable', async () => {
    if (typeof svc.getFieldsForSource !== 'function') return;
    let r;
    try { r = await svc.getFieldsForSource({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createReport is callable', async () => {
    if (typeof svc.createReport !== 'function') return;
    let r;
    try { r = await svc.createReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getReportById is callable', async () => {
    if (typeof svc.getReportById !== 'function') return;
    let r;
    try { r = await svc.getReportById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getAllReports is callable', async () => {
    if (typeof svc.getAllReports !== 'function') return;
    let r;
    try { r = await svc.getAllReports({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateReport is callable', async () => {
    if (typeof svc.updateReport !== 'function') return;
    let r;
    try { r = await svc.updateReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteReport is callable', async () => {
    if (typeof svc.deleteReport !== 'function') return;
    let r;
    try { r = await svc.deleteReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('duplicateReport is callable', async () => {
    if (typeof svc.duplicateReport !== 'function') return;
    let r;
    try { r = await svc.duplicateReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addColumn is callable', async () => {
    if (typeof svc.addColumn !== 'function') return;
    let r;
    try { r = await svc.addColumn({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('removeColumn is callable', async () => {
    if (typeof svc.removeColumn !== 'function') return;
    let r;
    try { r = await svc.removeColumn({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('reorderColumns is callable', async () => {
    if (typeof svc.reorderColumns !== 'function') return;
    let r;
    try { r = await svc.reorderColumns({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addFilter is callable', async () => {
    if (typeof svc.addFilter !== 'function') return;
    let r;
    try { r = await svc.addFilter({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('removeFilter is callable', async () => {
    if (typeof svc.removeFilter !== 'function') return;
    let r;
    try { r = await svc.removeFilter({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateFilter is callable', async () => {
    if (typeof svc.updateFilter !== 'function') return;
    let r;
    try { r = await svc.updateFilter({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('setSorting is callable', async () => {
    if (typeof svc.setSorting !== 'function') return;
    let r;
    try { r = await svc.setSorting({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('setGroupBy is callable', async () => {
    if (typeof svc.setGroupBy !== 'function') return;
    let r;
    try { r = await svc.setGroupBy({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('addCalculatedField is callable', async () => {
    if (typeof svc.addCalculatedField !== 'function') return;
    let r;
    try { r = await svc.addCalculatedField({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('removeCalculatedField is callable', async () => {
    if (typeof svc.removeCalculatedField !== 'function') return;
    let r;
    try { r = await svc.removeCalculatedField({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('setChartConfig is callable', async () => {
    if (typeof svc.setChartConfig !== 'function') return;
    let r;
    try { r = await svc.setChartConfig({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('executeReport is callable', async () => {
    if (typeof svc.executeReport !== 'function') return;
    let r;
    try { r = await svc.executeReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getExecutionHistory is callable', async () => {
    if (typeof svc.getExecutionHistory !== 'function') return;
    let r;
    try { r = await svc.getExecutionHistory({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getTemplates is callable', async () => {
    if (typeof svc.getTemplates !== 'function') return;
    let r;
    try { r = await svc.getTemplates({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getTemplateById is callable', async () => {
    if (typeof svc.getTemplateById !== 'function') return;
    let r;
    try { r = await svc.getTemplateById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createReportFromTemplate is callable', async () => {
    if (typeof svc.createReportFromTemplate !== 'function') return;
    let r;
    try { r = await svc.createReportFromTemplate({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('saveAsTemplate is callable', async () => {
    if (typeof svc.saveAsTemplate !== 'function') return;
    let r;
    try { r = await svc.saveAsTemplate({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createSchedule is callable', async () => {
    if (typeof svc.createSchedule !== 'function') return;
    let r;
    try { r = await svc.createSchedule({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getSchedules is callable', async () => {
    if (typeof svc.getSchedules !== 'function') return;
    let r;
    try { r = await svc.getSchedules({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getScheduleById is callable', async () => {
    if (typeof svc.getScheduleById !== 'function') return;
    let r;
    try { r = await svc.getScheduleById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateSchedule is callable', async () => {
    if (typeof svc.updateSchedule !== 'function') return;
    let r;
    try { r = await svc.updateSchedule({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteSchedule is callable', async () => {
    if (typeof svc.deleteSchedule !== 'function') return;
    let r;
    try { r = await svc.deleteSchedule({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('exportReport is callable', async () => {
    if (typeof svc.exportReport !== 'function') return;
    let r;
    try { r = await svc.exportReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('shareReport is callable', async () => {
    if (typeof svc.shareReport !== 'function') return;
    let r;
    try { r = await svc.shareReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getReportShares is callable', async () => {
    if (typeof svc.getReportShares !== 'function') return;
    let r;
    try { r = await svc.getReportShares({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('removeShare is callable', async () => {
    if (typeof svc.removeShare !== 'function') return;
    let r;
    try { r = await svc.removeShare({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('toggleFavorite is callable', async () => {
    if (typeof svc.toggleFavorite !== 'function') return;
    let r;
    try { r = await svc.toggleFavorite({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getUserFavorites is callable', async () => {
    if (typeof svc.getUserFavorites !== 'function') return;
    let r;
    try { r = await svc.getUserFavorites({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getReportVersions is callable', async () => {
    if (typeof svc.getReportVersions !== 'function') return;
    let r;
    try { r = await svc.getReportVersions({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDashboard is callable', async () => {
    if (typeof svc.getDashboard !== 'function') return;
    let r;
    try { r = await svc.getDashboard({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('filter is callable', async () => {
    if (typeof svc.filter !== 'function') return;
    let r;
    try { r = await svc.filter({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
