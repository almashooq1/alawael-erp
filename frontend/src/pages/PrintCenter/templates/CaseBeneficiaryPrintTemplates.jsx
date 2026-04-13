/**
 * قوالب إدارة الحالات والمستفيدين وقوائم الانتظار
 * Case Management, Beneficiary & Waitlist Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const CASE_BENEFICIARY_TEMPLATES = [
  /* ── إدارة الحالات ── */
  { id: 'case-file-summary', name: 'ملخص ملف الحالة', nameEn: 'Case File Summary', desc: 'ملخص شامل لملف حالة المستفيد', color: '#1565c0' },
  { id: 'case-intake-form', name: 'نموذج استقبال حالة', nameEn: 'Case Intake Form', desc: 'نموذج الاستقبال والتسجيل الأولي', color: '#1976d2' },
  { id: 'case-referral-form', name: 'نموذج تحويل حالة', nameEn: 'Case Referral Form', desc: 'تحويل حالة بين الأقسام أو الجهات', color: '#1e88e5' },
  { id: 'case-meeting-minutes', name: 'محضر اجتماع الحالة', nameEn: 'Case Meeting Minutes', desc: 'محضر اجتماع مراجعة الحالة', color: '#2196f3' },
  { id: 'case-closure-report', name: 'تقرير إغلاق حالة', nameEn: 'Case Closure Report', desc: 'تقرير إغلاق وإنهاء الخدمة', color: '#42a5f5' },
  { id: 'case-plan', name: 'خطة الحالة الفردية', nameEn: 'Individual Case Plan', desc: 'خطة الخدمات الفردية للمستفيد', color: '#0d47a1' },
  { id: 'case-review-report', name: 'تقرير مراجعة الحالة', nameEn: 'Case Review Report', desc: 'تقرير المراجعة الدورية للحالة', color: '#0277bd' },
  { id: 'case-transfer-form', name: 'نموذج نقل حالة', nameEn: 'Case Transfer Form', desc: 'نقل حالة لمركز آخر', color: '#01579b' },
  /* ── المستفيدون ── */
  { id: 'beneficiary-id-card', name: 'بطاقة تعريف المستفيد', nameEn: 'Beneficiary ID Card', desc: 'بطاقة تعريف المستفيد بالمركز', color: '#2e7d32' },
  { id: 'beneficiary-profile', name: 'ملف المستفيد الشامل', nameEn: 'Beneficiary Profile', desc: 'الملف التعريفي الشامل للمستفيد', color: '#388e3c' },
  { id: 'enrollment-certificate', name: 'شهادة تسجيل المستفيد', nameEn: 'Enrollment Certificate', desc: 'شهادة تسجيل في برامج المركز', color: '#43a047' },
  { id: 'discharge-summary', name: 'ملخص الخروج', nameEn: 'Discharge Summary', desc: 'ملخص حالة المستفيد عند الخروج', color: '#4caf50' },
  { id: 'beneficiary-progress', name: 'تقرير تقدم المستفيد', nameEn: 'Beneficiary Progress Report', desc: 'تقرير التقدم الدوري للمستفيد', color: '#66bb6a' },
  { id: 'beneficiary-consent', name: 'نموذج موافقة المستفيد', nameEn: 'Beneficiary Consent Form', desc: 'موافقة على الخدمات والبرامج', color: '#1b5e20' },
  /* ── قوائم الانتظار ── */
  { id: 'waitlist-confirmation', name: 'تأكيد قائمة الانتظار', nameEn: 'Waitlist Confirmation', desc: 'خطاب تأكيد التسجيل في قائمة الانتظار', color: '#e65100' },
  { id: 'waitlist-priority-report', name: 'تقرير أولويات الانتظار', nameEn: 'Waitlist Priority Report', desc: 'تقرير الأولويات في قائمة الانتظار', color: '#ef6c00' },
  { id: 'waitlist-statistics', name: 'إحصائيات قائمة الانتظار', nameEn: 'Waitlist Statistics', desc: 'إحصائيات شاملة لقوائم الانتظار', color: '#f57c00' },
  { id: 'waitlist-intake-form', name: 'نموذج قبول من الانتظار', nameEn: 'Waitlist Intake Form', desc: 'نموذج القبول من قائمة الانتظار', color: '#fb8c00' },
  { id: 'waitlist-update-letter', name: 'خطاب تحديث الانتظار', nameEn: 'Waitlist Update Letter', desc: 'خطاب تحديث موقع في قائمة الانتظار', color: '#ff9800' },
  { id: 'waitlist-position-letter', name: 'خطاب ترتيب الانتظار', nameEn: 'Waitlist Position Letter', desc: 'خطاب بالترتيب في قائمة الانتظار', color: '#ffa726' },
];

export const CaseBeneficiaryTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    /* ══════════════ إدارة الحالات ══════════════ */
    case 'case-file-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص ملف الحالة" subtitle="Case File Summary" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الحالة" value={d.caseNo} w="15%" /><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="تاريخ الفتح" value={formatDate(d.openDate)} w="15%" /><Field label="أخصائي الحالة" value={d.caseWorker} w="25%" /></div>
            <div style={fieldRow}><Field label="نوع الإعاقة" value={d.disabilityType} w="20%" /><Field label="درجة الإعاقة" value={d.disabilityDegree} w="15%" /><Field label="الحالة" value={d.status} w="15%" /><Field label="العمر" value={d.age} w="10%" /></div>
            <Section title="ملخص التاريخ">
              <NotesBox label="التاريخ الطبي" value={d.medicalHistory} lines={2} />
              <NotesBox label="التاريخ التأهيلي" value={d.rehabHistory} lines={2} />
            </Section>
            <Section title="الخدمات المقدمة">
              <EmptyTable cols={5} rows={6} headers={['الخدمة', 'القسم', 'تاريخ البدء', 'الحالة', 'ملاحظات']} />
            </Section>
            <Section title="ملخص التقدم">
              <EmptyTable cols={4} rows={4} headers={['المجال', 'مستوى الدخول', 'المستوى الحالي', 'التحسن %']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="أخصائي الحالة" leftLabel="مدير البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'case-intake-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج استقبال حالة جديدة" subtitle="Case Intake Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="الاسم الكامل" value={d.fullName} w="30%" /><Field label="رقم الهوية" value={d.idNo} w="20%" /><Field label="تاريخ الميلاد" value={formatDate(d.birthDate)} w="15%" /><Field label="الجنس" value={d.gender} w="10%" /></div>
              <div style={fieldRow}><Field label="الجنسية" value={d.nationality} w="15%" /><Field label="العنوان" value={d.address} w="35%" /><Field label="الهاتف" value={d.phone} w="15%" /></div>
            </Section>
            <Section title="بيانات ولي الأمر">
              <div style={fieldRow}><Field label="الاسم" value={d.guardianName} w="25%" /><Field label="القرابة" value={d.relation} w="15%" /><Field label="الهاتف" value={d.guardianPhone} w="15%" /><Field label="البريد" value={d.guardianEmail} w="25%" /></div>
            </Section>
            <Section title="بيانات الإعاقة">
              <div style={fieldRow}><Field label="نوع الإعاقة" value={d.disabilityType} w="20%" /><Field label="الدرجة" value={d.degree} w="15%" /><Field label="تاريخ التشخيص" value={formatDate(d.diagDate)} w="15%" /><Field label="الجهة المشخصة" value={d.diagBy} w="25%" /></div>
              <NotesBox label="وصف الحالة" value={d.caseDescription} lines={3} />
            </Section>
            <Section title="الخدمات المطلوبة">
              <EmptyTable cols={3} rows={5} headers={['الخدمة', 'الأولوية', 'ملاحظات']} />
            </Section>
            <NotesBox label="مرفقات" value={d.attachments} lines={1} />
            <SignatureBlock rightLabel="ولي الأمر" leftLabel="موظف الاستقبال" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'case-referral-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تحويل حالة" subtitle="Case Referral Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الحالة" value={d.caseNo} w="15%" /><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="العمر" value={d.age} w="10%" /></div>
            <div style={fieldRow}><Field label="من قسم" value={d.fromDept} w="25%" /><Field label="إلى قسم/جهة" value={d.toDept} w="25%" /><Field label="تاريخ التحويل" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="سبب التحويل" value={d.reason} lines={2} />
            <NotesBox label="ملخص الحالة" value={d.caseSummary} lines={3} />
            <Section title="الخدمات السابقة">
              <EmptyTable cols={4} rows={4} headers={['الخدمة', 'المدة', 'النتيجة', 'ملاحظات']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="المحيل" leftLabel="المستقبل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'case-meeting-minutes':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر اجتماع مراجعة الحالة" subtitle="Case Review Meeting Minutes" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الحالة" value={d.caseNo} w="15%" /><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="المكان" value={d.location} w="20%" /></div>
            <Section title="الحضور">
              <EmptyTable cols={4} rows={6} headers={['الاسم', 'المسمى', 'القسم', 'التوقيع']} />
            </Section>
            <NotesBox label="ملخص المناقشة" value={d.discussion} lines={4} />
            <Section title="القرارات والتوصيات">
              <EmptyTable cols={4} rows={5} headers={['القرار', 'المسؤول', 'الموعد النهائي', 'الحالة']} />
            </Section>
            <NotesBox label="الاجتماع القادم" value={d.nextMeeting} lines={1} />
            <SignatureBlock rightLabel="رئيس الاجتماع" leftLabel="المقرر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'case-closure-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير إغلاق حالة" subtitle="Case Closure Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الحالة" value={d.caseNo} w="15%" /><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="تاريخ الفتح" value={formatDate(d.openDate)} w="15%" /><Field label="تاريخ الإغلاق" value={formatDate(d.closeDate) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="سبب الإغلاق" value={d.closureReason} w="25%" /><Field label="أخصائي الحالة" value={d.caseWorker} w="25%" /></div>
            <Section title="ملخص الخدمات المقدمة">
              <EmptyTable cols={5} rows={6} headers={['الخدمة', 'المدة', 'عدد الجلسات', 'النتيجة', 'ملاحظات']} />
            </Section>
            <Section title="مخرجات التأهيل">
              <EmptyTable cols={4} rows={4} headers={['المجال', 'الهدف', 'المستوى المحقق', 'التحسن %']} />
            </Section>
            <NotesBox label="خطة ما بعد الخروج" value={d.aftercarePlan} lines={2} />
            <NotesBox label="توصيات المتابعة" value={d.followupRec} lines={2} />
            <SignatureBlock rightLabel="أخصائي الحالة" leftLabel="مدير البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'case-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الخدمات الفردية" subtitle="Individual Case Plan (ICP)" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الحالة" value={d.caseNo} w="15%" /><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="تاريخ الخطة" value={formatDate(d.date) || today()} w="15%" /><Field label="فترة الخطة" value={d.planPeriod} w="20%" /></div>
            <Section title="الاحتياجات المحددة">
              <EmptyTable cols={4} rows={5} headers={['المجال', 'الاحتياج', 'الأولوية', 'ملاحظات']} />
            </Section>
            <Section title="الأهداف والخدمات">
              <EmptyTable cols={6} rows={8} headers={['الهدف', 'الخدمة', 'المسؤول', 'التكرار', 'المؤشر', 'الموعد']} />
            </Section>
            <NotesBox label="دور الأسرة" value={d.familyRole} lines={2} />
            <div style={fieldRow}><Field label="تاريخ المراجعة القادمة" value={formatDate(d.nextReview)} w="25%" /></div>
            <SignatureBlock rightLabel="أخصائي الحالة" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'case-review-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير المراجعة الدورية للحالة" subtitle="Periodic Case Review Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الحالة" value={d.caseNo} w="15%" /><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="فترة المراجعة" value={d.reviewPeriod} w="20%" /><Field label="المراجع" value={d.reviewer} w="20%" /></div>
            <Section title="تقدم الأهداف">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'المستهدف', 'المنجز', 'النسبة %', 'الحالة']} />
            </Section>
            <NotesBox label="التطورات منذ آخر مراجعة" value={d.developments} lines={2} />
            <NotesBox label="التحديات" value={d.challenges} lines={2} />
            <NotesBox label="التعديلات على الخطة" value={d.planModifications} lines={2} />
            <SignatureBlock rightLabel="أخصائي الحالة" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'case-transfer-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج نقل حالة لمركز آخر" subtitle="Inter-Center Case Transfer" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الحالة" value={d.caseNo} w="15%" /><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="من مركز" value={d.fromCenter} w="25%" /><Field label="إلى مركز" value={d.toCenter} w="25%" /></div>
            <NotesBox label="سبب النقل" value={d.reason} lines={2} />
            <NotesBox label="ملخص الحالة والخدمات" value={d.summary} lines={3} />
            <Section title="المرفقات المنقولة">
              <EmptyTable cols={3} rows={5} headers={['المستند', 'النسخ', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير المركز المرسل" leftLabel="مدير المركز المستقبل" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ المستفيدون ══════════════ */
    case 'beneficiary-id-card':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة تعريف المستفيد" subtitle="Beneficiary Identification Card" />
          <div style={bodyPad}>
            <div style={{ maxWidth: 400, margin: '0 auto', border: '2px solid #2e7d32', borderRadius: 16, padding: 20, background: '#e8f5e9' }}>
              <div style={{ textAlign: 'center', fontWeight: 700, color: '#2e7d32', fontSize: 16, marginBottom: 12 }}>مركز الأوائل لتأهيل ذوي الإعاقة</div>
              <div style={{ width: 80, height: 100, border: '1px solid #ccc', borderRadius: 8, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#999', fontSize: 11 }}>صورة شخصية</div>
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="100%" /></div>
              <div style={fieldRow}><Field label="رقم الملف" value={d.fileNo} w="40%" /><Field label="رقم الهوية" value={d.idNo} w="50%" /></div>
              <div style={fieldRow}><Field label="البرنامج" value={d.program} w="50%" /><Field label="فصيلة الدم" value={d.bloodType} w="30%" /></div>
              <div style={fieldRow}><Field label="ولي الأمر" value={d.guardian} w="50%" /><Field label="هاتف الطوارئ" value={d.emergencyPhone} w="40%" /></div>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#666', marginTop: 8 }}>صالحة حتى: {formatDate(d.validUntil) || '____/____/________'}</div>
            </div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'beneficiary-profile':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="الملف التعريفي الشامل للمستفيد" subtitle="Comprehensive Beneficiary Profile" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <Section title="البيانات الأساسية">
              <div style={fieldRow}><Field label="الاسم الكامل" value={d.fullName} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="رقم الهوية" value={d.idNo} w="15%" /><Field label="تاريخ الميلاد" value={formatDate(d.dob)} w="15%" /></div>
              <div style={fieldRow}><Field label="الجنس" value={d.gender} w="10%" /><Field label="الجنسية" value={d.nationality} w="15%" /><Field label="فصيلة الدم" value={d.bloodType} w="10%" /><Field label="العنوان" value={d.address} w="35%" /></div>
            </Section>
            <Section title="بيانات الإعاقة">
              <div style={fieldRow}><Field label="نوع الإعاقة" value={d.disabilityType} w="25%" /><Field label="الدرجة" value={d.degree} w="15%" /><Field label="السبب" value={d.cause} w="20%" /><Field label="تاريخ التشخيص" value={formatDate(d.diagDate)} w="15%" /></div>
            </Section>
            <Section title="البرامج المسجل فيها">
              <EmptyTable cols={4} rows={4} headers={['البرنامج', 'تاريخ التسجيل', 'الحالة', 'المسؤول']} />
            </Section>
            <Section title="الأجهزة المساعدة">
              <EmptyTable cols={3} rows={3} headers={['الجهاز', 'تاريخ الاستلام', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات خاصة" value={d.specialNotes} lines={2} />
          </div>
          <OrgFooter />
        </div>
      );

    case 'enrollment-certificate':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة تسجيل المستفيد" subtitle="Beneficiary Enrollment Certificate" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', margin: '30px auto', padding: 24, border: '3px solid #43a047', borderRadius: 16, maxWidth: 500, background: '#e8f5e9' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#2e7d32', marginBottom: 16 }}>شهادة تسجيل</div>
              <p style={{ fontSize: 13, lineHeight: 2 }}>يشهد مركز الأوائل لتأهيل ذوي الإعاقة بأن المستفيد/ـة</p>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1b5e20', margin: '12px 0' }}>{d.name || '____________________'}</div>
              <p style={{ fontSize: 13, lineHeight: 2 }}>رقم الهوية: {d.idNo || '______________'}</p>
              <p style={{ fontSize: 13, lineHeight: 2 }}>مسجل/ـة في برنامج</p>
              <div style={{ fontSize: 14, fontWeight: 700, margin: '8px 0' }}>{d.program || '____________________'}</div>
              <div style={fieldRow}><Field label="من تاريخ" value={formatDate(d.startDate)} w="40%" /><Field label="رقم الملف" value={d.fileNo} w="30%" /></div>
            </div>
            <SignatureBlock rightLabel="مدير البرنامج" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'discharge-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص خروج المستفيد" subtitle="Beneficiary Discharge Summary" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="25%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="تاريخ الدخول" value={formatDate(d.admitDate)} w="15%" /><Field label="تاريخ الخروج" value={formatDate(d.dischargeDate) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="سبب الخروج" value={d.reason} w="30%" /><Field label="نوع الخروج" value={d.dischargeType} w="20%" /></div>
            <NotesBox label="ملخص الخدمات المقدمة" value={d.servicesSummary} lines={3} />
            <Section title="النتائج المحققة">
              <EmptyTable cols={4} rows={5} headers={['المجال', 'الحالة عند الدخول', 'الحالة عند الخروج', 'التحسن %']} />
            </Section>
            <NotesBox label="خطة المتابعة بعد الخروج" value={d.followupPlan} lines={2} />
            <NotesBox label="توصيات للأسرة" value={d.familyRec} lines={2} />
            <SignatureBlock rightLabel="أخصائي الحالة" leftLabel="الطبيب المسؤول" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'beneficiary-progress':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقدم المستفيد الدوري" subtitle="Periodic Beneficiary Progress Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="25%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="البرنامج" value={d.program} w="20%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="تقدم الأهداف">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'المؤشر', 'المستهدف', 'المنجز', 'الحالة']} />
            </Section>
            <Section title="الجلسات">
              <div style={fieldRow}><Field label="المخططة" value={d.planned} w="20%" /><Field label="المنفذة" value={d.completed} w="20%" /><Field label="المتغيب عنها" value={d.missed} w="20%" /><Field label="نسبة الحضور" value={d.attendanceRate} w="20%" /></div>
            </Section>
            <NotesBox label="ملاحظات الأخصائي" value={d.specialistNotes} lines={2} />
            <NotesBox label="خطة الفترة القادمة" value={d.nextPlan} lines={2} />
            <SignatureBlock rightLabel="الأخصائي" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'beneficiary-consent':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج موافقة المستفيد / ولي الأمر" subtitle="Beneficiary Consent Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="رقم الهوية" value={d.idNo} w="20%" /><Field label="ولي الأمر" value={d.guardian} w="30%" /></div>
            <NotesBox label="الموافقة على" value={d.consentFor} lines={3} />
            <NotesBox label="حقوق المستفيد" value={d.rights || 'يحق للمستفيد / ولي الأمر سحب الموافقة في أي وقت. يتم التعامل مع جميع البيانات بسرية تامة وفقاً لأنظمة حماية البيانات الشخصية.'} lines={2} />
            <div style={{ margin: '12px 0', padding: 12, background: '#fff3e0', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>أقر بأنني قرأت وفهمت المعلومات أعلاه وأوافق على المشاركة/تقديم الخدمات المذكورة.</div>
            </div>
            <SignatureBlock rightLabel="ولي الأمر / المستفيد" leftLabel="الشاهد" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ قوائم الانتظار ══════════════ */
    case 'waitlist-confirmation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تأكيد التسجيل في قائمة الانتظار" subtitle="Waitlist Registration Confirmation" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="رقم الانتظار" value={d.waitlistNo} w="15%" /><Field label="البرنامج" value={d.program} w="25%" /><Field label="تاريخ التسجيل" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="" value="نفيدكم بأنه تم تسجيل حالتكم في قائمة الانتظار بالمركز. سيتم التواصل معكم فور توفر مقعد شاغر في البرنامج المطلوب." lines={2} />
            <div style={fieldRow}><Field label="الأولوية" value={d.priority} w="20%" /><Field label="المركز التقريبي" value={d.position} w="20%" /><Field label="المدة المتوقعة" value={d.estimatedWait} w="25%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مسؤول التسجيل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'waitlist-priority-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أولويات قائمة الانتظار" subtitle="Waitlist Priority Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="البرنامج" value={d.program} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="إجمالي المنتظرين" value={d.totalWaiting} w="15%" /></div>
            <Section title="قائمة الأولويات">
              <EmptyTable cols={7} rows={15} headers={['#', 'المستفيد', 'تاريخ التسجيل', 'نوع الإعاقة', 'العمر', 'الأولوية', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول التسجيل" leftLabel="مدير البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'waitlist-statistics':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إحصائيات قوائم الانتظار" subtitle="Waitlist Statistics Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="ملخص عام">
              <EmptyTable cols={5} rows={8} headers={['البرنامج', 'المنتظرون', 'المقبول هذا الشهر', 'متوسط الانتظار', 'المقاعد المتاحة']} />
            </Section>
            <Section title="التوزيع حسب الأولوية">
              <EmptyTable cols={4} rows={4} headers={['الأولوية', 'العدد', 'النسبة %', 'متوسط الانتظار']} />
            </Section>
            <Section title="التوزيع حسب نوع الإعاقة">
              <EmptyTable cols={3} rows={5} headers={['نوع الإعاقة', 'العدد', 'النسبة %']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الإحصاءات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'waitlist-intake-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج القبول من قائمة الانتظار" subtitle="Waitlist Intake Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="25%" /><Field label="رقم الانتظار" value={d.waitlistNo} w="15%" /><Field label="البرنامج" value={d.program} w="25%" /><Field label="تاريخ التسجيل الأصلي" value={formatDate(d.originalDate)} w="20%" /></div>
            <div style={fieldRow}><Field label="مدة الانتظار" value={d.waitDuration} w="15%" /><Field label="تاريخ القبول" value={formatDate(d.admitDate) || today()} w="15%" /></div>
            <NotesBox label="تحديث الحالة منذ التسجيل" value={d.statusUpdate} lines={2} />
            <Section title="المتطلبات المكتملة">
              <EmptyTable cols={3} rows={5} headers={['المتطلب', 'الحالة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="ولي الأمر" leftLabel="مسؤول القبول" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'waitlist-update-letter':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطاب تحديث موقع في قائمة الانتظار" subtitle="Waitlist Status Update Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السيد/ة" value={d.guardianName} w="30%" /><Field label="ولي أمر" value={d.beneficiary} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="" value="السلام عليكم ورحمة الله وبركاته،\n\nنود إفادتكم بتحديث موقع المستفيد/ـة في قائمة الانتظار بالمركز:" lines={3} />
            <div style={fieldRow}><Field label="البرنامج" value={d.program} w="30%" /><Field label="المركز السابق" value={d.prevPosition} w="15%" /><Field label="المركز الحالي" value={d.currentPosition} w="15%" /><Field label="المدة المتوقعة" value={d.estimatedWait} w="20%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مسؤول التسجيل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'waitlist-position-letter':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطاب ترتيب في قائمة الانتظار" subtitle="Waitlist Position Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السيد/ة" value={d.guardianName} w="30%" /><Field label="المستفيد" value={d.beneficiary} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="" value="إشارة إلى طلبكم الاستفسار عن ترتيب المستفيد/ـة في قائمة الانتظار، نفيدكم بما يلي:" lines={2} />
            <div style={fieldRow}><Field label="رقم الانتظار" value={d.waitlistNo} w="15%" /><Field label="البرنامج" value={d.program} w="25%" /><Field label="الترتيب الحالي" value={d.position} w="15%" /><Field label="الإجمالي" value={d.total} w="10%" /></div>
            <NotesBox label="" value="مع العلم بأن الترتيب قد يتغير وفقاً لمعايير الأولوية المعتمدة في المركز." lines={1} />
            <SignatureBlock rightLabel="مسؤول القبول والتسجيل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
