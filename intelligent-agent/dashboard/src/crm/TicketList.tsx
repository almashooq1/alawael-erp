import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const { t } = useI18n();

  useEffect(() => {
    fetch('/api/tickets')
      .then(r => r.json())
      .then(setTickets)
      .catch(() => setError(t('errorFetching') || 'Failed to load tickets'))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <div>{t('loading') || 'Loading tickets...'}</div>;
  if (error) return <div style={{color:'red'}}>{error}</div>;
  return (
    <div>
      <table style={{width:'100%',fontSize:15}}>
        <thead>
          <tr>
            <th>{t('subject') || 'Subject'}</th>
            <th>{t('customer') || 'Customer'}</th>
            <th>{t('status') || 'Status'}</th>
            <th>{t('priority') || 'Priority'}</th>
            <th>{t('assignedTo') || 'Assigned To'}</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(t => (
            <tr key={t._id}>
              <td>{t.subject}</td>
              <td>{t.customer?.name || t.customer}</td>
              <td>{t(t.status) || t.status}</td>
              <td>{t(t.priority) || t.priority}</td>
              <td>{t.assignedTo || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
