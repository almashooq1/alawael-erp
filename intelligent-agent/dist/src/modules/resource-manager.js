"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceManager = void 0;
class ResourceManager {
    constructor() {
        this.resources = [];
    }
    createResource(data) {
        const r = {
            ...data,
            id: Math.random().toString(36).slice(2),
            assignedTasks: [],
            workload: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.resources.push(r);
        return r;
    }
    assignTask(resourceId, task) {
        const r = this.resources.find(x => x.id === resourceId);
        if (!r)
            return false;
        if (!r.assignedTasks.includes(task.id))
            r.assignedTasks.push(task.id);
        r.workload = r.assignedTasks.length / 10; // Example: max 10 tasks
        r.updatedAt = new Date().toISOString();
        return true;
    }
    unassignTask(resourceId, taskId) {
        const r = this.resources.find(x => x.id === resourceId);
        if (!r)
            return false;
        r.assignedTasks = r.assignedTasks.filter(id => id !== taskId);
        r.workload = r.assignedTasks.length / 10;
        r.updatedAt = new Date().toISOString();
        return true;
    }
    listResources() {
        return this.resources;
    }
    getResource(id) {
        return this.resources.find(r => r.id === id);
    }
    optimizeWorkload() {
        // Example: balance tasks among resources
        const allTasks = this.resources.flatMap(r => r.assignedTasks);
        const avg = allTasks.length / (this.resources.length || 1);
        for (const r of this.resources) {
            if (r.assignedTasks.length > avg + 1) {
                // ... logic to suggest rebalancing ...
            }
        }
    }
}
exports.ResourceManager = ResourceManager;
