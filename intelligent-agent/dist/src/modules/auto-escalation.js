"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoEscalation = void 0;
class AutoEscalation {
    constructor() {
        this.rules = [];
        this.log = [];
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
    getLog() {
        return this.log;
    }
    checkAndEscalate(event, recentEvents, sendFn) {
        for (const rule of this.rules) {
            if (event.type === rule.type) {
                const since = Date.now() - rule.windowMinutes * 60 * 1000;
                const count = recentEvents.filter(e => e.type === rule.type && new Date(e.timestamp).getTime() >= since).length;
                if (count >= rule.threshold) {
                    sendFn(rule.targetChannels, event);
                    this.log.push({ timestamp: new Date().toISOString(), event, ruleId: rule.id, targets: rule.targetChannels });
                }
            }
        }
    }
}
exports.AutoEscalation = AutoEscalation;
