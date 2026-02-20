/**
 * Traffic Accident Report Component - مكون تقارير الحوادث المرورية
 * مكون React شامل لإدارة وعرض تقارير الحوادث المرورية
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TrafficAccidentReports.css';

const TrafficAccidentReports = () => {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  const [activeTab, setActiveTab] = useState('list');
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [currentReport, setCurrentReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [insights, setInsights] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    accidentInfo: {
      accidentDateTime: '',
      location: {
        address: '',
        city: '',
        region: '',
        roadsideDescription: ''
      },
      weather: 'clear',
      visibility: 'good',
      lightingConditions: 'daylight',
      roadConditions: 'dry',
      roadType: 'main_road',
      speedLimit: 0,
      description: ''
    },
    vehicles: [],
    severity: 'moderate',
    priority: 'medium'
  });

  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    city: '',
    priority: '',
    startDate: '',
    endDate: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ========================================
  // API CALLS
  // ========================================

  // Fetch all reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNumber,
        limit: itemsPerPage,
        ...(filters.status && { status: filters.status }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.city && { city: filters.city }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const response = await axios.get(
        `/api/traffic-accidents?${params}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      setReports(response.data.reports);
      setFilteredReports(response.data.reports);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في جلب التقارير');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.city && { city: filters.city })
      });

      const response = await axios.get(
        `/api/traffic-accidents/statistics?${params}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      setStatistics(response.data.data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  // Fetch key insights
  const fetchInsights = async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.city && { city: filters.city })
      });

      const response = await axios.get(
        `/api/traffic-accidents/analytics/key-insights?${params}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      setInsights(response.data.data);
    } catch (err) {
      console.error('Error fetching insights:', err);
    }
  };

  // Search reports
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      fetchReports();
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `/api/traffic-accidents/search?q=${searchTerm}&page=${pageNumber}&limit=${itemsPerPage}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      setReports(response.data.reports);
      setFilteredReports(response.data.reports);
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في البحث');
    } finally {
      setLoading(false);
    }
  };

  // Create new report
  const handleCreateReport = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post(
        '/api/traffic-accidents',
        { accidentData: formData },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      setReports([response.data.data, ...reports]);
      setActiveTab('list');
      setFormData({
        accidentInfo: {
          accidentDateTime: '',
          location: {
            address: '',
            city: '',
            region: '',
            roadsideDescription: ''
          },
          weather: 'clear',
          visibility: 'good',
          lightingConditions: 'daylight',
          roadConditions: 'dry',
          roadType: 'main_road',
          speedLimit: 0,
          description: ''
        },
        vehicles: [],
        severity: 'moderate',
        priority: 'medium'
      });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في إنشاء التقرير');
    } finally {
      setLoading(false);
    }
  };

  // Get report details
  const fetchReportDetails = async (reportId) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/traffic-accidents/${reportId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      setCurrentReport(response.data.data);
      setActiveTab('details');
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  // Update report status
  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      const response = await axios.patch(
        `/api/traffic-accidents/${reportId}/status`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      setCurrentReport(response.data.data);
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في تحديث الحالة');
    }
  };

  // Add comment
  const handleAddComment = async (reportId, comment) => {
    try {
      const response = await axios.post(
        `/api/traffic-accidents/${reportId}/comments`,
        { comment },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      setCurrentReport(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في إضافة التعليق');
    }
  };

  // Export PDF
  const handleExportPDF = (reportId) => {
    window.location.href = `/api/traffic-accidents/${reportId}/export/pdf`;
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.city && { city: filters.city }),
        ...(filters.severity && { severity: filters.severity })
      });

      window.location.href = `/api/traffic-accidents/export/excel?${params}`;
    } catch (err) {
      setError('خطأ في تصدير البيانات');
    }
  };

  // ========================================
  // EFFECTS
  // ========================================
  useEffect(() => {
    fetchReports();
    fetchStatistics();
    fetchInsights();
  }, [filters, pageNumber, itemsPerPage]);

  // ========================================
  // RENDER METHODS
  // ========================================

  const renderHeader = () => (
    <div className="accident-header">
      <h1>تقارير الحوادث المرورية</h1>
      <p>نظام شامل لإدارة وتتبع الحوادث المرورية</p>
    </div>
  );

  const renderStatistics = () => (
    <div className="statistics-container">
      {statistics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{statistics.summary?.totalReports || 0}</div>
            <div className="stat-label">إجمالي التقارير</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{statistics.summary?.totalInjured || 0}</div>
            <div className="stat-label">الجرحى</div>
          </div>
          <div className="stat-card critical">
            <div className="stat-value">{statistics.summary?.totalDeaths || 0}</div>
            <div className="stat-label">الوفيات</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {(statistics.summary?.totalFinancialLoss || 0).toLocaleString('ar-SA')} SAR
            </div>
            <div className="stat-label">الخسائر المالية</div>
          </div>
        </div>
      )}
    </div>
  );

  const renderKeyInsights = () => (
    <div className="insights-container">
      <h3>الرؤى الرئيسية</h3>
      <div className="insights-grid">
        {insights.map((insight, index) => (
          <div key={index} className={`insight-card ${insight.alert ? 'alert' : ''}`}>
            <div className="insight-title">{insight.title}</div>
            <div className="insight-value">{insight.value}</div>
            {insight.percentage && <div className="insight-percentage">{insight.percentage}%</div>}
            <div className="insight-description">{insight.description}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="filters-container">
      <h3>التصفية والبحث</h3>
      <div className="filters-grid">
        <div className="filter-group">
          <label>الحالة</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, })}
          >
            <option value="">الكل</option>
            <option value="draft">مسودة</option>
            <option value="submitted">مرسلة</option>
            <option value="under_investigation">تحت التحقيق</option>
            <option value="approved">موافق عليها</option>
            <option value="closed">مغلقة</option>
          </select>
        </div>

        <div className="filter-group">
          <label>الشدة</label>
          <select
            value={filters.severity}
            onChange={(e) =>
              setFilters({ ...filters, severity: e.target.value })
            }
          >
            <option value="">الكل</option>
            <option value="minor">بسيطة</option>
            <option value="moderate">متوسطة</option>
            <option value="severe">حادة</option>
            <option value="critical">حرجة</option>
            <option value="fatal">مميتة</option>
          </select>
        </div>

        <div className="filter-group">
          <label>المدينة</label>
          <input
            type="text"
            placeholder="أدخل اسم المدينة"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <label>من التاريخ</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
          />
        </div>

        <div className="filter-group">
          <label>إلى التاريخ</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <button
            className="btn btn-reset"
            onClick={() =>
              setFilters({
                status: '',
                severity: '',
                city: '',
                priority: '',
                startDate: '',
                endDate: ''
              })
            }
          >
            إعادة تعيين
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="ابحث عن رقم التقرير أو الموقع..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit" className="btn btn-search">
          بحث
        </button>
      </form>
    </div>
  );

  const renderReportsList = () => (
    <div className="reports-list">
      <div className="list-header">
        <h3>قائمة التقارير</h3>
        <div className="list-actions">
          <button
            className="btn btn-export"
            onClick={handleExportExcel}
          >
            تصدير Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">جاري التحميل...</div>
      ) : filteredReports.length === 0 ? (
        <div className="no-reports">لا توجد تقارير</div>
      ) : (
        <div className="table-responsive">
          <table className="reports-table">
            <thead>
              <tr>
                <th>رقم التقرير</th>
                <th>التاريخ</th>
                <th>الموقع</th>
                <th>الشدة</th>
                <th>الحالة</th>
                <th>الجرحى</th>
                <th>الوفيات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report._id}>
                  <td className="report-number">{report.reportNumber}</td>
                  <td>
                    {new Date(report.accidentInfo.accidentDateTime).toLocaleDateString('ar-SA')}
                  </td>
                  <td>{report.accidentInfo.location.city}</td>
                  <td>
                    <span className={`severity-badge ${report.severity}`}>
                      {report.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${report.status}`}>
                      {report.status}
                    </span>
                  </td>
                  <td>{report.totalInjured}</td>
                  <td className="deaths">{report.totalDeaths}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-view"
                      onClick={() => fetchReportDetails(report._id)}
                    >
                      عرض
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderCreateForm = () => (
    <div className="report-form">
      <h3>إنشاء تقرير حادثة جديد</h3>
      <form onSubmit={handleCreateReport}>
        <div className="form-section">
          <h4>معلومات الحادثة</h4>

          <div className="form-group">
            <label>تاريخ ووقت الحادثة</label>
            <input
              type="datetime-local"
              required
              value={formData.accidentInfo.accidentDateTime}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  accidentInfo: {
                    ...formData.accidentInfo,
                    accidentDateTime: e.target.value
                  }
                })
              }
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>العنوان</label>
              <input
                type="text"
                required
                value={formData.accidentInfo.location.address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    accidentInfo: {
                      ...formData.accidentInfo,
                      location: {
                        ...formData.accidentInfo.location,
                        address: e.target.value
                      }
                    }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>المدينة</label>
              <input
                type="text"
                required
                value={formData.accidentInfo.location.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    accidentInfo: {
                      ...formData.accidentInfo,
                      location: {
                        ...formData.accidentInfo.location,
                        city: e.target.value
                      }
                    }
                  })
                }
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>الطقس</label>
              <select
                value={formData.accidentInfo.weather}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    accidentInfo: {
                      ...formData.accidentInfo,
                      weather: e.target.value
                    }
                  })
                }
              >
                <option value="clear">صافي</option>
                <option value="rainy">ممطر</option>
                <option value="foggy">ضباب</option>
                <option value="snowy">ثلجي</option>
              </select>
            </div>

            <div className="form-group">
              <label>حالة الطريق</label>
              <select
                value={formData.accidentInfo.roadConditions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    accidentInfo: {
                      ...formData.accidentInfo,
                      roadConditions: e.target.value
                    }
                  })
                }
              >
                <option value="dry">جاف</option>
                <option value="wet">رطب</option>
                <option value="slippery">زلق</option>
                <option value="icy">جليدي</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>وصف الحادثة</label>
            <textarea
              required
              rows="4"
              value={formData.accidentInfo.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  accidentInfo: {
                    ...formData.accidentInfo,
                    description: e.target.value
                  }
                })
              }
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>الشدة</label>
              <select
                value={formData.severity}
                onChange={(e) =>
                  setFormData({ ...formData, severity: e.target.value })
                }
              >
                <option value="minor">بسيطة</option>
                <option value="moderate">متوسطة</option>
                <option value="severe">حادة</option>
                <option value="critical">حرجة</option>
                <option value="fatal">مميتة</option>
              </select>
            </div>

            <div className="form-group">
              <label>الأولوية</label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
              >
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
                <option value="critical">حرجة</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            إنشاء التقرير
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveTab('list')}
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );

  const renderReportDetails = () => (
    currentReport && (
      <div className="report-details">
        <div className="details-header">
          <h3>تفاصيل التقرير</h3>
          <div className="details-actions">
            <button
              className="btn btn-export"
              onClick={() => handleExportPDF(currentReport._id)}
            >
              تصدير PDF
            </button>
          </div>
        </div>

        <div className="details-section">
          <h4>معلومات الحادثة</h4>
          <div className="details-grid">
            <div className="detail-item">
              <label>رقم التقرير</label>
              <span>{currentReport.reportNumber}</span>
            </div>
            <div className="detail-item">
              <label>التاريخ والوقت</label>
              <span>
                {new Date(currentReport.accidentInfo.accidentDateTime).toLocaleString('ar-SA')}
              </span>
            </div>
            <div className="detail-item">
              <label>الموقع</label>
              <span>{currentReport.accidentInfo.location.city}</span>
            </div>
            <div className="detail-item">
              <label>الشدة</label>
              <span className={`severity-badge ${currentReport.severity}`}>
                {currentReport.severity}
              </span>
            </div>
            <div className="detail-item">
              <label>الحالة</label>
              <span className={`status-badge ${currentReport.status}`}>
                {currentReport.status}
              </span>
            </div>
            <div className="detail-item">
              <label>الأولوية</label>
              <span>{currentReport.priority}</span>
            </div>
          </div>
        </div>

        <div className="details-section">
          <h4>الملخص المالي</h4>
          <div className="financial-summary">
            <div className="financial-item">
              <label>إجمالي الخسائر:</label>
              <span className="amount">
                {currentReport.financialImpact.totalLoss.toLocaleString('ar-SA')} SAR
              </span>
            </div>
            <div className="financial-item">
              <label>تكاليف الإصلاح:</label>
              <span className="amount">
                {currentReport.financialImpact.repairCosts.toLocaleString('ar-SA')} SAR
              </span>
            </div>
            <div className="financial-item">
              <label>التكاليف الطبية:</label>
              <span className="amount">
                {currentReport.financialImpact.medicalCosts.toLocaleString('ar-SA')} SAR
              </span>
            </div>
          </div>
        </div>

        <div className="details-section">
          <h4>الإجراءات</h4>
          <div className="action-buttons">
            {currentReport.status !== 'closed' && (
              <>
                <button
                  className="btn btn-approve"
                  onClick={() => handleUpdateStatus(currentReport._id, 'approved')}
                >
                  الموافقة
                </button>
                <button
                  className="btn btn-close"
                  onClick={() => handleUpdateStatus(currentReport._id, 'closed')}
                >
                  إغلاق
                </button>
              </>
            )}
            <button
              className="btn btn-back"
              onClick={() => setActiveTab('list')}
            >
              العودة
            </button>
          </div>
        </div>
      </div>
    )
  );

  // ========================================
  // MAIN RENDER
  // ========================================
  return (
    <div className="traffic-accident-container">
      {renderHeader()}
      {renderStatistics()}
      {renderKeyInsights()}

      <div className="content-container">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            قائمة التقارير
          </button>
          <button
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            تقرير جديد
          </button>
          <button
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            التفاصيل
          </button>
        </div>

        {activeTab === 'list' && (
          <>
            {renderFilters()}
            {renderReportsList()}
          </>
        )}
        {activeTab === 'create' && renderCreateForm()}
        {activeTab === 'details' && renderReportDetails()}
      </div>
    </div>
  );
};

export default TrafficAccidentReports;
