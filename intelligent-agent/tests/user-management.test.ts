import { describe, it, expect, beforeEach } from 'vitest';
import { UserManagement } from '../src/modules/user-management';

describe('UserManagement Module', () => {
  let um: UserManagement;
  beforeEach(() => {
    um = new UserManagement();
  });

  it('should create a user', () => {
    const user = um.createUser({ username: 'ali', email: 'ali@email.com', roles: ['admin'] });
    expect(user).toHaveProperty('id');
    expect(user.username).toBe('ali');
  });

  it('should list users', () => {
    um.createUser({ username: 'a', email: 'a@email.com', roles: ['user'] });
    um.createUser({ username: 'b', email: 'b@email.com', roles: ['user'] });
    const users = um.listUsers();
    expect(users.length).toBeGreaterThanOrEqual(2);
  });

  it('should get user by id', () => {
    const user = um.createUser({ username: 'x', email: 'x@email.com', roles: ['user'] });
    const found = um.getUser(user.id);
    expect(found).toBeDefined();
    expect(found?.username).toBe('x');
  });

  it('should update user', () => {
    const user = um.createUser({ username: 'y', email: 'y@email.com', roles: ['user'] });
    const updated = um.updateUser(user.id, { username: 'y2' });
    expect(updated?.username).toBe('y2');
  });

  it('should delete user', () => {
    const user = um.createUser({ username: 'z', email: 'z@email.com', roles: ['user'] });
    const ok = um.deleteUser(user.id);
    expect(ok).toBe(true);
    expect(um.getUser(user.id)).toBeUndefined();
  });

  it('should log activity', () => {
    const user = um.createUser({ username: 'log', email: 'log@email.com', roles: ['user'] });
    const log = um.logActivity(user.id, 'login', { ip: '127.0.0.1' });
    expect(log.userId).toBe(user.id);
    expect(log.action).toBe('login');
  });

  it('should list activity logs', () => {
    const user = um.createUser({ username: 'log2', email: 'log2@email.com', roles: ['user'] });
    um.logActivity(user.id, 'login');
    um.logActivity(user.id, 'logout');
    const logs = um.listActivityLogs();
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });
});
