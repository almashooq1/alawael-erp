"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MFA = void 0;
class MFA {
    constructor(notifier) {
        this.notifier = notifier;
        this.otps = [];
    }
    sendOtp(userId, channel) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
        this.otps = this.otps.filter(o => o.userId !== userId || o.channel !== channel);
        this.otps.push({ userId, code, expiresAt, channel });
        this.notifier.sendNotification({ userId, message: `رمز التحقق: ${code}`, channel });
        return code;
    }
    verifyOtp(userId, code, channel) {
        const idx = this.otps.findIndex(o => o.userId === userId && o.channel === channel && o.code === code);
        if (idx !== -1 && this.otps[idx].expiresAt > Date.now()) {
            this.otps.splice(idx, 1);
            return true;
        }
        return false;
    }
}
exports.MFA = MFA;
