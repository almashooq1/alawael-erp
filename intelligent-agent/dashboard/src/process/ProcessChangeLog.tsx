import React from 'react';

// سجل تغييرات تجريبي لعملية واحدة
const changeLog = [
  { date: '2026-01-01', user: 'admin', action: 'إنشاء العملية', impact: 'إضافة جديدة' },
  { date: '2026-01-03', user: 'ahmed', action: 'تعديل خطوة', impact: 'تسريع التنفيذ' },
  { date: '2026-01-07', user: 'fatima', action: 'إضافة شرط تحقق', impact: 'تحسين الجودة' },
  { date: '2026-01-10', user: 'admin', action: 'تعديل سياسة', impact: 'تأثير متوسط على الأداء' },
  { date: '2026-01-12', user: 'ahmed', action: 'إلغاء خطوة', impact: 'تسريع التنفيذ بشكل ملحوظ' },
];

export default function ProcessChangeLog() {
  return (
    <div style={{margin:'32px 0',background:'#f9f9f9',padding:24,borderRadius:8}}>
      <h3>سجل التغييرات وتحليل الأثر</h3>
      <table style={{width:'100%',background:'#fff',borderRadius:6,boxShadow:'0 1px 4px #eee',fontSize:15}}>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>المستخدم</th>
            <th>الإجراء</th>
            <th>تحليل الأثر</th>
          </tr>
        </thead>
        <tbody>
          {changeLog.map((log,i) => (
            <tr key={i}>
              <td>{log.date}</td>
              <td>{log.user}</td>
              <td>{log.action}</td>
              <td>{log.impact}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
