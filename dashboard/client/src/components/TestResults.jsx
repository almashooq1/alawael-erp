import React, { useState, useEffect } from 'react';
import { getServiceHistory } from '../utils/api';
import './TestResults.css';

function TestResults({ service }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (service && service.name) {
      loadHistory();
    }
  }, [service]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getServiceHistory(service.name, 10);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">⏳ جاري التحميل...</div>;
  }

  if (!service) {
    return <div className="no-selection">اختر خدمة لعرض التفاصيل</div>;
  }

  const latestRun = service.latestRun;

  return (
    <div className="test-results">
      {latestRun ? (
        <>
          <div className="latest-run">
            <h3>آخر تشغيل</h3>
            <div className="run-details">
              <div className="detail-card">
                <span className="detail-label">الحالة</span>
                <span className={`detail-value status-${latestRun.status}`}>
                  {latestRun.status === 'passing' ? '✅ ناجح' : '❌ فاشل'}
                </span>
              </div>

              <div className="detail-card">
                <span className="detail-label">الاختبارات</span>
                <span className="detail-value">
                  {latestRun.tests_passed} / {latestRun.tests_total}
                </span>
              </div>

              {latestRun.coverage !== null && (
                <div className="detail-card">
                  <span className="detail-label">التغطية</span>
                  <span className="detail-value">{latestRun.coverage}%</span>
                  <div className="coverage-bar">
                    <div
                      className="coverage-fill"
                      style={{ width: `${latestRun.coverage}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="detail-card">
                <span className="detail-label">المدة</span>
                <span className="detail-value">
                  {(latestRun.duration_ms / 1000).toFixed(2)} ثانية
                </span>
              </div>

              <div className="detail-card">
                <span className="detail-label">التاريخ</span>
                <span className="detail-value">
                  {new Date(latestRun.timestamp).toLocaleString('ar-SA')}
                </span>
              </div>
            </div>
          </div>

          {history.length > 0 && (
            <div className="history">
              <h3>السجل الأخير (آخر 10 عمليات)</h3>
              <div className="history-table">
                <table>
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>الحالة</th>
                      <th>الاختبارات</th>
                      <th>التغطية</th>
                      <th>المدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((run, index) => (
                      <tr key={index} className={`run-${run.status}`}>
                        <td>{new Date(run.timestamp).toLocaleString('ar-SA', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</td>
                        <td>
                          <span className={`badge badge-${run.status}`}>
                            {run.status === 'passing' ? 'ناجح' : 'فاشل'}
                          </span>
                        </td>
                        <td>{run.tests_passed}/{run.tests_total}</td>
                        <td>{run.coverage !== null ? `${run.coverage}%` : 'N/A'}</td>
                        <td>{(run.duration_ms / 1000).toFixed(1)}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="no-runs">لا توجد نتائج متاحة لهذه الخدمة</div>
      )}
    </div>
  );
}

export default TestResults;
