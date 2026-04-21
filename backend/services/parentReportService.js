/**
 * parentReportService — Monthly progress-report data assembly + PDF render.
 *
 * Parents asked for an archival/shareable report: child info + attendance
 * summary + sessions count + care-plan goal progress + assessment trend.
 * Produced as a PDF they can download, email, or hand to an external
 * specialist.
 *
 * Design:
 *   • assembleReport(inputs) — pure function. Takes the same shapes the
 *     parent-v2 routes already expose (overview / sessions / attendance
 *     / care-plan / assessments) and produces a render-ready document
 *     tree. No I/O. Unit-testable.
 *   • renderPdf(data) — takes the tree, streams a pdfkit PDF and returns
 *     a Buffer. Kept separate so assembleReport can be tested without
 *     invoking pdfkit in Jest.
 *
 * Renderer uses pdfkit (already a backend dep). Arabic rendering needs
 * an RTL-capable font; falls back to Helvetica if the preferred font
 * file isn't present at runtime, so tests pass even without the font.
 */

'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Compute attendance-rate from the /attendance payload shape:
 *   { completed, noShow, cancelled, lateArrival, total } (last 90d).
 */
function attendanceRate(a) {
  if (!a || typeof a !== 'object') return null;
  const settled = (a.completed || 0) + (a.noShow || 0) + (a.cancelled || 0);
  if (settled === 0) return null;
  return Math.round(((a.completed || 0) / settled) * 1000) / 10;
}

function goalProgress(plan) {
  if (!plan) return { total: 0, achieved: 0, inProgress: 0, percentage: null };
  const goals = Array.isArray(plan.goals) ? plan.goals : [];
  const achieved = goals.filter(g => g.status === 'ACHIEVED').length;
  const inProgress = goals.filter(g => g.status === 'IN_PROGRESS').length;
  return {
    total: goals.length,
    achieved,
    inProgress,
    percentage: goals.length > 0 ? Math.round((achieved / goals.length) * 1000) / 10 : null,
  };
}

function latestAssessments(assessments, n = 5) {
  const items = Array.isArray(assessments?.items) ? assessments.items : [];
  return items
    .slice()
    .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0))
    .slice(0, n)
    .map(a => ({
      tool: a.tool || a.toolName || '—',
      date: a.date || a.createdAt || null,
      score: a.score ?? null,
      interpretation: a.interpretation || null,
    }));
}

function displayName(child) {
  if (!child) return '—';
  return (
    child.firstName_ar ||
    child.fullName ||
    `${child.firstName || ''} ${child.lastName || ''}`.trim() ||
    '—'
  );
}

/**
 * Assemble the full report tree. All inputs are optional and shape-
 * defensive — missing sections degrade to empty arrays / null rather
 * than throwing.
 */
function assembleReport({
  child,
  overview,
  attendance,
  carePlan,
  assessments,
  generatedAt = new Date(),
}) {
  return {
    meta: {
      generatedAt: new Date(generatedAt).toISOString(),
      title: 'تقرير تقدّم الطفل',
      titleEn: 'Child Progress Report',
    },
    child: {
      id: child?._id ? String(child._id) : null,
      name: displayName(child),
      beneficiaryNumber: child?.beneficiaryNumber || null,
      dateOfBirth: child?.dateOfBirth || null,
      enrollmentDate: child?.enrollmentDate || null,
      status: child?.status || null,
      disabilityType: child?.disabilityType || null,
    },
    summary: {
      totalSessions: overview?.sessionCount || 0,
      upcomingAppointments: overview?.upcomingCount || 0,
      activeCarePlans: overview?.activeCarePlansCount || 0,
      assessmentsRun: overview?.assessmentsCount || 0,
    },
    attendance: {
      windowDays: 90,
      completed: attendance?.completed || 0,
      noShow: attendance?.noShow || 0,
      cancelled: attendance?.cancelled || 0,
      lateArrival: attendance?.lateArrival || 0,
      ratePct: attendanceRate(attendance),
    },
    carePlan: {
      title: carePlan?.title || null,
      status: carePlan?.status || null,
      startDate: carePlan?.startDate || null,
      ...goalProgress(carePlan),
    },
    recentAssessments: latestAssessments(assessments, 5),
  };
}

/**
 * Render the assembled tree as a PDF Buffer. Uses pdfkit. Falls back
 * to Helvetica when the RTL font file isn't available so the function
 * never fails on a stock install.
 */
function renderPdf(data) {
  // Lazy-require pdfkit so unit tests on assembleReport don't pay the
  // cost of loading the font subsystem.
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  doc.on('data', c => chunks.push(c));

  // Try to register an RTL-capable font shipped with the app; fall
  // back to the built-in Helvetica otherwise.
  const fontCandidates = [
    path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansArabic-Regular.ttf'),
    path.join(__dirname, '..', '..', 'assets', 'fonts', 'NotoSansArabic-Regular.ttf'),
  ];
  for (const f of fontCandidates) {
    try {
      if (fs.existsSync(f)) {
        doc.registerFont('arabic', f);
        doc.font('arabic');
        break;
      }
    } catch {
      /* ignore — keep default font */
    }
  }

  // Header
  doc.fontSize(20).text(data.meta.title, { align: 'right' });
  doc.fontSize(10).fillColor('gray').text(data.meta.titleEn, { align: 'right' });
  doc.fontSize(9).text(`Generated: ${new Date(data.meta.generatedAt).toISOString().slice(0, 10)}`, {
    align: 'right',
  });
  doc.moveDown(1).fillColor('black');

  // Child identity
  doc.fontSize(14).text('بيانات الطفل', { align: 'right' });
  doc.fontSize(11);
  doc.text(`الاسم: ${data.child.name}`, { align: 'right' });
  if (data.child.beneficiaryNumber) {
    doc.text(`رقم المستفيد: ${data.child.beneficiaryNumber}`, { align: 'right' });
  }
  if (data.child.dateOfBirth) {
    doc.text(`تاريخ الميلاد: ${new Date(data.child.dateOfBirth).toISOString().slice(0, 10)}`, {
      align: 'right',
    });
  }
  if (data.child.status) doc.text(`الحالة: ${data.child.status}`, { align: 'right' });
  doc.moveDown(0.8);

  // Summary
  doc.fontSize(14).text('الملخّص', { align: 'right' });
  doc.fontSize(11);
  doc.text(`إجمالي الجلسات: ${data.summary.totalSessions}`, { align: 'right' });
  doc.text(`المواعيد القادمة: ${data.summary.upcomingAppointments}`, { align: 'right' });
  doc.text(`خطط الرعاية النشطة: ${data.summary.activeCarePlans}`, { align: 'right' });
  doc.text(`التقييمات المُجراة: ${data.summary.assessmentsRun}`, { align: 'right' });
  doc.moveDown(0.8);

  // Attendance (90 days)
  doc.fontSize(14).text('الحضور (آخر 90 يوم)', { align: 'right' });
  doc.fontSize(11);
  doc.text(`حضر: ${data.attendance.completed}`, { align: 'right' });
  doc.text(`لم يحضر: ${data.attendance.noShow}`, { align: 'right' });
  doc.text(`أُلغيت: ${data.attendance.cancelled}`, { align: 'right' });
  if (data.attendance.lateArrival) {
    doc.text(`وصول متأخر: ${data.attendance.lateArrival}`, { align: 'right' });
  }
  doc.text(
    `نسبة الحضور: ${data.attendance.ratePct != null ? data.attendance.ratePct + '%' : '—'}`,
    { align: 'right' }
  );
  doc.moveDown(0.8);

  // Care plan
  doc.fontSize(14).text('خطة الرعاية', { align: 'right' });
  doc.fontSize(11);
  if (data.carePlan.title) doc.text(`العنوان: ${data.carePlan.title}`, { align: 'right' });
  doc.text(
    `الأهداف: ${data.carePlan.achieved}/${data.carePlan.total} مُحقّق` +
      (data.carePlan.percentage != null ? ` (${data.carePlan.percentage}%)` : ''),
    { align: 'right' }
  );
  doc.text(`قيد التنفيذ: ${data.carePlan.inProgress}`, { align: 'right' });
  doc.moveDown(0.8);

  // Assessments
  doc.fontSize(14).text('التقييمات الأخيرة', { align: 'right' });
  doc.fontSize(11);
  if (data.recentAssessments.length === 0) {
    doc.fillColor('gray').text('لا توجد تقييمات مسجّلة.', { align: 'right' }).fillColor('black');
  } else {
    for (const a of data.recentAssessments) {
      const datePart = a.date ? new Date(a.date).toISOString().slice(0, 10) : '—';
      const scorePart = a.score != null ? ` — ${a.score}` : '';
      const interpPart = a.interpretation ? ` (${a.interpretation})` : '';
      doc.text(`• ${datePart}: ${a.tool}${scorePart}${interpPart}`, { align: 'right' });
    }
  }

  // Footer disclaimer
  doc.moveDown(1.5);
  doc.fontSize(8).fillColor('gray');
  doc.text(
    'هذا التقرير مستخرج آلياً من نظام مراكز الأوائل. التشخيص السريري مسؤولية الفريق المعالج فقط.',
    { align: 'center' }
  );

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

module.exports = {
  attendanceRate,
  goalProgress,
  latestAssessments,
  displayName,
  assembleReport,
  renderPdf,
};
