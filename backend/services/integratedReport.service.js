/**
 * Integrated Report Generator Service
 * Al-Awael ERP - Rehabilitation Center System
 * 
 * Generates comprehensive clinical reports combining ICF, Care Plan, 
 * Sessions, and Assessments data into structured JSON/HTML.
 */

const ICFAssessment = require('../models/assessment/ICFAssessmentLegacy');
const CarePlanVersion = require('../models/CarePlanVersion');
const ClinicalSession = require('../domains/sessions/models/ClinicalSession');
const TherapeuticGoal = require('../domains/goals/models/TherapeuticGoal');
const MDTMeeting = require('../models/MDTCoordination');
const Beneficiary = require('../models/Beneficiary');
const ProgramAssessment = require('../models/Assessment');

/**
 * Calculate age from date of birth
 * @param {Date} dateOfBirth 
 * @returns {number}
 */
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Format date to locale string
 * @param {Date} date 
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ar-SA');
}

/**
 * Determine color class for ICF score
 * @param {number} score 
 * @returns {string}
 */
function getScoreColorClass(score) {
  if (score < 2) return 'score-green';
  if (score <= 3) return 'score-yellow';
  return 'score-red';
}

/**
 * Generate HTML document for the report
 * @param {Object} reportData 
 * @returns {string}
 */
function generateHTMLReport(reportData) {
  const { cover, sections } = reportData;

  const sectionHtml = sections.map(section => {
    switch (section.section) {
      case 'icf':
        return generateICFSectionHTML(section);
      case 'carePlan':
        return generateCarePlanSectionHTML(section);
      case 'sessions':
        return generateSessionsSectionHTML(section);
      case 'mdt':
        return generateMDTSectionHTML(section);
      case 'assessments':
        return generateAssessmentsSectionHTML(section);
      default:
        return '';
    }
  }).join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cover.title} - ${cover.beneficiaryName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .logo-placeholder {
      width: 80px;
      height: 80px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    
    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
    }
    
    .header h2 {
      font-size: 16px;
      font-weight: normal;
      opacity: 0.9;
    }
    
    .cover-info {
      padding: 30px 40px;
      background: #fafafa;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    
    .info-label {
      font-weight: bold;
      color: #555;
    }
    
    .toc {
      padding: 20px 40px;
      background: #fff;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .toc h3 {
      color: #1e3a5f;
      margin-bottom: 15px;
      font-size: 18px;
    }
    
    .toc-list {
      list-style: none;
    }
    
    .toc-list li {
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .toc-list li a {
      color: #2c5282;
      text-decoration: none;
    }
    
    .section {
      padding: 30px 40px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #1e3a5f;
    }
    
    .section-number {
      background: #1e3a5f;
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-left: 12px;
    }
    
    .section-title {
      font-size: 20px;
      color: #1e3a5f;
    }
    
    .score-green { color: #28a745; font-weight: bold; }
    .score-yellow { color: #ffc107; font-weight: bold; }
    .score-red { color: #dc3545; font-weight: bold; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    th, td {
      padding: 12px;
      text-align: right;
      border: 1px solid #ddd;
    }
    
    th {
      background: #f8f9fa;
      font-weight: bold;
      color: #1e3a5f;
    }
    
    tr:nth-child(even) {
      background: #fafafa;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    
    .stat-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
      border-right: 4px solid #1e3a5f;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #1e3a5f;
    }
    
    .stat-label {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    
    .progress-bar {
      width: 100%;
      height: 20px;
      background: #e9ecef;
      border-radius: 10px;
      overflow: hidden;
      margin: 5px 0;
    }
    
    .progress-fill {
      height: 100%;
      background: #28a745;
      border-radius: 10px;
      transition: width 0.3s ease;
    }
    
    .footer {
      padding: 20px 40px;
      background: #1e3a5f;
      color: white;
      text-align: center;
      font-size: 12px;
    }
    
    .divider {
      height: 2px;
      background: linear-gradient(to right, transparent, #1e3a5f, transparent);
      margin: 20px 0;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    
    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-info { background: #d1ecf1; color: #0c5460; }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <div class="logo-placeholder">لوغو</div>
      <h1>${cover.title}</h1>
      <h2>${cover.subtitle}</h2>
    </div>
    
    <div class="cover-info">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">اسم المستفيد:</span>
          <span>${cover.beneficiaryName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">تاريخ الميلاد:</span>
          <span>${cover.dateOfBirth}</span>
        </div>
        <div class="info-item">
          <span class="info-label">العمر:</span>
          <span>${cover.age} سنة</span>
        </div>
        <div class="info-item">
          <span class="info-label">تاريخ التقرير:</span>
          <span>${cover.reportDate}</span>
        </div>
        <div class="info-item">
          <span class="info-label">فترة التقرير:</span>
          <span>${formatDate(cover.reportPeriod.startDate)} - ${formatDate(cover.reportPeriod.endDate)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">تم إنشاؤه بواسطة:</span>
          <span>${cover.generatedBy}</span>
        </div>
      </div>
    </div>
    
    <div class="toc">
      <h3>جدول المحتويات</h3>
      <ul class="toc-list">
        ${sections.map((s, i) => `<li><a href="#section-${s.section}">${i + 1}. ${getSectionTitle(s.section)}</a></li>`).join('')}
      </ul>
    </div>
    
    ${sectionHtml}
    
    <div class="footer">
      <p>تم إنشاء هذا التقرير بواسطة نظام الأوائل ERP | ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}

function getSectionTitle(section) {
  const titles = {
    icf: 'التقييم الوظيفي الشامل (ICF)',
    carePlan: 'خطة الرعاية العلاجية',
    sessions: 'جلسات العلاج',
    mdt: 'اجتماعات الفريق المتعدد التخصصات',
    assessments: 'بطارية التقييمات'
  };
  return titles[section] || section;
}

function generateICFSectionHTML(data) {
  const latest = data.latestAssessment || {};
  const domainScores = latest.domainScores || {};
  
  return `
    <div class="section" id="section-icf">
      <div class="section-header">
        <div class="section-number">1</div>
        <div class="section-title">التقييم الوظيفي الشامل (ICF)</div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value ${getScoreColorClass(latest.overallScore)}">${latest.overallScore?.toFixed(2) || 'N/A'}</div>
          <div class="stat-label">الدرجة العامة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${latest.coreSetType || 'N/A'}</div>
          <div class="stat-label">نوع المجموعة الأساسية</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatDate(latest.assessmentDate)}</div>
          <div class="stat-label">تاريخ التقييم</div>
        </div>
      </div>
      
      <h4>درجات النطاقات</h4>
      <table>
        <thead>
          <tr>
            <th>النطاق</th>
            <th>الدرجة</th>
            <th>التقييم</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(domainScores).map(([domain, score]) => `
            <tr>
              <td>${domain}</td>
              <td class="${getScoreColorClass(score)}">${score}</td>
              <td>${score < 2 ? 'ممتاز' : score <= 3 ? 'متوسط' : 'يحتاج تحسين'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="divider"></div>
    </div>
  `;
}

function generateCarePlanSectionHTML(data) {
  const goals = data.goals || [];
  
  return `
    <div class="section" id="section-carePlan">
      <div class="section-header">
        <div class="section-number">2</div>
        <div class="section-title">خطة الرعاية العلاجية</div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${data.goalProgress?.achieved || 0}</div>
          <div class="stat-label">أهداف محققة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.goalProgress?.inProgress || 0}</div>
          <div class="stat-label">أهداف قيد التنفيذ</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.goalProgress?.total || 0}</div>
          <div class="stat-label">إجمالي الأهداف</div>
        </div>
      </div>
      
      <h4>الأهداف العلاجية</h4>
      <table>
        <thead>
          <tr>
            <th>الهدف</th>
            <th>المجال</th>
            <th>الأولوية</th>
            <th>التقدم</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${goals.map(goal => `
            <tr>
              <td>${goal.statement}</td>
              <td>${goal.domain}</td>
              <td>${goal.priorityScore}</td>
              <td>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${goal.progressPercentage}%"></div>
                </div>
                ${goal.progressPercentage}%
              </td>
              <td><span class="badge ${goal.status === 'achieved' ? 'badge-success' : 'badge-warning'}">${goal.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="divider"></div>
    </div>
  `;
}

function generateSessionsSectionHTML(data) {
  const sessions = data.sessions || [];
  const stats = data.stats || {};
  
  return `
    <div class="section" id="section-sessions">
      <div class="section-header">
        <div class="section-number">3</div>
        <div class="section-title">جلسات العلاج</div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.totalSessions || 0}</div>
          <div class="stat-label">إجمالي الجلسات</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.avgDuration || 0} د</div>
          <div class="stat-label">متوسط المدة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.attendanceRate || 0}%</div>
          <div class="stat-label">معدل الحضور</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.goalsAchievedInSessions || 0}</div>
          <div class="stat-label">أهداف محققة في الجلسات</div>
        </div>
      </div>
      
      <h4>سجل الجلسات</h4>
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>المعالج</th>
            <th>المدة</th>
            <th>النوع</th>
            <th>الأهداف</th>
          </tr>
        </thead>
        <tbody>
          ${sessions.map(session => `
            <tr>
              <td>${formatDate(session.date)}</td>
              <td>${session.therapist}</td>
              <td>${session.duration} دقيقة</td>
              <td>${session.type}</td>
              <td>${session.goalsWorkedOn?.join(', ') || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="divider"></div>
    </div>
  `;
}

function generateMDTSectionHTML(data) {
  const meetings = data.meetings || [];
  
  return `
    <div class="section" id="section-mdt">
      <div class="section-header">
        <div class="section-number">4</div>
        <div class="section-title">اجتماعات الفريق المتعدد التخصصات</div>
      </div>
      
      <h4>القرارات الرئيسية</h4>
      <ul style="margin: 15px 0; padding-right: 20px;">
        ${(data.keyDecisions || []).map(decision => `<li style="margin: 8px 0;">${decision}</li>`).join('')}
      </ul>
      
      <h4>سجل الاجتماعات</h4>
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>الحضور</th>
            <th>القرارات</th>
            <th>إجراءات المتابعة</th>
          </tr>
        </thead>
        <tbody>
          ${meetings.map(meeting => `
            <tr>
              <td>${formatDate(meeting.date)}</td>
              <td>${meeting.attendees?.join(', ') || 'N/A'}</td>
              <td>${meeting.decisions?.join('; ') || 'N/A'}</td>
              <td>${meeting.actionItems?.join('; ') || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="divider"></div>
    </div>
  `;
}

function generateAssessmentsSectionHTML(data) {
  const assessments = data.assessments || [];
  
  return `
    <div class="section" id="section-assessments">
      <div class="section-header">
        <div class="section-number">5</div>
        <div class="section-title">بطارية التقييمات</div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>نوع التقييم</th>
            <th>التاريخ</th>
            <th>الدرجة</th>
            <th>الملخص</th>
          </tr>
        </thead>
        <tbody>
          ${assessments.map(assessment => `
            <tr>
              <td>${assessment.type}</td>
              <td>${formatDate(assessment.date)}</td>
              <td class="${getScoreColorClass(assessment.score)}">${assessment.score}</td>
              <td>${assessment.summary}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="divider"></div>
    </div>
  `;
}

/**
 * Main function to generate integrated clinical report
 * @param {string} beneficiaryId - MongoDB ObjectId of the beneficiary
 * @param {Object} options - Report generation options
 * @returns {Promise<Object>} - Generated report
 */
async function generateIntegratedReport(beneficiaryId, options = {}) {
  console.log(`[IntegratedReport] Starting report generation for beneficiary: ${beneficiaryId}`);
  
  try {
    // Set default dates
    const endDate = options.endDate ? new Date(options.endDate) : new Date();
    const startDate = options.startDate ? new Date(options.startDate) : new Date(endDate);
    if (!options.startDate) {
      startDate.setMonth(startDate.getMonth() - 3); // Default 3 months ago
    }

    const sections = options.sections || ['icf', 'carePlan', 'sessions', 'mdt', 'assessments'];
    const format = options.format || 'json';

    console.log(`[IntegratedReport] Date range: ${startDate.toISOString()} - ${endDate.toISOString()}`);
    console.log(`[IntegratedReport] Sections: ${sections.join(', ')}`);
    console.log(`[IntegratedReport] Format: ${format}`);

    // Step 1: Find beneficiary info
    const beneficiary = await Beneficiary.findById(beneficiaryId).lean();
    if (!beneficiary) {
      console.error(`[IntegratedReport] Beneficiary not found: ${beneficiaryId}`);
      throw new Error('Beneficiary not found');
    }
    console.log(`[IntegratedReport] Found beneficiary: ${beneficiary.name || beneficiary._id}`);

    // Step 2: Query all modules in date range using Promise.all
    const queryPromises = [];
    
    if (sections.includes('icf')) {
      queryPromises.push(
        ICFAssessment.find({
          beneficiaryId,
          assessmentDate: { $gte: startDate, $lte: endDate }
        }).sort({ assessmentDate: -1 }).lean()
      );
    } else {
      queryPromises.push(Promise.resolve([]));
    }

    if (sections.includes('carePlan')) {
      queryPromises.push(
        CarePlanVersion.find({
          beneficiaryId,
          startDate: { $gte: startDate, $lte: endDate }
        }).sort({ versionNumber: -1 }).lean()
      );
    } else {
      queryPromises.push(Promise.resolve([]));
    }

    if (sections.includes('sessions')) {
      queryPromises.push(
        ClinicalSession.find({
          beneficiaryId,
          date: { $gte: startDate, $lte: endDate }
        }).sort({ date: -1 }).lean()
      );
    } else {
      queryPromises.push(Promise.resolve([]));
    }

    if (sections.includes('mdt')) {
      queryPromises.push(
        MDTMeeting.find({
          beneficiaryId,
          meetingDate: { $gte: startDate, $lte: endDate }
        }).sort({ meetingDate: -1 }).lean()
      );
    } else {
      queryPromises.push(Promise.resolve([]));
    }

    if (sections.includes('assessments')) {
      queryPromises.push(
        ProgramAssessment.find({
          beneficiaryId,
          assessmentDate: { $gte: startDate, $lte: endDate }
        }).sort({ assessmentDate: -1 }).lean()
      );
    } else {
      queryPromises.push(Promise.resolve([]));
    }

    // Execute all queries in parallel
    const [
      icfAssessments,
      carePlans,
      sessions,
      mdtMeetings,
      programAssessments
    ] = await Promise.all(queryPromises);

    console.log(`[IntegratedReport] Query results - ICF: ${icfAssessments.length}, CarePlans: ${carePlans.length}, Sessions: ${sessions.length}, MDT: ${mdtMeetings.length}, Assessments: ${programAssessments.length}`);

    // Step 3: Build report sections
    const reportSections = [];

    // Section 1: Cover Page
    const cover = {
      title: 'التقرير السريري المتكامل',
      subtitle: 'Integrated Clinical Report',
      beneficiaryName: beneficiary.name || `${beneficiary.firstName || ''} ${beneficiary.lastName || ''}`.trim(),
      dateOfBirth: formatDate(beneficiary.dateOfBirth),
      age: calculateAge(beneficiary.dateOfBirth),
      reportDate: formatDate(new Date()),
      reportPeriod: { startDate, endDate },
      generatedBy: options.generatedBy || 'نظام الأوائل ERP',
    };

    // Section 2: ICF Assessment
    if (sections.includes('icf') && icfAssessments.length > 0) {
      const latestICF = icfAssessments[0];
      const progressHistory = icfAssessments.map(assessment => ({
        date: assessment.assessmentDate,
        overallScore: assessment.overallScore,
        domainScores: assessment.domainScores || {},
      }));

      reportSections.push({
        section: 'icf',
        latestAssessment: {
          overallScore: latestICF.overallScore,
          domainScores: latestICF.domainScores || {},
          assessmentDate: latestICF.assessmentDate,
          coreSetType: latestICF.coreSetType || 'generic',
        },
        progressHistory,
        recommendations: latestICF.recommendations || [],
      });
    }

    // Section 3: Care Plan
    if (sections.includes('carePlan') && carePlans.length > 0) {
      const latestPlan = carePlans[0];
      
      // Fetch therapeutic goals for the care plan
      let goals = [];
      try {
        const goalIds = latestPlan.goals || latestPlan.goalIds || [];
        if (goalIds.length > 0) {
          const goalDocs = await TherapeuticGoal.find({
            _id: { $in: goalIds }
          }).lean();
          goals = goalDocs.map(goal => ({
            goalId: goal._id,
            statement: goal.statement || goal.title || '',
            domain: goal.domain || goal.icfDomain || 'unspecified',
            priorityScore: goal.priorityScore || goal.priority || 0,
            progressPercentage: goal.progressPercentage || goal.progress || 0,
            status: goal.status || 'inProgress',
            icfMapping: goal.icfMapping || null,
          }));
        }
      } catch (goalError) {
        console.error(`[IntegratedReport] Error fetching goals: ${goalError.message}`);
      }

      const achievedCount = goals.filter(g => g.status === 'achieved').length;
      const inProgressCount = goals.filter(g => g.status === 'inProgress' || g.status === 'active').length;

      reportSections.push({
        section: 'carePlan',
        planInfo: {
          planId: latestPlan._id,
          status: latestPlan.status || 'active',
          versionNumber: latestPlan.versionNumber || 1,
          startDate: latestPlan.startDate,
        },
        goals,
        goalProgress: {
          achieved: achievedCount,
          inProgress: inProgressCount,
          total: goals.length,
        },
      });
    }

    // Section 4: Therapy Sessions
    if (sections.includes('sessions')) {
      const sessionData = sessions.map(session => ({
        date: session.date,
        therapist: session.therapistName || session.therapist?.name || 'غير محدد',
        duration: session.duration || session.sessionDuration || 0,
        type: session.sessionType || session.type || 'unspecified',
        goalsWorkedOn: session.goalsWorkedOn || session.goals || [],
        progressNotes: session.progressNotes || session.notes || '',
      }));

      const totalSessions = sessions.length;
      const avgDuration = totalSessions > 0
        ? Math.round(sessions.reduce((sum, s) => sum + (s.duration || s.sessionDuration || 0), 0) / totalSessions)
        : 0;
      const attendanceRate = totalSessions > 0
        ? Math.round((sessions.filter(s => s.status === 'completed' || s.attendance === 'present').length / totalSessions) * 100)
        : 100;
      const goalsAchievedInSessions = sessions.reduce((sum, s) => sum + (s.goalsAchieved?.length || 0), 0);

      reportSections.push({
        section: 'sessions',
        sessions: sessionData,
        stats: {
          totalSessions,
          avgDuration,
          attendanceRate,
          goalsAchievedInSessions,
        },
      });
    }

    // Section 5: MDT Meetings
    if (sections.includes('mdt')) {
      const meetingData = mdtMeetings.map(meeting => ({
        date: meeting.meetingDate || meeting.date,
        attendees: meeting.attendees?.map(a => a.name || a.toString()) || [],
        decisions: meeting.decisions || meeting.keyDecisions || [],
        actionItems: meeting.actionItems || meeting.tasks || [],
      }));

      const allDecisions = mdtMeetings.flatMap(m => m.decisions || m.keyDecisions || []);

      reportSections.push({
        section: 'mdt',
        meetings: meetingData,
        keyDecisions: allDecisions,
      });
    }

    // Section 6: Assessment Battery
    if (sections.includes('assessments')) {
      const assessmentData = programAssessments.map(assessment => ({
        type: assessment.assessmentType || assessment.type || 'unspecified',
        date: assessment.assessmentDate || assessment.date,
        score: assessment.score || assessment.totalScore || 0,
        summary: assessment.summary || assessment.interpretation || '',
      }));

      reportSections.push({
        section: 'assessments',
        assessments: assessmentData,
      });
    }

    // Build final report structure
    const report = {
      cover,
      sections: reportSections,
    };

    let html = null;

    // HTML generation
    if (format === 'html') {
      console.log('[IntegratedReport] Generating HTML report...');
      html = generateHTMLReport(report);
    }

    // PDF placeholder - return HTML with note
    if (format === 'pdf') {
      console.log('[IntegratedReport] PDF format requested - generating HTML for PDF rendering...');
      html = generateHTMLReport(report);
      console.log('[IntegratedReport] Note: PDF generation requires puppeteer. Returning HTML that can be rendered to PDF by the frontend.');
    }

    console.log(`[IntegratedReport] Report generated successfully with ${reportSections.length} sections`);

    return {
      success: true,
      report,
      html,
      message: 'Report generated successfully',
    };

  } catch (error) {
    console.error(`[IntegratedReport] Error generating report: ${error.message}`);
    console.error(error.stack);
    return {
      success: false,
      message: error.message,
    };
  }
}

module.exports = {
  generateIntegratedReport,
};
