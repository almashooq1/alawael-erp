const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// تسجيل الدخول (إرجاع JWT)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  const valid = await user.comparePassword(password);
  if (!valid) return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
});

module.exports = router;
