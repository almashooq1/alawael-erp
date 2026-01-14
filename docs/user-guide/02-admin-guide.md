# دليل الإدارة والتشغيل | Admin Guide & Runbooks

**اللغة | Language:** العربية (Arabic) | English  
**آخر تحديث | Last Updated:** January 14, 2026  
**المستوى | Level:** Advanced / للمسؤولين (For Administrators)

---

## 📖 محتويات | Table of Contents

1. [مقدمة الإدارة | Administration Overview](#مقدمة-الإدارة)
2. [إدارة المستخدمين | User Management](#إدارة-المستخدمين)
3. [التحكم بالصلاحيات | Permission Control](#التحكم-بالصلاحيات)
4. [إدارة الأقسام والفروع | Department & Branch Management](#إدارة-الأقسام)
5. [المراقبة والتقارير | Monitoring & Reports](#المراقبة-والتقارير)
6. [النسخ الاحتياطي والاستعادة | Backup & Restore](#النسخ-الاحتياطي)
7. [استكشاف الأخطاء | Troubleshooting](#استكشاف-الأخطاء)
8. [العمليات الروتينية اليومية | Daily Operations](#العمليات-الروتينية)

---

## 🔧 مقدمة الإدارة | Administration Overview

**Role:** نافذة التحكم الكاملة لنظام إدارة إعادة التأهيل

**Role:** Complete control panel for the rehabilitation management system

### الميزات الإدارية | Admin Features:

```
✅ إدارة المستخدمين (إضافة، تعديل، حذف)
✅ التحكم بالصلاحيات والأدوار
✅ مراقبة النشاط والأداء
✅ إدارة النسخ الاحتياطية
✅ التقارير المتقدمة
✅ إدارة الإعدادات العامة
✅ تحليل الأداء والأمان

✅ User management (add, edit, delete)
✅ Permission and role control
✅ Activity and performance monitoring
✅ Backup management
✅ Advanced reporting
✅ General settings management
✅ Performance and security analysis
```

### الوصول إلى لوحة الإدارة | Access Admin Panel:

```
URL: https://rehab-system.sa/admin
أو | Or: http://localhost:3000/admin (محلي | local)

متطلبات الوصول | Access Requirements:
- دور المسؤول | Admin role
- كلمة مرور قوية | Strong password
- المصادقة الثنائية | Two-factor authentication (recommended)
```

---

## 👥 إدارة المستخدمين | User Management

### إضافة مستخدم جديد | Add New User

**الخطوات | Steps:**

```
1. اذهب إلى الإدارة → المستخدمون → إضافة مستخدم جديد
   Go to Admin → Users → Add New User

2. ملء النموذج مع المعلومات التالية | Fill form with:
   - الاسم الكامل | Full Name: [نص | text]
   - البريد الإلكتروني | Email: [البريد | email]
   - رقم الهاتف | Phone: [رقم | number]
   - الدور | Role: [اختر من القائمة | select from list]
   - القسم | Department: [اختر من القائمة | select]
   - الفرع | Branch: [اختر من القائمة | select]
   - الحالة | Status: نشط (Active) / معطل (Disabled)

3. عيّن كلمة مرور مؤقتة | Set temporary password
   - الطول الأدنى | Min length: 8 أحرف | characters
   - يجب أن تحتوي | Must contain: حروف + أرقام + رموز
   - سيطلب من المستخدم تغييرها عند أول دخول | User must change on first login

4. حدد الصلاحيات | Assign permissions
   - حسب الدور المختار | Based on selected role
   - يمكن تخصيص صلاحيات إضافية | Can customize permissions

5. انقر حفظ | Click Save
   - سيتم إرسال بريد إلكتروني للمستخدم | Email sent to user
   - يحتوي على رابط التفعيل | Contains activation link
```

### تعديل بيانات المستخدم | Edit User Information

```
الخطوات | Steps:
1. ابحث عن المستخدم | Search for user
2. انقر على التعديل | Click Edit
3. غيّر المعلومات المطلوبة | Update required fields
4. انقر حفظ | Click Save
5. سيتم إرسال إشعار للمستخدم | User will be notified

تحذير | Warning:
⚠️ تغيير الدور قد يؤثر على الوصول الحالي
⚠️ Changing role may affect current access
```

### تعطيل/تفعيل مستخدم | Disable/Enable User

```
عند الحاجة لمنع المستخدم من الوصول مؤقتاً:
When you need to temporarily prevent user access:

1. اذهب إلى المستخدمين | Go to Users
2. ابحث عن المستخدم | Find the user
3. انقر الخيارات | Click Options (...)
4. اختر تعطيل | Select Disable

إعادة التفعيل | To Re-enable:
- نفس الخطوات، اختر تفعيل | Same steps, select Enable
- المستخدم سيحتاج إلى تسجيل دخول جديد | User must login again
```

---

## 🔐 التحكم بالصلاحيات | Permission Control

### الأدوار المعرّفة | Defined Roles:

| الدور              | Role               | الصلاحيات               | Permissions                  |
| ------------------ | ------------------ | ----------------------- | ---------------------------- |
| **مسؤول النظام**   | System Admin       | جميع الصلاحيات          | All permissions              |
| **مسؤول الفرع**    | Branch Admin       | إدارة الفرع والمستخدمين | Branch & user management     |
| **مدير القسم**     | Department Manager | إدارة القسم والموارد    | Department & resources       |
| **طبيب/معالج**     | Therapist/Doctor   | إدارة المرضى والجلسات   | Patient & session management |
| **موظف الاستقبال** | Receptionist       | جدولة المواعيد والتسجيل | Scheduling & registration    |
| **محاسب**          | Accountant         | إدارة المالية والفواتير | Financial management         |

### منح الصلاحيات المخصصة | Grant Custom Permissions

```
للمستخدمين الذين يحتاجون صلاحيات خاصة:
For users needing special permissions:

1. اذهب إلى المستخدم → الصلاحيات | Go to User → Permissions
2. اختر الصلاحيات المطلوبة | Select required permissions
3. حدد مدى التطبيق | Set scope (كل النظام | entire system / فرع | branch / قسم | department)
4. احفظ التغييرات | Save changes

مثال | Example:
- مستخدم يحتاج قراءة التقارير فقط | User needs report reading only
  ✓ صلاحية: عرض التقارير | Permission: View Reports
  ✓ النطاق: الفرع الخاص به | Scope: Their branch
  ✗ بدون: تعديل أو حذف | Without: Edit or Delete
```

---

## 🏢 إدارة الأقسام والفروع | Department & Branch Management

### إضافة فرع جديد | Add New Branch

```
1. الإدارة → الفروع → إضافة فرع جديد
   Admin → Branches → Add New Branch

2. معلومات الفرع | Branch Information:
   - اسم الفرع | Branch Name: [نص | text]
   - المدينة | City: [اختر | select]
   - العنوان | Address: [نص | text]
   - رقم الهاتف | Phone: [رقم | number]
   - البريد الإلكتروني | Email: [بريد | email]
   - رقم السجل التجاري | Commercial Registration: [رقم | number]

3. مسؤول الفرع | Branch Manager:
   - اختر من قائمة المستخدمين | Select from users list
   - يجب أن يكون من الموظفين | Must be a staff member

4. الساعات العملية | Working Hours:
   - من | From: [وقت | time]
   - إلى | To: [وقت | time]
   - أيام العمل | Working Days: [اختر | select days]

5. احفظ | Save
```

### إدارة الأقسام | Manage Departments

```
لكل فرع عدة أقسام (العلاجية، الإدارية، إلخ):
Each branch has multiple departments (Therapy, Admin, etc.):

1. الإدارة → الأقسام → اختر الفرع | Admin → Departments → Select Branch
2. انقر إضافة قسم | Click Add Department
3. ملء التفاصيل:
   - اسم القسم | Department name
   - المدير | Manager
   - الموظفون | Staff members
   - الموارد | Resources

نصيحة | Tip:
يمكن نسخ إعدادات قسم موجود لسهولة الإنشاء
Can copy existing department settings for easier creation
```

---

## 📊 المراقبة والتقارير | Monitoring & Reports

### مراقبة النشاط | Activity Monitoring

```
الإدارة → المراقبة → النشاط
Admin → Monitoring → Activity

المعلومات المتاحة | Available Information:
✓ عدد المستخدمين النشطين | Active users count
✓ آخر تسجيل دخول | Last login time
✓ الجلسات المجدولة اليوم | Today's scheduled sessions
✓ المرضى الجدد | New patients
✓ الوثائق المرفوعة | Uploaded documents
✓ الأخطاء والتنبيهات | Errors and alerts

المرشحات | Filters:
- نطاق التاريخ | Date range
- الفرع | Branch
- القسم | Department
- نوع النشاط | Activity type
```

### التقارير المتقدمة | Advanced Reports

```
أنواع التقارير المتاحة | Available Report Types:

1. تقارير الأداء | Performance Reports
   - إجمالي الجلسات المنجزة | Total completed sessions
   - معدل الالتزام | Compliance rate
   - متوسط درجات الرضا | Average satisfaction scores

2. تقارير مالية | Financial Reports
   - الإيرادات حسب القسم | Revenue by department
   - الفواتير المستحقة | Outstanding invoices
   - حسابات العملاء | Customer accounts

3. تقارير المستخدمين | User Reports
   - تحليل النشاط | Activity analysis
   - ساعات العمل | Working hours
   - الإجازات والغياب | Leaves and absences

4. تقارير الامتثال | Compliance Reports
   - التوافق مع معايير السعودية | Saudi standards compliance
   - سجلات التدقيق | Audit logs
   - التنبيهات الأمنية | Security alerts

تصدير التقارير | Export Reports:
- تنسيق PDF | PDF format
- تنسيق Excel | Excel format
- إرسال عبر البريد | Email delivery
```

---

## 💾 النسخ الاحتياطية والاستعادة | Backup & Restore

### جدول النسخ الاحتياطي | Backup Schedule

```
النسخ الاحتياطية التلقائية | Automatic Backups:
✓ يومية | Daily: الساعة 2 صباحاً | 2:00 AM
✓ أسبوعية | Weekly: يوم الجمعة | Friday
✓ شهرية | Monthly: أول يوم من الشهر | 1st of month

موقع التخزين | Storage Location:
- السحابة الآمنة | Secure cloud
- خادم احتياطي | Backup server
- جهاز خارجي | External device
```

### النسخ الاحتياطي اليدوي | Manual Backup

```
الخطوات | Steps:

1. اذهب إلى الإدارة → النسخ الاحتياطية
   Go to Admin → Backups

2. انقر النسخ الاحتياطي الآن | Click Backup Now
   - اختر المكون | Select component:
     • قاعدة البيانات | Database
     • الملفات والوثائق | Files & Documents
     • الإعدادات | Settings
     • الكل | All

3. انتظر إكمال العملية | Wait for completion
   - وقت العملية يعتمد على حجم البيانات | Time depends on data size
   - يمكنك الاستمرار في العمل | You can continue working

4. سيتم عرض حالة النسخة | Backup status shown
   - تاريخ ووقت الإنشاء | Creation date & time
   - حجم النسخة | Backup size
   - موقع التخزين | Storage location
```

### استعادة من نسخة احتياطية | Restore from Backup

```
⚠️ تحذير مهم | Important Warning:
الاستعادة ستلغي البيانات الحالية | Restore will overwrite current data
اطلب موافقة الإدارة العليا | Get management approval

الخطوات | Steps:

1. اذهب إلى الإدارة → النسخ الاحتياطية → الاستعادة
   Go to Admin → Backups → Restore

2. اختر النسخة المطلوبة | Select backup
   - عرض بمعلومات النسخ | Shows backup information
   - التاريخ والحجم | Date and size

3. أكد الاستعادة | Confirm restoration
   - ستظهر رسالة تحذير | Warning message appears
   - أدخل كلمة المرور الإدارية | Enter admin password

4. انتظر الانتهاء | Wait for completion
   - لا تغلق البرنامج | Don't close the application
   - قد يستغرق من 10-60 دقيقة | May take 10-60 minutes
   - سيتم إرسال إشعار عند الانتهاء | Notification sent when done

5. تحقق من البيانات | Verify data
   - تأكد من صحة البيانات المستعادة | Confirm data is correct
```

---

## 🔍 استكشاف الأخطاء | Troubleshooting

### الأخطاء الشائعة | Common Issues:

| المشكلة                         | Issue              | السبب                   | Cause                      | الحل                                      | Solution                      |
| ------------------------------- | ------------------ | ----------------------- | -------------------------- | ----------------------------------------- | ----------------------------- |
| المستخدم لا يستطيع تسجيل الدخول | User can't login   | كلمة مرور خاطئة أو معطل | Wrong password or disabled | إعادة تعيين كلمة المرور أو تفعيل المستخدم | Reset password or enable user |
| البطء في النظام                 | System slow        | كثير من المستخدمين      | Many users connected       | إعادة تشغيل الخادم                        | Restart server                |
| فقدان بيانات                    | Data loss          | عطل في الخادم           | Server failure             | استعادة من نسخة احتياطية                  | Restore from backup           |
| خطأ في التقارير                 | Report errors      | بيانات ناقصة            | Missing data               | تحديث بيانات المستخدم                     | Update user data              |
| عدم الوصول للملفات              | Can't access files | أذونات ناقصة            | Missing permissions        | منح الصلاحيات اللازمة                     | Grant permissions             |

### عرض سجلات الأخطاء | View Error Logs

```
الإدارة → السجلات → الأخطاء
Admin → Logs → Errors

معلومات كل سجل | Each log shows:
- الوقت | Time
- المستخدم | User
- نوع الخطأ | Error type
- الرسالة | Message
- الحل المقترح | Suggested fix

تصفية السجلات | Filter logs:
- حسب الخطورة | By severity (خطير | critical / تحذير | warning / معلومة | info)
- حسب المستخدم | By user
- حسب التاريخ | By date
```

---

## 🔄 العمليات الروتينية اليومية | Daily Operations

### قائمة التحقق اليومية | Daily Checklist

```
🔵 في بداية اليوم | At Start of Day:
☐ التحقق من حالة الخادم | Check server status
☐ عرض التنبيهات الجديدة | Review new alerts
☐ فحص جلسات اليوم | Check today's sessions
☐ التحقق من الوثائق المرفوعة | Verify uploaded documents
☐ مراجعة سجل الأخطاء | Review error log

🔵 أثناء اليوم | During the Day:
☐ مراقبة النشاط | Monitor activity
☐ الإجابة على استعلامات المستخدمين | Answer user queries
☐ حل المشاكل التقنية | Resolve technical issues
☐ مراقبة الأداء | Monitor performance

🔵 نهاية اليوم | End of Day:
☐ التحقق من النسخ الاحتياطية | Verify backups
☐ عرض ملخص النشاط | Review activity summary
☐ توثيق أي مشاكل حدثت | Document any issues
☐ التحضير ليوم الغد | Prepare for next day
```

### جدول الصيانة الدورية | Maintenance Schedule

```
أسبوعي | Weekly:
🔧 تحديث النظام | System updates
🔧 تنظيف الملفات المؤقتة | Clear cache files
🔧 فحص الأمان | Security scan
🔧 اختبار النسخ الاحتياطية | Test backups

شهري | Monthly:
🔧 تحديث كامل | Full updates
🔧 تحليل الأداء | Performance analysis
🔧 مراجعة الأمان | Security review
🔧 تحديث قائمة المستخدمين | Update user list

ربع سنوي | Quarterly:
🔧 فحص شامل لقاعدة البيانات | Database check
🔧 مراجعة الامتثال | Compliance review
🔧 تدريب المستخدمين | User training
🔧 تقييم الأداء | Performance evaluation
```

### الإجراءات الطارئة | Emergency Procedures

```
في حالة انقطاع الخدمة | In case of service outage:

1. فوري | Immediate:
   - اتصل بفريق الدعم الفني | Call technical support
   - وثق الخطأ | Document the error
   - أخبر المستخدمين | Notify users

2. الخطوات | Steps:
   - حاول إعادة تشغيل الخادم | Try server restart
   - إذا استمرت المشكلة، استعد من نسخة احتياطية | If continues, restore backup
   - اختبر النظام قبل فتح للمستخدمين | Test before reopening to users

3. المتابعة | Follow-up:
   - اكتب تقرير عن الحادث | Write incident report
   - حدد المشكلة | Identify root cause
   - منع تكرار المشكلة | Prevent recurrence
```

---

## 📞 جهات الاتصال | Contact Information

```
فريق الدعم الفني | Technical Support:
البريد: support@rehab-system.sa
الهاتف: +966-1-XXXX-XXXX
ساعات العمل: السبت - الخميس، 8 صباحاً - 6 مساءً
Working Hours: Sat-Thu, 8 AM - 6 PM

مسؤول قاعدة البيانات | Database Administrator:
البريد: dba@rehab-system.sa
الطوارئ: +966-50-XXXX-XXXX

مسؤول الأمان | Security Officer:
البريد: security@rehab-system.sa
الطوارئ: +966-50-XXXX-XXXX
```

---

**آخر تحديث | Last Updated:** January 14, 2026  
**الإصدار | Version:** 1.0  
**السياق | Context:** دليل شامل لإدارة النظام | Comprehensive system administration guide
