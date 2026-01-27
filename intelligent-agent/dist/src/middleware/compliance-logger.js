"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logComplianceEvent = logComplianceEvent;
exports.complianceLogger = complianceLogger;
// Middleware لتسجيل أحداث الامتثال
const compliance_event_1 = __importDefault(require("../models/compliance-event"));
const notification_center_1 = require("../modules/notification-center");
const notificationCenter = new notification_center_1.NotificationCenter();
const email_service_1 = require("../modules/email-service");
const config_1 = __importDefault(require("../modules/config"));
const axios_1 = __importDefault(require("axios"));
async function logComplianceEvent({ userId, action, resource, resourceId, status, details, policy }) {
    await compliance_event_1.default.create({
        userId,
        action,
        resource,
        resourceId,
        status,
        details,
        policy
    });
    // تنبيه ذكي عند خرق الامتثال
    if (status === 'fail' || status === 'warning') {
        const message = `حدث امتثال (${status}): ${action} على ${resource}${resourceId ? ' (' + resourceId + ')' : ''}${policy ? ' - السياسة: ' + policy : ''}${details ? ' - ' + details : ''}`;
        notificationCenter.sendNotification({
            userId: userId || 'admin',
            title: 'تنبيه امتثال',
            message,
            channel: 'in-app',
            metadata: { type: status === 'fail' ? 'danger' : 'warning' }
        });
        // إرسال بريد إلكتروني عند الخرق
        try {
            const emailHost = config_1.default.get('EMAIL_HOST');
            const emailPort = Number(config_1.default.get('EMAIL_PORT', 587));
            const emailUser = config_1.default.get('EMAIL_USER');
            const emailPass = config_1.default.get('EMAIL_PASS');
            const emailTo = config_1.default.get('COMPLIANCE_ALERT_EMAIL', 'admin@system.com');
            if (emailHost && emailUser && emailPass) {
                const emailService = new email_service_1.EmailService(emailHost, emailPort, emailUser, emailPass);
                await emailService.send(emailTo, 'تنبيه خرق امتثال', message);
            }
        }
        catch (e) { }
        // إرسال إلى Slack/Teams إذا تم ضبط Webhook
        try {
            const slackUrl = config_1.default.get('SLACK_WEBHOOK_URL');
            const teamsUrl = config_1.default.get('TEAMS_WEBHOOK_URL');
            if (slackUrl) {
                await axios_1.default.post(slackUrl, { text: `🚨 [Compliance Alert] ${message}` });
            }
            if (teamsUrl) {
                await axios_1.default.post(teamsUrl, {
                    '@type': 'MessageCard', '@context': 'http://schema.org/extensions',
                    summary: 'Compliance Alert', themeColor: 'D70040', title: 'تنبيه امتثال', text: message
                });
            }
        }
        catch (e) { }
        // منطق التصعيد التلقائي: إذا حدث 3 خروقات أو أكثر خلال ساعة
        try {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const count = await compliance_event_1.default.countDocuments({
                status: { $in: ['fail', 'warning'] },
                timestamp: { $gte: oneHourAgo, $lte: now }
            });
            if (count >= 3) {
                const escalationMsg = `تصعيد تلقائي: تم رصد ${count} خروقات امتثال خلال ساعة. الرجاء التدخل الفوري.`;
                notificationCenter.sendNotification({
                    userId: 'admin',
                    title: 'تصعيد امتثال حرِج',
                    message: escalationMsg,
                    channel: 'in-app',
                    metadata: { type: 'danger' }
                });
                // بريد تصعيد خاص للإدارة العليا
                const escalationEmail = config_1.default.get('COMPLIANCE_ESCALATION_EMAIL', 'escalation@system.com');
                const emailHost = config_1.default.get('EMAIL_HOST');
                const emailPort = Number(config_1.default.get('EMAIL_PORT', 587));
                const emailUser = config_1.default.get('EMAIL_USER');
                const emailPass = config_1.default.get('EMAIL_PASS');
                if (emailHost && emailUser && emailPass) {
                    const emailService = new email_service_1.EmailService(emailHost, emailPort, emailUser, emailPass);
                    await emailService.send(escalationEmail, 'تصعيد امتثال حرِج', escalationMsg);
                }
                // إرسال تصعيد إلى Slack/Teams
                try {
                    const slackUrl = config_1.default.get('SLACK_WEBHOOK_URL');
                    const teamsUrl = config_1.default.get('TEAMS_WEBHOOK_URL');
                    if (slackUrl) {
                        await axios_1.default.post(slackUrl, { text: `🚨 [Compliance Escalation] ${escalationMsg}` });
                    }
                    if (teamsUrl) {
                        await axios_1.default.post(teamsUrl, {
                            '@type': 'MessageCard', '@context': 'http://schema.org/extensions',
                            summary: 'Compliance Escalation', themeColor: 'D70040', title: 'تصعيد امتثال حرِج', text: escalationMsg
                        });
                    }
                }
                catch (e) { }
            }
        }
        catch (e) { }
    }
}
// مثال Middleware عام للفحص والتسجيل
function complianceLogger(action, resource, policy) {
    return async (req, res, next) => {
        res.on('finish', async () => {
            await logComplianceEvent({
                userId: req.user?.id,
                action,
                resource,
                resourceId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
                status: res.statusCode < 400 ? 'success' : 'fail',
                details: res.statusMessage,
                policy
            });
        });
        next();
    };
}
