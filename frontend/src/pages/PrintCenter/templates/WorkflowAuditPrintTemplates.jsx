/**
 * قوالب سير العمل والتدقيق والتوقيع الإلكتروني — Workflow, Audit & E-Sign Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const WORKFLOW_AUDIT_TEMPLATES = [
  /* ── سير العمل ── */
  { id: 'workflow-request', name: 'طلب سير عمل', nameEn: 'Workflow Request', desc: 'نموذج طلب موافقة إلكتروني', color: '#6a1b9a' },
  { id: 'workflow-approval-log', name: 'سجل الموافقات', nameEn: 'Approval Log', desc: 'سجل الموافقات الإلكترونية', color: '#7b1fa2' },
  { id: 'delegation-authority', name: 'تفويض صلاحية', nameEn: 'Delegation of Authority', desc: 'نموذج تفويض الصلاحيات', color: '#8e24aa' },
  /* ── التدقيق الداخلي ── */
  { id: 'audit-plan', name: 'خطة تدقيق داخلي', nameEn: 'Internal Audit Plan', desc: 'خطة التدقيق الداخلي', color: '#4a148c' },
  { id: 'audit-report', name: 'تقرير تدقيق داخلي', nameEn: 'Internal Audit Report', desc: 'تقرير التدقيق الداخلي', color: '#5c2d91' },
  { id: 'audit-finding', name: 'ملاحظة تدقيق', nameEn: 'Audit Finding', desc: 'نموذج ملاحظة مراجعة', color: '#6a3ea1' },
  { id: 'corrective-action-req', name: 'طلب إجراء تصحيحي', nameEn: 'Corrective Action Request', desc: 'نموذج الإجراء التصحيحي', color: '#7e57c2' },
  { id: 'management-review', name: 'محضر مراجعة إدارية', nameEn: 'Management Review', desc: 'محضر اجتماع المراجعة الإدارية', color: '#9575cd' },
  { id: 'audit-checklist', name: 'قائمة فحص التدقيق', nameEn: 'Audit Checklist', desc: 'قائمة فحص للتدقيق الداخلي', color: '#512da8' },
  /* ── التوقيع الإلكتروني والوثائق ── */
  { id: 'esign-certificate', name: 'شهادة توقيع إلكتروني', nameEn: 'E-Sign Certificate', desc: 'شهادة التوقيع الإلكتروني', color: '#00695c' },
  { id: 'document-control-log', name: 'سجل ضبط الوثائق', nameEn: 'Document Control Log', desc: 'سجل ضبط الوثائق', color: '#00796b' },
  { id: 'document-change-notice', name: 'إشعار تغيير وثيقة', nameEn: 'Document Change Notice', desc: 'إشعار تعديل الوثيقة', color: '#00897b' },
  { id: 'document-review-form', name: 'نموذج مراجعة وثيقة', nameEn: 'Document Review Form', desc: 'نموذج مراجعة واعتماد الوثائق', color: '#009688' },
  { id: 'archive-request', name: 'طلب أرشفة', nameEn: 'Archive Request', desc: 'طلب أرشفة وثائق', color: '#26a69a' },
  { id: 'document-destruction', name: 'محضر إتلاف وثائق', nameEn: 'Document Destruction', desc: 'محضر إتلاف وثائق منتهية', color: '#4db6ac' },
  { id: 'sop-template', name: 'نموذج إجراء عمل', nameEn: 'SOP Template', desc: 'نموذج إجراء تشغيل موحد SOP', color: '#00bfa5' },
  { id: 'policy-approval', name: 'اعتماد سياسة', nameEn: 'Policy Approval', desc: 'نموذج اعتماد السياسات', color: '#1de9b6' },
  { id: 'compliance-checklist', name: 'قائمة فحص الامتثال', nameEn: 'Compliance Checklist', desc: 'قائمة فحص الالتزام والامتثال', color: '#64ffda' },
];

export const WorkflowAuditTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'workflow-request':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج طلب موافقة إلكتروني" subtitle="Workflow Approval Request" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="مقدم الطلب" value={d.requester} w="30%" /><Field label="القسم" value={d.department} w="25%" /><Field label="نوع الطلب" value={d.requestType} w="25%" /><Field label="الأولوية" value={d.priority} w="15%" /></div>
            <NotesBox label="تفاصيل الطلب" value={d.details} lines={3} />
            <NotesBox label="المبرر" value={d.justification} lines={2} />
            <Section title="مسار الموافقة">
              <EmptyTable cols={5} rows={5} headers={['المرحلة', 'المعتمد', 'الحالة', 'التاريخ', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مقدم الطلب" leftLabel="المعتمد النهائي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'workflow-approval-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الموافقات الإلكترونية" subtitle="Workflow Approval Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="القسم" value={d.department} w="25%" /><Field label="إجمالي الطلبات" value={d.totalRequests} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="سجل الطلبات">
              <EmptyTable cols={7} rows={12} headers={['رقم الطلب', 'النوع', 'مقدم الطلب', 'المعتمد', 'الحالة', 'التاريخ', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'delegation-authority':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تفويض الصلاحيات" subtitle="Delegation of Authority" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="المفوِّض">
              <div style={fieldRow}><Field label="الاسم" value={d.delegatorName} w="35%" /><Field label="المنصب" value={d.delegatorTitle} w="30%" /><Field label="القسم" value={d.delegatorDept} w="25%" /></div>
            </Section>
            <Section title="المفوَّض إليه">
              <div style={fieldRow}><Field label="الاسم" value={d.delegateeName} w="35%" /><Field label="المنصب" value={d.delegateeTitle} w="30%" /><Field label="القسم" value={d.delegateeDept} w="25%" /></div>
            </Section>
            <NotesBox label="الصلاحيات المفوضة" value={d.authorities} lines={3} />
            <div style={fieldRow}><Field label="من تاريخ" value={formatDate(d.fromDate)} w="25%" /><Field label="إلى تاريخ" value={formatDate(d.toDate)} w="25%" /><Field label="السبب" value={d.reason} w="40%" /></div>
            <NotesBox label="قيود واستثناءات" value={d.restrictions} lines={2} />
            <SignatureBlock rightLabel="المفوِّض" leftLabel="المفوَّض إليه" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'audit-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التدقيق الداخلي" subtitle="Internal Audit Plan" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="سنة التدقيق" value={d.auditYear} w="20%" /><Field label="المدقق الرئيسي" value={d.leadAuditor} w="30%" /><Field label="الفترة" value={d.period} w="25%" /></div>
            <Section title="جدول التدقيق">
              <EmptyTable cols={6} rows={10} headers={['القسم/العملية', 'نطاق التدقيق', 'فريق التدقيق', 'التاريخ المخطط', 'المدة', 'ملاحظات']} />
            </Section>
            <NotesBox label="الأهداف العامة" value={d.objectives} lines={2} />
            <NotesBox label="المنهجية" value={d.methodology} lines={2} />
            <SignatureBlock rightLabel="مدير التدقيق" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'audit-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التدقيق الداخلي" subtitle="Internal Audit Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم المدقق" value={d.auditedDept} w="30%" /><Field label="المدقق" value={d.auditor} w="25%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <NotesBox label="النطاق" value={d.scope} lines={2} />
            <NotesBox label="المنهجية" value={d.methodology} lines={1} />
            <Section title="نتائج التدقيق">
              <EmptyTable cols={5} rows={8} headers={['الملاحظة', 'المخاطرة', 'الأولوية', 'التوصية', 'رد الإدارة']} />
            </Section>
            <NotesBox label="الملخص التنفيذي" value={d.executiveSummary} lines={3} />
            <NotesBox label="التوصيات العامة" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="المدقق الرئيسي" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'audit-finding':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج ملاحظة تدقيق" subtitle="Audit Finding" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الملاحظة" value={d.findingNo} w="15%" /><Field label="التدقيق" value={d.auditRef} w="25%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الأولوية" value={d.priority} w="15%" /><Field label="النوع" value={d.findingType} w="15%" /></div>
            <NotesBox label="وصف الملاحظة" value={d.description} lines={3} />
            <NotesBox label="المعيار/المرجع" value={d.criteria} lines={1} />
            <NotesBox label="الأثر" value={d.impact} lines={2} />
            <NotesBox label="السبب الجذري" value={d.rootCause} lines={2} />
            <NotesBox label="التوصية" value={d.recommendation} lines={2} />
            <NotesBox label="رد الإدارة" value={d.managementResponse} lines={2} />
            <div style={fieldRow}><Field label="الموعد المستهدف" value={formatDate(d.targetDate)} w="25%" /><Field label="المسؤول" value={d.responsible} w="25%" /></div>
            <SignatureBlock rightLabel="المدقق" leftLabel="مدير القسم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'corrective-action-req':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج الإجراء التصحيحي" subtitle="Corrective Action Request (CAR)" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم CAR" value={d.carNo} w="15%" /><Field label="المصدر" value={d.source} w="20%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الأولوية" value={d.priority} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="وصف عدم المطابقة" value={d.nonConformity} lines={3} />
            <NotesBox label="تحليل السبب الجذري" value={d.rootCauseAnalysis} lines={3} />
            <Section title="خطة الإجراءات التصحيحية">
              <EmptyTable cols={5} rows={5} headers={['الإجراء', 'المسؤول', 'الموعد', 'الحالة', 'ملاحظات']} />
            </Section>
            <NotesBox label="التحقق من الفعالية" value={d.effectivenessVerification} lines={2} />
            <SignatureBlock rightLabel="مقدم الطلب" leftLabel="مدير الجودة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'management-review':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر اجتماع المراجعة الإدارية" subtitle="Management Review Minutes" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="رئيس الاجتماع" value={d.chairman} w="30%" /><Field label="الحضور" value={d.attendeesCount} w="15%" /></div>
            <Section title="مدخلات المراجعة">
              <EmptyTable cols={3} rows={6} headers={['البند', 'الملخص', 'ملاحظات']} />
            </Section>
            <Section title="القرارات والتوصيات">
              <EmptyTable cols={4} rows={6} headers={['القرار/التوصية', 'المسؤول', 'الموعد', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملخص عام" value={d.summary} lines={2} />
            <SignatureBlock rightLabel="رئيس الاجتماع" leftLabel="محرر المحضر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'audit-checklist':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة فحص التدقيق الداخلي" subtitle="Internal Audit Checklist" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="25%" /><Field label="المعيار" value={d.standard} w="25%" /><Field label="المدقق" value={d.auditor} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="بنود الفحص">
              <EmptyTable cols={5} rows={15} headers={['م', 'البند/السؤال', 'مطابق', 'غير مطابق', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="نسبة المطابقة" value={d.complianceRate} w="25%" /><Field label="التقييم العام" value={d.overallRating} w="25%" /></div>
            <SignatureBlock rightLabel="المدقق" leftLabel="مدير القسم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'esign-certificate':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة التوقيع الإلكتروني" subtitle="Electronic Signature Certificate" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', margin: '20px 0', padding: 16, border: '3px solid #00695c', borderRadius: 12, background: '#e0f2f1' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#00695c', marginBottom: 12 }}>شهادة توثيق التوقيع الإلكتروني</div>
              <div style={fieldRow}><Field label="الموقِّع" value={d.signerName} w="35%" /><Field label="المنصب" value={d.signerTitle} w="30%" /><Field label="القسم" value={d.department} w="25%" /></div>
              <div style={fieldRow}><Field label="المستند" value={d.documentTitle} w="40%" /><Field label="رقم المستند" value={d.documentNo} w="20%" /><Field label="تاريخ التوقيع" value={formatDate(d.signDate) || today()} w="20%" /></div>
              <div style={fieldRow}><Field label="رمز التحقق" value={d.verificationCode} w="30%" /><Field label="خوارزمية التشفير" value={d.algorithm || 'SHA-256'} w="25%" /><Field label="الحالة" value={d.status || 'صالح'} w="15%" /></div>
            </div>
            <div style={{ fontSize: 10, textAlign: 'center', color: '#666', marginTop: 12 }}>
              هذه الشهادة تثبت أن التوقيع الإلكتروني أعلاه صادر من صاحبه وهو توقيع معتمد وفقاً لسياسة التوقيع الإلكتروني المعمول بها.
            </div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'document-control-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل ضبط الوثائق" subtitle="Document Control Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="25%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="المسؤول" value={d.controller} w="25%" /></div>
            <Section title="سجل الوثائق">
              <EmptyTable cols={7} rows={12} headers={['رمز الوثيقة', 'العنوان', 'الإصدار', 'تاريخ الإصدار', 'المعد', 'المعتمد', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الوثائق" leftLabel="مدير الجودة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'document-change-notice':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إشعار تغيير وثيقة" subtitle="Document Change Notice" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رمز الوثيقة" value={d.docCode} w="20%" /><Field label="عنوان الوثيقة" value={d.docTitle} w="40%" /><Field label="الإصدار الحالي" value={d.currentVersion} w="15%" /><Field label="الإصدار الجديد" value={d.newVersion} w="15%" /></div>
            <NotesBox label="وصف التغيير" value={d.changeDescription} lines={3} />
            <NotesBox label="سبب التغيير" value={d.changeReason} lines={2} />
            <NotesBox label="الأقسام المتأثرة" value={d.affectedDepts} lines={1} />
            <div style={fieldRow}><Field label="تاريخ السريان" value={formatDate(d.effectiveDate)} w="25%" /><Field label="تاريخ الإعداد" value={formatDate(d.date) || today()} w="25%" /></div>
            <SignatureBlock rightLabel="معد التغيير" leftLabel="المعتمد" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'document-review-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج مراجعة واعتماد الوثائق" subtitle="Document Review Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رمز الوثيقة" value={d.docCode} w="20%" /><Field label="العنوان" value={d.docTitle} w="40%" /><Field label="الإصدار" value={d.version} w="10%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مراحل المراجعة">
              <EmptyTable cols={5} rows={5} headers={['المرحلة', 'المراجع', 'النتيجة', 'التاريخ', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.comments} lines={2} />
            <SignatureBlock rightLabel="المراجع" leftLabel="المعتمد" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'archive-request':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب أرشفة وثائق" subtitle="Archive Request" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="مقدم الطلب" value={d.requester} w="30%" /><Field label="القسم" value={d.department} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="الوثائق المطلوب أرشفتها">
              <EmptyTable cols={5} rows={8} headers={['رمز الوثيقة', 'العنوان', 'النوع', 'فترة الحفظ', 'ملاحظات']} />
            </Section>
            <NotesBox label="سبب الأرشفة" value={d.reason} lines={2} />
            <SignatureBlock rightLabel="مقدم الطلب" leftLabel="مسؤول الأرشيف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'document-destruction':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر إتلاف وثائق منتهية" subtitle="Document Destruction Record" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="اللجنة" value={d.committee} w="40%" /><Field label="طريقة الإتلاف" value={d.method} w="25%" /></div>
            <Section title="الوثائق المتلفة">
              <EmptyTable cols={5} rows={8} headers={['رمز الوثيقة', 'العنوان', 'فترة الحفظ', 'سبب الإتلاف', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <div style={{ fontWeight: 700, marginTop: 16, fontSize: 12 }}>أعضاء اللجنة:</div>
            <SignatureBlock rightLabel="رئيس اللجنة" leftLabel="العضو الأول" />
            <SignatureBlock rightLabel="العضو الثاني" leftLabel="مسؤول الأرشيف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'sop-template':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إجراء تشغيل موحد" subtitle="Standard Operating Procedure (SOP)" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم SOP" value={d.sopNo} w="15%" /><Field label="العنوان" value={d.title} w="40%" /><Field label="الإصدار" value={d.version} w="10%" /><Field label="القسم" value={d.department} w="20%" /></div>
            <div style={fieldRow}><Field label="المعد" value={d.preparedBy} w="25%" /><Field label="المراجع" value={d.reviewedBy} w="25%" /><Field label="المعتمد" value={d.approvedBy} w="25%" /><Field label="تاريخ السريان" value={formatDate(d.effectiveDate)} w="20%" /></div>
            <NotesBox label="الغرض" value={d.purpose} lines={2} />
            <NotesBox label="النطاق" value={d.scope} lines={2} />
            <NotesBox label="التعريفات" value={d.definitions} lines={2} />
            <NotesBox label="المسؤوليات" value={d.responsibilities} lines={2} />
            <Section title="خطوات الإجراء">
              <EmptyTable cols={4} rows={10} headers={['م', 'الخطوة', 'المسؤول', 'ملاحظات']} />
            </Section>
            <NotesBox label="المرفقات/النماذج" value={d.attachments} lines={1} />
            <SignatureBlock rightLabel="المعد" leftLabel="المعتمد" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'policy-approval':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج اعتماد السياسات" subtitle="Policy Approval Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السياسة" value={d.policyTitle} w="40%" /><Field label="الرقم" value={d.policyNo} w="15%" /><Field label="الإصدار" value={d.version} w="10%" /><Field label="القسم" value={d.department} w="20%" /></div>
            <NotesBox label="ملخص السياسة" value={d.summary} lines={3} />
            <NotesBox label="نطاق التطبيق" value={d.scope} lines={2} />
            <Section title="مراحل الاعتماد">
              <EmptyTable cols={5} rows={4} headers={['المرحلة', 'المسؤول', 'القرار', 'التاريخ', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="تاريخ السريان" value={formatDate(d.effectiveDate)} w="25%" /><Field label="تاريخ المراجعة القادمة" value={formatDate(d.nextReviewDate)} w="25%" /></div>
            <SignatureBlock rightLabel="معد السياسة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'compliance-checklist':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة فحص الالتزام والامتثال" subtitle="Compliance Checklist" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="25%" /><Field label="المعيار/اللائحة" value={d.standard} w="35%" /><Field label="المدقق" value={d.auditor} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="بنود الامتثال">
              <EmptyTable cols={5} rows={15} headers={['م', 'متطلب الامتثال', 'ملتزم', 'غير ملتزم', 'الإجراء المطلوب']} />
            </Section>
            <div style={fieldRow}><Field label="نسبة الامتثال" value={d.complianceRate} w="20%" /><Field label="التقييم" value={d.rating} w="20%" /></div>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="المدقق" leftLabel="مدير القسم" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
