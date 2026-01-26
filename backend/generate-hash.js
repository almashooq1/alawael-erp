const bcrypt = require('bcryptjs');

const password = 'Admin@123456';
const rounds = 10;

console.log('Generating bcrypt hash for password:', password);
console.log('');

bcrypt.hash(password, rounds).then(hash => {
  console.log('Generated hash:');
  console.log(hash);
  console.log('');
  console.log('Use this hash in db.json for ALL users');

  // Verify it works
  bcrypt.compare(password, hash).then(match => {
    console.log('Verification:', match ? '✅ Hash works!' : '❌ Hash failed');
  });
});
