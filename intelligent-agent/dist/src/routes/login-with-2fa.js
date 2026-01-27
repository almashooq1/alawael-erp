"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// مثال تكامل 2FA مع منطق تسجيل الدخول (Express route)
const express_1 = __importDefault(require("express"));
const two_factor_auth_1 = require("../modules/two-factor-auth");
const user_profile_1 = require("../modules/user-profile");
const router = express_1.default.Router();
const userProfileManager = new user_profile_1.UserProfileManager();
// تسجيل الدخول مع دعم 2FA
router.post('/login', async (req, res) => {
    const { email, password, token2fa } = req.body;
    // تحقق من البريد وكلمة المرور (من قاعدة البيانات)
    const user = userProfileManager.listUsers().find(u => u.email === email);
    if (!user)
        return res.status(401).json({ error: 'مستخدم غير موجود' });
    // ... تحقق كلمة المرور ...
    // إذا كان المستخدم admin وله 2FA مفعّل
    if (user.roles?.includes('admin') && user['twoFASecret']) {
        if (!token2fa)
            return res.status(401).json({ error: 'مطلوب رمز المصادقة الثنائية' });
        const valid = two_factor_auth_1.TwoFactorAuth.verify(token2fa, user['twoFASecret']);
        if (!valid)
            return res.status(401).json({ error: 'رمز المصادقة الثنائية غير صحيح' });
    }
    // تسجيل الدخول ناجح
    res.json({ ok: true, user });
});
exports.default = router;
