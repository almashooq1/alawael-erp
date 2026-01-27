"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLAManager = void 0;
class SLAManager {
    constructor() {
        this.rules = [];
        this.breaches = [];
    }
    addRule(rule) {
        const r = { ...rule, id: Math.random().toString(36).slice(2) };
        this.rules.push(r);
        return r;
    }
    removeRule(id) {
        this.rules = this.rules.filter(r => r.id !== id);
    }
    listRules() {
        return this.rules;
    }
    checkBreaches(tickets) {
        const now = Date.now();
        for (const rule of this.rules.filter(r => r.enabled)) {
            for (const t of tickets.filter(t => t.priority === rule.priority && t.status !== 'closed')) {
                const hours = (now - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
                if (hours > rule.maxHours && !this.breaches.find(b => b.ticketId === t.id && b.ruleId === rule.id)) {
                    this.breaches.push({ ticketId: t.id, ruleId: rule.id, breachedAt: new Date().toISOString(), hoursOpen: +hours.toFixed(2) });
                }
            }
        }
    }
    listBreaches() {
        return this.breaches;
    }
}
exports.SLAManager = SLAManager;
