// Security Dashboard Module
import { CyberMonitor } from './cyber-monitor';
import { SecurityPolicies } from './security-policies';
import { SecurityReports } from './security-reports';

export class SecurityDashboard {
  constructor(
    private cyber: CyberMonitor,
    private policies: SecurityPolicies,
    private reports: SecurityReports
  ) {}

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
