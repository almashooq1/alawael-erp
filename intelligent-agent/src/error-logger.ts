// تسجيل الأخطاء وإرسال تنبيهات (مثال: Sentry, Slack, Email)
export class ErrorLogger {
  static log(error: Error) {
    // سجل الخطأ محليًا
    console.error('[ERROR]', error);
    // يمكن التوسعة لإرسال الخطأ إلى Sentry أو Slack أو بريد إلكتروني
  }
}
