import React, { useState } from 'react';

const integrations = [
  { key: 'erp', label: 'ERP', desc: 'تكامل مع أنظمة تخطيط الموارد المؤسسية (ERP) مثل SAP, Oracle, Odoo' },
  { key: 'crm', label: 'CRM', desc: 'تكامل مع أنظمة إدارة علاقات العملاء (CRM) مثل Salesforce, Zoho' },
  { key: 'dms', label: 'DMS', desc: 'تكامل مع أنظمة إدارة الوثائق (DMS) مثل M-Files, SharePoint' },
];

export default function ExternalIntegrationsSettings() {
  const [enabled, setEnabled] = useState({ erp: false, crm: false, dms: false });
  const [config, setConfig] = useState({
    erp: { apiUrl: '', apiKey: '' },
    crm: { apiUrl: '', apiKey: '' },
    dms: { apiUrl: '', apiKey: '' },
  });
  return (
    <div style={{margin:'32px 0',background:'#f9f9f9',padding:24,borderRadius:8}}>
      <h3>إعدادات التكامل مع الأنظمة الخارجية</h3>
      <ul style={{listStyle:'none',padding:0}}>
        {integrations.map(intg => (
          <li key={intg.key} style={{marginBottom:24}}>
            <label style={{fontWeight:500}}>
              <input type="checkbox" checked={enabled[intg.key]} onChange={e=>setEnabled({...enabled,[intg.key]:e.target.checked})} />
              {intg.label}
            </label>
            <span style={{marginLeft:12,color:'#888'}}>{intg.desc}</span>
            {enabled[intg.key] && (
              <div style={{marginTop:8,marginRight:24}}>
                <input placeholder="API URL" value={config[intg.key].apiUrl} onChange={e=>setConfig({...config,[intg.key]:{...config[intg.key],apiUrl:e.target.value}})} style={{marginRight:8}} />
                <input placeholder="API Key" value={config[intg.key].apiKey} onChange={e=>setConfig({...config,[intg.key]:{...config[intg.key],apiKey:e.target.value}})} style={{marginRight:8}} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <button style={{marginTop:16,padding:'8px 24px',background:'#1890ff',color:'#fff',border:'none',borderRadius:6}}>
        حفظ الإعدادات
      </button>
    </div>
  );
}
