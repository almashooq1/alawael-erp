const bcrypt = require('bcryptjs');

const passwords = {
  'users 2-6': '$2a$10$ctR3vl8FEm2MMg44Fg6uju98A/WJfztrj4AZv83FAIoT6CCTlcD/a',
  'admin user 1': '$2a$10$ctR3vl8FEm2MMg44Fg6ujugGRUvoJWK6F4xOp1qotme8Kh4JLFujK',
};

const testPassword = 'Admin@123456';

console.log('Testing password:', testPassword);
console.log('');

Promise.all([
  bcrypt.compare(testPassword, passwords['users 2-6']),
  bcrypt.compare(testPassword, passwords['admin user 1']),
]).then(([match1, match2]) => {
  console.log('Hash (users 2-6) matches:', match1 ? '✅ YES' : '❌ NO');
  console.log('Hash (admin user 1) matches:', match2 ? '✅ YES' : '❌ NO');

  if (!match2) {
    console.log('\n⚠️ Admin password hash is DIFFERENT!');
    console.log('Need to update admin password in db.json');
  }
});
