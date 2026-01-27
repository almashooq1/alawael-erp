// Middleware لتسجيل أحداث الامتثال
import ComplianceEvent from '../models/compliance-event';
import { NotificationCenter } from '../modules/notification-center';
const notificationCenter = new NotificationCenter();
import { EmailService } from '../modules/email-service';
import config from '../modules/config';
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';

export async function logComplianceEvent({
  userId,
  action,
  resource,
  resourceId,
  status,
  details,
  policy
}: {
  userId?: string,
  action: string,
  resource: string,
  resourceId?: string,
  status: string,
  details?: string,
  policy?: string
}) {
  await ComplianceEvent.create({
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
    const message = `حدث امتثال (${status}): ${action} على ${resource}${resourceId ? ' ('+resourceId+')' : ''}${policy ? ' - السياسة: '+policy : ''}${details ? ' - '+details : ''}`;
    notificationCenter.sendNotification({
      userId: userId || 'admin',
      title: 'تنبيه امتثال',
      message,
      channel: 'in-app',
      metadata: { type: status === 'fail' ? 'danger' : 'warning' }
    });

    // إرسال بريد إلكتروني عند الخرق
    try {
      const emailHost = config.get('EMAIL_HOST');
      const emailPort = Number(config.get('EMAIL_PORT', 587));
      const emailUser = config.get('EMAIL_USER');
      const emailPass = config.get('EMAIL_PASS');
      const emailTo = config.get('COMPLIANCE_ALERT_EMAIL', 'admin@system.com');
      if (emailHost && emailUser && emailPass) {
        const emailService = new EmailService(emailHost, emailPort, emailUser, emailPass);
        await emailService.send(emailTo, 'تنبيه خرق امتثال', message);
      }
    } catch (e) {}

    // إرسال إلى Slack/Teams إذا تم ضبط Webhook
    try {
      const slackUrl = config.get('SLACK_WEBHOOK_URL');
      const teamsUrl = config.get('TEAMS_WEBHOOK_URL');
      if (slackUrl) {
        await axios.post(slackUrl, { text: `🚨 [Compliance Alert] ${message}` });
      }
      if (teamsUrl) {
        await axios.post(teamsUrl, {
          '@type': 'MessageCard', '@context': 'http://schema.org/extensions',
          summary: 'Compliance Alert', themeColor: 'D70040', title: 'تنبيه امتثال', text: message
        });
      }
    } catch (e) {}

    // منطق التصعيد التلقائي: إذا حدث 3 خروقات أو أكثر خلال ساعة
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const count = await ComplianceEvent.countDocuments({
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
        const escalationEmail = config.get('COMPLIANCE_ESCALATION_EMAIL', 'escalation@system.com');
        const emailHost = config.get('EMAIL_HOST');
        const emailPort = Number(config.get('EMAIL_PORT', 587));
        const emailUser = config.get('EMAIL_USER');
        const emailPass = config.get('EMAIL_PASS');
        if (emailHost && emailUser && emailPass) {
          const emailService = new EmailService(emailHost, emailPort, emailUser, emailPass);
          await emailService.send(escalationEmail, 'تصعيد امتثال حرِج', escalationMsg);
        }
        // إرسال تصعيد إلى Slack/Teams
        try {
          const slackUrl = config.get('SLACK_WEBHOOK_URL');
          const teamsUrl = config.get('TEAMS_WEBHOOK_URL');
          if (slackUrl) {
            await axios.post(slackUrl, { text: `🚨 [Compliance Escalation] ${escalationMsg}` });
          }
          if (teamsUrl) {
            await axios.post(teamsUrl, {
              '@type': 'MessageCard', '@context': 'http://schema.org/extensions',
              summary: 'Compliance Escalation', themeColor: 'D70040', title: 'تصعيد امتثال حرِج', text: escalationMsg
            });
          }
        } catch (e) {}
      }
    } catch (e) {}
  }
}

// مثال Middleware عام للفحص والتسجيل
export function complianceLogger(action: string, resource: string, policy?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
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
