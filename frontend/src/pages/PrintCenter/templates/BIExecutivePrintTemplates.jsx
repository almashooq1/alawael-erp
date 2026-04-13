/**
 * قوالب ذكاء الأعمال والتقارير التنفيذية والتطوير
 * Business Intelligence, Executive Reports & Development Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const BI_EXECUTIVE_TEMPLATES = [
  /* ── ذكاء الأعمال ── */
  { id: 'bi-executive-summary', name: 'ملخص تنفيذي - BI', nameEn: 'BI Executive Summary', desc: 'ملخص تنفيذي لمؤشرات ذكاء الأعمال', color: '#1a237e' },
  { id: 'kpi-scorecard-detailed', name: 'بطاقة أداء KPI تفصيلية', nameEn: 'Detailed KPI Scorecard', desc: 'بطاقة أداء مؤشرات تفصيلية', color: '#283593' },
  { id: 'trend-analysis-report', name: 'تقرير تحليل الاتجاهات', nameEn: 'Trend Analysis Report', desc: 'تقرير تحليل اتجاهات المؤشرات', color: '#303f9f' },
  { id: 'custom-report-header', name: 'ترويسة تقرير مخصص', nameEn: 'Custom Report Header', desc: 'ترويسة لتقارير مخصصة', color: '#3949ab' },
  { id: 'data-quality-report', name: 'تقرير جودة البيانات', nameEn: 'Data Quality Report', desc: 'تقرير جودة وسلامة البيانات', color: '#3f51b5' },
  /* ── التقارير التنفيذية ── */
  { id: 'ceo-weekly-briefing', name: 'الملخص الأسبوعي للمدير', nameEn: 'CEO Weekly Briefing', desc: 'ملخص أسبوعي للمدير العام', color: '#880e4f' },
  { id: 'board-meeting-report', name: 'تقرير اجتماع مجلس الإدارة', nameEn: 'Board Meeting Report', desc: 'تقرير مقدم لمجلس الإدارة', color: '#ad1457' },
  { id: 'strategic-kpi-report', name: 'تقرير المؤشرات الاستراتيجية', nameEn: 'Strategic KPI Report', desc: 'تقرير مؤشرات الأداء الاستراتيجية', color: '#c2185b' },
  { id: 'operational-dashboard-print', name: 'لوحة القيادة التشغيلية', nameEn: 'Operational Dashboard Print', desc: 'طباعة لوحة القيادة التشغيلية', color: '#d81b60' },
  { id: 'quarterly-review-report', name: 'تقرير المراجعة الربعي', nameEn: 'Quarterly Review Report', desc: 'مراجعة ربعية شاملة للأداء', color: '#e91e63' },
  /* ── التعلم والتطوير ── */
  { id: 'learning-development-plan', name: 'خطة التعلم والتطوير', nameEn: 'Learning & Development Plan', desc: 'خطة التعلم والتطوير المهني', color: '#004d40' },
  { id: 'training-needs-analysis', name: 'تحليل الاحتياجات التدريبية', nameEn: 'Training Needs Analysis', desc: 'تحليل شامل للاحتياجات التدريبية', color: '#00695c' },
  { id: 'competency-assessment-form', name: 'نموذج تقييم الكفاءات', nameEn: 'Competency Assessment', desc: 'نموذج تقييم الكفاءات المهنية', color: '#00796b' },
  { id: 'career-progression-plan', name: 'خطة المسار الوظيفي', nameEn: 'Career Progression Plan', desc: 'خطة التطور الوظيفي للموظف', color: '#00897b' },
  { id: 'learning-path-certificate', name: 'شهادة إتمام مسار تعليمي', nameEn: 'Learning Path Certificate', desc: 'شهادة إتمام مسار تعليمي', color: '#009688' },
  { id: 'mentoring-agreement', name: 'اتفاقية إرشاد مهني', nameEn: 'Mentoring Agreement', desc: 'اتفاقية إرشاد بين مرشد ومتدرب', color: '#26a69a' },
];

export const BIExecutiveTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    /* ══════════════ ذكاء الأعمال ══════════════ */
    case 'bi-executive-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص تنفيذي — ذكاء الأعمال" subtitle="BI Executive Summary" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="المعد" value={d.preparedBy} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مؤشرات الأداء الرئيسية">
              <EmptyTable cols={6} rows={8} headers={['المؤشر', 'المستهدف', 'الفعلي', 'النسبة %', 'الاتجاه', 'الحالة']} />
            </Section>
            <Section title="أبرز المعطيات">
              <EmptyTable cols={3} rows={4} headers={['المعطى', 'القيمة', 'التفسير']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="محلل البيانات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'kpi-scorecard-detailed':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة أداء KPI التفصيلية" subtitle="Detailed KPI Scorecard" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المنظور" value={d.perspective} w="20%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="المؤشرات">
              <EmptyTable cols={8} rows={12} headers={['المؤشر', 'الوزن', 'المستهدف', 'الفعلي', 'الإنجاز %', 'الاتجاه', 'المسؤول', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="المعدل العام" value={d.overallScore} w="15%" /><Field label="التصنيف" value={d.classification} w="15%" /></div>
            <NotesBox label="تحليل الفجوات" value={d.gapAnalysis} lines={2} />
            <SignatureBlock rightLabel="مدير القسم" leftLabel="مدير الأداء" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'trend-analysis-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تحليل الاتجاهات" subtitle="Trend Analysis Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المؤشر" value={d.indicator} w="25%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="التكرار" value={d.frequency} w="15%" /></div>
            <Section title="البيانات التاريخية">
              <EmptyTable cols={5} rows={12} headers={['الفترة', 'القيمة', 'التغير', 'التغير %', 'ملاحظات']} />
            </Section>
            <div style={{ border: '1px dashed #666', borderRadius: 8, height: 150, margin: '15px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#999' }}>[مساحة الرسم البياني]</span>
            </div>
            <NotesBox label="التحليل" value={d.analysis} lines={3} />
            <NotesBox label="التوقعات" value={d.forecast} lines={2} />
            <SignatureBlock rightLabel="المحلل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'custom-report-header':
      return (
        <div style={pageWrapper}>
          <OrgHeader title={d.reportTitle || 'تقرير مخصص'} subtitle={d.reportSubtitle || 'Custom Report'} />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="25%" /><Field label="المعد" value={d.preparedBy} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="التصنيف" value={d.classification} w="15%" /></div>
            <NotesBox label="الملخص التنفيذي" value={d.executiveSummary} lines={5} />
            <Section title="المحتوى">
              <EmptyTable cols={2} rows={10} headers={['البند', 'التفاصيل']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="المعد" leftLabel="المعتمِد" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'data-quality-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير جودة البيانات" subtitle="Data Quality Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النظام" value={d.system} w="25%" /><Field label="قاعدة البيانات" value={d.database} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مقاييس الجودة">
              <EmptyTable cols={5} rows={8} headers={['المقياس', 'الجدول/الكيان', 'النسبة %', 'الحد المقبول %', 'الحالة']} />
            </Section>
            <Section title="المشكلات المكتشفة">
              <EmptyTable cols={4} rows={5} headers={['المشكلة', 'الخطورة', 'التأثير', 'الإجراء']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مسؤول البيانات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ التقارير التنفيذية ══════════════ */
    case 'ceo-weekly-briefing':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="الملخص الأسبوعي للمدير العام" subtitle="CEO Weekly Briefing" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الأسبوع" value={d.week} w="20%" /><Field label="من" value={formatDate(d.fromDate)} w="12%" /><Field label="إلى" value={formatDate(d.toDate)} w="12%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="مؤشرات رئيسية سريعة">
              <EmptyTable cols={4} rows={6} headers={['المؤشر', 'القيمة', 'التغير', 'الحالة']} />
            </Section>
            <NotesBox label="أبرز الإنجازات" value={d.achievements} lines={2} />
            <NotesBox label="التحديات" value={d.challenges} lines={2} />
            <NotesBox label="القرارات المطلوبة" value={d.decisionsNeeded} lines={2} />
            <NotesBox label="الأسبوع القادم" value={d.nextWeek} lines={2} />
          </div>
          <OrgFooter />
        </div>
      );

    case 'board-meeting-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مقدم لمجلس الإدارة" subtitle="Board Meeting Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="ملخص الأداء المالي">
              <EmptyTable cols={4} rows={5} headers={['البند', 'الموازنة', 'الفعلي', 'الانحراف']} />
            </Section>
            <Section title="ملخص الأداء التشغيلي">
              <EmptyTable cols={4} rows={5} headers={['المؤشر', 'المستهدف', 'الفعلي', 'الحالة']} />
            </Section>
            <NotesBox label="القضايا الاستراتيجية" value={d.strategicIssues} lines={2} />
            <NotesBox label="القرارات المطلوبة" value={d.decisionsRequired} lines={2} />
            <SignatureBlock rightLabel="المدير العام" leftLabel="رئيس مجلس الإدارة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'strategic-kpi-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير المؤشرات الاستراتيجية" subtitle="Strategic KPI Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="الأهداف الاستراتيجية" value={d.strategicGoals} w="30%" /></div>
            <Section title="مؤشرات الأداء حسب الهدف">
              <EmptyTable cols={6} rows={10} headers={['الهدف', 'المؤشر', 'المستهدف', 'الفعلي', 'النسبة %', 'التقييم']} />
            </Section>
            <NotesBox label="التحليل الاستراتيجي" value={d.strategicAnalysis} lines={3} />
            <SignatureBlock rightLabel="مدير التخطيط" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'operational-dashboard-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="لوحة القيادة التشغيلية" subtitle="Operational Dashboard" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="المؤشرات التشغيلية">
              <EmptyTable cols={5} rows={10} headers={['المؤشر', 'القيمة الحالية', 'المتوسط', 'الحد الأدنى', 'الحد الأعلى']} />
            </Section>
            <Section title="حالة الأقسام">
              <EmptyTable cols={4} rows={6} headers={['القسم', 'الحالة', 'المؤشر الرئيسي', 'ملاحظات']} />
            </Section>
            <NotesBox label="التنبيهات والإنذارات" value={d.alerts} lines={2} />
          </div>
          <OrgFooter />
        </div>
      );

    case 'quarterly-review-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير المراجعة الربعية الشاملة" subtitle="Quarterly Performance Review" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الربع" value={d.quarter} w="12%" /><Field label="السنة" value={d.year} w="10%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="الأداء المالي">
              <EmptyTable cols={5} rows={5} headers={['البند', 'الموازنة', 'الفعلي', 'الانحراف', 'النسبة']} />
            </Section>
            <Section title="الأداء التشغيلي">
              <EmptyTable cols={5} rows={5} headers={['المؤشر', 'المستهدف', 'الفعلي', 'الإنجاز', 'التقييم']} />
            </Section>
            <Section title="الأداء التأهيلي">
              <EmptyTable cols={4} rows={4} headers={['البرنامج', 'المستفيدون', 'معدل التقدم', 'الرضا']} />
            </Section>
            <NotesBox label="التحديات الرئيسية" value={d.challenges} lines={2} />
            <NotesBox label="خطة الربع القادم" value={d.nextQuarterPlan} lines={2} />
            <SignatureBlock rightLabel="فريق الأداء" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ التعلم والتطوير ══════════════ */
    case 'learning-development-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التعلم والتطوير المهني" subtitle="Learning & Development Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف" value={d.employee} w="25%" /><Field label="المسمى" value={d.jobTitle} w="20%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="الأهداف التطويرية">
              <EmptyTable cols={5} rows={5} headers={['الهدف', 'الكفاءة', 'النشاط', 'الموعد', 'الحالة']} />
            </Section>
            <Section title="البرامج التدريبية المخططة">
              <EmptyTable cols={4} rows={5} headers={['البرنامج', 'المزود', 'التاريخ', 'المدة']} />
            </Section>
            <NotesBox label="موارد التعلم الذاتي" value={d.selfLearning} lines={2} />
            <SignatureBlock rightLabel="الموظف" leftLabel="المدير المباشر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'training-needs-analysis':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحليل الاحتياجات التدريبية" subtitle="Training Needs Analysis" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="25%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="المحلل" value={d.analyst} w="25%" /></div>
            <Section title="الفجوات المحددة">
              <EmptyTable cols={5} rows={8} headers={['الكفاءة', 'المستوى المطلوب', 'المستوى الحالي', 'الفجوة', 'الأولوية']} />
            </Section>
            <Section title="البرامج التدريبية المقترحة">
              <EmptyTable cols={5} rows={5} headers={['البرنامج', 'المستهدفون', 'المزود', 'التكلفة', 'الأولوية']} />
            </Section>
            <div style={fieldRow}><Field label="الميزانية المطلوبة" value={d.budget} w="20%" /></div>
            <SignatureBlock rightLabel="مسؤول التدريب" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'competency-assessment-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تقييم الكفاءات المهنية" subtitle="Professional Competency Assessment" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف" value={d.employee} w="25%" /><Field label="المسمى" value={d.jobTitle} w="20%" /><Field label="المقيِّم" value={d.evaluator} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الكفاءات الأساسية">
              <EmptyTable cols={5} rows={6} headers={['الكفاءة', 'المطلوب (1-5)', 'الفعلي (1-5)', 'الفجوة', 'ملاحظات']} />
            </Section>
            <Section title="الكفاءات التخصصية">
              <EmptyTable cols={5} rows={6} headers={['الكفاءة', 'المطلوب (1-5)', 'الفعلي (1-5)', 'الفجوة', 'ملاحظات']} />
            </Section>
            <NotesBox label="التوصيات التطويرية" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="المقيِّم" leftLabel="الموظف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'career-progression-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التطور الوظيفي" subtitle="Career Progression Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف" value={d.employee} w="25%" /><Field label="المسمى الحالي" value={d.currentTitle} w="20%" /><Field label="المسمى المستهدف" value={d.targetTitle} w="20%" /><Field label="الجدول الزمني" value={d.timeline} w="15%" /></div>
            <Section title="المراحل">
              <EmptyTable cols={5} rows={5} headers={['المرحلة', 'المتطلبات', 'النشاط', 'الفترة', 'الحالة']} />
            </Section>
            <Section title="الكفاءات المطلوبة">
              <EmptyTable cols={4} rows={4} headers={['الكفاءة', 'المستوى المطلوب', 'الحالي', 'خطة التطوير']} />
            </Section>
            <SignatureBlock rightLabel="الموظف" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'learning-path-certificate':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة إتمام مسار تعليمي" subtitle="Learning Path Completion Certificate" />
          <div style={bodyPad}>
            <div style={{ border: '3px double #004d40', borderRadius: 12, padding: 30, margin: '30px 0', textAlign: 'center' }}>
              <h2 style={{ color: '#004d40', marginBottom: 20 }}>شهادة إتمام</h2>
              <p style={{ fontSize: 14, margin: '10px 0' }}>يشهد مركز الأوائل للتأهيل أن</p>
              <div style={fieldRow}><Field label="الموظف" value={d.employee} w="40%" /></div>
              <p style={{ fontSize: 14, margin: '10px 0' }}>قد أتم بنجاح المسار التعليمي</p>
              <div style={fieldRow}><Field label="المسار" value={d.learningPath} w="40%" /></div>
              <div style={fieldRow}><Field label="عدد الساعات" value={d.hours} w="15%" /><Field label="الدرجة" value={d.grade} w="15%" /><Field label="التاريخ" value={formatDate(d.completionDate) || today()} w="15%" /></div>
            </div>
            <SignatureBlock rightLabel="مدير التدريب" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mentoring-agreement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="اتفاقية إرشاد مهني" subtitle="Professional Mentoring Agreement" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المرشد" value={d.mentor} w="25%" /><Field label="منصبه" value={d.mentorTitle} w="20%" /></div>
            <div style={fieldRow}><Field label="المتدرب" value={d.mentee} w="25%" /><Field label="منصبه" value={d.menteeTitle} w="20%" /></div>
            <div style={fieldRow}><Field label="المدة" value={d.duration} w="15%" /><Field label="من" value={formatDate(d.startDate)} w="12%" /><Field label="إلى" value={formatDate(d.endDate)} w="12%" /></div>
            <NotesBox label="أهداف الإرشاد" value={d.objectives} lines={3} />
            <Section title="جدول الاجتماعات المتفق عليه">
              <EmptyTable cols={3} rows={4} headers={['التكرار', 'المدة', 'طريقة الاجتماع']} />
            </Section>
            <NotesBox label="التوقعات المتبادلة" value={d.expectations} lines={2} />
            <SignatureBlock rightLabel="المرشد" leftLabel="المتدرب" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
