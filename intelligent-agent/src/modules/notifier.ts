// وحدة الإشعارات (Notifier)
import { Logger } from './logger';
import { SMSService } from './sms-service';
import { SmartNotifier } from './smart-notifier';

// Legacy Notifier for backward compatibility
export class Notifier {
  log: Logger;
  constructor(log: Logger) {
    this.log = log;
  }
  async notify(message: string) {
    this.log.info(`[NOTIFY] ${message}`);
  }
}

// SmartNotifier instance for multi-channel alerts
import config from './config';
const smsService = new SMSService();
export const smartNotifier = new SmartNotifier(
  smsService,
  config.SLACK_WEBHOOK_URL,
  config.TELEGRAM_BOT_TOKEN,
  config.TELEGRAM_CHAT_ID
);
