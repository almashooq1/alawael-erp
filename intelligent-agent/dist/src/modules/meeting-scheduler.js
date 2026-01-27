"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingScheduler = void 0;
class MeetingScheduler {
    constructor() {
        this.meetings = [];
    }
    schedule(meeting) {
        const m = { ...meeting, id: Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
        this.meetings.push(m);
        return m;
    }
    list(ticketId) {
        return ticketId ? this.meetings.filter(m => m.ticketId === ticketId) : this.meetings;
    }
    cancel(id) {
        const idx = this.meetings.findIndex(m => m.id === id);
        if (idx >= 0)
            this.meetings.splice(idx, 1);
        return idx >= 0;
    }
}
exports.MeetingScheduler = MeetingScheduler;
