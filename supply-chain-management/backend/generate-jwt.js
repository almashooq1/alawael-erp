/**
 * JWT Token Generator for Testing
 * الاستخدام: node generate-jwt.js
 *
 * Output: يطبع JWT token جاهز للاستخدام في API requests
 */

import jwt from 'jsonwebtoken';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_EXPIRY = '24h';

// Sample user payloads
const testUsers = {
  admin: {
    id: 'admin-001',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
  },
  warehouse_manager: {
    id: 'manager-001',
    username: 'manager1',
    email: 'manager@example.com',
    role: 'warehouse_manager',
  },
  logistics: {
    id: 'logistics-001',
    username: 'logistics1',
    email: 'logistics@example.com',
    role: 'logistics',
  },
};

function generateToken(userId, userRole) {
  const user = testUsers[userRole] || testUsers.admin;

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  return token;
}

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Generate and display tokens
console.log('🔑 JWT Token Generator\n');
console.log('='.repeat(60));

Object.entries(testUsers).forEach(([role, user]) => {
  const token = generateToken(user.id, role);
  console.log(`\n👤 ${role.toUpperCase()}`);
  console.log(`User: ${user.username} (${user.email})`);
  console.log(`Role: ${user.role}`);
  console.log('\n📝 Token:');
  console.log(token);
  console.log('\n🔗 Authorization Header:');
  console.log(`Authorization: Bearer ${token}`);
  console.log('-'.repeat(60));
});

console.log('\n✅ Tokensjenerado successfully!');
console.log('\n💡 Tip: Copy the tokens above and use them in Postman headers');
console.log('   as "Authorization: Bearer <token>"');
