"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectCollab = void 0;
class ProjectCollab {
    constructor() {
        this.messages = [];
        this.notifications = [];
    }
    postMessage(projectId, userId, message) {
        const m = {
            id: Math.random().toString(36).slice(2),
            projectId, userId, message,
            createdAt: new Date().toISOString(),
        };
        this.messages.push(m);
        return m;
    }
    listMessages(projectId) {
        return this.messages.filter(m => m.projectId === projectId);
    }
    notify(projectId, userId, type, content) {
        const n = {
            id: Math.random().toString(36).slice(2),
            projectId, userId, type, content, read: false,
            createdAt: new Date().toISOString(),
        };
        this.notifications.push(n);
        return n;
    }
    listNotifications(userId) {
        return this.notifications.filter(n => n.userId === userId);
    }
    markRead(id) {
        const n = this.notifications.find(x => x.id === id);
        if (n)
            n.read = true;
        return !!n;
    }
}
exports.ProjectCollab = ProjectCollab;
