/**
 * قوالب الذكاء الاصطناعي والتحليلات التنبؤية
 * AI, ML & Predictive Analytics Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const AI_ML_ANALYTICS_TEMPLATES = [
  { id: 'predictive-analytics-report', name: 'تقرير تحليلات تنبؤية', nameEn: 'Predictive Analytics Report', desc: 'تقرير نتائج التحليلات التنبؤية', color: '#6a1b9a' },
  { id: 'ml-model-performance', name: 'تقرير أداء النموذج', nameEn: 'ML Model Performance Report', desc: 'تقرير أداء نموذج التعلم الآلي', color: '#7b1fa2' },
  { id: 'ai-recommendation-log', name: 'سجل توصيات الذكاء', nameEn: 'AI Recommendation Log', desc: 'سجل التوصيات المولدة بالذكاء الاصطناعي', color: '#8e24aa' },
  { id: 'data-quality-report', name: 'تقرير جودة البيانات', nameEn: 'Data Quality Report', desc: 'تقرير فحص جودة البيانات', color: '#9c27b0' },
  { id: 'anomaly-detection-report', name: 'تقرير كشف الشذوذ', nameEn: 'Anomaly Detection Report', desc: 'تقرير الحالات الشاذة المكتشفة', color: '#ab47bc' },
  { id: 'sentiment-analysis', name: 'تحليل المشاعر', nameEn: 'Sentiment Analysis Report', desc: 'تقرير تحليل المشاعر والآراء', color: '#ce93d8' },
  { id: 'risk-scoring-report', name: 'تقرير تسجيل المخاطر', nameEn: 'Risk Scoring Report', desc: 'تقرير تقييم المخاطر بالذكاء الاصطناعي', color: '#c62828' },
  { id: 'trend-forecast-report', name: 'تقرير توقع الاتجاهات', nameEn: 'Trend Forecast Report', desc: 'توقع الاتجاهات المستقبلية', color: '#1565c0' },
  { id: 'nlp-processing-log', name: 'سجل معالجة اللغة', nameEn: 'NLP Processing Log', desc: 'سجل معالجة اللغة الطبيعية', color: '#0277bd' },
  { id: 'chatbot-analytics', name: 'تحليلات المحادثة الآلية', nameEn: 'Chatbot Analytics Report', desc: 'تقرير أداء المحادثة الآلية', color: '#00838f' },
  { id: 'image-recognition-log', name: 'سجل تعرف الصور', nameEn: 'Image Recognition Log', desc: 'سجل نتائج التعرف على الصور', color: '#00695c' },
  { id: 'data-pipeline-status', name: 'حالة أنابيب البيانات', nameEn: 'Data Pipeline Status', desc: 'تقرير حالة أنابيب معالجة البيانات', color: '#2e7d32' },
  { id: 'ab-test-results', name: 'نتائج اختبار A/B', nameEn: 'A/B Test Results', desc: 'تقرير نتائج اختبارات A/B', color: '#558b2f' },
  { id: 'feature-importance', name: 'أهمية المتغيرات', nameEn: 'Feature Importance Report', desc: 'تقرير أهمية المتغيرات في النموذج', color: '#e65100' },
  { id: 'ai-ethics-review', name: 'مراجعة أخلاقيات الذكاء', nameEn: 'AI Ethics Review', desc: 'مراجعة الجوانب الأخلاقية للذكاء الاصطناعي', color: '#bf360c' },
  { id: 'automation-impact', name: 'تقرير أثر الأتمتة', nameEn: 'Automation Impact Report', desc: 'تقرير أثر الأتمتة على العمليات', color: '#4527a0' },
];

export const AIMLAnalyticsTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'predictive-analytics-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التحليلات التنبؤية" subtitle="Predictive Analytics Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النموذج" value={d.model} w="20%" /><Field label="الفترة" value={d.period} w="15%" /><Field label="المحلل" value={d.analyst} w="20%" /></div>
            <Section title="نتائج التنبؤ">
              <EmptyTable cols={5} rows={6} headers={['المؤشر', 'القيمة الحالية', 'التنبؤ', 'الثقة %', 'الاتجاه']} />
            </Section>
            <NotesBox label="التحليل والاستنتاجات" value={d.analysis} lines={3} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="محلل البيانات" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ml-model-performance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أداء نموذج التعلم الآلي" subtitle="ML Model Performance Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم النموذج" value={d.modelName} w="20%" /><Field label="الإصدار" value={d.version} w="10%" /><Field label="تاريخ التدريب" value={formatDate(d.trainDate)} w="15%" /></div>
            <Section title="مقاييس الأداء">
              <EmptyTable cols={4} rows={6} headers={['المقياس', 'تدريب', 'اختبار', 'إنتاج']} />
            </Section>
            <Section title="مصفوفة الخلط (Confusion Matrix)">
              <EmptyTable cols={4} rows={3} headers={['', 'تنبؤ إيجابي', 'تنبؤ سلبي', 'الإجمالي']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مهندس ML" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ai-recommendation-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل توصيات الذكاء الاصطناعي" subtitle="AI Recommendation Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النظام" value={d.system} w="20%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="التوصيات المولدة">
              <EmptyTable cols={6} rows={8} headers={['التاريخ', 'النوع', 'التوصية', 'الثقة', 'القرار', 'النتيجة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي التوصيات" value={d.totalRecs} w="12%" /><Field label="نسبة القبول" value={d.acceptRate} w="12%" /><Field label="نسبة النجاح" value={d.successRate} w="12%" /></div>
            <SignatureBlock rightLabel="محلل البيانات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'data-quality-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير فحص جودة البيانات" subtitle="Data Quality Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="قاعدة البيانات" value={d.database} w="20%" /><Field label="تاريخ الفحص" value={formatDate(d.date) || today()} w="15%" /><Field label="الفاحص" value={d.inspector} w="20%" /></div>
            <Section title="نتائج الفحص">
              <EmptyTable cols={5} rows={8} headers={['الجدول', 'الاكتمال %', 'الدقة %', 'التكرار', 'التناسق']} />
            </Section>
            <div style={fieldRow}><Field label="جودة عامة" value={d.overallScore} w="12%" /></div>
            <NotesBox label="مشاكل مكتشفة" value={d.issues} lines={2} />
            <NotesBox label="إجراءات تصحيحية" value={d.corrections} lines={2} />
            <SignatureBlock rightLabel="مهندس البيانات" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'anomaly-detection-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير كشف الحالات الشاذة" subtitle="Anomaly Detection Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النظام" value={d.system} w="20%" /><Field label="الفترة" value={d.period} w="15%" /><Field label="الخوارزمية" value={d.algorithm} w="15%" /></div>
            <Section title="الحالات الشاذة المكتشفة">
              <EmptyTable cols={6} rows={6} headers={['التاريخ', 'النوع', 'الشدة', 'الوصف', 'الإجراء', 'الحالة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الحالات" value={d.totalAnomalies} w="12%" /><Field label="حرجة" value={d.critical} w="8%" /><Field label="تحذيرية" value={d.warning} w="8%" /></div>
            <NotesBox label="التحليل" value={d.analysis} lines={2} />
            <SignatureBlock rightLabel="محلل الأمن" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'sentiment-analysis':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تحليل المشاعر والآراء" subtitle="Sentiment Analysis Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المصدر" value={d.source} w="20%" /><Field label="الفترة" value={d.period} w="15%" /><Field label="العينة" value={d.sampleSize} w="12%" /></div>
            <Section title="النتائج">
              <EmptyTable cols={4} rows={5} headers={['الفئة', 'إيجابي %', 'محايد %', 'سلبي %']} />
            </Section>
            <NotesBox label="المواضيع الرئيسية" value={d.mainTopics} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="محلل البيانات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'risk-scoring-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقييم المخاطر بالذكاء الاصطناعي" subtitle="AI Risk Scoring Report" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النموذج" value={d.model} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="تسجيل المخاطر">
              <EmptyTable cols={5} rows={6} headers={['الكيان', 'درجة المخاطر', 'المستوى', 'العوامل الرئيسية', 'الإجراء']} />
            </Section>
            <NotesBox label="التحليل" value={d.analysis} lines={2} />
            <SignatureBlock rightLabel="محلل المخاطر" leftLabel="مدير إدارة المخاطر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'trend-forecast-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير توقع الاتجاهات المستقبلية" subtitle="Trend Forecast Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المجال" value={d.domain} w="20%" /><Field label="فترة التنبؤ" value={d.forecastPeriod} w="15%" /><Field label="النموذج" value={d.model} w="15%" /></div>
            <Section title="التوقعات">
              <EmptyTable cols={5} rows={6} headers={['المؤشر', 'الحالي', '3 أشهر', '6 أشهر', '12 شهر']} />
            </Section>
            <NotesBox label="الافتراضات" value={d.assumptions} lines={2} />
            <NotesBox label="السيناريوهات" value={d.scenarios} lines={2} />
            <SignatureBlock rightLabel="محلل البيانات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'nlp-processing-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل معالجة اللغة الطبيعية" subtitle="NLP Processing Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النظام" value={d.system} w="20%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="العمليات">
              <EmptyTable cols={5} rows={6} headers={['العملية', 'اللغة', 'عدد المستندات', 'الدقة %', 'الوقت']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي المعالج" value={d.totalProcessed} w="12%" /><Field label="متوسط الدقة" value={d.avgAccuracy} w="12%" /></div>
            <SignatureBlock rightLabel="مهندس NLP" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'chatbot-analytics':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أداء المحادثة الآلية" subtitle="Chatbot Analytics Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="إجمالي المحادثات" value={d.totalChats} w="12%" /><Field label="نسبة الحل" value={d.resolutionRate} w="12%" /></div>
            <Section title="إحصائيات">
              <EmptyTable cols={4} rows={6} headers={['الفئة', 'العدد', 'رضا المستخدم', 'وقت الحل']} />
            </Section>
            <NotesBox label="أسئلة لم يتم الرد عليها" value={d.unanswered} lines={2} />
            <NotesBox label="توصيات للتحسين" value={d.improvements} lines={2} />
            <SignatureBlock rightLabel="مدير تجربة المستخدم" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'image-recognition-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل نتائج التعرف على الصور" subtitle="Image Recognition Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النموذج" value={d.model} w="20%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="النتائج">
              <EmptyTable cols={5} rows={6} headers={['المعرّف', 'النوع', 'الثقة %', 'النتيجة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الصور" value={d.totalImages} w="12%" /><Field label="الدقة" value={d.accuracy} w="10%" /></div>
            <SignatureBlock rightLabel="مهندس الرؤية الحاسوبية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'data-pipeline-status':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حالة أنابيب البيانات" subtitle="Data Pipeline Status Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="المهندس" value={d.engineer} w="20%" /></div>
            <Section title="حالة الأنابيب">
              <EmptyTable cols={6} rows={6} headers={['الأنبوب', 'المصدر', 'الوجهة', 'آخر تشغيل', 'الحالة', 'السجلات']} />
            </Section>
            <NotesBox label="مشاكل" value={d.issues} lines={2} />
            <SignatureBlock rightLabel="مهندس البيانات" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ab-test-results':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نتائج اختبار A/B" subtitle="A/B Test Results Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الاختبار" value={d.testName} w="25%" /><Field label="الفترة" value={d.period} w="15%" /><Field label="حجم العينة" value={d.sampleSize} w="12%" /></div>
            <Section title="النتائج">
              <EmptyTable cols={5} rows={4} headers={['المتغير', 'المجموعة A', 'المجموعة B', 'الفرق %', 'الدلالة']} />
            </Section>
            <NotesBox label="الاستنتاج" value={d.conclusion} lines={2} />
            <NotesBox label="التوصية" value={d.recommendation} lines={1} />
            <SignatureBlock rightLabel="محلل البيانات" leftLabel="مدير المنتج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'feature-importance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أهمية المتغيرات" subtitle="Feature Importance Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النموذج" value={d.model} w="20%" /><Field label="الإصدار" value={d.version} w="10%" /></div>
            <Section title="ترتيب المتغيرات">
              <EmptyTable cols={4} rows={10} headers={['الترتيب', 'المتغير', 'الأهمية %', 'التأثير']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مهندس ML" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ai-ethics-review':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مراجعة الجوانب الأخلاقية للذكاء الاصطناعي" subtitle="AI Ethics Review" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النظام" value={d.system} w="20%" /><Field label="المراجع" value={d.reviewer} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="بنود المراجعة">
              <EmptyTable cols={4} rows={8} headers={['البند', 'متوافق', 'غير متوافق', 'ملاحظات']} />
            </Section>
            <NotesBox label="المخاوف الأخلاقية" value={d.concerns} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="لجنة الأخلاقيات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'automation-impact':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أثر الأتمتة على العمليات" subtitle="Automation Impact Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المشروع" value={d.project} w="25%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="قياس الأثر">
              <EmptyTable cols={5} rows={6} headers={['العملية', 'الوقت (قبل)', 'الوقت (بعد)', 'التوفير %', 'الجودة']} />
            </Section>
            <div style={fieldRow}><Field label="توفير الوقت" value={d.timeSaved} w="15%" /><Field label="توفير التكلفة" value={d.costSaved} w="15%" /><Field label="ROI" value={d.roi} w="10%" /></div>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مدير المشروع" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
