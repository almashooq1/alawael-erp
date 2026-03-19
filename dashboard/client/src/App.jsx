import React, { useState, useEffect } from 'react';
import './App.css';
import StatusGrid from './components/StatusGrid';
import TestResults from './components/TestResults';
import TrendsChart from './components/TrendsChart';
import QuickActions from './components/QuickActions';
import { useWebSocket } from './hooks/useWebSocket';
import { useQuality } from './hooks/useQuality';

function App() {
  const [selectedService, setSelectedService] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  const { services, system, loading, error, refresh } = useQuality(refreshInterval);
  const { connected, lastMessage } = useWebSocket();

  useEffect(() => {
    // Handle WebSocket updates
    if (lastMessage) {
      if (lastMessage.type === 'test_complete') {
        refresh();
      }
    }
  }, [lastMessage, refresh]);

  const handleServiceClick = (service) => {
    setSelectedService(service);
  };

  const handleRefresh = () => {
    refresh();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎯 لوحة تحكم الجودة - ALAWAEL</h1>
        <div className="header-info">
          <span className={`ws-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 متصل' : '🔴 غير متصل'}
          </span>
          <span className="last-update">
            آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}
          </span>
        </div>
      </header>

      <main className="App-main">
        {error && (
          <div className="error-banner">
            ⚠️ خطأ: {error}
          </div>
        )}

        <div className="dashboard-grid">
          <section className="section section-status">
            <h2>حالة الخدمات</h2>
            <StatusGrid
              services={services}
              loading={loading}
              onServiceClick={handleServiceClick}
              selectedService={selectedService}
            />
            {system && (
              <div className="system-health">
                <h3>صحة النظام</h3>
                <div className={`health-indicator health-${system.health}`}>
                  {system.health === 'healthy' && '🟢 صحي'}
                  {system.health === 'warning' && '🟡 تحذير'}
                  {system.health === 'critical' && '🔴 حرج'}
                  {system.health === 'unknown' && '⚪ غير معروف'}
                </div>
                <div className="system-stats">
                  <div className="stat">
                    <span className="stat-label">الاختبارات:</span>
                    <span className="stat-value">{system.totalTests}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">الخدمات الناجحة:</span>
                    <span className="stat-value">{system.totalPassing}/{system.totalServices}</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="section section-actions">
            <h2>إجراءات سريعة</h2>
            <QuickActions
              services={services}
              selectedService={selectedService}
              onRefresh={handleRefresh}
            />
          </section>

          {selectedService && (
            <section className="section section-details">
              <h2>تفاصيل: {selectedService.name}</h2>
              <TestResults service={selectedService} />
            </section>
          )}

          <section className="section section-trends">
            <h2>اتجاهات الجودة</h2>
            <TrendsChart service={selectedService?.name} />
          </section>
        </div>
      </main>

      <footer className="App-footer">
        <p>© 2026 ALAWAEL ERP - نظام مراقبة الجودة</p>
      </footer>
    </div>
  );
}

export default App;
