import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EmployeePoliciesAcknowledgement.css';

const API_BASE = 'http://localhost:5000/api';

const EmployeePoliciesAcknowledgement = () => {
  const [pendingPolicies, setPendingPolicies] = useState([]);
  const [acknowledgedPolicies, setAcknowledgedPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPolicies, setSelectedPolicies] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    acknowledged: 0,
    overdue: 0
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/policies`);
      const allPolicies = response.data.data || response.data;

      // Separate pending and acknowledged
      const pending = allPolicies.filter(p => p.status === 'ACTIVE' || p.status === 'APPROVED');
      const acknowledged = allPolicies.filter(p => p.acknowledgedCount > 0);

      setPendingPolicies(pending);
      setAcknowledgedPolicies(acknowledged);

      // Calculate stats
      setStats({
        total: allPolicies.length,
        pending: pending.length,
        acknowledged: acknowledged.length,
        overdue: pending.filter(p => new Date(p.dueDate) < new Date()).length
      });
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPolicy = (policyId) => {
    setSelectedPolicies(prev =>
      prev.includes(policyId)
        ? prev.filter(id => id !== policyId)
        : [...prev, policyId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPolicies.length === pendingPolicies.length) {
      setSelectedPolicies([]);
    } else {
      setSelectedPolicies(pendingPolicies.map(p => p.policyId));
    }
  };

  const handleBatchAcknowledge = async () => {
    if (selectedPolicies.length === 0) {
      alert('يرجى اختيار سياسة واحدة على الأقل');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_BASE}/policies/acknowledge/batch`, {
        policyIds: selectedPolicies,
        acknowledgedBy: 'EMPLOYEE_ID', // Should come from auth
        ipAddress: getClientIP()
      });

      alert('تم الاعتراف بالسياسات بنجاح');
      setSelectedPolicies([]);
      fetchPolicies();
    } catch (error) {
      console.error('Error acknowledging policies:', error);
      alert('خطأ في الاعتراف بالسياسات');
    } finally {
      setLoading(false);
    }
  };

  const getClientIP = () => {
    // This would normally come from the server
    return 'CLIENT_IP';
  };

  const getDaysUntilDue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    return diffTime;
  };

  const isOverdue = (dueDate) => {
    return getDaysUntilDue(dueDate) < 0;
  };

  return (
    <div className="employee-policies">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <h1>اعترافي بالسياسات</h1>
          <p>قم بمراجعة والاعتراف بالسياسات المعمول بها</p>
        </div>

        {/* Statistics */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">إجمالي السياسات</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">سياسات معلقة</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.acknowledged}</div>
            <div className="stat-label">سياسات مُعترف بها</div>
          </div>
          <div className="stat-card alert">
            <div className="stat-number">{stats.overdue}</div>
            <div className="stat-label">سياسات متأخرة</div>
          </div>
        </div>

        {/* Pending Policies */}
        <div className="section">
          <div className="section-header">
            <h2>السياسات المعلقة ({pendingPolicies.length})</h2>
            {selectedPolicies.length > 0 && (
              <button className="btn btn-success" onClick={handleBatchAcknowledge}>
                ✓ الاعتراف ({selectedPolicies.length})
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading">جاري التحميل...</div>
          ) : pendingPolicies.length > 0 ? (
            <div className="policies-list">
              {pendingPolicies.map(policy => {
                const daysLeft = getDaysUntilDue(policy.dueDate);
                const overdue = isOverdue(policy.dueDate);

                return (
                  <div key={policy.policyId} className="policy-card">
                    <div className="policy-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedPolicies.includes(policy.policyId)}
                        onChange={() => handleSelectPolicy(policy.policyId)}
                      />
                    </div>

                    <div className="policy-content">
                      <div className="policy-title">
                        <h3>{policy.policyName}</h3>
                        <span className={`due-badge ${overdue ? 'overdue' : daysLeft <= 3 ? 'warning' : ''}`}>
                          {overdue ? `متأخر بـ ${Math.abs(daysLeft)} يوم` : `${daysLeft} أيام متبقية`}
                        </span>
                      </div>
                      <p className="policy-description">{policy.description}</p>

                      <div className="policy-meta">
                        <span className="meta-item">
                          <strong>النوع:</strong> {policy.policyType}
                        </span>
                        <span className="meta-item">
                          <strong>الموعد النهائي:</strong> {new Date(policy.dueDate).toLocaleDateString('ar')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {selectedPolicies.length > 0 && (
                <div className="action-bar">
                  <button className="btn btn-secondary" onClick={() => setSelectedPolicies([])}>
                    إلغاء التحديد
                  </button>
                  <button className="btn btn-success" onClick={handleBatchAcknowledge}>
                    ✓ الاعتراف بالسياسات المختارة ({selectedPolicies.length})
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="no-data">
              <p>🎉 لا توجد سياسات معلقة - تم الاعتراف بجميع السياسات</p>
            </div>
          )}
        </div>

        {/* Acknowledged Policies */}
        <div className="section">
          <h2>السياسات المُعترف بها ({acknowledgedPolicies.length})</h2>

          {acknowledgedPolicies.length > 0 ? (
            <div className="policies-list compact">
              {acknowledgedPolicies.map(policy => (
                <div key={policy.policyId} className="policy-card acknowledged">
                  <div className="check-icon">✓</div>
                  <div className="policy-content">
                    <h3>{policy.policyName}</h3>
                    <p>{policy.description}</p>
                  </div>
                  <div className="acknowledgement-date">
                    تم الاعتراف في: {new Date(policy.updatedAt).toLocaleDateString('ar')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              لم يتم الاعتراف بأي سياسات بعد
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeePoliciesAcknowledgement;
