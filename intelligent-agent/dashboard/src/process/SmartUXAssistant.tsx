import React, { useState } from 'react';

const suggestions = [
  'هل ترغب في إضافة عملية جديدة بناءً على العمليات الأكثر استخداماً؟',
  'يمكنك تخصيص لوحة التحكم حسب تفضيلاتك من الإعدادات.',
  'جرب البحث الذكي للعثور على العمليات أو المهام بسرعة.',
  'تم رصد تكرار في بعض المهام، هل ترغب في دمجها؟',
];

export default function SmartUXAssistant() {
  const [show, setShow] = useState(true);
  const [current, setCurrent] = useState(0);
  if (!show) return null;
  return (
    <div style={{position:'fixed',bottom:32,right:32,zIndex:1000,background:'#fff',boxShadow:'0 2px 12px #bbb',borderRadius:12,padding:20,minWidth:320}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontWeight:600,fontSize:16}}>🤖 مساعد ذكي</span>
        <button onClick={()=>setShow(false)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer'}}>×</button>
      </div>
      <div style={{margin:'16px 0',fontSize:15}}>{suggestions[current]}</div>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
        <button disabled={current===0} onClick={()=>setCurrent(c=>c-1)} style={{padding:'4px 12px',borderRadius:6,border:'1px solid #ccc'}}>السابق</button>
        <button disabled={current===suggestions.length-1} onClick={()=>setCurrent(c=>c+1)} style={{padding:'4px 12px',borderRadius:6,border:'1px solid #ccc'}}>التالي</button>
      </div>
    </div>
  );
}
