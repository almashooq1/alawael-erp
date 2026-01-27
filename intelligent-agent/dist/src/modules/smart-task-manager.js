"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartTaskManager = void 0;
// وحدة إدارة المهام الذكية (Smart Task Management)
const uuid_1 = require("uuid");
class SmartTaskManager {
    constructor() {
        this.tasks = [];
    }
    createTask(title, description, assignedTo, dueDate) {
        const now = new Date().toISOString();
        const task = {
            id: (0, uuid_1.v4)(),
            title,
            description,
            status: 'pending',
            assignedTo,
            dueDate,
            createdAt: now,
            updatedAt: now
        };
        this.tasks.push(task);
        return task;
    }
    listTasks(filter) {
        if (!filter)
            return this.tasks;
        return this.tasks.filter(task => Object.entries(filter).every(([k, v]) => task[k] === v));
    }
    updateTask(id, updates) {
        const task = this.tasks.find(t => t.id === id);
        if (!task)
            return undefined;
        Object.assign(task, updates, { updatedAt: new Date().toISOString() });
        return task;
    }
    deleteTask(id) {
        const idx = this.tasks.findIndex(t => t.id === id);
        if (idx === -1)
            return false;
        this.tasks.splice(idx, 1);
        return true;
    }
}
exports.SmartTaskManager = SmartTaskManager;
