"use strict";
// src/modules/user-management.ts
// Advanced User Management Module (SSO, OAuth2, Activity Log)
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManagement = void 0;
const users = [];
const activityLogs = [];
function generateId() {
    return 'U' + Math.random().toString(36).slice(2, 10);
}
class UserManagement {
    // User CRUD
    listUsers() { return users; }
    getUser(id) { return users.find(u => u.id === id); }
    createUser(data) {
        const user = { id: generateId(), ...data };
        users.push(user);
        return user;
    }
    updateUser(id, data) {
        const u = users.find(u => u.id === id);
        if (!u)
            return null;
        Object.assign(u, data);
        return u;
    }
    deleteUser(id) {
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1)
            return false;
        users.splice(idx, 1);
        return true;
    }
    // Activity log
    logActivity(userId, action, details) {
        const log = {
            id: generateId(),
            userId,
            action,
            timestamp: new Date().toISOString(),
            details,
        };
        activityLogs.push(log);
        return log;
    }
    listActivityLogs(userId) {
        return userId ? activityLogs.filter(l => l.userId === userId) : activityLogs;
    }
}
exports.UserManagement = UserManagement;
