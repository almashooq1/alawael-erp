const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Read db.json
const dbPath = path.join(__dirname, 'data', 'db.json');
const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('🔍 Testing all users in db.json:\n');

const testPassword = 'Admin@123456';

async function testAllUsers() {
  for (const user of dbData.users) {
    const match = await bcrypt.compare(testPassword, user.password);
    console.log(`${match ? '✅' : '❌'} ${user.email}`);
    console.log(`   Name: ${user.fullName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password matches "Admin@123456": ${match ? 'YES' : 'NO'}`);
    console.log('');
  }

  console.log('\n📊 Summary:');
  console.log(`Total users: ${dbData.users.length}`);
  console.log(`All passwords should match: Admin@123456`);
}

testAllUsers();
