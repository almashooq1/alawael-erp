import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PolicyManagement.css';

const API_BASE = 'http://localhost:5000/api';

const PolicyManagement = () => {
  const [policies, setPolicies] = useState([]);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [filter, setFilter] = useState({
    type: 'ALL',
    status: 'ALL',
    searchTerm: ''
  });

  const [formData, setFormData] = useState({
    policyName: '',
    policyNameAr: '',
    description: '',
    descriptionAr: '',
    policyType: 'SALARY_INCENTIVES',
    effectiveDate: '',
    dueDate: '',
    applicableDepartments: [],
    content: {
      ar: '',
      en: ''
    }
  });

  // Fetch policies
  useEffect(() => {
    fetchPolicies();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [policies, filter]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/policies`);
      setPolicies(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching policies:', error);
      alert('خطأ في جلب السياسات');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = policies;

    // Type filter
    if (filter.type !== 'ALL') {
      filtered = filtered.filter(p => p.policyType === filter.type);
    }

    // Status filter
    if (filter.status !== 'ALL') {
      filtered = filtered.filter(p => p.status === filter.status);
    }

    // Search filter
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.policyName.toLowerCase().includes(term) ||
        p.policyNameAr.includes(term)
      );
    }

    setFilteredPolicies(filtered);
  };

  const handleModalOpen = (policy = null) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData(policy);
    } else {
      setEditingPolicy(null);
      setFormData({
        policyName: '',
        policyNameAr: '',
        description: '',
        descriptionAr: '',
        policyType: 'SALARY_INCENTIVES',
        effectiveDate: '',
        dueDate: '',
        applicableDepartments: [],
        content: { ar: '', en: '' }
      });
    }
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingPolicy(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSavePolicy = async () => {
    try {
      if (editingPolicy) {
        await axios.put(`${API_BASE}/policies/${editingPolicy.policyId}`, formData);
        alert('تم تحديث السياسة بنجاح');
      } else {
        await axios.post(`${API_BASE}/policies`, formData);
        alert('تم إنشاء السياسة بنجاح');
      }
      handleModalClose();
      fetchPolicies();
    } catch (error) {
      console.error('Error saving policy:', error);
      alert('خطأ في حفظ السياسة');
    }
  };

  const handleDeletePolicy = async (policyId) => {
    if (window.confirm('هل أنت متأكد من حذف هذه السياسة؟')) {
      try {
        await axios.delete(`${API_BASE}/policies/${policyId}`);
        alert('تم حذف السياسة بنجاح');
        fetchPolicies();
      } catch (error) {
        console.error('Error deleting policy:', error);
        alert('خطأ في حذف السياسة');
      }
    }
  };

  const policyTypes = [
    'SALARY_INCENTIVES',
    'LEAVE_VACATION',
    'OVERTIME_COMPENSATION',
    'HEALTH_INSURANCE',
    'RETIREMENT_BENEFITS',
    'TRAINING_DEVELOPMENT',
    'CODE_OF_CONDUCT',
    'ATTENDANCE_DISCIPLINE'
  ];

  const policyStatuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'ARCHIVED'];

  return (
    <div className="policy-management">
      <div className="container">
        {/* Header */}
        <div className="header">
          <h1>إدارة السياسات</h1>
          <button className="btn btn-primary" onClick={() => handleModalOpen()}>
            + إضافة سياسة جديدة
          </button>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>البحث:</label>
            <input
              type="text"
              placeholder="ابحث عن سياسة..."
              value={filter.searchTerm}
              onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
              className="form-control"
            />
          </div>

          <div className="filter-group">
            <label>نوع السياسة:</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="form-control"
            >
              <option value="ALL">جميع الأنواع</option>
              {policyTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>الحالة:</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="form-control"
            >
              <option value="ALL">جميع الحالات</option>
              {policyStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Policies Table */}
        <div className="policies-table">
          {loading ? (
            <div className="loading">جاري التحميل...</div>
          ) : filteredPolicies.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>اسم السياسة</th>
                  <th>النوع</th>
                  <th>الحالة</th>
                  <th>تاريخ البدء</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map(policy => (
                  <tr key={policy.policyId}>
                    <td>{policy.policyName}</td>
                    <td>{policy.policyType}</td>
                    <td>
                      <span className={`status-badge status-${policy.status.toLowerCase()}`}>
                        {policy.status}
                      </span>
                    </td>
                    <td>{new Date(policy.effectiveDate).toLocaleDateString('ar')}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handleModalOpen(policy)}
                      >
                        تعديل
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeletePolicy(policy.policyId)}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data">لا توجد سياسات</div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editingPolicy ? 'تعديل السياسة' : 'إضافة سياسة جديدة'}</h2>
                <button className="close-btn" onClick={handleModalClose}>×</button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label>اسم السياسة (English):</label>
                  <input
                    type="text"
                    name="policyName"
                    value={formData.policyName}
                    onChange={handleFormChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>اسم السياسة (العربية):</label>
                  <input
                    type="text"
                    name="policyNameAr"
                    value={formData.policyNameAr}
                    onChange={handleFormChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>نوع السياسة:</label>
                  <select
                    name="policyType"
                    value={formData.policyType}
                    onChange={handleFormChange}
                    className="form-control"
                  >
                    {policyTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>تاريخ البدء:</label>
                  <input
                    type="date"
                    name="effectiveDate"
                    value={formData.effectiveDate}
                    onChange={handleFormChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>الموعد النهائي:</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleFormChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>الوصف (English):</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    className="form-control"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>الوصف (العربية):</label>
                  <textarea
                    name="descriptionAr"
                    value={formData.descriptionAr}
                    onChange={handleFormChange}
                    className="form-control"
                    rows="3"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={handleModalClose}>إلغاء</button>
                <button className="btn btn-primary" onClick={handleSavePolicy}>حفظ</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicyManagement;
