"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndSendSmartContractAlerts = checkAndSendSmartContractAlerts;
// تنبيهات العقود الذكية متعددة القنوات
const contract_manager_1 = require("./contract-manager");
const contract_smart_analysis_1 = require("./contract-smart-analysis");
const notification_preferences_1 = require("./notification-preferences");
const smtp_mailer_1 = require("./smtp-mailer");
const sms_service_1 = require("./sms-service");
const slack_notifier_1 = require("./slack-notifier");
const teams_notifier_1 = require("./teams-notifier");
const notification_center_1 = require("./notification-center");
const sms = new sms_service_1.SMSService();
const notifier = new notification_center_1.NotificationCenter();
const prefsManager = new notification_preferences_1.NotificationPreferencesManager();
async function checkAndSendSmartContractAlerts() {
    const manager = new contract_manager_1.ContractManager();
    const smart = (0, contract_smart_analysis_1.analyzeContractsSmartly)();
    for (const analysis of smart) {
        if (analysis.riskLevel === 'مرتفع' || analysis.daysToExpire <= 7) {
            const contract = manager.getContract(analysis.contractId);
            if (!contract)
                continue;
            const userId = contract.metadata?.owner || 'admin';
            const prefs = prefsManager.getPreference(userId);
            const channels = prefs?.channels || ['in-app'];
            const message = `تنبيه عقد: ${contract.title}\n${analysis.recommendation}`;
            const title = `تنبيه عقد: ${contract.title}`;
            for (const channel of channels) {
                try {
                    if (channel === 'email' && contract.metadata?.email) {
                        await (0, smtp_mailer_1.sendMailSMTP)({
                            to: contract.metadata.email,
                            subject: title,
                            text: message
                        });
                    }
                    else if (channel === 'sms' && contract.metadata?.phone) {
                        await sms.send(contract.metadata.phone, message);
                    }
                    else if (channel === 'slack' && process.env.SLACK_WEBHOOK_URL) {
                        await (0, slack_notifier_1.sendSlackMessage)(message);
                    }
                    else if (channel === 'teams' && process.env.TEAMS_WEBHOOK_URL) {
                        await (0, teams_notifier_1.sendTeamsMessage)(message);
                    }
                    else if (channel === 'in-app') {
                        notifier.sendNotification({
                            userId,
                            title,
                            message,
                            channel: 'in-app',
                        });
                    }
                }
                catch (e) {
                    // يمكن تسجيل الخطأ لاحقًا
                }
            }
        }
    }
}
// يمكن جدولة checkAndSendSmartContractAlerts يوميًا من وحدة scheduler
