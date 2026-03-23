/**
 * قوالب طباعة الأسطول والنقل — Fleet & Transport Print Templates
 * يشمل: إدارة الأسطول، النقل، تتبع الحافلات
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, PrintTable, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const FLEET_TEMPLATES = [
  { id: 'vehicle-inspection', name: 'فحص مركبة', nameEn: 'Vehicle Inspection', desc: 'نموذج فحص حالة المركبة', color: '#37474f' },
  { id: 'fuel-log', name: 'سجل الوقود', nameEn: 'Fuel Log', desc: 'تسجيل استهلاك الوقود', color: '#455a64' },
  { id: 'maintenance-order', name: 'أمر صيانة مركبة', nameEn: 'Vehicle Maintenance Order', desc: 'طلب صيانة مركبة', color: '#546e7a' },
  { id: 'driver-assignment', name: 'تعيين سائق', nameEn: 'Driver Assignment', desc: 'تكليف سائق بمركبة', color: '#607d8b' },
  { id: 'vehicle-handover', name: 'تسليم مركبة', nameEn: 'Vehicle Handover', desc: 'محضر تسليم واستلام مركبة', color: '#78909c' },
  { id: 'bus-route', name: 'جدول خط الحافلة', nameEn: 'Bus Route Schedule', desc: 'جدول مواعيد وخطوط النقل', color: '#0d47a1' },
  { id: 'transport-manifest', name: 'بيان ركاب النقل', nameEn: 'Student Transport Manifest', desc: 'كشف بأسماء المنقولين', color: '#1565c0' },
  { id: 'trip-log', name: 'سجل الرحلات', nameEn: 'Trip Log Sheet', desc: 'سجل الرحلات اليومية', color: '#1976d2' },
];

export const FleetTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'vehicle-inspection':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج فحص مركبة" subtitle="Vehicle Inspection Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المركبة">
              <div style={fieldRow}><Field label="نوع المركبة" value={d.vehicleType} w="25%" /><Field label="رقم اللوحة" value={d.plateNo} w="25%" /><Field label="الموديل" value={d.model} w="25%" /><Field label="اللون" value={d.color} w="25%" /></div>
              <div style={fieldRow}><Field label="قراءة العداد" value={d.odometer} w="25%" /><Field label="تاريخ الفحص" value={formatDate(d.date) || today()} w="25%" /><Field label="الفاحص" value={d.inspector} w="50%" /></div>
            </Section>
            <Section title="قائمة الفحص">
              <EmptyTable cols={4} rows={12} headers={['البند', 'جيد', 'متوسط', 'سيئ']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.notes} />
            <div style={fieldRow}><Field label="النتيجة" value={d.result} w="30%" /><Field label="صالح للاستخدام" value={d.roadworthy} w="30%" /><Field label="ملاحظات" value={d.actionNeeded} w="40%" /></div>
            <SignatureBlock rightLabel="الفاحص" leftLabel="مدير الأسطول" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'fuel-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الوقود" subtitle="Fuel Consumption Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المركبة" value={d.vehicle} w="30%" /><Field label="رقم اللوحة" value={d.plateNo} w="25%" /><Field label="السائق" value={d.driver} w="25%" /><Field label="الشهر" value={d.month} w="20%" /></div>
            <Section title="سجل التعبئة">
              <EmptyTable cols={7} rows={15} headers={['التاريخ', 'قراءة العداد', 'الكمية (لتر)', 'التكلفة', 'المحطة', 'السائق', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي اللترات" value={d.totalLiters} w="25%" /><Field label="إجمالي التكلفة" value={d.totalCost} w="25%" /><Field label="معدل الاستهلاك" value={d.avgConsumption} w="25%" /><Field label="إجمالي المسافة" value={d.totalKm} w="25%" /></div>
            <SignatureBlock rightLabel="مسؤول الأسطول" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'maintenance-order':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="أمر صيانة مركبة" subtitle="Vehicle Maintenance Work Order" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المركبة">
              <div style={fieldRow}><Field label="المركبة" value={d.vehicle} w="30%" /><Field label="رقم اللوحة" value={d.plateNo} w="25%" /><Field label="قراءة العداد" value={d.odometer} w="25%" /><Field label="الأولوية" value={d.priority} w="20%" /></div>
            </Section>
            <NotesBox label="وصف العطل" value={d.faultDesc} lines={3} />
            <Section title="الأعمال المطلوبة">
              <EmptyTable cols={4} rows={6} headers={['العمل المطلوب', 'قطع الغيار', 'التكلفة المقدرة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="ورشة الصيانة" value={d.workshop} w="40%" /><Field label="التكلفة الإجمالية" value={d.totalCost} w="30%" /><Field label="مدة الإنجاز المتوقعة" value={d.eta} w="30%" /></div>
            <SignatureBlock rightLabel="مدير الأسطول" leftLabel="الاعتماد المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'driver-assignment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تكليف سائق" subtitle="Driver Assignment Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات السائق">
              <div style={fieldRow}><Field label="اسم السائق" value={d.driverName} w="40%" /><Field label="رقم الهوية" value={d.idNo} w="30%" /><Field label="رقم الرخصة" value={d.licenseNo} w="30%" /></div>
              <div style={fieldRow}><Field label="نوع الرخصة" value={d.licenseType} w="33%" /><Field label="تاريخ الانتهاء" value={formatDate(d.licenseExpiry)} w="33%" /><Field label="الجوال" value={d.phone} w="34%" /></div>
            </Section>
            <Section title="بيانات المركبة المكلف بها">
              <div style={fieldRow}><Field label="المركبة" value={d.vehicle} w="30%" /><Field label="رقم اللوحة" value={d.plateNo} w="25%" /><Field label="من تاريخ" value={formatDate(d.fromDate)} w="22%" /><Field label="إلى تاريخ" value={formatDate(d.toDate)} w="23%" /></div>
            </Section>
            <NotesBox label="التعليمات والمسؤوليات" value={d.instructions} lines={4} />
            <div style={{ margin: '16px 0', padding: 12, background: '#fff3e0', borderRadius: 8, fontSize: 11 }}>
              <strong>إقرار السائق:</strong> أقر بأنني تسلمت المركبة المذكورة أعلاه وأتعهد بالمحافظة عليها والالتزام بتعليمات المرور والسلامة.
            </div>
            <SignatureBlock rightLabel="السائق" leftLabel="مدير الأسطول" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'vehicle-handover':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر تسليم واستلام مركبة" subtitle="Vehicle Handover Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المركبة">
              <div style={fieldRow}><Field label="النوع" value={d.vehicleType} w="25%" /><Field label="الموديل" value={d.model} w="25%" /><Field label="اللوحة" value={d.plateNo} w="25%" /><Field label="العداد" value={d.odometer} w="25%" /></div>
            </Section>
            <div style={fieldRow}><Field label="المسلِّم" value={d.handedBy} w="50%" /><Field label="المستلِم" value={d.receivedBy} w="50%" /></div>
            <Section title="حالة المركبة عند التسليم">
              <EmptyTable cols={4} rows={10} headers={['البند', 'الحالة', 'ملاحظات', 'صورة']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.notes} />
            <SignatureBlock rightLabel="المسلِّم" leftLabel="المستلِم" />
            <div style={{ marginTop: 12 }}><SignatureBlock rightLabel="الشاهد" leftLabel="مدير الأسطول" /></div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'bus-route':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جدول خط الحافلة" subtitle="Bus Route Schedule" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الخط" value={d.routeNo} w="20%" /><Field label="اسم الخط" value={d.routeName} w="30%" /><Field label="الحافلة" value={d.busNo} w="25%" /><Field label="السائق" value={d.driver} w="25%" /></div>
            <div style={fieldRow}><Field label="نوع الخدمة" value={d.serviceType} w="33%" /><Field label="أيام التشغيل" value={d.operatingDays} w="33%" /><Field label="عدد الركاب" value={d.capacity} w="34%" /></div>
            <Section title="محطات التوقف — رحلة الذهاب">
              <EmptyTable cols={4} rows={10} headers={['م', 'المحطة / الموقع', 'وقت الوصول', 'عدد الركاب']} />
            </Section>
            <Section title="محطات التوقف — رحلة العودة">
              <EmptyTable cols={4} rows={10} headers={['م', 'المحطة / الموقع', 'وقت الوصول', 'عدد الركاب']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول النقل" leftLabel="مدير العمليات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'transport-manifest':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بيان ركاب النقل" subtitle="Student Transport Manifest" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الخط" value={d.routeNo} w="20%" /><Field label="الحافلة" value={d.busNo} w="20%" /><Field label="السائق" value={d.driver} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
            <Section title="قائمة المستفيدين">
              <EmptyTable cols={6} rows={20} headers={['م', 'اسم المستفيد', 'رقم الهوية', 'محطة الصعود', 'محطة النزول', 'التوقيع']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الركاب" value={d.totalPassengers} w="33%" /><Field label="وقت الانطلاق" value={d.departureTime} w="33%" /><Field label="وقت الوصول" value={d.arrivalTime} w="34%" /></div>
            <SignatureBlock rightLabel="السائق" leftLabel="المرافق" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'trip-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الرحلات اليومية" subtitle="Daily Trip Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المركبة" value={d.vehicle} w="30%" /><Field label="رقم اللوحة" value={d.plateNo} w="25%" /><Field label="السائق" value={d.driver} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="الرحلات">
              <EmptyTable cols={7} rows={12} headers={['م', 'الغرض', 'من', 'إلى', 'العداد (ذهاب)', 'العداد (عودة)', 'المسافة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي المسافة" value={d.totalDistance} w="33%" /><Field label="عداد البداية" value={d.startOdometer} w="33%" /><Field label="عداد النهاية" value={d.endOdometer} w="34%" /></div>
            <SignatureBlock rightLabel="السائق" leftLabel="مدير الأسطول" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
