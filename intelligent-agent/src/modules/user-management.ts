// src/modules/user-management.ts
// Advanced User Management Module (SSO, OAuth2, Activity Log)

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  provider?: 'local' | 'oauth2' | 'saml';
  lastLogin?: string;
  metadata?: Record<string, any>;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details?: any;
}

const users: User[] = [];
const activityLogs: ActivityLog[] = [];

function generateId() {
  return 'U' + Math.random().toString(36).slice(2, 10);
}

export class UserManagement {
  // User CRUD
  listUsers() { return users; }
  getUser(id: string) { return users.find(u => u.id === id); }
  createUser(data: Omit<User, 'id'>) {
    const user: User = { id: generateId(), ...data };
    users.push(user);
    return user;
  }
  updateUser(id: string, data: Partial<Omit<User, 'id'>>) {
    const u = users.find(u => u.id === id);
    if (!u) return null;
    Object.assign(u, data);
    return u;
  }
  deleteUser(id: string) {
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    users.splice(idx, 1);
    return true;
  }
  // Activity log
  logActivity(userId: string, action: string, details?: any) {
    const log: ActivityLog = {
      id: generateId(),
      userId,
      action,
      timestamp: new Date().toISOString(),
      details,
    };
    activityLogs.push(log);
    return log;
  }
  listActivityLogs(userId?: string) {
    return userId ? activityLogs.filter(l => l.userId === userId) : activityLogs;
  }
}
