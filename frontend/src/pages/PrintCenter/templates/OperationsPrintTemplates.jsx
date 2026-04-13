/**
 * قوالب طباعة العمليات — Operations Print Templates
 * 10 نماذج: أمر شراء، سند استلام، تقرير جرد، سجل أصول، أمر صيانة،
 *           بطاقة زائر، تسليم مركبة، تقرير رحلة، حالة مشروع، تقرير تدقيق
 */
import { Box, Typography, Divider, Grid, Avatar } from '@mui/material';
import {
  OrgHeader, OrgFooter, SignatureBlock, StampCircle, Section, Field,
  fieldRow, bodyPad, pageWrapper, formatDate, formatMoney,
  RefDateLine, NotesBox, PrintTable, EmptyTable, ConfidentialBanner,
} from '../shared/PrintTemplateShared';

export const OPERATIONS_TEMPLATES = [
  { id: 'purchase-order', name: 'أمر شراء', nameEn: 'Purchase Order', desc: 'أمر شراء رسمي للمواد والخدمات', color: '#1565c0' },
  { id: 'grn', name: 'سند استلام بضاعة', nameEn: 'Goods Receipt Note', desc: 'سند استلام وفحص بضاعة مستلمة', color: '#2e7d32' },
  { id: 'inventory-report', name: 'تقرير جرد', nameEn: 'Inventory Report', desc: 'تقرير جرد مخزون شامل', color: '#37474f' },
  { id: 'asset-register', name: 'سجل أصول', nameEn: 'Asset Register', desc: 'سجل الأصول الثابتة وبطاقة أصل', color: '#6a1b9a' },
  { id: 'work-order', name: 'أمر عمل صيانة', nameEn: 'Maintenance Work Order', desc: 'أمر عمل لطلب صيانة أو إصلاح', color: '#e65100' },
  { id: 'visitor-badge', name: 'بطاقة زائر', nameEn: 'Visitor Badge', desc: 'بطاقة تعريف زائر مؤقتة', color: '#00838f' },
  { id: 'vehicle-assign', name: 'نموذج تسليم مركبة', nameEn: 'Vehicle Assignment', desc: 'نموذج تسليم واستلام مركبة', color: '#4e342e' },
  { id: 'trip-report', name: 'تقرير رحلة', nameEn: 'Trip Report', desc: 'تقرير رحلة أو مهمة خارجية', color: '#0277bd' },
  { id: 'project-status', name: 'حالة المشروع', nameEn: 'Project Status Report', desc: 'تقرير حالة مشروع دوري', color: '#00695c' },
  { id: 'audit-report', name: 'تقرير تدقيق', nameEn: 'Audit Report', desc: 'تقرير تدقيق داخلي شامل', color: '#c62828' },
];

export const OperationsTemplateRenderer = ({ templateId, data }) => {
  const d = data || {};
  switch (templateId) {
    case 'purchase-order': return <PurchaseOrder d={d} />;
    case 'grn': return <GoodsReceiptNote d={d} />;
    case 'inventory-report': return <InventoryReport d={d} />;
    case 'asset-register': return <AssetRegister d={d} />;
    case 'work-order': return <WorkOrder d={d} />;
    case 'visitor-badge': return <VisitorBadge d={d} />;
    case 'vehicle-assign': return <VehicleAssign d={d} />;
    case 'trip-report': return <TripReport d={d} />;
    case 'project-status': return <ProjectStatus d={d} />;
    case 'audit-report': return <AuditReport d={d} />;
    default: return <Typography textAlign="center" py={8} color="text.secondary">اختر قالباً</Typography>;
  }
};

/* ═══════ 1. PURCHASE ORDER ═══════ */
const PurchaseOrder = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="أمر شراء" subtitle="Purchase Order" color="#1565c0" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="PO" />
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6}>
          <Box sx={{ bgcolor: '#e3f2fd', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" mb={1}>بيانات المورّد</Typography>
            <Field label="اسم المورّد" value={d.supplierName} />
            <Field label="العنوان" value={d.supplierAddress} />
            <Field label="الجوال" value={d.supplierPhone} />
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ bgcolor: '#e3f2fd', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" mb={1}>بيانات الأمر</Typography>
            <Field label="رقم أمر الشراء" value={d.poNumber || 'PO-________'} />
            <Field label="القسم الطالب" value={d.department} />
            <Field label="شروط الدفع" value={d.paymentTerms} />
          </Box>
        </Grid>
      </Grid>

      <PrintTable headers={[
        { label: 'م', width: 30 }, 'الوصف', { label: 'الوحدة' },
        { label: 'الكمية', center: true }, { label: 'سعر الوحدة', center: true }, { label: 'الإجمالي', center: true }
      ]} headerBg="#e3f2fd" rows={
        (d.items || [{}, {}, {}, {}, {}, {}]).map((item, i) => [
          i + 1, item.desc || '', item.unit || '',
          item.qty || '', formatMoney(item.price), formatMoney(item.total)
        ])
      } />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Box sx={{ width: 250, border: '1px solid #ddd', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 0.5, borderBottom: '1px solid #eee' }}>
            <Typography variant="body2">المجموع</Typography><Typography variant="body2">{formatMoney(d.subtotal)} ر.س</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 0.5, borderBottom: '1px solid #eee' }}>
            <Typography variant="body2">ضريبة (15%)</Typography><Typography variant="body2">{formatMoney(d.vat)} ر.س</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, bgcolor: '#e3f2fd' }}>
            <Typography variant="body1" fontWeight="bold">الإجمالي</Typography>
            <Typography variant="body1" fontWeight="bold" color="#1565c0">{formatMoney(d.total)} ر.س</Typography>
          </Box>
        </Box>
      </Box>

      <NotesBox content={d.notes} lines={2} />
      <SignatureBlock signatures={['مقدم الطلب', 'مدير المشتريات', 'المدير المالي', 'المدير العام']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 2. GOODS RECEIPT NOTE ═══════ */
const GoodsReceiptNote = ({ d }) => (
  <Box sx={{ ...pageWrapper, borderTop: '4px solid #2e7d32' }}>
    <OrgHeader title="سند استلام بضاعة" subtitle="Goods Receipt Note (GRN)" color="#2e7d32" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="GRN" />
      <Box sx={fieldRow}>
        <Field label="رقم أمر الشراء" value={d.poNumber} />
        <Field label="المورّد" value={d.supplierName} flex={2} />
        <Field label="رقم فاتورة المورّد" value={d.supplierInvoice} />
      </Box>

      <EmptyTable headers={[
        { label: 'م', width: 30 }, 'الصنف', 'الوحدة',
        { label: 'الكمية المطلوبة', center: true }, { label: 'الكمية المستلمة', center: true },
        { label: 'الحالة', center: true }, 'ملاحظات'
      ]} rowCount={8} headerBg="#e8f5e9" />

      <Section title="نتيجة الفحص" color="#2e7d32" />
      <Box sx={fieldRow}>
        <Field label="حالة البضاعة" value={d.condition || '□ مطابقة □ مطابقة جزئياً □ غير مطابقة'} flex={2} />
        <Field label="المستودع" value={d.warehouse} />
      </Box>
      <NotesBox content={d.inspectionNotes} lines={3} />

      <SignatureBlock signatures={['المستلم (المستودعات)', 'لجنة الفحص', 'مدير المشتريات']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 3. INVENTORY REPORT ═══════ */
const InventoryReport = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="تقرير جرد المخزون" subtitle="Inventory Stock Report" color="#37474f" />
    <Box sx={bodyPad}>
      <Box sx={fieldRow}>
        <Field label="تاريخ الجرد" value={formatDate(d.date)} />
        <Field label="المستودع" value={d.warehouse} />
        <Field label="نوع الجرد" value={d.type || '□ دوري □ سنوي □ مفاجئ'} />
      </Box>

      <EmptyTable headers={[
        { label: 'م', width: 30 }, 'رقم الصنف', 'اسم الصنف', 'الوحدة',
        { label: 'الرصيد الدفتري', center: true }, { label: 'الرصيد الفعلي', center: true },
        { label: 'الفرق', center: true }, 'ملاحظات'
      ]} rowCount={20} headerBg="#eceff1" />

      <Box sx={{ bgcolor: '#eceff1', p: 2, borderRadius: 1, display: 'flex', gap: 3 }}>
        <Typography variant="body2"><strong>إجمالي الأصناف:</strong> {d.totalItems || '___'}</Typography>
        <Typography variant="body2"><strong>أصناف متطابقة:</strong> {d.matched || '___'}</Typography>
        <Typography variant="body2"><strong>عجز:</strong> {d.shortage || '___'}</Typography>
        <Typography variant="body2"><strong>زيادة:</strong> {d.surplus || '___'}</Typography>
      </Box>

      <NotesBox content={d.notes} lines={3} />
      <SignatureBlock signatures={['لجنة الجرد (1)', 'لجنة الجرد (2)', 'أمين المستودع', 'المدير المالي']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 4. ASSET REGISTER ═══════ */
const AssetRegister = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="بطاقة / سجل أصل ثابت" subtitle="Fixed Asset Register Card" color="#6a1b9a" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="AST" />

      <Section title="بيانات الأصل" color="#6a1b9a" />
      <Box sx={fieldRow}>
        <Field label="رقم الأصل" value={d.assetNo || 'AST-________'} />
        <Field label="اسم الأصل" value={d.assetName} flex={2} />
        <Field label="الفئة" value={d.category} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="الموقع" value={d.location} />
        <Field label="القسم" value={d.department} />
        <Field label="المسؤول" value={d.custodian} />
        <Field label="الحالة" value={d.condition || '□ جيد □ متوسط □ يحتاج صيانة □ خردة'} />
      </Box>

      <Section title="بيانات الشراء" color="#6a1b9a" />
      <Box sx={fieldRow}>
        <Field label="تاريخ الشراء" value={formatDate(d.purchaseDate)} />
        <Field label="تكلفة الشراء" value={`${formatMoney(d.cost)} ر.س`} />
        <Field label="المورّد" value={d.supplier} />
        <Field label="رقم الضمان" value={d.warrantyNo} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="العمر الافتراضي" value={d.usefulLife} />
        <Field label="طريقة الإهلاك" value={d.depMethod || 'القسط الثابت'} />
        <Field label="الإهلاك المتراكم" value={`${formatMoney(d.accDep)} ر.س`} />
        <Field label="القيمة الدفترية" value={`${formatMoney(d.bookValue)} ر.س`} />
      </Box>

      <Section title="سجل الصيانة" color="#6a1b9a" />
      <EmptyTable headers={['التاريخ', 'نوع الصيانة', 'الوصف', 'التكلفة', 'المنفذ']} rowCount={5} headerBg="#f3e5f5" />

      <Section title="سجل النقل" color="#6a1b9a" />
      <EmptyTable headers={['التاريخ', 'من', 'إلى', 'سبب النقل', 'المسؤول']} rowCount={3} headerBg="#f3e5f5" />

      <SignatureBlock signatures={['أمين الأصول', 'المدير المالي']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 5. MAINTENANCE WORK ORDER ═══════ */
const WorkOrder = ({ d }) => (
  <Box sx={{ ...pageWrapper, borderTop: '4px solid #e65100' }}>
    <OrgHeader title="أمر عمل صيانة" subtitle="Maintenance Work Order" color="#e65100" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="WO" />
      <Box sx={fieldRow}>
        <Field label="نوع الصيانة" value={d.type || '□ وقائية □ تصحيحية □ طارئة'} flex={2} />
        <Field label="الأولوية" value={d.priority || '□ عاجل □ عادي □ منخفض'} />
      </Box>

      <Section title="بيانات الطلب" color="#e65100" />
      <Box sx={fieldRow}>
        <Field label="القسم الطالب" value={d.requestingDept} />
        <Field label="مقدم الطلب" value={d.requestedBy} />
        <Field label="التاريخ" value={formatDate(d.requestDate)} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="الموقع" value={d.location} />
        <Field label="المعدة / المرفق" value={d.equipment} flex={2} />
      </Box>

      <Section title="وصف العطل / المطلوب" color="#e65100" />
      <NotesBox content={d.description} minHeight={60} />

      <Section title="تنفيذ العمل" color="#e65100" />
      <Box sx={fieldRow}>
        <Field label="الفني المنفذ" value={d.technician} />
        <Field label="تاريخ البدء" value={formatDate(d.startDate)} />
        <Field label="تاريخ الانتهاء" value={formatDate(d.endDate)} />
      </Box>
      <NotesBox content={d.workDone} minHeight={60} />

      <Section title="المواد المستخدمة" color="#e65100" />
      <EmptyTable headers={[{ label: 'م', width: 30 }, 'الصنف', 'الكمية', 'التكلفة']} rowCount={4} headerBg="#fff3e0" />

      <Box sx={fieldRow}>
        <Field label="التكلفة الإجمالية" value={`${formatMoney(d.totalCost)} ر.س`} />
        <Field label="النتيجة" value={d.result || '□ تم الإصلاح □ يحتاج استبدال □ حل مؤقت'} flex={2} />
      </Box>

      <SignatureBlock signatures={['مقدم الطلب', 'الفني المنفذ', 'مدير الصيانة']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 6. VISITOR BADGE ═══════ */
const VisitorBadge = ({ d }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
    <Box sx={{ width: 380, border: '3px solid #00838f', borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ background: 'linear-gradient(135deg, #00838f, #00acc1)', color: 'white', p: 2.5, textAlign: 'center' }}>
        <Typography variant="h6" fontWeight="bold">مركز الأوائل للتأهيل</Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>AlAwael Rehabilitation Center</Typography>
        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.3)' }} />
        <Typography variant="h5" fontWeight="bold" sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1, py: 0.5 }}>
          بطاقة زائر
        </Typography>
      </Box>
      <Box sx={{ p: 2.5, bgcolor: 'white' }}>
        <Box display="flex" gap={2} mb={2}>
          <Avatar sx={{ width: 60, height: 60, bgcolor: '#00838f', fontSize: 24 }}>ز</Avatar>
          <Box flex={1}>
            <Typography variant="subtitle1" fontWeight="bold">{d.visitorName || '—'}</Typography>
            <Typography variant="body2" color="text.secondary">{d.company || '—'}</Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        {[
          ['رقم الهوية', d.idNumber || '—'],
          ['الجهة المزارة', d.visitingDept || '—'],
          ['الشخص المطلوب', d.hostName || '—'],
          ['سبب الزيارة', d.purpose || '—'],
          ['التاريخ', formatDate(d.date)],
          ['وقت الدخول', d.timeIn || '___:___'],
          ['وقت الخروج', d.timeOut || '___:___'],
        ].map(([l, v], i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{l}</Typography>
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>{v}</Typography>
          </Box>
        ))}
        <Box sx={{ bgcolor: '#e0f7fa', p: 1.5, borderRadius: 1, mt: 1.5, textAlign: 'center' }}>
          <Typography variant="caption" fontWeight="bold">رقم البطاقة: {d.badgeNo || 'V-____'}</Typography>
        </Box>
      </Box>
      <Box sx={{ background: '#00838f', color: 'white', p: 1, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ fontSize: 9 }}>هذه البطاقة يجب إعادتها عند المغادرة — يُمنع التنقل بدون مرافق</Typography>
      </Box>
    </Box>
  </Box>
);

/* ═══════ 7. VEHICLE ASSIGNMENT ═══════ */
const VehicleAssign = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="نموذج تسليم / استلام مركبة" subtitle="Vehicle Assignment / Return Form" color="#4e342e" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="VEH" />

      <Section title="بيانات المركبة" color="#4e342e" />
      <Box sx={fieldRow}>
        <Field label="نوع المركبة" value={d.vehicleType} />
        <Field label="الموديل" value={d.model} />
        <Field label="رقم اللوحة" value={d.plateNo} />
        <Field label="اللون" value={d.color} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="قراءة العداد (تسليم)" value={d.odometerOut} />
        <Field label="مستوى الوقود" value={d.fuelLevel || '□ ممتلئ □ ¾ □ ½ □ ¼ □ فارغ'} />
      </Box>

      <Section title="بيانات السائق" color="#4e342e" />
      <Box sx={fieldRow}>
        <Field label="اسم السائق" value={d.driverName} flex={2} />
        <Field label="رقم الرخصة" value={d.licenseNo} />
        <Field label="القسم" value={d.department} />
      </Box>

      <Section title="بيانات المهمة" color="#4e342e" />
      <Box sx={fieldRow}>
        <Field label="الوجهة" value={d.destination} flex={2} />
        <Field label="الغرض" value={d.purpose} flex={2} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="تاريخ المغادرة" value={formatDate(d.departureDate)} />
        <Field label="وقت المغادرة" value={d.departureTime} />
        <Field label="تاريخ العودة المتوقع" value={formatDate(d.returnDate)} />
      </Box>

      <Section title="حالة المركبة عند التسليم" color="#4e342e" />
      <PrintTable headers={['البند', 'سليم', 'تالف', 'ملاحظات']} headerBg="#efebe9"
        rows={[
          ['الهيكل الخارجي', '□', '□', ''],
          ['الإطارات', '□', '□', ''],
          ['الأضواء', '□', '□', ''],
          ['المكيف', '□', '□', ''],
          ['المستندات (استمارة/تأمين)', '□', '□', ''],
          ['طفاية الحريق', '□', '□', ''],
          ['عدة الإسعافات', '□', '□', ''],
        ]} />

      <Section title="عند الإعادة" color="#4e342e" />
      <Box sx={fieldRow}>
        <Field label="قراءة العداد (إعادة)" value={d.odometerIn} />
        <Field label="المسافة المقطوعة" value={d.distance} />
        <Field label="مستوى الوقود" value={d.fuelReturn || '□ ممتلئ □ ¾ □ ½ □ ¼'} />
      </Box>
      <NotesBox content={d.returnNotes} lines={2} />

      <SignatureBlock signatures={['السائق', 'مسؤول الأسطول (تسليم)', 'مسؤول الأسطول (استلام)']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 8. TRIP REPORT ═══════ */
const TripReport = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="تقرير رحلة / مهمة خارجية" subtitle="Trip / Mission Report" color="#0277bd" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="TRP" />

      <Section title="بيانات الموظف" color="#0277bd" />
      <Box sx={fieldRow}>
        <Field label="الاسم" value={d.name} flex={2} />
        <Field label="القسم" value={d.department} />
        <Field label="المسمى" value={d.position} />
      </Box>

      <Section title="بيانات الرحلة" color="#0277bd" />
      <Box sx={fieldRow}>
        <Field label="الوجهة" value={d.destination} flex={2} />
        <Field label="الغرض" value={d.purpose} flex={2} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="تاريخ المغادرة" value={formatDate(d.departureDate)} />
        <Field label="تاريخ العودة" value={formatDate(d.returnDate)} />
        <Field label="وسيلة النقل" value={d.transport} />
      </Box>

      <Section title="ملخص الرحلة والإنجازات" color="#0277bd" />
      <NotesBox content={d.summary} minHeight={80} />

      <Section title="المصروفات" color="#0277bd" />
      <EmptyTable headers={[{ label: 'م', width: 30 }, 'البند', { label: 'المبلغ (ر.س)', center: true }]} rowCount={6} headerBg="#e1f5fe" />
      <Box sx={{ bgcolor: '#e1f5fe', px: 2, py: 1, borderRadius: 1, textAlign: 'left' }}>
        <Typography variant="body2" fontWeight="bold">إجمالي المصروفات: ____________ ر.س</Typography>
      </Box>

      <Section title="التوصيات" color="#0277bd" />
      <NotesBox content={d.recommendations} lines={3} />

      <SignatureBlock signatures={['الموظف', 'المدير المباشر', 'المدير المالي']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 9. PROJECT STATUS ═══════ */
const ProjectStatus = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="تقرير حالة المشروع" subtitle="Project Status Report" color="#00695c" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="PRJ" />

      <Section title="معلومات المشروع" color="#00695c" />
      <Box sx={fieldRow}>
        <Field label="اسم المشروع" value={d.projectName} flex={2} />
        <Field label="رقم المشروع" value={d.projectNo} />
        <Field label="مدير المشروع" value={d.manager} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="تاريخ البدء" value={formatDate(d.startDate)} />
        <Field label="التاريخ المتوقع للإنتهاء" value={formatDate(d.endDate)} />
        <Field label="الحالة" value={d.status || '□ على المسار □ متأخر □ معلق □ مكتمل'} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="نسبة الإنجاز" value={d.completion || '_____%'} />
        <Field label="الميزانية" value={`${formatMoney(d.budget)} ر.س`} />
        <Field label="المنصرف حتى الآن" value={`${formatMoney(d.spent)} ر.س`} />
      </Box>

      <Section title="المراحل" color="#00695c" />
      <EmptyTable headers={[
        { label: 'م', width: 30 }, 'المرحلة', { label: 'نسبة الإنجاز', center: true },
        { label: 'الحالة', center: true }, 'ملاحظات'
      ]} rowCount={6} headerBg="#e0f2f1" />

      <Section title="المخاطر والتحديات" color="#c62828" />
      <NotesBox content={d.risks} lines={3} />

      <Section title="الإنجازات خلال الفترة" color="#00695c" />
      <NotesBox content={d.achievements} lines={3} />

      <Section title="الخطوات القادمة" color="#00695c" />
      <NotesBox content={d.nextSteps} lines={3} />

      <SignatureBlock signatures={['مدير المشروع', 'المدير التنفيذي']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 10. AUDIT REPORT ═══════ */
const AuditReport = ({ d }) => (
  <Box sx={{ ...pageWrapper, border: '2px solid #c62828' }}>
    <OrgHeader title="تقرير تدقيق داخلي" subtitle="Internal Audit Report" color="#c62828" />
    <Box sx={bodyPad}>
      <ConfidentialBanner text="سري — للإدارة العليا فقط" />
      <RefDateLine prefix="AUD" />

      <Section title="بيانات التدقيق" color="#c62828" />
      <Box sx={fieldRow}>
        <Field label="القسم / العملية المدققة" value={d.auditedArea} flex={2} />
        <Field label="نوع التدقيق" value={d.auditType || '□ دوري □ خاص □ متابعة'} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="فترة التدقيق" value={d.period} />
        <Field label="المدقق" value={d.auditor} />
        <Field label="تاريخ التقرير" value={formatDate(d.reportDate)} />
      </Box>

      <Section title="نطاق التدقيق" color="#c62828" />
      <NotesBox content={d.scope} lines={3} />

      <Section title="الملاحظات والنتائج" color="#c62828" />
      <EmptyTable headers={[
        { label: 'م', width: 30 }, 'الملاحظة',
        { label: 'المخاطرة', center: true },
        'التوصية', { label: 'رد الإدارة' }
      ]} rowCount={6} headerBg="#ffebee" />

      <Section title="الملخص التنفيذي" color="#c62828" />
      <NotesBox content={d.summary} minHeight={60} />

      <Section title="التوصيات العامة" color="#c62828" />
      <NotesBox content={d.recommendations} lines={4} />

      <Box sx={fieldRow}>
        <Field label="التقييم العام" value={d.overallRating || '□ مرضي □ يحتاج تحسين □ غير مرضي'} flex={2} />
        <Field label="موعد المتابعة" value={formatDate(d.followUpDate)} />
      </Box>

      <SignatureBlock signatures={['المدقق', 'مدير التدقيق الداخلي', 'المدير العام']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

export default OperationsTemplateRenderer;
