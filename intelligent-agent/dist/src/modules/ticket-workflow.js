"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketWorkflowEngine = void 0;
class TicketWorkflowEngine {
    constructor() {
        this.rules = [];
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
    run(ticket) {
        for (const rule of this.rules.filter(r => r.enabled)) {
            if (rule.condition(ticket)) {
                rule.action(ticket);
            }
        }
    }
}
exports.TicketWorkflowEngine = TicketWorkflowEngine;
