/**
 * قوالب البوابات والتوجيهات والمستودعات والتدريب والأداء
 * Portals, Directives, Warehouse, Training & Performance Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const PORTALS_DIRECTIVES_TEMPLATES = [
  /* ── البوابات ── */
  { id: 'parent-portal-report', name: 'تقرير بوابة ولي الأمر', nameEn: 'Parent Portal Report', desc: 'تقرير بوابة ولي الأمر', color: '#1565c0' },
  { id: 'employee-portal-summary', name: 'ملخص بوابة الموظف', nameEn: 'Employee Portal Summary', desc: 'ملخص بوابة الموظف الذاتية', color: '#1976d2' },
  { id: 'guardian-access-log', name: 'سجل دخول أولياء الأمور', nameEn: 'Guardian Access Log', desc: 'سجل دخول أولياء الأمور للبوابة', color: '#1e88e5' },
  { id: 'portal-feedback', name: 'ملاحظات البوابة', nameEn: 'Portal Feedback', desc: 'نموذج ملاحظات مستخدمي البوابة', color: '#2196f3' },
  /* ── التوجيهات والتعاميم ── */
  { id: 'admin-circular', name: 'تعميم إداري', nameEn: 'Administrative Circular', desc: 'تعميم إداري رسمي', color: '#880e4f' },
  { id: 'executive-directive', name: 'توجيه تنفيذي', nameEn: 'Executive Directive', desc: 'توجيه تنفيذي من الإدارة', color: '#ad1457' },
  { id: 'memo-internal', name: 'مذكرة داخلية', nameEn: 'Internal Memo', desc: 'مذكرة داخلية رسمية', color: '#c2185b' },
  { id: 'announcement', name: 'إعلان رسمي', nameEn: 'Official Announcement', desc: 'إعلان رسمي عام', color: '#d81b60' },
  /* ── المستودعات ── */
  { id: 'warehouse-receipt', name: 'سند استلام مستودع', nameEn: 'Warehouse Receipt', desc: 'سند استلام بضاعة', color: '#4e342e' },
  { id: 'warehouse-issue', name: 'سند صرف مستودع', nameEn: 'Warehouse Issue Voucher', desc: 'سند صرف من المستودع', color: '#5d4037' },
  { id: 'warehouse-transfer', name: 'تحويل مخزني', nameEn: 'Stock Transfer', desc: 'نموذج تحويل بين المستودعات', color: '#6d4c41' },
  { id: 'physical-count', name: 'محضر جرد فعلي', nameEn: 'Physical Count', desc: 'محضر الجرد الفعلي للمستودع', color: '#795548' },
  { id: 'damaged-goods', name: 'محضر تالف', nameEn: 'Damaged Goods Report', desc: 'محضر بضاعة تالفة', color: '#8d6e63' },
  /* ── التدريب ── */
  { id: 'training-plan', name: 'خطة تدريب', nameEn: 'Training Plan', desc: 'خطة التدريب السنوية', color: '#00695c' },
  { id: 'training-request', name: 'طلب تدريب', nameEn: 'Training Request', desc: 'نموذج طلب دورة تدريبية', color: '#00796b' },
  { id: 'training-evaluation', name: 'تقييم دورة تدريبية', nameEn: 'Training Evaluation', desc: 'نموذج تقييم الدورة التدريبية', color: '#00897b' },
  { id: 'training-cert', name: 'شهادة حضور تدريب', nameEn: 'Training Certificate', desc: 'شهادة حضور دورة تدريبية', color: '#009688' },
  { id: 'training-needs', name: 'تحليل احتياجات تدريبية', nameEn: 'Training Needs Analysis', desc: 'تحليل الاحتياجات التدريبية', color: '#26a69a' },
  /* ── الأداء ── */
  { id: 'performance-appraisal', name: 'تقييم أداء وظيفي', nameEn: 'Performance Appraisal', desc: 'نموذج تقييم الأداء الوظيفي', color: '#4a148c' },
  { id: 'performance-pip', name: 'خطة تحسين أداء', nameEn: 'PIP Plan', desc: 'خطة تحسين الأداء PIP', color: '#6a1b9a' },
  { id: 'performance-goals', name: 'أهداف أداء', nameEn: 'Performance Goals', desc: 'نموذج تحديد أهداف الأداء', color: '#7b1fa2' },
  { id: 'peer-review', name: 'تقييم الأقران', nameEn: 'Peer Review', desc: 'نموذج تقييم الأقران 360', color: '#8e24aa' },
  { id: 'probation-review', name: 'تقييم فترة التجربة', nameEn: 'Probation Review', desc: 'نموذج تقييم فترة التجربة', color: '#9c27b0' },
];

export const PortalsDirectivesTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'parent-portal-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير بوابة ولي الأمر" subtitle="Parent Portal Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="ولي الأمر" value={d.parentName} w="30%" /><Field label="المستفيد" value={d.beneficiary} w="30%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="ملخص التقدم">
              <EmptyTable cols={4} rows={6} headers={['المجال', 'الهدف', 'نسبة الإنجاز', 'ملاحظات']} />
            </Section>
            <Section title="سجل الحضور">
              <EmptyTable cols={4} rows={4} headers={['الأسبوع', 'أيام الحضور', 'أيام الغياب', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات المعلم/المعالج" value={d.teacherNotes} lines={2} />
            <NotesBox label="توصيات للمنزل" value={d.homeRecommendations} lines={2} />
            <SignatureBlock rightLabel="المعلم/المعالج" leftLabel="مدير البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'employee-portal-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص بوابة الموظف الذاتية" subtitle="Employee Self-Service Portal Summary" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف" value={d.employeeName} w="30%" /><Field label="الرقم الوظيفي" value={d.empNo} w="15%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="ملخص الإجازات">
              <EmptyTable cols={5} rows={4} headers={['نوع الإجازة', 'الرصيد', 'المستخدم', 'المتبقي', 'معلقة']} />
            </Section>
            <Section title="الطلبات الأخيرة">
              <EmptyTable cols={5} rows={5} headers={['نوع الطلب', 'التاريخ', 'الحالة', 'المعتمد', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="ساعات العمل الإضافي" value={d.overtime} w="25%" /><Field label="أيام الغياب" value={d.absentDays} w="20%" /><Field label="التأخيرات" value={d.lateArrivals} w="20%" /></div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'guardian-access-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل دخول أولياء الأمور للبوابة" subtitle="Guardian Portal Access Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي عمليات الدخول" value={d.totalLogins} w="20%" /><Field label="المستخدمون النشطون" value={d.activeUsers} w="20%" /></div>
            <Section title="سجل الدخول">
              <EmptyTable cols={5} rows={12} headers={['ولي الأمر', 'المستفيد', 'التاريخ/الوقت', 'الصفحات المزارة', 'المدة']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'portal-feedback':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج ملاحظات مستخدمي البوابة" subtitle="Portal User Feedback" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستخدم" value={d.userName} w="30%" /><Field label="النوع" value={d.userType} w="15%" /><Field label="البوابة" value={d.portal} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="التقييم العام" value={d.overallRating} w="20%" /><Field label="سهولة الاستخدام" value={d.usability} w="20%" /><Field label="السرعة" value={d.speed} w="15%" /></div>
            <NotesBox label="ملاحظات إيجابية" value={d.positives} lines={2} />
            <NotesBox label="نقاط التحسين" value={d.improvements} lines={2} />
            <NotesBox label="اقتراحات" value={d.suggestions} lines={2} />
            <SignatureBlock rightLabel="المستخدم" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ التوجيهات ══════════════ */
    case 'admin-circular':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تعميم إداري" subtitle="Administrative Circular" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم التعميم" value={d.circularNo} w="20%" /><Field label="الموضوع" value={d.subject} w="50%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <div style={fieldRow}><Field label="الموجه إلى" value={d.addressedTo || 'جميع الأقسام والإدارات'} w="50%" /><Field label="تاريخ السريان" value={formatDate(d.effectiveDate)} w="25%" /></div>
            <NotesBox label="نص التعميم" value={d.content} lines={8} />
            <NotesBox label="المرفقات" value={d.attachments} lines={1} />
            <SignatureBlock rightLabel="المدير العام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'executive-directive':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توجيه تنفيذي" subtitle="Executive Directive" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم التوجيه" value={d.directiveNo} w="15%" /><Field label="الموضوع" value={d.subject} w="45%" /><Field label="الأولوية" value={d.priority} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="من" value={d.fromEntity} w="30%" /><Field label="إلى" value={d.toEntity} w="30%" /><Field label="تاريخ التنفيذ" value={formatDate(d.executionDate)} w="20%" /></div>
            <NotesBox label="نص التوجيه" value={d.content} lines={6} />
            <NotesBox label="المخرجات المطلوبة" value={d.expectedOutputs} lines={2} />
            <SignatureBlock rightLabel="المدير العام" leftLabel="مستلم التوجيه" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'memo-internal':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مذكرة داخلية" subtitle="Internal Memo" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="من" value={d.from} w="30%" /><Field label="إلى" value={d.to} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="الموضوع" value={d.subject} w="60%" /><Field label="السرية" value={d.confidentiality} w="15%" /></div>
            <NotesBox label="المحتوى" value={d.content} lines={8} />
            <NotesBox label="المرفقات" value={d.attachments} lines={1} />
            <SignatureBlock rightLabel="المرسل" leftLabel="المستلم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'announcement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إعلان رسمي" subtitle="Official Announcement" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', margin: '20px 0', padding: 16, border: '2px solid #d81b60', borderRadius: 12, background: '#fce4ec' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#d81b60', marginBottom: 12 }}>📢 إعلان</div>
              <div style={fieldRow}><Field label="الموضوع" value={d.subject} w="60%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
              <NotesBox label="" value={d.content} lines={6} />
              <div style={fieldRow}><Field label="الموجه إلى" value={d.addressedTo || 'جميع منسوبي المركز'} w="50%" /><Field label="صالح حتى" value={formatDate(d.validUntil)} w="25%" /></div>
            </div>
            <SignatureBlock rightLabel="المدير العام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ المستودعات ══════════════ */
    case 'warehouse-receipt':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سند استلام مستودع" subtitle="Warehouse Goods Receipt" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم السند" value={d.receiptNo} w="15%" /><Field label="المورد" value={d.supplier} w="25%" /><Field label="رقم أمر الشراء" value={d.poNo} w="15%" /><Field label="المستودع" value={d.warehouse} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="المواد المستلمة">
              <EmptyTable cols={6} rows={8} headers={['الصنف', 'الوحدة', 'الكمية المطلوبة', 'الكمية المستلمة', 'الحالة', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات الاستلام" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="أمين المستودع" leftLabel="المستلم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'warehouse-issue':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سند صرف من المستودع" subtitle="Warehouse Issue Voucher" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم السند" value={d.issueNo} w="15%" /><Field label="الطالب" value={d.requester} w="25%" /><Field label="القسم" value={d.department} w="20%" /><Field label="المستودع" value={d.warehouse} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="المواد المصروفة">
              <EmptyTable cols={5} rows={8} headers={['الصنف', 'الوحدة', 'الكمية المطلوبة', 'الكمية المصروفة', 'ملاحظات']} />
            </Section>
            <NotesBox label="الغرض" value={d.purpose} lines={1} />
            <SignatureBlock rightLabel="أمين المستودع" leftLabel="المستلم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'warehouse-transfer':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تحويل بين المستودعات" subtitle="Inter-Warehouse Stock Transfer" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم التحويل" value={d.transferNo} w="15%" /><Field label="من مستودع" value={d.fromWarehouse} w="25%" /><Field label="إلى مستودع" value={d.toWarehouse} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="المواد المحولة">
              <EmptyTable cols={5} rows={8} headers={['الصنف', 'الوحدة', 'الكمية', 'الحالة', 'ملاحظات']} />
            </Section>
            <NotesBox label="سبب التحويل" value={d.reason} lines={1} />
            <SignatureBlock rightLabel="المرسل" leftLabel="المستلم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'physical-count':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر الجرد الفعلي" subtitle="Physical Inventory Count" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستودع" value={d.warehouse} w="25%" /><Field label="تاريخ الجرد" value={formatDate(d.date) || today()} w="15%" /><Field label="اللجنة" value={d.committee} w="35%" /></div>
            <Section title="نتائج الجرد">
              <EmptyTable cols={6} rows={15} headers={['الصنف', 'الرصيد الدفتري', 'الرصيد الفعلي', 'الفرق (+/-)', 'النسبة', 'ملاحظات']} />
            </Section>
            <NotesBox label="أسباب الفروقات" value={d.varianceReasons} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="رئيس اللجنة" leftLabel="أمين المستودع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'damaged-goods':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر بضاعة تالفة" subtitle="Damaged Goods Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستودع" value={d.warehouse} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="المكتشف" value={d.discoveredBy} w="25%" /></div>
            <Section title="المواد التالفة">
              <EmptyTable cols={5} rows={6} headers={['الصنف', 'الكمية', 'سبب التلف', 'القيمة التقديرية', 'الإجراء المقترح']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="أمين المستودع" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ التدريب ══════════════ */
    case 'training-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التدريب السنوية" subtitle="Annual Training Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السنة" value={d.year} w="15%" /><Field label="المعد" value={d.preparedBy} w="25%" /><Field label="إجمالي البرامج" value={d.totalPrograms} w="15%" /><Field label="الميزانية" value={d.budget} w="20%" /></div>
            <Section title="البرامج التدريبية">
              <EmptyTable cols={7} rows={12} headers={['البرنامج', 'القسم', 'المشاركون', 'المدة', 'مقدم التدريب', 'التاريخ', 'التكلفة']} />
            </Section>
            <NotesBox label="أولويات التدريب" value={d.priorities} lines={2} />
            <SignatureBlock rightLabel="مدير التدريب" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'training-request':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب دورة تدريبية" subtitle="Training Request Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف" value={d.employeeName} w="30%" /><Field label="القسم" value={d.department} w="20%" /><Field label="المسمى" value={d.jobTitle} w="25%" /></div>
            <div style={fieldRow}><Field label="الدورة" value={d.courseName} w="40%" /><Field label="الجهة المنفذة" value={d.provider} w="30%" /><Field label="المدة" value={d.duration} w="15%" /></div>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.courseDate)} w="20%" /><Field label="التكلفة" value={d.cost} w="15%" /><Field label="المكان" value={d.location} w="25%" /></div>
            <NotesBox label="مبرر التدريب" value={d.justification} lines={2} />
            <NotesBox label="المخرجات المتوقعة" value={d.expectedOutcomes} lines={2} />
            <SignatureBlock rightLabel="الموظف" leftLabel="المدير المباشر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'training-evaluation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم الدورة التدريبية" subtitle="Training Evaluation Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الدورة" value={d.courseName} w="40%" /><Field label="المدرب" value={d.trainer} w="25%" /><Field label="التاريخ" value={formatDate(d.date)} w="15%" /></div>
            <div style={fieldRow}><Field label="المتدرب" value={d.trainee} w="30%" /><Field label="القسم" value={d.department} w="20%" /></div>
            <Section title="التقييم">
              <EmptyTable cols={4} rows={8} headers={['المعيار', 'ممتاز', 'جيد', 'ضعيف']} />
            </Section>
            <NotesBox label="أبرز ما تعلمته" value={d.keyLearnings} lines={2} />
            <NotesBox label="كيف ستطبقه في العمل" value={d.applicationPlan} lines={2} />
            <NotesBox label="ملاحظات عامة" value={d.generalNotes} lines={2} />
            <SignatureBlock rightLabel="المتدرب" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'training-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة حضور دورة تدريبية" subtitle="Training Attendance Certificate" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', margin: '30px auto', padding: 24, border: '3px solid #00695c', borderRadius: 16, maxWidth: 500, background: '#e0f2f1' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#00695c', marginBottom: 16 }}>شهادة حضور</div>
              <p style={{ fontSize: 13, lineHeight: 2 }}>يشهد مركز الأوائل لتأهيل ذوي الإعاقة بأن</p>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#004d40', margin: '12px 0' }}>{d.traineeName || '____________________'}</div>
              <p style={{ fontSize: 13, lineHeight: 2 }}>قد أتمّ بنجاح الدورة التدريبية:</p>
              <div style={{ fontSize: 14, fontWeight: 700, margin: '8px 0' }}>{d.courseName || '____________________'}</div>
              <div style={fieldRow}><Field label="المدة" value={d.duration} w="30%" /><Field label="التاريخ" value={formatDate(d.date)} w="30%" /><Field label="الساعات" value={d.hours} w="20%" /></div>
            </div>
            <SignatureBlock rightLabel="المدرب" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'training-needs':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحليل الاحتياجات التدريبية" subtitle="Training Needs Analysis" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="25%" /><Field label="المدير" value={d.manager} w="25%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="الفجوات المهارية">
              <EmptyTable cols={5} rows={8} headers={['المهارة', 'المستوى الحالي', 'المستوى المطلوب', 'الفجوة', 'عدد الموظفين']} />
            </Section>
            <Section title="البرامج التدريبية المقترحة">
              <EmptyTable cols={5} rows={6} headers={['البرنامج', 'المستهدفون', 'الأولوية', 'التكلفة التقديرية', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المدير المباشر" leftLabel="مدير التدريب" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ الأداء ══════════════ */
    case 'performance-appraisal':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تقييم الأداء الوظيفي" subtitle="Performance Appraisal Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف" value={d.employeeName} w="30%" /><Field label="الرقم" value={d.empNo} w="10%" /><Field label="المسمى" value={d.jobTitle} w="20%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="أهداف الأداء">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'الوزن %', 'المستهدف', 'الإنجاز', 'التقييم']} />
            </Section>
            <Section title="الكفاءات السلوكية">
              <EmptyTable cols={4} rows={5} headers={['الكفاءة', 'الوصف', 'التقييم', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="المعدل العام" value={d.overallRating} w="20%" /><Field label="التصنيف" value={d.classification} w="20%" /></div>
            <NotesBox label="نقاط القوة" value={d.strengths} lines={2} />
            <NotesBox label="نقاط التطوير" value={d.developmentAreas} lines={2} />
            <SignatureBlock rightLabel="المدير المباشر" leftLabel="الموظف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'performance-pip':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة تحسين الأداء PIP" subtitle="Performance Improvement Plan" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف" value={d.employeeName} w="30%" /><Field label="القسم" value={d.department} w="20%" /><Field label="المسمى" value={d.jobTitle} w="20%" /><Field label="المدة" value={d.planDuration} w="15%" /></div>
            <NotesBox label="ملخص مشكلة الأداء" value={d.performanceIssue} lines={2} />
            <Section title="أهداف التحسين">
              <EmptyTable cols={5} rows={5} headers={['الهدف', 'المعيار', 'الإطار الزمني', 'الدعم المطلوب', 'طريقة القياس']} />
            </Section>
            <NotesBox label="عواقب عدم التحسن" value={d.consequences} lines={2} />
            <Section title="جلسات المتابعة">
              <EmptyTable cols={4} rows={4} headers={['التاريخ', 'التقدم', 'ملاحظات', 'الخطوة التالية']} />
            </Section>
            <SignatureBlock rightLabel="الموظف" leftLabel="المدير المباشر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'performance-goals':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تحديد أهداف الأداء" subtitle="Performance Goal Setting" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف" value={d.employeeName} w="30%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="المدير" value={d.manager} w="25%" /></div>
            <Section title="الأهداف (SMART)">
              <EmptyTable cols={6} rows={6} headers={['الهدف', 'المؤشر', 'المستهدف', 'الوزن %', 'الموعد النهائي', 'ملاحظات']} />
            </Section>
            <NotesBox label="خطة التطوير المهني" value={d.developmentPlan} lines={2} />
            <SignatureBlock rightLabel="الموظف" leftLabel="المدير المباشر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'peer-review':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تقييم الأقران 360°" subtitle="360° Peer Review" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف المقيَّم" value={d.evaluatedEmployee} w="30%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <div style={{ fontSize: 11, color: '#666', margin: '8px 0' }}>ملاحظة: هذا التقييم سري ولن يُفصح عن هوية المقيِّم.</div>
            <Section title="معايير التقييم">
              <EmptyTable cols={4} rows={8} headers={['المعيار', 'ممتاز (5)', 'جيد (3)', 'يحتاج تطوير (1)']} />
            </Section>
            <NotesBox label="نقاط القوة الملاحظة" value={d.strengths} lines={2} />
            <NotesBox label="نقاط التطوير المقترحة" value={d.developmentAreas} lines={2} />
            <NotesBox label="ملاحظات إضافية" value={d.additionalComments} lines={2} />
          </div>
          <OrgFooter />
        </div>
      );

    case 'probation-review':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم فترة التجربة" subtitle="Probation Period Review" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف" value={d.employeeName} w="30%" /><Field label="المسمى" value={d.jobTitle} w="20%" /><Field label="القسم" value={d.department} w="20%" /><Field label="تاريخ التعيين" value={formatDate(d.hireDate)} w="20%" /></div>
            <div style={fieldRow}><Field label="بداية التجربة" value={formatDate(d.probationStart)} w="20%" /><Field label="نهاية التجربة" value={formatDate(d.probationEnd)} w="20%" /><Field label="المدة" value={d.duration} w="15%" /></div>
            <Section title="معايير التقييم">
              <EmptyTable cols={4} rows={6} headers={['المعيار', 'ممتاز', 'مرضي', 'غير مرضي']} />
            </Section>
            <NotesBox label="ملاحظات المشرف" value={d.supervisorNotes} lines={2} />
            <div style={fieldRow}><Field label="القرار" value={d.decision} w="30%" /><Field label="تاريخ القرار" value={formatDate(d.decisionDate) || today()} w="20%" /></div>
            <SignatureBlock rightLabel="المدير المباشر" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
