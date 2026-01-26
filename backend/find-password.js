const bcrypt = require('bcryptjs');

// Test both hashes against common passwords
const hash1 = '$2a$10$ctR3vl8FEm2MMg44Fg6uju98A/WJfztrj4AZv83FAIoT6CCTlcD/a'; // users 2-6
const hash2 = '$2a$10$ctR3vl8FEm2MMg44Fg6ujugGRUvoJWK6F4xOp1qotme8Kh4JLFujK'; // admin

const passwords = ['Admin@123456', 'admin123', 'Admin123', 'admin@123', 'password', 'alawael123'];

console.log('Testing hash for users 2-6:');
Promise.all(passwords.map(pwd => bcrypt.compare(pwd, hash1)))
  .then(results => {
    results.forEach((match, idx) => {
      if (match) console.log(`✅ MATCH: "${passwords[idx]}"`);
    });
    if (!results.some(r => r)) console.log('❌ No match found');

    console.log('\nTesting hash for admin user:');
    return Promise.all(passwords.map(pwd => bcrypt.compare(pwd, hash2)));
  })
  .then(results => {
    results.forEach((match, idx) => {
      if (match) console.log(`✅ MATCH: "${passwords[idx]}"`);
    });
    if (!results.some(r => r)) console.log('❌ No match found');
  });
