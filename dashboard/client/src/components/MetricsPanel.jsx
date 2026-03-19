/**
 * MetricsPanel Component
 * Performance metrics visualization with v2.0 API
 */

import React, { useState, useEffect } from 'react';
import '../styles/MetricsPanel.css';

function MetricsPanel() {
  const [performance, setPerformance] = useState(null);
  const [cache, setCache] = useState(null);
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('performance');
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const fetchMetrics = async () => {
    try {
      const urls = {
        performance: 'http://localhost:3001/metrics/performance',
        cache: 'http://localhost:3001/metrics/cache',
        system: 'http://localhost:3001/metrics/system'
      };

      const [perfRes, cacheRes, sysRes] = await Promise.all([
        fetch(urls.performance),
        fetch(urls.cache),
        fetch(urls.system)
      ]);

      if (!perfRes.ok || !cacheRes.ok || !sysRes.ok) throw new Error('Failed to fetch metrics');

      const [perfData, cacheData, sysData] = await Promise.all([
        perfRes.json(),
        cacheRes.json(),
        sysRes.json()
      ]);

      setPerformance(perfData);
      setCache(cacheData);
      setSystem(sysData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading) {
    return <div className="metrics-panel loading">جاري التحميل...</div>;
  }

  if (error) {
    return <div className="metrics-panel error">⚠️ خطأ: {error}</div>;
  }

  return (
    <div className="metrics-panel">
      <div className="metrics-header">
        <h2>📈 لوحة المقاييس</h2>
        <div className="metrics-controls">
          <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))}>
            <option value={2000}>تحديث كل ثانيتين</option>
            <option value={5000}>تحديث كل 5 ثوان</option>
            <option value={10000}>تحديث كل 10 ثوان</option>
            <option value={30000}>تحديث كل 30 ثانية</option>
          </select>
          <button onClick={fetchMetrics} title="تحديث فوري">🔄</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="metrics-tabs">
        <button
          className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          ⚡ الأداء
        </button>
        <button
          className={`tab ${activeTab === 'cache' ? 'active' : ''}`}
          onClick={() => setActiveTab('cache')}
        >
          🗄️ الذاكرة المؤقتة
        </button>
        <button
          className={`tab ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          🖥️ النظام
        </button>
      </div>

      {/* Performance Tab */}
      {activeTab === 'performance' && performance && (
        <div className="metrics-content">
          <div className="summary-cards">
            <div className="summary-card">
              <h4>الدوال البطيئة</h4>
              <p className="value">{performance.report?.summary?.totalSlowFunctions || 0}</p>
            </div>
            <div className="summary-card">
              <h4>نقاط النهاية</h4>
              <p className="value">{performance.report?.summary?.totalAPIEndpoints || 0}</p>
            </div>
            <div className="summary-card">
              <h4>الاستعلامات</h4>
              <p className="value">{performance.report?.summary?.totalQueries || 0}</p>
            </div>
          </div>

          {/* Memory Profile */}
          <div className="memory-profile">
            <h3>📊 ملف الذاكرة</h3>
            <div className="memory-bars">
              <div className="memory-item">
                <label>Heap Used</label>
                <div className="bar">
                  <div
                    className="fill"
                    style={{ width: `${(performance.memory.heapUsed.bytes / performance.memory.heapTotal.bytes) * 100}%` }}
                  ></div>
                </div>
                <span>{performance.memory.heapUsed.mb} MB / {performance.memory.heapTotal.mb} MB</span>
              </div>

              <div className="memory-item">
                <label>External</label>
                <div className="bar">
                  <div
                    className="fill"
                    style={{ width: `${Math.min((performance.memory.external.bytes / performance.memory.heapTotal.bytes) * 100, 100)}%` }}
                  ></div>
                </div>
                <span>{performance.memory.external.mb} MB</span>
              </div>

              <div className="memory-item">
                <label>RSS (Total)</label>
                <div className="bar">
                  <div
                    className="fill"
                    style={{ width: `${Math.min((performance.memory.rss.bytes / (performance.memory.rss.bytes * 2)) * 100, 100)}%` }}
                  ></div>
                </div>
                <span>{performance.memory.rss.mb} MB</span>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          {performance.suggestions && performance.suggestions.length > 0 && (
            <div className="suggestions">
              <h3>💡 اقتراحات التحسين</h3>
              <ul>
                {performance.suggestions.map((suggestion, idx) => (
                  <li key={idx}>📌 {suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {performance.suggestions?.length === 0 && (
            <div className="no-suggestions">
              ✅ النظام يعمل بكفاءة عالية - لا توجد اقتراحات
            </div>
          )}
        </div>
      )}

      {/* Cache Tab */}
      {activeTab === 'cache' && cache && (
        <div className="metrics-content">
          <div className="cache-stats">
            <div className="cache-card">
              <h4>🔑 المفاتيح المخزنة</h4>
              <p className="value">{cache.stats?.keys || 0}</p>
            </div>

            <div className="cache-card">
              <h4>✅ عدد الإصابات</h4>
              <p className="value">{cache.stats?.hits || 0}</p>
            </div>

            <div className="cache-card">
              <h4>❌ عدد الفشل</h4>
              <p className="value">{cache.stats?.misses || 0}</p>
            </div>

            <div className="cache-card">
              <h4>📊 نسبة الإصابة</h4>
              <p className="value" style={{ color: cache.stats?.hitRate > 50 ? '#4CAF50' : '#FFC107' }}>
                {cache.stats?.hitRate || 0}%
              </p>
            </div>

            <div className="cache-card">
              <h4>💾 حجم المفاتيح</h4>
              <p className="value">{cache.stats?.ksize || 0} bytes</p>
            </div>

            <div className="cache-card">
              <h4>💾 حجم القيم</h4>
              <p className="value">{cache.stats?.vsize || 0} bytes</p>
            </div>
          </div>

          <div className="cache-chart">
            <h3>📈 رسم بياني للإصابات والفشل</h3>
            <div className="simple-chart">
              <div className="chart-bar">
                <div className="hits" style={{ width: `${(cache.stats?.hits / (cache.stats?.hits + cache.stats?.misses || 1)) * 100 || 0}%` }}></div>
                <div className="misses" style={{ width: `${(cache.stats?.misses / (cache.stats?.hits + cache.stats?.misses || 1)) * 100 || 0}%` }}></div>
              </div>
              <div className="chart-legend">
                <span><div className="legend-hits"></div> إصابات: {cache.stats?.hits || 0}</span>
                <span><div className="legend-misses"></div> فشل: {cache.stats?.misses || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && system && (
        <div className="metrics-content">
          <div className="system-metrics">
            <div className="system-card">
              <h4>💾 الذاكرة الإجمالية</h4>
              <p className="value">{(system.metrics?.memory?.total / 1024 / 1024 / 1024).toFixed(2)} GB</p>
            </div>

            <div className="system-card">
              <h4>🟢 الذاكرة الحرة</h4>
              <p className="value">{(system.metrics?.memory?.free / 1024 / 1024 / 1024).toFixed(2)} GB</p>
            </div>

            <div className="system-card">
              <h4>🔴 الذاكرة المستخدمة</h4>
              <p className="value">{(system.metrics?.memory?.used / 1024 / 1024 / 1024).toFixed(2)} GB</p>
            </div>

            <div className="system-card">
              <h4>📊 نسبة الاستخدام</h4>
              <p className="value" style={{ color: system.metrics?.memory?.usedPercent > 80 ? '#f44336' : '#4CAF50' }}>
                {system.metrics?.memory?.usedPercent?.toFixed(2) || 0}%
              </p>
            </div>

            <div className="system-card">
              <h4>🖥️ عدد المعالجات</h4>
              <p className="value">{system.metrics?.cpu?.count || 0}</p>
            </div>

            <div className="system-card">
              <h4>⚙️ تحميل النظام</h4>
              <p className="value">{system.metrics?.cpu?.loadAverage?.[0]?.toFixed(2) || '0'}</p>
            </div>

            <div className="system-card">
              <h4>⏱️ وقت التشغيل</h4>
              <p className="value">{(system.metrics?.process?.uptime || 0).toFixed(0)}s</p>
            </div>

            <div className="system-card">
              <h4>🔧 معالج</h4>
              <p className="value">{system.metrics?.cpu?.model?.split('(')[1]?.split(')')[0] || 'Unknown'}</p>
            </div>
          </div>

          <div className="cpu-chart">
            <h3>⚡ استخدام المعالج</h3>
            <div className="load-bars">
              {system.metrics?.cpu?.loadAverage?.map((load, idx) => (
                <div key={idx} className="load-item">
                  <label>{['الأخير 1 دقيقة', 'الأخير 5 دقائق', 'الأخير 15 دقيقة'][idx]}</label>
                  <div className="load-bar">
                    <div className="load-fill" style={{ width: `${Math.min((load / system.metrics.cpu.count) * 100, 100)}%` }}></div>
                  </div>
                  <span>{load.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="metrics-timestamp">
        تاريخ آخر تحديث: {new Date().toLocaleString('ar-SA')}
      </div>
    </div>
  );
}

export default MetricsPanel;
