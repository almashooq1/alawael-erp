// مثال تكامل 2FA مع منطق تسجيل الدخول (Express route)
import express from 'express';
import { TwoFactorAuth } from '../modules/two-factor-auth';
import { UserProfileManager } from '../modules/user-profile';

const router = express.Router();
const userProfileManager = new UserProfileManager();

// تسجيل الدخول مع دعم 2FA
router.post('/login', async (req, res) => {
  const { email, password, token2fa } = req.body;
  // تحقق من البريد وكلمة المرور (من قاعدة البيانات)
  const user = userProfileManager.listUsers().find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'مستخدم غير موجود' });
  // ... تحقق كلمة المرور ...
  // إذا كان المستخدم admin وله 2FA مفعّل
  if (user.roles?.includes('admin') && user['twoFASecret']) {
    if (!token2fa) return res.status(401).json({ error: 'مطلوب رمز المصادقة الثنائية' });
    const valid = TwoFactorAuth.verify(token2fa, user['twoFASecret']);
    if (!valid) return res.status(401).json({ error: 'رمز المصادقة الثنائية غير صحيح' });
  }
  // تسجيل الدخول ناجح
  res.json({ ok: true, user });
});

export default router;
