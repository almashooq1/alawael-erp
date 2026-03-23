/**
 * قوالب طباعة الموارد البشرية — HR Print Templates
 * 12 نموذج: كشف راتب، شهادة تعريف، عقد عمل، إجازة، إنذار، ترقية، تقييم أداء،
 *           حضور شهري، بطاقة موظف، إخلاء طرف، نهاية خدمة، شهادة تدريب
 */
import { Box, Typography, Divider, Grid, Avatar, Chip } from '@mui/material';
import {
  OrgHeader, OrgFooter, SignatureBlock, StampCircle, Section, Field,
  fieldRow, fieldBox, labelSx, valueSx, bodyPad, pageWrapper, formatDate,
  formatMoney, today, RefDateLine, ConfidentialBanner, DeclarationBox,
  NotesBox, PrintTable, EmptyTable,
} from '../shared/PrintTemplateShared';

/* ════════════════════════════════════════════════════
   TEMPLATE DEFINITIONS (for gallery)
   ════════════════════════════════════════════════════ */
export const HR_TEMPLATES = [
  { id: 'salary-slip', name: 'كشف الراتب', nameEn: 'Salary Slip', desc: 'كشف راتب شهري تفصيلي بالاستحقاقات والاستقطاعات', color: '#2e7d32' },
  { id: 'salary-cert', name: 'شهادة تعريف بالراتب', nameEn: 'Salary Certificate', desc: 'شهادة رسمية بمقدار الراتب للجهات الخارجية', color: '#1565c0' },
  { id: 'experience-cert', name: 'شهادة خبرة', nameEn: 'Experience Certificate', desc: 'شهادة تثبت فترة العمل والمسمى الوظيفي', color: '#6a1b9a' },
  { id: 'employment-contract', name: 'عقد العمل', nameEn: 'Employment Contract', desc: 'عقد عمل رسمي يتضمن كافة الشروط والالتزامات', color: '#00695c' },
  { id: 'leave-request', name: 'نموذج طلب إجازة', nameEn: 'Leave Request', desc: 'نموذج تقديم طلب إجازة بأنواعها المختلفة', color: '#ef6c00' },
  { id: 'warning-letter', name: 'خطاب إنذار', nameEn: 'Warning Letter', desc: 'خطاب إنذار رسمي للموظف بسبب مخالفة', color: '#c62828' },
  { id: 'promotion-letter', name: 'خطاب ترقية', nameEn: 'Promotion Letter', desc: 'خطاب إعلام بالترقية والمسمى والراتب الجديد', color: '#1565c0' },
  { id: 'performance-review', name: 'تقرير تقييم الأداء', nameEn: 'Performance Review', desc: 'تقرير تقييم أداء سنوي شامل للموظف', color: '#ff8f00' },
  { id: 'attendance-report', name: 'كشف الحضور الشهري', nameEn: 'Monthly Attendance', desc: 'كشف حضور وانصراف شهري تفصيلي', color: '#37474f' },
  { id: 'employee-id', name: 'بطاقة موظف', nameEn: 'Employee ID Card', desc: 'بطاقة تعريف الموظف مع الصورة والبيانات الأساسية', color: '#0277bd' },
  { id: 'clearance-form', name: 'نموذج إخلاء طرف', nameEn: 'Clearance Form', desc: 'نموذج إخلاء طرف عند انتهاء الخدمة', color: '#4e342e' },
  { id: 'training-cert', name: 'شهادة تدريب', nameEn: 'Training Certificate', desc: 'شهادة إتمام برنامج تدريبي', color: '#00838f' },
];

/* ════════════════════════════════════════════════════
   TEMPLATE RENDERER
   ════════════════════════════════════════════════════ */
export const HRTemplateRenderer = ({ templateId, data }) => {
  const d = data || {};
  switch (templateId) {
    case 'salary-slip': return <SalarySlip d={d} />;
    case 'salary-cert': return <SalaryCert d={d} />;
    case 'experience-cert': return <ExperienceCert d={d} />;
    case 'employment-contract': return <EmploymentContract d={d} />;
    case 'leave-request': return <LeaveRequest d={d} />;
    case 'warning-letter': return <WarningLetter d={d} />;
    case 'promotion-letter': return <PromotionLetter d={d} />;
    case 'performance-review': return <PerformanceReview d={d} />;
    case 'attendance-report': return <AttendanceReport d={d} />;
    case 'employee-id': return <EmployeeIdCard d={d} />;
    case 'clearance-form': return <ClearanceForm d={d} />;
    case 'training-cert': return <TrainingCert d={d} />;
    default: return <Typography textAlign="center" py={8} color="text.secondary">اختر قالباً</Typography>;
  }
};

/* ═══════ 1. SALARY SLIP ═══════ */
const SalarySlip = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="كشف الراتب" subtitle="Salary Slip" color="#2e7d32" />
    <Box sx={bodyPad}>
      <ConfidentialBanner text="سري — لا يُعرض على أطراف خارجية" />
      <RefDateLine prefix="SAL" />
      <Section title="بيانات الموظف" color="#2e7d32" />
      <Box sx={fieldRow}>
        <Field label="اسم الموظف" value={d.name} flex={2} />
        <Field label="الرقم الوظيفي" value={d.empId} />
        <Field label="القسم" value={d.department} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="المسمى الوظيفي" value={d.position} />
        <Field label="تاريخ الالتحاق" value={formatDate(d.joinDate)} />
        <Field label="الشهر" value={d.month || '________'} />
      </Box>

      <Section title="الاستحقاقات" color="#2e7d32" />
      <PrintTable headers={[{ label: 'البند', width: '60%' }, { label: 'المبلغ (ر.س)', center: true }]}
        rows={[
          ['الراتب الأساسي', formatMoney(d.basicSalary)],
          ['بدل سكن', formatMoney(d.housingAllowance)],
          ['بدل نقل', formatMoney(d.transportAllowance)],
          ['بدلات أخرى', formatMoney(d.otherAllowances)],
          ['عمل إضافي', formatMoney(d.overtime)],
        ]} headerBg="#e8f5e9" />

      <Section title="الاستقطاعات" color="#c62828" />
      <PrintTable headers={[{ label: 'البند', width: '60%' }, { label: 'المبلغ (ر.س)', center: true }]}
        rows={[
          ['التأمينات الاجتماعية (GOSI)', formatMoney(d.gosiDeduction)],
          ['سلفة', formatMoney(d.loanDeduction)],
          ['غياب / تأخير', formatMoney(d.absenceDeduction)],
          ['استقطاعات أخرى', formatMoney(d.otherDeductions)],
        ]} headerBg="#ffebee" />

      <Box sx={{ bgcolor: '#e8f5e9', p: 2, borderRadius: 2, mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight="bold" color="#2e7d32">صافي الراتب</Typography>
        <Typography variant="h5" fontWeight="bold" color="#2e7d32">{formatMoney(d.netSalary)} ر.س</Typography>
      </Box>

      <Box sx={fieldRow} mt={2}>
        <Field label="إجمالي الاستحقاقات" value={`${formatMoney(d.totalEarnings)} ر.س`} />
        <Field label="إجمالي الاستقطاعات" value={`${formatMoney(d.totalDeductions)} ر.س`} />
        <Field label="طريقة الدفع" value={d.paymentMethod || 'تحويل بنكي'} />
      </Box>

      <SignatureBlock signatures={['الموظف', 'مدير الموارد البشرية', 'المدير المالي']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 2. SALARY CERTIFICATE ═══════ */
const SalaryCert = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="شهادة تعريف بالراتب" subtitle="Salary Certificate" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="SC" />
      <Typography variant="body1" fontWeight="bold" mb={2}>إلى من يهمه الأمر</Typography>
      <Typography variant="body1" sx={{ lineHeight: 2.5 }}>
        يشهد مركز الأوائل للتأهيل بأن السيد / السيدة: <strong>{d.name || '________________'}</strong>
        <br />رقم الهوية: <strong>{d.nationalId || '________________'}</strong>
        <br />يعمل / تعمل لدينا بوظيفة: <strong>{d.position || '________________'}</strong>
        <br />في قسم: <strong>{d.department || '________________'}</strong>
        <br />منذ تاريخ: <strong>{formatDate(d.joinDate)}</strong>
        <br /><br />ويتقاضى / تتقاضى راتباً شهرياً إجمالياً قدره:
        <br /><strong style={{ fontSize: 18, color: '#1a237e' }}>{formatMoney(d.totalSalary)} ريال سعودي</strong>
        <br /><br />وقد أُعطيت هذه الشهادة بناءً على طلبه / طلبها دون أدنى مسؤولية على المركز.
      </Typography>
      <SignatureBlock signatures={['مدير الموارد البشرية']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 3. EXPERIENCE CERTIFICATE ═══════ */
const ExperienceCert = ({ d }) => (
  <Box sx={{ ...pageWrapper, border: '3px double #1a237e' }}>
    <OrgHeader title="شهادة خبرة" subtitle="Experience Certificate" color="#6a1b9a" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="EXP" />
      <Typography variant="body1" fontWeight="bold" mb={2}>إلى من يهمه الأمر</Typography>
      <Typography variant="body1" sx={{ lineHeight: 2.5 }}>
        يشهد مركز الأوائل للتأهيل بأن السيد / السيدة: <strong>{d.name || '________________'}</strong>
        <br />رقم الهوية: <strong>{d.nationalId || '________________'}</strong>، الجنسية: <strong>{d.nationality || '________________'}</strong>
        <br /><br />قد عمل / عملت لدى المركز بوظيفة: <strong>{d.position || '________________'}</strong>
        <br />في قسم: <strong>{d.department || '________________'}</strong>
        <br />خلال الفترة من: <strong>{formatDate(d.startDate)}</strong> إلى: <strong>{formatDate(d.endDate)}</strong>
        <br /><br />وخلال فترة عمله / عملها أظهر / أظهرت كفاءة عالية والتزاماً مهنياً وسلوكاً حسناً.
        <br /><br />وقد أُعطيت هذه الشهادة بناءً على طلبه / طلبها دون أدنى مسؤولية على المركز.
        <br />نتمنى له / لها كل التوفيق والنجاح.
      </Typography>
      <SignatureBlock signatures={['مدير المركز']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 4. EMPLOYMENT CONTRACT ═══════ */
const EmploymentContract = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="عقد العمل" subtitle="Employment Contract" color="#00695c" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="CON" />
      <Typography variant="body1" sx={{ lineHeight: 2.2 }}>
        تم بحمد الله وتوفيقه في يوم <strong>{today()}</strong> الاتفاق بين كل من:
      </Typography>
      <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2, my: 2 }}>
        <Typography variant="body2"><strong>الطرف الأول (صاحب العمل):</strong> مركز الأوائل للتأهيل، سجل تجاري رقم: ________________</Typography>
        <Typography variant="body2" mt={1}><strong>الطرف الثاني (الموظف):</strong> {d.name || '________________'}، رقم الهوية: {d.nationalId || '________________'}</Typography>
      </Box>

      <Section title="بنود العقد" color="#00695c" />
      {[
        ['المادة الأولى — نوع العمل', `يعمل الطرف الثاني بوظيفة ${d.position || '________'} في قسم ${d.department || '________'}`],
        ['المادة الثانية — مدة العقد', `مدة العقد ${d.contractDuration || '________'} تبدأ من ${formatDate(d.startDate)} وتنتهي في ${formatDate(d.endDate)}`],
        ['المادة الثالثة — فترة التجربة', 'يخضع الطرف الثاني لفترة تجربة مدتها ثلاثة أشهر من تاريخ مباشرة العمل'],
        ['المادة الرابعة — الراتب', `يتقاضى الطرف الثاني راتباً شهرياً إجمالياً قدره ${formatMoney(d.totalSalary)} ريال سعودي`],
        ['المادة الخامسة — ساعات العمل', `ساعات العمل ${d.workHours || '8'} ساعات يومياً، ${d.workDays || '5'} أيام في الأسبوع`],
        ['المادة السادسة — الإجازات', 'يستحق الطرف الثاني إجازة سنوية وفقاً لنظام العمل السعودي'],
        ['المادة السابعة — إنهاء العقد', 'يجوز لأي طرف إنهاء العقد بإشعار كتابي مسبق وفقاً لنظام العمل'],
        ['المادة الثامنة — أحكام عامة', 'يخضع هذا العقد لأحكام نظام العمل السعودي فيما لم يرد به نص'],
      ].map(([title, text], i) => (
        <Box key={i} sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">{title}</Typography>
          <Typography variant="body2" color="text.secondary">{text}</Typography>
        </Box>
      ))}

      <Typography variant="body2" mt={3}>حُرر هذا العقد من نسختين لكل طرف نسخة للعمل بموجبها.</Typography>
      <SignatureBlock signatures={['الطرف الأول (صاحب العمل)', 'الطرف الثاني (الموظف)']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 5. LEAVE REQUEST ═══════ */
const LeaveRequest = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="نموذج طلب إجازة" subtitle="Leave Request Form" color="#ef6c00" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="LV" />
      <Section title="بيانات الموظف" color="#ef6c00" />
      <Box sx={fieldRow}>
        <Field label="اسم الموظف" value={d.name} flex={2} />
        <Field label="الرقم الوظيفي" value={d.empId} />
        <Field label="القسم" value={d.department} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="المسمى الوظيفي" value={d.position} />
        <Field label="المدير المباشر" value={d.manager} />
      </Box>

      <Section title="تفاصيل الإجازة" color="#ef6c00" />
      <Box sx={fieldRow}>
        <Field label="نوع الإجازة" value={d.leaveType} />
        <Field label="من تاريخ" value={formatDate(d.startDate)} />
        <Field label="إلى تاريخ" value={formatDate(d.endDate)} />
        <Field label="عدد الأيام" value={d.days} />
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography sx={labelSx}>سبب الإجازة</Typography>
        <Box sx={{ border: '1px dotted #999', borderRadius: 1, p: 1.5, minHeight: 40 }}>
          <Typography variant="body2">{d.reason || ''}</Typography>
        </Box>
      </Box>

      <Section title="رصيد الإجازات" color="#ef6c00" />
      <PrintTable headers={['النوع', 'المستحق', 'المستخدم', 'المتبقي']} headerBg="#fff3e0"
        rows={[
          ['سنوية', d.annualTotal || '—', d.annualUsed || '—', d.annualRemaining || '—'],
          ['مرضية', d.sickTotal || '—', d.sickUsed || '—', d.sickRemaining || '—'],
          ['طارئة', d.emergencyTotal || '—', d.emergencyUsed || '—', d.emergencyRemaining || '—'],
        ]} />

      <Section title="بيانات العنوان أثناء الإجازة" color="#ef6c00" />
      <Box sx={fieldRow}>
        <Field label="رقم الجوال" value={d.phone} />
        <Field label="العنوان" value={d.address} flex={2} />
      </Box>

      <Section title="المسار الإداري" color="#ef6c00" />
      <PrintTable headers={['الجهة', 'التوقيع', 'التاريخ', 'القرار']} headerBg="#fff3e0"
        rows={[
          ['المدير المباشر', '', '', '□ موافق  □ مرفوض'],
          ['مدير الموارد البشرية', '', '', '□ موافق  □ مرفوض'],
          ['المدير العام', '', '', '□ موافق  □ مرفوض'],
        ]} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 6. WARNING LETTER ═══════ */
const WarningLetter = ({ d }) => (
  <Box sx={{ ...pageWrapper, border: '2px solid #c62828' }}>
    <OrgHeader title="خطاب إنذار" subtitle="Warning Letter" color="#c62828" />
    <Box sx={bodyPad}>
      <ConfidentialBanner text="سري — CONFIDENTIAL" />
      <RefDateLine prefix="WRN" />
      <Box sx={fieldRow}>
        <Field label="اسم الموظف" value={d.name} flex={2} />
        <Field label="الرقم الوظيفي" value={d.empId} />
        <Field label="القسم" value={d.department} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="المسمى الوظيفي" value={d.position} />
        <Field label="درجة الإنذار" value={d.warningLevel || '□ أول  □ ثاني  □ نهائي'} flex={2} />
      </Box>

      <Section title="تفاصيل المخالفة" color="#c62828" />
      <Box sx={fieldRow}><Field label="تاريخ المخالفة" value={formatDate(d.violationDate)} /><Field label="نوع المخالفة" value={d.violationType} flex={2} /></Box>
      <NotesBox content={d.violationDetails} minHeight={80} />

      <Section title="الإجراء المتخذ" color="#c62828" />
      <NotesBox content={d.action} minHeight={60} />

      <DeclarationBox text="أقر بأنني اطلعت على مضمون هذا الخطاب وأتعهد بعدم تكرار المخالفة المذكورة أعلاه." />
      <SignatureBlock signatures={['الموظف', 'المدير المباشر', 'مدير الموارد البشرية']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 7. PROMOTION LETTER ═══════ */
const PromotionLetter = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="خطاب ترقية" subtitle="Promotion Letter" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="PRM" />
      <Typography variant="body1" sx={{ lineHeight: 2.5 }}>
        السيد / السيدة: <strong>{d.name || '________________'}</strong>
        <br />الرقم الوظيفي: <strong>{d.empId || '________'}</strong>
        <br /><br />تحية طيبة وبعد،
        <br /><br />يسعدنا أن نبلغكم بقرار الإدارة بترقيتكم وذلك اعتباراً من تاريخ <strong>{formatDate(d.effectiveDate)}</strong> كالتالي:
      </Typography>
      <PrintTable headers={['', 'السابق', 'الجديد']} headerBg="#e3f2fd"
        rows={[
          ['المسمى الوظيفي', d.oldPosition || '________', d.newPosition || '________'],
          ['الدرجة', d.oldGrade || '________', d.newGrade || '________'],
          ['الراتب الأساسي', formatMoney(d.oldSalary), formatMoney(d.newSalary)],
          ['القسم', d.oldDepartment || '________', d.newDepartment || '________'],
        ]} />
      <Typography variant="body1" sx={{ lineHeight: 2 }}>
        نتمنى لكم مزيداً من التوفيق والنجاح في مهامكم الجديدة.
        <br />وتفضلوا بقبول فائق الاحترام والتقدير.
      </Typography>
      <SignatureBlock signatures={['مدير المركز']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 8. PERFORMANCE REVIEW ═══════ */
const PerformanceReview = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="تقرير تقييم الأداء" subtitle="Performance Review" color="#ff8f00" />
    <Box sx={bodyPad}>
      <ConfidentialBanner />
      <RefDateLine prefix="PRF" />

      <Section title="بيانات الموظف" color="#ff8f00" />
      <Box sx={fieldRow}>
        <Field label="اسم الموظف" value={d.name} flex={2} />
        <Field label="الرقم الوظيفي" value={d.empId} />
        <Field label="القسم" value={d.department} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="المسمى" value={d.position} />
        <Field label="فترة التقييم" value={d.period || '________'} />
        <Field label="المقيّم" value={d.reviewer} />
      </Box>

      <Section title="معايير التقييم" color="#ff8f00" />
      <PrintTable headers={['المعيار', { label: '5', center: true }, { label: '4', center: true }, { label: '3', center: true }, { label: '2', center: true }, { label: '1', center: true }, 'ملاحظات']}
        headerBg="#fff8e1"
        rows={[
          ['جودة العمل', '□', '□', '□', '□', '□', ''],
          ['الالتزام بالمواعيد', '□', '□', '□', '□', '□', ''],
          ['روح الفريق', '□', '□', '□', '□', '□', ''],
          ['المبادرة والإبداع', '□', '□', '□', '□', '□', ''],
          ['مهارات التواصل', '□', '□', '□', '□', '□', ''],
          ['المعرفة التخصصية', '□', '□', '□', '□', '□', ''],
          ['القيادة', '□', '□', '□', '□', '□', ''],
          ['خدمة المستفيدين', '□', '□', '□', '□', '□', ''],
        ]} />
      <Typography variant="caption" color="text.secondary">5 = ممتاز | 4 = جيد جداً | 3 = جيد | 2 = مقبول | 1 = ضعيف</Typography>

      <Section title="التقييم العام" color="#ff8f00" />
      <Box sx={fieldRow}><Field label="المجموع الكلي" value={d.totalScore || '_____ / 40'} /><Field label="التقدير" value={d.grade || '□ ممتاز □ جيد جداً □ جيد □ مقبول □ ضعيف'} flex={2} /></Box>

      <Section title="نقاط القوة" color="#ff8f00" />
      <NotesBox lines={3} />
      <Section title="نقاط التحسين" color="#ff8f00" />
      <NotesBox lines={3} />
      <Section title="الأهداف للفترة القادمة" color="#ff8f00" />
      <NotesBox lines={3} />

      <SignatureBlock signatures={['الموظف', 'المدير المباشر', 'مدير الموارد البشرية']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 9. ATTENDANCE REPORT ═══════ */
const AttendanceReport = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="كشف الحضور الشهري" subtitle="Monthly Attendance Report" color="#37474f" />
    <Box sx={bodyPad}>
      <Box sx={fieldRow}>
        <Field label="اسم الموظف" value={d.name} flex={2} />
        <Field label="القسم" value={d.department} />
        <Field label="الشهر" value={d.month || '________'} />
      </Box>
      <EmptyTable headers={[
        { label: 'اليوم', width: 40 },
        { label: 'التاريخ' },
        { label: 'وقت الحضور', center: true },
        { label: 'وقت الانصراف', center: true },
        { label: 'الساعات', center: true },
        { label: 'ملاحظات' },
      ]} rowCount={31} headerBg="#eceff1" />
      <Box sx={fieldRow}>
        <Field label="إجمالي أيام العمل" value={d.totalDays || '___'} />
        <Field label="أيام الحضور" value={d.presentDays || '___'} />
        <Field label="أيام الغياب" value={d.absentDays || '___'} />
        <Field label="التأخيرات" value={d.lateDays || '___'} />
        <Field label="الإجازات" value={d.leaveDays || '___'} />
      </Box>
      <SignatureBlock signatures={['الموظف', 'المدير المباشر', 'الموارد البشرية']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 10. EMPLOYEE ID CARD ═══════ */
const EmployeeIdCard = ({ d }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
    <Box sx={{ width: 400, border: '3px solid #0277bd', borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ background: 'linear-gradient(135deg, #0277bd, #0288d1)', color: 'white', p: 2.5, textAlign: 'center' }}>
        <Typography variant="h6" fontWeight="bold">مركز الأوائل للتأهيل</Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>AlAwael Rehabilitation Center</Typography>
        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.3)' }} />
        <Typography variant="subtitle2" fontWeight="bold">بطاقة تعريف الموظف</Typography>
      </Box>
      <Box sx={{ p: 2.5, bgcolor: 'white' }}>
        <Box display="flex" gap={2} mb={2}>
          <Avatar sx={{ width: 72, height: 72, bgcolor: '#0277bd', fontSize: 28 }}>{(d.name || '?').charAt(0)}</Avatar>
          <Box flex={1}>
            <Typography variant="subtitle1" fontWeight="bold">{d.name || '—'}</Typography>
            <Typography variant="body2" color="text.secondary">{d.position || '—'}</Typography>
            <Chip size="small" label={d.department || '—'} sx={{ mt: 0.5, fontSize: 10 }} />
          </Box>
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        <Grid container spacing={1}>
          {[
            ['الرقم الوظيفي', d.empId || '—'],
            ['رقم الهوية', d.nationalId || '—'],
            ['فصيلة الدم', d.bloodType || '—'],
            ['الجوال', d.phone || '—'],
            ['تاريخ الالتحاق', formatDate(d.joinDate)],
            ['الحالة', d.status || 'نشط'],
          ].map(([l, v], i) => (
            <Grid item xs={6} key={i}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{l}</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>{v}</Typography>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ bgcolor: '#fff3e0', p: 1.5, borderRadius: 1, mt: 1.5 }}>
          <Typography variant="caption" fontWeight="bold" color="error">طوارئ:</Typography>
          <Typography variant="body2" sx={{ fontSize: 11 }}>{d.emergencyContact || '—'} — {d.emergencyPhone || '—'}</Typography>
        </Box>
      </Box>
      <Box sx={{ background: '#0277bd', color: 'white', p: 1, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ fontSize: 9 }}>هذه البطاقة ملك لمركز الأوائل — يرجى إعادتها في حال العثور عليها</Typography>
      </Box>
    </Box>
  </Box>
);

/* ═══════ 11. CLEARANCE FORM ═══════ */
const ClearanceForm = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="نموذج إخلاء طرف" subtitle="Clearance Form" color="#4e342e" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="CLR" />
      <Section title="بيانات الموظف" color="#4e342e" />
      <Box sx={fieldRow}>
        <Field label="اسم الموظف" value={d.name} flex={2} />
        <Field label="الرقم الوظيفي" value={d.empId} />
        <Field label="القسم" value={d.department} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="المسمى" value={d.position} />
        <Field label="تاريخ الالتحاق" value={formatDate(d.joinDate)} />
        <Field label="آخر يوم عمل" value={formatDate(d.lastDay)} />
        <Field label="سبب الترك" value={d.reason} />
      </Box>

      <Section title="إخلاء الطرف من الأقسام" color="#4e342e" />
      <PrintTable headers={['القسم', 'الحالة', 'ملاحظات', 'التوقيع', 'التاريخ']} headerBg="#efebe9"
        rows={[
          ['الموارد البشرية', '□ تم □ لا ينطبق', '', '', ''],
          ['الشؤون المالية', '□ تم □ لا ينطبق', '', '', ''],
          ['تقنية المعلومات', '□ تم □ لا ينطبق', '', '', ''],
          ['الصيانة والمرافق', '□ تم □ لا ينطبق', '', '', ''],
          ['المستودعات', '□ تم □ لا ينطبق', '', '', ''],
          ['القسم المباشر', '□ تم □ لا ينطبق', '', '', ''],
          ['الأمن والسلامة', '□ تم □ لا ينطبق', '', '', ''],
          ['الشؤون الإدارية', '□ تم □ لا ينطبق', '', '', ''],
        ]} />

      <Section title="العهد المسلّمة" color="#4e342e" />
      <EmptyTable headers={['م', 'الصنف', 'العدد', 'الحالة', 'ملاحظات']} rowCount={5} headerBg="#efebe9" />

      <DeclarationBox text="أقر بأنني قد سلّمت جميع العهد والممتلكات التي بحوزتي وليس لديّ أي التزامات مالية تجاه المركز." />
      <SignatureBlock signatures={['الموظف', 'مدير الموارد البشرية', 'المدير المالي', 'المدير العام']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 12. TRAINING CERTIFICATE ═══════ */
const TrainingCert = ({ d }) => (
  <Box sx={{ ...pageWrapper, border: '3px double #00838f' }}>
    <Box sx={{ background: 'linear-gradient(135deg, #00838f, #00acc1)', color: 'white', py: 4, px: 3, textAlign: 'center' }}>
      <Typography variant="h4" fontWeight="bold">مركز الأوائل للتأهيل</Typography>
      <Typography variant="body1" sx={{ opacity: 0.9 }}>AlAwael Rehabilitation Center</Typography>
      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
      <Typography variant="h5" fontWeight="bold">شهادة إتمام تدريب</Typography>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>Training Completion Certificate</Typography>
    </Box>
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="body1" sx={{ lineHeight: 2.5, mt: 2 }}>يشهد مركز الأوائل للتأهيل بأن:</Typography>
      <Typography variant="h4" fontWeight="bold" sx={{ my: 3, color: '#00838f', borderBottom: '2px solid #00838f', display: 'inline-block', pb: 1, px: 4 }}>
        {d.name || '________________________'}
      </Typography>
      <Typography variant="body1" sx={{ lineHeight: 2.5 }}>
        قد أتم / أتمت بنجاح البرنامج التدريبي:
        <br /><strong style={{ fontSize: 18 }}>{d.programName || '________________________________'}</strong>
        <br />خلال الفترة من <strong>{formatDate(d.startDate)}</strong> إلى <strong>{formatDate(d.endDate)}</strong>
        <br />بواقع <strong>{d.hours || '___'}</strong> ساعة تدريبية
        {d.grade && <><br />وحصل / حصلت على تقدير: <strong>{d.grade}</strong></>}
      </Typography>
      <Box sx={{ mt: 6, display: 'flex', justifyContent: 'space-around' }}>
        <Box textAlign="center">
          <Box sx={{ borderBottom: '1px solid #333', mb: 1, height: 40, minWidth: 150 }} />
          <Typography variant="caption" fontWeight="bold">مدير التدريب</Typography>
        </Box>
        <StampCircle />
        <Box textAlign="center">
          <Box sx={{ borderBottom: '1px solid #333', mb: 1, height: 40, minWidth: 150 }} />
          <Typography variant="caption" fontWeight="bold">مدير المركز</Typography>
        </Box>
      </Box>
      <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #ddd', fontSize: 11, color: '#999' }}>
        التاريخ: {today()} &nbsp;|&nbsp; رقم الشهادة: TRN-{new Date().getFullYear()}-________
      </Box>
    </Box>
  </Box>
);

export default HRTemplateRenderer;
