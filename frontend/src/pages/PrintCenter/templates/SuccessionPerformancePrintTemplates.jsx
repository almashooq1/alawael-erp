/**
 * قوالب التعاقب الوظيفي وتقييم الأداء
 * Succession Planning & Performance Evaluation Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const SUCCESSION_PERFORMANCE_TEMPLATES = [
  { id: 'succession-plan-doc', name: 'خطة التعاقب الوظيفي', nameEn: 'Succession Plan Document', desc: 'وثيقة خطة التعاقب الوظيفي', color: '#1565c0' },
  { id: 'succession-candidate', name: 'ملف مرشح التعاقب', nameEn: 'Succession Candidate Profile', desc: 'ملف تعريفي لمرشح التعاقب', color: '#0d47a1' },
  { id: 'succession-readiness', name: 'تقييم جاهزية التعاقب', nameEn: 'Succession Readiness Assessment', desc: 'تقييم جاهزية المرشحين للتعاقب', color: '#1976d2' },
  { id: 'talent-pool-report', name: 'تقرير مجموعة المواهب', nameEn: 'Talent Pool Report', desc: 'تقرير المواهب والكفاءات المحتملة', color: '#1e88e5' },
  { id: 'performance-eval-form', name: 'نموذج تقييم الأداء', nameEn: 'Performance Evaluation Form', desc: 'نموذج تقييم الأداء السنوي', color: '#2e7d32' },
  { id: 'performance-goals-form', name: 'نموذج أهداف الأداء', nameEn: 'Performance Goals Form', desc: 'نموذج تحديد أهداف الأداء', color: '#388e3c' },
  { id: 'performance-improvement', name: 'خطة تحسين الأداء', nameEn: 'Performance Improvement Plan', desc: 'خطة تحسين الأداء للموظف', color: '#c62828' },
  { id: 'mid-year-review', name: 'مراجعة نصف سنوية', nameEn: 'Mid-Year Performance Review', desc: 'مراجعة الأداء نصف السنوية', color: '#e65100' },
  { id: 'competency-assessment', name: 'تقييم الكفاءات', nameEn: 'Competency Assessment Form', desc: 'نموذج تقييم الكفاءات الوظيفية', color: '#6a1b9a' },
  { id: '360-feedback-report', name: 'تقرير تغذية 360', nameEn: '360-Degree Feedback Report', desc: 'تقرير التغذية الراجعة 360 درجة', color: '#4527a0' },
  { id: 'development-plan', name: 'خطة تطوير فردية', nameEn: 'Individual Development Plan', desc: 'خطة التطوير الفردية للموظف', color: '#283593' },
  { id: 'performance-ranking', name: 'ترتيب الأداء', nameEn: 'Performance Ranking Report', desc: 'تقرير ترتيب الموظفين حسب الأداء', color: '#37474f' },
  { id: 'leadership-assessment', name: 'تقييم قيادي', nameEn: 'Leadership Assessment Form', desc: 'نموذج تقييم المهارات القيادية', color: '#455a64' },
  { id: 'calibration-session', name: 'جلسة معايرة الأداء', nameEn: 'Calibration Session Report', desc: 'تقرير جلسة معايرة تقييمات الأداء', color: '#00695c' },
  { id: 'reward-recognition', name: 'تقدير ومكافأة', nameEn: 'Reward & Recognition Form', desc: 'نموذج تقدير ومكافأة الأداء المتميز', color: '#0277bd' },
  { id: 'annual-talent-review', name: 'مراجعة المواهب السنوية', nameEn: 'Annual Talent Review', desc: 'المراجعة السنوية الشاملة للمواهب', color: '#bf360c' },
];

export const SuccessionPerformanceTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'succession-plan-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التعاقب الوظيفي" subtitle="Succession Plan Document" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المنصب" value={d.position} w="35%" /><Field label="القسم" value={d.department} w="25%" /><Field label="الإصدار" value={d.version} w="15%" /><Field label="التاريخ" value={formatDate(d.planDate) || today()} w="20%" /></div>
            <Section title="المرشحون للتعاقب">
              <EmptyTable cols={6} rows={6} headers={['المرشح', 'المنصب الحالي', 'الجاهزية', 'الفجوات', 'خطة التطوير', 'الجدول']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={3} />
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'succession-candidate':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملف مرشح التعاقب" subtitle="Succession Candidate Profile" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم المرشح" value={d.candidateName} w="30%" /><Field label="المنصب الحالي" value={d.currentPosition} w="30%" /><Field label="المنصب المستهدف" value={d.targetPosition} w="30%" /></div>
            <div style={fieldRow}><Field label="سنوات الخبرة" value={d.experience} w="20%" /><Field label="الجاهزية" value={d.readiness} w="20%" /><Field label="المقيّم" value={d.evaluator} w="25%" /></div>
            <Section title="الكفاءات">
              <EmptyTable cols={4} rows={6} headers={['الكفاءة', 'المستوى الحالي', 'المطلوب', 'الفجوة']} />
            </Section>
            <Section title="خطة التطوير">
              <EmptyTable cols={4} rows={4} headers={['النشاط', 'المدة', 'المسؤول', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="المقيّم" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'succession-readiness':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم جاهزية التعاقب" subtitle="Succession Readiness Assessment" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المنصب" value={d.position} w="35%" /><Field label="عدد المرشحين" value={d.candidateCount} w="20%" /><Field label="تاريخ التقييم" value={formatDate(d.assessDate) || today()} w="25%" /></div>
            <Section title="تقييم الجاهزية">
              <EmptyTable cols={6} rows={6} headers={['المرشح', 'الجاهزية الآن', 'بعد سنة', 'بعد سنتين', 'التقييم العام', 'ملاحظات']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="لجنة التقييم" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'talent-pool-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مجموعة المواهب" subtitle="Talent Pool Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="عدد المواهب" value={d.talentCount} w="20%" /><Field label="المعد" value={d.preparedBy} w="30%" /></div>
            <Section title="مجموعة المواهب">
              <EmptyTable cols={6} rows={10} headers={['الاسم', 'القسم', 'الأداء', 'الإمكانية', 'التصنيف', 'خطة التطوير']} />
            </Section>
            <SignatureBlock rightLabel="مدير المواهب" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'performance-eval-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تقييم الأداء السنوي" subtitle="Performance Evaluation Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الموظف" value={d.employeeName} w="30%" /><Field label="المنصب" value={d.position} w="25%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="الأهداف والنتائج">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'الوزن', 'المتحقق', 'الدرجة', 'ملاحظات']} />
            </Section>
            <Section title="الكفاءات السلوكية">
              <EmptyTable cols={4} rows={5} headers={['الكفاءة', 'الدرجة', 'أمثلة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="الدرجة النهائية" value={d.finalScore} w="20%" /><Field label="التصنيف" value={d.rating} w="20%" /></div>
            <SignatureBlock rightLabel="المدير المباشر" leftLabel="الموظف" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'performance-goals-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="أهداف الأداء" subtitle="Performance Goals Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الموظف" value={d.employeeName} w="30%" /><Field label="المنصب" value={d.position} w="25%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="الأهداف">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'المؤشر', 'الوزن', 'الموعد', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="الموظف" leftLabel="المدير المباشر" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'performance-improvement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة تحسين الأداء" subtitle="Performance Improvement Plan (PIP)" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الموظف" value={d.employeeName} w="30%" /><Field label="القسم" value={d.department} w="20%" /><Field label="من" value={formatDate(d.startDate)} w="20%" /><Field label="إلى" value={formatDate(d.endDate)} w="20%" /></div>
            <Section title="مجالات التحسين">
              <EmptyTable cols={5} rows={5} headers={['المجال', 'المستوى الحالي', 'المتوقع', 'الإجراء', 'الموعد']} />
            </Section>
            <Section title="جلسات المتابعة">
              <EmptyTable cols={4} rows={4} headers={['التاريخ', 'التقدم', 'الملاحظة', 'التوقيع']} />
            </Section>
            <SignatureBlock rightLabel="الموظف" leftLabel="المدير المباشر" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'mid-year-review':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مراجعة الأداء نصف السنوية" subtitle="Mid-Year Performance Review" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الموظف" value={d.employeeName} w="30%" /><Field label="المنصب" value={d.position} w="25%" /><Field label="التاريخ" value={formatDate(d.reviewDate) || today()} w="20%" /></div>
            <Section title="تقدم الأهداف">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'الوزن', 'التقدم', 'التعليق', 'تعديل']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.generalNotes} lines={3} />
            <SignatureBlock rightLabel="الموظف" leftLabel="المدير المباشر" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'competency-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم الكفاءات الوظيفية" subtitle="Competency Assessment Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الموظف" value={d.employeeName} w="30%" /><Field label="المنصب" value={d.position} w="25%" /><Field label="المقيّم" value={d.assessor} w="25%" /></div>
            <Section title="الكفاءات">
              <EmptyTable cols={5} rows={8} headers={['الكفاءة', 'المطلوب', 'الحالي', 'الفجوة', 'خطة التطوير']} />
            </Section>
            <SignatureBlock rightLabel="المقيّم" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case '360-feedback-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التغذية الراجعة 360 درجة" subtitle="360-Degree Feedback Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الموظف" value={d.employeeName} w="30%" /><Field label="عدد المقيّمين" value={d.evaluatorCount} w="20%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="النتائج حسب البُعد">
              <EmptyTable cols={6} rows={6} headers={['البُعد', 'الذاتي', 'المدير', 'الزملاء', 'المرؤوسين', 'المتوسط']} />
            </Section>
            <Section title="نقاط القوة والتطوير">
              <EmptyTable cols={3} rows={4} headers={['المحور', 'نقاط القوة', 'مجالات التطوير']} />
            </Section>
            <SignatureBlock rightLabel="منسق التقييم" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'development-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التطوير الفردية" subtitle="Individual Development Plan" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الموظف" value={d.employeeName} w="30%" /><Field label="المنصب" value={d.position} w="25%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="أنشطة التطوير">
              <EmptyTable cols={5} rows={6} headers={['النشاط', 'الهدف', 'البدء', 'الانتهاء', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="الموظف" leftLabel="المدير المباشر" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'performance-ranking':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ترتيب الأداء" subtitle="Performance Ranking Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="القسم" value={d.department} w="30%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="عدد الموظفين" value={d.employeeCount} w="20%" /></div>
            <Section title="ترتيب الأداء">
              <EmptyTable cols={6} rows={10} headers={['الترتيب', 'الموظف', 'المنصب', 'الدرجة', 'التصنيف', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المدير المباشر" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'leadership-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم المهارات القيادية" subtitle="Leadership Assessment Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الاسم" value={d.name} w="30%" /><Field label="المنصب" value={d.position} w="25%" /><Field label="المقيّم" value={d.assessor} w="25%" /></div>
            <Section title="المهارات القيادية">
              <EmptyTable cols={5} rows={8} headers={['المهارة', 'الدرجة (1-5)', 'أمثلة', 'نقاط القوة', 'مجالات التطوير']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="المقيّم" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'calibration-session':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جلسة معايرة تقييمات الأداء" subtitle="Calibration Session Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="القسم" value={d.department} w="25%" /><Field label="التاريخ" value={formatDate(d.sessionDate) || today()} w="20%" /><Field label="الميسّر" value={d.facilitator} w="25%" /><Field label="عدد الحضور" value={d.attendeeCount} w="15%" /></div>
            <Section title="نتائج المعايرة">
              <EmptyTable cols={5} rows={8} headers={['الموظف', 'التقييم الأولي', 'التقييم النهائي', 'التغيير', 'السبب']} />
            </Section>
            <NotesBox label="ملاحظات الجلسة" value={d.sessionNotes} lines={3} />
            <SignatureBlock rightLabel="الميسّر" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'reward-recognition':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقدير ومكافأة" subtitle="Reward & Recognition Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الموظف" value={d.employeeName} w="30%" /><Field label="القسم" value={d.department} w="20%" /><Field label="نوع المكافأة" value={d.rewardType} w="25%" /><Field label="القيمة" value={d.value} w="20%" /></div>
            <NotesBox label="سبب التقدير" value={d.reason} lines={3} />
            <NotesBox label="الإنجازات" value={d.achievements} lines={3} />
            <SignatureBlock rightLabel="المدير المباشر" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'annual-talent-review':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="المراجعة السنوية للمواهب" subtitle="Annual Talent Review" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="السنة" value={d.year} w="15%" /><Field label="عدد الموظفين" value={d.totalEmployees} w="20%" /><Field label="المعد" value={d.preparedBy} w="30%" /></div>
            <Section title="مصفوفة الأداء/الإمكانية">
              <EmptyTable cols={5} rows={6} headers={['التصنيف', 'عدد الموظفين', 'النسبة', 'الإجراء', 'ملاحظات']} />
            </Section>
            <Section title="مخاطر المواهب">
              <EmptyTable cols={4} rows={4} headers={['الموظف', 'نوع المخاطرة', 'الأثر', 'الإجراء']} />
            </Section>
            <SignatureBlock rightLabel="مدير المواهب" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    default:
      return <div style={pageWrapper}><OrgHeader title="قالب التعاقب والأداء" /><div style={bodyPad}><p>لا يوجد قالب مطابق</p></div><OrgFooter /></div>;
  }
};
