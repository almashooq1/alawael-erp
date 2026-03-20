import React, { useState, useEffect } from 'react';

const API = '/api/payments/dashboard';

export default function PaymentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const r = await fetch(API);
      setData(await r.json());
    } catch { setData(null); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 30000); return () => clearInterval(t); }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳ جاري تحميل بيانات المدفوعات...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: '#c62828' }}>❌ تعذر الاتصال ببوابة الدفع (3690)</div>;

  const formatCurrency = (amount) => new Intl.NumberFormat('ar-SA', { style: 'currency', currency: data.currency || 'SAR' }).format(amount || 0);

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>💳 بوابة الدفع</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إيرادات الشهر', value: formatCurrency(data.monthlyRevenue), color: '#388e3c', icon: '💰' },
          { label: 'مبالغ معلقة', value: formatCurrency(data.pendingAmount), color: '#f57c00', icon: '⏳' },
          { label: 'إجمالي الفواتير', value: data.totalInvoices || 0, color: '#1976d2', icon: '📄' },
          { label: 'فواتير متأخرة', value: data.overdueInvoices || 0, color: '#c62828', icon: '🔴' },
          { label: 'معاملات اليوم', value: data.todayTransactions || 0, color: '#7b1fa2', icon: '📊' },
          { label: 'دفعات متكررة', value: data.activeRecurring || 0, color: '#00838f', icon: '🔁' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', borderRight: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: card.color, marginTop: 4 }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Method Breakdown */}
      {data.methodBreakdown && Object.keys(data.methodBreakdown).length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>💳 طرق الدفع</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 12 }}>
            {Object.entries(data.methodBreakdown).map(([method, info]) => (
              <div key={method} style={{ padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{method}</div>
                <div style={{ fontSize: 13, color: '#666' }}>{info.count} معاملة</div>
                <div style={{ fontSize: 14, color: '#1976d2', fontWeight: 'bold' }}>{formatCurrency(info.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice Status */}
      {data.invoiceStatusBreakdown && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>📋 حالة الفواتير</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.invoiceStatusBreakdown).map(([status, count]) => {
              const colors = { paid: '#e8f5e9', sent: '#e3f2fd', partial: '#fff3e0', overdue: '#ffebee', draft: '#f5f5f5', cancelled: '#eceff1' };
              const icons = { paid: '✅', sent: '📤', partial: '🔶', overdue: '🔴', draft: '📝', cancelled: '❌' };
              return (
                <div key={status} style={{ padding: '8px 16px', background: colors[status] || '#f5f5f5', borderRadius: 8, fontSize: 14 }}>
                  {icons[status] || '📄'} <strong>{status}</strong>: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {data.recentTransactions?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
          <h3>🕐 آخر المعاملات</h3>
          <div style={{ marginTop: 12 }}>
            {data.recentTransactions.map((txn, i) => (
              <div key={i} style={{ padding: 10, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>{txn.txnId}</span>
                  <span style={{ margin: '0 8px', color: '#666' }}>— {txn.method}</span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold', color: txn.status === 'completed' ? '#388e3c' : txn.status === 'failed' ? '#c62828' : '#f57c00' }}>
                    {formatCurrency(txn.amount)}
                  </div>
                  <div style={{ fontSize: 11, color: '#999' }}>
                    {txn.status === 'completed' ? '✅' : txn.status === 'failed' ? '❌' : '⏳'} {new Date(txn.createdAt).toLocaleString('ar-SA')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
