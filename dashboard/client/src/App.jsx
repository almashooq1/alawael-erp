import React, { useState, useEffect } from 'react';
import './App.css';
import StatusGrid from './components/StatusGrid';
import TestResults from './components/TestResults';
import TrendsChart from './components/TrendsChart';
import QuickActions from './components/QuickActions';
import GatewayDashboard from './components/GatewayDashboard';
import ServiceMeshDashboard from './components/ServiceMeshDashboard';
import ReportsDashboard from './components/ReportsDashboard';
import SecurityDashboard from './components/SecurityDashboard';
import NotificationsDashboard from './components/NotificationsDashboard';
import BackupDashboard from './components/BackupDashboard';
import AIEngineDashboard from './components/AIEngineDashboard';
import AuditDashboard from './components/AuditDashboard';
import MultilingualDashboard from './components/MultilingualDashboard';
import PaymentDashboard from './components/PaymentDashboard';
import TaskProjectDashboard from './components/TaskProjectDashboard';
import FileStorageDashboard from './components/FileStorageDashboard';
import ChatDashboard from './components/ChatDashboard';
import ReportSchedulerDashboard from './components/ReportSchedulerDashboard';
import SystemConfigDashboard from './components/SystemConfigDashboard';
import DataMigrationDashboard from './components/DataMigrationDashboard';
import { useWebSocket } from './hooks/useWebSocket';
import { useQuality } from './hooks/useQuality';

const TABS = [
  { key: 'quality',       label: '🎯 الجودة',        icon: '🎯' },
  { key: 'gateway',       label: '🚀 بوابة API',      icon: '🚀' },
  { key: 'mesh',          label: '🕸️ شبكة الخدمات',   icon: '🕸️' },
  { key: 'reports',       label: '📊 التقارير الذكية', icon: '📊' },
  { key: 'security',      label: '🔐 الأمان',         icon: '🔐' },
  { key: 'notifications', label: '📢 الإشعارات',      icon: '📢' },
  { key: 'backup',        label: '💾 النسخ الاحتياطي', icon: '💾' },
  { key: 'ai',            label: '🤖 الذكاء الاصطناعي', icon: '🤖' },
  { key: 'audit',         label: '🔍 التدقيق',        icon: '🔍' },
  { key: 'i18n',          label: '🌐 اللغات',         icon: '🌐' },
  { key: 'payments',      label: '💳 المدفوعات',      icon: '💳' },
  { key: 'tasks',          label: '📋 المهام',         icon: '📋' },
  { key: 'files',          label: '📂 الملفات',        icon: '📂' },
  { key: 'chat',           label: '💬 الدردشة',        icon: '💬' },
  { key: 'scheduler',      label: '📊 جدولة التقارير', icon: '📊' },
  { key: 'config',         label: '⚙️ الإعدادات',       icon: '⚙️' },
  { key: 'migration',      label: '🔄 الترحيل',        icon: '🔄' },
];

function App() {
  const [activeTab, setActiveTab] = useState('quality');
  const [selectedService, setSelectedService] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  const { services, system, loading, error, refresh } = useQuality(refreshInterval);
  const { connected, lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'test_complete') {
        refresh();
      }
    }
  }, [lastMessage, refresh]);

  const handleServiceClick = (service) => setSelectedService(service);
  const handleRefresh = () => refresh();

  return (
    <div className="App">
      <header className="App-header">
        <h1>🏫 لوحة تحكم الأوائل - ALAWAEL ERP</h1>
        <div className="header-info">
          <span className={`ws-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 متصل' : '🔴 غير متصل'}
          </span>
          <span className="last-update">
            آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}
          </span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav style={{
        display: 'flex', justifyContent: 'center', gap: 4,
        padding: '8px 16px', background: '#f8f9fa', borderBottom: '1px solid #e0e0e0',
        flexWrap: 'wrap', direction: 'rtl'
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: activeTab === tab.key ? 'bold' : 'normal',
              background: activeTab === tab.key ? '#1976d2' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#333',
              transition: 'all 0.2s',
              fontFamily: 'Tajawal, sans-serif'
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="App-main">
        {error && activeTab === 'quality' && (
          <div className="error-banner">⚠️ خطأ: {error}</div>
        )}

        {/* Quality Tab (original) */}
        {activeTab === 'quality' && (
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
        )}

        {/* Gateway Tab */}
        {activeTab === 'gateway' && <GatewayDashboard />}

        {/* Service Mesh Tab */}
        {activeTab === 'mesh' && <ServiceMeshDashboard />}

        {/* Reports Tab */}
        {activeTab === 'reports' && <ReportsDashboard />}

        {/* Security Tab */}
        {activeTab === 'security' && <SecurityDashboard />}

        {/* Phase 8 Tabs */}
        {activeTab === 'notifications' && <NotificationsDashboard />}
        {activeTab === 'backup' && <BackupDashboard />}
        {activeTab === 'ai' && <AIEngineDashboard />}
        {activeTab === 'audit' && <AuditDashboard />}
        {activeTab === 'i18n' && <MultilingualDashboard />}
        {activeTab === 'payments' && <PaymentDashboard />}

        {/* Phase 9 Tabs */}
        {activeTab === 'tasks' && <TaskProjectDashboard />}
        {activeTab === 'files' && <FileStorageDashboard />}
        {activeTab === 'chat' && <ChatDashboard />}
        {activeTab === 'scheduler' && <ReportSchedulerDashboard />}
        {activeTab === 'config' && <SystemConfigDashboard />}
        {activeTab === 'migration' && <DataMigrationDashboard />}
      </main>

      <footer className="App-footer">
        <p>© 2026 ALAWAEL ERP - نظام الأوائل المتكامل</p>
      </footer>
    </div>
  );
}

export default App;
