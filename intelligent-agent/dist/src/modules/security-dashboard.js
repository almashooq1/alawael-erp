"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityDashboard = void 0;
class SecurityDashboard {
    constructor(cyber, policies, reports) {
        this.cyber = cyber;
        this.policies = policies;
        this.reports = reports;
    }
    getSummary() {
        const events = this.cyber.listEvents();
        const alerts = this.cyber.listAlerts();
        const policy = this.policies.getPolicy();
        const lastPolicyChange = this.policies.getChangeLog().slice(-1)[0];
        const report = this.reports.generateSummaryReport('daily');
        return {
            totalEvents: events.length,
            totalAlerts: alerts.length,
            criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
            lastPolicyChange,
            policy,
            report,
            lastAlert: alerts.slice(-1)[0],
        };
    }
}
exports.SecurityDashboard = SecurityDashboard;
