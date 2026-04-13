/**
 * قوالب طباعة الشؤون القانونية والعقود — Legal & Contracts Print Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, formatMoney,
} from '../shared/PrintTemplateShared';

export const LEGAL_TEMPLATES = [
  { id: 'legal-opinion', name: 'رأي قانوني', nameEn: 'Legal Opinion', desc: 'مذكرة رأي قانوني', color: '#4e342e' },
  { id: 'case-summary', name: 'ملخص قضية', nameEn: 'Case Summary', desc: 'ملخص ملف قضية قانونية', color: '#5d4037' },
  { id: 'power-of-attorney', name: 'توكيل رسمي', nameEn: 'Power of Attorney', desc: 'صيغة توكيل رسمي', color: '#6d4c41' },
  { id: 'legal-notice', name: 'إنذار قانوني', nameEn: 'Legal Notice', desc: 'خطاب إنذار قانوني', color: '#795548' },
  { id: 'settlement-agreement', name: 'اتفاقية تسوية', nameEn: 'Settlement Agreement', desc: 'اتفاقية تسوية نزاع', color: '#8d6e63' },
  { id: 'litigation-report', name: 'تقرير تقاضي', nameEn: 'Litigation Report', desc: 'تقرير متابعة القضايا', color: '#4e342e' },
  { id: 'contract-agreement', name: 'عقد اتفاقية', nameEn: 'Contract Agreement', desc: 'صيغة عقد اتفاقية رسمي', color: '#1b5e20' },
  { id: 'contract-amendment', name: 'ملحق تعديل عقد', nameEn: 'Contract Amendment', desc: 'ملحق تعديل عقد قائم', color: '#2e7d32' },
  { id: 'completion-certificate', name: 'شهادة إنجاز', nameEn: 'Completion Certificate', desc: 'شهادة إتمام أعمال العقد', color: '#388e3c' },
  { id: 'contract-summary', name: 'ملخص عقد', nameEn: 'Contract Summary', desc: 'بطاقة ملخص بيانات العقد', color: '#43a047' },
  { id: 'penalty-notice', name: 'إشعار غرامة', nameEn: 'Penalty Notice', desc: 'إشعار تطبيق غرامة تعاقدية', color: '#c62828' },
];

export const LegalTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'legal-opinion':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مذكرة رأي قانوني" subtitle="Legal Opinion Memorandum" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="الموضوع">
              <div style={fieldRow}><Field label="الموضوع" value={d.subject} w="67%" /><Field label="الطالب" value={d.requestedBy} w="33%" /></div>
            </Section>
            <NotesBox label="الوقائع" value={d.facts} lines={5} />
            <NotesBox label="المسألة القانونية" value={d.legalQuestion} lines={3} />
            <NotesBox label="الأساس القانوني" value={d.legalBasis} lines={4} />
            <NotesBox label="الرأي القانوني" value={d.opinion} lines={5} />
            <NotesBox label="التوصية" value={d.recommendation} lines={3} />
            <SignatureBlock rightLabel="المستشار القانوني" leftLabel="مدير الشؤون القانونية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'case-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص ملف قضية" subtitle="Case Summary" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات القضية">
              <div style={fieldRow}><Field label="رقم القضية" value={d.caseNo} w="25%" /><Field label="نوع القضية" value={d.caseType} w="25%" /><Field label="المحكمة" value={d.court} w="25%" /><Field label="الحالة" value={d.status} w="25%" /></div>
              <div style={fieldRow}><Field label="المدعي" value={d.plaintiff} w="50%" /><Field label="المدعى عليه" value={d.defendant} w="50%" /></div>
              <div style={fieldRow}><Field label="تاريخ التسجيل" value={formatDate(d.filingDate)} w="33%" /><Field label="الجلسة القادمة" value={formatDate(d.nextHearing)} w="33%" /><Field label="المحامي" value={d.lawyer} w="34%" /></div>
            </Section>
            <NotesBox label="ملخص الوقائع" value={d.summary} lines={5} />
            <Section title="سجل الجلسات">
              <EmptyTable cols={4} rows={6} headers={['التاريخ', 'الجلسة', 'الإجراء', 'النتيجة']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} />
            <SignatureBlock rightLabel="المستشار القانوني" leftLabel="مدير الشؤون القانونية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'power-of-attorney':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توكيل رسمي" subtitle="Power of Attorney" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ margin: '20px 0', lineHeight: 2.2, fontSize: 14 }}>
              <p style={{ fontWeight: 'bold', textAlign: 'center', fontSize: 18, marginBottom: 20 }}>وكالة</p>
              <p>أنا الموقع أدناه / <strong>{d.principalName || '________________________'}</strong></p>
              <p>بصفتي / <strong>{d.principalTitle || '________________'}</strong> في مركز الأوائل</p>
              <p>رقم الهوية / <strong>{d.principalId || '____________'}</strong></p>
              <p>أوكل بموجب هذا السيد / <strong>{d.agentName || '________________________'}</strong></p>
              <p>رقم الهوية / <strong>{d.agentId || '____________'}</strong></p>
              <p>للقيام بالأعمال التالية نيابة عني:</p>
              <div style={{ minHeight: 80, border: '1px solid #ddd', borderRadius: 8, padding: 12, margin: '10px 0' }}>{d.scope || ''}</div>
              <p>مدة التوكيل: من <strong>{formatDate(d.startDate) || '________'}</strong> إلى <strong>{formatDate(d.endDate) || '________'}</strong></p>
            </div>
            <SignatureBlock rightLabel="الموكِل" leftLabel="الوكيل" />
            <div style={{ marginTop: 20 }}><SignatureBlock rightLabel="شاهد أول" leftLabel="شاهد ثاني" /></div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'legal-notice':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إنذار قانوني" subtitle="Legal Notice" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ margin: '16px 0', lineHeight: 2 }}>
              <p>السيد / <strong>{d.recipientName || '________________________'}</strong> &nbsp;&nbsp; المحترم</p>
              <p>الموضوع: <strong>{d.subject || '________________________________'}</strong></p>
              <p>السلام عليكم ورحمة الله وبركاته،</p>
              <p>بالإشارة إلى {d.reference || '________________________________'}،</p>
              <p>ننبهكم بأن {d.content || '________________________________'}.</p>
              <p>نمهلكم مدة <strong>{d.deadline || '____'}</strong> يوماً من تاريخ هذا الإنذار لتصحيح الوضع وإلا سنضطر لاتخاذ الإجراءات القانونية اللازمة.</p>
            </div>
            <NotesBox label="الأساس القانوني" value={d.legalBasis} />
            <SignatureBlock rightLabel="المستشار القانوني" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'settlement-agreement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="اتفاقية تسوية" subtitle="Settlement Agreement" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="أطراف الاتفاقية">
              <div style={fieldRow}><Field label="الطرف الأول" value={d.party1} w="50%" /><Field label="الطرف الثاني" value={d.party2} w="50%" /></div>
            </Section>
            <Section title="موضوع التسوية">
              <NotesBox value={d.subject} lines={3} />
            </Section>
            <NotesBox label="شروط التسوية" value={d.terms} lines={6} />
            <Section title="الالتزامات المالية">
              <div style={fieldRow}><Field label="المبلغ" value={formatMoney(d.amount)} w="33%" /><Field label="طريقة الدفع" value={d.paymentMethod} w="33%" /><Field label="تاريخ الاستحقاق" value={formatDate(d.dueDate)} w="34%" /></div>
            </Section>
            <NotesBox label="شروط إضافية" value={d.additionalTerms} />
            <SignatureBlock rightLabel="الطرف الأول" leftLabel="الطرف الثاني" />
            <div style={{ marginTop: 16 }}><SignatureBlock rightLabel="شاهد" leftLabel="المستشار القانوني" /></div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'litigation-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير متابعة القضايا" subtitle="Litigation Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="50%" /><Field label="إعداد" value={d.preparedBy} w="50%" /></div>
            <Section title="ملخص القضايا">
              <EmptyTable cols={7} rows={8} headers={['رقم القضية', 'النوع', 'الأطراف', 'المحكمة', 'الحالة', 'الجلسة القادمة', 'المخاطر']} />
            </Section>
            <Section title="إحصائيات">
              <div style={fieldRow}><Field label="إجمالي القضايا" value={d.totalCases} w="25%" /><Field label="نشطة" value={d.activeCases} w="25%" /><Field label="محلولة" value={d.resolved} w="25%" /><Field label="معلقة" value={d.pending} w="25%" /></div>
            </Section>
            <NotesBox label="توصيات" value={d.recommendations} />
            <SignatureBlock rightLabel="مدير الشؤون القانونية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'contract-agreement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="عقد اتفاقية" subtitle="Contract Agreement" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="أطراف العقد">
              <div style={fieldRow}><Field label="الطرف الأول" value={d.party1 || 'مركز الأوائل لرعاية وتأهيل ذوي الاحتياجات الخاصة'} w="50%" /><Field label="الطرف الثاني" value={d.party2} w="50%" /></div>
            </Section>
            <Section title="تفاصيل العقد">
              <div style={fieldRow}><Field label="رقم العقد" value={d.contractNo} w="25%" /><Field label="نوع العقد" value={d.contractType} w="25%" /><Field label="من تاريخ" value={formatDate(d.startDate)} w="25%" /><Field label="إلى تاريخ" value={formatDate(d.endDate)} w="25%" /></div>
              <div style={fieldRow}><Field label="قيمة العقد" value={formatMoney(d.value)} w="33%" /><Field label="طريقة الدفع" value={d.paymentTerms} w="33%" /><Field label="الضمان" value={d.warranty} w="34%" /></div>
            </Section>
            <NotesBox label="نطاق العمل" value={d.scope} lines={5} />
            <NotesBox label="الشروط والأحكام" value={d.terms} lines={8} />
            <SignatureBlock rightLabel="الطرف الأول" leftLabel="الطرف الثاني" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'contract-amendment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملحق تعديل عقد" subtitle="Contract Amendment" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات العقد الأصلي">
              <div style={fieldRow}><Field label="رقم العقد" value={d.contractNo} w="33%" /><Field label="تاريخ العقد" value={formatDate(d.contractDate)} w="33%" /><Field label="المقاول / المورد" value={d.contractor} w="34%" /></div>
            </Section>
            <Section title="التعديلات">
              <EmptyTable cols={4} rows={6} headers={['البند', 'النص الأصلي', 'النص المعدل', 'السبب']} />
            </Section>
            <Section title="الأثر المالي">
              <div style={fieldRow}><Field label="القيمة الأصلية" value={formatMoney(d.originalValue)} w="33%" /><Field label="قيمة التعديل" value={formatMoney(d.amendmentValue)} w="33%" /><Field label="القيمة الجديدة" value={formatMoney(d.newValue)} w="34%" /></div>
            </Section>
            <SignatureBlock rightLabel="الطرف الأول" leftLabel="الطرف الثاني" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'completion-certificate':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة إنجاز أعمال" subtitle="Completion Certificate" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ margin: '20px 0', lineHeight: 2 }}>
              <p>يشهد مركز الأوائل بأن المقاول / المورد:</p>
              <p><strong>{d.contractor || '________________________________'}</strong></p>
              <p>قد أتم جميع الأعمال المنصوص عليها في العقد رقم <strong>{d.contractNo || '________'}</strong> المؤرخ في <strong>{formatDate(d.contractDate) || '________'}</strong></p>
              <p>وذلك بتاريخ <strong>{formatDate(d.completionDate) || '________'}</strong></p>
            </div>
            <Section title="ملخص الأعمال">
              <NotesBox value={d.workSummary} lines={4} />
            </Section>
            <div style={fieldRow}><Field label="التقييم العام" value={d.rating} w="33%" /><Field label="فترة الضمان" value={d.warrantyPeriod} w="33%" /><Field label="المبلغ النهائي" value={formatMoney(d.finalAmount)} w="34%" /></div>
            <SignatureBlock rightLabel="مدير المشروع" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'contract-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة ملخص عقد" subtitle="Contract Summary" />
          <div style={bodyPad}>
            <Section title="البيانات الأساسية">
              <div style={fieldRow}><Field label="رقم العقد" value={d.contractNo} w="25%" /><Field label="نوع العقد" value={d.type} w="25%" /><Field label="الحالة" value={d.status} w="25%" /><Field label="الأولوية" value={d.priority} w="25%" /></div>
              <div style={fieldRow}><Field label="الطرف الثاني" value={d.contractor} w="50%" /><Field label="القيمة" value={formatMoney(d.value)} w="25%" /><Field label="المدة" value={d.duration} w="25%" /></div>
              <div style={fieldRow}><Field label="تاريخ البدء" value={formatDate(d.startDate)} w="25%" /><Field label="تاريخ الانتهاء" value={formatDate(d.endDate)} w="25%" /><Field label="المسؤول" value={d.manager} w="25%" /><Field label="القسم" value={d.department} w="25%" /></div>
            </Section>
            <NotesBox label="نطاق العمل" value={d.scope} />
            <Section title="المراحل">
              <EmptyTable cols={5} rows={5} headers={['المرحلة', 'الوصف', 'التاريخ', 'القيمة', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} />
          </div>
          <OrgFooter />
        </div>
      );

    case 'penalty-notice':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إشعار تطبيق غرامة تعاقدية" subtitle="Penalty Notice" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ margin: '16px 0', lineHeight: 2 }}>
              <p>السادة / <strong>{d.contractor || '________________________'}</strong> &nbsp;&nbsp; المحترمين</p>
              <p>الموضوع: إشعار بتطبيق غرامة تعاقدية</p>
              <p>بالإشارة إلى العقد رقم <strong>{d.contractNo || '________'}</strong> المؤرخ في <strong>{formatDate(d.contractDate) || '________'}</strong>،</p>
              <p>نفيدكم بأنه تم رصد المخالفة التالية:</p>
            </div>
            <NotesBox label="وصف المخالفة" value={d.violation} />
            <Section title="تفاصيل الغرامة">
              <div style={fieldRow}><Field label="البند التعاقدي" value={d.clause} w="33%" /><Field label="مبلغ الغرامة" value={formatMoney(d.penaltyAmount)} w="33%" /><Field label="تاريخ التطبيق" value={formatDate(d.effectiveDate)} w="34%" /></div>
            </Section>
            <NotesBox label="إجراءات تصحيحية مطلوبة" value={d.correctiveActions} />
            <SignatureBlock rightLabel="مدير العقود" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
