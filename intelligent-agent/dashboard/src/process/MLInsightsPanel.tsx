import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { CheckCircleOutlined, ClearOutlined, DeleteOutlined, DownloadOutlined, LineChartOutlined, BarChartOutlined } from '@ant-design/icons';

interface MetricsResponse {
  success: boolean;
  data?: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    sampleCount?: number;
    source?: string;
    confusionMatrix?: Record<string, Record<string, number>>;
  };
}

interface DriftResponse {
  success: boolean;
  data?: {
    status: 'drift-detected' | 'stable' | 'insufficient-data';
    windowSize?: number;
    baselineSize?: number;
    deltas?: {
      accuracy: number;
      f1Score: number;
    };
    thresholds?: {
      accuracyDrop: number;
      f1Drop: number;
    };
  };
}

interface DriftEventsResponse {
  success: boolean;
  data?: {
    events: Array<{
      _id: string;
      status: string;
      createdAt: string;
      accuracyDrop: number;
      f1Drop: number;
      windowSize: number;
      baselineSize: number;
    }>;
  };
}

interface AlertsResponse {
  success: boolean;
  data?: {
    alerts: Array<{
      _id: string;
      severity: 'high' | 'medium' | 'low';
      message: string;
      source: string;
      createdAt: string;
      read?: boolean;
      readAt?: string;
    }>;
    total?: number;
    unread?: number;
    bySeverity?: {
      high: number;
      medium: number;
      low: number;
    };
  };
}

export default function MLInsightsPanel() {
  const [metrics, setMetrics] = useState<MetricsResponse['data']>();
  const [drift, setDrift] = useState<DriftResponse['data']>();
  const [events, setEvents] = useState<DriftEventsResponse['data']>();
  const [alerts, setAlerts] = useState<AlertsResponse['data']>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [liveAlert, setLiveAlert] = useState<{ message: string; timestamp: string } | null>(null);
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'skipped'>('disconnected');
  const [alertSeverity, setAlertSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [alertSource, setAlertSource] = useState<'all' | 'feedback-mismatch' | 'drift'>('all');
  const [alertUnreadOnly, setAlertUnreadOnly] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [showTrends, setShowTrends] = useState(false);
  const [trendsData, setTrendsData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const severityParam = alertSeverity === 'all' ? '' : `&severity=${alertSeverity}`;
      const sourceParam = alertSource === 'all' ? '' : `&source=${alertSource}`;
      const unreadParam = alertUnreadOnly ? '&unread=true' : '';

      const [metricsRes, driftRes, eventsRes, alertsRes] = await Promise.all([
        fetch('/api/ml/metrics').then(r => r.json() as Promise<MetricsResponse>),
        fetch('/api/ml/drift').then(r => r.json() as Promise<DriftResponse>),
        fetch('/api/ml/drift/events?limit=5').then(r => r.json() as Promise<DriftEventsResponse>),
        fetch(`/api/ml/alerts?limit=5${severityParam}${sourceParam}${unreadParam}`).then(r => r.json() as Promise<AlertsResponse>),
      ]);

      setMetrics(metricsRes.data);
      setDrift(driftRes.data);
      setEvents(eventsRes.data);
      setAlerts(alertsRes.data);
      setLastUpdated(new Date().toISOString());
    } catch (e: any) {
      setError(e?.message || 'فشل تحميل بيانات الذكاء الاصطناعي');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [alertSeverity, alertSource, alertUnreadOnly]);

  // Load trends and summary on mount
  useEffect(() => {
    loadTrendsAndSummary();
  }, []);

  const loadTrendsAndSummary = async () => {
    try {
      const [trendsRes, summaryRes] = await Promise.all([
        fetch('/api/ml/aggregation/alerts?period=day').then(r => r.json()),
        fetch('/api/ml/summary?lookbackDays=7').then(r => r.json()),
      ]);

      if (trendsRes.success) setTrendsData(trendsRes.data);
      if (summaryRes.success) setSummaryData(summaryRes.data);
    } catch (e) {
      console.error('Failed to load trends/summary:', e);
    }
  };

  useEffect(() => {
    const token =
      window.localStorage.getItem('token') ||
      window.localStorage.getItem('auth_token') ||
      window.localStorage.getItem('jwt');

    if (!token) {
      setWsStatus('skipped');
      return;
    }

    const socket: Socket = io('/ml', {
      path: '/ws',
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('connect', () => setWsStatus('connected'));
    socket.on('disconnect', () => setWsStatus('disconnected'));
    socket.on('ml:alert', (payload: { data?: { message?: string; severity?: 'high' | 'medium' | 'low' }; timestamp?: string }) => {
      const message = payload?.data?.message || 'تنبيه من النموذج';
      const severity = payload?.data?.severity || 'medium';
      setLiveAlert({ message, timestamp: payload?.timestamp || new Date().toISOString() });

      if (alertUnreadOnly || alertSeverity !== 'all' || alertSource !== 'all') {
        // keep filters but refresh list
        void load();
      } else {
        void load();
      }

      if (notifyEnabled && notifyPermission === 'granted' && severity === 'high') {
        try {
          new Notification('تنبيه عالي من النظام', { body: message });
        } catch {}

        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = 880;
          gainNode.gain.value = 0.1;
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.start();
          setTimeout(() => {
            oscillator.stop();
            audioContext.close();
          }, 400);
        } catch {}
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const markAlertRead = async (id: string) => {
    try {
      await fetch(`/api/ml/alerts/${id}/read`, { method: 'PATCH' });
      setAlerts(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          alerts: prev.alerts.map(alert =>
            alert._id === id ? { ...alert, read: true, readAt: new Date().toISOString() } : alert
          ),
        };
      });
    } catch {}
  };

  const markAllAlertsRead = async () => {
    try {
      await fetch('/api/ml/alerts/read-all', { method: 'PATCH' });
      setAlerts(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          alerts: prev.alerts.map(alert => ({
            ...alert,
            read: true,
            readAt: alert.readAt || new Date().toISOString(),
          })),
        };
      });
    } catch {}
  };

  const deleteReadAlerts = async () => {
    try {
      const confirmed = window.confirm('هل تريد حذف جميع التنبيهات المقروءة؟');
      if (!confirmed) return;
      await fetch('/api/ml/alerts/read', { method: 'DELETE' });
      setAlerts(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          alerts: prev.alerts.filter(alert => !alert.read),
        };
      });
    } catch {}
  };

  const deleteAllAlerts = async () => {
    try {
      const confirmed = window.confirm('تحذير: سيتم حذف جميع التنبيهات نهائيًا. هل أنت متأكد؟');
      if (!confirmed) return;
      await fetch('/api/ml/alerts', { method: 'DELETE' });
      setAlerts(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          alerts: [],
        };
      });
    } catch {}
  };

  const exportCSV = async (type: 'feedback' | 'drift' | 'alerts') => {
    const url = `/api/ml/export/${type}/csv`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `ml-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = async () => {
    const link = document.createElement('a');
    link.href = '/api/ml/export/report/pdf';
    link.download = `ml-report-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = async () => {
    const link = document.createElement('a');
    link.href = '/api/ml/export/report/excel';
    link.download = `ml-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      load();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div style={{ maxWidth: 900, margin: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>مؤشرات ذكاء اصطناعي</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => exportCSV('feedback')}
            title="تصدير Feedback CSV"
            style={{ padding: '8px 16px', borderRadius: 8, background: '#1890ff', color: '#fff', border: 'none', display: 'flex', gap: 6, alignItems: 'center' }}
          >
            <DownloadOutlined /> CSV
          </button>
          <button
            onClick={() => exportPDF()}
            title="تصدير تقرير PDF"
            style={{ padding: '8px 16px', borderRadius: 8, background: '#52c41a', color: '#fff', border: 'none', display: 'flex', gap: 6, alignItems: 'center' }}
          >
            <DownloadOutlined /> PDF
          </button>
          <button
            onClick={() => exportExcel()}
            title="تصدير تقرير Excel"
            style={{ padding: '8px 16px', borderRadius: 8, background: '#13c2c2', color: '#fff', border: 'none', display: 'flex', gap: 6, alignItems: 'center' }}
          >
            <DownloadOutlined /> Excel
          </button>
          <button
            onClick={() => setShowTrends(v => !v)}
            title="عرض الاتجاهات"
            style={{ padding: '8px 16px', borderRadius: 8, background: showTrends ? '#722ed1' : '#d9d9d9', color: showTrends ? '#fff' : '#000', border: 'none', display: 'flex', gap: 6, alignItems: 'center' }}
          >
            <LineChartOutlined /> اتجاهات
          </button>
        </div>
      </div>

      {/* Intelligent Summary Section */}
      {summaryData && (
        <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: summaryData.overallStatus === 'critical' ? '#fff1f0' : summaryData.overallStatus === 'warning' ? '#fffbe6' : '#f6ffed', border: `2px solid ${summaryData.overallStatus === 'critical' ? '#ff4d4f' : summaryData.overallStatus === 'warning' ? '#faad14' : '#52c41a'}` }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChartOutlined />
            ملخص ذكي (آخر 7 أيام)
          </h3>
          <p style={{ fontWeight: 'bold', fontSize: 14 }}>{summaryData.summary}</p>
          {summaryData.keyFindings && summaryData.keyFindings.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>النتائج الرئيسية:</strong>
              <ul style={{ marginTop: 8, paddingInlineStart: 20 }}>
                {summaryData.keyFindings.map((finding: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: 4 }}>{finding}</li>
                ))}
              </ul>
            </div>
          )}
          {summaryData.actionItems && summaryData.actionItems.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>الإجراءات المطلوبة:</strong>
              <ul style={{ marginTop: 8, paddingInlineStart: 20 }}>
                {summaryData.actionItems.map((action: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: 4, color: summaryData.overallStatus === 'critical' ? '#cf1322' : '#000' }}>{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Trends Section */}
      {showTrends && trendsData && (
        <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: '#f5f5f5', border: '1px solid #d9d9d9' }}>
          <h3 style={{ marginTop: 0 }}>اتجاهات التنبيهات اليومية</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: 8, textAlign: 'right', borderBottom: '2px solid #d9d9d9' }}>التاريخ</th>
                  <th style={{ padding: 8, textAlign: 'center', borderBottom: '2px solid #d9d9d9' }}>المجموع</th>
                  <th style={{ padding: 8, textAlign: 'center', borderBottom: '2px solid #d9d9d9' }}>عالي</th>
                  <th style={{ padding: 8, textAlign: 'center', borderBottom: '2px solid #d9d9d9' }}>متوسط</th>
                  <th style={{ padding: 8, textAlign: 'center', borderBottom: '2px solid #d9d9d9' }}>منخفض</th>
                  <th style={{ padding: 8, textAlign: 'center', borderBottom: '2px solid #d9d9d9' }}>متوسط وقت الاستجابة</th>
                </tr>
              </thead>
              <tbody>
                {trendsData.slice(-10).map((trend: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{new Date(trend.timestamp).toLocaleDateString()}</td>
                    <td style={{ padding: 8, textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>{trend.total}</td>
                    <td style={{ padding: 8, textAlign: 'center', borderBottom: '1px solid #f0f0f0', color: '#ff4d4f' }}>{trend.bySeverity.high}</td>
                    <td style={{ padding: 8, textAlign: 'center', borderBottom: '1px solid #f0f0f0', color: '#faad14' }}>{trend.bySeverity.medium}</td>
                    <td style={{ padding: 8, textAlign: 'center', borderBottom: '1px solid #f0f0f0', color: '#52c41a' }}>{trend.bySeverity.low}</td>
                    <td style={{ padding: 8, textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
                      {trend.avgResponseTime ? `${Math.floor(trend.avgResponseTime / 60000)} دقيقة` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div></div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: wsStatus === 'connected' ? '#52c41a' : wsStatus === 'skipped' ? '#999' : '#e74c3c' }}>
            البث المباشر: {wsStatus === 'connected' ? 'متصل' : wsStatus === 'skipped' ? 'غير مفعل' : 'غير متصل'}
          </div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={notifyEnabled}
              onChange={() => setNotifyEnabled(v => !v)}
            />
            إشعارات التنبيه العالي
          </label>
          {notifyPermission !== 'granted' && (
            <button
              onClick={async () => {
                if (typeof window !== 'undefined' && 'Notification' in window) {
                  const permission = await Notification.requestPermission();
                  setNotifyPermission(permission);
                }
              }}
              style={{ padding: '6px 10px', borderRadius: 8, background: '#6c5ce7', color: '#fff', border: 'none' }}
            >
              تفعيل إشعارات المتصفح
            </button>
          )}
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={autoRefresh} onChange={() => setAutoRefresh(v => !v)} />
            تحديث تلقائي (كل دقيقة)
          </label>
          <button
            onClick={load}
            style={{ padding: '8px 14px', borderRadius: 8, background: '#1890ff', color: '#fff', border: 'none' }}
          >
            تحديث
          </button>
        </div>
      </div>
      {lastUpdated && (
        <div style={{ marginTop: 8, color: '#888', fontSize: 13 }}>
          آخر تحديث: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}

      {loading && <div>جاري التحميل...</div>}
      {error && <div style={{ color: '#e74c3c' }}>{error}</div>}

      {!loading && !error && (
        <>
          {liveAlert && (
            <div style={{ marginTop: 16, padding: 16, background: '#fff4f2', borderRadius: 10, border: '1px solid #e74c3c' }}>
              <b>تنبيه مباشر:</b> {liveAlert.message}
              <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
                {new Date(liveAlert.timestamp).toLocaleString()}
              </div>
              <button
                onClick={() => setLiveAlert(null)}
                style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: '#e74c3c', color: '#fff', border: 'none' }}
              >
                إخفاء
              </button>
            </div>
          )}
          {drift?.status === 'drift-detected' && (
            <div style={{ marginTop: 16, padding: 16, background: '#fff4f2', borderRadius: 10, border: '1px solid #e74c3c' }}>
              <b>تنبيه:</b> تم رصد انحراف في أداء النموذج. يوصى بإعادة التدريب أو مراجعة البيانات الحديثة.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <div style={{ background: '#fff', padding: 16, borderRadius: 10, boxShadow: '0 2px 8px #eee' }}>
              <div>الدقة</div>
              <b>{(metrics?.accuracy ?? 0).toFixed(2)}</b>
            </div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 10, boxShadow: '0 2px 8px #eee' }}>
              <div>Precision</div>
              <b>{(metrics?.precision ?? 0).toFixed(2)}</b>
            </div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 10, boxShadow: '0 2px 8px #eee' }}>
              <div>Recall</div>
              <b>{(metrics?.recall ?? 0).toFixed(2)}</b>
            </div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 10, boxShadow: '0 2px 8px #eee' }}>
              <div>F1</div>
              <b>{(metrics?.f1Score ?? 0).toFixed(2)}</b>
            </div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 10, boxShadow: '0 2px 8px #eee' }}>
              <div>العينات</div>
              <b>{metrics?.sampleCount ?? 0}</b>
            </div>
          </div>

          <div style={{ marginTop: 24, padding: 16, background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px #eee' }}>
            <h4>حالة الانحراف</h4>
            <div>الحالة: <b style={{ color: drift?.status === 'drift-detected' ? '#e74c3c' : '#52c41a' }}>{drift?.status || 'غير متوفر'}</b></div>
            {drift?.deltas && (
              <div style={{ marginTop: 8 }}>
                <div>Δ الدقة: {drift.deltas.accuracy.toFixed(3)}</div>
                <div>Δ F1: {drift.deltas.f1Score.toFixed(3)}</div>
              </div>
            )}
          </div>

          {metrics?.confusionMatrix && (
            <div style={{ marginTop: 24, padding: 16, background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px #eee' }}>
              <h4>مصفوفة الالتباس</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'right', padding: 8 }}>الحقيقة \ التنبؤ</th>
                    <th style={{ padding: 8 }}>high</th>
                    <th style={{ padding: 8 }}>medium</th>
                    <th style={{ padding: 8 }}>low</th>
                  </tr>
                </thead>
                <tbody>
                  {(['high', 'medium', 'low'] as const).map(label => (
                    <tr key={label}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{label}</td>
                      <td style={{ padding: 8 }}>{metrics.confusionMatrix?.[label]?.high ?? 0}</td>
                      <td style={{ padding: 8 }}>{metrics.confusionMatrix?.[label]?.medium ?? 0}</td>
                      <td style={{ padding: 8 }}>{metrics.confusionMatrix?.[label]?.low ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 24, padding: 16, background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px #eee' }}>
            <h4>آخر أحداث الانحراف</h4>
            <ul>
              {(events?.events || []).map(event => (
                <li key={event._id}>
                  {new Date(event.createdAt).toLocaleString()} — {event.status} — Δacc: {event.accuracyDrop.toFixed(3)} — Δf1: {event.f1Drop.toFixed(3)}
                </li>
              ))}
              {(!events?.events || events.events.length === 0) && <li>لا توجد أحداث بعد</li>}
            </ul>
          </div>

          <div style={{ marginTop: 24, padding: 16, background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px #eee' }}>
            <h4>آخر التنبيهات المسجلة</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ padding: '2px 10px', borderRadius: 999, background: '#f2f2f2', color: '#444', fontSize: 12 }}>
                الإجمالي {alerts?.total ?? 0}
              </span>
              <span style={{ padding: '2px 10px', borderRadius: 999, background: '#e8f0fe', color: '#1a73e8', fontSize: 12 }}>
                غير مقروء {alerts?.unread ?? 0}
              </span>
              <span style={{ padding: '2px 10px', borderRadius: 999, background: '#ffe6e6', color: '#d93025', fontSize: 12 }}>
                عالي {alerts?.bySeverity?.high ?? 0}
              </span>
              <span style={{ padding: '2px 10px', borderRadius: 999, background: '#fff7e6', color: '#d67b00', fontSize: 12 }}>
                متوسط {alerts?.bySeverity?.medium ?? 0}
              </span>
              <span style={{ padding: '2px 10px', borderRadius: 999, background: '#e6ffed', color: '#1e8e3e', fontSize: 12 }}>
                منخفض {alerts?.bySeverity?.low ?? 0}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                الشدة:
                <select value={alertSeverity} onChange={e => setAlertSeverity(e.target.value as any)}>
                  <option value="all">الكل</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                المصدر:
                <select value={alertSource} onChange={e => setAlertSource(e.target.value as any)}>
                  <option value="all">الكل</option>
                  <option value="feedback-mismatch">تباين التغذية</option>
                  <option value="drift">انحراف</option>
                </select>
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={alertUnreadOnly} onChange={() => setAlertUnreadOnly(v => !v)} />
                غير مقروء فقط
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={markAllAlertsRead}
                  title="تعليم الكل كمقروء"
                  aria-label="تعليم الكل كمقروء"
                  style={{ width: 34, height: 34, borderRadius: 8, background: '#2d3436', color: '#fff', border: 'none', fontSize: 16 }}
                >
                  <CheckCircleOutlined />
                </button>
                <button
                  onClick={deleteReadAlerts}
                  title="حذف المقروء"
                  aria-label="حذف المقروء"
                  style={{ width: 34, height: 34, borderRadius: 8, background: '#b00020', color: '#fff', border: 'none', fontSize: 16 }}
                >
                  <ClearOutlined />
                </button>
                <button
                  onClick={deleteAllAlerts}
                  title="حذف الكل"
                  aria-label="حذف الكل"
                  style={{ width: 34, height: 34, borderRadius: 8, background: '#8e0000', color: '#fff', border: 'none', fontSize: 16 }}
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>
            <ul>
              {(alerts?.alerts || []).map(alert => (
                <li key={alert._id}>
                  {new Date(alert.createdAt).toLocaleString()} —
                  <span
                    style={{
                      marginInline: 8,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background:
                        alert.severity === 'high'
                          ? '#ffe6e6'
                          : alert.severity === 'medium'
                            ? '#fff7e6'
                            : '#e6ffed',
                      color:
                        alert.severity === 'high'
                          ? '#d93025'
                          : alert.severity === 'medium'
                            ? '#d67b00'
                            : '#1e8e3e',
                    }}
                  >
                    {alert.severity}
                  </span>
                  {alert.message} ({alert.source})
                  {!alert.read && (
                    <button
                      onClick={() => markAlertRead(alert._id)}
                      style={{ marginInline: 8, padding: '4px 8px', borderRadius: 6, background: '#1890ff', color: '#fff', border: 'none' }}
                    >
                      تعليم كمقروء
                    </button>
                  )}
                </li>
              ))}
              {(!alerts?.alerts || alerts.alerts.length === 0) && <li>لا توجد تنبيهات بعد</li>}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
