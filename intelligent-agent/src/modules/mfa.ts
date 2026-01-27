// MFA (Multi-Factor Authentication) Module
import { SmartNotifier } from './smart-notifier';

interface OtpEntry {
  userId: string;
  code: string;
  expiresAt: number;
  channel: 'email' | 'sms';
}

export class MFA {
  private otps: OtpEntry[] = [];
  constructor(private notifier: SmartNotifier) {}

  sendOtp(userId: string, channel: 'email' | 'sms'): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
    this.otps = this.otps.filter(o => o.userId !== userId || o.channel !== channel);
    this.otps.push({ userId, code, expiresAt, channel });
    this.notifier.sendNotification({ userId, message: `رمز التحقق: ${code}`, channel });
    return code;
  }

  verifyOtp(userId: string, code: string, channel: 'email' | 'sms'): boolean {
    const idx = this.otps.findIndex(o => o.userId === userId && o.channel === channel && o.code === code);
    if (idx !== -1 && this.otps[idx].expiresAt > Date.now()) {
      this.otps.splice(idx, 1);
      return true;
    }
    return false;
  }
}
