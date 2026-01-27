"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndAlertComplianceRisks = checkAndAlertComplianceRisks;
// Automated explainable alerts for emerging compliance risks
const compliance_risk_ai_1 = require("./compliance-risk-ai");
const compliance_policy_1 = __importDefault(require("../models/compliance-policy"));
const slack_notifier_1 = require("./slack-notifier");
const teams_notifier_1 = require("./teams-notifier");
const config_1 = __importDefault(require("./config"));
const user_profile_1 = require("./user-profile");
const email_service_1 = require("./email-service");
const sms_service_1 = require("./sms-service");
const webhook_integration_1 = require("./webhook-integration");
const notification_center_1 = require("./notification-center");
const ticketing_integration_1 = require("./ticketing-integration");
// Example config (should be loaded from env/config in production)
const jira = new ticketing_integration_1.JiraIntegration({
    baseUrl: process.env.JIRA_URL || '',
    email: process.env.JIRA_EMAIL || '',
    apiToken: process.env.JIRA_TOKEN || ''
});
const servicenow = new ticketing_integration_1.ServiceNowIntegration({
    instanceUrl: process.env.SERVICENOW_URL || '',
    username: process.env.SERVICENOW_USER || '',
    password: process.env.SERVICENOW_PASS || ''
});
// ALERT_THRESHOLD removed: now per-policy/user
const CHECK_INTERVAL_MINUTES = 60; // How often to check (in minutes)
const userProfileManager = new user_profile_1.UserProfileManager();
const emailService = new email_service_1.EmailService(config_1.default.get('SMTP_HOST', 'localhost'), Number(config_1.default.get('SMTP_PORT', 587)), config_1.default.get('SMTP_USER', ''), config_1.default.get('SMTP_PASS', ''));
const smsService = new sms_service_1.SMSService();
const notificationCenter = new notification_center_1.NotificationCenter();
async function checkAndAlertComplianceRisks(userId) {
    const scores = await (0, compliance_risk_ai_1.getComplianceRiskScores)({ days: 30 });
    const policies = await compliance_policy_1.default.find().lean();
    const highRisks = scores.filter(s => {
        const policy = policies.find(p => p.name === s.policy);
        if (!policy)
            return false;
        let threshold = policy.riskAlertThreshold ?? 70;
        if (userId && policy.userThresholdOverrides && policy.userThresholdOverrides[userId]) {
            threshold = policy.userThresholdOverrides[userId];
        }
        return s.riskScore >= threshold;
    });
    if (!highRisks.length)
        return;
    const message = `🚨 تنبيه مخاطر الامتثال:\n` +
        highRisks.map(s => `• السياسة: ${s.policy}\n  درجة المخاطرة: ${s.riskScore}\n  الانتهاكات: ${s.violations}\n  غير محلولة: ${s.unresolved}\n  آخر انتهاك: ${s.lastViolation ? new Date(s.lastViolation).toLocaleString() : '-'}`).join('\n\n');
    // Determine recipients
    let recipients = [];
    if (userId) {
        recipients = [userId];
    }
    else {
        // Notify all users with notificationChannels set
        recipients = userProfileManager.listUsers().filter(u => u.notificationChannels).map(u => u.id);
    }
    for (const uid of recipients) {
        const user = userProfileManager.getUser(uid);
        if (!user || !user.notificationChannels)
            continue;
        const channels = user.notificationChannels;
        // Email
        if (channels.email && user.email) {
            await emailService.send(user.email, 'تنبيه مخاطر الامتثال', message);
        }
        // SMS
        if (channels.sms && user.phone) {
            await smsService.send(user.phone, message);
        }
        // In-app
        if (channels.inApp) {
            notificationCenter.sendNotification({
                userId: user.id,
                title: 'تنبيه مخاطر الامتثال',
                message,
                channel: 'in-app',
            });
        }
        // Webhook
        if (channels.webhook) {
            await (0, webhook_integration_1.sendWebhook)({ url: channels.webhook, event: 'compliance-risk-alert', data: { message, userId: user.id } });
        }
        // Auto-create ticket in Jira/ServiceNow for high risk
        try {
            for (const risk of highRisks) {
                if (risk.riskScore >= 70) {
                    if (process.env.JIRA_URL && process.env.JIRA_TOKEN && process.env.JIRA_EMAIL) {
                        await jira.createTicket({
                            summary: `Compliance Risk: ${risk.policy}`,
                            description: `Risk Score: ${risk.riskScore}\nViolations: ${risk.violations}\nUnresolved: ${risk.unresolved}\nDetails: ${risk.details}`,
                            projectKey: process.env.JIRA_PROJECT || 'COMPL',
                            issueType: 'Task'
                        });
                    }
                    if (process.env.SERVICENOW_URL && process.env.SERVICENOW_USER && process.env.SERVICENOW_PASS) {
                        await servicenow.createIncident({
                            short_description: `Compliance Risk: ${risk.policy}`,
                            description: `Risk Score: ${risk.riskScore}\nViolations: ${risk.violations}\nUnresolved: ${risk.unresolved}\nDetails: ${risk.details}`
                        });
                    }
                }
            }
        }
        catch (e) {
            // Log ticketing error (production: use logger)
            console.error('Ticketing integration error:', e);
        }
    }
    // Optionally, still send to Slack/Teams for admins
    if (config_1.default.SLACK_WEBHOOK_URL)
        await (0, slack_notifier_1.sendSlackMessage)(message);
    if (config_1.default.get('TEAMS_WEBHOOK_URL'))
        await (0, teams_notifier_1.sendTeamsMessage)(message);
}
// Schedule periodic risk checks (if running as a service)
if (require.main === module) {
    setInterval(checkAndAlertComplianceRisks, CHECK_INTERVAL_MINUTES * 60 * 1000);
    // Run once at startup
    checkAndAlertComplianceRisks();
}
