// supply-chain-management/frontend/src/components/IncidentManagement.jsx
// لوحة تحكم إدارة الحوادث
// Incident Management Dashboard

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './IncidentManagement.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const IncidentManagement = () => {
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'SECURITY_BREACH',
    severity: 'MEDIUM',
    priority: 'P3',
  });

  // جلب الحوادث
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/incidents`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
      });
      setIncidents(response.data.data);
      console.log('✅ Incidents loaded:', response.data.data.length);
    } catch (error) {
      console.error('❌ Error fetching incidents:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // تطبيق الفلاتر
  const applyFilters = () => {
    let filtered = incidents;

    if (searchTerm) {
      filtered = filtered.filter(
        inc =>
          inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inc.incidentNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(inc => inc.status === filterStatus);
    }

    if (filterSeverity) {
      filtered = filtered.filter(inc => inc.severity === filterSeverity);
    }

    if (filterCategory) {
      filtered = filtered.filter(inc => inc.category === filterCategory);
    }

    setFilteredIncidents(filtered);
  };

  // تحديث الفلاتر عند التغيير
  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterStatus, filterSeverity, filterCategory, incidents]);

  // جلب البيانات عند التحميل
  useEffect(() => {
    fetchIncidents();
  }, []);

  // التعامل مع التغييرات في النموذج
  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // حفظ الحادثة
  const handleSaveIncident = async () => {
    try {
      if (editingId) {
        // تحديث
        const response = await axios.put(
          `${API_BASE}/incidents/${editingId}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem('token')}`,
            },
          }
        );
        console.log('✅ Incident updated:', response.data);
      } else {
        // إنشاء جديد
        const response = await axios.post(`${API_BASE}/incidents`, formData, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`,
          },
        });
        console.log('✅ Incident created:', response.data);
      }

      // إعادة جلب البيانات
      await fetchIncidents();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('❌ Error saving incident:', error.message);
    }
  };

  // حذف الحادثة
  const handleDeleteIncident = async id => {
    if (!window.confirm('هل تريد حقاً حذف هذه الحادثة؟')) return;

    try {
      await axios.delete(`${API_BASE}/incidents/${id}`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
      });
      console.log('✅ Incident deleted');
      await fetchIncidents();
    } catch (error) {
      console.error('❌ Error deleting incident:', error.message);
    }
  };

  // تحرير الحادثة
  const handleEditIncident = incident => {
    setFormData({
      title: incident.title,
      description: incident.description,
      category: incident.category,
      severity: incident.severity,
      priority: incident.priority,
    });
    setEditingId(incident._id);
    setShowModal(true);
  };

  // إعادة تعيين النموذج
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'SECURITY_BREACH',
      severity: 'MEDIUM',
      priority: 'P3',
    });
    setEditingId(null);
  };

  // إغلاق النموذج
  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  // الحصول على اللون حسب الخطورة
  const getSeverityColor = severity => {
    const colors = {
      CRITICAL: '#dc3545',
      HIGH: '#fd7e14',
      MEDIUM: '#ffc107',
      LOW: '#28a745',
    };
    return colors[severity] || '#6c757d';
  };

  // الحصول على اللون حسب الحالة
  const getStatusColor = status => {
    const colors = {
      REPORTED: '#17a2b8',
      ACKNOWLEDGED: '#0066cc',
      INVESTIGATING: '#6610f2',
      IDENTIFIED: '#e83e8c',
      IN_RESOLUTION: '#fd7e14',
      RESOLVED: '#28a745',
      CLOSED: '#6c757d',
      REOPENED: '#dc3545',
    };
    return colors[status] || '#6c757d';
  };

  const categoryOptions = [
    'SECURITY_BREACH',
    'SYSTEM_OUTAGE',
    'NETWORK_ISSUE',
    'DATABASE_FAILURE',
    'APPLICATION_ERROR',
    'HARDWARE_FAILURE',
    'PERFORMANCE_ISSUE',
    'DATA_LOSS',
    'COMPLIANCE_ISSUE',
    'COMMUNICATION_ISSUE',
    'HUMAN_ERROR',
    'THIRD_PARTY_ISSUE',
    'ENVIRONMENTAL',
    'OTHER',
  ];

  const statusOptions = [
    'REPORTED',
    'ACKNOWLEDGED',
    'INVESTIGATING',
    'IDENTIFIED',
    'IN_RESOLUTION',
    'RESOLVED',
    'CLOSED',
    'REOPENED',
  ];

  return (
    <div className="incident-management">
      <div className="incident-header">
        <h1>📋 إدارة الحوادث | Incident Management</h1>
        <button
          className="btn-add"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          ➕ إضافة حادثة جديدة
        </button>
      </div>

      {/* شريط البحث والفلاتر */}
      <div className="incident-filters">
        <input
          type="text"
          placeholder="🔍 بحث عن حادثة..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="">جميع الحالات</option>
          {statusOptions.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
          className="filter-select"
        >
          <option value="">جميع مستويات الخطورة</option>
          <option value="CRITICAL">🔴 حرجة</option>
          <option value="HIGH">🟠 عالية</option>
          <option value="MEDIUM">🟡 متوسطة</option>
          <option value="LOW">🟢 منخفضة</option>
        </select>

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="filter-select"
        >
          <option value="">جميع الأنواع</option>
          {categoryOptions.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* جدول الحوادث */}
      {loading ? (
        <div className="loading">جاري التحميل...</div>
      ) : (
        <div className="incidents-table-container">
          <table className="incidents-table">
            <thead>
              <tr>
                <th>رقم الحادثة</th>
                <th>العنوان</th>
                <th>النوع</th>
                <th>الخطورة</th>
                <th>الحالة</th>
                <th>الأولوية</th>
                <th>التاريخ</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length > 0 ? (
                filteredIncidents.map(incident => (
                  <tr key={incident._id}>
                    <td className="incident-number">
                      <strong>{incident.incidentNumber || 'N/A'}</strong>
                    </td>
                    <td className="incident-title">{incident.title}</td>
                    <td className="incident-category">{incident.category}</td>
                    <td>
                      <span
                        className="badge"
                        style={{ backgroundColor: getSeverityColor(incident.severity) }}
                      >
                        {incident.severity}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{ backgroundColor: getStatusColor(incident.status) }}
                      >
                        {incident.status}
                      </span>
                    </td>
                    <td>{incident.priority}</td>
                    <td className="incident-date">
                      {new Date(incident.discoveryInfo?.discoveredAt).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="actions">
                      <button
                        className="btn-sm btn-edit"
                        onClick={() => handleEditIncident(incident)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-sm btn-delete"
                        onClick={() => handleDeleteIncident(incident._id)}
                      >
                        🗑️
                      </button>
                      <button
                        className="btn-sm btn-view"
                        onClick={() => console.log('View details:', incident)}
                      >
                        👁️
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">
                    ❌ لا توجد حوادث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* نموذج إضافة/تحرير الحادثة */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? '✏️ تحرير الحادثة' : '➕ حادثة جديدة'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>* العنوان</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="أدخل عنوان الحادثة"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>* الوصف</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="أدخل تفاصيل الحادثة"
                  rows="4"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>* النوع</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="form-input"
                  >
                    {categoryOptions.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>* مستوى الخطورة</label>
                  <select
                    name="severity"
                    value={formData.severity}
                    onChange={handleInputChange}
                    className="form-input"
                  >
                    <option value="CRITICAL">🔴 حرجة</option>
                    <option value="HIGH">🟠 عالية</option>
                    <option value="MEDIUM">🟡 متوسطة</option>
                    <option value="LOW">🟢 منخفضة</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>الأولوية</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="form-input"
                  >
                    <option value="P1">P1 - أعلى</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                    <option value="P4">P4</option>
                    <option value="P5">P5 - أقل</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseModal}>
                إلغاء
              </button>
              <button className="btn-save" onClick={handleSaveIncident}>
                💾 {editingId ? 'تحديث' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentManagement;
