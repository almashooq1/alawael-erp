/**
 * ReportingDashboard Component
 * لوحة تحكم الإبلاغ والتقارير
 *
 * Advanced Reporting Interface with:
 * - Report templates
 * - Report generation
 * - Report scheduling
 * - Export options
 * - Report history
 */

import React, { useState, useEffect, useCallback } from 'react';
import './ReportingDashboard.css';

const ReportingDashboard = () => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [reportHistory, setReportHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    format: 'html',
  });
  const [scheduleForm, setScheduleForm] = useState({
    templateId: '',
    frequency: 'monthly',
    time: '09:00',
    recipients: '',
    format: 'pdf',
  });
  const [filters, setFilters] = useState({
    department: '',
    dateRange: { start: '', end: '' },
  });

  // ============================================
  // FETCH TEMPLATES
  // ============================================
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // GENERATE REPORT
  // ============================================
  const generateReport = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          filters,
          options: {
            includeCharts: true,
            includeStats: true,
          },
        }),
      });

      const data = await response.json();
      setGeneratedReports([data.report, ...generatedReports]);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // CREATE NEW TEMPLATE
  // ============================================
  const createTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });

      const data = await response.json();
      setTemplates([data.template, ...templates]);
      setNewTemplate({ name: '', description: '', format: 'html' });
      setShowTemplateForm(false);
    } catch (error) {
      console.error('Error creating template:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SCHEDULE REPORT
  // ============================================
  const scheduleReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scheduleForm,
          recipients: scheduleForm.recipients.split(',').map(r => r.trim()),
        }),
      });

      const data = await response.json();
      setSchedules([data.schedule, ...schedules]);
      setScheduleForm({
        templateId: '',
        frequency: 'monthly',
        time: '09:00',
        recipients: '',
        format: 'pdf',
      });
      setShowScheduleForm(false);
    } catch (error) {
      console.error('Error scheduling report:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // EXPORT REPORT
  // ============================================
  const exportReport = async (reportId, format) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/export`, {
        method: 'GET',
        headers: { 'Content-Type': `application/${format}` },
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.${format}`;
      a.click();
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  // ============================================
  // DELETE SCHEDULE
  // ============================================
  const deleteSchedule = async scheduleId => {
    try {
      await fetch(`/api/reports/schedule/${scheduleId}`, {
        method: 'DELETE',
      });
      setSchedules(schedules.filter(s => s.id !== scheduleId));
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  // ============================================
  // LOAD HISTORY
  // ============================================
  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/reports/history');
      const data = await response.json();
      setReportHistory(data.history || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    loadTemplates();
    loadHistory();
  }, [loadTemplates, loadHistory]);

  // ============================================
  // RENDER TEMPLATES TAB
  // ============================================
  const renderTemplatesTab = () => (
    <div className="tab-content">
      <div className="section-header">
        <h2>قوالب التقارير / Report Templates</h2>
        <button className="btn-primary" onClick={() => setShowTemplateForm(!showTemplateForm)}>
          ➕ إنشاء قالب جديد
        </button>
      </div>

      {showTemplateForm && (
        <div className="form-card">
          <h3>إنشاء قالب جديد / Create New Template</h3>
          <div className="form-group">
            <label>اسم القالب / Template Name</label>
            <input
              type="text"
              value={newTemplate.name}
              onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
              placeholder="e.g., Monthly Sales Report"
            />
          </div>

          <div className="form-group">
            <label>الوصف / Description</label>
            <textarea
              value={newTemplate.description}
              onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
              placeholder="Describe the report..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>الصيغة / Format</label>
            <select
              value={newTemplate.format}
              onChange={e => setNewTemplate({ ...newTemplate, format: e.target.value })}
            >
              <option value="html">HTML</option>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
            </select>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={createTemplate}>
              ✓ إنشاء
            </button>
            <button className="btn-secondary" onClick={() => setShowTemplateForm(false)}>
              ✕ إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="templates-grid">
        {templates.length > 0 ? (
          templates.map(template => (
            <div
              key={template.id}
              className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="template-icon">📋</div>
              <h3>{template.name}</h3>
              <p className="template-description">{template.description}</p>
              <div className="template-format">{template.format.toUpperCase()}</div>
            </div>
          ))
        ) : (
          <p className="empty-state">لا توجد قوالب / No templates available</p>
        )}
      </div>
    </div>
  );

  // ============================================
  // RENDER GENERATE TAB
  // ============================================
  const renderGenerateTab = () => (
    <div className="tab-content">
      <div className="section-header">
        <h2>إنشاء تقرير / Generate Report</h2>
      </div>

      {selectedTemplate ? (
        <div className="generate-form">
          <div className="selected-template">
            <div className="template-info">
              <h3>{selectedTemplate.name}</h3>
              <p>{selectedTemplate.description}</p>
            </div>
          </div>

          <div className="filters-card">
            <h3>الفلاتر / Filters</h3>

            <div className="form-group">
              <label>القسم / Department</label>
              <select
                value={filters.department}
                onChange={e => setFilters({ ...filters, department: e.target.value })}
              >
                <option value="">اختر قسم / Select Department</option>
                <option value="Engineering">الهندسة</option>
                <option value="Marketing">التسويق</option>
                <option value="Sales">المبيعات</option>
                <option value="HR">الموارد البشرية</option>
              </select>
            </div>

            <div className="form-group">
              <label>نطاق التاريخ / Date Range</label>
              <div className="date-range">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={e =>
                    setFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, start: e.target.value },
                    })
                  }
                  placeholder="Start date"
                />
                <span>إلى / To</span>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={e =>
                    setFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, end: e.target.value },
                    })
                  }
                  placeholder="End date"
                />
              </div>
            </div>

            <button className="btn-primary" onClick={generateReport} disabled={loading}>
              {loading ? '⏳ جاري...' : '📊 إنشاء التقرير'}
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>يرجى تحديد قالب أولاً</p>
          <p>Please select a template first</p>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER SCHEDULE TAB
  // ============================================
  const renderScheduleTab = () => (
    <div className="tab-content">
      <div className="section-header">
        <h2>جدولة التقارير / Schedule Reports</h2>
        <button className="btn-primary" onClick={() => setShowScheduleForm(!showScheduleForm)}>
          ➕ جدولة جديدة
        </button>
      </div>

      {showScheduleForm && (
        <div className="form-card">
          <h3>إنشاء جدولة جديدة / Create New Schedule</h3>

          <div className="form-group">
            <label>القالب / Template</label>
            <select
              value={scheduleForm.templateId}
              onChange={e => setScheduleForm({ ...scheduleForm, templateId: e.target.value })}
            >
              <option value="">اختر قالب / Select Template</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>التكرار / Frequency</label>
            <select
              value={scheduleForm.frequency}
              onChange={e => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
            >
              <option value="daily">يومي</option>
              <option value="weekly">أسبوعي</option>
              <option value="monthly">شهري</option>
              <option value="quarterly">ربع سنوي</option>
              <option value="yearly">سنوي</option>
            </select>
          </div>

          <div className="form-group">
            <label>الوقت / Time</label>
            <input
              type="time"
              value={scheduleForm.time}
              onChange={e => setScheduleForm({ ...scheduleForm, time: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>المستقبلون / Recipients (comma separated)</label>
            <textarea
              value={scheduleForm.recipients}
              onChange={e => setScheduleForm({ ...scheduleForm, recipients: e.target.value })}
              placeholder="user1@example.com, user2@example.com"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>الصيغة / Format</label>
            <select
              value={scheduleForm.format}
              onChange={e => setScheduleForm({ ...scheduleForm, format: e.target.value })}
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
              <option value="html">HTML</option>
            </select>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={scheduleReport}>
              ✓ جدولة
            </button>
            <button className="btn-secondary" onClick={() => setShowScheduleForm(false)}>
              ✕ إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="schedules-list">
        {schedules.length > 0 ? (
          schedules.map(schedule => (
            <div key={schedule.id} className="schedule-card">
              <div className="schedule-info">
                <h3>{schedule.templateName || 'Template'}</h3>
                <p>التكرار: {schedule.frequency}</p>
                <p>الوقت: {schedule.time}</p>
                <p>الحالة: {schedule.status || 'نشط'}</p>
              </div>
              <div className="schedule-actions">
                <button className="btn-small" onClick={() => deleteSchedule(schedule.id)}>
                  🗑️ حذف
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">لا توجد جدولات / No schedules</p>
        )}
      </div>
    </div>
  );

  // ============================================
  // RENDER REPORTS TAB
  // ============================================
  const renderReportsTab = () => (
    <div className="tab-content">
      <h2>التقارير المُنشأة / Generated Reports</h2>

      <div className="reports-list">
        {generatedReports.length > 0 ? (
          generatedReports.map(report => (
            <div key={report.id} className="report-card">
              <div className="report-header">
                <h3>{report.templateName || 'Report'}</h3>
                <span className="report-date">
                  {new Date(report.generatedAt).toLocaleDateString('ar-EG')}
                </span>
              </div>

              <div className="report-content-preview">
                <p>{report.summary || report.content?.substring(0, 100)}...</p>
              </div>

              <div className="report-actions">
                <button className="btn-small" onClick={() => exportReport(report.id, 'pdf')}>
                  📄 PDF
                </button>
                <button className="btn-small" onClick={() => exportReport(report.id, 'excel')}>
                  📊 Excel
                </button>
                <button className="btn-small" onClick={() => exportReport(report.id, 'csv')}>
                  📋 CSV
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">لم يتم إنشاء تقارير بعد / No reports generated yet</p>
        )}
      </div>
    </div>
  );

  // ============================================
  // RENDER HISTORY TAB
  // ============================================
  const renderHistoryTab = () => (
    <div className="tab-content">
      <h2>سجل التقارير / Report History</h2>

      <div className="history-list">
        {reportHistory.length > 0 ? (
          reportHistory.map(item => (
            <div key={item.id} className="history-item">
              <div className="history-info">
                <h4>{item.templateName || 'Report'}</h4>
                <p>
                  {new Date(item.createdAt).toLocaleDateString('ar-EG')} -
                  {new Date(item.createdAt).toLocaleTimeString('ar-EG')}
                </p>
              </div>
              <div className="history-status">{item.status || 'تم'}</div>
            </div>
          ))
        ) : (
          <p className="empty-state">لا يوجد سجل / No history</p>
        )}
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="reporting-dashboard">
      <div className="dashboard-header">
        <h1>📊 لوحة التقارير المتقدمة</h1>
        <p className="subtitle">Advanced Reporting Dashboard</p>
      </div>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          📋 القوالب
        </button>
        <button
          className={`tab-button ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          📊 إنشاء
        </button>
        <button
          className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          ⏰ جدولة
        </button>
        <button
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📄 التقارير
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📚 السجل
        </button>
      </div>

      {activeTab === 'templates' && renderTemplatesTab()}
      {activeTab === 'generate' && renderGenerateTab()}
      {activeTab === 'schedule' && renderScheduleTab()}
      {activeTab === 'reports' && renderReportsTab()}
      {activeTab === 'history' && renderHistoryTab()}
    </div>
  );
};

export default ReportingDashboard;
