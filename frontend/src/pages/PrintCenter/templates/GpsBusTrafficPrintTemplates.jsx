/**
 * قوالب GPS والنقل وحركة المرور
 * GPS, Bus & Traffic Management Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const GPS_BUS_TRAFFIC_TEMPLATES = [
  { id: 'bus-route-plan', name: 'خطة خطوط النقل', nameEn: 'Bus Route Plan', desc: 'خطة خطوط سير الحافلات', color: '#1565c0' },
  { id: 'bus-daily-log', name: 'سجل الرحلات اليومية', nameEn: 'Bus Daily Trip Log', desc: 'سجل رحلات الحافلة اليومية', color: '#1976d2' },
  { id: 'driver-assignment-sheet', name: 'جدول توزيع السائقين', nameEn: 'Driver Assignment Sheet', desc: 'توزيع السائقين على المركبات', color: '#1e88e5' },
  { id: 'fuel-consumption-report', name: 'تقرير استهلاك الوقود', nameEn: 'Fuel Consumption Report', desc: 'تقرير استهلاك الوقود الشهري', color: '#2196f3' },
  { id: 'vehicle-inspection-form', name: 'نموذج فحص مركبة', nameEn: 'Vehicle Inspection Form', desc: 'فحص السلامة اليومي للمركبة', color: '#0d47a1' },
  { id: 'gps-tracking-report', name: 'تقرير تتبع GPS', nameEn: 'GPS Tracking Report', desc: 'تقرير حركة المركبات بالـ GPS', color: '#283593' },
  { id: 'traffic-violation-report', name: 'تقرير مخالفات مرورية', nameEn: 'Traffic Violation Report', desc: 'تقرير المخالفات المرورية', color: '#c62828' },
  { id: 'bus-maintenance-schedule', name: 'جدول صيانة الحافلات', nameEn: 'Bus Maintenance Schedule', desc: 'جدول الصيانة الوقائية للحافلات', color: '#e65100' },
  { id: 'student-bus-roster', name: 'كشف طلاب الحافلة', nameEn: 'Student Bus Roster', desc: 'كشف الطلاب المسجلين في النقل', color: '#4527a0' },
  { id: 'bus-incident-report', name: 'تقرير حادث نقل', nameEn: 'Bus Incident Report', desc: 'تقرير حادث أثناء النقل', color: '#b71c1c' },
  { id: 'speed-alert-report', name: 'تقرير تنبيهات السرعة', nameEn: 'Speed Alert Report', desc: 'تقرير تجاوزات السرعة GPS', color: '#d32f2f' },
  { id: 'mileage-report', name: 'تقرير المسافات المقطوعة', nameEn: 'Mileage Report', desc: 'تقرير الكيلومترات الشهري', color: '#0277bd' },
  { id: 'bus-insurance-register', name: 'سجل تأمين المركبات', nameEn: 'Vehicle Insurance Register', desc: 'سجل التأمين والاستمارات', color: '#00695c' },
  { id: 'driver-license-tracker', name: 'متابعة رخص السائقين', nameEn: 'Driver License Tracker', desc: 'متابعة صلاحية رخص القيادة', color: '#2e7d32' },
  { id: 'bus-capacity-plan', name: 'خطة سعة النقل', nameEn: 'Bus Capacity Plan', desc: 'تخطيط سعة واحتياج الحافلات', color: '#558b2f' },
  { id: 'transport-complaint-form', name: 'نموذج شكوى نقل', nameEn: 'Transport Complaint Form', desc: 'نموذج شكوى خدمة النقل', color: '#f57f17' },
];

export const GpsBusTrafficTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'bus-route-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة خطوط سير الحافلات" subtitle="Bus Route Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفصل الدراسي" value={d.semester} w="15%" /><Field label="عدد الحافلات" value={d.busCount} w="12%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="خطوط السير">
              <EmptyTable cols={6} rows={8} headers={['رقم الخط', 'المنطقة', 'عدد الطلاب', 'الحافلة', 'السائق', 'وقت البداية']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مشرف النقل" leftLabel="المدير" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'bus-daily-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الرحلات اليومية" subtitle="Bus Daily Trip Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الحافلة" value={d.busNumber} w="12%" /><Field label="السائق" value={d.driver} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="رحلات اليوم">
              <EmptyTable cols={6} rows={6} headers={['الرحلة', 'من', 'إلى', 'وقت الانطلاق', 'وقت الوصول', 'عدد الركاب']} />
            </Section>
            <div style={fieldRow}><Field label="عداد البداية" value={d.odometerStart} w="15%" /><Field label="عداد النهاية" value={d.odometerEnd} w="15%" /><Field label="المسافة" value={d.distance} w="12%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="السائق" leftLabel="مشرف النقل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'driver-assignment-sheet':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جدول توزيع السائقين على المركبات" subtitle="Driver Assignment Sheet" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="12%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="التوزيع">
              <EmptyTable cols={6} rows={8} headers={['السائق', 'رقم الرخصة', 'المركبة', 'اللوحة', 'الخط', 'الفترة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مشرف النقل" leftLabel="المدير" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'fuel-consumption-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير استهلاك الوقود الشهري" subtitle="Monthly Fuel Consumption Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="12%" /><Field label="إعداد" value={d.preparedBy} w="20%" /></div>
            <Section title="استهلاك المركبات">
              <EmptyTable cols={6} rows={8} headers={['المركبة', 'الكيلومترات', 'الوقود (لتر)', 'التكلفة', 'المعدل', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الوقود" value={d.totalFuel} w="15%" /><Field label="إجمالي التكلفة" value={d.totalCost} w="15%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مشرف النقل" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'vehicle-inspection-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج فحص السلامة اليومي للمركبة" subtitle="Daily Vehicle Safety Inspection" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المركبة" value={d.vehicle} w="15%" /><Field label="اللوحة" value={d.plate} w="12%" /><Field label="السائق" value={d.driver} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="بنود الفحص">
              <EmptyTable cols={4} rows={12} headers={['البند', 'سليم', 'يحتاج إصلاح', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="عداد الكيلومترات" value={d.odometer} w="15%" /><Field label="مستوى الوقود" value={d.fuelLevel} w="12%" /></div>
            <NotesBox label="ملاحظات عامة" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="السائق" leftLabel="مشرف النقل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'gps-tracking-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تتبع GPS للمركبات" subtitle="GPS Vehicle Tracking Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المركبة" value={d.vehicle} w="15%" /><Field label="الفترة" value={d.period} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="سجل الحركة">
              <EmptyTable cols={6} rows={8} headers={['الوقت', 'الموقع', 'السرعة', 'الحالة', 'المسافة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي المسافة" value={d.totalDistance} w="15%" /><Field label="وقت التشغيل" value={d.runTime} w="12%" /><Field label="وقت التوقف" value={d.idleTime} w="12%" /></div>
            <SignatureBlock rightLabel="مشرف GPS" leftLabel="مشرف النقل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'traffic-violation-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير المخالفات المرورية" subtitle="Traffic Violation Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السائق" value={d.driver} w="20%" /><Field label="المركبة" value={d.vehicle} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="نوع المخالفة" value={d.violationType} w="20%" /><Field label="رقم المخالفة" value={d.violationNo} w="15%" /><Field label="المكان" value={d.location} w="20%" /></div>
            <div style={fieldRow}><Field label="الغرامة" value={d.fine} w="15%" /><Field label="حالة السداد" value={d.paymentStatus} w="12%" /></div>
            <NotesBox label="الإجراء المتخذ مع السائق" value={d.actionTaken} lines={2} />
            <SignatureBlock rightLabel="مشرف النقل" leftLabel="المدير" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'bus-maintenance-schedule':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جدول الصيانة الوقائية للحافلات" subtitle="Bus Preventive Maintenance Schedule" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="إعداد" value={d.preparedBy} w="20%" /></div>
            <Section title="جدول الصيانة">
              <EmptyTable cols={6} rows={8} headers={['المركبة', 'نوع الصيانة', 'التاريخ المحدد', 'الكيلومتر', 'الحالة', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مشرف الصيانة" leftLabel="مشرف النقل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-bus-roster':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="كشف الطلاب المسجلين في خدمة النقل" subtitle="Student Bus Roster" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الخط" value={d.routeNo} w="10%" /><Field label="الحافلة" value={d.bus} w="12%" /><Field label="السائق" value={d.driver} w="20%" /><Field label="المرافق" value={d.attendant} w="20%" /></div>
            <Section title="الطلاب">
              <EmptyTable cols={6} rows={15} headers={['م', 'الطالب', 'الصف', 'نقطة الركوب', 'هاتف ولي الأمر', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="الإجمالي" value={d.totalStudents} w="10%" /></div>
            <SignatureBlock rightLabel="مشرف النقل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'bus-incident-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حادث أثناء النقل" subtitle="Bus / Transport Incident Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الحافلة" value={d.bus} w="12%" /><Field label="السائق" value={d.driver} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الوقت" value={d.time} w="10%" /></div>
            <div style={fieldRow}><Field label="المكان" value={d.location} w="25%" /><Field label="نوع الحادث" value={d.incidentType} w="15%" /></div>
            <NotesBox label="وصف الحادث" value={d.description} lines={3} />
            <NotesBox label="الإصابات" value={d.injuries} lines={1} />
            <NotesBox label="الإجراءات المتخذة" value={d.actions} lines={2} />
            <SignatureBlock rightLabel="السائق" leftLabel="مشرف النقل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'speed-alert-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تنبيهات تجاوز السرعة" subtitle="GPS Speed Alert Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="السرعة المحددة" value={d.speedLimit} w="12%" /></div>
            <Section title="التجاوزات">
              <EmptyTable cols={6} rows={8} headers={['المركبة', 'السائق', 'التاريخ', 'الوقت', 'السرعة', 'الموقع']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي التنبيهات" value={d.totalAlerts} w="12%" /></div>
            <NotesBox label="الإجراءات" value={d.actions} lines={2} />
            <SignatureBlock rightLabel="مشرف GPS" leftLabel="مشرف النقل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mileage-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير المسافات المقطوعة الشهري" subtitle="Monthly Mileage Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="12%" /><Field label="إعداد" value={d.preparedBy} w="20%" /></div>
            <Section title="المسافات">
              <EmptyTable cols={5} rows={8} headers={['المركبة', 'بداية العداد', 'نهاية العداد', 'المسافة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الكيلومترات" value={d.totalKm} w="18%" /></div>
            <SignatureBlock rightLabel="مشرف النقل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'bus-insurance-register':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل تأمين واستمارات المركبات" subtitle="Vehicle Insurance & Registration Register" />
          <div style={bodyPad}>
            <Section title="السجل">
              <EmptyTable cols={7} rows={8} headers={['المركبة', 'اللوحة', 'شركة التأمين', 'رقم الوثيقة', 'بداية', 'نهاية', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مشرف النقل" leftLabel="المدير" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'driver-license-tracker':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="متابعة صلاحية رخص القيادة" subtitle="Driver License Validity Tracker" />
          <div style={bodyPad}>
            <Section title="السائقون">
              <EmptyTable cols={6} rows={8} headers={['السائق', 'رقم الرخصة', 'النوع', 'تاريخ الإصدار', 'تاريخ الانتهاء', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مشرف النقل" leftLabel="شؤون الموظفين" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'bus-capacity-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تخطيط سعة واحتياج الحافلات" subtitle="Bus Capacity Planning" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="العام الدراسي" value={d.academicYear} w="15%" /><Field label="إعداد" value={d.preparedBy} w="20%" /></div>
            <Section title="تحليل السعة">
              <EmptyTable cols={6} rows={8} headers={['المنطقة', 'عدد الطلاب', 'السعة الحالية', 'النقص', 'الحل المقترح', 'التكلفة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الاحتياج" value={d.totalNeed} w="15%" /><Field label="المتوفر" value={d.available} w="12%" /><Field label="النقص" value={d.gap} w="10%" /></div>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مشرف النقل" leftLabel="المدير" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'transport-complaint-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج شكوى خدمة النقل" subtitle="Transport Service Complaint Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="مقدم الشكوى" value={d.complainant} w="25%" /><Field label="الهاتف" value={d.phone} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="الخط" value={d.route} w="12%" /><Field label="الحافلة" value={d.bus} w="12%" /><Field label="السائق" value={d.driver} w="20%" /></div>
            <NotesBox label="تفاصيل الشكوى" value={d.complaint} lines={3} />
            <NotesBox label="الإجراء المتخذ" value={d.action} lines={2} />
            <SignatureBlock rightLabel="مقدم الشكوى" leftLabel="مشرف النقل" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
