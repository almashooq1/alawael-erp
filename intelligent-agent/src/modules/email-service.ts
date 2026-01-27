// وحدة إرسال البريد الإلكتروني (Email Service)
import nodemailer from 'nodemailer';

export class EmailService {
  private transporter;

  constructor(host: string, port: number, user: string, pass: string) {
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: { user, pass }
    });
  }

  async send(to: string, subject: string, text: string) {
    return this.transporter.sendMail({
      from: 'agent@system.com',
      to,
      subject,
      text
    });
  }
}
