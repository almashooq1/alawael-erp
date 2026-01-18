const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'backend', 'data', 'db.json');

async function fixLogin() {
  console.log('🔄 Fixing Admin Login...');
  try {
    let data = { users: [], employees: [], attendances: [], leaves: [], performance: [] };
    
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(dbPath)) {
      try {
        const fileContent = fs.readFileSync(dbPath, 'utf8');
        data = JSON.parse(fileContent);
        if (!data.users) data.users = [];
      } catch (e) {
        console.log('Main DB file corrupt or empty, creating new.');
      }
    }

    // Remove existing admin to avoid duplicates
    if (data.users && data.users.length > 0) {
        data.users = data.users.filter(u => u.email !== 'admin@alawael.com');
    } else {
        data.users = [];
    }

    // Generate Hash
    console.log('🔑 Generating secure hash for password...');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Admin@123456', salt);

    const adminUser = {
      _id: "1",
      email: "admin@alawael.com",
      password: hash,
      fullName: "مدير النظام",
      role: "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null
    };

    data.users.push(adminUser);

    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    console.log('✅ Admin user has been manually reset in db.json');
    console.log('------------------------------------------------');
    console.log('📧 Email:    admin@alawael.com');
    console.log('🔐 Password: Admin@123456');
    console.log('------------------------------------------------');
    console.log('You can now run the system.');

  } catch (err) {
    console.error('❌ Error fixing login:', err);
  }
}

fixLogin();