"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.t = t;
// دعم الترجمة والتدويل (i18n)
const translations = {
    ar: {
        GREETING: 'مرحباً',
        HEALTH_OK: 'النظام يعمل بنجاح',
        ERROR_INTERNAL: 'حدث خطأ داخلي',
        ERROR_FORBIDDEN: 'ممنوع',
        ERROR_NOT_FOUND: 'غير موجود',
        ERROR_VALIDATION: 'البيانات غير صحيحة: {{details}}'
    },
    en: {
        GREETING: 'Hello',
        HEALTH_OK: 'System is healthy',
        ERROR_INTERNAL: 'Internal error occurred',
        ERROR_FORBIDDEN: 'Forbidden',
        ERROR_NOT_FOUND: 'Not found',
        ERROR_VALIDATION: 'Invalid data: {{details}}'
    }
};
function t(key, lang = 'ar', vars) {
    let str = translations[lang]?.[key] || key;
    if (vars) {
        for (const k in vars) {
            str = str.replace(`{{${k}}}`, vars[k]);
        }
    }
    return str;
}
