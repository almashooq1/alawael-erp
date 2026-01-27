"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAnalytics = void 0;
class UserAnalytics {
    constructor() {
        this.events = [];
    }
    track(userId, event, details) {
        this.events.push({ userId, event, timestamp: Date.now(), details });
    }
    getEvents(userId) {
        if (userId)
            return this.events.filter(e => e.userId === userId);
        return this.events;
    }
    getEventCounts(userId) {
        const filtered = userId ? this.events.filter(e => e.userId === userId) : this.events;
        return filtered.reduce((acc, e) => {
            acc[e.event] = (acc[e.event] || 0) + 1;
            return acc;
        }, {});
    }
    getActiveUsers(sinceMs) {
        const since = Date.now() - sinceMs;
        return Array.from(new Set(this.events.filter(e => e.timestamp >= since).map(e => e.userId)));
    }
    // Simple interactive report
    generateReport(userId) {
        const counts = this.getEventCounts(userId);
        return Object.entries(counts).map(([event, count]) => `${event}: ${count}`).join('\n');
    }
}
exports.UserAnalytics = UserAnalytics;
