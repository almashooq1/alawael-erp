"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskManager = void 0;
class RiskManager {
    constructor() {
        this.risks = [];
    }
    addRisk(data) {
        const r = {
            ...data,
            id: Math.random().toString(36).slice(2),
            status: 'open',
            detectedAt: new Date().toISOString(),
        };
        this.risks.push(r);
        return r;
    }
    mitigateRisk(id) {
        const r = this.risks.find(x => x.id === id);
        if (!r || r.status !== 'open')
            return false;
        r.status = 'mitigated';
        r.mitigatedAt = new Date().toISOString();
        return true;
    }
    closeRisk(id) {
        const r = this.risks.find(x => x.id === id);
        if (!r || (r.status !== 'open' && r.status !== 'mitigated'))
            return false;
        r.status = 'closed';
        r.mitigatedAt = new Date().toISOString();
        return true;
    }
    listRisks(projectId) {
        return projectId ? this.risks.filter(r => r.projectId === projectId) : this.risks;
    }
    getRisk(id) {
        return this.risks.find(r => r.id === id);
    }
}
exports.RiskManager = RiskManager;
