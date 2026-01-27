// وحدة المصادقة الثنائية (2FA) باستخدام TOTP
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

export class TwoFactorAuth {
  // إنشاء سر جديد للمستخدم
  static generateSecret(userId: string) {
    return speakeasy.generateSecret({ name: `ComplianceSystem (${userId})` });
  }
  // توليد QR code لتهيئة التطبيق
  static async getQRCode(otpauthUrl: string) {
    return await qrcode.toDataURL(otpauthUrl);
  }
  // تحقق رمز المستخدم
  static verify(token: string, secret: string) {
    return speakeasy.totp.verify({ secret, encoding: 'base32', token });
  }
}

// مثال: عند تسجيل دخول admin، إذا كان لديه 2FA مفعّل، يطلب منه إدخال رمز Google Authenticator
// يجب حفظ secret في قاعدة بيانات المستخدمين وربطه بالحساب
