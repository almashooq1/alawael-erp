import React, { useState } from 'react';
import { useI18n } from '../i18n';

const channels = [
  { key: 'email', label: 'Email', icon: '✉️' },
  { key: 'sms', label: 'SMS', icon: '📱' },
  { key: 'slack', label: 'Slack', icon: '💬' },
  { key: 'teams', label: 'Teams', icon: '👥' },
  { key: 'webhook', label: 'Webhook', icon: '🔗' },
];

export default function NotificationChannelsSettings() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState({ email: true, sms: false, slack: false, teams: false, webhook: false });
  const [config, setConfig] = useState({
    email: { from: '', smtp: '' },
    sms: { provider: '', apiKey: '' },
    slack: { webhookUrl: '' },
    teams: { webhookUrl: '' },
    webhook: { url: '' },
  });
  return (
    <div style={{padding:24,maxWidth:600,margin:'auto'}}>
      <h2>{t('notificationChannels') || 'قنوات التنبيهات'}</h2>
      <ul style={{listStyle:'none',padding:0}}>
        {channels.map(ch => (
          <li key={ch.key} style={{marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:22}}>{ch.icon}</span>
            <label style={{fontWeight:500}}>{ch.label}</label>
            <input type="checkbox" checked={enabled[ch.key]} onChange={e=>setEnabled({...enabled,[ch.key]:e.target.checked})} />
            {enabled[ch.key] && (
              <div style={{marginLeft:16}}>
                {ch.key==='email' && (
                  <input placeholder="SMTP Server" value={config.email.smtp} onChange={e=>setConfig({...config,email:{...config.email,smtp:e.target.value}})} style={{marginRight:8}} />
                )}
                {ch.key==='sms' && (
                  <input placeholder="SMS Provider" value={config.sms.provider} onChange={e=>setConfig({...config,sms:{...config.sms,provider:e.target.value}})} style={{marginRight:8}} />
                )}
                {ch.key==='slack' && (
                  <input placeholder="Slack Webhook URL" value={config.slack.webhookUrl} onChange={e=>setConfig({...config,slack:{...config.slack,webhookUrl:e.target.value}})} style={{marginRight:8}} />
                )}
                {ch.key==='teams' && (
                  <input placeholder="Teams Webhook URL" value={config.teams.webhookUrl} onChange={e=>setConfig({...config,teams:{...config.teams,webhookUrl:e.target.value}})} style={{marginRight:8}} />
                )}
                {ch.key==='webhook' && (
                  <input placeholder="Webhook URL" value={config.webhook.url} onChange={e=>setConfig({...config,webhook:{...config.webhook,url:e.target.value}})} style={{marginRight:8}} />
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <button style={{marginTop:24,padding:'8px 24px',fontSize:16,background:'#1890ff',color:'#fff',border:'none',borderRadius:6}}>
        {t('save') || 'حفظ الإعدادات'}
      </button>
    </div>
  );
}
