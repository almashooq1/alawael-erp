/**
 * Smart GPS Tracking System - Integration File
 * ملف التكامل الشامل لنظام تتبع الحافلات الذكي
 * 
 * هذا الملف يجمع جميع الخدمات والمسارات معاً
 */

// ================== التكامل في server.js ==================

const express = require('express');
const app = express();
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');

// ====== 1. استيراد الخدمات ======
const SmartGPSTrackingService = require('./services/smartGPSTracking.service');
const SmartFleetDashboardService = require('./services/smartFleetDashboard.service');
const GPSSecurityService = require('./services/gpsSecurityService');
const SmartGPSWebSocketService = require('./services/smartGPSWebSocket.service');

// ====== 2. استيراد المسارات ======
const smartGpsRoutes = require('./routes/smartGpsTracking.routes');

// ====== 3. التكوين الأساسي ======
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  },
  pingInterval: 25000,
  pingTimeout: 60000
});

// ====== 4. التوسيط الأساسي ======
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ====== 5. CORS ======
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// ====== 6. ربط المسارات ======
app.use('/api/gps', smartGpsRoutes);

// ====== 7. إعداد WebSocket ======
io.on('connection', (socket) => {
  // استخراج معلومات المستخدم من رمز الوصول
  const token = socket.handshake.auth.token;
  const userId = socket.handshake.auth.userId;
  const userType = socket.handshake.auth.userType; // driver, dispatcher, manager, admin

  // التحقق من الرمز (يجب تنفيذه بشكل صحيح)
  if (!token || !userId) {
    socket.disconnect(true);
    return;
  }

  // إعداد معالجات الأحداث
  SmartGPSWebSocketService.setupEventHandlers(socket, userId, userType);

  // تنظيف الجلسات الخاملة كل 5 دقائق
  setInterval(() => {
    SmartGPSWebSocketService.cleanupIdleSessions();
  }, 5 * 60 * 1000);
});

// ====== 8. معالج الأخطاء المركزي ======
app.use((err, req, res, next) => {
  console.error('خطأ:', err);
  res.status(500).json({
    success: false,
    message: 'خطأ في الخادم',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ====== 9. بدء الخادم ======
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 خادم تتبع GPS يعمل على المنفذ ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/gps/fleet/snapshot`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});

// ================== إعداد تحديثات الموقع الدورية ==================

/**
 * محاكاة استقبال بيانات GPS من الأجهزة
 * في الواقع، ستأتي من أجهزة GPS الفعلية عبر API أو Direct Connection
 */
async function setupGPSDataReceiver() {
  // محاكاة: التحديث كل 5 ثوانٍ
  setInterval(async () => {
    try {
      // جلب جميع المركبات النشطة
      const vehicles = await mongoose.model('Vehicle').find({ isActive: true });

      for (const vehicle of vehicles) {
        // محاكاة بيانات GPS (في الواقع ستأتي من الأجهزة)
        const mockGPSData = generateMockGPSData(vehicle);

        // تحديث الموقع مع التحليل الذكي
        const result = await SmartGPSTrackingService.updateLocationWithIntelligence(
          vehicle._id,
          mockGPSData
        );

        // بث تحديث الموقع الحي
        SmartGPSWebSocketService.broadcastLocationUpdate(vehicle._id, mockGPSData);

        // إذا كانت هناك تنبيهات، بثها
        if (result.anomalies && result.anomalies.length > 0) {
          result.anomalies.forEach(anomaly => {
            SmartGPSWebSocketService.broadcastAlert({
              type: anomaly.type,
              severity: anomaly.severity,
              vehicleId: vehicle._id,
              message: anomaly.message,
              recommendation: anomaly.action
            }, [vehicle._id]);
          });
        }
      }
    } catch (error) {
      console.error('خطأ في تحديث GPS:', error);
    }
  }, 5000); // كل 5 ثوانٍ
}

/**
 * محاكاة توليد بيانات GPS
 */
function generateMockGPSData(vehicle) {
  const lastLocation = vehicle.gpsTracking?.currentLocation?.coordinates || [46.67, 24.71];
  
  // حركة عشوائية قليلة
  const latitude = lastLocation[1] + (Math.random() - 0.5) * 0.001;
  const longitude = lastLocation[0] + (Math.random() - 0.5) * 0.001;
  
  return {
    latitude,
    longitude,
    speed: Math.floor(Math.random() * 120),
    bearing: Math.floor(Math.random() * 360),
    accuracy: Math.floor(Math.random() * 20) + 5
  };
}

// استدعاء الدالة
setupGPSDataReceiver();

// ================== إعداد المراقبة والإحصائيات ==================

/**
 * مراقبة الأسطول والبث الدوري للإحصائيات
 */
async function setupFleetMonitoring() {
  setInterval(async () => {
    try {
      // الحصول على إحصائيات الأسطول
      const snapshot = await SmartFleetDashboardService.getFleetSnapshot();

      // بث الإحصائيات لجميع المشتركين
      SmartGPSWebSocketService.broadcastFleetStatistics(snapshot.analytics);

      // بث إحصائيات الاتصالات
      const connStats = SmartGPSWebSocketService.getConnectionStatistics();
      console.log(`📊 عدد الاتصالات: ${connStats.totalConnections}`);

    } catch (error) {
      console.error('خطأ في مراقبة الأسطول:', error);
    }
  }, 30000); // كل 30 ثانية
}

setupFleetMonitoring();

// ================== عمليات الصيانة الدورية ==================

/**
 * عمليات الصيانة والتنظيف
 */
async function setupMaintenanceTasks() {
  // تنظيف الجلسات الخاملة كل 15 دقيقة
  setInterval(() => {
    SmartGPSWebSocketService.cleanupIdleSessions(30 * 60 * 1000); // 30 دقيقة
    console.log('🧹 تم تنظيف الجلسات الخاملة');
  }, 15 * 60 * 1000);

  // حذف السجلات القديمة (أكثر من 90 يوم)
  setInterval(async () => {
    try {
      const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      await mongoose.model('Trip').deleteMany({
        startTime: { $lt: oldDate }
      });
      console.log('🗑️ تم حذف السجلات القديمة');
    } catch (error) {
      console.error('خطأ في حذف السجلات:', error);
    }
  }, 24 * 60 * 60 * 1000); // يومياً
}

setupMaintenanceTasks();

// ================== معالج الإشارات ==================

process.on('SIGINT', () => {
  console.log('\n🛑 إيقاف الخادم...');
  server.close(() => {
    console.log('✅ تم إيقاف الخادم');
    process.exit(0);
  });
});

// ================== الملف الجاهز للاستخدام ==================

module.exports = { app, server, io, SmartGPSWebSocketService };
