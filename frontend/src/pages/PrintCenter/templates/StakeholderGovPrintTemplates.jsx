/**
 * قوالب طباعة أصحاب المصلحة والجهات الحكومية — Stakeholder & Government Print Templates
 * يشمل: الشكاوى، الزوار، المتطوعون، المجتمع، الجهات الحكومية، رضا الأسر، قوائم الانتظار
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const STAKEHOLDER_TEMPLATES = [
  // الشكاوى
  { id: 'complaint-receipt', name: 'إيصال شكوى', nameEn: 'Complaint Receipt', desc: 'إيصال استلام شكوى', color: '#e65100' },
  { id: 'complaint-resolution', name: 'تقرير معالجة شكوى', nameEn: 'Complaint Resolution Report', desc: 'تقرير معالجة وحل الشكوى', color: '#ef6c00' },
  // الزوار
  { id: 'visitor-pass', name: 'تصريح زيارة', nameEn: 'Visitor Pass', desc: 'بطاقة تصريح زائر', color: '#37474f' },
  { id: 'visitor-log', name: 'سجل الزوار', nameEn: 'Visitor Log Sheet', desc: 'كشف تسجيل الزوار', color: '#455a64' },
  { id: 'visitor-nda', name: 'اتفاقية سرية زائر', nameEn: 'Visitor NDA', desc: 'نموذج سرية للزوار', color: '#546e7a' },
  // المتطوعون
  { id: 'volunteer-cert', name: 'شهادة تطوع', nameEn: 'Volunteer Certificate', desc: 'شهادة شكر وتقدير متطوع', color: '#1b5e20' },
  { id: 'volunteer-hours', name: 'تقرير ساعات التطوع', nameEn: 'Volunteer Hours Report', desc: 'كشف ساعات التطوع', color: '#2e7d32' },
  { id: 'volunteer-agreement', name: 'اتفاقية تطوع', nameEn: 'Volunteer Agreement', desc: 'اتفاقية مع المتطوع', color: '#388e3c' },
  // المجتمع
  { id: 'community-activity', name: 'تقرير نشاط مجتمعي', nameEn: 'Community Activity Report', desc: 'تقرير فعالية مجتمعية', color: '#00695c' },
  { id: 'partnership-agreement', name: 'اتفاقية شراكة', nameEn: 'Partnership Agreement', desc: 'اتفاقية شراكة مؤسسية', color: '#00796b' },
  // الجهات الحكومية
  { id: 'gosi-report', name: 'تقرير GOSI', nameEn: 'GOSI Report', desc: 'تقرير التأمينات الاجتماعية', color: '#0d47a1' },
  { id: 'disability-authority', name: 'تقرير هيئة رعاية ذوي الإعاقة', nameEn: 'Disability Authority Report', desc: 'تقرير للهيئة العامة لرعاية ذوي الإعاقة', color: '#1565c0' },
  { id: 'gov-compliance', name: 'تقرير الامتثال الحكومي', nameEn: 'Government Compliance Report', desc: 'تقرير الامتثال للمتطلبات الحكومية', color: '#1976d2' },
  // رضا الأسر
  { id: 'satisfaction-survey', name: 'استبيان رضا', nameEn: 'Satisfaction Survey Print', desc: 'نموذج استبيان رضا الأسر', color: '#6a1b9a' },
  { id: 'feedback-report', name: 'تقرير التغذية الراجعة', nameEn: 'Feedback Summary Report', desc: 'ملخص نتائج التغذية الراجعة', color: '#7b1fa2' },
  // قوائم الانتظار
  { id: 'waitlist-letter', name: 'خطاب قائمة الانتظار', nameEn: 'Waitlist Position Letter', desc: 'إفادة بالموقع في قائمة الانتظار', color: '#4e342e' },
  { id: 'admission-offer', name: 'عرض قبول', nameEn: 'Admission Offer', desc: 'خطاب عرض القبول', color: '#5d4037' },
  { id: 'waitlist-status', name: 'تقرير حالة الانتظار', nameEn: 'Waitlist Status Report', desc: 'تقرير حالة قائمة الانتظار', color: '#6d4c41' },
];

export const StakeholderTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'complaint-receipt':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إيصال استلام شكوى" subtitle="Complaint Receipt" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات مقدم الشكوى">
              <div style={fieldRow}><Field label="الاسم" value={d.complainantName} w="40%" /><Field label="رقم الهوية" value={d.idNo} w="25%" /><Field label="الجوال" value={d.phone} w="35%" /></div>
              <div style={fieldRow}><Field label="صفة مقدم الشكوى" value={d.relation} w="40%" /><Field label="تاريخ الاستلام" value={formatDate(d.date) || today()} w="30%" /><Field label="رقم الشكوى" value={d.complaintNo} w="30%" /></div>
            </Section>
            <NotesBox label="موضوع الشكوى" value={d.subject} lines={2} />
            <NotesBox label="تفاصيل الشكوى" value={d.details} lines={4} />
            <div style={fieldRow}><Field label="الجهة المعنية" value={d.relatedDepartment} w="40%" /><Field label="الأولوية" value={d.priority} w="30%" /><Field label="الفترة المتوقعة للرد" value={d.expectedResponse} w="30%" /></div>
            <div style={{ margin: '12px 0', padding: 12, background: '#e3f2fd', borderRadius: 8, fontSize: 11 }}>
              تم استلام شكواكم وسيتم التعامل معها وفق الإجراءات المعتمدة. يمكنكم متابعة الشكوى برقم: <strong>{d.complaintNo || '________'}</strong>
            </div>
            <SignatureBlock rightLabel="مقدم الشكوى" leftLabel="مسؤول الشكاوى" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'complaint-resolution':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير معالجة شكوى" subtitle="Complaint Resolution Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الشكوى" value={d.complaintNo} w="25%" /><Field label="تاريخ الاستلام" value={formatDate(d.receivedDate)} w="25%" /><Field label="تاريخ المعالجة" value={formatDate(d.resolvedDate)} w="25%" /><Field label="المدة" value={d.duration} w="25%" /></div>
            <NotesBox label="ملخص الشكوى" value={d.summary} lines={2} />
            <NotesBox label="إجراءات التحقيق" value={d.investigation} lines={3} />
            <NotesBox label="النتائج" value={d.findings} lines={3} />
            <NotesBox label="القرار / الحل" value={d.resolution} lines={3} />
            <div style={fieldRow}><Field label="رضا المشتكي" value={d.satisfaction} w="33%" /><Field label="إجراءات وقائية" value={d.preventive} w="67%" /></div>
            <SignatureBlock rightLabel="مسؤول الشكاوى" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'visitor-pass':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تصريح زيارة" subtitle="Visitor Pass" />
          <div style={bodyPad}>
            <div style={{ border: '3px solid #37474f', borderRadius: 16, padding: 24, maxWidth: 450, margin: '20px auto' }}>
              <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: '#37474f', marginBottom: 16 }}>تصريح زائر</div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ width: 80, height: 80, border: '2px dashed #999', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>صورة</div>
              </div>
              <div style={fieldRow}><Field label="اسم الزائر" value={d.visitorName} w="60%" /><Field label="رقم الهوية" value={d.idNo} w="40%" /></div>
              <div style={fieldRow}><Field label="الجهة" value={d.organization} w="50%" /><Field label="الغرض" value={d.purpose} w="50%" /></div>
              <div style={fieldRow}><Field label="الزيارة لـ" value={d.visitingPerson} w="50%" /><Field label="القسم" value={d.department} w="50%" /></div>
              <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="33%" /><Field label="وقت الدخول" value={d.entryTime} w="33%" /><Field label="وقت الخروج" value={d.exitTime} w="34%" /></div>
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, color: '#999' }}>رقم التصريح: {d.passNo || '______'}</div>
            </div>
            <SignatureBlock rightLabel="الاستقبال" leftLabel="الأمن" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'visitor-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الزوار" subtitle="Visitor Log Sheet" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /><Field label="موظف الاستقبال" value={d.receptionist} w="35%" /><Field label="الموقع" value={d.location || 'البوابة الرئيسية'} w="35%" /></div>
            <Section title="سجل الزيارات">
              <EmptyTable cols={8} rows={20} headers={['م', 'الاسم', 'الهوية', 'الجهة', 'الغرض', 'لمن', 'الدخول', 'الخروج']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الزوار" value={d.totalVisitors} w="50%" /><Field label="ملاحظات" value={d.notes} w="50%" /></div>
            <SignatureBlock rightLabel="موظف الاستقبال" leftLabel="مدير الأمن" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'visitor-nda':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="اتفاقية عدم إفشاء - زائر" subtitle="Visitor Non-Disclosure Agreement" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ lineHeight: 2.2, margin: '16px 0' }}>
              <p>أنا الموقع أدناه <strong>{d.visitorName || '____________________'}</strong></p>
              <p>رقم الهوية: <strong>{d.idNo || '____________'}</strong> — الجهة: <strong>{d.organization || '____________'}</strong></p>
              <p>أتعهد بالآتي:</p>
            </div>
            <div style={{ margin: '12px 0', padding: 16, border: '1px solid #ddd', borderRadius: 8, lineHeight: 2 }}>
              <ol style={{ paddingRight: 20, margin: 0 }}>
                <li>عدم إفشاء أي معلومات سرية يتم الاطلاع عليها أثناء الزيارة.</li>
                <li>عدم تصوير أو نسخ أي مستندات أو بيانات دون إذن مسبق.</li>
                <li>الالتزام بسياسات وإجراءات المركز أثناء التواجد في المبنى.</li>
                <li>عدم مشاركة بيانات المستفيدين أو الموظفين مع أي طرف ثالث.</li>
                <li>تسليم أي مواد مستلمة عند انتهاء الزيارة إذا طُلب ذلك.</li>
              </ol>
            </div>
            <SignatureBlock rightLabel="الزائر" leftLabel="مسؤول الأمن" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'volunteer-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة شكر وتقدير — متطوع" subtitle="Volunteer Appreciation Certificate" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', margin: '40px 0' }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>يتقدم مركز الأوائل لتأهيل ذوي الإعاقة بخالص الشكر والتقدير إلى</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1b5e20', margin: '20px 0', borderBottom: '3px solid #1b5e20', display: 'inline-block', padding: '0 40px 8px' }}>
                {d.volunteerName || '___________________________'}
              </div>
              <div style={{ fontSize: 14, color: '#666', margin: '20px 0' }}>وذلك تقديراً لجهوده/ا في العمل التطوعي</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', margin: '12px 0' }}>{d.program || 'البرنامج التطوعي'}</div>
              <div style={{ fontSize: 14 }}>خلال الفترة من <strong>{formatDate(d.fromDate) || '____'}</strong> إلى <strong>{formatDate(d.toDate) || '____'}</strong></div>
              <div style={{ fontSize: 14, margin: '12px 0' }}>بإجمالي <strong>{d.hours || '____'}</strong> ساعة تطوعية</div>
            </div>
            <SignatureBlock rightLabel="المدير العام" leftLabel="" />
            <div style={{ textAlign: 'center', fontSize: 10, color: '#999', marginTop: 20 }}>رقم الشهادة: {d.certNo || '________'} — التاريخ: {formatDate(d.date) || today()}</div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'volunteer-hours':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="كشف ساعات التطوع" subtitle="Volunteer Hours Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المتطوع" value={d.volunteerName} w="40%" /><Field label="البرنامج" value={d.program} w="30%" /><Field label="الفترة" value={d.period} w="30%" /></div>
            <Section title="سجل الساعات">
              <EmptyTable cols={6} rows={15} headers={['التاريخ', 'من الساعة', 'إلى الساعة', 'عدد الساعات', 'النشاط', 'التوقيع']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الساعات" value={d.totalHours} w="33%" /><Field label="عدد الأيام" value={d.totalDays} w="33%" /><Field label="التقييم" value={d.rating} w="34%" /></div>
            <SignatureBlock rightLabel="المتطوع" leftLabel="مسؤول التطوع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'volunteer-agreement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="اتفاقية تطوع" subtitle="Volunteer Agreement" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المتطوع">
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="40%" /><Field label="رقم الهوية" value={d.idNo} w="25%" /><Field label="الجوال" value={d.phone} w="35%" /></div>
              <div style={fieldRow}><Field label="المؤهل" value={d.qualification} w="33%" /><Field label="البرنامج" value={d.program} w="33%" /><Field label="الفترة" value={d.duration} w="34%" /></div>
            </Section>
            <Section title="الالتزامات">
              <div style={{ lineHeight: 2, padding: '0 12px' }}>
                <p>١. الالتزام بمواعيد التطوع المتفق عليها.</p>
                <p>٢. الحفاظ على سرية المعلومات والبيانات.</p>
                <p>٣. الالتزام بسياسات ولوائح المركز.</p>
                <p>٤. التعامل بلطف واحترام مع المستفيدين والموظفين.</p>
                <p>٥. الإبلاغ عن أي مخاوف أو مشكلات لمسؤول التطوع.</p>
              </div>
            </Section>
            <SignatureBlock rightLabel="المتطوع" leftLabel="مسؤول التطوع" />
            <div style={{ marginTop: 12 }}><SignatureBlock rightLabel="" leftLabel="المدير العام" /></div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'community-activity':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير نشاط مجتمعي" subtitle="Community Activity Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات النشاط">
              <div style={fieldRow}><Field label="اسم النشاط" value={d.activityName} w="50%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /><Field label="المكان" value={d.venue} w="25%" /></div>
              <div style={fieldRow}><Field label="الفئة المستهدفة" value={d.targetGroup} w="40%" /><Field label="عدد المشاركين" value={d.participants} w="30%" /><Field label="المنظم" value={d.organizer} w="30%" /></div>
            </Section>
            <NotesBox label="وصف النشاط" value={d.description} lines={3} />
            <NotesBox label="الأهداف" value={d.objectives} lines={2} />
            <NotesBox label="النتائج والمخرجات" value={d.outcomes} lines={3} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مسؤول المجتمع" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'partnership-agreement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="اتفاقية شراكة مؤسسية" subtitle="Institutional Partnership Agreement" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="الأطراف">
              <div style={fieldRow}><Field label="الطرف الأول" value={d.party1 || 'مركز الأوائل لتأهيل ذوي الإعاقة'} w="50%" /><Field label="الطرف الثاني" value={d.party2} w="50%" /></div>
            </Section>
            <NotesBox label="هدف الشراكة" value={d.purpose} lines={3} />
            <NotesBox label="نطاق العمل" value={d.scope} lines={3} />
            <Section title="التزامات الأطراف">
              <EmptyTable cols={3} rows={5} headers={['الالتزام', 'الطرف الأول', 'الطرف الثاني']} />
            </Section>
            <div style={fieldRow}><Field label="مدة الاتفاقية" value={d.duration} w="33%" /><Field label="من" value={formatDate(d.fromDate)} w="33%" /><Field label="إلى" value={formatDate(d.toDate)} w="34%" /></div>
            <NotesBox label="شروط وأحكام" value={d.terms} lines={3} />
            <SignatureBlock rightLabel="الطرف الأول" leftLabel="الطرف الثاني" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'gosi-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التأمينات الاجتماعية" subtitle="GOSI Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="25%" /><Field label="السنة" value={d.year} w="25%" /><Field label="رقم المنشأة" value={d.facilityNo} w="25%" /><Field label="عدد الموظفين" value={d.employeeCount} w="25%" /></div>
            <Section title="بيانات الاشتراكات">
              <EmptyTable cols={6} rows={12} headers={['الموظف', 'الأساسي', 'بدل السكن', 'حصة الموظف', 'حصة المنشأة', 'الإجمالي']} />
            </Section>
            <Section title="الإجماليات">
              <div style={fieldRow}><Field label="إجمالي حصة الموظفين" value={d.totalEmployeeShare} w="33%" /><Field label="إجمالي حصة المنشأة" value={d.totalFacilityShare} w="33%" /><Field label="الإجمالي الكلي" value={d.grandTotal} w="34%" /></div>
            </Section>
            <SignatureBlock rightLabel="مسؤول الرواتب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'disability-authority':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير لهيئة رعاية ذوي الإعاقة" subtitle="Disability Authority Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المركز">
              <div style={fieldRow}><Field label="اسم المركز" value={d.centerName || 'مركز الأوائل لتأهيل ذوي الإعاقة'} w="50%" /><Field label="رقم الترخيص" value={d.licenseNo} w="25%" /><Field label="فترة التقرير" value={d.period} w="25%" /></div>
            </Section>
            <Section title="إحصائيات المستفيدين">
              <EmptyTable cols={4} rows={6} headers={['نوع الإعاقة', 'العدد', 'الفئة العمرية', 'الخدمات المقدمة']} />
            </Section>
            <Section title="الكوادر البشرية">
              <EmptyTable cols={4} rows={6} headers={['التخصص', 'العدد', 'المؤهلات', 'الترخيص']} />
            </Section>
            <NotesBox label="البرامج والخدمات" value={d.programs} lines={3} />
            <NotesBox label="الإنجازات" value={d.achievements} lines={3} />
            <NotesBox label="التحديات والاحتياجات" value={d.challenges} lines={3} />
            <SignatureBlock rightLabel="المدير العام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'gov-compliance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الامتثال الحكومي" subtitle="Government Compliance Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الجهة الحكومية" value={d.agency} w="40%" /><Field label="فترة التقرير" value={d.period} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
            <Section title="متطلبات الامتثال">
              <EmptyTable cols={5} rows={10} headers={['المتطلب', 'المعيار', 'الحالة', 'الدليل', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="نسبة الامتثال" value={d.complianceRate} w="25%" /><Field label="متطلبات مستوفاة" value={d.met} w="25%" /><Field label="قيد العمل" value={d.inProgress} w="25%" /><Field label="غير مستوفاة" value={d.notMet} w="25%" /></div>
            <NotesBox label="خطة التصحيح" value={d.correctionPlan} lines={3} />
            <SignatureBlock rightLabel="مسؤول الامتثال" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'satisfaction-survey':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="استبيان رضا الأسر" subtitle="Family Satisfaction Survey" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#666', marginBottom: 16 }}>رأيكم يهمنا — نرجو تعبئة الاستبيان بكل صراحة</div>
            <div style={fieldRow}><Field label="اسم المستفيد" value={d.beneficiaryName} w="40%" /><Field label="القسم" value={d.department} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
            <Section title="التقييم">
              <EmptyTable cols={6} rows={12} headers={['البند', 'ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف']} />
            </Section>
            <NotesBox label="ما أكثر شيء أعجبكم؟" value={d.likes} lines={2} />
            <NotesBox label="ما أكثر شيء يحتاج تحسين؟" value={d.improvements} lines={2} />
            <NotesBox label="ملاحظات إضافية" value={d.comments} lines={2} />
            <div style={{ fontSize: 11, textAlign: 'center', margin: '16px 0', color: '#999' }}>اختياري: التوقيع ____________________</div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'feedback-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير ملخص التغذية الراجعة" subtitle="Feedback Summary Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="40%" /><Field label="عدد الاستبيانات" value={d.totalSurveys} w="30%" /><Field label="نسبة الاستجابة" value={d.responseRate} w="30%" /></div>
            <Section title="نتائج التقييم">
              <EmptyTable cols={4} rows={8} headers={['المحور', 'المتوسط', 'التصنيف', 'مقارنة بالفترة السابقة']} />
            </Section>
            <div style={fieldRow}><Field label="المتوسط العام" value={d.overallAvg} w="33%" /><Field label="أعلى محور" value={d.highestArea} w="33%" /><Field label="أدنى محور" value={d.lowestArea} w="34%" /></div>
            <NotesBox label="أبرز الملاحظات الإيجابية" value={d.positiveComments} lines={3} />
            <NotesBox label="أبرز المقترحات" value={d.suggestions} lines={3} />
            <NotesBox label="خطة التحسين" value={d.improvementPlan} lines={3} />
            <SignatureBlock rightLabel="مسؤول الجودة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'waitlist-letter':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إفادة بقائمة الانتظار" subtitle="Waitlist Position Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ lineHeight: 2.2, margin: '20px 0' }}>
              <p>السيد / السيدة: <strong>{d.guardianName || '____________________'}</strong> المحترم/ة</p>
              <p>ولي أمر المستفيد/ة: <strong>{d.beneficiaryName || '____________________'}</strong></p>
              <p>السلام عليكم ورحمة الله وبركاته،</p>
              <p>نفيدكم بأن طلب تسجيل المستفيد/ة المذكور أعلاه قد تم استلامه بتاريخ <strong>{formatDate(d.applicationDate) || '____/__/__'}</strong> وتم وضعه في قائمة الانتظار.</p>
              <p>رقم الطلب: <strong>{d.applicationNo || '________'}</strong></p>
              <p>الترتيب في القائمة: <strong>{d.position || '____'}</strong></p>
              <p>سيتم التواصل معكم فور توفر مقعد. نقدر صبركم.</p>
            </div>
            <SignatureBlock rightLabel="مدير القبول والتسجيل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'admission-offer':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="عرض قبول" subtitle="Admission Offer Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ lineHeight: 2.2, margin: '20px 0' }}>
              <p>السيد / السيدة: <strong>{d.guardianName || '____________________'}</strong> المحترم/ة</p>
              <p>السلام عليكم ورحمة الله وبركاته،</p>
              <p>يسرنا إبلاغكم بقبول المستفيد/ة <strong>{d.beneficiaryName || '____________________'}</strong> في المركز وفق البيانات التالية:</p>
            </div>
            <Section title="تفاصيل القبول">
              <div style={fieldRow}><Field label="البرنامج" value={d.program} w="40%" /><Field label="القسم" value={d.department} w="30%" /><Field label="تاريخ المباشرة" value={formatDate(d.startDate)} w="30%" /></div>
              <div style={fieldRow}><Field label="نوع الخدمة" value={d.serviceType} w="33%" /><Field label="أيام الحضور" value={d.days} w="33%" /><Field label="وقت الحضور" value={d.hours} w="34%" /></div>
            </Section>
            <Section title="المستندات المطلوبة">
              <EmptyTable cols={3} rows={6} headers={['المستند', 'أصل/صورة', 'ملاحظات']} />
            </Section>
            <div style={{ margin: '12px 0', padding: 12, background: '#e8f5e9', borderRadius: 8, fontSize: 12 }}>
              يرجى تأكيد القبول والحضور خلال <strong>{d.deadline || '5 أيام عمل'}</strong> وإلا سيتم عرض المقعد على المرشح التالي.
            </div>
            <SignatureBlock rightLabel="مدير القبول" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'waitlist-status':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حالة قائمة الانتظار" subtitle="Waitlist Status Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /><Field label="البرنامج" value={d.program || 'جميع البرامج'} w="25%" /><Field label="إجمالي في القائمة" value={d.totalWaiting} w="25%" /><Field label="المقاعد المتاحة" value={d.availableSeats} w="25%" /></div>
            <Section title="قائمة الانتظار">
              <EmptyTable cols={7} rows={15} headers={['م', 'الاسم', 'تاريخ الطلب', 'البرنامج', 'نوع الإعاقة', 'العمر', 'الحالة']} />
            </Section>
            <Section title="إحصائيات">
              <div style={fieldRow}><Field label="متوسط فترة الانتظار" value={d.avgWaitTime} w="33%" /><Field label="تم قبولهم هذا الشهر" value={d.admittedThisMonth} w="33%" /><Field label="متوقع الشهر القادم" value={d.expectedNext} w="34%" /></div>
            </Section>
            <SignatureBlock rightLabel="مدير القبول" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
