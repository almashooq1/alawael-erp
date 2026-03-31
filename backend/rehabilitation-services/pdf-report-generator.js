/**
 * PDF Report Generator - مولد تقارير PDF المهني
 * يولد تقارير PDF احترافية لنظام الأوائل
 * يدعم: تقارير IEP، التقييمات، التقدم، الجلسات، CARF
 */

// ملاحظة: يعتمد على مكتبة pdfkit - npm install pdfkit
// أو يمكن استخدام puppeteer لتحويل HTML إلى PDF

const path = require('path');
const fs = require('fs');
const os = require('os');

// ============================================================
// إعدادات القوالب
// ============================================================
const REPORT_CONFIG = {
  organization: {
    nameAr: 'نظام الأوائل للتأهيل',
    nameEn: 'Alawael Rehabilitation System',
    logo: null, // مسار الشعار
    address: 'المملكة العربية السعودية',
    phone: '',
    website: 'alawael-rehab.sa',
    accreditation: 'CARF Accredited',
  },
  colors: {
    primary: '#1a5276',
    secondary: '#2980b9',
    accent: '#27ae60',
    danger: '#e74c3c',
    warning: '#f39c12',
    gray: '#7f8c8d',
    lightGray: '#ecf0f1',
    white: '#ffffff',
    black: '#2c3e50',
  },
  fonts: {
    arabic: 'Cairo',
    english: 'Roboto',
  },
  pageSize: 'A4',
  margins: { top: 40, bottom: 40, left: 50, right: 50 },
};

// ============================================================
// مولد HTML للتقارير (يمكن تحويله لـ PDF عبر puppeteer)
// ============================================================
class PDFReportGenerator {
  constructor() {
    this.config = REPORT_CONFIG;
    this.reportsDir = path.join(process.cwd(), 'generated_reports');
    this._ensureReportsDir();
  }

  _ensureReportsDir() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // ============================================================
  // 1. تقرير خطة IEP
  // ============================================================
  async generateIEPReport(iepData) {
    const reportId = `IEP-RPT-${Date.now()}`;
    const html = this._buildIEPHTML(iepData, reportId);
    const filePath = path.join(this.reportsDir, `${reportId}.html`);
    fs.writeFileSync(filePath, html, 'utf8');

    return {
      success: true,
      reportId,
      reportType: 'IEP',
      format: 'html',
      filePath,
      generatedAt: new Date().toISOString(),
      metadata: {
        beneficiaryName: iepData.beneficiaryName,
        planDate: iepData.planDate,
        goalsCount: iepData.goals?.length || 0,
      },
    };
  }

  // ============================================================
  // 2. تقرير التقدم الدوري
  // ============================================================
  async generateProgressReport(progressData) {
    const reportId = `PROG-RPT-${Date.now()}`;
    const html = this._buildProgressHTML(progressData, reportId);
    const filePath = path.join(this.reportsDir, `${reportId}.html`);
    fs.writeFileSync(filePath, html, 'utf8');

    return {
      success: true,
      reportId,
      reportType: 'PROGRESS',
      format: 'html',
      filePath,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // 3. تقرير جلسة علاجية
  // ============================================================
  async generateSessionReport(sessionData) {
    const reportId = `SES-RPT-${Date.now()}`;
    const html = this._buildSessionHTML(sessionData, reportId);
    const filePath = path.join(this.reportsDir, `${reportId}.html`);
    fs.writeFileSync(filePath, html, 'utf8');

    return {
      success: true,
      reportId,
      reportType: 'SESSION',
      format: 'html',
      filePath,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // 4. تقرير التقييم الشامل
  // ============================================================
  async generateAssessmentReport(assessmentData) {
    const reportId = `ASSESS-RPT-${Date.now()}`;
    const html = this._buildAssessmentHTML(assessmentData, reportId);
    const filePath = path.join(this.reportsDir, `${reportId}.html`);
    fs.writeFileSync(filePath, html, 'utf8');

    return {
      success: true,
      reportId,
      reportType: 'ASSESSMENT',
      format: 'html',
      filePath,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // 5. تقرير إحصائيات القسم
  // ============================================================
  async generateDepartmentStats(statsData) {
    const reportId = `DEPT-RPT-${Date.now()}`;
    const html = this._buildDepartmentStatsHTML(statsData, reportId);
    const filePath = path.join(this.reportsDir, `${reportId}.html`);
    fs.writeFileSync(filePath, html, 'utf8');

    return {
      success: true,
      reportId,
      reportType: 'DEPARTMENT_STATS',
      format: 'html',
      filePath,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // 6. تقرير CARF الاعتماد
  // ============================================================
  async generateCARFReport(carfData) {
    const reportId = `CARF-RPT-${Date.now()}`;
    const html = this._buildCARFHTML(carfData, reportId);
    const filePath = path.join(this.reportsDir, `${reportId}.html`);
    fs.writeFileSync(filePath, html, 'utf8');

    return {
      success: true,
      reportId,
      reportType: 'CARF',
      format: 'html',
      filePath,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // 7. تقرير العائلة (Family Portal Report)
  // ============================================================
  async generateFamilyReport(familyData) {
    const reportId = `FAM-RPT-${Date.now()}`;
    const html = this._buildFamilyHTML(familyData, reportId);
    const filePath = path.join(this.reportsDir, `${reportId}.html`);
    fs.writeFileSync(filePath, html, 'utf8');

    return {
      success: true,
      reportId,
      reportType: 'FAMILY',
      format: 'html',
      filePath,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // HTML Builders - بناة HTML
  // ============================================================

  _getBaseStyles() {
    return `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Cairo', 'Roboto', sans-serif;
          direction: rtl;
          background: #fff;
          color: #2c3e50;
          font-size: 13px;
          line-height: 1.6;
        }
        .page { width: 210mm; min-height: 297mm; padding: 20mm; margin: 0 auto; background: #fff; }
        .header {
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 3px solid #1a5276; padding-bottom: 15px; margin-bottom: 20px;
        }
        .header-logo { font-size: 28px; font-weight: 700; color: #1a5276; }
        .header-info { text-align: left; font-size: 11px; color: #7f8c8d; }
        .report-title {
          text-align: center; background: #1a5276; color: white;
          padding: 12px; border-radius: 8px; margin: 15px 0; font-size: 16px; font-weight: 700;
        }
        .section { margin: 15px 0; }
        .section-title {
          background: #2980b9; color: white; padding: 8px 15px;
          border-radius: 5px; font-size: 13px; font-weight: 600; margin-bottom: 10px;
        }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0; }
        .info-item { background: #f8f9fa; padding: 8px 12px; border-radius: 5px; border-right: 3px solid #2980b9; }
        .info-label { font-weight: 600; color: #1a5276; font-size: 11px; }
        .info-value { color: #2c3e50; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { background: #1a5276; color: white; padding: 8px; text-align: center; font-size: 12px; }
        td { padding: 7px; border: 1px solid #dee2e6; text-align: center; font-size: 12px; }
        tr:nth-child(even) { background: #f8f9fa; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .badge-danger { background: #f8d7da; color: #721c24; }
        .badge-info { background: #d1ecf1; color: #0c5460; }
        .progress-bar { height: 12px; background: #e9ecef; border-radius: 6px; overflow: hidden; margin: 4px 0; }
        .progress-fill { height: 100%; border-radius: 6px; }
        .footer {
          border-top: 2px solid #1a5276; margin-top: 20px; padding-top: 10px;
          text-align: center; font-size: 10px; color: #7f8c8d;
        }
        .watermark { color: #e0e0e0; font-size: 11px; }
        .signature-area { display: flex; justify-content: space-between; margin-top: 30px; }
        .signature-box { text-align: center; width: 150px; border-top: 1px solid #333; padding-top: 5px; font-size: 11px; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
      </style>
    `;
  }

  _getHeader(reportType, reportId) {
    return `
      <div class="header">
        <div class="header-logo">🏥 ${this.config.organization.nameAr}</div>
        <div class="header-info">
          <div>${this.config.organization.nameEn}</div>
          <div>${this.config.organization.accreditation}</div>
          <div>رقم التقرير: ${reportId}</div>
          <div>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')}</div>
        </div>
      </div>
    `;
  }

  _getFooter() {
    return `
      <div class="footer">
        <p>هذا التقرير صادر إلكترونياً من نظام الأوائل للتأهيل - ${new Date().getFullYear()}</p>
        <p class="watermark">للاستفسار: ${this.config.organization.website}</p>
      </div>
    `;
  }

  _buildIEPHTML(data, reportId) {
    const goals = (data.goals || [])
      .map(
        g => `
      <tr>
        <td>${g.goalId || ''}</td>
        <td style="text-align:right">${g.titleAr || g.title}</td>
        <td>${g.domain || ''}</td>
        <td>${g.targetDate || ''}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${g.progress || 0}%; background:${(g.progress || 0) >= 75 ? '#27ae60' : (g.progress || 0) >= 40 ? '#f39c12' : '#e74c3c'}"></div>
          </div>
          ${g.progress || 0}%
        </td>
        <td><span class="badge ${g.status === 'achieved' ? 'badge-success' : g.status === 'in_progress' ? 'badge-info' : 'badge-warning'}">${g.status === 'achieved' ? 'محقق' : g.status === 'in_progress' ? 'قيد التنفيذ' : 'مخطط'}</span></td>
      </tr>
    `
      )
      .join('');

    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير IEP</title>${this._getBaseStyles()}</head><body>
      <div class="page">
        ${this._getHeader('IEP', reportId)}
        <div class="report-title">📋 خطة التدخل الفردية (IEP) - Individual Education Plan</div>

        <div class="section">
          <div class="section-title">👤 بيانات المستفيد</div>
          <div class="info-grid">
            <div class="info-item"><div class="info-label">الاسم</div><div class="info-value">${data.beneficiaryName || ''}</div></div>
            <div class="info-item"><div class="info-label">رقم الملف</div><div class="info-value">${data.fileNumber || ''}</div></div>
            <div class="info-item"><div class="info-label">تاريخ الميلاد</div><div class="info-value">${data.dateOfBirth || ''}</div></div>
            <div class="info-item"><div class="info-label">التشخيص</div><div class="info-value">${data.diagnosis || ''}</div></div>
            <div class="info-item"><div class="info-label">المعالج المسؤول</div><div class="info-value">${data.therapistName || ''}</div></div>
            <div class="info-item"><div class="info-label">تاريخ بدء الخطة</div><div class="info-value">${data.planDate || ''}</div></div>
            <div class="info-item"><div class="info-label">تاريخ المراجعة</div><div class="info-value">${data.reviewDate || ''}</div></div>
            <div class="info-item"><div class="info-label">حالة الخطة</div><div class="info-value">${data.planStatus || 'نشط'}</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">🎯 الأهداف العلاجية</div>
          <table>
            <thead><tr><th>الرمز</th><th>الهدف</th><th>المجال</th><th>التاريخ المستهدف</th><th>التقدم</th><th>الحالة</th></tr></thead>
            <tbody>${goals}</tbody>
          </table>
        </div>

        ${
          data.strengths
            ? `
        <div class="section">
          <div class="section-title">💪 نقاط القوة</div>
          <p style="padding:10px;background:#f8f9fa;border-radius:5px">${data.strengths}</p>
        </div>`
            : ''
        }

        ${
          data.recommendations
            ? `
        <div class="section">
          <div class="section-title">📌 التوصيات</div>
          <p style="padding:10px;background:#f8f9fa;border-radius:5px">${data.recommendations}</p>
        </div>`
            : ''
        }

        <div class="signature-area">
          <div class="signature-box"><div>${data.therapistName || 'المعالج'}</div><div>توقيع المعالج</div></div>
          <div class="signature-box"><div>${data.supervisorName || 'المشرف'}</div><div>توقيع المشرف</div></div>
          <div class="signature-box"><div>${data.parentName || 'ولي الأمر'}</div><div>توقيع ولي الأمر</div></div>
        </div>

        ${this._getFooter()}
      </div>
    </body></html>`;
  }

  _buildProgressHTML(data, reportId) {
    const sessions = (data.sessions || [])
      .map(
        s => `
      <tr>
        <td>${s.date || ''}</td>
        <td>${s.type || ''}</td>
        <td>${s.duration || ''} دقيقة</td>
        <td>${s.therapist || ''}</td>
        <td><span class="badge ${s.attendance === 'present' ? 'badge-success' : 'badge-danger'}">${s.attendance === 'present' ? 'حضر' : 'غاب'}</span></td>
        <td>${s.progressNotes || ''}</td>
      </tr>
    `
      )
      .join('');

    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير التقدم</title>${this._getBaseStyles()}</head><body>
      <div class="page">
        ${this._getHeader('PROGRESS', reportId)}
        <div class="report-title">📈 تقرير التقدم الدوري - Progress Report</div>

        <div class="section">
          <div class="section-title">📊 ملخص الفترة</div>
          <div class="info-grid">
            <div class="info-item"><div class="info-label">المستفيد</div><div class="info-value">${data.beneficiaryName || ''}</div></div>
            <div class="info-item"><div class="info-label">الفترة</div><div class="info-value">${data.periodFrom || ''} - ${data.periodTo || ''}</div></div>
            <div class="info-item"><div class="info-label">عدد الجلسات</div><div class="info-value">${data.totalSessions || 0}</div></div>
            <div class="info-item"><div class="info-label">نسبة الحضور</div><div class="info-value">${data.attendanceRate || 0}%</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">🎯 تقدم الأهداف</div>
          <table>
            <thead><tr><th>الهدف</th><th>التقدم في البداية</th><th>التقدم الحالي</th><th>التغيير</th></tr></thead>
            <tbody>
              ${(data.goalProgress || [])
                .map(
                  g => `
                <tr>
                  <td style="text-align:right">${g.title}</td>
                  <td>${g.startProgress}%</td>
                  <td>${g.currentProgress}%</td>
                  <td><span class="badge ${g.currentProgress - g.startProgress >= 10 ? 'badge-success' : 'badge-warning'}">+${g.currentProgress - g.startProgress}%</span></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">📅 سجل الجلسات</div>
          <table>
            <thead><tr><th>التاريخ</th><th>النوع</th><th>المدة</th><th>المعالج</th><th>الحضور</th><th>الملاحظات</th></tr></thead>
            <tbody>${sessions}</tbody>
          </table>
        </div>

        ${this._getFooter()}
      </div>
    </body></html>`;
  }

  _buildSessionHTML(data, reportId) {
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير الجلسة</title>${this._getBaseStyles()}</head><body>
      <div class="page">
        ${this._getHeader('SESSION', reportId)}
        <div class="report-title">🗒️ ملاحظات الجلسة العلاجية - Session Notes</div>

        <div class="section">
          <div class="section-title">📋 بيانات الجلسة</div>
          <div class="info-grid">
            <div class="info-item"><div class="info-label">المستفيد</div><div class="info-value">${data.beneficiaryName || ''}</div></div>
            <div class="info-item"><div class="info-label">التاريخ</div><div class="info-value">${data.date || ''}</div></div>
            <div class="info-item"><div class="info-label">المعالج</div><div class="info-value">${data.therapistName || ''}</div></div>
            <div class="info-item"><div class="info-label">نوع الجلسة</div><div class="info-value">${data.sessionType || ''}</div></div>
            <div class="info-item"><div class="info-label">مدة الجلسة</div><div class="info-value">${data.duration || 0} دقيقة</div></div>
            <div class="info-item"><div class="info-label">الحضور</div><div class="info-value"><span class="badge ${data.attendance === 'present' ? 'badge-success' : 'badge-danger'}">${data.attendance === 'present' ? 'حضر' : 'غاب'}</span></div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📝 ملاحظات الجلسة</div>
          <p style="padding:12px;background:#f8f9fa;border-radius:5px;min-height:60px">${data.notes || 'لا توجد ملاحظات'}</p>
        </div>

        ${
          data.objectives && data.objectives.length
            ? `
        <div class="section">
          <div class="section-title">🎯 الأهداف المعالجة</div>
          <table>
            <thead><tr><th>الهدف</th><th>النشاط</th><th>الاستجابة</th><th>التقدم</th></tr></thead>
            <tbody>
              ${data.objectives.map(o => `<tr><td>${o.goal}</td><td>${o.activity || ''}</td><td>${o.response || ''}</td><td>${o.progress || 0}%</td></tr>`).join('')}
            </tbody>
          </table>
        </div>`
            : ''
        }

        <div class="section">
          <div class="section-title">📌 خطة الجلسة القادمة</div>
          <p style="padding:12px;background:#f8f9fa;border-radius:5px">${data.nextSessionPlan || 'لم يُحدد بعد'}</p>
        </div>

        <div class="signature-area">
          <div class="signature-box"><div>${data.therapistName || ''}</div><div>توقيع المعالج</div></div>
          <div class="signature-box"><div></div><div>توقيع المشرف</div></div>
        </div>

        ${this._getFooter()}
      </div>
    </body></html>`;
  }

  _buildAssessmentHTML(data, reportId) {
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير التقييم</title>${this._getBaseStyles()}</head><body>
      <div class="page">
        ${this._getHeader('ASSESSMENT', reportId)}
        <div class="report-title">🔬 تقرير التقييم الشامل - Comprehensive Assessment Report</div>

        <div class="section">
          <div class="section-title">👤 بيانات المستفيد</div>
          <div class="info-grid">
            <div class="info-item"><div class="info-label">الاسم</div><div class="info-value">${data.beneficiaryName || ''}</div></div>
            <div class="info-item"><div class="info-label">العمر</div><div class="info-value">${data.age || ''}</div></div>
            <div class="info-item"><div class="info-label">التشخيص</div><div class="info-value">${data.diagnosis || ''}</div></div>
            <div class="info-item"><div class="info-label">تاريخ التقييم</div><div class="info-value">${data.assessmentDate || ''}</div></div>
            <div class="info-item"><div class="info-label">المقيّم</div><div class="info-value">${data.evaluatorName || ''}</div></div>
            <div class="info-item"><div class="info-label">نوع التقييم</div><div class="info-value">${data.assessmentType || ''}</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📊 نتائج التقييم</div>
          <table>
            <thead><tr><th>المجال</th><th>الأداة المستخدمة</th><th>النتيجة الخام</th><th>المعيار المرجعي</th><th>التصنيف</th></tr></thead>
            <tbody>
              ${(data.results || [])
                .map(
                  r => `
                <tr>
                  <td>${r.domain}</td>
                  <td>${r.tool}</td>
                  <td>${r.rawScore}</td>
                  <td>${r.normativeScore || '-'}</td>
                  <td><span class="badge ${r.classification === 'average' ? 'badge-success' : r.classification === 'below' ? 'badge-warning' : 'badge-info'}">${r.classification}</span></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">💡 التوصيات</div>
          <ul style="padding:12px 25px;background:#f8f9fa;border-radius:5px">
            ${(data.recommendations || []).map(r => `<li style="margin:5px 0">${r}</li>`).join('')}
          </ul>
        </div>

        <div class="signature-area">
          <div class="signature-box"><div>${data.evaluatorName || ''}</div><div>توقيع المقيّم</div></div>
          <div class="signature-box"><div></div><div>توقيع المشرف</div></div>
        </div>

        ${this._getFooter()}
      </div>
    </body></html>`;
  }

  _buildDepartmentStatsHTML(data, reportId) {
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>إحصائيات القسم</title>${this._getBaseStyles()}</head><body>
      <div class="page">
        ${this._getHeader('STATS', reportId)}
        <div class="report-title">📊 تقرير إحصائيات القسم - Department Statistics Report</div>

        <div class="section">
          <div class="section-title">📅 الفترة الزمنية</div>
          <div class="info-grid">
            <div class="info-item"><div class="info-label">من</div><div class="info-value">${data.periodFrom || ''}</div></div>
            <div class="info-item"><div class="info-label">إلى</div><div class="info-value">${data.periodTo || ''}</div></div>
            <div class="info-item"><div class="info-label">القسم</div><div class="info-value">${data.department || 'جميع الأقسام'}</div></div>
            <div class="info-item"><div class="info-label">تاريخ الإصدار</div><div class="info-value">${new Date().toLocaleDateString('ar-SA')}</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">👥 المستفيدون</div>
          <div class="info-grid">
            <div class="info-item"><div class="info-label">إجمالي المستفيدين</div><div class="info-value" style="font-size:20px;font-weight:700;color:#1a5276">${data.totalBeneficiaries || 0}</div></div>
            <div class="info-item"><div class="info-label">مستفيدون نشطون</div><div class="info-value" style="font-size:20px;font-weight:700;color:#27ae60">${data.activeBeneficiaries || 0}</div></div>
            <div class="info-item"><div class="info-label">حالات جديدة</div><div class="info-value" style="font-size:20px;font-weight:700;color:#2980b9">${data.newCases || 0}</div></div>
            <div class="info-item"><div class="info-label">حالات أُنهيت</div><div class="info-value" style="font-size:20px;font-weight:700;color:#e74c3c">${data.dischargedCases || 0}</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">🗒️ الجلسات</div>
          <table>
            <thead><tr><th>النوع</th><th>العدد</th><th>المدة الإجمالية (ساعة)</th><th>نسبة الحضور</th></tr></thead>
            <tbody>
              ${(data.sessionStats || []).map(s => `<tr><td>${s.type}</td><td>${s.count}</td><td>${s.totalHours}</td><td>${s.attendanceRate}%</td></tr>`).join('')}
            </tbody>
          </table>
        </div>

        ${this._getFooter()}
      </div>
    </body></html>`;
  }

  _buildCARFHTML(data, reportId) {
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير CARF</title>${this._getBaseStyles()}</head><body>
      <div class="page">
        ${this._getHeader('CARF', reportId)}
        <div class="report-title">🏅 تقرير الاعتماد CARF - Accreditation Report</div>

        <div class="section">
          <div class="section-title">📋 ملخص الامتثال</div>
          <div class="info-grid">
            <div class="info-item"><div class="info-label">نسبة الامتثال الإجمالية</div><div class="info-value" style="font-size:24px;font-weight:700;color:${(data.overallCompliance || 0) >= 90 ? '#27ae60' : '#e74c3c'}">${data.overallCompliance || 0}%</div></div>
            <div class="info-item"><div class="info-label">حالة الاعتماد</div><div class="info-value"><span class="badge ${data.accreditationStatus === 'accredited' ? 'badge-success' : 'badge-warning'}">${data.accreditationStatus || 'قيد المراجعة'}</span></div></div>
            <div class="info-item"><div class="info-label">تاريخ التقييم</div><div class="info-value">${data.evaluationDate || ''}</div></div>
            <div class="info-item"><div class="info-label">تاريخ انتهاء الاعتماد</div><div class="info-value">${data.expiryDate || ''}</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📊 نتائج المعايير</div>
          <table>
            <thead><tr><th>المعيار</th><th>الوصف</th><th>الامتثال</th><th>الحالة</th></tr></thead>
            <tbody>
              ${(data.standards || [])
                .map(
                  s => `
                <tr>
                  <td>${s.code}</td>
                  <td style="text-align:right">${s.description}</td>
                  <td>${s.compliance}%</td>
                  <td><span class="badge ${s.status === 'met' ? 'badge-success' : s.status === 'partial' ? 'badge-warning' : 'badge-danger'}">${s.status === 'met' ? 'مستوفى' : s.status === 'partial' ? 'جزئي' : 'غير مستوفى'}</span></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>

        ${this._getFooter()}
      </div>
    </body></html>`;
  }

  _buildFamilyHTML(data, reportId) {
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير العائلة</title>${this._getBaseStyles()}</head><body>
      <div class="page">
        ${this._getHeader('FAMILY', reportId)}
        <div class="report-title">👨‍👩‍👧 تقرير المتابعة الأسرية - Family Progress Report</div>

        <div class="section">
          <div class="section-title">💛 رسالة للأسرة</div>
          <p style="padding:15px;background:#fffbf0;border-right:4px solid #f39c12;border-radius:5px">
            نشكركم على دعمكم المستمر لـ ${data.beneficiaryName || 'كريمكم/كريمتكم'}.
            نُقدّم لكم هذا التقرير لإطلاعكم على التقدم المُحرز خلال الفترة الماضية.
          </p>
        </div>

        <div class="section">
          <div class="section-title">🌟 إنجازات الفترة</div>
          <ul style="padding:12px 25px;background:#f0fff0;border-radius:5px">
            ${(data.achievements || []).map(a => `<li style="margin:8px 0;color:#155724">✅ ${a}</li>`).join('')}
          </ul>
        </div>

        <div class="section">
          <div class="section-title">🏠 توصيات المنزل</div>
          <ul style="padding:12px 25px;background:#f8f9fa;border-radius:5px">
            ${(data.homeRecommendations || []).map(r => `<li style="margin:8px 0">📌 ${r}</li>`).join('')}
          </ul>
        </div>

        <div class="section">
          <div class="section-title">📅 المواعيد القادمة</div>
          <table>
            <thead><tr><th>التاريخ</th><th>الوقت</th><th>النوع</th><th>المعالج</th></tr></thead>
            <tbody>
              ${(data.upcomingSessions || []).map(s => `<tr><td>${s.date}</td><td>${s.time}</td><td>${s.type}</td><td>${s.therapist}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>

        ${this._getFooter()}
      </div>
    </body></html>`;
  }

  // ============================================================
  // استرجاع التقرير
  // ============================================================
  getReport(reportId) {
    const files = fs.readdirSync(this.reportsDir);
    const reportFile = files.find(f => f.startsWith(reportId));
    if (!reportFile) return { success: false, error: 'التقرير غير موجود' };

    const filePath = path.join(this.reportsDir, reportFile);
    const content = fs.readFileSync(filePath, 'utf8');
    return { success: true, reportId, content, filePath };
  }

  // حذف تقرير
  deleteReport(reportId) {
    const files = fs.readdirSync(this.reportsDir);
    const reportFile = files.find(f => f.startsWith(reportId));
    if (reportFile) fs.unlinkSync(path.join(this.reportsDir, reportFile));
    return { success: true, message: 'تم حذف التقرير' };
  }

  // قائمة التقارير
  listReports() {
    const files = fs.readdirSync(this.reportsDir);
    return {
      success: true,
      reports: files.map(f => ({
        name: f,
        type: f.split('-')[0],
        createdAt: fs.statSync(path.join(this.reportsDir, f)).birthtime,
      })),
      count: files.length,
    };
  }

  // تنظيف التقارير القديمة
  cleanOldReports(daysOld = 30) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 3600000);
    const files = fs.readdirSync(this.reportsDir);
    let deleted = 0;
    files.forEach(f => {
      const filePath = path.join(this.reportsDir, f);
      const stat = fs.statSync(filePath);
      if (stat.birthtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    });
    return { success: true, deleted, message: `تم حذف ${deleted} تقرير قديم` };
  }
}

module.exports = new PDFReportGenerator();
module.exports.PDFReportGenerator = PDFReportGenerator;
module.exports.REPORT_CONFIG = REPORT_CONFIG;
