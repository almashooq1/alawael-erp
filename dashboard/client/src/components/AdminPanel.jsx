/**
 * AdminPanel Component
 * Management and control for v2.0 features
 */

import React, { useState } from 'react';
import '../styles/AdminPanel.css';

function AdminPanel() {
  const [cacheStatus, setCacheStatus] = useState(null);
  const [metricsStatus, setMetricsStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [cachePattern, setCachePattern] = useState('all');

  const apiKey = 'test-key'; // In production, this should be securely stored

  const clearCache = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/admin/cache/clear', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pattern: cachePattern === 'all' ? '*' : cachePattern }),
      });

      if (!response.ok) throw new Error('Failed to clear cache');

      const data = await response.json();
      setCacheStatus(data);
      setSuccess(`تم مسح الذاكرة المؤقتة: ${data.cleared}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const resetMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/admin/metrics/reset', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to reset metrics');

      const data = await response.json();
      setMetricsStatus(data);
      setSuccess('تم إعادة تعيين المقاييس بنجاح');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>⚙️ لوحة الإدارة</h2>
        <p className="admin-subtitle">إدارة الإعدادات والمقاييس والذاكرة المؤقتة</p>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="admin-success">
          ✅ {success}
        </div>
      )}

      {error && (
        <div className="admin-error">
          ⚠️ {error}
        </div>
      )}

      {/* Cache Management */}
      <div className="admin-section">
        <div className="section-header">
          <h3>🗄️ إدارة الذاكرة المؤقتة</h3>
          <p className="section-description">مسح الذاكرة المؤقتة المخزنة</p>
        </div>

        <div className="admin-form">
          <div className="form-group">
            <label>اختر نمط المسح:</label>
            <select
              value={cachePattern}
              onChange={(e) => setCachePattern(e.target.value)}
              disabled={loading}
            >
              <option value="all">جميع المفاتيح</option>
              <option value="api:*">طلبات API فقط</option>
              <option value="health:*">فحوصات الصحة فقط</option>
              <option value="metrics:*">المقاييس فقط</option>
              <option value="custom">نمط مخصص</option>
            </select>

            {cachePattern === 'custom' && (
              <input
                type="text"
                placeholder="أدخل نمط المسح (مثل: api:*)"
                value={cachePattern}
                onChange={(e) => setCachePattern(e.target.value)}
                disabled={loading}
              />
            )}
          </div>

          <button
            className="btn btn-danger"
            onClick={clearCache}
            disabled={loading}
          >
            {loading ? '⏳ جاري المعالجة...' : '🗑️ مسح الذاكرة المؤقتة'}
          </button>

          {cacheStatus && (
            <div className="status-display">
              <h4>نتيجة العملية:</h4>
              <div className="status-info">
                <p><strong>الحالة:</strong> {cacheStatus.success ? 'نجحت' : 'فشلت'}</p>
                <p><strong>المفاتيح المحذوفة:</strong> {cacheStatus.cleared}</p>
                {cacheStatus.timestamp && (
                  <p><strong>الوقت:</strong> {new Date(cacheStatus.timestamp).toLocaleString('ar-SA')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Management */}
      <div className="admin-section">
        <div className="section-header">
          <h3>📊 إدارة المقاييس</h3>
          <p className="section-description">إعادة تعيين المقاييس والإحصائيات</p>
        </div>

        <div className="admin-form">
          <p className="form-description">
            سيؤدي هذا إلى إعادة تعيين جميع المقاييس المجمعة والإحصائيات. يُنصح بإجراؤه بعد النشر أو لأغراض الاختبار.
          </p>

          <button
            className="btn btn-warning"
            onClick={resetMetrics}
            disabled={loading}
          >
            {loading ? '⏳ جاري المعالجة...' : '🔄 إعادة تعيين المقاييس'}
          </button>

          {metricsStatus && (
            <div className="status-display">
              <h4>نتيجة العملية:</h4>
              <div className="status-info">
                <p><strong>الحالة:</strong> {metricsStatus.success ? 'نجحت' : 'فشلت'}</p>
                <p><strong>المقاييس المعاد تعيينها:</strong> {metricsStatus.reset || 'جميع المقاييس'}</p>
                {metricsStatus.timestamp && (
                  <p><strong>الوقت:</strong> {new Date(metricsStatus.timestamp).toLocaleString('ar-SA')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Info */}
      <div className="admin-section">
        <div className="section-header">
          <h3>🔐 معلومات الأمان</h3>
          <p className="section-description">معلومات عن الأمان والمصادقة</p>
        </div>

        <div className="config-info">
          <div className="config-card">
            <h4>🔑 المصادقة</h4>
            <ul>
              <li>✅ مصادقة API Key مفعلة</li>
              <li>✅ تحديد معدل الطلبات: 10 طلبات/دقيقة للإدارة</li>
              <li>✅ طلب مفتاح API في كل عملية إدارية</li>
            </ul>
          </div>

          <div className="config-card">
            <h4>⚡ الأداء</h4>
            <ul>
              <li>✅ الذاكرة المؤقتة الذكية: تقليل الحمل بنسبة 30-50%</li>
              <li>✅ تتبع الأداء: رصد العمليات البطيئة تلقائياً</li>
              <li>✅ ضغط الذاكرة: مراقبة استخدام الذاكرة في الوقت الفعلي</li>
            </ul>
          </div>

          <div className="config-card">
            <h4>📝 السجلات</h4>
            <ul>
              <li>✅ تسجيل شامل: جميع الطلبات والأخطاء</li>
              <li>✅ معرف الطلب: تتبع العمليات عبر السجلات</li>
              <li>✅ تدوير الملف: ملفات جديدة يومياً</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Endpoints Info */}
      <div className="admin-section">
        <div className="section-header">
          <h3>🔌 نقاط النهاية المتاحة</h3>
          <p className="section-description">جميع نقاط نهاية v2.0 API</p>
        </div>

        <div className="endpoints-list">
          <div className="endpoint-item">
            <span className="method get">GET</span>
            <span className="path">/health</span>
            <span className="desc">فحص صحة النظام</span>
          </div>

          <div className="endpoint-item">
            <span className="method get">GET</span>
            <span className="path">/health/history</span>
            <span className="desc">سجل الصحة التاريخي</span>
          </div>

          <div className="endpoint-item">
            <span className="method get">GET</span>
            <span className="path">/metrics/performance</span>
            <span className="desc">مقاييس الأداء</span>
          </div>

          <div className="endpoint-item">
            <span className="method get">GET</span>
            <span className="path">/metrics/cache</span>
            <span className="desc">إحصائيات الذاكرة المؤقتة</span>
          </div>

          <div className="endpoint-item">
            <span className="method get">GET</span>
            <span className="path">/metrics/system</span>
            <span className="desc">مقاييس النظام</span>
          </div>

          <div className="endpoint-item">
            <span className="method post">POST</span>
            <span className="path">/admin/cache/clear</span>
            <span className="desc">مسح الذاكرة المؤقتة</span>
          </div>

          <div className="endpoint-item">
            <span className="method post">POST</span>
            <span className="path">/admin/metrics/reset</span>
            <span className="desc">إعادة تعيين المقاييس</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
