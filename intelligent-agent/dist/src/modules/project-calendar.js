"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectCalendar = void 0;
class ProjectCalendar {
    constructor() {
        this.events = [];
        this.resources = [];
    }
    addEvent(event) {
        const e = { ...event, id: Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
        this.events.push(e);
        return e;
    }
    listEvents(projectId) {
        return this.events.filter(e => e.projectId === projectId);
    }
    removeEvent(id) {
        this.events = this.events.filter(e => e.id !== id);
    }
    addResource(resource) {
        const r = { ...resource, id: Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
        this.resources.push(r);
        return r;
    }
    listResources(projectId) {
        return this.resources.filter(r => r.projectId === projectId);
    }
    removeResource(id) {
        this.resources = this.resources.filter(r => r.id !== id);
    }
}
exports.ProjectCalendar = ProjectCalendar;
