const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'alawael-erp-secret-key-2026-change-in-production';
const token = jwt.sign({ id: 'tester', role: 'admin' }, secret, { expiresIn: '1h' });
console.log(token);
