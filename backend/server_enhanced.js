// Enhanced Backend Server with MongoDB Support
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { connectDB, checkConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
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

// In-memory user store (for testing - replace with DB in production)
const users = [
  {
    id: '1',
    email: 'admin@example.com',
    password: '$2b$10$YourHashedPasswordHere', // Admin@123
    name: 'مدير النظام',
    role: 'admin',
  },
];

// Helper: Hash password for first time setup
async function setupAdmin() {
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  users[0].password = hashedPassword;
  console.log('✅ Admin user initialized');
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  const dbStatus = checkConnection() ? 'Connected' : 'Disconnected';
  res.json({ 
    status: 'ok', 
    message: 'Server is running!',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// AUTHENTICATION
// ============================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان',
      });
    }

    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة',
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة',
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

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
      message: 'خطأ في تسجيل الدخول',
      error: error.message,
    });
  }
});

// ============================================
// COMMUNICATIONS ROUTES
// ============================================

// استخدام routes MongoDB إذا كانت قاعدة البيانات متصلة
let communicationsRouter;
if (process.env.USE_MOCK_DB !== 'true') {
  try {
    communicationsRouter = require('./routes/communications_mongodb');
    console.log('📊 Using MongoDB routes');
  } catch (error) {
    console.warn('⚠️  MongoDB routes not available, using in-memory routes');
    communicationsRouter = require('./routes/communications');
  }
} else {
  communicationsRouter = require('./routes/communications');
  console.log('💾 Using in-memory routes');
}

app.use('/api/communications', communicationsRouter);

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'حدث خطأ في الخادم',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'الصفحة غير موجودة'
  });
});

// ============================================
// START SERVER
// ============================================
async function startServer() {
  try {
    // Setup admin password
    await setupAdmin();
    
    // Connect to database (if configured)
    if (process.env.USE_MOCK_DB !== 'true') {
      console.log('\n🔄 Attempting to connect to MongoDB...');
      await connectDB();
    } else {
      console.log('\n💾 Running in memory-only mode');
      console.log('⚠️  Set USE_MOCK_DB=false in .env to use MongoDB\n');
    }
    
    // Start Express server
    app.listen(PORT, () => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Backend Server Started Successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌐 Server: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      console.log('📍 Available Endpoints:');
      console.log('   POST /api/auth/login');
      console.log('   GET  /api/communications');
      console.log('   GET  /api/communications/:id');
      console.log('   POST /api/communications');
      console.log('   PUT  /api/communications/:id');
      console.log('   DELETE /api/communications/:id');
      console.log('   POST /api/communications/:id/star');
      console.log('   POST /api/communications/:id/archive');
      console.log('   GET  /api/communications/stats\n');
    });
    
  } catch (error) {
    console.error('\n❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});
