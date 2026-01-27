import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

  const [opps, setOpps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const { t } = useI18n();

  useEffect(() => {
    fetch('/api/opportunities')
      .then(r => r.json())
      .then(setOpps)
      .catch(() => setError(t('errorFetching') || 'Failed to load opportunities'))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <div>{t('loading') || 'Loading opportunities...'}</div>;
  if (error) return <div style={{color:'red'}}>{error}</div>;
  return (
    <div>
      <table style={{width:'100%',fontSize:15}}>
        <thead>
          <tr>
            <th>{t('title') || 'Title'}</th>
            <th>{t('customer') || 'Customer'}</th>
            <th>{t('value') || 'Value'}</th>
            <th>{t('stage') || 'Stage'}</th>
            <th>{t('expectedClose') || 'Expected Close'}</th>
          </tr>
        </thead>
        <tbody>
          {opps.map(o => (
            <tr key={o._id}>
              <td>{o.title}</td>
              <td>{o.customer?.name || o.customer}</td>
              <td>{o.value}</td>
              <td>{t(o.stage) || o.stage}</td>
              <td>{o.expectedClose ? new Date(o.expectedClose).toLocaleDateString() : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
