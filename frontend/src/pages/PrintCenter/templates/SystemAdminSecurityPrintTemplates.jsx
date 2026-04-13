/**
 * قوالب إدارة النظام والأمان
 * System Administration & Security Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const SYSTEM_ADMIN_SECURITY_TEMPLATES = [
  { id: 'user-access-report', name: 'تقرير صلاحيات المستخدمين', nameEn: 'User Access Report', desc: 'تقرير صلاحيات وأدوار المستخدمين', color: '#1565c0' },
  { id: 'security-audit-log', name: 'سجل التدقيق الأمني', nameEn: 'Security Audit Log', desc: 'سجل الأحداث والتدقيق الأمني', color: '#0d47a1' },
  { id: 'backup-status-report', name: 'تقرير حالة النسخ الاحتياطي', nameEn: 'Backup Status Report', desc: 'تقرير حالة النسخ الاحتياطي', color: '#283593' },
  { id: 'system-health-report', name: 'تقرير صحة النظام', nameEn: 'System Health Report', desc: 'تقرير أداء وصحة الخوادم', color: '#303f9f' },
  { id: 'incident-response-plan', name: 'خطة استجابة الحوادث', nameEn: 'Incident Response Plan', desc: 'خطة الاستجابة للحوادث الأمنية', color: '#c62828' },
  { id: 'change-management-form', name: 'نموذج إدارة التغيير', nameEn: 'Change Management Form', desc: 'نموذج طلب تغيير بيئة الإنتاج', color: '#d32f2f' },
  { id: 'server-inventory', name: 'جرد الخوادم', nameEn: 'Server Inventory', desc: 'سجل جرد الخوادم والموارد', color: '#455a64' },
  { id: 'ssl-certificate-tracker', name: 'متابعة شهادات SSL', nameEn: 'SSL Certificate Tracker', desc: 'متابعة صلاحية شهادات SSL', color: '#2e7d32' },
  { id: 'firewall-rules-doc', name: 'توثيق قواعد الجدار الناري', nameEn: 'Firewall Rules Document', desc: 'توثيق قواعد الجدار الناري', color: '#e65100' },
  { id: 'password-policy', name: 'سياسة كلمات المرور', nameEn: 'Password Policy Document', desc: 'سياسة كلمات المرور والأمان', color: '#bf360c' },
  { id: 'data-retention-policy', name: 'سياسة الاحتفاظ بالبيانات', nameEn: 'Data Retention Policy', desc: 'سياسة حفظ وأرشفة البيانات', color: '#4527a0' },
  { id: 'uptime-sla-report', name: 'تقرير التشغيل ومستوى الخدمة', nameEn: 'Uptime & SLA Report', desc: 'تقرير نسبة التشغيل والـ SLA', color: '#00695c' },
  { id: 'vulnerability-scan', name: 'تقرير فحص الثغرات', nameEn: 'Vulnerability Scan Report', desc: 'تقرير فحص ثغرات النظام', color: '#b71c1c' },
  { id: 'api-usage-report', name: 'تقرير استخدام الـ API', nameEn: 'API Usage Report', desc: 'تقرير حجم استخدام واجهات API', color: '#0277bd' },
  { id: 'disaster-recovery-plan', name: 'خطة التعافي من الكوارث', nameEn: 'Disaster Recovery Plan', desc: 'خطة التعافي واستمرارية الأعمال', color: '#880e4f' },
  { id: 'network-topology-doc', name: 'توثيق طوبولوجيا الشبكة', nameEn: 'Network Topology Document', desc: 'مخطط ووثيقة البنية الشبكية', color: '#37474f' },
];

export const SystemAdminSecurityTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'user-access-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير صلاحيات وأدوار المستخدمين" subtitle="User Access & Roles Report" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النظام" value={d.system} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="المسؤول" value={d.admin} w="20%" /></div>
            <Section title="المستخدمون والصلاحيات">
              <EmptyTable cols={6} rows={10} headers={['المستخدم', 'الدور', 'القسم', 'آخر دخول', 'الحالة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي المستخدمين" value={d.totalUsers} w="12%" /><Field label="نشط" value={d.active} w="8%" /><Field label="غير نشط" value={d.inactive} w="8%" /></div>
            <SignatureBlock rightLabel="مدير النظام" leftLabel="مدير أمن المعلومات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'security-audit-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل التدقيق الأمني" subtitle="Security Audit Log" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="النظام" value={d.system} w="20%" /></div>
            <Section title="الأحداث الأمنية">
              <EmptyTable cols={6} rows={10} headers={['التاريخ/الوقت', 'المستخدم', 'الحدث', 'المورد', 'IP', 'النتيجة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الأحداث" value={d.totalEvents} w="12%" /><Field label="تحذيرات" value={d.warnings} w="8%" /><Field label="حرجة" value={d.critical} w="8%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مدير الأمن" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'backup-status-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حالة النسخ الاحتياطي" subtitle="Backup Status Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="المسؤول" value={d.admin} w="20%" /></div>
            <Section title="حالة النسخ الاحتياطي">
              <EmptyTable cols={6} rows={6} headers={['النظام/قاعدة البيانات', 'النوع', 'آخر نسخة', 'الحجم', 'الحالة', 'الموقع']} />
            </Section>
            <NotesBox label="مشاكل" value={d.issues} lines={1} />
            <div style={fieldRow}><Field label="اختبار الاستعادة" value={d.restoreTest} w="15%" /><Field label="النتيجة" value={d.testResult} w="12%" /></div>
            <SignatureBlock rightLabel="مدير النظام" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'system-health-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير صحة وأداء النظام" subtitle="System Health & Performance Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="المهندس" value={d.engineer} w="20%" /></div>
            <Section title="حالة الخوادم">
              <EmptyTable cols={6} rows={5} headers={['الخادم', 'CPU %', 'RAM %', 'القرص %', 'وقت التشغيل', 'الحالة']} />
            </Section>
            <Section title="حالة الخدمات">
              <EmptyTable cols={4} rows={6} headers={['الخدمة', 'الحالة', 'وقت الاستجابة', 'ملاحظات']} />
            </Section>
            <NotesBox label="مشاكل وتوصيات" value={d.issues} lines={2} />
            <SignatureBlock rightLabel="مهندس النظام" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'incident-response-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الاستجابة للحوادث الأمنية" subtitle="Security Incident Response Plan" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="مستوى الحادث" value={d.severity} w="12%" /><Field label="النوع" value={d.type} w="15%" /><Field label="تاريخ الاكتشاف" value={formatDate(d.discoveryDate)} w="15%" /></div>
            <NotesBox label="وصف الحادث" value={d.description} lines={3} />
            <Section title="خطوات الاستجابة">
              <EmptyTable cols={5} rows={8} headers={['الخطوة', 'المسؤول', 'المهلة', 'الحالة', 'ملاحظات']} />
            </Section>
            <NotesBox label="الدروس المستفادة" value={d.lessonsLearned} lines={2} />
            <SignatureBlock rightLabel="مدير أمن المعلومات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'change-management-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج طلب تغيير بيئة الإنتاج" subtitle="Production Change Request Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="مقدم الطلب" value={d.requester} w="20%" /><Field label="النظام" value={d.system} w="20%" /><Field label="الأولوية" value={d.priority} w="10%" /></div>
            <NotesBox label="وصف التغيير" value={d.description} lines={2} />
            <NotesBox label="السبب والمبرر" value={d.justification} lines={2} />
            <NotesBox label="التأثير والمخاطر" value={d.impact} lines={2} />
            <NotesBox label="خطة التراجع" value={d.rollbackPlan} lines={1} />
            <div style={fieldRow}><Field label="التاريخ المقترح" value={formatDate(d.proposedDate)} w="15%" /><Field label="وقت التنفيذ" value={d.window} w="12%" /></div>
            <SignatureBlock rightLabel="مدير التقنية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'server-inventory':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل جرد الخوادم والموارد" subtitle="Server & Resource Inventory" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="تاريخ التحديث" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الخوادم">
              <EmptyTable cols={7} rows={8} headers={['الخادم', 'IP', 'المواصفات', 'نظام التشغيل', 'الدور', 'الموقع', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ssl-certificate-tracker':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="متابعة صلاحية شهادات SSL" subtitle="SSL Certificate Tracker" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="تاريخ المراجعة" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الشهادات">
              <EmptyTable cols={6} rows={6} headers={['النطاق', 'الجهة المصدرة', 'تاريخ الإصدار', 'تاريخ الانتهاء', 'المتبقي', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'firewall-rules-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق قواعد الجدار الناري" subtitle="Firewall Rules Documentation" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الجهاز" value={d.device} w="20%" /><Field label="تاريخ التحديث" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="القواعد">
              <EmptyTable cols={7} rows={10} headers={['#', 'المصدر', 'الوجهة', 'المنفذ', 'البروتوكول', 'الإجراء', 'الملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير الشبكة" leftLabel="مدير أمن المعلومات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'password-policy':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سياسة كلمات المرور والأمان" subtitle="Password & Authentication Policy" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="متطلبات كلمة المرور">
              <EmptyTable cols={3} rows={8} headers={['البند', 'القيمة', 'ملاحظات']} />
            </Section>
            <NotesBox label="سياسات إضافية" value={d.additionalPolicies} lines={3} />
            <NotesBox label="الاستثناءات" value={d.exceptions} lines={1} />
            <SignatureBlock rightLabel="مدير أمن المعلومات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'data-retention-policy':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سياسة الاحتفاظ بالبيانات" subtitle="Data Retention & Archival Policy" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الإصدار" value={d.version} w="10%" /><Field label="تاريخ الاعتماد" value={formatDate(d.approvalDate)} w="15%" /></div>
            <Section title="فترات الاحتفاظ">
              <EmptyTable cols={5} rows={8} headers={['نوع البيانات', 'فترة الاحتفاظ', 'طريقة الأرشفة', 'طريقة الإتلاف', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات تنظيمية" value={d.regulatoryNotes} lines={2} />
            <SignatureBlock rightLabel="مدير أمن المعلومات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'uptime-sla-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير نسبة التشغيل ومستوى الخدمة" subtitle="Uptime & SLA Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="12%" /><Field label="SLA المستهدف" value={d.targetSLA} w="12%" /></div>
            <Section title="الخدمات">
              <EmptyTable cols={5} rows={6} headers={['الخدمة', 'وقت التشغيل', 'وقت التوقف', 'نسبة التشغيل', 'SLA']} />
            </Section>
            <NotesBox label="أسباب التوقف" value={d.downtimeReasons} lines={2} />
            <SignatureBlock rightLabel="مهندس النظام" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'vulnerability-scan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير فحص الثغرات الأمنية" subtitle="Vulnerability Scan Report" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="تاريخ الفحص" value={formatDate(d.date) || today()} w="15%" /><Field label="الأداة" value={d.tool} w="15%" /><Field label="النطاق" value={d.scope} w="20%" /></div>
            <Section title="الثغرات المكتشفة">
              <EmptyTable cols={6} rows={8} headers={['الثغرة', 'الشدة', 'المورد المتأثر', 'الوصف', 'الإصلاح', 'الحالة']} />
            </Section>
            <div style={fieldRow}><Field label="حرجة" value={d.critical} w="8%" /><Field label="عالية" value={d.high} w="8%" /><Field label="متوسطة" value={d.medium} w="8%" /><Field label="منخفضة" value={d.low} w="8%" /></div>
            <SignatureBlock rightLabel="مدير أمن المعلومات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'api-usage-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير استخدام واجهات الـ API" subtitle="API Usage Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="إحصائيات الاستخدام">
              <EmptyTable cols={6} rows={8} headers={['الـ Endpoint', 'الطلبات', 'متوسط الزمن', 'الأخطاء', 'معدل النجاح', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الطلبات" value={d.totalRequests} w="15%" /><Field label="معدل الأخطاء" value={d.errorRate} w="12%" /></div>
            <SignatureBlock rightLabel="مطور الـ API" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'disaster-recovery-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التعافي واستمرارية الأعمال" subtitle="Disaster Recovery & BCP" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="خطوات التعافي">
              <EmptyTable cols={5} rows={8} headers={['الخطوة', 'المسؤول', 'RTO', 'RPO', 'التفاصيل']} />
            </Section>
            <NotesBox label="قائمة الاتصال الطارئ" value={d.emergencyContacts} lines={2} />
            <NotesBox label="مواقع النسخ الاحتياطي" value={d.backupSites} lines={1} />
            <div style={fieldRow}><Field label="آخر اختبار" value={formatDate(d.lastTest)} w="15%" /><Field label="الاختبار القادم" value={formatDate(d.nextTest)} w="15%" /></div>
            <SignatureBlock rightLabel="مدير التقنية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'network-topology-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق البنية الشبكية" subtitle="Network Topology Documentation" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="تاريخ التحديث" value={formatDate(d.date) || today()} w="15%" /><Field label="المهندس" value={d.engineer} w="20%" /></div>
            <Section title="الأجهزة الشبكية">
              <EmptyTable cols={6} rows={8} headers={['الجهاز', 'النوع', 'IP', 'الموقع', 'الدور', 'ملاحظات']} />
            </Section>
            <Section title="شبكات VLAN">
              <EmptyTable cols={4} rows={5} headers={['VLAN', 'الاسم', 'النطاق', 'الغرض']} />
            </Section>
            <SignatureBlock rightLabel="مهندس الشبكة" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
