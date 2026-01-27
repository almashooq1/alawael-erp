"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityPolicies = void 0;
const defaultPolicy = {
    passwordMinLength: 8,
    passwordRequireSymbols: true,
    sessionTimeoutMinutes: 30,
    mfaEnabled: true,
    maxFailedLogins: 5,
};
class SecurityPolicies {
    constructor() {
        this.dynamicRules = [];
        this.changeLog = [];
        this.policy = { ...defaultPolicy };
    }
    addDynamicRule(rule) {
        const r = { ...rule, id: Math.random().toString(36).slice(2) };
        this.dynamicRules.push(r);
        return r;
    }
    removeDynamicRule(id) {
        this.dynamicRules = this.dynamicRules.filter(r => r.id !== id);
    }
    listDynamicRules() {
        return this.dynamicRules;
    }
    getChangeLog() {
        return [...this.changeLog];
    }
    getPolicy(context) {
        let result = { ...this.policy };
        for (const rule of this.dynamicRules) {
            if (rule.condition(context)) {
                result = { ...result, ...rule.overrides };
            }
        }
        return result;
    }
    updatePolicy(updates, userId) {
        this.policy = { ...this.policy, ...updates };
        this.changeLog.push({ timestamp: new Date().toISOString(), userId, changes: updates });
    }
    exportPolicy() {
        return { ...this.policy };
    }
}
exports.SecurityPolicies = SecurityPolicies;
