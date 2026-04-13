/**
 * قوالب منشئ التقارير والتقارير المخصصة
 * Report Builder & Custom Reports Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const REPORT_BUILDER_TEMPLATES = [
  { id: 'report-template-config', name: 'إعداد قالب تقرير', nameEn: 'Report Template Config', desc: 'توثيق إعدادات قالب التقرير', color: '#1565c0' },
  { id: 'custom-report-doc', name: 'وثيقة تقرير مخصص', nameEn: 'Custom Report Document', desc: 'وثيقة تقرير مخصص بتنسيق احترافي', color: '#0d47a1' },
  { id: 'data-source-mapping', name: 'خريطة مصادر البيانات', nameEn: 'Data Source Mapping', desc: 'خريطة مصادر البيانات للتقارير', color: '#1976d2' },
  { id: 'report-schedule-doc', name: 'جدول التقارير الدورية', nameEn: 'Report Schedule Document', desc: 'جدول إصدار التقارير الدورية', color: '#1e88e5' },
  { id: 'dashboard-widget-config', name: 'إعداد عناصر اللوحة', nameEn: 'Dashboard Widget Config', desc: 'توثيق إعدادات عناصر لوحة المتابعة', color: '#2196f3' },
  { id: 'kpi-definition-doc', name: 'توثيق تعريف المؤشرات', nameEn: 'KPI Definition Document', desc: 'توثيق تعريفات مؤشرات الأداء', color: '#2e7d32' },
  { id: 'report-distribution-list', name: 'قائمة توزيع التقارير', nameEn: 'Report Distribution List', desc: 'قائمة المستلمين للتقارير', color: '#388e3c' },
  { id: 'chart-config-doc', name: 'توثيق إعدادات الرسوم', nameEn: 'Chart Configuration Doc', desc: 'توثيق إعدادات الرسوم البيانية', color: '#6a1b9a' },
  { id: 'pivot-table-report', name: 'تقرير الجدول المحوري', nameEn: 'Pivot Table Report', desc: 'تقرير بتنسيق الجداول المحورية', color: '#283593' },
  { id: 'report-access-control', name: 'ضبط صلاحيات التقارير', nameEn: 'Report Access Control', desc: 'توثيق صلاحيات الوصول للتقارير', color: '#37474f' },
  { id: 'cross-module-report', name: 'تقرير متعدد الوحدات', nameEn: 'Cross-Module Report', desc: 'تقرير تجميعي من عدة وحدات', color: '#c62828' },
  { id: 'report-export-log', name: 'سجل تصدير التقارير', nameEn: 'Report Export Log', desc: 'سجل عمليات تصدير التقارير', color: '#e65100' },
  { id: 'ad-hoc-report', name: 'تقرير فوري', nameEn: 'Ad-Hoc Report Template', desc: 'قالب لإنشاء تقارير فورية', color: '#4527a0' },
  { id: 'report-version-history', name: 'سجل إصدارات التقارير', nameEn: 'Report Version History', desc: 'سجل إصدارات وتعديلات التقارير', color: '#455a64' },
  { id: 'automated-report-config', name: 'إعداد التقارير الآلية', nameEn: 'Automated Report Config', desc: 'توثيق إعدادات التقارير الآلية', color: '#00695c' },
  { id: 'report-builder-guide', name: 'دليل منشئ التقارير', nameEn: 'Report Builder User Guide', desc: 'دليل استخدام منشئ التقارير', color: '#0277bd' },
];

export const ReportBuilderTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'report-template-config':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إعداد قالب تقرير" subtitle="Report Template Configuration" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم القالب" value={d.templateName} w="35%" /><Field label="النوع" value={d.type} w="20%" /><Field label="الوحدة" value={d.module} w="25%" /><Field label="الإصدار" value={d.version} w="15%" /></div>
            <Section title="حقول القالب">
              <EmptyTable cols={5} rows={8} headers={['الحقل', 'النوع', 'المصدر', 'إلزامي', 'ملاحظات']} />
            </Section>
            <Section title="الفلاتر">
              <EmptyTable cols={4} rows={4} headers={['الفلتر', 'النوع', 'القيم الافتراضية', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المطور" leftLabel="مدير التقارير" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'custom-report-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مخصص" subtitle="Custom Report Document" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="عنوان التقرير" value={d.reportTitle} w="40%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="بيانات التقرير">
              <EmptyTable cols={6} rows={10} headers={['#', 'البيان', 'القيمة', 'المقارن', 'الفرق', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملخص النتائج" value={d.summary} lines={3} />
            <SignatureBlock rightLabel="معد التقرير" leftLabel="المدير المسؤول" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'data-source-mapping':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خريطة مصادر البيانات" subtitle="Data Source Mapping" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم التقرير" value={d.reportName} w="40%" /><Field label="المطور" value={d.developer} w="30%" /><Field label="التاريخ" value={formatDate(d.mapDate) || today()} w="25%" /></div>
            <Section title="مصادر البيانات">
              <EmptyTable cols={6} rows={8} headers={['المصدر', 'الجدول/API', 'الحقول', 'نوع الربط', 'التصفية', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات فنية" value={d.techNotes} lines={2} />
            <SignatureBlock rightLabel="المطور" leftLabel="مدير التقارير" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'report-schedule-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جدول التقارير الدورية" subtitle="Report Schedule Document" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="السنة" value={d.year} w="15%" /><Field label="عدد التقارير" value={d.reportCount} w="20%" /><Field label="المسؤول" value={d.responsible} w="30%" /></div>
            <Section title="جدول الإصدار">
              <EmptyTable cols={6} rows={10} headers={['التقرير', 'التكرار', 'المستلمون', 'الموعد', 'الصيغة', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول التقارير" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'dashboard-widget-config':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إعداد عناصر لوحة المتابعة" subtitle="Dashboard Widget Configuration" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم اللوحة" value={d.dashboardName} w="35%" /><Field label="المالك" value={d.owner} w="25%" /><Field label="عدد العناصر" value={d.widgetCount} w="20%" /></div>
            <Section title="عناصر اللوحة">
              <EmptyTable cols={6} rows={8} headers={['العنصر', 'النوع', 'المصدر', 'التحديث', 'الحجم', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المطور" leftLabel="مدير اللوحات" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'kpi-definition-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق تعريفات مؤشرات الأداء" subtitle="KPI Definition Document" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الوحدة" value={d.department} w="30%" /><Field label="عدد المؤشرات" value={d.kpiCount} w="20%" /><Field label="المعد" value={d.preparedBy} w="30%" /></div>
            <Section title="تعريفات المؤشرات">
              <EmptyTable cols={6} rows={8} headers={['المؤشر', 'التعريف', 'المعادلة', 'المصدر', 'الهدف', 'التكرار']} />
            </Section>
            <SignatureBlock rightLabel="محلل الأداء" leftLabel="المدير التنفيذي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'report-distribution-list':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة توزيع التقارير" subtitle="Report Distribution List" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم التقرير" value={d.reportName} w="40%" /><Field label="التكرار" value={d.frequency} w="20%" /><Field label="المنسق" value={d.coordinator} w="25%" /></div>
            <Section title="قائمة المستلمين">
              <EmptyTable cols={5} rows={10} headers={['المستلم', 'المنصب', 'القسم', 'طريقة الإرسال', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المنسق" leftLabel="مدير التقارير" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'chart-config-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق إعدادات الرسوم البيانية" subtitle="Chart Configuration Document" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="التقرير" value={d.reportName} w="35%" /><Field label="عدد الرسوم" value={d.chartCount} w="20%" /><Field label="المطور" value={d.developer} w="25%" /></div>
            <Section title="إعدادات الرسوم">
              <EmptyTable cols={6} rows={6} headers={['الرسم', 'النوع', 'المحور X', 'المحور Y', 'الفلتر', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المطور" leftLabel="مدير التقارير" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'pivot-table-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الجدول المحوري" subtitle="Pivot Table Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="العنوان" value={d.title} w="40%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="البيانات المحورية">
              <EmptyTable cols={6} rows={10} headers={['التصنيف', 'المقياس 1', 'المقياس 2', 'المقياس 3', 'المجموع', 'النسبة']} />
            </Section>
            <NotesBox label="تحليل" value={d.analysis} lines={3} />
            <SignatureBlock rightLabel="المحلل" leftLabel="المدير" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'report-access-control':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="صلاحيات الوصول للتقارير" subtitle="Report Access Control" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <Section title="مصفوفة الصلاحيات">
              <EmptyTable cols={6} rows={10} headers={['التقرير', 'الدور', 'عرض', 'تصدير', 'تعديل', 'حذف']} />
            </Section>
            <NotesBox label="ملاحظات الأمان" value={d.securityNotes} lines={2} />
            <SignatureBlock rightLabel="مسؤول الأمان" leftLabel="مدير تقنية المعلومات" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'cross-module-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تجميعي متعدد الوحدات" subtitle="Cross-Module Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="العنوان" value={d.title} w="40%" /><Field label="الوحدات" value={d.modules} w="35%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="البيانات التجميعية">
              <EmptyTable cols={6} rows={10} headers={['الوحدة', 'المؤشر', 'الهدف', 'الفعلي', 'الانحراف', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملخص تنفيذي" value={d.summary} lines={3} />
            <SignatureBlock rightLabel="محلل البيانات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'report-export-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل تصدير التقارير" subtitle="Report Export Log" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="30%" /><Field label="عدد عمليات التصدير" value={d.exportCount} w="25%" /></div>
            <Section title="سجل التصدير">
              <EmptyTable cols={6} rows={10} headers={['التقرير', 'المصدّر', 'التاريخ', 'الصيغة', 'الحجم', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول التقارير" leftLabel="مدير تقنية المعلومات" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'ad-hoc-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير فوري" subtitle="Ad-Hoc Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="العنوان" value={d.title} w="40%" /><Field label="الطالب" value={d.requestedBy} w="30%" /><Field label="الأولوية" value={d.priority} w="20%" /></div>
            <Section title="البيانات">
              <EmptyTable cols={5} rows={10} headers={['البند', 'القيمة', 'ملاحظات', 'المصدر', 'التاريخ']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={3} />
            <SignatureBlock rightLabel="المعد" leftLabel="الطالب" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'report-version-history':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل إصدارات التقارير" subtitle="Report Version History" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم التقرير" value={d.reportName} w="40%" /><Field label="الإصدار الحالي" value={d.currentVersion} w="20%" /></div>
            <Section title="تاريخ الإصدارات">
              <EmptyTable cols={5} rows={8} headers={['الإصدار', 'التاريخ', 'التعديلات', 'المعدّل', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول التقارير" leftLabel="مدير الجودة" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'automated-report-config':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إعدادات التقارير الآلية" subtitle="Automated Report Configuration" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="التقرير" value={d.reportName} w="35%" /><Field label="التكرار" value={d.frequency} w="20%" /><Field label="طريقة الإرسال" value={d.deliveryMethod} w="25%" /></div>
            <Section title="إعدادات الأتمتة">
              <EmptyTable cols={5} rows={6} headers={['المعلمة', 'القيمة', 'الشرط', 'الإجراء عند الفشل', 'ملاحظات']} />
            </Section>
            <Section title="المستلمون">
              <EmptyTable cols={4} rows={4} headers={['المستلم', 'البريد', 'الصيغة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المطور" leftLabel="مدير التقارير" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'report-builder-guide':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="دليل استخدام منشئ التقارير" subtitle="Report Builder User Guide" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الإصدار" value={d.version} w="15%" /><Field label="تاريخ التحديث" value={formatDate(d.updateDate) || today()} w="25%" /><Field label="المعد" value={d.preparedBy} w="30%" /></div>
            <Section title="خطوات الاستخدام">
              <EmptyTable cols={4} rows={8} headers={['الخطوة', 'الوصف', 'صورة مرجعية', 'ملاحظات']} />
            </Section>
            <Section title="الأسئلة الشائعة">
              <EmptyTable cols={3} rows={5} headers={['السؤال', 'الإجابة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول التدريب" leftLabel="مدير التقارير" />
          </div>
          <OrgFooter />
        </div>
      );
    default:
      return <div style={pageWrapper}><OrgHeader title="قالب منشئ التقارير" /><div style={bodyPad}><p>لا يوجد قالب مطابق</p></div><OrgFooter /></div>;
  }
};
