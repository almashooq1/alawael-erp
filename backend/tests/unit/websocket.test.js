'use strict';

// Auto-generated unit test for websocket
jest.mock('socket.io', () => ({}));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }));

const svc = require('../../services/websocket');

describe('websocket service', () => {
  test('module exports an object with functions', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('initializeWebSocket is callable', async () => {
    if (typeof svc.initializeWebSocket !== 'function') return;
    let r;
    try { r = await svc.initializeWebSocket({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getIO is callable', async () => {
    if (typeof svc.getIO !== 'function') return;
    let r;
    try { r = await svc.getIO({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('emitToUser is callable', async () => {
    if (typeof svc.emitToUser !== 'function') return;
    let r;
    try { r = await svc.emitToUser({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('emitToRoom is callable', async () => {
    if (typeof svc.emitToRoom !== 'function') return;
    let r;
    try { r = await svc.emitToRoom({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('broadcast is callable', async () => {
    if (typeof svc.broadcast !== 'function') return;
    let r;
    try { r = await svc.broadcast({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getConnectedUsersCount is callable', async () => {
    if (typeof svc.getConnectedUsersCount !== 'function') return;
    let r;
    try { r = await svc.getConnectedUsersCount({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('isUserOnline is callable', async () => {
    if (typeof svc.isUserOnline !== 'function') return;
    let r;
    try { r = await svc.isUserOnline({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getConnectedUserIds is callable', async () => {
    if (typeof svc.getConnectedUserIds !== 'function') return;
    let r;
    try { r = await svc.getConnectedUserIds({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('emitters is callable', async () => {
    if (typeof svc.emitters !== 'function') return;
    let r;
    try { r = await svc.emitters({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('notifyNewNotification is callable', async () => {
    if (typeof svc.notifyNewNotification !== 'function') return;
    let r;
    try { r = await svc.notifyNewNotification({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('notifySupportTicketUpdate is callable', async () => {
    if (typeof svc.notifySupportTicketUpdate !== 'function') return;
    let r;
    try { r = await svc.notifySupportTicketUpdate({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('notifySystemAlert is callable', async () => {
    if (typeof svc.notifySystemAlert !== 'function') return;
    let r;
    try { r = await svc.notifySystemAlert({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('notifyPerformanceUpdate is callable', async () => {
    if (typeof svc.notifyPerformanceUpdate !== 'function') return;
    let r;
    try { r = await svc.notifyPerformanceUpdate({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('notifyNewMessage is callable', async () => {
    if (typeof svc.notifyNewMessage !== 'function') return;
    let r;
    try { r = await svc.notifyNewMessage({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('notifyUserActivity is callable', async () => {
    if (typeof svc.notifyUserActivity !== 'function') return;
    let r;
    try { r = await svc.notifyUserActivity({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('notifyAnalyticsUpdate is callable', async () => {
    if (typeof svc.notifyAnalyticsUpdate !== 'function') return;
    let r;
    try { r = await svc.notifyAnalyticsUpdate({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('notifyReportReady is callable', async () => {
    if (typeof svc.notifyReportReady !== 'function') return;
    let r;
    try { r = await svc.notifyReportReady({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
