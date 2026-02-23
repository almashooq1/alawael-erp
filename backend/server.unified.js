/**
 * 🚀 Unified Server - الخادم الموحد
 * يدمج جميع الملفات الموحدة في خادم واحد
 * @version 2.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoose = require('mongoose');

// ============================================
// استيراد الملفات الموحدة
// ============================================

// Middleware
const {
  authenticate,
  authorize,
  validate,
  loginRules,
  loginLimiter,
  apiLimiter,
  sanitizeInput
} = require('./middleware/index.unified');

// Routes
const unifiedRoutes = require('./routes/index.unified');

// Services
const { notification, auth } = require('./services/index.unified');

// Models
const { User, Employee, Department } = require('./models/index.unified');

// ============================================
// إعداد الخادم
// ============================================

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware الأساسي
// ============================================

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(sanitizeInput);

// ============================================
// قاعدة البيانات
// ============================================

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// ============================================
// المسارات
// ============================================

// Health Check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AlAwael ERP - System Healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api', apiLimiter, unifiedRoutes);

// ============================================
// معالجة الأخطاء
// ============================================

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'المسار غير موجود'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'خطأ داخلي',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// تشغيل الخادم
// ============================================

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║     🚀 AlAwael ERP Server              ║
    ║     Port: ${PORT}                         ║
    ║     Environment: ${process.env.NODE_ENV || 'development'}       ║
    ╚════════════════════════════════════════╝
    `);
  });
};

// ============================================
// Graceful Shutdown
// ============================================

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// ============================================
// تصدير
// ============================================

module.exports = { app, startServer };

// تشغيل إذا كان الملف الرئيسي
if (require.main === module) {
  startServer().catch(console.error);
}
