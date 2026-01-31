import * as nodemailer from 'nodemailer';
import * as events from 'events';

/**
 * Email Service
 * SMTP integration for email notifications
 */

interface EmailConfig {
  service: string;
  host?: string;
  port?: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content?: any;
    path?: string;
  }>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  error?: string;
}

export class EmailService extends events.EventEmitter {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;
  private emailQueue: EmailMessage[] = [];
  private sentEmails: Map<string, EmailResult> = new Map();
  private isProcessing: boolean = false;
  private retryAttempts: number = 3;

  constructor(config: EmailConfig) {
    super();

    this.config = {
      service: 'gmail',
      secure: true,
      ...config,
    };

    this.initializeTransporter();
    this.startQueueProcessor();
  }

  /**
   * Initialize Email Transporter
   */
  private initializeTransporter(): void {
    const transportOptions: any = {
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass,
      },
    };

    if (this.config.service) {
      transportOptions.service = this.config.service;
    } else {
      transportOptions.host = this.config.host;
      transportOptions.port = this.config.port;
      transportOptions.secure = this.config.secure;
    }

    this.transporter = nodemailer.createTransport(transportOptions);

    console.log('✓ Email service initialized');
  }

  /**
   * Verify Connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✓ Email server connection verified');
      return true;
    } catch (error) {
      console.error('✗ Email server connection failed:', error);
      return false;
    }
  }

  /**
   * Send Email
   */
  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    try {
      const mailOptions: any = {
        from: this.config.from,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      };

      if (message.cc) {
        mailOptions.cc = message.cc.join(', ');
      }

      if (message.bcc) {
        mailOptions.bcc = message.bcc.join(', ');
      }

      if (message.attachments) {
        mailOptions.attachments = message.attachments;
      }

      const info = await this.transporter.sendMail(mailOptions);

      const result: EmailResult = {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      };

      this.sentEmails.set(info.messageId, result);
      this.emit('email-sent', result);

      console.log(`✓ Email sent: ${info.messageId}`);

      return result;
    } catch (error: any) {
      const result: EmailResult = {
        success: false,
        error: error.message,
      };

      this.emit('email-failed', result);
      console.error('✗ Email send failed:', error);

      return result;
    }
  }

  /**
   * Queue Email for Sending
   */
  queueEmail(message: EmailMessage): void {
    this.emailQueue.push(message);
    console.log(`📬 Email queued (${this.emailQueue.length} in queue)`);
  }

  /**
   * Start Queue Processor
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      await this.processQueue();
    }, 2000); // Process every 2 seconds
  }

  /**
   * Process Email Queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.emailQueue.length === 0) return;

    this.isProcessing = true;

    try {
      while (this.emailQueue.length > 0) {
        const message = this.emailQueue.shift();
        if (message) {
          await this.sendWithRetry(message);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send Email with Retry
   */
  private async sendWithRetry(message: EmailMessage, attempts: number = 0): Promise<EmailResult> {
    const result = await this.sendEmail(message);

    if (!result.success && attempts < this.retryAttempts) {
      console.log(`⚠ Retrying email send (attempt ${attempts + 1}/${this.retryAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)));
      return this.sendWithRetry(message, attempts + 1);
    }

    return result;
  }

  /**
   * Send Template Email
   */
  async sendTemplateEmail(
    to: string | string[],
    template: string,
    variables: Record<string, any>
  ): Promise<EmailResult> {
    let html = template;

    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    return this.sendEmail({
      to,
      subject: variables.subject || 'Notification',
      html,
    });
  }

  /**
   * Send Bulk Emails
   */
  async sendBulkEmails(messages: EmailMessage[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    for (const message of messages) {
      const result = await this.sendEmail(message);
      results.push(result);
    }

    return results;
  }

  /**
   * Send with Attachments
   */
  async sendWithAttachments(
    to: string | string[],
    subject: string,
    html: string,
    attachments: Array<{ filename: string; path: string }>
  ): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject,
      html,
      attachments,
    });
  }

  /**
   * Get Email Statistics
   */
  getStats(): object {
    const sent = Array.from(this.sentEmails.values());
    const successful = sent.filter(e => e.success).length;
    const failed = sent.filter(e => !e.success).length;

    return {
      totalSent: sent.length,
      successful,
      failed,
      queueLength: this.emailQueue.length,
      successRate: sent.length > 0 ? (successful / sent.length) * 100 : 0,
    };
  }

  /**
   * Get Sent Emails
   */
  getSentEmails(limit: number = 50): EmailResult[] {
    return Array.from(this.sentEmails.values()).slice(-limit);
  }

  /**
   * Clear Queue
   */
  clearQueue(): number {
    const count = this.emailQueue.length;
    this.emailQueue = [];
    return count;
  }
}

// Export factory function
export function createEmailService(config: EmailConfig) {
  return new EmailService(config);
}
