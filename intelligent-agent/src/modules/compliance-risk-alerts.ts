// Automated explainable alerts for emerging compliance risks
import { getComplianceRiskScores } from './compliance-risk-ai';
import CompliancePolicy from '../models/compliance-policy';
import { sendSlackMessage } from './slack-notifier';
import { sendTeamsMessage } from './teams-notifier';
import config from './config';
import { UserProfileManager } from './user-profile';
import { EmailService } from './email-service';
import { SMSService } from './sms-service';
import { sendWebhook } from './webhook-integration';
import { NotificationCenter } from './notification-center';
import { JiraIntegration, ServiceNowIntegration } from './ticketing-integration';
// Example config (should be loaded from env/config in production)
const jira = new JiraIntegration({
  baseUrl: process.env.JIRA_URL || '',
  email: process.env.JIRA_EMAIL || '',
  apiToken: process.env.JIRA_TOKEN || ''
});
const servicenow = new ServiceNowIntegration({
  instanceUrl: process.env.SERVICENOW_URL || '',
  username: process.env.SERVICENOW_USER || '',
  password: process.env.SERVICENOW_PASS || ''
});

// ALERT_THRESHOLD removed: now per-policy/user
const CHECK_INTERVAL_MINUTES = 60; // How often to check (in minutes)
const userProfileManager = new UserProfileManager();
const emailService = new EmailService(
  config.get('SMTP_HOST', 'localhost'),
  Number(config.get('SMTP_PORT', 587)),
  config.get('SMTP_USER', ''),
  config.get('SMTP_PASS', '')
);
const smsService = new SMSService();
const notificationCenter = new NotificationCenter();

export async function checkAndAlertComplianceRisks(userId?: string) {
  const scores = await getComplianceRiskScores({ days: 30 });
  const policies = await CompliancePolicy.find().lean();
  const highRisks = scores.filter(s => {
    const policy = policies.find(p => p.name === s.policy);
    if (!policy) return false;
    let threshold = policy.riskAlertThreshold ?? 70;
    if (userId && policy.userThresholdOverrides && policy.userThresholdOverrides[userId]) {
      threshold = policy.userThresholdOverrides[userId];
    }
    return s.riskScore >= threshold;
  });
  if (!highRisks.length) return;
  const message =
    `🚨 تنبيه مخاطر الامتثال:\n` +
    highRisks.map(s =>
      `• السياسة: ${s.policy}\n  درجة المخاطرة: ${s.riskScore}\n  الانتهاكات: ${s.violations}\n  غير محلولة: ${s.unresolved}\n  آخر انتهاك: ${s.lastViolation ? new Date(s.lastViolation).toLocaleString() : '-'}`
    ).join('\n\n');

  // Determine recipients
  let recipients: string[] = [];
  if (userId) {
    recipients = [userId];
  } else {
    // Notify all users with notificationChannels set
    recipients = userProfileManager.listUsers().filter(u => u.notificationChannels).map(u => u.id);
  }

  for (const uid of recipients) {
    const user = userProfileManager.getUser(uid);
    if (!user || !user.notificationChannels) continue;
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
      await sendWebhook({ url: channels.webhook, event: 'compliance-risk-alert', data: { message, userId: user.id } });
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
    } catch (e) {
      // Log ticketing error (production: use logger)
      console.error('Ticketing integration error:', e);
    }
  }

  // Optionally, still send to Slack/Teams for admins
  if (config.SLACK_WEBHOOK_URL) await sendSlackMessage(message);
  if (config.get('TEAMS_WEBHOOK_URL')) await sendTeamsMessage(message);
}

// Schedule periodic risk checks (if running as a service)
if (require.main === module) {
  setInterval(checkAndAlertComplianceRisks, CHECK_INTERVAL_MINUTES * 60 * 1000);
  // Run once at startup
  checkAndAlertComplianceRisks();
}
