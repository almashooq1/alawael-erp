// دعم الترجمة والتدويل (i18n)
const translations: Record<string, Record<string, string>> = {
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

export function t(key: string, lang: string = 'ar', vars?: Record<string, string>): string {
  let str = translations[lang]?.[key] || key;
  if (vars) {
    for (const k in vars) {
      str = str.replace(`{{${k}}}`, vars[k]);
    }
  }
  return str;
}
