/**
 * قوالب طباعة الموارد البشرية الموسعة — Extended HR Print Templates
 * يشمل: التوظيف، الإجازات، الرواتب، التأمين، الأداء
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, PrintTable, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, formatMoney, today,
} from '../shared/PrintTemplateShared';

export const HR_EXT_TEMPLATES = [
  // التوظيف Recruitment
  { id: 'job-offer', name: 'عرض وظيفي', nameEn: 'Job Offer Letter', desc: 'خطاب عرض وظيفي', color: '#1b5e20' },
  { id: 'interview-eval', name: 'تقييم مقابلة', nameEn: 'Interview Evaluation', desc: 'نموذج تقييم المقابلة الشخصية', color: '#2e7d32' },
  { id: 'candidate-comparison', name: 'مقارنة مرشحين', nameEn: 'Candidate Comparison', desc: 'جدول مقارنة المرشحين', color: '#388e3c' },
  { id: 'onboarding-checklist', name: 'قائمة المباشرة', nameEn: 'Onboarding Checklist', desc: 'قائمة تحقق مباشرة موظف جديد', color: '#43a047' },
  // الإجازات Leave
  { id: 'leave-approval', name: 'اعتماد إجازة', nameEn: 'Leave Approval', desc: 'اعتماد طلب إجازة', color: '#00695c' },
  { id: 'leave-balance', name: 'تقرير رصيد الإجازات', nameEn: 'Leave Balance Report', desc: 'كشف أرصدة الإجازات', color: '#00796b' },
  { id: 'annual-leave-schedule', name: 'جدول الإجازات السنوية', nameEn: 'Annual Leave Schedule', desc: 'جدول توزيع الإجازات', color: '#00897b' },
  // الرواتب Payroll
  { id: 'payroll-summary', name: 'ملخص كشف الراتب', nameEn: 'Payroll Summary', desc: 'ملخص مسيّر الرواتب', color: '#4527a0' },
  { id: 'eos-calculation', name: 'حساب نهاية الخدمة', nameEn: 'End of Service Calculation', desc: 'احتساب مكافأة نهاية الخدمة', color: '#512da8' },
  { id: 'bank-transfer', name: 'خطاب تحويل بنكي', nameEn: 'Bank Transfer Letter', desc: 'خطاب تحويل للبنك', color: '#5e35b1' },
  { id: 'salary-increment', name: 'قرار زيادة راتب', nameEn: 'Salary Increment', desc: 'إشعار زيادة الراتب', color: '#673ab7' },
  // التأمين Insurance
  { id: 'insurance-card', name: 'بطاقة تأمين', nameEn: 'Insurance Card', desc: 'بطاقة التأمين الطبي', color: '#bf360c' },
  { id: 'insurance-claim', name: 'نموذج مطالبة تأمين', nameEn: 'Insurance Claim Form', desc: 'نموذج مطالبة تأمينية', color: '#d84315' },
  // الأداء Performance
  { id: 'appraisal-form', name: 'نموذج تقييم أداء', nameEn: 'Performance Appraisal', desc: 'نموذج تقييم الأداء السنوي', color: '#e65100' },
  { id: 'kpi-scorecard', name: 'بطاقة مؤشرات الأداء', nameEn: 'KPI Scorecard', desc: 'بطاقة أداء KPI', color: '#ef6c00' },
  { id: 'pip-form', name: 'خطة تحسين أداء', nameEn: 'Performance Improvement Plan', desc: 'نموذج خطة تحسين الأداء', color: '#f57c00' },
];

export const HRExtTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'job-offer':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="عرض وظيفي" subtitle="Job Offer Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ lineHeight: 2.2, margin: '20px 0' }}>
              <p>السيد / السيدة: <strong>{d.candidateName || '______________________'}</strong></p>
              <p>السلام عليكم ورحمة الله وبركاته،</p>
              <p>يسعدنا إبلاغكم بأنه تمت الموافقة على تعيينكم في الوظيفة التالية:</p>
            </div>
            <Section title="تفاصيل العرض">
              <div style={fieldRow}><Field label="المسمى الوظيفي" value={d.position} w="50%" /><Field label="القسم" value={d.department} w="50%" /></div>
              <div style={fieldRow}><Field label="الراتب الأساسي" value={formatMoney(d.basicSalary)} w="25%" /><Field label="بدل السكن" value={formatMoney(d.housingAllowance)} w="25%" /><Field label="بدل النقل" value={formatMoney(d.transportAllowance)} w="25%" /><Field label="الإجمالي" value={formatMoney(d.totalSalary)} w="25%" /></div>
              <div style={fieldRow}><Field label="تاريخ المباشرة" value={formatDate(d.startDate)} w="33%" /><Field label="فترة التجربة" value={d.probation || '3 أشهر'} w="33%" /><Field label="نوع العقد" value={d.contractType} w="34%" /></div>
            </Section>
            <Section title="المزايا">
              <NotesBox value={d.benefits || 'تأمين طبي — إجازة سنوية — تدريب وتطوير'} lines={3} />
            </Section>
            <div style={{ margin: '16px 0', padding: 12, background: '#e8f5e9', borderRadius: 8, fontSize: 12 }}>
              يرجى تأكيد قبولكم خلال <strong>{d.deadline || '5 أيام عمل'}</strong> من تاريخ هذا الخطاب.
            </div>
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'interview-eval':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تقييم المقابلة الشخصية" subtitle="Interview Evaluation Form" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <Section title="بيانات المرشح">
              <div style={fieldRow}><Field label="الاسم" value={d.candidateName} w="40%" /><Field label="الوظيفة المتقدم لها" value={d.position} w="35%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /></div>
            </Section>
            <Section title="معايير التقييم">
              <EmptyTable cols={4} rows={10} headers={['المعيار', 'ممتاز (5)', 'جيد (3)', 'ضعيف (1)']} />
            </Section>
            <div style={fieldRow}><Field label="المجموع" value={d.totalScore} w="25%" /><Field label="من" value={d.maxScore || '50'} w="15%" /><Field label="النسبة" value={d.percentage} w="20%" /><Field label="التوصية" value={d.recommendation} w="40%" /></div>
            <NotesBox label="ملاحظات المقابل" value={d.notes} lines={3} />
            <SignatureBlock rightLabel="المقابِل" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'candidate-comparison':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جدول مقارنة المرشحين" subtitle="Candidate Comparison Sheet" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الوظيفة" value={d.position} w="50%" /><Field label="القسم" value={d.department} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /></div>
            <Section title="المقارنة">
              <EmptyTable cols={6} rows={6} headers={['المعيار', 'المرشح 1', 'المرشح 2', 'المرشح 3', 'المرشح 4', 'المرشح 5']} />
            </Section>
            <Section title="المجموع والنتيجة">
              <EmptyTable cols={6} rows={2} headers={['', 'المرشح 1', 'المرشح 2', 'المرشح 3', 'المرشح 4', 'المرشح 5']} />
            </Section>
            <NotesBox label="التوصية النهائية" value={d.recommendation} />
            <SignatureBlock rightLabel="لجنة المقابلات" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'onboarding-checklist':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة تحقق مباشرة موظف جديد" subtitle="New Employee Onboarding Checklist" />
          <div style={bodyPad}>
            <Section title="بيانات الموظف">
              <div style={fieldRow}><Field label="الاسم" value={d.employeeName} w="40%" /><Field label="المسمى" value={d.position} w="30%" /><Field label="تاريخ المباشرة" value={formatDate(d.startDate)} w="30%" /></div>
            </Section>
            <Section title="قبل المباشرة">
              <EmptyTable cols={4} rows={5} headers={['البند', 'مكتمل', 'التاريخ', 'المسؤول']} />
            </Section>
            <Section title="يوم المباشرة">
              <EmptyTable cols={4} rows={6} headers={['البند', 'مكتمل', 'التاريخ', 'المسؤول']} />
            </Section>
            <Section title="الأسبوع الأول">
              <EmptyTable cols={4} rows={5} headers={['البند', 'مكتمل', 'التاريخ', 'المسؤول']} />
            </Section>
            <Section title="خلال فترة التجربة">
              <EmptyTable cols={4} rows={4} headers={['البند', 'مكتمل', 'التاريخ', 'المسؤول']} />
            </Section>
            <SignatureBlock rightLabel="الموظف الجديد" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'leave-approval':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="اعتماد طلب إجازة" subtitle="Leave Approval Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الموظف">
              <div style={fieldRow}><Field label="الاسم" value={d.employeeName} w="40%" /><Field label="الرقم الوظيفي" value={d.empNo} w="20%" /><Field label="القسم" value={d.department} w="20%" /><Field label="المسمى" value={d.position} w="20%" /></div>
            </Section>
            <Section title="تفاصيل الإجازة">
              <div style={fieldRow}><Field label="نوع الإجازة" value={d.leaveType} w="25%" /><Field label="من" value={formatDate(d.fromDate)} w="25%" /><Field label="إلى" value={formatDate(d.toDate)} w="25%" /><Field label="المدة" value={d.duration} w="25%" /></div>
              <div style={fieldRow}><Field label="الرصيد قبل" value={d.balanceBefore} w="33%" /><Field label="المستحق" value={d.deducted} w="33%" /><Field label="الرصيد بعد" value={d.balanceAfter} w="34%" /></div>
            </Section>
            <NotesBox label="سبب الإجازة" value={d.reason} />
            <div style={fieldRow}><Field label="البديل أثناء الإجازة" value={d.substitute} w="50%" /><Field label="رقم التواصل" value={d.contactNo} w="50%" /></div>
            <Section title="سلسلة الاعتماد">
              <EmptyTable cols={4} rows={3} headers={['المعتمِد', 'القرار', 'التاريخ', 'التوقيع']} />
            </Section>
          </div>
          <OrgFooter />
        </div>
      );

    case 'leave-balance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أرصدة الإجازات" subtitle="Leave Balance Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="40%" /><Field label="الفترة" value={d.period} w="30%" /><Field label="تاريخ التقرير" value={formatDate(d.date) || today()} w="30%" /></div>
            <Section title="أرصدة الموظفين">
              <EmptyTable cols={8} rows={15} headers={['م', 'الموظف', 'الرقم', 'سنوية', 'مرضية', 'طارئة', 'أخرى', 'الإجمالي']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الإجازات" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'annual-leave-schedule':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جدول توزيع الإجازات السنوية" subtitle="Annual Leave Schedule" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="40%" /><Field label="السنة" value={d.year} w="30%" /><Field label="معتمد من" value={d.approvedBy} w="30%" /></div>
            <Section title="جدول الإجازات">
              <EmptyTable cols={6} rows={15} headers={['الموظف', 'الفترة الأولى', 'الفترة الثانية', 'إجمالي الأيام', 'ملاحظات', 'الاعتماد']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.notes} />
            <SignatureBlock rightLabel="مدير القسم" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'payroll-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص مسيّر الرواتب" subtitle="Payroll Summary" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="25%" /><Field label="السنة" value={d.year} w="25%" /><Field label="القسم" value={d.department || 'جميع الأقسام'} w="25%" /><Field label="عدد الموظفين" value={d.employeeCount} w="25%" /></div>
            <Section title="تفاصيل الرواتب">
              <EmptyTable cols={8} rows={12} headers={['الموظف', 'الأساسي', 'البدلات', 'الاستقطاعات', 'GOSI', 'الغياب', 'المكافآت', 'الصافي']} />
            </Section>
            <Section title="الإجماليات">
              <div style={fieldRow}><Field label="إجمالي الأساسي" value={formatMoney(d.totalBasic)} w="25%" /><Field label="إجمالي البدلات" value={formatMoney(d.totalAllowances)} w="25%" /><Field label="إجمالي الاستقطاعات" value={formatMoney(d.totalDeductions)} w="25%" /><Field label="الصافي الإجمالي" value={formatMoney(d.totalNet)} w="25%" /></div>
            </Section>
            <SignatureBlock rightLabel="مسؤول الرواتب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'eos-calculation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="احتساب مكافأة نهاية الخدمة" subtitle="End of Service Calculation" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الموظف">
              <div style={fieldRow}><Field label="الاسم" value={d.employeeName} w="40%" /><Field label="الرقم الوظيفي" value={d.empNo} w="20%" /><Field label="المسمى" value={d.position} w="20%" /><Field label="القسم" value={d.department} w="20%" /></div>
              <div style={fieldRow}><Field label="تاريخ الالتحاق" value={formatDate(d.joinDate)} w="33%" /><Field label="تاريخ الانتهاء" value={formatDate(d.endDate)} w="33%" /><Field label="مدة الخدمة" value={d.servicePeriod} w="34%" /></div>
            </Section>
            <Section title="احتساب المكافأة">
              <div style={fieldRow}><Field label="الراتب الأخير" value={formatMoney(d.lastSalary)} w="25%" /><Field label="بدل السكن" value={formatMoney(d.housing)} w="25%" /><Field label="بدل النقل" value={formatMoney(d.transport)} w="25%" /><Field label="إجمالي الأجر" value={formatMoney(d.totalWage)} w="25%" /></div>
              <div style={fieldRow}><Field label="5 سنوات الأولى (نصف)" value={formatMoney(d.first5)} w="33%" /><Field label="ما بعد 5 سنوات (كامل)" value={formatMoney(d.after5)} w="33%" /><Field label="إجمالي المكافأة" value={formatMoney(d.totalEOS)} w="34%" /></div>
            </Section>
            <NotesBox label="سبب انتهاء الخدمة" value={d.reason} />
            <SignatureBlock rightLabel="مسؤول الرواتب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'bank-transfer':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطاب تحويل بنكي" subtitle="Bank Transfer Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ lineHeight: 2.2, margin: '16px 0' }}>
              <p>السادة / بنك <strong>{d.bankName || '________________'}</strong> المحترمين</p>
              <p>السلام عليكم ورحمة الله وبركاته،</p>
              <p>نأمل التكرم بتحويل المبلغ الموضح أدناه إلى حساب الموظف المذكور:</p>
            </div>
            <Section title="بيانات الموظف">
              <div style={fieldRow}><Field label="الاسم" value={d.employeeName} w="40%" /><Field label="رقم الحساب IBAN" value={d.iban} w="35%" /><Field label="البنك" value={d.bank} w="25%" /></div>
            </Section>
            <Section title="تفاصيل التحويل">
              <div style={fieldRow}><Field label="المبلغ" value={formatMoney(d.amount)} w="33%" /><Field label="الغرض" value={d.purpose} w="33%" /><Field label="الشهر" value={d.month} w="34%" /></div>
            </Section>
            <SignatureBlock rightLabel="المدير المالي" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'salary-increment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إشعار زيادة الراتب" subtitle="Salary Increment Notice" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ lineHeight: 2, margin: '16px 0' }}>
              <p>السيد / السيدة: <strong>{d.employeeName || '________________'}</strong></p>
              <p>يسرنا إبلاغكم بقرار زيادة راتبكم كالتالي:</p>
            </div>
            <Section title="تفاصيل الزيادة">
              <div style={fieldRow}><Field label="الراتب السابق" value={formatMoney(d.oldSalary)} w="33%" /><Field label="الراتب الجديد" value={formatMoney(d.newSalary)} w="33%" /><Field label="الزيادة" value={formatMoney(d.increment)} w="34%" /></div>
              <div style={fieldRow}><Field label="النسبة" value={d.percentage} w="33%" /><Field label="تاريخ السريان" value={formatDate(d.effectiveDate)} w="33%" /><Field label="السبب" value={d.reason} w="34%" /></div>
            </Section>
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'insurance-card':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة التأمين الطبي" subtitle="Medical Insurance Card" />
          <div style={bodyPad}>
            <div style={{ border: '3px solid #bf360c', borderRadius: 16, padding: 24, maxWidth: 500, margin: '20px auto' }}>
              <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#bf360c', marginBottom: 16 }}>بطاقة التأمين الطبي</div>
              <div style={fieldRow}><Field label="اسم المؤمن له" value={d.name} w="60%" /><Field label="رقم البطاقة" value={d.cardNo} w="40%" /></div>
              <div style={fieldRow}><Field label="شركة التأمين" value={d.insurer} w="50%" /><Field label="رقم الوثيقة" value={d.policyNo} w="50%" /></div>
              <div style={fieldRow}><Field label="الفئة" value={d.category} w="33%" /><Field label="من" value={formatDate(d.validFrom)} w="33%" /><Field label="إلى" value={formatDate(d.validTo)} w="34%" /></div>
              <div style={fieldRow}><Field label="جهة العمل" value={d.employer} w="50%" /><Field label="رقم الموظف" value={d.empNo} w="50%" /></div>
            </div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'insurance-claim':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج مطالبة تأمينية" subtitle="Insurance Claim Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المؤمن له">
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="40%" /><Field label="رقم البطاقة" value={d.cardNo} w="30%" /><Field label="الفئة" value={d.category} w="30%" /></div>
            </Section>
            <Section title="تفاصيل المطالبة">
              <div style={fieldRow}><Field label="نوع المطالبة" value={d.claimType} w="33%" /><Field label="المبلغ" value={formatMoney(d.amount)} w="33%" /><Field label="تاريخ العلاج" value={formatDate(d.treatmentDate)} w="34%" /></div>
              <div style={fieldRow}><Field label="المستشفى / العيادة" value={d.provider} w="50%" /><Field label="التشخيص" value={d.diagnosis} w="50%" /></div>
            </Section>
            <Section title="المستندات المرفقة">
              <EmptyTable cols={3} rows={5} headers={['المستند', 'متوفر', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مقدم المطالبة" leftLabel="مسؤول التأمين" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'appraisal-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تقييم الأداء السنوي" subtitle="Annual Performance Appraisal" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <Section title="بيانات الموظف">
              <div style={fieldRow}><Field label="الاسم" value={d.employeeName} w="40%" /><Field label="المسمى" value={d.position} w="30%" /><Field label="القسم" value={d.department} w="30%" /></div>
              <div style={fieldRow}><Field label="فترة التقييم" value={d.period} w="40%" /><Field label="المدير المباشر" value={d.manager} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
            </Section>
            <Section title="معايير الأداء">
              <EmptyTable cols={5} rows={8} headers={['المعيار', 'الوزن %', 'التقييم (1-5)', 'النتيجة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="المجموع" value={d.totalScore} w="25%" /><Field label="التصنيف" value={d.rating} w="25%" /><Field label="التوصية" value={d.recommendation} w="50%" /></div>
            <NotesBox label="نقاط القوة" value={d.strengths} />
            <NotesBox label="مجالات التطوير" value={d.development} />
            <NotesBox label="أهداف الفترة القادمة" value={d.goals} />
            <SignatureBlock rightLabel="المدير المباشر" leftLabel="المدير العام" />
            <div style={{ marginTop: 12 }}><SignatureBlock rightLabel="الموظف (اطلعت)" leftLabel="" /></div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'kpi-scorecard':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة مؤشرات الأداء" subtitle="KPI Scorecard" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف / القسم" value={d.entity} w="40%" /><Field label="الفترة" value={d.period} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
            <Section title="مؤشرات الأداء الرئيسية">
              <EmptyTable cols={7} rows={10} headers={['المؤشر', 'الوحدة', 'المستهدف', 'الفعلي', 'النسبة %', 'الوزن %', 'النتيجة']} />
            </Section>
            <div style={fieldRow}><Field label="المجموع المرجح" value={d.weightedTotal} w="33%" /><Field label="التصنيف" value={d.rating} w="33%" /><Field label="الاتجاه" value={d.trend} w="34%" /></div>
            <NotesBox label="تحليل وملاحظات" value={d.analysis} />
            <SignatureBlock rightLabel="المسؤول" leftLabel="المدير" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'pip-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة تحسين الأداء" subtitle="Performance Improvement Plan (PIP)" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الموظف">
              <div style={fieldRow}><Field label="الاسم" value={d.employeeName} w="40%" /><Field label="المسمى" value={d.position} w="30%" /><Field label="القسم" value={d.department} w="30%" /></div>
              <div style={fieldRow}><Field label="فترة الخطة" value={d.pipPeriod} w="40%" /><Field label="المدير المباشر" value={d.manager} w="30%" /><Field label="تاريخ البداية" value={formatDate(d.startDate)} w="30%" /></div>
            </Section>
            <NotesBox label="مجالات الأداء المطلوب تحسينها" value={d.areasOfImprovement} lines={3} />
            <Section title="خطة العمل">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'الإجراء', 'الدعم المطلوب', 'الموعد النهائي', 'معيار النجاح']} />
            </Section>
            <Section title="المراجعات الدورية">
              <EmptyTable cols={4} rows={4} headers={['التاريخ', 'التقدم', 'ملاحظات', 'التوقيع']} />
            </Section>
            <div style={{ margin: '12px 0', padding: 12, background: '#fff3e0', borderRadius: 8, fontSize: 11 }}>
              في حال عدم تحقيق التحسين المطلوب خلال الفترة المحددة، قد يتم اتخاذ إجراءات إدارية إضافية.
            </div>
            <SignatureBlock rightLabel="الموظف" leftLabel="المدير المباشر" />
            <div style={{ marginTop: 12 }}><SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="" /></div>
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
