// ملف ترجمة بسيط (عربي/إنجليزي)
const translations = {
  ar: {
    contractTitle: 'عنوان العقد',
    parties: 'الأطراف',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    value: 'القيمة',
    status: 'الحالة',
    risk: 'المخاطر',
    file: 'ملف',
    activityLog: 'سجل النشاطات',
    signature: 'توقيع إلكتروني',
    addContract: 'إضافة عقد',
    search: 'بحث',
    clear: 'مسح',
    // ... أضف المزيد حسب الحاجة
  },
  en: {
    contractTitle: 'Contract Title',
    parties: 'Parties',
    startDate: 'Start Date',
    endDate: 'End Date',
    value: 'Value',
    status: 'Status',
    risk: 'Risk',
    file: 'File',
    activityLog: 'Activity Log',
    signature: 'Signature',
    addContract: 'Add Contract',
    search: 'Search',
    clear: 'Clear',
    // ... add more as needed
  }
};

export function t(key, lang = 'ar') {
  return translations[lang][key] || key;
}
