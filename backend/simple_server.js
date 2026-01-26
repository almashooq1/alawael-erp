// Simple Express Server for Quick Testing
// Works without MongoDB - perfect for local testing!

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - CORS must be before routes
app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// In-memory user store (for testing)
const users = [];

// Create default admin user
const createAdminUser = async () => {
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  users.push({
    id: '1',
    email: 'admin@example.com',
    password: hashedPassword,
    name: 'المسؤول',
    role: 'admin',
    createdAt: new Date(),
  });
  console.log('✅ Default admin user created');
  console.log('   Email: admin@example.com');
  console.log('   Password: Admin@123');
};

// Initialize admin user
createAdminUser();

// Import Routes
const communicationsRoutes = require('./routes/communications');

// Use Routes
app.use('/api/communications', communicationsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    database: 'in-memory (testing mode)',
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`  ▶️ Login attempt: ${email}`);

    // Validation
    if (!email || !password) {
      console.log(`  ❌ Missing credentials`);
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبة',
      });
    }

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      console.log(`  ❌ User not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة',
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`  ❌ Password mismatch for ${email}`);
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET_KEY || 'default-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    console.log(`  ✅ Login successful for ${email}`);

    // Return success - with both accessToken and token for compatibility
    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      accessToken: token,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول',
    });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة',
      });
    }

    // Check if user exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = {
      id: (users.length + 1).toString(),
      email,
      password: hashedPassword,
      name,
      role: 'user',
      createdAt: new Date(),
    };

    users.push(newUser);

    // Generate token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET_KEY || 'default-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'تم التسجيل بنجاح',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التسجيل',
    });
  }
});

// Get current user (protected route)
app.get('/api/auth/me', verifyToken, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'المستخدم غير موجود',
    });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'لا يوجد رمز مصادقة',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET_KEY || 'default-secret-key-change-in-production'
    );
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'رمز المصادقة غير صالح',
    });
  }
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'الصفحة غير موجودة',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'حدث خطأ في الخادم',
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('════════════════════════════════════════════');
  console.log('  🚀 Simple Backend Server Started!');
  console.log('════════════════════════════════════════════');
  console.log('');
  console.log(`  🌐 URL: http://localhost:${PORT}`);
  console.log(`  📊 Health: http://localhost:${PORT}/api/health`);
  console.log(`  🔐 Login: http://localhost:${PORT}/api/auth/login`);
  console.log('');
  console.log('  👤 Test Credentials:');
  console.log('     Email: admin@example.com');
  console.log('     Password: Admin@123');
  console.log('');
  console.log('  📝 Mode: In-Memory Database (Perfect for Testing!)');
  console.log('  ⚡ No MongoDB required!');
  console.log('');
  console.log('════════════════════════════════════════════');
  console.log('');
});

module.exports = app;
