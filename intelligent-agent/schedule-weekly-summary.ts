// ملف جدولة ملخص الامتثال الأسبوعي باستخدام node-cron
import cron from 'node-cron';
import { sendWeeklyComplianceSummary } from './modules/weekly-compliance-summary';

// يشغل كل يوم أحد الساعة 8 صباحاً
cron.schedule('0 8 * * 0', async () => {
  await sendWeeklyComplianceSummary();
  console.log('تم إرسال ملخص الامتثال الأسبوعي بنجاح.');
});

// يمكن تشغيل هذا الملف مع السيرفر أو كخدمة مستقلة
