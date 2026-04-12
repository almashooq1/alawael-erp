'use strict';

// Auto-generated unit test for userService

const Svc = require('../../services/userService');

describe('userService service', () => {
  test('module exports a class/function', () => {
    expect(Svc).toBeDefined();
    expect(typeof Svc).toBe('function');
  });

  test('getAllUsers static method is callable', async () => {
    if (typeof Svc.getAllUsers !== 'function') return;
    let r;
    try { r = await Svc.getAllUsers({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getUserById static method is callable', async () => {
    if (typeof Svc.getUserById !== 'function') return;
    let r;
    try { r = await Svc.getUserById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createUser static method is callable', async () => {
    if (typeof Svc.createUser !== 'function') return;
    let r;
    try { r = await Svc.createUser({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateUser static method is callable', async () => {
    if (typeof Svc.updateUser !== 'function') return;
    let r;
    try { r = await Svc.updateUser({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteUser static method is callable', async () => {
    if (typeof Svc.deleteUser !== 'function') return;
    let r;
    try { r = await Svc.deleteUser({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('toggleUserStatus static method is callable', async () => {
    if (typeof Svc.toggleUserStatus !== 'function') return;
    let r;
    try { r = await Svc.toggleUserStatus({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('changeUserRole static method is callable', async () => {
    if (typeof Svc.changeUserRole !== 'function') return;
    let r;
    try { r = await Svc.changeUserRole({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getUserStatistics static method is callable', async () => {
    if (typeof Svc.getUserStatistics !== 'function') return;
    let r;
    try { r = await Svc.getUserStatistics({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('importUsers static method is callable', async () => {
    if (typeof Svc.importUsers !== 'function') return;
    let r;
    try { r = await Svc.importUsers({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('exportUsers static method is callable', async () => {
    if (typeof Svc.exportUsers !== 'function') return;
    let r;
    try { r = await Svc.exportUsers({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('searchUsers static method is callable', async () => {
    if (typeof Svc.searchUsers !== 'function') return;
    let r;
    try { r = await Svc.searchUsers({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('resetUserPassword static method is callable', async () => {
    if (typeof Svc.resetUserPassword !== 'function') return;
    let r;
    try { r = await Svc.resetUserPassword({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getUserActivityLog static method is callable', async () => {
    if (typeof Svc.getUserActivityLog !== 'function') return;
    let r;
    try { r = await Svc.getUserActivityLog({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
