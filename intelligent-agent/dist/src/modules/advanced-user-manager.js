"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedUserManager = void 0;
class AdvancedUserManager {
    constructor() {
        this.users = [];
        this.activityLog = [];
    }
    addUser(user) {
        const u = { ...user, status: 'active', createdAt: new Date().toISOString() };
        this.users.push(u);
        return u;
    }
    setStatus(userId, status) {
        const u = this.users.find(x => x.id === userId);
        if (u)
            u.status = status;
    }
    getUser(userId) {
        return this.users.find(x => x.id === userId);
    }
    listUsers() {
        return this.users;
    }
    logActivity(activity) {
        this.activityLog.push(activity);
    }
    getUserActivity(userId) {
        return this.activityLog.filter(a => a.userId === userId);
    }
}
exports.AdvancedUserManager = AdvancedUserManager;
