"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorAuth = void 0;
// وحدة المصادقة الثنائية (2FA) باستخدام TOTP
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
class TwoFactorAuth {
    // إنشاء سر جديد للمستخدم
    static generateSecret(userId) {
        return speakeasy_1.default.generateSecret({ name: `ComplianceSystem (${userId})` });
    }
    // توليد QR code لتهيئة التطبيق
    static async getQRCode(otpauthUrl) {
        return await qrcode_1.default.toDataURL(otpauthUrl);
    }
    // تحقق رمز المستخدم
    static verify(token, secret) {
        return speakeasy_1.default.totp.verify({ secret, encoding: 'base32', token });
    }
}
exports.TwoFactorAuth = TwoFactorAuth;
// مثال: عند تسجيل دخول admin، إذا كان لديه 2FA مفعّل، يطلب منه إدخال رمز Google Authenticator
// يجب حفظ secret في قاعدة بيانات المستخدمين وربطه بالحساب
