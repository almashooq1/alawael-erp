/**
 * قوالب طباعة المرافق والخدمات — Facility & Services Print Templates
 * يشمل: إدارة المرافق، المطبخ والتغذية، المغسلة
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, PrintTable, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const FACILITY_TEMPLATES = [
  // إدارة المرافق
  { id: 'facility-maintenance', name: 'أمر صيانة مرفق', nameEn: 'Facility Maintenance Order', desc: 'طلب صيانة مبنى أو مرفق', color: '#4e342e' },
  { id: 'room-booking', name: 'حجز قاعة', nameEn: 'Room Booking Form', desc: 'نموذج حجز قاعة اجتماعات', color: '#5d4037' },
  { id: 'facility-inspection', name: 'تفتيش مرفق', nameEn: 'Facility Inspection', desc: 'نموذج تفتيش دوري للمبنى', color: '#6d4c41' },
  { id: 'space-allocation', name: 'تخصيص مساحة', nameEn: 'Space Allocation', desc: 'نموذج تخصيص مكتب أو مساحة', color: '#795548' },
  // المطبخ والتغذية
  { id: 'daily-menu', name: 'قائمة الطعام اليومية', nameEn: 'Daily Menu', desc: 'قائمة الوجبات اليومية', color: '#e65100' },
  { id: 'meal-plan', name: 'خطة الوجبات الأسبوعية', nameEn: 'Weekly Meal Plan', desc: 'خطة الوجبات الأسبوعية', color: '#ef6c00' },
  { id: 'nutrition-report', name: 'تقرير التغذية', nameEn: 'Nutrition Report', desc: 'تقرير القيمة الغذائية', color: '#f57c00' },
  { id: 'food-safety', name: 'قائمة السلامة الغذائية', nameEn: 'Food Safety Checklist', desc: 'قائمة تحقق سلامة الغذاء', color: '#fb8c00' },
  { id: 'diet-card', name: 'بطاقة حمية', nameEn: 'Diet Card', desc: 'بطاقة حمية غذائية خاصة', color: '#ffa726' },
  // المغسلة
  { id: 'laundry-receipt', name: 'إيصال مغسلة', nameEn: 'Laundry Service Receipt', desc: 'إيصال استلام ملابس', color: '#0097a7' },
  { id: 'laundry-quality', name: 'فحص جودة المغسلة', nameEn: 'Laundry Quality Checklist', desc: 'قائمة فحص جودة الغسيل', color: '#00acc1' },
  { id: 'laundry-equipment', name: 'سجل معدات المغسلة', nameEn: 'Laundry Equipment Log', desc: 'سجل صيانة معدات المغسلة', color: '#00bcd4' },
];

export const FacilityTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'facility-maintenance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="أمر صيانة مرفق" subtitle="Facility Maintenance Work Order" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطلب">
              <div style={fieldRow}><Field label="الموقع / المبنى" value={d.building} w="30%" /><Field label="الطابق" value={d.floor} w="15%" /><Field label="الغرفة" value={d.room} w="15%" /><Field label="الأولوية" value={d.priority} w="20%" /><Field label="النوع" value={d.type} w="20%" /></div>
              <div style={fieldRow}><Field label="مقدم الطلب" value={d.requestedBy} w="40%" /><Field label="القسم" value={d.department} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
            </Section>
            <NotesBox label="وصف المشكلة" value={d.problem} lines={3} />
            <Section title="أعمال الصيانة">
              <EmptyTable cols={4} rows={6} headers={['العمل المنفذ', 'المواد المستخدمة', 'الفني', 'الوقت']} />
            </Section>
            <div style={fieldRow}><Field label="تاريخ الإنجاز" value={formatDate(d.completionDate)} w="33%" /><Field label="التكلفة" value={d.cost} w="33%" /><Field label="الحالة" value={d.status} w="34%" /></div>
            <SignatureBlock rightLabel="فني الصيانة" leftLabel="مدير المرافق" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'room-booking':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج حجز قاعة" subtitle="Room Booking Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الحجز">
              <div style={fieldRow}><Field label="القاعة" value={d.roomName} w="30%" /><Field label="التاريخ" value={formatDate(d.bookingDate)} w="25%" /><Field label="من الساعة" value={d.fromTime} w="22%" /><Field label="إلى الساعة" value={d.toTime} w="23%" /></div>
              <div style={fieldRow}><Field label="الحاجز" value={d.bookedBy} w="40%" /><Field label="القسم" value={d.department} w="30%" /><Field label="عدد الحضور المتوقع" value={d.expectedAttendees} w="30%" /></div>
            </Section>
            <NotesBox label="الغرض" value={d.purpose} />
            <Section title="المتطلبات">
              <EmptyTable cols={3} rows={6} headers={['المتطلب', 'متوفر', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مقدم الطلب" leftLabel="مدير المرافق" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'facility-inspection':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تفتيش مرفق" subtitle="Facility Inspection Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المبنى / المرفق" value={d.facility} w="40%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /><Field label="المفتش" value={d.inspector} w="35%" /></div>
            <Section title="بنود التفتيش">
              <EmptyTable cols={5} rows={15} headers={['م', 'البند', 'مطابق', 'غير مطابق', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="النتيجة العامة" value={d.overallResult} w="30%" /><Field label="نسبة المطابقة" value={d.complianceRate} w="30%" /><Field label="المتابعة المطلوبة" value={d.followUp} w="40%" /></div>
            <NotesBox label="ملاحظات وتوصيات" value={d.remarks} lines={3} />
            <SignatureBlock rightLabel="المفتش" leftLabel="مدير المرافق" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'space-allocation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تخصيص مساحة" subtitle="Space Allocation Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطلب">
              <div style={fieldRow}><Field label="القسم الطالب" value={d.department} w="40%" /><Field label="مقدم الطلب" value={d.requestedBy} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
              <div style={fieldRow}><Field label="نوع المساحة" value={d.spaceType} w="33%" /><Field label="المساحة المطلوبة" value={d.requiredArea} w="33%" /><Field label="عدد الشاغلين" value={d.occupants} w="34%" /></div>
            </Section>
            <NotesBox label="الغرض من التخصيص" value={d.purpose} />
            <Section title="التخصيص المعتمد">
              <div style={fieldRow}><Field label="المبنى" value={d.building} w="30%" /><Field label="الطابق" value={d.floor} w="20%" /><Field label="الغرفة / المكتب" value={d.room} w="25%" /><Field label="المساحة" value={d.area} w="25%" /></div>
            </Section>
            <NotesBox label="التجهيزات المطلوبة" value={d.equipment} />
            <SignatureBlock rightLabel="مدير المرافق" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'daily-menu':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة الطعام اليومية" subtitle="Daily Menu" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اليوم" value={d.day} w="33%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="33%" /><Field label="الشيف المسؤول" value={d.chef} w="34%" /></div>
            <Section title="الإفطار">
              <EmptyTable cols={4} rows={4} headers={['الصنف', 'الكمية', 'ملاحظات غذائية', 'حساسية']} />
            </Section>
            <Section title="الغداء">
              <EmptyTable cols={4} rows={5} headers={['الصنف', 'الكمية', 'ملاحظات غذائية', 'حساسية']} />
            </Section>
            <Section title="العشاء">
              <EmptyTable cols={4} rows={4} headers={['الصنف', 'الكمية', 'ملاحظات غذائية', 'حساسية']} />
            </Section>
            <Section title="الوجبات الخفيفة">
              <EmptyTable cols={3} rows={3} headers={['الصنف', 'الوقت', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="عدد الوجبات" value={d.totalMeals} w="33%" /><Field label="حالات خاصة" value={d.specialDiets} w="33%" /><Field label="اعتمد" value={d.approvedBy} w="34%" /></div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'meal-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الوجبات الأسبوعية" subtitle="Weekly Meal Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الأسبوع" value={d.week} w="40%" /><Field label="أخصائي التغذية" value={d.nutritionist} w="30%" /><Field label="اعتمد" value={d.approvedBy} w="30%" /></div>
            <Section title="جدول الوجبات">
              <EmptyTable cols={5} rows={7} headers={['اليوم', 'الإفطار', 'الغداء', 'العشاء', 'الوجبات الخفيفة']} />
            </Section>
            <NotesBox label="ملاحظات غذائية" value={d.notes} />
            <div style={fieldRow}><Field label="إجمالي السعرات المستهدفة" value={d.targetCalories} w="33%" /><Field label="حالات حمية خاصة" value={d.specialDiets} w="33%" /><Field label="الميزانية الأسبوعية" value={d.budget} w="34%" /></div>
            <SignatureBlock rightLabel="أخصائي التغذية" leftLabel="مدير الخدمات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'nutrition-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التغذية" subtitle="Nutrition Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiaryName} w="40%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="العمر" value={d.age} w="15%" /><Field label="الوزن" value={d.weight} w="12%" /><Field label="الطول" value={d.height} w="13%" /></div>
            <Section title="القياسات">
              <div style={fieldRow}><Field label="BMI" value={d.bmi} w="25%" /><Field label="التصنيف" value={d.bmiCategory} w="25%" /><Field label="الحمية الموصوفة" value={d.dietType} w="50%" /></div>
            </Section>
            <Section title="تحليل التغذية">
              <EmptyTable cols={5} rows={6} headers={['العنصر', 'الحاجة اليومية', 'المتناول', 'النسبة %', 'ملاحظات']} />
            </Section>
            <NotesBox label="التوصيات الغذائية" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="أخصائي التغذية" leftLabel="الطبيب المعالج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'food-safety':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة تحقق السلامة الغذائية" subtitle="Food Safety Checklist" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /><Field label="الوقت" value={d.time} w="20%" /><Field label="المفتش" value={d.inspector} w="30%" /><Field label="الموقع" value={d.location} w="25%" /></div>
            <Section title="درجات الحرارة">
              <EmptyTable cols={4} rows={5} headers={['المعدة / الموقع', 'القراءة °C', 'المعيار', 'مطابق']} />
            </Section>
            <Section title="النظافة والسلامة">
              <EmptyTable cols={4} rows={10} headers={['البند', 'مطابق', 'غير مطابق', 'إجراء تصحيحي']} />
            </Section>
            <Section title="تواريخ الصلاحية">
              <EmptyTable cols={4} rows={5} headers={['المنتج', 'تاريخ الإنتاج', 'تاريخ الانتهاء', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} />
            <SignatureBlock rightLabel="المفتش" leftLabel="مسؤول المطبخ" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'diet-card':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة حمية غذائية" subtitle="Special Diet Card" />
          <div style={bodyPad}>
            <div style={{ border: '3px solid #e65100', borderRadius: 16, padding: 20 }}>
              <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#e65100', marginBottom: 16 }}>بطاقة حمية غذائية خاصة</div>
              <div style={fieldRow}><Field label="اسم المستفيد" value={d.name} w="50%" /><Field label="رقم الملف" value={d.fileNo} w="25%" /><Field label="الغرفة" value={d.room} w="25%" /></div>
              <div style={fieldRow}><Field label="نوع الحمية" value={d.dietType} w="40%" /><Field label="السبب الطبي" value={d.medicalReason} w="60%" /></div>
              <Section title="الممنوعات">
                <NotesBox value={d.restrictions} lines={3} />
              </Section>
              <Section title="المسموحات">
                <NotesBox value={d.allowed} lines={3} />
              </Section>
              <NotesBox label="تعليمات خاصة" value={d.instructions} />
              <div style={fieldRow}><Field label="الطبيب" value={d.doctor} w="33%" /><Field label="أخصائي التغذية" value={d.nutritionist} w="33%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="34%" /></div>
            </div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'laundry-receipt':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إيصال استلام المغسلة" subtitle="Laundry Service Receipt" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد / القسم" value={d.client} w="40%" /><Field label="تاريخ الاستلام" value={formatDate(d.receivedDate) || today()} w="30%" /><Field label="تاريخ التسليم المتوقع" value={formatDate(d.expectedDelivery)} w="30%" /></div>
            <Section title="المحتويات">
              <EmptyTable cols={5} rows={10} headers={['م', 'الصنف', 'العدد', 'الحالة عند الاستلام', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي القطع" value={d.totalItems} w="33%" /><Field label="نوع الخدمة" value={d.serviceType} w="33%" /><Field label="ملاحظات خاصة" value={d.specialNotes} w="34%" /></div>
            <SignatureBlock rightLabel="المسلِّم" leftLabel="مسؤول المغسلة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'laundry-quality':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فحص جودة المغسلة" subtitle="Laundry Quality Checklist" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /><Field label="رقم الدفعة" value={d.batchNo} w="25%" /><Field label="المفتش" value={d.inspector} w="25%" /><Field label="نوع الغسيل" value={d.type} w="25%" /></div>
            <Section title="بنود فحص الجودة">
              <EmptyTable cols={4} rows={10} headers={['البند', 'مطابق', 'غير مطابق', 'إجراء تصحيحي']} />
            </Section>
            <div style={fieldRow}><Field label="نسبة المطابقة" value={d.complianceRate} w="33%" /><Field label="النتيجة" value={d.result} w="33%" /><Field label="يحتاج إعادة" value={d.redo} w="34%" /></div>
            <SignatureBlock rightLabel="مفتش الجودة" leftLabel="مسؤول المغسلة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'laundry-equipment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل معدات المغسلة" subtitle="Laundry Equipment Maintenance Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم المعدة" value={d.equipmentName} w="30%" /><Field label="الرقم التسلسلي" value={d.serialNo} w="25%" /><Field label="تاريخ الشراء" value={formatDate(d.purchaseDate)} w="22%" /><Field label="الحالة" value={d.status} w="23%" /></div>
            <Section title="سجل الصيانة">
              <EmptyTable cols={6} rows={12} headers={['التاريخ', 'نوع الصيانة', 'الوصف', 'الفني', 'التكلفة', 'القادمة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} />
            <SignatureBlock rightLabel="فني الصيانة" leftLabel="مسؤول المغسلة" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
