"use strict";
// src/modules/maintenance-knowledge.ts
// Maintenance & AI-powered Knowledge Base Module
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceKnowledge = void 0;
const maintenanceTasks = [];
const knowledgeBase = [];
function generateId() {
    return 'MK' + Math.random().toString(36).slice(2, 10);
}
class MaintenanceKnowledge {
    // Maintenance tasks
    listTasks() { return maintenanceTasks; }
    getTask(id) { return maintenanceTasks.find(t => t.id === id); }
    createTask(data) {
        const task = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: data.status || 'pending',
            ...data,
        };
        maintenanceTasks.push(task);
        return task;
    }
    updateTask(id, data) {
        const t = maintenanceTasks.find(t => t.id === id);
        if (!t)
            return null;
        Object.assign(t, data);
        t.updatedAt = new Date().toISOString();
        return t;
    }
    deleteTask(id) {
        const idx = maintenanceTasks.findIndex(t => t.id === id);
        if (idx === -1)
            return false;
        maintenanceTasks.splice(idx, 1);
        return true;
    }
    // Knowledge base
    listArticles() { return knowledgeBase; }
    getArticle(id) { return knowledgeBase.find(a => a.id === id); }
    createArticle(data) {
        const article = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...data,
        };
        // Simulate AI summary
        article.aiSummary = `AI Summary: ${article.content.slice(0, 60)}...`;
        knowledgeBase.push(article);
        return article;
    }
    updateArticle(id, data) {
        const a = knowledgeBase.find(a => a.id === id);
        if (!a)
            return null;
        Object.assign(a, data);
        a.updatedAt = new Date().toISOString();
        // Update AI summary if content changed
        if (data.content)
            a.aiSummary = `AI Summary: ${a.content.slice(0, 60)}...`;
        return a;
    }
    deleteArticle(id) {
        const idx = knowledgeBase.findIndex(a => a.id === id);
        if (idx === -1)
            return false;
        knowledgeBase.splice(idx, 1);
        return true;
    }
    searchArticles(query) {
        return knowledgeBase.filter(a => a.title.includes(query) || a.content.includes(query) || a.tags.some(tag => tag.includes(query)));
    }
}
exports.MaintenanceKnowledge = MaintenanceKnowledge;
