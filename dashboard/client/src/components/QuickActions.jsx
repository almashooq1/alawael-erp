import React, { useState } from 'react';
import { runQualityCheck } from '../utils/api';
import './QuickActions.css';

function QuickActions({ services, selectedService, onRefresh }) {
  const [running, setRunning] = useState({});
  const [message, setMessage] = useState(null);

  const handleRunCheck = async (serviceName) => {
    try {
      setRunning({ ...running, [serviceName]: true });
      setMessage({ type: 'info', text: `⏳ جاري تشغيل اختبارات ${serviceName}...` });

      const result = await runQualityCheck(serviceName);

      setMessage({ type: 'success', text: `✅ بدأت اختبارات ${serviceName} - Job ID: ${result.jobId}` });

      // Wait a bit for the test to complete
      setTimeout(() => {
        onRefresh();
        setMessage(null);
      }, 5000);
    } catch (error) {
      setMessage({ type: 'error', text: `❌ فشل تشغيل ${serviceName}: ${'حدث خطأ، يرجى المحاولة لاحقاً'}` });
    } finally {
      setRunning({ ...running, [serviceName]: false });
    }
  };

  const handleRunAll = async () => {
    const testableServices = services.filter(s => s.hasTests);
    setMessage({ type: 'info', text: `⏳ جاري تشغيل جميع الاختبارات (${testableServices.length} خدمات)...` });

    let completed = 0;
    let failed = 0;

    for (const service of testableServices) {
      try {
        await runQualityCheck(service.name);
        completed++;
      } catch (error) {
        failed++;
      }
    }

    setMessage({
      type: failed === 0 ? 'success' : 'warning',
      text: `✅ اكتمل: ${completed} خدمات, فشل: ${failed} خدمات`
    });

    setTimeout(() => {
      onRefresh();
      setMessage(null);
    }, 5000);
  };

  const testableServices = services.filter(s => s.hasTests);

  return (
    <div className="quick-actions">
      {message && (
        <div className={`action-message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="actions-grid">
        <button
          className="action-btn action-refresh"
          onClick={onRefresh}
        >
          🔄 تحديث البيانات
        </button>

        <button
          className="action-btn action-run-all"
          onClick={handleRunAll}
          disabled={testableServices.length === 0}
        >
          ▶️ تشغيل جميع الاختبارات
        </button>

        {selectedService && selectedService.hasTests && (
          <button
            className="action-btn action-run-selected"
            onClick={() => handleRunCheck(selectedService.name)}
            disabled={running[selectedService.name]}
          >
            {running[selectedService.name] ? '⏳ جاري التشغيل...' : `▶️ تشغيل ${selectedService.name}`}
          </button>
        )}
      </div>

      <div className="service-actions">
        <h4>تشغيل سريع حسب الخدمة:</h4>
        <div className="service-buttons">
          {testableServices.map((service) => (
            <button
              key={service.name}
              className={`service-btn ${running[service.name] ? 'running' : ''}`}
              onClick={() => handleRunCheck(service.name)}
              disabled={running[service.name]}
            >
              {running[service.name] ? '⏳' : '▶️'} {service.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default QuickActions;
