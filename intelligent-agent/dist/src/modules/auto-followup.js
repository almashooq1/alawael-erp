"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFollowupReport = sendFollowupReport;
// متابعة تلقائية: جدولة وإرسال تقارير شاملة عبر البريد وSlack وTeams
const scheduler_1 = require("./scheduler");
const interaction_logger_1 = require("./interaction-logger");
const email_service_1 = require("./email-service");
const slack_notifier_1 = require("./slack-notifier");
const teams_notifier_1 = require("./teams-notifier");
const config_1 = __importDefault(require("./config"));
const scheduler = new scheduler_1.Scheduler();
async function sendFollowupReport() {
    const logs = interaction_logger_1.InteractionLogger.getAll();
    const total = logs.length;
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekLogs = logs.filter(l => l.timestamp >= lastWeek);
    const errorCount = weekLogs.filter(l => l.output && (l.output.toLowerCase().includes('خطأ') || l.output.toLowerCase().includes('error'))).length;
    const topQuestions = Object.entries(weekLogs.reduce((acc, l) => {
        const q = (l.input || '').trim();
        if (q)
            acc[q] = (acc[q] || 0) + 1;
        return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const feedbacks = weekLogs.map(l => l.feedback).filter(f => typeof f === 'number');
    const summary = `متابعة أسبوعية للنظام:\n` +
        `إجمالي التفاعلات: ${total}\n` +
        `تفاعلات الأسبوع: ${weekLogs.length}\n` +
        `عدد الأخطاء: ${errorCount}\n` +
        `أكثر الأسئلة تكراراً: ${topQuestions.map(([q, c]) => `${q} (${c})`).join(', ')}\n` +
        (feedbacks.length ? `أعلى تقييم: ${Math.max(...feedbacks)}, أقل تقييم: ${Math.min(...feedbacks)}` : '');
    // إرسال عبر البريد
    try {
        const email = new email_service_1.EmailService(config_1.default.get('SMTP_HOST', 'localhost'), Number(config_1.default.get('SMTP_PORT', 587)), config_1.default.get('SMTP_USER', ''), config_1.default.get('SMTP_PASS', ''));
        await email.send(config_1.default.get('ADMIN_EMAIL', 'admin@system.com'), 'متابعة أسبوعية للنظام', summary);
    }
    catch (e) { /* ignore */ }
    // إرسال عبر Slack
    try {
        await (0, slack_notifier_1.sendSlackMessage)(summary);
    }
    catch (e) { /* ignore */ }
    // إرسال عبر Teams
    try {
        await (0, teams_notifier_1.sendTeamsMessage)(summary);
    }
    catch (e) { /* ignore */ }
}
// جدولة أسبوعية (كل 7 أيام)
scheduler.repeat(7 * 24 * 60 * 60 * 1000, sendFollowupReport);
