import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const { t } = useI18n();

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(setCustomers)
      .catch(() => setError(t('errorFetching') || 'Failed to load customers'))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <div>{t('loading') || 'Loading customers...'}</div>;
  if (error) return <div style={{color:'red'}}>{error}</div>;
  return (
    <div>
      <table style={{width:'100%',fontSize:15}}>
        <thead>
          <tr>
            <th>{t('name') || 'Name'}</th>
            <th>{t('email') || 'Email'}</th>
            <th>{t('phone') || 'Phone'}</th>
            <th>{t('status') || 'Status'}</th>
            <th>{t('company') || 'Company'}</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(c => (
            <tr key={c._id}>
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>{c.phone}</td>
              <td>{t(c.status) || c.status}</td>
              <td>{c.company}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
