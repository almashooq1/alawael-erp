/**
 * قوالب الميزات الذكية والموافقات
 * Smart Features & Approvals Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const SMART_FEATURES_APPROVALS_TEMPLATES = [
  { id: 'approval-workflow-map', name: 'خريطة سير الموافقات', nameEn: 'Approval Workflow Map', desc: 'خريطة مراحل سير الموافقات', color: '#1565c0' },
  { id: 'pending-approvals-report', name: 'تقرير الموافقات المعلقة', nameEn: 'Pending Approvals Report', desc: 'تقرير الطلبات المعلقة للموافقة', color: '#1976d2' },
  { id: 'approval-delegation', name: 'تفويض صلاحية موافقة', nameEn: 'Approval Delegation Form', desc: 'نموذج تفويض صلاحية الموافقة', color: '#1e88e5' },
  { id: 'sla-compliance-report', name: 'تقرير التزام SLA', nameEn: 'SLA Compliance Report', desc: 'تقرير الالتزام بمستويات الخدمة', color: '#2196f3' },
  { id: 'escalation-log', name: 'سجل التصعيدات', nameEn: 'Escalation Log', desc: 'سجل التصعيدات وتجاوز الصلاحيات', color: '#c62828' },
  { id: 'smart-notification-config', name: 'إعداد الإشعارات الذكية', nameEn: 'Smart Notification Config', desc: 'توثيق إعدادات الإشعارات', color: '#6a1b9a' },
  { id: 'digital-signature-log', name: 'سجل التوقيع الرقمي', nameEn: 'Digital Signature Log', desc: 'سجل التوقيعات الرقمية', color: '#7b1fa2' },
  { id: 'auto-routing-rules', name: 'قواعد التوجيه التلقائي', nameEn: 'Auto-Routing Rules', desc: 'توثيق قواعد التوجيه التلقائي', color: '#00695c' },
  { id: 'batch-approval-report', name: 'تقرير موافقات جماعية', nameEn: 'Batch Approval Report', desc: 'تقرير الموافقات الجماعية', color: '#2e7d32' },
  { id: 'rejection-analysis', name: 'تحليل المرفوضات', nameEn: 'Rejection Analysis Report', desc: 'تحليل أسباب رفض الطلبات', color: '#e65100' },
  { id: 'approval-turnaround', name: 'تقرير زمن المعالجة', nameEn: 'Approval Turnaround Report', desc: 'تقرير متوسط أزمنة المعالجة', color: '#0277bd' },
  { id: 'smart-form-builder', name: 'مُنشئ النماذج الذكية', nameEn: 'Smart Form Builder Config', desc: 'توثيق إعدادات النماذج الذكية', color: '#283593' },
  { id: 'conditional-logic-doc', name: 'توثيق المنطق الشرطي', nameEn: 'Conditional Logic Doc', desc: 'توثيق المنطق الشرطي للنماذج', color: '#303f9f' },
  { id: 'approval-matrix', name: 'مصفوفة الموافقات', nameEn: 'Approval Authority Matrix', desc: 'مصفوفة صلاحيات الموافقة', color: '#455a64' },
  { id: 'smart-reminder-config', name: 'إعداد التذكيرات الذكية', nameEn: 'Smart Reminder Config', desc: 'توثيق إعدادات التذكيرات', color: '#558b2f' },
  { id: 'workflow-performance', name: 'أداء سير العمل', nameEn: 'Workflow Performance Report', desc: 'تقرير أداء عمليات سير العمل', color: '#4527a0' },
];

export const SmartFeaturesApprovalsTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'approval-workflow-map':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خريطة مراحل سير الموافقات" subtitle="Approval Workflow Map" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم العملية" value={d.processName} w="25%" /><Field label="الإصدار" value={d.version} w="10%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مراحل سير العمل">
              <EmptyTable cols={6} rows={8} headers={['المرحلة', 'المسؤول', 'الإجراء', 'المهلة', 'التصعيد', 'ملاحظات']} />
            </Section>
            <NotesBox label="شروط الترقية" value={d.conditions} lines={2} />
            <SignatureBlock rightLabel="مدير العمليات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'pending-approvals-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الموافقات المعلقة" subtitle="Pending Approvals Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="إجمالي المعلقة" value={d.totalPending} w="12%" /></div>
            <Section title="الطلبات المعلقة">
              <EmptyTable cols={6} rows={10} headers={['الطلب', 'مقدم الطلب', 'التاريخ', 'المرحلة', 'بانتظار', 'المدة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير العمليات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'approval-delegation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تفويض صلاحية الموافقة" subtitle="Approval Delegation Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المفوِّض" value={d.delegator} w="25%" /><Field label="المنصب" value={d.delegatorTitle} w="20%" /></div>
            <div style={fieldRow}><Field label="المفوَّض إليه" value={d.delegate} w="25%" /><Field label="المنصب" value={d.delegateTitle} w="20%" /></div>
            <div style={fieldRow}><Field label="من تاريخ" value={formatDate(d.fromDate)} w="15%" /><Field label="إلى تاريخ" value={formatDate(d.toDate)} w="15%" /></div>
            <NotesBox label="نطاق التفويض" value={d.scope} lines={2} />
            <NotesBox label="شروط وقيود" value={d.limitations} lines={2} />
            <SignatureBlock rightLabel="المفوِّض" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'sla-compliance-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الالتزام بمستويات الخدمة" subtitle="SLA Compliance Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="الالتزام بـ SLA">
              <EmptyTable cols={5} rows={8} headers={['العملية', 'المستهدف', 'الفعلي', 'الالتزام %', 'الحالة']} />
            </Section>
            <div style={fieldRow}><Field label="متوسط الالتزام" value={d.avgCompliance} w="15%" /></div>
            <NotesBox label="عمليات خارج النطاق" value={d.breaches} lines={2} />
            <SignatureBlock rightLabel="مدير الجودة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'escalation-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل التصعيدات" subtitle="Escalation Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="التصعيدات">
              <EmptyTable cols={6} rows={8} headers={['التاريخ', 'الطلب', 'السبب', 'المُصعد إليه', 'القرار', 'المدة']} />
            </Section>
            <div style={fieldRow}><Field label="الإجمالي" value={d.total} w="10%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير العمليات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'smart-notification-config':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق إعدادات الإشعارات الذكية" subtitle="Smart Notification Configuration" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النظام" value={d.system} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="قواعد الإشعارات">
              <EmptyTable cols={6} rows={8} headers={['الحدث', 'القناة', 'المستلم', 'التوقيت', 'التكرار', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'digital-signature-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل التوقيعات الرقمية" subtitle="Digital Signature Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="التوقيعات">
              <EmptyTable cols={6} rows={8} headers={['التاريخ/الوقت', 'المستند', 'الموقّع', 'المنصب', 'التحقق', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="الإجمالي" value={d.total} w="10%" /></div>
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'auto-routing-rules':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق قواعد التوجيه التلقائي" subtitle="Auto-Routing Rules Documentation" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النظام" value={d.system} w="20%" /><Field label="الإصدار" value={d.version} w="10%" /></div>
            <Section title="القواعد">
              <EmptyTable cols={5} rows={8} headers={['القاعدة', 'الشرط', 'التوجيه إلى', 'الأولوية', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مدير العمليات" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'batch-approval-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الموافقات الجماعية" subtitle="Batch Approval Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="المعتمد" value={d.approver} w="20%" /></div>
            <Section title="الطلبات المعتمدة جماعياً">
              <EmptyTable cols={5} rows={8} headers={['الطلب', 'النوع', 'مقدم الطلب', 'المبلغ', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="الإجمالي" value={d.total} w="10%" /></div>
            <SignatureBlock rightLabel="المعتمد" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'rejection-analysis':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحليل أسباب رفض الطلبات" subtitle="Rejection Analysis Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="إجمالي المرفوضة" value={d.totalRejected} w="12%" /><Field label="نسبة الرفض" value={d.rejectionRate} w="12%" /></div>
            <Section title="أسباب الرفض">
              <EmptyTable cols={4} rows={8} headers={['السبب', 'العدد', 'النسبة %', 'الإجراء التصحيحي']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="محلل العمليات" leftLabel="مدير العمليات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'approval-turnaround':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير متوسط أزمنة المعالجة" subtitle="Approval Turnaround Time Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="أزمنة المعالجة">
              <EmptyTable cols={5} rows={8} headers={['العملية', 'الأدنى', 'المتوسط', 'الأقصى', 'المستهدف']} />
            </Section>
            <NotesBox label="عمليات بطيئة" value={d.slowProcesses} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={1} />
            <SignatureBlock rightLabel="محلل العمليات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'smart-form-builder':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق إعدادات النماذج الذكية" subtitle="Smart Form Builder Configuration" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النموذج" value={d.formName} w="25%" /><Field label="الإصدار" value={d.version} w="10%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الحقول">
              <EmptyTable cols={6} rows={10} headers={['الحقل', 'النوع', 'إلزامي', 'التحقق', 'القيمة الافتراضية', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مصمم النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'conditional-logic-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق المنطق الشرطي للنماذج" subtitle="Conditional Logic Documentation" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النموذج" value={d.formName} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="القواعد الشرطية">
              <EmptyTable cols={5} rows={8} headers={['#', 'إذا (الشرط)', 'ثم (الإجراء)', 'وإلا', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المطور" leftLabel="محلل الأعمال" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'approval-matrix':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مصفوفة صلاحيات الموافقة" subtitle="Approval Authority Matrix" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الإصدار" value={d.version} w="10%" /><Field label="تاريخ الاعتماد" value={formatDate(d.approvalDate)} w="15%" /></div>
            <Section title="المصفوفة">
              <EmptyTable cols={6} rows={10} headers={['نوع الطلب', 'الحد الأدنى', 'الحد الأقصى', 'المعتمد', 'البديل', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير العمليات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'smart-reminder-config':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق إعدادات التذكيرات الذكية" subtitle="Smart Reminder Configuration" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النظام" value={d.system} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="قواعد التذكير">
              <EmptyTable cols={5} rows={8} headers={['الحدث', 'قبل (أيام)', 'التكرار', 'القناة', 'المستلم']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'workflow-performance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أداء عمليات سير العمل" subtitle="Workflow Performance Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="أداء العمليات">
              <EmptyTable cols={6} rows={8} headers={['العملية', 'مكتمل', 'معلق', 'متوسط الزمن', 'كفاءة %', 'ملاحظات']} />
            </Section>
            <NotesBox label="عقبات" value={d.bottlenecks} lines={2} />
            <NotesBox label="توصيات" value={d.recommendations} lines={1} />
            <SignatureBlock rightLabel="محلل العمليات" leftLabel="مدير العمليات" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
