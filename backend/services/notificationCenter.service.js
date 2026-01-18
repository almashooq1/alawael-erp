class NotificationCenterService {
  /**
   * Omni-Channel Dispatcher
   * decide channel preference: SMS vs WhatsApp vs Email
   */
  static async sendNotification(recipient, type, message) {
    const preferences = recipient.preferences || { sms: true, whatsapp: true, email: true };

    const results = [];

    // 1. WhatsApp (Priority for Appts)
    if (preferences.whatsapp && (type === 'APPOINTMENT' || type === 'URGENT')) {
      const status = await this.sendWhatsApp(recipient.phone, message);
      results.push({ channel: 'WhatsApp', status });
    }

    // 2. SMS (Fallback)
    if (preferences.sms && !results.find(r => r.channel === 'WhatsApp' && r.status === 'SENT')) {
      const status = await this.sendSMS(recipient.phone, message);
      results.push({ channel: 'SMS', status });
    }

    // 3. Email (For Receipts/Reports)
    if (preferences.email || type === 'REPORT') {
      const status = await this.sendEmail(recipient.email, 'AlAwael Notification', message);
      results.push({ channel: 'Email', status });
    }

    return results;
  }

  static async sendWhatsApp(phone, msg) {
    console.log(`[WhatsApp] Sending to ${phone}: ${msg}`);
    // Integration with Twilio/Meta API
    return 'SENT';
  }

  static async sendSMS(phone, msg) {
    console.log(`[SMS] Sending to ${phone}: ${msg}`);
    return 'SENT';
  }

  static async sendEmail(email, subject, body) {
    console.log(`[Email] Sending to ${email}: ${subject}`);
    return 'QUEUED';
  }
}

module.exports = NotificationCenterService;
