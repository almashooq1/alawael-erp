import React, { useState } from 'react';

const ALL_FIELDS = [
  { key: 'title', label: 'عنوان العقد' },
  { key: 'parties', label: 'الأطراف' },
  { key: 'startDate', label: 'تاريخ البداية' },
  { key: 'endDate', label: 'تاريخ النهاية' },
  { key: 'value', label: 'القيمة' },
  { key: 'status', label: 'الحالة' },
  { key: 'terms', label: 'الشروط' },
  { key: 'ownerId', label: 'المالك' },
  { key: 'riskLevel', label: 'مستوى المخاطر' },
];

export default function ExportFieldsSelector({ selected, onChange }: { selected: string[], onChange: (fields: string[]) => void }) {
  return (
    <div style={{border:'1px solid #ccc',padding:8,borderRadius:6,margin:'8px 0',background:'#f8f8f8'}}>
      <b>اختر الحقول المراد تصديرها:</b>
      <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:8}}>
        {ALL_FIELDS.map(f => (
          <label key={f.key} style={{display:'flex',alignItems:'center',gap:4}}>
            <input type="checkbox" checked={selected.includes(f.key)} onChange={e => {
              if (e.target.checked) onChange([...selected, f.key]);
              else onChange(selected.filter(k => k !== f.key));
            }} />
            {f.label}
          </label>
        ))}
      </div>
    </div>
  );
}
