// aiNotificationService.js
// خدمة الذكاء الاصطناعي للتنبيهات الذكية
// مبدئيًا: تحليل بيانات الموظف واقتراح تنبيهات تلقائية

// مثال: إذا تغيبت موظف أكثر من 3 أيام متتالية، اقترح تنبيه
async function analyzeAndSuggestNotifications(employeeData) {
  const suggestions = [];
  // كشف غياب متكرر
  if (employeeData.absentDays && employeeData.absentDays >= 3) {
    suggestions.push({
      type: 'absence',
      message: `الموظف ${employeeData.name} تغيّب ${employeeData.absentDays} أيام متتالية. يُنصح بمتابعة الحالة.`,
    });
  }
  // كشف أداء منخفض
  if (employeeData.performanceScore && employeeData.performanceScore < 2.5) {
    suggestions.push({
      type: 'performance',
      message: `انخفاض أداء الموظف ${employeeData.name} (التقييم: ${employeeData.performanceScore}). يُنصح بالتدخل.`,
    });
  }
  // يمكن إضافة قواعد ذكية أخرى لاحقًا
  return suggestions;
}

module.exports = { analyzeAndSuggestNotifications };
