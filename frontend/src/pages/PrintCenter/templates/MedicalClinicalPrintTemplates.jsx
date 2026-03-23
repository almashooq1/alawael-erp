/**
 * قوالب طباعة الملفات الطبية والسريرية — Medical & Clinical Print Templates
 * يشمل: الملفات الطبية، ICF، MDT، الطب عن بعد، الدعم النفسي
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, PrintTable, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const MEDICAL_TEMPLATES = [
  { id: 'medical-record', name: 'ملخص السجل الطبي', nameEn: 'Medical Record Summary', desc: 'ملخص الملف الطبي للمستفيد', color: '#b71c1c' },
  { id: 'prescription', name: 'وصفة طبية', nameEn: 'Prescription', desc: 'نموذج وصفة طبية', color: '#c62828' },
  { id: 'lab-request', name: 'طلب تحاليل مخبرية', nameEn: 'Lab Request Form', desc: 'نموذج طلب فحوصات مخبرية', color: '#d32f2f' },
  { id: 'medical-referral', name: 'خطاب إحالة طبية', nameEn: 'Medical Referral', desc: 'إحالة طبية لجهة خارجية', color: '#e53935' },
  { id: 'consent-form', name: 'نموذج موافقة طبية', nameEn: 'Medical Consent Form', desc: 'إقرار موافقة على إجراء طبي', color: '#f44336' },
  { id: 'icf-evaluation', name: 'نموذج تقييم ICF', nameEn: 'ICF Evaluation Form', desc: 'تقييم التصنيف الدولي للوظائف', color: '#7b1fa2' },
  { id: 'icf-summary', name: 'ملخص تقييم ICF', nameEn: 'ICF Summary Report', desc: 'تقرير ملخص تقييم ICF', color: '#8e24aa' },
  { id: 'mdt-meeting', name: 'محضر اجتماع MDT', nameEn: 'MDT Meeting Minutes', desc: 'محضر اجتماع الفريق متعدد التخصصات', color: '#00695c' },
  { id: 'mdt-team-report', name: 'تقرير فريق MDT', nameEn: 'MDT Team Report', desc: 'تقرير الفريق متعدد التخصصات', color: '#00796b' },
  { id: 'telehealth-session', name: 'ملخص جلسة طب عن بعد', nameEn: 'Telehealth Session Summary', desc: 'تقرير جلسة الطب عن بعد', color: '#0277bd' },
  { id: 'e-prescription', name: 'وصفة إلكترونية', nameEn: 'e-Prescription', desc: 'وصفة طبية إلكترونية', color: '#0288d1' },
  { id: 'psych-assessment', name: 'تقييم نفسي', nameEn: 'Psychological Assessment', desc: 'نموذج التقييم النفسي', color: '#6a1b9a' },
  { id: 'social-worker-report', name: 'تقرير أخصائي اجتماعي', nameEn: 'Social Worker Report', desc: 'تقرير الأخصائي الاجتماعي', color: '#7b1fa2' },
  { id: 'crisis-intervention', name: 'نموذج تدخل أزمات', nameEn: 'Crisis Intervention Form', desc: 'تقرير التدخل في الأزمات النفسية', color: '#ad1457' },
  { id: 'life-skills', name: 'تقييم مهارات الحياة', nameEn: 'Life Skills Assessment', desc: 'تقييم مهارات الحياة المستقلة', color: '#00838f' },
];

export const MedicalTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'medical-record':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص السجل الطبي" subtitle="Medical Record Summary" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="40%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="العمر" value={d.age} w="20%" /><Field label="فصيلة الدم" value={d.bloodType} w="20%" /></div>
              <div style={fieldRow}><Field label="التشخيص الرئيسي" value={d.diagnosis} w="50%" /><Field label="نوع الإعاقة" value={d.disability} w="25%" /><Field label="تاريخ القبول" value={formatDate(d.admissionDate)} w="25%" /></div>
            </Section>
            <Section title="الحساسية والأمراض المزمنة">
              <div style={fieldRow}><Field label="الحساسية" value={d.allergies} w="50%" /><Field label="الأمراض المزمنة" value={d.chronicDiseases} w="50%" /></div>
            </Section>
            <Section title="الأدوية الحالية">
              <EmptyTable cols={5} rows={6} headers={['الدواء', 'الجرعة', 'التكرار', 'السبب', 'ملاحظات']} />
            </Section>
            <Section title="سجل الزيارات">
              <EmptyTable cols={5} rows={6} headers={['التاريخ', 'الطبيب', 'الشكوى', 'التشخيص', 'العلاج']} />
            </Section>
            <SignatureBlock rightLabel="الطبيب المعالج" leftLabel="مدير الخدمات الطبية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'prescription':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="وصفة طبية" subtitle="Medical Prescription" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم المستفيد" value={d.patientName} w="40%" /><Field label="العمر" value={d.age} w="15%" /><Field label="الوزن" value={d.weight} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
            <div style={fieldRow}><Field label="رقم الملف" value={d.fileNo} w="30%" /><Field label="التشخيص" value={d.diagnosis} w="70%" /></div>
            <div style={{ margin: '20px 0', padding: '20px', border: '2px solid #1565c0', borderRadius: 8, minHeight: 250 }}>
              <div style={{ fontSize: 24, color: '#1565c0', fontWeight: 'bold', marginBottom: 16 }}>℞</div>
              <EmptyTable cols={5} rows={6} headers={['الدواء', 'الجرعة', 'التكرار', 'المدة', 'تعليمات']} />
            </div>
            <NotesBox label="تعليمات خاصة" value={d.instructions} />
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center' }}><div style={{ borderBottom: '2px solid #333', width: 200, marginBottom: 4 }} /><div style={{ fontSize: 12 }}>توقيع الطبيب وختمه</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ borderBottom: '2px solid #333', width: 200, marginBottom: 4 }} /><div style={{ fontSize: 12 }}>رقم الترخيص</div></div>
            </div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'lab-request':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب تحاليل مخبرية" subtitle="Laboratory Request Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="الاسم" value={d.patientName} w="40%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="العمر" value={d.age} w="20%" /><Field label="الجنس" value={d.gender} w="20%" /></div>
              <div style={fieldRow}><Field label="التشخيص" value={d.diagnosis} w="50%" /><Field label="الطبيب الطالب" value={d.doctor} w="50%" /></div>
            </Section>
            <Section title="التحاليل المطلوبة">
              <EmptyTable cols={4} rows={10} headers={['التحليل', 'النوع', 'أولوية', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="صيام مطلوب" value={d.fasting} w="25%" /><Field label="نوع العينة" value={d.sampleType} w="25%" /><Field label="الأولوية" value={d.priority} w="25%" /><Field label="التاريخ" value={today()} w="25%" /></div>
            <SignatureBlock rightLabel="الطبيب الطالب" leftLabel="فني المختبر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'medical-referral':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطاب إحالة طبية" subtitle="Medical Referral Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ margin: '16px 0', lineHeight: 2 }}>
              <p>السادة / <strong>{d.toHospital || '________________________'}</strong> المحترمين</p>
              <p>قسم / <strong>{d.toDepartment || '________________'}</strong></p>
              <p>السلام عليكم ورحمة الله وبركاته،</p>
              <p>نحيل إليكم المريض/ة <strong>{d.patientName || '____________'}</strong> العمر <strong>{d.age || '____'}</strong> رقم الملف <strong>{d.fileNo || '________'}</strong></p>
            </div>
            <Section title="التشخيص الحالي">
              <NotesBox value={d.diagnosis} lines={3} />
            </Section>
            <Section title="العلاج الحالي">
              <NotesBox value={d.treatment} lines={3} />
            </Section>
            <NotesBox label="سبب الإحالة" value={d.reason} lines={3} />
            <NotesBox label="تاريخ طبي ذو صلة" value={d.history} lines={3} />
            <SignatureBlock rightLabel="الطبيب المعالج" leftLabel="مدير الخدمات الطبية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'consent-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج موافقة طبية" subtitle="Medical Consent Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="اسم المستفيد" value={d.patientName} w="40%" /><Field label="رقم الملف" value={d.fileNo} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
            </Section>
            <Section title="الإجراء المطلوب">
              <div style={fieldRow}><Field label="نوع الإجراء" value={d.procedureType} w="50%" /><Field label="الطبيب المسؤول" value={d.doctor} w="50%" /></div>
              <NotesBox label="وصف الإجراء" value={d.procedureDesc} lines={3} />
            </Section>
            <NotesBox label="المخاطر المحتملة" value={d.risks} lines={3} />
            <NotesBox label="البدائل المتاحة" value={d.alternatives} lines={2} />
            <div style={{ margin: '16px 0', padding: 16, border: '2px solid #c62828', borderRadius: 8, background: '#fef2f2' }}>
              <p style={{ fontWeight: 'bold' }}>إقرار الموافقة:</p>
              <p style={{ lineHeight: 2 }}>أقر أنا الموقع أدناه ولي أمر المستفيد بأنني قد فهمت طبيعة الإجراء والمخاطر المحتملة وأوافق على إجرائه.</p>
            </div>
            <SignatureBlock rightLabel="ولي الأمر / الوصي" leftLabel="الطبيب المسؤول" />
            <div style={{ marginTop: 16 }}><SignatureBlock rightLabel="الشاهد" leftLabel="" /></div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'icf-evaluation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تقييم ICF" subtitle="ICF Evaluation Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="40%" /><Field label="العمر" value={d.age} w="20%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            </Section>
            <Section title="وظائف الجسم (Body Functions)">
              <EmptyTable cols={4} rows={5} headers={['الكود', 'الوظيفة', 'المؤهل (0-4)', 'ملاحظات']} />
            </Section>
            <Section title="بنى الجسم (Body Structures)">
              <EmptyTable cols={4} rows={4} headers={['الكود', 'البنية', 'المؤهل (0-4)', 'ملاحظات']} />
            </Section>
            <Section title="الأنشطة والمشاركة (Activities & Participation)">
              <EmptyTable cols={5} rows={6} headers={['الكود', 'النشاط', 'الأداء', 'القدرة', 'ملاحظات']} />
            </Section>
            <Section title="العوامل البيئية (Environmental Factors)">
              <EmptyTable cols={4} rows={4} headers={['الكود', 'العامل', 'ميسر/عائق', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="الأخصائي المقيّم" leftLabel="منسق التأهيل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'icf-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص تقييم ICF" subtitle="ICF Assessment Summary" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="40%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المقيّم" value={d.assessor} w="20%" /></div>
            <Section title="ملخص النتائج">
              <NotesBox label="الحالة الصحية" value={d.healthCondition} lines={2} />
              <NotesBox label="نقاط القوة" value={d.strengths} lines={2} />
              <NotesBox label="نقاط الضعف" value={d.weaknesses} lines={2} />
              <NotesBox label="الأهداف" value={d.goals} lines={3} />
              <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            </Section>
            <SignatureBlock rightLabel="الأخصائي" leftLabel="مدير التأهيل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mdt-meeting':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر اجتماع الفريق متعدد التخصصات" subtitle="MDT Meeting Minutes" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الاجتماع">
              <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="40%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /><Field label="رقم الاجتماع" value={d.meetingNo} w="30%" /></div>
            </Section>
            <Section title="الأعضاء الحاضرون">
              <EmptyTable cols={4} rows={6} headers={['الاسم', 'التخصص', 'القسم', 'التوقيع']} />
            </Section>
            <NotesBox label="ملخص الحالة الحالية" value={d.currentStatus} lines={3} />
            <Section title="القرارات والتوصيات">
              <EmptyTable cols={4} rows={5} headers={['القرار / التوصية', 'المسؤول', 'الإطار الزمني', 'الأولوية']} />
            </Section>
            <NotesBox label="الموعد القادم" value={d.nextMeeting} />
            <SignatureBlock rightLabel="رئيس الاجتماع" leftLabel="منسق MDT" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mdt-team-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير فريق MDT" subtitle="MDT Team Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="40%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="العمر" value={d.age} w="20%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            </Section>
            <Section title="تقارير التخصصات">
              <EmptyTable cols={4} rows={8} headers={['التخصص', 'الأخصائي', 'ملخص التقييم', 'التوصيات']} />
            </Section>
            <NotesBox label="ملخص عام" value={d.summary} />
            <NotesBox label="الخطة المتكاملة" value={d.plan} />
            <SignatureBlock rightLabel="منسق الفريق" leftLabel="مدير التأهيل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'telehealth-session':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص جلسة طب عن بعد" subtitle="Telehealth Session Summary" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الجلسة">
              <div style={fieldRow}><Field label="المستفيد" value={d.patientName} w="33%" /><Field label="الطبيب / الأخصائي" value={d.doctor} w="33%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="34%" /></div>
              <div style={fieldRow}><Field label="نوع الجلسة" value={d.sessionType} w="33%" /><Field label="المنصة" value={d.platform} w="33%" /><Field label="المدة" value={d.duration} w="34%" /></div>
            </Section>
            <NotesBox label="شكوى المستفيد" value={d.complaint} lines={3} />
            <NotesBox label="الفحص عن بُعد" value={d.examination} lines={3} />
            <NotesBox label="التشخيص" value={d.diagnosis} />
            <NotesBox label="الخطة العلاجية" value={d.plan} lines={3} />
            <div style={fieldRow}><Field label="متابعة" value={d.followUp} w="50%" /><Field label="موعد قادم" value={formatDate(d.nextAppointment)} w="50%" /></div>
            <SignatureBlock rightLabel="الطبيب / الأخصائي" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'e-prescription':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="وصفة إلكترونية" subtitle="e-Prescription" />
          <div style={bodyPad}>
            <div style={{ background: '#e3f2fd', padding: 8, borderRadius: 8, textAlign: 'center', fontSize: 11, marginBottom: 16 }}>وصفة صادرة عبر نظام الطب عن بعد — Issued via Telehealth System</div>
            <div style={fieldRow}><Field label="المستفيد" value={d.patientName} w="35%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="العمر" value={d.age} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
            <div style={fieldRow}><Field label="التشخيص" value={d.diagnosis} w="60%" /><Field label="الطبيب" value={d.doctor} w="40%" /></div>
            <div style={{ margin: '16px 0', padding: 16, border: '2px solid #0288d1', borderRadius: 8, minHeight: 200 }}>
              <div style={{ fontSize: 22, color: '#0288d1', fontWeight: 'bold', marginBottom: 12 }}>℞</div>
              <EmptyTable cols={5} rows={5} headers={['الدواء', 'الجرعة', 'التكرار', 'المدة', 'تعليمات']} />
            </div>
            <NotesBox label="ملاحظات" value={d.notes} />
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#666' }}>توقيع رقمي: {d.digitalSignature || '____________________'}</div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'psych-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج التقييم النفسي" subtitle="Psychological Assessment" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="40%" /><Field label="العمر" value={d.age} w="15%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="مصدر الإحالة" value={d.referralSource} w="25%" /></div>
            </Section>
            <NotesBox label="سبب التقييم" value={d.reason} lines={2} />
            <NotesBox label="التاريخ النمائي والاجتماعي" value={d.history} lines={3} />
            <Section title="أدوات التقييم المستخدمة">
              <EmptyTable cols={3} rows={5} headers={['الأداة / المقياس', 'النتيجة', 'التفسير']} />
            </Section>
            <NotesBox label="الملاحظة السلوكية" value={d.observation} lines={3} />
            <NotesBox label="الانطباع السريري" value={d.clinicalImpression} lines={3} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="الأخصائي النفسي" leftLabel="مدير الخدمات النفسية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'social-worker-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الأخصائي الاجتماعي" subtitle="Social Worker Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="40%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="نوع التقرير" value={d.reportType} w="20%" /></div>
            </Section>
            <NotesBox label="الحالة الاجتماعية والأسرية" value={d.familyStatus} lines={3} />
            <NotesBox label="الحالة الاقتصادية" value={d.economicStatus} lines={2} />
            <NotesBox label="المشكلات والاحتياجات" value={d.problems} lines={3} />
            <NotesBox label="الخدمات المقدمة" value={d.services} lines={3} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="الأخصائي الاجتماعي" leftLabel="مدير الخدمات الاجتماعية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'crisis-intervention':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج التدخل في الأزمات" subtitle="Crisis Intervention Form" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="40%" /><Field label="التاريخ والوقت" value={d.dateTime || today()} w="30%" /><Field label="مستوى الخطورة" value={d.riskLevel} w="30%" /></div>
            </Section>
            <NotesBox label="وصف الأزمة" value={d.crisisDescription} lines={4} />
            <NotesBox label="عوامل الخطر" value={d.riskFactors} lines={2} />
            <NotesBox label="عوامل الحماية" value={d.protectiveFactors} lines={2} />
            <NotesBox label="التدخل المقدم" value={d.intervention} lines={4} />
            <NotesBox label="خطة السلامة" value={d.safetyPlan} lines={3} />
            <div style={fieldRow}><Field label="المتابعة" value={d.followUp} w="50%" /><Field label="الإحالة" value={d.referral} w="50%" /></div>
            <SignatureBlock rightLabel="الأخصائي" leftLabel="المشرف السريري" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'life-skills':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم مهارات الحياة المستقلة" subtitle="Life Skills Assessment" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="40%" /><Field label="العمر" value={d.age} w="20%" /><Field label="المقيّم" value={d.assessor} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="تقييم المهارات">
              <EmptyTable cols={5} rows={12} headers={['المجال', 'المهارة', 'مستقل', 'بمساعدة', 'غير متمكن']} />
            </Section>
            <NotesBox label="نقاط القوة" value={d.strengths} />
            <NotesBox label="مجالات التحسين" value={d.improvements} />
            <NotesBox label="خطة التدريب" value={d.plan} />
            <SignatureBlock rightLabel="أخصائي التأهيل" leftLabel="مشرف البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
