"use strict";
// Advanced Compliance & Policy Management Module
// Manages compliance requirements, policies, and audits for projects
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceManager = void 0;
class ComplianceManager {
    constructor() {
        this.policies = [];
        this.audits = [];
    }
    addPolicy(data) {
        const p = {
            ...data,
            id: Math.random().toString(36).slice(2),
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.policies.push(p);
        return p;
    }
    updatePolicy(id, updates) {
        const p = this.policies.find(x => x.id === id);
        if (p) {
            Object.assign(p, updates);
            p.updatedAt = new Date().toISOString();
        }
        return p;
    }
    listPolicies() {
        return this.policies;
    }
    addAudit(data) {
        const a = {
            ...data,
            id: Math.random().toString(36).slice(2),
            auditedAt: new Date().toISOString(),
        };
        this.audits.push(a);
        return a;
    }
    listAudits(projectId) {
        return projectId ? this.audits.filter(a => a.projectId === projectId) : this.audits;
    }
}
exports.ComplianceManager = ComplianceManager;
