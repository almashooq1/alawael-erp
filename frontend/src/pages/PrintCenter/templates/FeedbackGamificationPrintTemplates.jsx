/**
 * قوالب التغذية الراجعة والتلعيب
 * Feedback, Surveys & Gamification Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const FEEDBACK_GAMIFICATION_TEMPLATES = [
  { id: 'feedback-form', name: 'نموذج التغذية الراجعة', nameEn: 'Feedback Form', desc: 'نموذج تغذية راجعة عام', color: '#6a1b9a' },
  { id: 'employee-survey', name: 'استبيان الموظفين', nameEn: 'Employee Survey', desc: 'استبيان رضا الموظفين', color: '#7b1fa2' },
  { id: 'patient-satisfaction', name: 'استبيان رضا المرضى', nameEn: 'Patient Satisfaction Survey', desc: 'استبيان رضا المرضى والمستفيدين', color: '#8e24aa' },
  { id: 'suggestion-form', name: 'نموذج اقتراح', nameEn: 'Suggestion Form', desc: 'نموذج تقديم اقتراح', color: '#9c27b0' },
  { id: 'complaint-form', name: 'نموذج شكوى', nameEn: 'Complaint Form', desc: 'نموذج تقديم شكوى رسمية', color: '#c62828' },
  { id: 'complaint-resolution', name: 'حل الشكوى', nameEn: 'Complaint Resolution Report', desc: 'تقرير حل ومعالجة الشكوى', color: '#d32f2f' },
  { id: 'survey-results-report', name: 'نتائج الاستبيان', nameEn: 'Survey Results Report', desc: 'تقرير نتائج وتحليل الاستبيان', color: '#1565c0' },
  { id: 'nps-report', name: 'تقرير NPS', nameEn: 'Net Promoter Score Report', desc: 'تقرير صافي نقاط الترويج', color: '#0d47a1' },
  { id: 'gamification-rules', name: 'قواعد التلعيب', nameEn: 'Gamification Rules Document', desc: 'وثيقة قواعد وآليات التلعيب', color: '#e65100' },
  { id: 'gamification-leaderboard', name: 'لوحة المتصدرين', nameEn: 'Gamification Leaderboard', desc: 'لوحة ترتيب المتصدرين', color: '#ef6c00' },
  { id: 'achievement-badge', name: 'شارة إنجاز', nameEn: 'Achievement Badge Certificate', desc: 'شهادة شارة إنجاز', color: '#f57c00' },
  { id: 'points-statement', name: 'كشف النقاط', nameEn: 'Points Statement', desc: 'كشف حساب نقاط الموظف', color: '#ff8f00' },
  { id: 'reward-catalog', name: 'كتالوج المكافآت', nameEn: 'Reward Catalog', desc: 'كتالوج المكافآت المتاحة', color: '#2e7d32' },
  { id: 'engagement-report', name: 'تقرير المشاركة', nameEn: 'Engagement Report', desc: 'تقرير مشاركة وتفاعل الموظفين', color: '#00695c' },
  { id: 'feedback-analysis', name: 'تحليل التغذية الراجعة', nameEn: 'Feedback Analysis Report', desc: 'تقرير تحليل التغذية الراجعة', color: '#4527a0' },
  { id: 'gamification-impact', name: 'أثر التلعيب', nameEn: 'Gamification Impact Report', desc: 'تقرير أثر التلعيب على الأداء', color: '#283593' },
];

export const FeedbackGamificationTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'feedback-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج التغذية الراجعة" subtitle="Feedback Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="من" value={d.fromName} w="30%" /><Field label="إلى" value={d.toName} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <div style={fieldRow}><Field label="الموضوع" value={d.subject} w="50%" /><Field label="النوع" value={d.type} w="25%" /></div>
            <NotesBox label="التغذية الراجعة" value={d.feedback} lines={6} />
            <NotesBox label="المقترحات" value={d.suggestions} lines={3} />
            <SignatureBlock rightLabel="المقدّم" leftLabel="المستلم" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'employee-survey':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="استبيان رضا الموظفين" subtitle="Employee Satisfaction Survey" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الاسم (اختياري)" value={d.name} w="30%" /><Field label="القسم" value={d.department} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="محاور الاستبيان">
              <EmptyTable cols={5} rows={8} headers={['المحور', 'ممتاز', 'جيد', 'مقبول', 'ضعيف']} />
            </Section>
            <NotesBox label="تعليقات إضافية" value={d.comments} lines={4} />
            <SignatureBlock rightLabel="المشارك" leftLabel="قسم الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'patient-satisfaction':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="استبيان رضا المرضى" subtitle="Patient Satisfaction Survey" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="القسم" value={d.department} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="محاور التقييم">
              <EmptyTable cols={5} rows={8} headers={['المحور', 'ممتاز', 'جيد', 'مقبول', 'ضعيف']} />
            </Section>
            <NotesBox label="تعليقات" value={d.comments} lines={4} />
            <SignatureBlock rightLabel="المريض/المستفيد" leftLabel="الموظف المسؤول" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'suggestion-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج اقتراح" subtitle="Suggestion Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المقترِح" value={d.suggestedBy} w="30%" /><Field label="القسم" value={d.department} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <div style={fieldRow}><Field label="عنوان الاقتراح" value={d.title} w="50%" /><Field label="الأولوية" value={d.priority} w="20%" /></div>
            <NotesBox label="تفاصيل الاقتراح" value={d.details} lines={5} />
            <NotesBox label="الفائدة المتوقعة" value={d.expectedBenefit} lines={3} />
            <SignatureBlock rightLabel="مقدّم الاقتراح" leftLabel="المسؤول" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'complaint-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج شكوى" subtitle="Complaint Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="مقدّم الشكوى" value={d.complainant} w="30%" /><Field label="النوع" value={d.type} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <div style={fieldRow}><Field label="الجهة المشتكى عنها" value={d.against} w="40%" /><Field label="الأولوية" value={d.priority} w="20%" /></div>
            <NotesBox label="تفاصيل الشكوى" value={d.details} lines={6} />
            <NotesBox label="الحل المطلوب" value={d.requestedResolution} lines={3} />
            <SignatureBlock rightLabel="مقدّم الشكوى" leftLabel="المستلم" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'complaint-resolution':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حل الشكوى" subtitle="Complaint Resolution Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم الشكوى" value={d.complaintNo} w="20%" /><Field label="التاريخ" value={formatDate(d.complaintDate)} w="20%" /><Field label="المسؤول" value={d.handler} w="30%" /></div>
            <Section title="إجراءات المعالجة">
              <EmptyTable cols={4} rows={5} headers={['الإجراء', 'التاريخ', 'المسؤول', 'النتيجة']} />
            </Section>
            <NotesBox label="الحل النهائي" value={d.resolution} lines={4} />
            <SignatureBlock rightLabel="المعالج" leftLabel="مدير الجودة" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'survey-results-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نتائج الاستبيان" subtitle="Survey Results Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="عنوان الاستبيان" value={d.surveyTitle} w="40%" /><Field label="عدد المشاركين" value={d.participants} w="20%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="النتائج">
              <EmptyTable cols={5} rows={8} headers={['المحور', 'ممتاز %', 'جيد %', 'مقبول %', 'ضعيف %']} />
            </Section>
            <Section title="نتائج بارزة">
              <EmptyTable cols={3} rows={4} headers={['النتيجة', 'التفاصيل', 'التوصية']} />
            </Section>
            <SignatureBlock rightLabel="محلل البيانات" leftLabel="مدير الجودة" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'nps-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير صافي نقاط الترويج" subtitle="NPS Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="عدد الردود" value={d.responses} w="20%" /><Field label="نقاط NPS" value={d.npsScore} w="20%" /></div>
            <Section title="التوزيع">
              <EmptyTable cols={4} rows={4} headers={['الفئة', 'العدد', 'النسبة', 'ملاحظات']} />
            </Section>
            <NotesBox label="التحليل والتوصيات" value={d.analysis} lines={4} />
            <SignatureBlock rightLabel="المحلل" leftLabel="مدير المشروع" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'gamification-rules':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قواعد وآليات التلعيب" subtitle="Gamification Rules Document" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="البرنامج" value={d.programName} w="35%" /><Field label="الإصدار" value={d.version} w="15%" /><Field label="تاريخ السريان" value={formatDate(d.effectiveDate)} w="20%" /></div>
            <Section title="آليات كسب النقاط">
              <EmptyTable cols={4} rows={6} headers={['النشاط', 'النقاط', 'الحد الأقصى', 'ملاحظات']} />
            </Section>
            <Section title="مستويات الشارات">
              <EmptyTable cols={4} rows={4} headers={['الشارة', 'المتطلب', 'المكافأة', 'المدة']} />
            </Section>
            <SignatureBlock rightLabel="مصمم البرنامج" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'gamification-leaderboard':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="لوحة المتصدرين" subtitle="Gamification Leaderboard" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="عدد المشاركين" value={d.participants} w="20%" /></div>
            <Section title="ترتيب المتصدرين">
              <EmptyTable cols={6} rows={10} headers={['الترتيب', 'الموظف', 'القسم', 'النقاط', 'الشارات', 'المستوى']} />
            </Section>
            <SignatureBlock rightLabel="منسق البرنامج" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'achievement-badge':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة شارة إنجاز" subtitle="Achievement Badge Certificate" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الموظف" value={d.employeeName} w="30%" /><Field label="القسم" value={d.department} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <div style={fieldRow}><Field label="الشارة" value={d.badgeName} w="30%" /><Field label="المستوى" value={d.level} w="20%" /><Field label="النقاط" value={d.points} w="20%" /></div>
            <NotesBox label="الإنجاز" value={d.achievement} lines={3} />
            <SignatureBlock rightLabel="منسق البرنامج" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'points-statement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="كشف حساب النقاط" subtitle="Points Statement" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الموظف" value={d.employeeName} w="30%" /><Field label="الرصيد" value={d.balance} w="20%" /><Field label="الفترة" value={d.period} w="25%" /></div>
            <Section title="حركات النقاط">
              <EmptyTable cols={5} rows={8} headers={['التاريخ', 'الوصف', 'مكتسبة', 'مستبدلة', 'الرصيد']} />
            </Section>
            <SignatureBlock rightLabel="الموظف" leftLabel="منسق البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'reward-catalog':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="كتالوج المكافآت" subtitle="Reward Catalog" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الإصدار" value={d.version} w="15%" /><Field label="تاريخ السريان" value={formatDate(d.effectiveDate)} w="25%" /><Field label="عدد المكافآت" value={d.rewardCount} w="20%" /></div>
            <Section title="المكافآت المتاحة">
              <EmptyTable cols={5} rows={10} headers={['المكافأة', 'الوصف', 'النقاط المطلوبة', 'الكمية', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="منسق البرنامج" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'engagement-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير المشاركة والتفاعل" subtitle="Employee Engagement Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="المعد" value={d.preparedBy} w="30%" /><Field label="نسبة المشاركة" value={d.engagementRate} w="20%" /></div>
            <Section title="مؤشرات المشاركة">
              <EmptyTable cols={5} rows={6} headers={['المؤشر', 'الحالي', 'السابق', 'التغيير', 'الهدف']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="محلل الموارد البشرية" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'feedback-analysis':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحليل التغذية الراجعة" subtitle="Feedback Analysis Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="عدد الردود" value={d.responseCount} w="20%" /><Field label="المحلل" value={d.analyst} w="30%" /></div>
            <Section title="تحليل المحاور">
              <EmptyTable cols={5} rows={6} headers={['المحور', 'إيجابي %', 'محايد %', 'سلبي %', 'التوصية']} />
            </Section>
            <Section title="أبرز المواضيع">
              <EmptyTable cols={3} rows={4} headers={['الموضوع', 'التكرار', 'الإجراء المقترح']} />
            </Section>
            <SignatureBlock rightLabel="المحلل" leftLabel="مدير الجودة" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'gamification-impact':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أثر التلعيب" subtitle="Gamification Impact Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="البرنامج" value={d.programName} w="35%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="مؤشرات الأثر">
              <EmptyTable cols={5} rows={6} headers={['المؤشر', 'قبل التلعيب', 'بعد التلعيب', 'التحسّن', 'ملاحظات']} />
            </Section>
            <NotesBox label="الاستنتاجات والتوصيات" value={d.conclusions} lines={4} />
            <SignatureBlock rightLabel="منسق البرنامج" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    default:
      return <div style={pageWrapper}><OrgHeader title="قالب التغذية الراجعة والتلعيب" /><div style={bodyPad}><p>لا يوجد قالب مطابق</p></div><OrgFooter /></div>;
  }
};
