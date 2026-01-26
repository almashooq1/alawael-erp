// Create JWT token for testing
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const token = jwt.sign({ id: 'test-user-123', role: 'admin', username: 'testadmin' }, JWT_SECRET, {
  expiresIn: '24h',
});

console.log('Generated Token:');
console.log(token);
