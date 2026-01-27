import React, { useState } from 'react';

export default function ComplianceRiskEventDetails({ event, onClose }) {
  const [rootCause, setRootCause] = useState('');
  const [loading, setLoading] = useState(false);
  if (!event) return null;
  const handleRootCause = async () => {
    setLoading(true);
    setRootCause('');
    try {
      const res = await fetch('/v1/ai/compliance-root-cause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event })
      });
      const data = await res.json();
      setRootCause(data.result || 'لم يتم العثور على تحليل.');
    } catch (e) {
      setRootCause('حدث خطأ أثناء التحليل.');
    }
    setLoading(false);
  };
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.3)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',padding:24,borderRadius:8,minWidth:350,maxWidth:500,boxShadow:'0 4px 24px #0002',direction:'rtl'}}>
        <h3>تفاصيل الحدث</h3>
        <table style={{width:'100%',fontSize:15}}>
          <tbody>
            <tr><td><b>السياسة</b></td><td>{event.policy}</td></tr>
            <tr><td><b>درجة المخاطرة</b></td><td>{event.riskScore}</td></tr>
            <tr><td><b>عدد الانتهاكات</b></td><td>{event.violations}</td></tr>
            <tr><td><b>غير محلولة</b></td><td>{event.unresolved}</td></tr>
            <tr><td><b>آخر انتهاك</b></td><td>{event.lastViolation ? new Date(event.lastViolation).toLocaleString() : '-'}</td></tr>
            <tr><td><b>تفاصيل إضافية</b></td><td>{event.details || '-'}</td></tr>
          </tbody>
        </table>
        <button onClick={onClose} style={{marginTop:16,padding:'6px 18px',background:'#1890ff',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>إغلاق</button>
        <button onClick={handleRootCause} style={{marginTop:16,marginRight:8,padding:'6px 18px',background:'#faad14',color:'#222',border:'none',borderRadius:4,cursor:'pointer'}}>تحليل السبب الجذري بالذكاء الاصطناعي</button>
        {loading && <div style={{marginTop:12}}>جاري التحليل...</div>}
        {rootCause && <div style={{marginTop:12,background:'#f6ffed',padding:12,borderRadius:6,border:'1px solid #b7eb8f',color:'#222'}}><b>تحليل الذكاء الاصطناعي:</b><br/>{rootCause}</div>}
      </div>
    </div>
  );
}
