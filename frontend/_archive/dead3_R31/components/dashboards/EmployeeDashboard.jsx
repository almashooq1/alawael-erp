/**
 * Employee Self-Service Portal Dashboard Component - React
 * مكون بوابة الخدمة الذاتية للموظف
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getToken } from '../../utils/tokenStorage';

const EmployeeDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/dashboards/employee', {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching employee dashboard:', error);
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
    personalInfo,
    salaryCompensation,
    gosiInfo,
    insuranceBenefits,
    leaveAttendance,
    documents,
    performanceDevelopment,
    announcements,
    quickActions
  } = dashboardData;

  // Salary chart data
  const salaryChartData = [
    { month: 'شهر 1', gross: 14000, net: 12145 },
    { month: 'شهر 2', gross: 14000, net: 12145 },
    { month: 'شهر 3', gross: 14000, net: 12145 },
    { month: 'شهر 4', gross: 14000, net: 12145 }
  ];

  return (
    <div className="employee-dashboard">
      {/* Announcements Banner */}
      {announcements.length > 0 && (
        <div className="announcements-banner">
          {announcements.filter(a => !a.readStatus).map(ann => (
            <div key={ann.id} className="announcement">
              📢 <strong>{ann.titleEN}</strong>: {ann.content}
            </div>
          ))}
        </div>
      )}

      {/* Header with Personal Info */}
      <header className="employee-header">
        <div className="welcome-section">
          <h1>أهلاً، {personalInfo.name}</h1>
          <div className="employee-info">
            <span className="position">{personalInfo.position}</span>
            <span className="department">{personalInfo.department}</span>
            <span className="tenure">{personalInfo.tenure}</span>
          </div>
        </div>
        <div className="quick-actions-bar">
          {quickActions.slice(0, 4).map(action => (
            <button key={action.id} className="quick-action" title={action.label}>
              <span className="action-icon">{action.icon}</span>
              <span className="action-label">{action.labelAR}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Navigation */}
      <nav className="dashboard-nav">
        <button
          className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          نظرة عامة
        </button>
        <button
          className={`nav-item ${activeSection === 'salary' ? 'active' : ''}`}
          onClick={() => setActiveSection('salary')}
        >
          الراتب
        </button>
        <button
          className={`nav-item ${activeSection === 'benefits' ? 'active' : ''}`}
          onClick={() => setActiveSection('benefits')}
        >
          المزايا
        </button>
        <button
          className={`nav-item ${activeSection === 'leave' ? 'active' : ''}`}
          onClick={() => setActiveSection('leave')}
        >
          الإجازات
        </button>
        <button
          className={`nav-item ${activeSection === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveSection('documents')}
        >
          المستندات
        </button>
        <button
          className={`nav-item ${activeSection === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveSection('performance')}
        >
          الأداء
        </button>
      </nav>

      {/* Content Sections */}
      <main className="dashboard-content">

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <section className="section-overview">
            <h2>نظرة عامة</h2>

            {/* Key Metrics */}
            <div className="metrics-grid">
              <MetricCard
                title="الراتب الشهري"
                value={`${salaryCompensation.currentSalary.grossSalary}K`}
                subtext="راتب إجمالي"
                color="#3498db"
                icon="💰"
              />
              <MetricCard
                title="الإجازات المتبقية"
                value={leaveAttendance.leaveBalance.annual.balance}
                subtext="يومي سنوي"
                color="#2ecc71"
                icon="📅"
              />
              <MetricCard
                title="معدل الحضور"
                value={`${dashboardData?.personnelManagement?.attendanceRate || 98.5}%`}
                subtext="النسبة المئوية"
                color="#f39c12"
                icon="✓"
              />
              <MetricCard
                title="سنوات الخدمة"
                value={personalInfo.tenure}
                subtext=""
                color="#9b59b6"
                icon="⭐"
              />
            </div>

            {/* Personal Information Card */}
            <div className="info-card personal-info">
              <h3>البيانات الشخصية</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">البريد الإلكتروني</span>
                  <span className="value">{personalInfo.email}</span>
                </div>
                <div className="info-item">
                  <span className="label">الهاتف</span>
                  <span className="value">{personalInfo.phone}</span>
                </div>
                <div className="info-item">
                  <span className="label">تاريخ الميلاد</span>
                  <span className="value">{personalInfo.dateOfBirth}</span>
                </div>
                <div className="info-item">
                  <span className="label">الجنسية</span>
                  <span className="value">{personalInfo.nationality}</span>
                </div>
                <div className="info-item">
                  <span className="label">المدير المباشر</span>
                  <span className="value">{personalInfo.employment.manager}</span>
                </div>
                <div className="info-item">
                  <span className="label">نوع التعاقد</span>
                  <span className="value">{personalInfo.employment.contractType}</span>
                </div>
              </div>
            </div>

            {/* Recent Announcements */}
            {announcements.length > 0 && (
              <div className="announcements-section">
                <h3>الإعلانات الأخيرة</h3>
                <div className="announcements-list">
                  {announcements.map(ann => (
                    <div key={ann.id} className="announcement-item">
                      <div className="announcement-header">
                        <h4>{ann.titleEN}</h4>
                        <span className="date">{new Date(ann.date).toLocaleDateString('ar-SA')}</span>
                      </div>
                      <p>{ann.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Salary Section */}
        {activeSection === 'salary' && (
          <section className="section-salary">
            <h2>الراتب والتعويضات</h2>

            {/* Current Salary */}
            <div className="salary-overview">
              <div className="salary-card">
                <h3>راتبك الحالي</h3>
                <div className="salary-breakdown">
                  <div className="salary-item">
                    <span className="label">الراتب الأساسي</span>
                    <span className="amount">{salaryCompensation.currentSalary.baseSalary}K</span>
                  </div>
                  <div className="salary-item">
                    <span className="label">بدل السكن</span>
                    <span className="amount">{salaryCompensation.currentSalary.housing}K</span>
                  </div>
                  <div className="salary-item">
                    <span className="label">التعويضات الأخرى</span>
                    <span className="amount">{salaryCompensation.currentSalary.allowances}K</span>
                  </div>
                  <div className="salary-item total">
                    <span className="label">الراتب الإجمالي</span>
                    <span className="amount">{salaryCompensation.currentSalary.grossSalary}K</span>
                  </div>
                </div>
              </div>

              {/* Last Payslip */}
              {salaryCompensation.lastPayslip && (
                <div className="payslip-card">
                  <h3>آخر كشف راتب</h3>
                  <div className="payslip-info">
                    <p className="date">{new Date(salaryCompensation.lastPayslip.date).toLocaleDateString('ar-SA')}</p>
                    <div className="payslip-row">
                      <span>الراتب الإجمالي</span>
                      <span className="amount">{salaryCompensation.lastPayslip.gross}K</span>
                    </div>
                    <div className="deductions">
                      <p className="deductions-title">الخصومات:</p>
                      <div className="deduction-item">
                        <span>التأمينات الاجتماعية</span>
                        <span>{salaryCompensation.lastPayslip.deductions.gosi}K</span>
                      </div>
                      <div className="deduction-item">
                        <span>التأمين الطبي</span>
                        <span>{salaryCompensation.lastPayslip.deductions.insurance}K</span>
                      </div>
                      <div className="deduction-item">
                        <span>الضريبة</span>
                        <span>{salaryCompensation.lastPayslip.deductions.tax}K</span>
                      </div>
                    </div>
                    <div className="net-salary">
                      <span>الراتب الصافي</span>
                      <span className="amount">{salaryCompensation.lastPayslip.net}K</span>
                    </div>
                    <a href={salaryCompensation.lastPayslip.downloadUrl} className="btn-download">
                      تحميل الكشف
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Salary Chart */}
            <div className="chart-section">
              <h3>اتجاه الراتب</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salaryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="gross" stroke="#3498db" name="إجمالي" />
                  <Line type="monotone" dataKey="net" stroke="#2ecc71" name="صافي" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Bonus Information */}
            {salaryCompensation.bonus.eligible && (
              <div className="bonus-card">
                <h3>🎁 مكافأة سنوية</h3>
                <p>أنت مؤهل للحصول على مكافأة سنوية</p>
                <div className="bonus-details">
                  <span className="label">المبلغ المتوقع:</span>
                  <span className="amount">{salaryCompensation.bonus.expectedAmount}K</span>
                </div>
                <p className="date">تاريخ الصرف المتوقع: {new Date(salaryCompensation.bonus.expectedDate).toLocaleDateString('ar-SA')}</p>
              </div>
            )}

            {/* Payslip History */}
            <div className="payslip-history">
              <h3>سجل كشوف الراتب</h3>
              <div className="payslips-table">
                <div className="table-header">
                  <span>الشهر</span>
                  <span>الراتب الإجمالي</span>
                  <span>الراتب الصافي</span>
                  <span>الإجراء</span>
                </div>
                {salaryCompensation.payslipHistory.map((payslip, idx) => (
                  <div key={idx} className="table-row">
                    <span>{payslip.month}</span>
                    <span>{payslip.gross}K</span>
                    <span>{payslip.net}K</span>
                    <a href={payslip.url}>تحميل</a>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Benefits Section */}
        {activeSection === 'benefits' && (
          <section className="section-benefits">
            <h2>المزايا والتأمينات</h2>

            {/* GOSI Information */}
            <div className="benefit-card gosi-card">
              <h3>🏛️ التأمينات الاجتماعية (GOSI)</h3>
              <div className="gosi-info">
                <div className="info-row">
                  <span className="label">حالة التسجيل</span>
                  <span className="value">{gosiInfo.registrationStatus}</span>
                </div>
                <div className="info-row">
                  <span className="label">رقم الانتماء</span>
                  <span className="value">{gosiInfo.affiliationNumber}</span>
                </div>
                <div className="info-row">
                  <span className="label">أشهر المساهمة المكتملة</span>
                  <span className="value">{gosiInfo.benefits.completedMonths}</span>
                </div>
                <div className="contribution-section">
                  <h4>المساهمات الشهرية</h4>
                  <div className="contribution-item">
                    <span>مساهمة الموظف</span>
                    <span>{gosiInfo.contributions.currentMonth.employee}K</span>
                  </div>
                  <div className="contribution-item">
                    <span>مساهمة صاحب العمل</span>
                    <span>{gosiInfo.contributions.currentMonth.employer}K</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Insurance */}
            <div className="benefit-card insurance-card">
              <h3>🏥 التأمين الطبي</h3>
              <div className="insurance-info">
                <div className="info-row">
                  <span className="label">المزود</span>
                  <span className="value">{insuranceBenefits.medicalInsurance.provider}</span>
                </div>
                <div className="info-row">
                  <span className="label">رقم البوليصة</span>
                  <span className="value">{insuranceBenefits.medicalInsurance.policyNumber}</span>
                </div>
                <div className="info-row">
                  <span className="label">نوع التغطية</span>
                  <span className="value">{insuranceBenefits.medicalInsurance.coverage}</span>
                </div>
                <div className="info-row">
                  <span className="label">أفراد الأسرة المغطيين</span>
                  <span className="value">{insuranceBenefits.medicalInsurance.familyMembers}</span>
                </div>
                <div className="info-row">
                  <span className="label">صلاحية الوثيقة</span>
                  <span className="value">{new Date(insuranceBenefits.medicalInsurance.expiryDate).toLocaleDateString('ar-SA')}</span>
                </div>
              </div>
            </div>

            {/* Benefits Summary */}
            <div className="benefits-summary">
              <h3>ملخص المزايا</h3>
              <div className="benefits-list">
                {insuranceBenefits.additionalBenefits.map((benefit, idx) => (
                  <div key={idx} className="benefit-item">
                    <div className="benefit-name">{benefit.name}</div>
                    <div className="benefit-details">
                      {benefit.amount && <span className="amount">{benefit.amount}K</span>}
                      {benefit.cost && <span className="cost">{benefit.cost}</span>}
                      {benefit.status && <span className="status">{benefit.status}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Leave Section */}
        {activeSection === 'leave' && (
          <section className="section-leave">
            <h2>الإجازات والحضور</h2>

            {/* Leave Balance */}
            <div className="leave-balance">
              <div className="leave-type">
                <h3>الإجازة السنوية</h3>
                <div className="balance-info">
                  <div className="balance-stat">
                    <span className="label">المستحق</span>
                    <span className="value">{leaveAttendance.leaveBalance.annual.entitlement}</span>
                  </div>
                  <div className="balance-stat">
                    <span className="label">المستخدم</span>
                    <span className="value">{leaveAttendance.leaveBalance.annual.taken}</span>
                  </div>
                  <div className="balance-stat">
                    <span className="label">المعلق</span>
                    <span className="value">{leaveAttendance.leaveBalance.annual.pending}</span>
                  </div>
                  <div className="balance-stat highlight">
                    <span className="label">الرصيد المتبقي</span>
                    <span className="value">{leaveAttendance.leaveBalance.annual.balance}</span>
                  </div>
                </div>
              </div>

              <div className="leave-type">
                <h3>إجازة مرضية</h3>
                <div className="balance-info">
                  <div className="balance-stat">
                    <span className="label">المستحق</span>
                    <span className="value">{leaveAttendance.leaveBalance.sick.entitlement}</span>
                  </div>
                  <div className="balance-stat">
                    <span className="label">المستخدم</span>
                    <span className="value">{leaveAttendance.leaveBalance.sick.taken}</span>
                  </div>
                  <div className="balance-stat highlight">
                    <span className="label">الرصيد المتبقي</span>
                    <span className="value">{leaveAttendance.leaveBalance.sick.balance}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Request Leave Button */}
            <div className="request-leave-section">
              <button
                className="btn btn-primary"
                onClick={() => setShowLeaveForm(!showLeaveForm)}
              >
                طلب إجازة جديدة
              </button>

              {showLeaveForm && (
                <LeaveRequestForm
                  onCancel={() => setShowLeaveForm(false)}
                  onSubmit={() => setShowLeaveForm(false)}
                />
              )}
            </div>

            {/* Pending Requests */}
            {leaveAttendance.leaveBalance.annual.pending > 0 && (
              <div className="pending-requests">
                <h3>طلبات معلقة</h3>
                {leaveAttendance.pendingLeaveRequests.map((req, idx) => (
                  <div key={idx} className="request-card">
                    <div className="request-info">
                      <h4>{req.type}</h4>
                      <p>{new Date(req.startDate).toLocaleDateString('ar-SA')} - {new Date(req.endDate).toLocaleDateString('ar-SA')} ({req.duration} أيام)</p>
                    </div>
                    <div className="request-status">{req.status}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Attendance Summary */}
            <div className="attendance-summary">
              <h3>ملخص الحضور</h3>
              <div className="attendance-stats">
                <div className="stat">
                  <span className="label">معدل الحضور</span>
                  <span className="value">{leaveAttendance.attendance.averagePresence}%</span>
                </div>
                <div className="stat">
                  <span className="label">أيام حاضر</span>
                  <span className="value">{leaveAttendance.attendance.presentDays}</span>
                </div>
                <div className="stat">
                  <span className="label">أيام غياب</span>
                  <span className="value">{leaveAttendance.attendance.absentDays}</span>
                </div>
                <div className="stat">
                  <span className="label">أيام تأخير</span>
                  <span className="value">{leaveAttendance.attendance.lateDays}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Documents Section */}
        {activeSection === 'documents' && (
          <section className="section-documents">
            <h2>المستندات</h2>

            {/* Personal Documents */}
            <div className="documents-section">
              <h3>المستندات الشخصية</h3>
              <div className="documents-list">
                {documents.personalDocuments.map((doc, idx) => (
                  <div key={idx} className="document-item">
                    <div className="document-info">
                      <h4>{doc.type}</h4>
                      <p className="doc-number">الرقم: {doc.number}</p>
                      <p className="doc-dates">
                        من {new Date(doc.issuedDate).toLocaleDateString('ar-SA')}
                        إلى {new Date(doc.expiryDate).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <div className="document-status">
                      <span className={`status ${doc.status.toLowerCase()}`}>{doc.status}</span>
                      {doc.verified && <span className="verified">✓ مُوثِّق</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Work Documents */}
            <div className="documents-section">
              <h3>مستندات العمل</h3>
              <div className="documents-list">
                {documents.workDocuments.map((doc, idx) => (
                  <div key={idx} className="document-item">
                    <div className="document-info">
                      <h4>{doc.type}</h4>
                      <p className="doc-date">التاريخ: {new Date(doc.date).toLocaleDateString('ar-SA')}</p>
                      {doc.lastUpdated && <p className="updated">آخر تحديث: {new Date(doc.lastUpdated).toLocaleDateString('ar-SA')}</p>}
                    </div>
                    <a href={doc.url} className="btn-download">تحميل</a>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications */}
            {documents.certifications.length > 0 && (
              <div className="documents-section">
                <h3>الشهادات والتراخيص</h3>
                <div className="documents-list">
                  {documents.certifications.map((cert, idx) => (
                    <div key={idx} className="document-item">
                      <div className="document-info">
                        <h4>{cert.name}</h4>
                        <p>{cert.issuer}</p>
                        <p className="doc-dates">
                          {new Date(cert.issueDate).toLocaleDateString('ar-SA')} -
                          {new Date(cert.expiryDate).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      <a href={cert.url} className="btn-view">عرض</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Performance Section */}
        {activeSection === 'performance' && (
          <section className="section-performance">
            <h2>الأداء والتطوير</h2>

            {/* Performance Review */}
            <div className="performance-card">
              <h3>آخر تقييم أداء</h3>
              <div className="review-info">
                <div className="rating-display">
                  <div className="overall-rating">{performanceDevelopment.performanceReview.overallRating}</div>
                  <p>التقييم الإجمالي من 5</p>
                </div>
                <div className="ratings-breakdown">
                  {Object.entries(performanceDevelopment.performanceReview.ratingDistribution).map(([category, rating]) => (
                    <div key={category} className="rating-item">
                      <span className="category">{category}</span>
                      <span className="rating">{rating}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="feedback">{performanceDevelopment.performanceReview.feedback}</p>
              <p className="next-review">
                التقييم التالي بتاريخ: {new Date(performanceDevelopment.performanceReview.nextReviewDate).toLocaleDateString('ar-SA')}
              </p>
            </div>

            {/* Development Goals */}
            {performanceDevelopment.developmentPlan.active && (
              <div className="development-plan">
                <h3>خطة التطوير</h3>
                <div className="goals-list">
                  {performanceDevelopment.developmentPlan.goals.map((goal, idx) => (
                    <div key={idx} className="goal-item">
                      <h4>{goal.goal}</h4>
                      <div className="goal-status">{goal.status}</div>
                      <div className="progress-bar">
                        <div className="progress" style={{ width: `${goal.completionPercentage}%` }}></div>
                      </div>
                      <p className="completion">{goal.completionPercentage}%</p>
                      <p className="due-date">الموعد المقرر: {new Date(goal.dueDate).toLocaleDateString('ar-SA')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trainings */}
            <div className="trainings-section">
              <h3>التدريب والتطوير</h3>

              {performanceDevelopment.trainings.completed.length > 0 && (
                <div className="training-list">
                  <h4>التدريبات المكتملة</h4>
                  {performanceDevelopment.trainings.completed.map((training, idx) => (
                    <div key={idx} className="training-item">
                      <span className="status completed">✓</span>
                      <div className="training-info">
                        <p>{training.name}</p>
                        <small>{training.provider} - {training.duration}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {performanceDevelopment.trainings.inProgress.length > 0 && (
                <div className="training-list">
                  <h4>التدريبات جارية</h4>
                  {performanceDevelopment.trainings.inProgress.map((training, idx) => (
                    <div key={idx} className="training-item">
                      <span className="status in-progress">⧗</span>
                      <div className="training-info">
                        <p>{training.name}</p>
                        <small>{new Date(training.startDate).toLocaleDateString('ar-SA')} - {new Date(training.endDate).toLocaleDateString('ar-SA')}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

      </main>
    </div>
  );
};

const MetricCard = ({ title, value, subtext, color, icon }) => (
  <div className="metric-card" style={{ borderTopColor: color }}>
    <div className="metric-icon">{icon}</div>
    <div className="metric-value">{value}</div>
    <div className="metric-title">{title}</div>
    {subtext && <div className="metric-subtext">{subtext}</div>}
  </div>
);

const LeaveRequestForm = ({ onCancel, onSubmit }) => {
  const [formData, setFormData] = useState({
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const handleSubmit = async () => {
    try {
      await axios.post('/api/dashboards/employee/request-leave', formData, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });
      alert('تم تقديم طلب الإجازة بنجاح');
      onSubmit();
    } catch (error) {
      alert('فشل تقديم الطلب');
    }
  };

  return (
    <div className="leave-form-modal">
      <div className="form-backdrop" onClick={onCancel}></div>
      <div className="form-container">
        <h3>طلب إجازة جديدة</h3>
        <div className="form-group">
          <label>نوع الإجازة</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="annual">سنوية</option>
            <option value="sick">مرضية</option>
          </select>
        </div>
        <div className="form-group">
          <label>تاريخ البداية</label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>تاريخ النهاية</label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>السبب</label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="أدخل سبب الإجازة"
          ></textarea>
        </div>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onCancel}>إلغاء</button>
          <button className="btn btn-primary" onClick={handleSubmit}>إرسال</button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
