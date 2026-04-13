/**
 * قوالب الخدمات المصغرة ولوحات المتابعة
 * Microservices & Dashboard Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const MICROSERVICES_DASHBOARD_TEMPLATES = [
  { id: 'service-registry', name: 'سجل الخدمات المصغرة', nameEn: 'Service Registry', desc: 'جرد الخدمات المصغرة وحالتها', color: '#1565c0' },
  { id: 'service-health-report', name: 'تقرير صحة الخدمات', nameEn: 'Service Health Report', desc: 'تقرير حالة صحة الخدمات', color: '#1976d2' },
  { id: 'api-endpoint-doc', name: 'توثيق نقاط API', nameEn: 'API Endpoint Documentation', desc: 'توثيق نقاط نهاية API', color: '#1e88e5' },
  { id: 'dashboard-config-doc', name: 'توثيق إعدادات لوحة المتابعة', nameEn: 'Dashboard Config Documentation', desc: 'توثيق إعدادات لوحات المتابعة', color: '#6a1b9a' },
  { id: 'kpi-dashboard-report', name: 'تقرير لوحة KPI', nameEn: 'KPI Dashboard Report', desc: 'تقرير مؤشرات الأداء', color: '#7b1fa2' },
  { id: 'service-dependency-map', name: 'خريطة تبعية الخدمات', nameEn: 'Service Dependency Map', desc: 'خريطة تبعيات الخدمات', color: '#00695c' },
  { id: 'container-status', name: 'حالة الحاويات', nameEn: 'Container Status Report', desc: 'تقرير حالة حاويات Docker', color: '#0277bd' },
  { id: 'message-queue-report', name: 'تقرير طوابير الرسائل', nameEn: 'Message Queue Report', desc: 'تقرير حالة طوابير الرسائل', color: '#283593' },
  { id: 'caching-report', name: 'تقرير التخزين المؤقت', nameEn: 'Caching Performance Report', desc: 'تقرير أداء التخزين المؤقت', color: '#c62828' },
  { id: 'load-balancer-config', name: 'إعدادات موازن الحمل', nameEn: 'Load Balancer Config', desc: 'توثيق إعدادات موازن الحمل', color: '#e65100' },
  { id: 'ci-cd-pipeline-doc', name: 'توثيق أنبوب CI/CD', nameEn: 'CI/CD Pipeline Documentation', desc: 'توثيق مراحل البناء والنشر', color: '#2e7d32' },
  { id: 'deployment-history', name: 'سجل عمليات النشر', nameEn: 'Deployment History Log', desc: 'سجل عمليات نشر الخدمات', color: '#f57c00' },
  { id: 'widget-catalog', name: 'فهرس عناصر لوحة المتابعة', nameEn: 'Dashboard Widget Catalog', desc: 'فهرس عناصر الواجهة', color: '#303f9f' },
  { id: 'real-time-monitor-config', name: 'إعدادات المراقبة الحية', nameEn: 'Real-Time Monitor Config', desc: 'توثيق إعدادات المراقبة', color: '#455a64' },
  { id: 'log-aggregation-report', name: 'تقرير تجميع السجلات', nameEn: 'Log Aggregation Report', desc: 'تقرير السجلات المجمعة', color: '#558b2f' },
  { id: 'auto-scaling-config', name: 'إعدادات التوسع التلقائي', nameEn: 'Auto-Scaling Configuration', desc: 'توثيق سياسات التوسع', color: '#4527a0' },
];

export const MicroservicesDashboardTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'service-registry':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الخدمات المصغرة" subtitle="Service Registry" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="إجمالي الخدمات" value={d.totalServices} w="12%" /></div>
            <Section title="الخدمات">
              <EmptyTable cols={6} rows={10} headers={['الخدمة', 'الإصدار', 'المنفذ', 'المالك', 'الحالة', 'آخر نشر']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير DevOps" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'service-health-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير صحة الخدمات" subtitle="Service Health Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="حالة الخدمات">
              <EmptyTable cols={6} rows={10} headers={['الخدمة', 'CPU %', 'الذاكرة', 'الاستجابة (ms)', 'الأخطاء', 'الحالة']} />
            </Section>
            <NotesBox label="خدمات بها مشاكل" value={d.issues} lines={2} />
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'api-endpoint-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق نقاط نهاية API" subtitle="API Endpoint Documentation" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الخدمة" value={d.serviceName} w="20%" /><Field label="الإصدار" value={d.version} w="10%" /></div>
            <Section title="نقاط النهاية">
              <EmptyTable cols={6} rows={12} headers={['المسار', 'الطريقة', 'الوصف', 'المصادقة', 'المعاملات', 'الاستجابة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="المطور الرئيسي" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'dashboard-config-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق إعدادات لوحة المتابعة" subtitle="Dashboard Configuration Documentation" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اللوحة" value={d.dashboardName} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="العناصر">
              <EmptyTable cols={6} rows={8} headers={['العنصر', 'النوع', 'مصدر البيانات', 'التحديث', 'الحجم', 'ملاحظات']} />
            </Section>
            <NotesBox label="فلاتر افتراضية" value={d.defaultFilters} lines={1} />
            <SignatureBlock rightLabel="مصمم اللوحة" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'kpi-dashboard-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير لوحة مؤشرات الأداء" subtitle="KPI Dashboard Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="مؤشرات الأداء">
              <EmptyTable cols={6} rows={10} headers={['المؤشر', 'المستهدف', 'الفعلي', 'الإنجاز %', 'الاتجاه', 'الحالة']} />
            </Section>
            <NotesBox label="ملخص تنفيذي" value={d.executiveSummary} lines={2} />
            <SignatureBlock rightLabel="محلل الأداء" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'service-dependency-map':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خريطة تبعيات الخدمات" subtitle="Service Dependency Map" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="التبعيات">
              <EmptyTable cols={5} rows={10} headers={['الخدمة', 'تعتمد على', 'النوع', 'الأهمية', 'ملاحظات']} />
            </Section>
            <NotesBox label="نقاط ضعف" value={d.singlePoints} lines={2} />
            <SignatureBlock rightLabel="مهندس البنية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'container-status':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حالة حاويات Docker" subtitle="Container Status Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="إجمالي الحاويات" value={d.totalContainers} w="12%" /></div>
            <Section title="الحاويات">
              <EmptyTable cols={6} rows={10} headers={['الحاوية', 'الصورة', 'CPU', 'الذاكرة', 'وقت التشغيل', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير DevOps" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'message-queue-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حالة طوابير الرسائل" subtitle="Message Queue Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الطوابير">
              <EmptyTable cols={6} rows={8} headers={['الطابور', 'المعلق', 'المعالج/ث', 'زمن المعالجة', 'الأخطاء', 'الحالة']} />
            </Section>
            <NotesBox label="اختناقات" value={d.bottlenecks} lines={2} />
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'caching-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أداء التخزين المؤقت" subtitle="Caching Performance Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النظام" value={d.cacheSystem} w="15%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="الأداء">
              <EmptyTable cols={6} rows={6} headers={['المفتاح', 'Hit Rate', 'Miss Rate', 'الحجم', 'TTL', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="Hit Rate العام" value={d.overallHitRate} w="12%" /><Field label="الذاكرة المستخدمة" value={d.memoryUsed} w="12%" /></div>
            <NotesBox label="التوصيات" value={d.recommendations} lines={1} />
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'load-balancer-config':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق إعدادات موازن الحمل" subtitle="Load Balancer Configuration" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النوع" value={d.lbType} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الخوادم الخلفية">
              <EmptyTable cols={6} rows={6} headers={['الخادم', 'المنفذ', 'الوزن', 'Health Check', 'الحالة', 'ملاحظات']} />
            </Section>
            <NotesBox label="خوارزمية التوزيع" value={d.algorithm} lines={1} />
            <NotesBox label="إعدادات SSL" value={d.sslConfig} lines={1} />
            <SignatureBlock rightLabel="مهندس البنية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ci-cd-pipeline-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق مراحل البناء والنشر" subtitle="CI/CD Pipeline Documentation" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المشروع" value={d.projectName} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مراحل الأنبوب">
              <EmptyTable cols={6} rows={8} headers={['المرحلة', 'الأداة', 'المحفز', 'المدة', 'الشروط', 'ملاحظات']} />
            </Section>
            <NotesBox label="المتغيرات البيئية" value={d.envVars} lines={2} />
            <SignatureBlock rightLabel="مدير DevOps" leftLabel="المطور الرئيسي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'deployment-history':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل عمليات نشر الخدمات" subtitle="Deployment History Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="عمليات النشر">
              <EmptyTable cols={6} rows={10} headers={['التاريخ', 'الخدمة', 'الإصدار', 'البيئة', 'المنفذ', 'النتيجة']} />
            </Section>
            <NotesBox label="عمليات فاشلة" value={d.failures} lines={1} />
            <SignatureBlock rightLabel="مدير DevOps" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'widget-catalog':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فهرس عناصر لوحة المتابعة" subtitle="Dashboard Widget Catalog" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="العناصر المتاحة">
              <EmptyTable cols={6} rows={10} headers={['العنصر', 'النوع', 'الوصف', 'مصدر البيانات', 'التخصيص', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مصمم الواجهة" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'real-time-monitor-config':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق إعدادات المراقبة الحية" subtitle="Real-Time Monitor Configuration" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النظام" value={d.system} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="نقاط المراقبة">
              <EmptyTable cols={6} rows={8} headers={['النقطة', 'المؤشر', 'الحد الأعلى', 'الحد الأدنى', 'التنبيه', 'الحالة']} />
            </Section>
            <NotesBox label="قنوات التنبيه" value={d.alertChannels} lines={1} />
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'log-aggregation-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير السجلات المجمعة" subtitle="Log Aggregation Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="ملخص السجلات">
              <EmptyTable cols={5} rows={6} headers={['المصدر', 'المستوى', 'العدد', 'الأكثر تكراراً', 'ملاحظات']} />
            </Section>
            <Section title="أخطاء حرجة">
              <EmptyTable cols={4} rows={4} headers={['الخطأ', 'المصدر', 'التكرار', 'الإجراء']} />
            </Section>
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'auto-scaling-config':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق سياسات التوسع التلقائي" subtitle="Auto-Scaling Configuration" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الخدمة" value={d.serviceName} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="سياسات التوسع">
              <EmptyTable cols={6} rows={6} headers={['المقياس', 'الحد الأدنى', 'الحد الأقصى', 'شرط التوسع', 'شرط التقلص', 'فترة التبريد']} />
            </Section>
            <div style={fieldRow}><Field label="الحد الأدنى للنسخ" value={d.minReplicas} w="12%" /><Field label="الحد الأقصى" value={d.maxReplicas} w="12%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مهندس البنية" leftLabel="مدير DevOps" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
