"use strict";
// src/modules/project-management.ts
// Advanced Project Management Module (Gantt, multi-resource)
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectManagement = void 0;
const projects = [];
function generateId() {
    return 'P' + Math.random().toString(36).slice(2, 10);
}
class ProjectManagement {
    listProjects(ownerId) {
        return ownerId ? projects.filter(p => p.ownerId === ownerId) : projects;
    }
    getProject(id) {
        return projects.find(p => p.id === id);
    }
    createProject(data) {
        const project = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: data.status || 'planned',
            tasks: data.tasks || [],
            ...data,
        };
        projects.push(project);
        return project;
    }
    updateProject(id, data) {
        const p = projects.find(p => p.id === id);
        if (!p)
            return null;
        Object.assign(p, data);
        p.updatedAt = new Date().toISOString();
        return p;
    }
    deleteProject(id) {
        const idx = projects.findIndex(p => p.id === id);
        if (idx === -1)
            return false;
        projects.splice(idx, 1);
        return true;
    }
    // Task management
    addTask(projectId, task) {
        const p = projects.find(p => p.id === projectId);
        if (!p)
            return null;
        const t = { id: generateId(), ...task };
        p.tasks.push(t);
        p.updatedAt = new Date().toISOString();
        return t;
    }
    updateTask(projectId, taskId, data) {
        const p = projects.find(p => p.id === projectId);
        if (!p)
            return null;
        const t = p.tasks.find(t => t.id === taskId);
        if (!t)
            return null;
        Object.assign(t, data);
        p.updatedAt = new Date().toISOString();
        return t;
    }
    removeTask(projectId, taskId) {
        const p = projects.find(p => p.id === projectId);
        if (!p)
            return false;
        const idx = p.tasks.findIndex(t => t.id === taskId);
        if (idx === -1)
            return false;
        p.tasks.splice(idx, 1);
        p.updatedAt = new Date().toISOString();
        return true;
    }
}
exports.ProjectManagement = ProjectManagement;
