"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndNotifyAlerts = checkAndNotifyAlerts;
const interaction_logger_1 = require("./interaction-logger");
const smtp_mailer_1 = require("./smtp-mailer");
const report_notifiers_1 = require("./report-notifiers");
// إعدادات التنبيه
const ERROR_THRESHOLD = 5; // عدد الأخطاء الأسبوعية المسموح بها
const FEEDBACK_MIN = 2; // أقل تقييم مسموح به
async function checkAndNotifyAlerts() {
    const logs = interaction_logger_1.InteractionLogger.getAll();
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekLogs = logs.filter(l => l.timestamp >= lastWeek);
    const errorCount = weekLogs.filter(l => l.output && (l.output.toLowerCase().includes('خطأ') || l.output.toLowerCase().includes('error'))).length;
    const lowFeedbacks = weekLogs.filter(l => typeof l.feedback === 'number' && l.feedback <= FEEDBACK_MIN);
    let alerts = [];
    if (errorCount > ERROR_THRESHOLD) {
        alerts.push(`تنبيه: عدد الأخطاء هذا الأسبوع مرتفع (${errorCount})`);
    }
    if (lowFeedbacks.length > 0) {
        alerts.push(`تنبيه: هناك تقييمات منخفضة (${lowFeedbacks.length}) أقل من ${FEEDBACK_MIN}`);
    }
    if (alerts.length) {
        // Email
        if (process.env.ALERT_EMAIL_TO) {
            await (0, smtp_mailer_1.sendMailSMTP)({
                to: process.env.ALERT_EMAIL_TO,
                subject: 'تنبيه ذكي من النظام',
                html: alerts.map(a => `<div>${a}</div>`).join('')
            });
        }
        // Slack
        if (process.env.ALERT_SLACK_WEBHOOK) {
            await (0, report_notifiers_1.sendReportToSlack)(alerts.join('\n'), process.env.ALERT_SLACK_WEBHOOK);
        }
        // Teams
        if (process.env.ALERT_TEAMS_WEBHOOK) {
            await (0, report_notifiers_1.sendReportToTeams)(alerts.join('\n'), process.env.ALERT_TEAMS_WEBHOOK);
        }
    }
    return alerts;
}
