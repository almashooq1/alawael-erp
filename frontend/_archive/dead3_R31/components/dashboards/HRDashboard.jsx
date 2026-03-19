/**
 * HR Dashboard Component - React
 * مكون لوحة معلومات الموارد البشرية
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getToken } from '../../utils/tokenStorage';

const HRDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [_selectedEmployee, _setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/dashboards/hr', {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching HR dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">جاري التحميل...</div>;
  }

  if (!dashboardData) {
    return <div>لا توجد بيانات</div>;
  }

  const {
    employeeRoster,
    personnelManagement,
    payrollCompensation,
    _benefitsManagement,
    recruitmentPipeline,
    performanceManagement,
    _trainingDevelopment,
    complianceDocuments
  } = dashboardData;

  // Chart data
  const rosterChartData = [
    { name: 'نشط', value: employeeRoster.byStatus.active.count, fill: '#2ecc71' },
    { name: 'إجازة', value: employeeRoster.byStatus.onLeave.count, fill: '#f39c12' },
    { name: 'منتهي', value: employeeRoster.byStatus.terminated.count, fill: '#e74c3c' }
  ];

  const performanceChartData = [
    { name: 'متفوق جداً', count: performanceManagement.performanceDistribution.exceptional },
    { name: 'متفوق', count: performanceManagement.performanceDistribution.exceeds },
    { name: 'يلبي', count: performanceManagement.performanceDistribution.meets },
    { name: 'يحتاج تحسن', count: performanceManagement.performanceDistribution.needsImprovement }
  ];

  const recruitmentChartData = [
    { stage: 'طلبات جديدة', count: recruitmentPipeline.pipeline.newApplications },
    { stage: 'الفحص', count: recruitmentPipeline.pipeline.screening },
    { stage: 'المقابلة 1', count: recruitmentPipeline.pipeline.firstInterview },
    { stage: 'المقابلة 2', count: recruitmentPipeline.pipeline.secondInterview },
    { stage: 'العرض', count: recruitmentPipeline.pipeline.offer }
  ];

  return (
    <div className="hr-dashboard">
      <header className="dashboard-header">
        <h1>لوحة معلومات الموارد البشرية</h1>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            نظرة عامة
          </button>
          <button
            className={`tab ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            الموظفون
          </button>
          <button
            className={`tab ${activeTab === 'payroll' ? 'active' : ''}`}
            onClick={() => setActiveTab('payroll')}
          >
            الرواتب
          </button>
          <button
            className={`tab ${activeTab === 'recruitment' ? 'active' : ''}`}
            onClick={() => setActiveTab('recruitment')}
          >
            التوظيف
          </button>
          <button
            className={`tab ${activeTab === 'compliance' ? 'active' : ''}`}
            onClick={() => setActiveTab('compliance')}
          >
            الالتزام
          </button>
        </div>
      </header>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <section className="tab-content">
          {/* Quick Stats */}
          <div className="quick-stats">
            <StatCard
              title="إجمالي الموظفين"
              value={employeeRoster.totalEmployees}
              icon="👥"
              color="#3498db"
            />
            <StatCard
              title="موظفون نشطون"
              value={employeeRoster.byStatus.active.count}
              icon="✅"
              color="#2ecc71"
            />
            <StatCard
              title="معدل الحضور"
              value={`${personnelManagement.attendanceRate}%`}
              icon="📅"
              color="#f39c12"
            />
            <StatCard
              title="الرواتب الشهرية"
              value={`${(payrollCompensation.currentPayroll.grossPayroll / 1000).toFixed(0)}K`}
              icon="💰"
              color="#9b59b6"
            />
          </div>

          {/* Employee Status Chart */}
          <div className="chart-section">
            <h2>حالة الموظفين</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={rosterChartData} cx="50%" cy="50%" labelLine={false} label={renderCustomLabel} outerRadius={100} fill="#8884d8" dataKey="value">
                  {rosterChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Changes */}
          <div className="recent-changes">
            <h2>التغييرات الأخيرة</h2>
            <div className="changes-list">
              {employeeRoster.recentChanges.map((change, idx) => (
                <div key={idx} className="change-item">
                  <div className="change-info">
                    <h4>{change.name}</h4>
                    <p><strong>{change.action}</strong> - {change.department}</p>
                    <small>{new Date(change.date).toLocaleDateString('ar-SA')}</small>
                  </div>
                  <div className="change-action">
                    <button>عرض</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <section className="tab-content">
          {/* Personnel Management */}
          <div className="personnel-section">
            <h2>إدارة الموظفين</h2>
            <div className="info-grid">
              <InfoCard
                title="معدل الحضور"
                value={`${personnelManagement.attendanceRate}%`}
                details={`${personnelManagement.presentDays} يوم حاضر`}
              />
              <InfoCard
                title="الرسوب المرخص"
                value={`${personnelManagement.absences.authorized.sick + personnelManagement.absences.authorized.annual + personnelManagement.absences.authorized.unpaid}`}
                details="مرخص / بدون راتب"
              />
              <InfoCard
                title="الرسوب غير المرخص"
                value={personnelManagement.absences.unauthorized}
                details="يومي"
              />
              <InfoCard
                title="المتأخرون"
                value={personnelManagement.workingHours.overtime}
                details="ساعات إضافية"
              />
            </div>
          </div>

          {/* Leave Management */}
          <div className="leaves-section">
            <h2>إدارة الإجازات</h2>
            <div className="leaves-grid">
              <LeaveCard
                type="الإجازة السنوية"
                pending={personnelManagement.leaves.pending.length}
                approved={personnelManagement.leaves.approved}
                rejected={personnelManagement.leaves.rejected}
              />
            </div>

            {/* Pending Leaves */}
            {personnelManagement.leaves.pending.length > 0 && (
              <div className="pending-leaves">
                <h3>طلبات إجازة معلقة</h3>
                {personnelManagement.leaves.pending.map((leave, idx) => (
                  <div key={idx} className="leave-request">
                    <div className="request-info">
                      <h4>{leave.name}</h4>
                      <p>{leave.type} - {leave.duration} يومي</p>
                      <p className="dates">{new Date(leave.startDate).toLocaleDateString('ar-SA')} - {new Date(leave.startDate).toLocaleDateString('ar-SA')}</p>
                    </div>
                    <div className="request-actions">
                      <button className="btn-approve">موافقة</button>
                      <button className="btn-reject">رفض</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Payroll Tab */}
      {activeTab === 'payroll' && (
        <section className="tab-content">
          <h2>الرواتب والتعويضات</h2>

          {/* Current Payroll */}
          <div className="payroll-overview">
            <PayrollCard
              title="إجمالي الرواتب الإجمالية"
              amount={payrollCompensation.currentPayroll.grossPayroll}
              subtitle="الموظفون الحاليون"
            />
            <PayrollCard
              title="الرواتب الصافية"
              amount={payrollCompensation.currentPayroll.netPayroll}
              subtitle="بعد الخصومات"
            />
            <PayrollCard
              title="إجمالي الخصومات"
              amount={payrollCompensation.currentPayroll.totalDeductions}
              subtitle="ريال سعودي"
            />
          </div>

          {/* Deductions Breakdown */}
          <div className="deductions-breakdown">
            <h3>توزيع الخصومات</h3>
            <div className="breakdown-list">
              <div className="breakdown-item">
                <span>التأمينات الاجتماعية</span>
                <span className="amount">{(payrollCompensation.currentPayroll.deductionsBreakdown.gosi / 1000).toFixed(1)}K</span>
              </div>
              <div className="breakdown-item">
                <span>التأمين الطبي</span>
                <span className="amount">{(payrollCompensation.currentPayroll.deductionsBreakdown.insurance / 1000).toFixed(1)}K</span>
              </div>
              <div className="breakdown-item">
                <span>الضريبة</span>
                <span className="amount">{(payrollCompensation.currentPayroll.deductionsBreakdown.tax / 1000).toFixed(1)}K</span>
              </div>
            </div>
          </div>

          {/* Salary Distribution Chart */}
          <div className="chart-section">
            <h3>توزيع الرواتب</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3498db" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pending Payments */}
          {payrollCompensation.pendingPayments.length > 0 && (
            <div className="pending-payments">
              <h3>دفعات معلقة</h3>
              {payrollCompensation.pendingPayments.map((payment, idx) => (
                <div key={idx} className="payment-item">
                  <div>
                    <h4>{payment.name}</h4>
                    <p>{payment.reason}</p>
                  </div>
                  <div className="amount">{(payment.amount / 1000).toFixed(1)}K</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Recruitment Tab */}
      {activeTab === 'recruitment' && (
        <section className="tab-content">
          <h2>إدارة التوظيف</h2>

          <div className="recruitment-overview">
            <StatCard
              title="الوظائف المفتوحة"
              value={recruitmentPipeline.openPositions}
              icon="📢"
              color="#3498db"
            />
            <StatCard
              title="إجمالي المتقدمين"
              value={recruitmentPipeline.applicantsTotal}
              icon="📋"
              color="#2ecc71"
            />
            <StatCard
              title="متوسط وقت التوظيف"
              value={`${recruitmentPipeline.metrics.averageTimeToHire} يوم`}
              icon="⏱️"
              color="#f39c12"
            />
            <StatCard
              title="معدل قبول العرض"
              value={`${recruitmentPipeline.metrics.offerAcceptanceRate}%`}
              icon="✓"
              color="#2ecc71"
            />
          </div>

          {/* Pipeline Chart */}
          <div className="chart-section">
            <h3>مسار المرشحين</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={recruitmentChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#9b59b6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Active Requisitions */}
          <div className="requisitions">
            <h3>الوظائف النشطة</h3>
            {recruitmentPipeline.activeRequisitions.map((req, idx) => (
              <div key={idx} className="requisition-card">
                <h4>{req.position}</h4>
                <p className="department">{req.department}</p>
                <div className="requisition-stats">
                  <span>المتقدمون: {req.applicants}</span>
                  <span>المقابلات: {req.interviews}</span>
                  <span>المدة: {Math.floor((Date.now() - new Date(req.openSince).getTime()) / (24 * 60 * 60 * 1000))} يوم</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <section className="tab-content">
          <h2>الالتزام والمستندات</h2>

          <div className="compliance-overview">
            <StatCard
              title="المستندات المكتملة"
              value={complianceDocuments.documentStatus.complete}
              icon="✓"
              color="#2ecc71"
            />
            <StatCard
              title="المستندات الناقصة"
              value={complianceDocuments.documentStatus.incomplete}
              icon="⚠️"
              color="#e74c3c"
            />
            <StatCard
              title="المستندات المنتهية"
              value={complianceDocuments.documentStatus.expiring}
              icon="⏰"
              color="#f39c12"
            />
          </div>

          {/* Expiring Documents */}
          {complianceDocuments.expiringDocuments.length > 0 && (
            <div className="expiring-docs">
              <h3>مستندات منتهية الصلاحية قريباً</h3>
              {complianceDocuments.expiringDocuments.map((doc, idx) => (
                <div key={idx} className="expiring-item">
                  <div>
                    <h4>{doc.name}</h4>
                    <p>{doc.documentType}</p>
                  </div>
                  <div className="expiry-info">
                    <strong>ينتهي:</strong> {new Date(doc.expiryDate).toLocaleDateString('ar-SA')}
                    <p>{doc.requiredAction}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="dashboard-footer">
        <p>تم التحديث: {new Date().toLocaleString('ar-SA')}</p>
      </footer>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => (
  <div className="stat-card" style={{ borderLeftColor: color }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-info">
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
    </div>
  </div>
);

const InfoCard = ({ title, value, details }) => (
  <div className="info-card">
    <div className="info-title">{title}</div>
    <div className="info-value">{value}</div>
    <div className="info-details">{details}</div>
  </div>
);

const PayrollCard = ({ title, amount, subtitle }) => (
  <div className="payroll-card">
    <h3>{title}</h3>
    <div className="amount">{(amount / 1000).toFixed(0)}K</div>
    <p className="subtitle">{subtitle}</p>
  </div>
);

const LeaveCard = ({ type, pending, approved, rejected }) => (
  <div className="leave-card">
    <h3>{type}</h3>
    <div className="leave-stats">
      <div className="stat">
        <span className="label">معلقة</span>
        <span className="value pending">{pending}</span>
      </div>
      <div className="stat">
        <span className="label">موافق عليها</span>
        <span className="value approved">{approved}</span>
      </div>
      <div className="stat">
        <span className="label">مرفوضة</span>
        <span className="value rejected">{rejected}</span>
      </div>
    </div>
  </div>
);

const renderCustomLabel = (entry) => {
  return `${entry.name}: ${entry.value}`;
};

export default HRDashboard;
