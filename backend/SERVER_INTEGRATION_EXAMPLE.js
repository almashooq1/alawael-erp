// ========================================
// نموذج للتكامل - Integration Example
// كيفية دمج نظام الإشعارات في server.js
// ========================================

const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// استيراد طرق الإشعارات
const notificationRoutes = require('./routes/notificationRoutes');

// استيراد الخدمات (اختياري - للاستخدام المباشر)
const { notificationManager } = require('./services/unifiedNotificationManager');
const { whatsappService } = require('./services/whatsappNotificationService');
const { preferencesManager } = require('./services/userPreferencesManager');
const { rulesEngine } = require('./services/advancedAlertRulesEngine');
const { analyticsSystem } = require('./services/notificationAnalyticsSystem');

const app = express();

// ========================================
// إعدادات القاعدة الأساسية
// ========================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ========================================
// الاتصال بـ MongoDB
// ========================================

async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/notifications';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority',
    });
    
    console.log('✅ قاعدة البيانات متصلة بنجاح');
    return true;
  } catch (error) {
    console.error('❌ خطأ في الاتصال بـ قاعدة البيانات:', error.message);
    return false;
  }
}

// ========================================
// تركيب طرق الإشعارات
// ========================================

// الطرق الرئيسية للإشعارات
app.use('/api/notifications', notificationRoutes);

// ========================================
// أمثلة الاستخدام المباشر
// ========================================

// 1️⃣ إرسال إشعار موحد
app.post('/api/send-notification', async (req, res) => {
  try {
    const { userId, title, body, channels } = req.body;
    
    const result = await notificationManager.sendNotification(userId, {
      title,
      body,
      channels: channels || {
        email: true,
        sms: false,
        whatsapp: true,
        inApp: true,
      },
      priority: 'high',
      category: 'user-action',
    });
    
    res.status(200).json({
      success: true,
      message: 'تم إرسال الإشعار',
      notification: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 2️⃣ إرسال عبر قالب
app.post('/api/send-from-template', async (req, res) => {
  try {
    const { userId, templateId, variables, language } = req.body;
    
    const templateSystem = require('./services/smartTemplateSystem').templateSystem;
    
    const notification = await templateSystem.createNotificationFromTemplate(
      templateId,
      variables,
      language || 'ar'
    );
    
    const result = await notificationManager.sendNotification(userId, {
      ...notification,
      channels: {
        email: true,
        whatsapp: true,
      },
    });
    
    res.status(200).json({
      success: true,
      message: 'تم إرسال الإشعار من القالب',
      notification: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 3️⃣ الحصول على تفضيلات المستخدم
app.get('/api/user-preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const preferences = await preferencesManager.getPreferences(userId);
    
    res.status(200).json({
      success: true,
      preferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 4️⃣ تحديث تفضيلات المستخدم
app.put('/api/user-preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    const preferences = await preferencesManager.updatePreferences(userId, updates);
    
    res.status(200).json({
      success: true,
      message: 'تم تحديث التفضيلات',
      preferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 5️⃣ إرسال رسالة واتس آب مباشرة
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { phoneNumber, message, imageUrl } = req.body;
    
    let result;
    
    if (imageUrl) {
      result = await whatsappService.sendImageMessage(phoneNumber, imageUrl, message);
    } else {
      result = await whatsappService.sendMessage(phoneNumber, message);
    }
    
    res.status(200).json({
      success: true,
      message: 'تم إرسال الرسالة',
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 6️⃣ الحصول على الإحصائيات
app.get('/api/statistics', async (req, res) => {
  try {
    const whatsappStats = whatsappService.getStatistics();
    const kpis = await analyticsSystem.getKPIs();
    
    res.status(200).json({
      success: true,
      statistics: {
        whatsapp: whatsappStats,
        kpis,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 7️⃣ إنشاء قاعدة تنبيه
app.post('/api/create-alert-rule', async (req, res) => {
  try {
    const ruleData = req.body;
    
    const rule = await rulesEngine.createRule(ruleData);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء القاعدة',
      rule,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 8️⃣ اختبار حدث
app.post('/api/test-event', async (req, res) => {
  try {
    const event = req.body;
    
    const triggeredRules = await rulesEngine.evaluateEvent(event);
    
    res.status(200).json({
      success: true,
      message: `تم تقييم الحدث - ${triggeredRules.length} قاعدة تم تشغيلها`,
      triggeredRules,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// معالجة الأخطاء الشاملة
// ========================================

app.use((err, req, res, next) => {
  console.error('❌ خطأ في الخادم:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'حدث خطأ في الخادم',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ========================================
// بدء الخادم
// ========================================

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // الاتصال بـ قاعدة البيانات
    const dbConnected = await connectDatabase();
    
    if (!dbConnected) {
      console.error('❌ لم يتمكن من الاتصال بـ قاعدة البيانات');
      process.exit(1);
    }
    
    // بدء الخادم
    const server = app.listen(PORT, () => {
      console.log(`✅ الخادم يعمل على: http://localhost:${PORT}`);
      console.log(`📊 لوحة الإحصائيات: http://localhost:${PORT}/api/notifications/metrics/current`);
      console.log(`📋 جميع القوالب: http://localhost:${PORT}/api/notifications/templates`);
      console.log(`📱 إرسال واتس آب: POST http://localhost:${PORT}/api/notifications/whatsapp/send`);
    });
    
    // معالجة إيقاف البرنامج بشكل آمن
    process.on('SIGTERM', () => {
      console.log('⏹️  تم استقبال إشارة SIGTERM، سيتم إيقاف الخادم...');
      server.close(() => {
        console.log('✅ تم إيقاف الخادم بنجاح');
        mongoose.connection.close();
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ خطأ في بدء الخادم:', error);
    process.exit(1);
  }
}

// بدء التطبيق إذا لم يتم تصديره كوحدة
if (require.main === module) {
  startServer();
}

module.exports = app;

// ========================================
// ملاحظات مهمة:
// ========================================
/*

1. تأكد من إعدادات البيئة (.env)
   - MONGODB_URI
   - EMAIL_SERVICE و EMAIL_USER و EMAIL_PASSWORD
   - WHATSAPP_API_TOKEN أو بيانات اعتماد Twilio
   - إذا لزم الأمر: TWILIO_ACCOUNT_SID و TWILIO_AUTH_TOKEN

2. تثبيت المكتبات المطلوبة:
   npm install express mongoose nodemailer twilio axios dotenv winston

3. بدء الخادم:
   npm start
   أو
   node server.js

4. اختبار الإشعارات:
   curl -X POST http://localhost:5000/api/notifications/send \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "test-user",
       "title": "اختبار",
       "body": "هذا رسالة اختبار",
       "channels": {"email": true, "whatsapp": true}
     }'

5. الحصول على إحصائيات النظام:
   curl http://localhost:5000/api/notifications/metrics/kpis

*/
