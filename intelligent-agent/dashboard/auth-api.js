"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_auth_1 = require("../src/modules/user-auth");
const router = express_1.default.Router();
// تسجيل مستخدم جديد (مدير فقط)
router.post('/register', (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: 'username and password required' });
    // فقط المدير يمكنه إنشاء مستخدمين جدد
    // ... تحقق من صلاحية الجلسة هنا ...
    const user = (0, user_auth_1.createUser)(username, password, role);
    res.json({ id: user.id, username: user.username, role: user.role });
});
// تسجيل الدخول
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = (0, user_auth_1.authenticate)(username, password);
    if (!user)
        return res.status(401).json({ error: 'invalid credentials' });
    // ... إصدار توكن جلسة (JWT أو مشابه) ...
    res.json({ id: user.id, username: user.username, role: user.role });
});
// قائمة المستخدمين (مدير فقط)
router.get('/users', (req, res) => {
    // ... تحقق من صلاحية الجلسة هنا ...
    res.json((0, user_auth_1.listUsers)().map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })));
});
exports.default = router;
