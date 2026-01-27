"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorLogger = void 0;
// تسجيل الأخطاء وإرسال تنبيهات (مثال: Sentry, Slack, Email)
class ErrorLogger {
    static log(error) {
        // سجل الخطأ محليًا
        console.error('[ERROR]', error);
        // يمكن التوسعة لإرسال الخطأ إلى Sentry أو Slack أو بريد إلكتروني
    }
}
exports.ErrorLogger = ErrorLogger;
