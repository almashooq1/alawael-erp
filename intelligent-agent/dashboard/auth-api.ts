import express from 'express';
import { createUser, authenticate, listUsers, getUserById, UserRole } from '../src/modules/user-auth';
const router = express.Router();

// تسجيل مستخدم جديد (مدير فقط)
router.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  // فقط المدير يمكنه إنشاء مستخدمين جدد
  // ... تحقق من صلاحية الجلسة هنا ...
  const user = createUser(username, password, role as UserRole);
  res.json({ id: user.id, username: user.username, role: user.role });
});

// تسجيل الدخول
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = authenticate(username, password);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  // ... إصدار توكن جلسة (JWT أو مشابه) ...
  res.json({ id: user.id, username: user.username, role: user.role });
});

// قائمة المستخدمين (مدير فقط)
router.get('/users', (req, res) => {
  // ... تحقق من صلاحية الجلسة هنا ...
  res.json(listUsers().map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })));
});

export default router;
