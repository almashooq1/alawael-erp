/**
 * قوالب إدارة المخاطر والامتثال
 * Risk Management & Compliance Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const RISK_COMPLIANCE_TEMPLATES = [
  { id: 'risk-register-master', name: 'سجل المخاطر الرئيسي', nameEn: 'Master Risk Register', desc: 'السجل الرئيسي لجميع المخاطر', color: '#c62828' },
  { id: 'risk-assessment-matrix', name: 'مصفوفة تقييم المخاطر', nameEn: 'Risk Assessment Matrix', desc: 'مصفوفة تقييم الاحتمالية والأثر', color: '#b71c1c' },
  { id: 'risk-response-plan', name: 'خطة الاستجابة للمخاطر', nameEn: 'Risk Response Plan', desc: 'خطة الاستجابة والتخفيف من المخاطر', color: '#d32f2f' },
  { id: 'compliance-register', name: 'سجل الامتثال', nameEn: 'Compliance Register', desc: 'سجل متطلبات الامتثال التنظيمي', color: '#1565c0' },
  { id: 'compliance-gap-analysis', name: 'تحليل فجوات الامتثال', nameEn: 'Compliance Gap Analysis', desc: 'تحليل فجوات الامتثال والتوصيات', color: '#0d47a1' },
  { id: 'regulatory-update', name: 'تحديث تنظيمي', nameEn: 'Regulatory Update Report', desc: 'تقرير تحديثات الأنظمة واللوائح', color: '#1976d2' },
  { id: 'risk-indicator-report', name: 'تقرير مؤشرات المخاطر', nameEn: 'Key Risk Indicators Report', desc: 'تقرير مؤشرات المخاطر الرئيسية', color: '#e65100' },
  { id: 'compliance-training-record', name: 'سجل تدريب الامتثال', nameEn: 'Compliance Training Record', desc: 'سجل تدريب الموظفين على الامتثال', color: '#2e7d32' },
  { id: 'risk-owner-assignment', name: 'تعيين مالك المخاطر', nameEn: 'Risk Owner Assignment', desc: 'تعيين المسؤولين عن إدارة المخاطر', color: '#6a1b9a' },
  { id: 'compliance-audit-plan', name: 'خطة تدقيق الامتثال', nameEn: 'Compliance Audit Plan', desc: 'خطة تدقيق الامتثال الدوري', color: '#283593' },
  { id: 'risk-incident-analysis', name: 'تحليل حوادث المخاطر', nameEn: 'Risk Incident Analysis', desc: 'تحليل الحوادث المرتبطة بالمخاطر', color: '#bf360c' },
  { id: 'policy-compliance-check', name: 'فحص الامتثال للسياسات', nameEn: 'Policy Compliance Check', desc: 'فحص الامتثال للسياسات الداخلية', color: '#37474f' },
  { id: 'risk-appetite-doc', name: 'وثيقة تقبل المخاطر', nameEn: 'Risk Appetite Statement', desc: 'وثيقة مستوى تقبل المخاطر', color: '#455a64' },
  { id: 'third-party-risk', name: 'مخاطر الطرف الثالث', nameEn: 'Third Party Risk Assessment', desc: 'تقييم مخاطر الأطراف الخارجية', color: '#4527a0' },
  { id: 'compliance-dashboard-doc', name: 'توثيق لوحة الامتثال', nameEn: 'Compliance Dashboard Doc', desc: 'توثيق لوحة متابعة الامتثال', color: '#00695c' },
  { id: 'enterprise-risk-report', name: 'تقرير المخاطر المؤسسية', nameEn: 'Enterprise Risk Report', desc: 'التقرير الشامل للمخاطر المؤسسية', color: '#0277bd' },
];

export const RiskComplianceTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'risk-register-master':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل المخاطر الرئيسي" subtitle="Master Risk Register" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="الإصدار" value={d.version} w="15%" /><Field label="تاريخ المراجعة" value={formatDate(d.reviewDate) || today()} w="25%" /><Field label="المراجع" value={d.reviewer} w="25%" /></div>
            <Section title="سجل المخاطر">
              <EmptyTable cols={7} rows={10} headers={['الرقم', 'وصف المخاطرة', 'الفئة', 'الاحتمالية', 'الأثر', 'التصنيف', 'المالك']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.notes} lines={3} />
            <SignatureBlock rightLabel="مدير المخاطر" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'risk-assessment-matrix':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مصفوفة تقييم المخاطر" subtitle="Risk Assessment Matrix" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المشروع / العملية" value={d.projectName} w="40%" /><Field label="تاريخ التقييم" value={formatDate(d.assessDate) || today()} w="25%" /><Field label="المقيّم" value={d.assessor} w="25%" /></div>
            <Section title="المصفوفة">
              <EmptyTable cols={6} rows={8} headers={['المخاطرة', 'الاحتمالية (1-5)', 'الأثر (1-5)', 'المجموع', 'التصنيف', 'الإجراء']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المقيّم" leftLabel="مدير المخاطر" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'risk-response-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الاستجابة للمخاطر" subtitle="Risk Response Plan" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المخاطرة" value={d.riskTitle} w="40%" /><Field label="التصنيف" value={d.classification} w="20%" /><Field label="المالك" value={d.owner} w="25%" /></div>
            <Section title="إجراءات الاستجابة">
              <EmptyTable cols={5} rows={6} headers={['الإجراء', 'المسؤول', 'الموعد', 'التكلفة', 'الحالة']} />
            </Section>
            <Section title="خطة المتابعة">
              <EmptyTable cols={4} rows={4} headers={['المؤشر', 'القيمة الحالية', 'القيمة المستهدفة', 'تاريخ المراجعة']} />
            </Section>
            <SignatureBlock rightLabel="مدير المخاطر" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'compliance-register':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الامتثال التنظيمي" subtitle="Compliance Register" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="القطاع" value={d.sector} w="25%" /><Field label="المسؤول" value={d.officer} w="25%" /></div>
            <Section title="متطلبات الامتثال">
              <EmptyTable cols={6} rows={10} headers={['النظام/اللائحة', 'المتطلب', 'الحالة', 'نسبة الامتثال', 'الفجوة', 'الإجراء']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الامتثال" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'compliance-gap-analysis':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحليل فجوات الامتثال" subtitle="Compliance Gap Analysis" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المعيار / اللائحة" value={d.standard} w="40%" /><Field label="المحلل" value={d.analyst} w="30%" /><Field label="التاريخ" value={formatDate(d.analysisDate) || today()} w="25%" /></div>
            <Section title="تحليل الفجوات">
              <EmptyTable cols={5} rows={8} headers={['المتطلب', 'الوضع الحالي', 'الفجوة', 'الأولوية', 'خطة الإغلاق']} />
            </Section>
            <NotesBox label="توصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="المحلل" leftLabel="مسؤول الامتثال" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'regulatory-update':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التحديثات التنظيمية" subtitle="Regulatory Update Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="عدد التحديثات" value={d.updateCount} w="20%" /><Field label="المعد" value={d.preparedBy} w="30%" /></div>
            <Section title="التحديثات التنظيمية">
              <EmptyTable cols={5} rows={8} headers={['النظام/اللائحة', 'التعديل', 'تاريخ السريان', 'الأثر', 'الإجراء المطلوب']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الامتثال" leftLabel="المدير القانوني" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'risk-indicator-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مؤشرات المخاطر الرئيسية" subtitle="Key Risk Indicators Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="عدد المؤشرات" value={d.kpiCount} w="20%" /><Field label="المعد" value={d.preparedBy} w="30%" /></div>
            <Section title="مؤشرات المخاطر">
              <EmptyTable cols={6} rows={8} headers={['المؤشر', 'القيمة الحالية', 'العتبة', 'الاتجاه', 'الحالة', 'الإجراء']} />
            </Section>
            <SignatureBlock rightLabel="محلل المخاطر" leftLabel="مدير المخاطر" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'compliance-training-record':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل تدريب الامتثال" subtitle="Compliance Training Record" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="البرنامج التدريبي" value={d.programName} w="40%" /><Field label="التاريخ" value={formatDate(d.trainingDate)} w="20%" /><Field label="المدرب" value={d.trainer} w="25%" /></div>
            <Section title="الحضور">
              <EmptyTable cols={5} rows={10} headers={['الاسم', 'القسم', 'الحضور', 'درجة الاختبار', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المدرب" leftLabel="مسؤول الامتثال" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'risk-owner-assignment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تعيين مالك المخاطر" subtitle="Risk Owner Assignment" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <Section title="تعيينات مالكي المخاطر">
              <EmptyTable cols={6} rows={10} headers={['المخاطرة', 'التصنيف', 'المالك المعيّن', 'القسم', 'تاريخ التعيين', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مدير المخاطر" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'compliance-audit-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة تدقيق الامتثال" subtitle="Compliance Audit Plan" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="السنة" value={d.year} w="15%" /><Field label="النطاق" value={d.scope} w="40%" /><Field label="المدقق" value={d.auditor} w="25%" /></div>
            <Section title="جدول التدقيق">
              <EmptyTable cols={5} rows={8} headers={['المجال', 'المعيار', 'التاريخ المخطط', 'المدقق', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="رئيس التدقيق" leftLabel="مسؤول الامتثال" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'risk-incident-analysis':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحليل حوادث المخاطر" subtitle="Risk Incident Analysis" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم الحادثة" value={d.incidentNo} w="20%" /><Field label="التاريخ" value={formatDate(d.incidentDate)} w="20%" /><Field label="المخاطرة المرتبطة" value={d.relatedRisk} w="35%" /><Field label="الأثر" value={d.impact} w="20%" /></div>
            <Section title="تحليل الأسباب">
              <EmptyTable cols={4} rows={5} headers={['السبب', 'النوع', 'المساهمة', 'ملاحظات']} />
            </Section>
            <Section title="الإجراءات التصحيحية">
              <EmptyTable cols={4} rows={4} headers={['الإجراء', 'المسؤول', 'الموعد', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="المحقق" leftLabel="مدير المخاطر" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'policy-compliance-check':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فحص الامتثال للسياسات" subtitle="Policy Compliance Check" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="السياسة" value={d.policyName} w="40%" /><Field label="القسم" value={d.department} w="25%" /><Field label="الفاحص" value={d.checker} w="25%" /></div>
            <Section title="نتائج الفحص">
              <EmptyTable cols={5} rows={8} headers={['البند', 'المتطلب', 'الحالة', 'الملاحظة', 'إجراء تصحيحي']} />
            </Section>
            <NotesBox label="النتيجة العامة" value={d.overallResult} lines={2} />
            <SignatureBlock rightLabel="الفاحص" leftLabel="مسؤول الامتثال" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'risk-appetite-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="وثيقة مستوى تقبل المخاطر" subtitle="Risk Appetite Statement" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الإصدار" value={d.version} w="15%" /><Field label="تاريخ الاعتماد" value={formatDate(d.approvedDate)} w="25%" /><Field label="المعتمد" value={d.approvedBy} w="30%" /></div>
            <Section title="حدود تقبل المخاطر">
              <EmptyTable cols={5} rows={8} headers={['فئة المخاطر', 'الحد الأدنى', 'المقبول', 'الحد الأقصى', 'ملاحظات']} />
            </Section>
            <NotesBox label="بيان عام" value={d.generalStatement} lines={3} />
            <SignatureBlock rightLabel="مدير المخاطر" leftLabel="مجلس الإدارة" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'third-party-risk':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم مخاطر الأطراف الخارجية" subtitle="Third Party Risk Assessment" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الطرف الخارجي" value={d.thirdPartyName} w="35%" /><Field label="نوع العلاقة" value={d.relationType} w="25%" /><Field label="المقيّم" value={d.assessor} w="25%" /></div>
            <Section title="تقييم المخاطر">
              <EmptyTable cols={5} rows={8} headers={['مجال المخاطرة', 'مستوى المخاطرة', 'الأثر', 'الضوابط', 'التوصية']} />
            </Section>
            <NotesBox label="النتيجة والتوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="المقيّم" leftLabel="مدير المخاطر" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'compliance-dashboard-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق لوحة متابعة الامتثال" subtitle="Compliance Dashboard Doc" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="نسبة الامتثال العامة" value={d.overallCompliance} w="25%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="ملخص حسب المجال">
              <EmptyTable cols={5} rows={8} headers={['المجال', 'المتطلبات', 'متحقق', 'النسبة', 'الحالة']} />
            </Section>
            <Section title="القضايا المفتوحة">
              <EmptyTable cols={4} rows={4} headers={['القضية', 'الأولوية', 'المسؤول', 'الموعد']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الامتثال" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'enterprise-risk-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="التقرير الشامل للمخاطر المؤسسية" subtitle="Enterprise Risk Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الربع" value={d.quarter} w="15%" /><Field label="السنة" value={d.year} w="15%" /><Field label="عدد المخاطر النشطة" value={d.activeRiskCount} w="25%" /><Field label="المعد" value={d.preparedBy} w="30%" /></div>
            <Section title="ملخص المخاطر">
              <EmptyTable cols={6} rows={8} headers={['الفئة', 'العدد', 'حرجة', 'عالية', 'متوسطة', 'منخفضة']} />
            </Section>
            <Section title="أبرز المخاطر">
              <EmptyTable cols={5} rows={5} headers={['المخاطرة', 'التصنيف', 'المالك', 'الإجراء', 'الحالة']} />
            </Section>
            <NotesBox label="ملخص تنفيذي" value={d.executiveSummary} lines={3} />
            <SignatureBlock rightLabel="مدير المخاطر" leftLabel="رئيس مجلس الإدارة" />
          </div>
          <OrgFooter />
        </div>
      );
    default:
      return <div style={pageWrapper}><OrgHeader title="قالب المخاطر والامتثال" /><div style={bodyPad}><p>لا يوجد قالب مطابق</p></div><OrgFooter /></div>;
  }
};
