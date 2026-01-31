"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
exports.createEmailService = createEmailService;
const nodemailer = __importStar(require("nodemailer"));
const events = __importStar(require("events"));
class EmailService extends events.EventEmitter {
    constructor(config) {
        super();
        this.emailQueue = [];
        this.sentEmails = new Map();
        this.isProcessing = false;
        this.retryAttempts = 3;
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
    initializeTransporter() {
        const transportOptions = {
            auth: {
                user: this.config.auth.user,
                pass: this.config.auth.pass,
            },
        };
        if (this.config.service) {
            transportOptions.service = this.config.service;
        }
        else {
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
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✓ Email server connection verified');
            return true;
        }
        catch (error) {
            console.error('✗ Email server connection failed:', error);
            return false;
        }
    }
    /**
     * Send Email
     */
    async sendEmail(message) {
        try {
            const mailOptions = {
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
            const result = {
                success: true,
                messageId: info.messageId,
                accepted: info.accepted,
                rejected: info.rejected,
            };
            this.sentEmails.set(info.messageId, result);
            this.emit('email-sent', result);
            console.log(`✓ Email sent: ${info.messageId}`);
            return result;
        }
        catch (error) {
            const result = {
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
    queueEmail(message) {
        this.emailQueue.push(message);
        console.log(`📬 Email queued (${this.emailQueue.length} in queue)`);
    }
    /**
     * Start Queue Processor
     */
    startQueueProcessor() {
        setInterval(async () => {
            await this.processQueue();
        }, 2000); // Process every 2 seconds
    }
    /**
     * Process Email Queue
     */
    async processQueue() {
        if (this.isProcessing || this.emailQueue.length === 0)
            return;
        this.isProcessing = true;
        try {
            while (this.emailQueue.length > 0) {
                const message = this.emailQueue.shift();
                if (message) {
                    await this.sendWithRetry(message);
                }
            }
        }
        finally {
            this.isProcessing = false;
        }
    }
    /**
     * Send Email with Retry
     */
    async sendWithRetry(message, attempts = 0) {
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
    async sendTemplateEmail(to, template, variables) {
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
    async sendBulkEmails(messages) {
        const results = [];
        for (const message of messages) {
            const result = await this.sendEmail(message);
            results.push(result);
        }
        return results;
    }
    /**
     * Send with Attachments
     */
    async sendWithAttachments(to, subject, html, attachments) {
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
    getStats() {
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
    getSentEmails(limit = 50) {
        return Array.from(this.sentEmails.values()).slice(-limit);
    }
    /**
     * Clear Queue
     */
    clearQueue() {
        const count = this.emailQueue.length;
        this.emailQueue = [];
        return count;
    }
}
exports.EmailService = EmailService;
// Export factory function
function createEmailService(config) {
    return new EmailService(config);
}
