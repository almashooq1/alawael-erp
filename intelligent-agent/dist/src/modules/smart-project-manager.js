"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartProjectManager = void 0;
class SmartProjectManager {
    constructor() {
        this.projects = [];
        this.tasks = [];
        this.milestones = [];
    }
    createProject(data) {
        const p = {
            ...data,
            id: Math.random().toString(36).slice(2),
            status: 'planned',
            tasks: [],
            milestones: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.projects.push(p);
        return p;
    }
    updateProject(id, updates) {
        const p = this.projects.find(x => x.id === id);
        if (p) {
            Object.assign(p, updates);
            p.updatedAt = new Date().toISOString();
        }
        return p;
    }
    getProject(id) {
        return this.projects.find(x => x.id === id);
    }
    listProjects() {
        return this.projects;
    }
    // Task management
    createTask(data) {
        const t = {
            ...data,
            id: Math.random().toString(36).slice(2),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.tasks.push(t);
        const p = this.getProject(t.projectId);
        if (p)
            p.tasks.push(t.id);
        return t;
    }
    updateTask(id, updates) {
        const t = this.tasks.find(x => x.id === id);
        if (t) {
            Object.assign(t, updates);
            t.updatedAt = new Date().toISOString();
        }
        return t;
    }
    getTask(id) {
        return this.tasks.find(x => x.id === id);
    }
    listTasks(projectId) {
        return projectId ? this.tasks.filter(t => t.projectId === projectId) : this.tasks;
    }
    // Milestone management
    createMilestone(data) {
        const m = {
            ...data,
            id: Math.random().toString(36).slice(2),
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.milestones.push(m);
        const p = this.getProject(m.projectId);
        if (p)
            p.milestones.push(m.id);
        return m;
    }
    updateMilestone(id, updates) {
        const m = this.milestones.find(x => x.id === id);
        if (m) {
            Object.assign(m, updates);
            m.updatedAt = new Date().toISOString();
        }
        return m;
    }
    getMilestone(id) {
        return this.milestones.find(x => x.id === id);
    }
    listMilestones(projectId) {
        return projectId ? this.milestones.filter(m => m.projectId === projectId) : this.milestones;
    }
}
exports.SmartProjectManager = SmartProjectManager;
