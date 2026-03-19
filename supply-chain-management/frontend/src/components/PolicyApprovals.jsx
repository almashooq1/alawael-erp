import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PolicyApprovals.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const PolicyApprovals = () => {
  const [policies, setPolicies] = useState([]);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedPolicy, setExpandedPolicy] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [comments, setComments] = useState('');
  const [approvalAction, setApprovalAction] = useState(''); // 'approve' or 'reject'

  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchPoliciesForApproval();
  }, []);

  useEffect(() => {
    filterPolicyData();
  }, [policies]);

  const fetchPoliciesForApproval = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/policies`);
      const allPolicies = response.data.data || response.data;

      // Filter policies that need approval
      const approvalPolicies = allPolicies.filter(
        p => p.status === 'PENDING_APPROVAL' || p.approvals?.some(a => a.status === 'PENDING')
      );

      setPolicies(approvalPolicies);

      // Calculate stats
      const pending = approvalPolicies.filter(p => p.status === 'PENDING_APPROVAL').length;
      const approved = approvalPolicies.filter(p => p.status === 'APPROVED').length;
      const rejected = approvalPolicies.filter(p =>
        p.approvals?.some(a => a.status === 'REJECTED')
      ).length;

      setStats({ pending, approved, rejected });
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPolicyData = () => {
    setFilteredPolicies(policies);
  };

  const handleApprovalClick = (policy, action) => {
    setSelectedPolicy(policy);
    setApprovalAction(action);
    setShowCommentModal(true);
  };

  const handleSubmitApproval = async () => {
    if (!selectedPolicy) return;

    try {
      setLoading(true);
      const endpoint =
        approvalAction === 'approve'
          ? `${API_BASE}/policies/${selectedPolicy.policyId}/approve`
          : `${API_BASE}/policies/${selectedPolicy.policyId}/reject`;

      await axios.post(endpoint, {
        approverRole: 'HR_DIRECTOR', // Should come from auth
        comments: comments.trim(),
      });

      alert(`تم ${approvalAction === 'approve' ? 'الموافقة' : 'الرفض'} على السياسة بنجاح`);
      setShowCommentModal(false);
      setComments('');
      fetchPoliciesForApproval();
    } catch (error) {
      console.error('Error submitting approval:', error);
      alert('خطأ في معالجة الموافقة');
    } finally {
      setLoading(false);
    }
  };

  const getApprovalStatus = approvals => {
    if (!approvals || approvals.length === 0) return 'pending';

    const allApproved = approvals.every(a => a.status === 'APPROVED');
    const anyRejected = approvals.some(a => a.status === 'REJECTED');

    if (anyRejected) return 'rejected';
    if (allApproved) return 'approved';
    return 'in-progress';
  };

  const getApprovalStatusLabel = approvals => {
    const status = getApprovalStatus(approvals);
    const labels = {
      pending: 'قيد الانتظار',
      'in-progress': 'قيد المراجعة',
      approved: 'موافق عليه',
      rejected: 'مرفوض',
    };
    return labels[status] || 'غير محدد';
  };

  const getApproversForRole = approvals => {
    const roleApprovers = {
      POLICY_MANAGER: [],
      HR_DIRECTOR: [],
      COMPLIANCE_OFFICER: [],
      CFO: [],
    };

    if (approvals) {
      approvals.forEach(app => {
        if (roleApprovers[app.approverRole]) {
          roleApprovers[app.approverRole].push(app);
        }
      });
    }

    return roleApprovers;
  };

  return (
    <div className="policy-approvals">
      <div className="container">
        {/* Header */}
        <div className="approvals-header">
          <h1>منصة موافقة السياسات</h1>
          <p>مراجعة والموافقة على السياسات المعلقة</p>
        </div>

        {/* Statistics */}
        <div className="approval-stats">
          <div className="stat-item pending">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">قيد الانتظار</div>
          </div>
          <div className="stat-item approved">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">موافق عليها</div>
          </div>
          <div className="stat-item rejected">
            <div className="stat-value">{stats.rejected}</div>
            <div className="stat-label">مرفوضة</div>
          </div>
        </div>

        {/* Policies List */}
        <div className="approvals-content">
          {loading ? (
            <div className="loading">جاري التحميل...</div>
          ) : filteredPolicies.length > 0 ? (
            <div className="policies-accordion">
              {filteredPolicies.map(policy => {
                const approverRoles = getApproversForRole(policy.approvals);
                const isExpanded = expandedPolicy === policy.policyId;
                const status = getApprovalStatus(policy.approvals);

                return (
                  <div key={policy.policyId} className={`approval-item status-${status}`}>
                    {/* Header */}
                    <div
                      className="approval-header"
                      onClick={() => setExpandedPolicy(isExpanded ? null : policy.policyId)}
                    >
                      <div className="header-content">
                        <div className="policy-info">
                          <h3>{policy.policyName}</h3>
                          <p className="policy-type">{policy.policyType}</p>
                        </div>
                        <div className="approval-status">
                          <span className={`status-badge status-${status}`}>
                            {getApprovalStatusLabel(policy.approvals)}
                          </span>
                        </div>
                      </div>
                      <div className="expand-icon">{isExpanded ? '▼' : '▶'}</div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="approval-details">
                        {/* Policy Details */}
                        <div className="details-section">
                          <h4>تفاصيل السياسة</h4>
                          <p>
                            <strong>الوصف:</strong> {policy.description}
                          </p>
                          <p>
                            <strong>تاريخ البدء:</strong>{' '}
                            {new Date(policy.effectiveDate).toLocaleDateString('ar')}
                          </p>
                          <p>
                            <strong>الأقسام المعنية:</strong>{' '}
                            {policy.applicableDepartments?.join(', ') || 'جميع الأقسام'}
                          </p>
                        </div>

                        {/* Approval Matrix */}
                        <div className="details-section">
                          <h4>مصفوفة الموافقة</h4>
                          <div className="approval-matrix">
                            {Object.entries(approverRoles).map(([role, approvers]) => (
                              <div key={role} className="role-approval">
                                <div className="role-name">{role}</div>
                                <div className="approvers-list">
                                  {approvers.length > 0 ? (
                                    approvers.map((app, idx) => (
                                      <div
                                        key={idx}
                                        className={`approver-item status-${app.status?.toLowerCase()}`}
                                      >
                                        <span className="approval-badge">{app.status}</span>
                                        <span className="approver-name">
                                          {app.approverName || 'غير محدد'}
                                        </span>
                                        {app.approvalDate && (
                                          <span className="approval-date">
                                            {new Date(app.approvalDate).toLocaleDateString('ar')}
                                          </span>
                                        )}
                                        {app.comments && (
                                          <p className="approval-comments">{app.comments}</p>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="no-approvers">لم يتعين موافق</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {status === 'pending' || status === 'in-progress' ? (
                          <div className="action-buttons">
                            <button
                              className="btn btn-approve"
                              onClick={() => handleApprovalClick(policy, 'approve')}
                            >
                              ✓ الموافقة
                            </button>
                            <button
                              className="btn btn-reject"
                              onClick={() => handleApprovalClick(policy, 'reject')}
                            >
                              ✕ الرفض
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-data">
              <p>🎉 لا توجد سياسات معلقة للموافقة عليها</p>
            </div>
          )}
        </div>

        {/* Comment Modal */}
        {showCommentModal && selectedPolicy && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{approvalAction === 'approve' ? 'الموافقة على السياسة' : 'رفض السياسة'}</h2>
                <button className="close-btn" onClick={() => setShowCommentModal(false)}>
                  ×
                </button>
              </div>

              <div className="modal-body">
                <p className="policy-name">
                  <strong>السياسة:</strong> {selectedPolicy.policyName}
                </p>

                <div className="form-group">
                  <label>الملاحظات والتعليقات:</label>
                  <textarea
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    placeholder="أضف ملاحظاتك هنا..."
                    className="form-control"
                    rows="6"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCommentModal(false)}>
                  إلغاء
                </button>
                <button
                  className={`btn ${approvalAction === 'approve' ? 'btn-approve' : 'btn-reject'}`}
                  onClick={handleSubmitApproval}
                  disabled={loading}
                >
                  {loading
                    ? 'جاري...'
                    : approvalAction === 'approve'
                      ? 'تأكيد الموافقة'
                      : 'تأكيد الرفض'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicyApprovals;
