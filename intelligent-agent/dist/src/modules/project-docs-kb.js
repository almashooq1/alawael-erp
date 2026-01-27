"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectDocsKB = void 0;
class ProjectDocsKB {
    constructor() {
        this.docs = [];
        this.kb = [];
    }
    addDoc(doc) {
        const d = { ...doc, id: Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
        this.docs.push(d);
        return d;
    }
    listDocs(projectId) {
        return this.docs.filter(d => d.projectId === projectId);
    }
    removeDoc(id) {
        this.docs = this.docs.filter(d => d.id !== id);
    }
    addKB(entry) {
        const e = { ...entry, id: Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
        this.kb.push(e);
        return e;
    }
    listKB(projectId) {
        return this.kb.filter(e => e.projectId === projectId);
    }
    removeKB(id) {
        this.kb = this.kb.filter(e => e.id !== id);
    }
}
exports.ProjectDocsKB = ProjectDocsKB;
