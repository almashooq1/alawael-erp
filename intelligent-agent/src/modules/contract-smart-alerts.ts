// تنبيهات العقود الذكية متعددة القنوات
import { ContractManager } from './contract-manager';
import { analyzeContractsSmartly } from './contract-smart-analysis';
import { NotificationPreferencesManager } from './notification-preferences';
import { sendMailSMTP } from './smtp-mailer';
import { SMSService } from './sms-service';
import { sendSlackMessage } from './slack-notifier';
import { sendTeamsMessage } from './teams-notifier';
import { NotificationCenter } from './notification-center';

const sms = new SMSService();
const notifier = new NotificationCenter();
const prefsManager = new NotificationPreferencesManager();

export async function checkAndSendSmartContractAlerts() {
  const manager = new ContractManager();
  const smart = analyzeContractsSmartly();
  for (const analysis of smart) {
    if (analysis.riskLevel === 'مرتفع' || analysis.daysToExpire <= 7) {
      const contract = manager.getContract(analysis.contractId);
      if (!contract) continue;
      const userId = contract.metadata?.owner || 'admin';
      const prefs = prefsManager.getPreference(userId);
      const channels = prefs?.channels || ['in-app'];
      const message = `تنبيه عقد: ${contract.title}\n${analysis.recommendation}`;
      const title = `تنبيه عقد: ${contract.title}`;
      for (const channel of channels) {
        try {
          if (channel === 'email' && contract.metadata?.email) {
            await sendMailSMTP({
              to: contract.metadata.email,
              subject: title,
              text: message
            });
          } else if (channel === 'sms' && contract.metadata?.phone) {
            await sms.send(contract.metadata.phone, message);
          } else if (channel === 'slack' && process.env.SLACK_WEBHOOK_URL) {
            await sendSlackMessage(message);
          } else if (channel === 'teams' && process.env.TEAMS_WEBHOOK_URL) {
            await sendTeamsMessage(message);
          } else if (channel === 'in-app') {
            notifier.sendNotification({
              userId,
              title,
              message,
              channel: 'in-app',
            });
          }
        } catch (e) {
          // يمكن تسجيل الخطأ لاحقًا
        }
      }
    }
  }
}

// يمكن جدولة checkAndSendSmartContractAlerts يوميًا من وحدة scheduler
