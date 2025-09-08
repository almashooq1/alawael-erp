# نظام الأتمتة الشامل - دليل المطور والمستخدم
# Comprehensive Automation System - Developer & User Guide

## نظرة عامة | Overview

نظام الأتمتة الشامل لمراكز الأوائل هو منصة متقدمة لأتمتة العمليات التشغيلية، إدارة سير العمل، جدولة المهام، وإرسال الإشعارات التلقائية. يوفر النظام واجهات API شاملة، لوحة تحكم تفاعلية، ونظام تقارير متقدم.

The Comprehensive Automation System for Mawael Centers is an advanced platform for automating operational processes, workflow management, task scheduling, and automatic notifications. The system provides comprehensive APIs, interactive dashboard, and advanced reporting system.

## المكونات الأساسية | Core Components

### 1. محرك سير العمل | Workflow Engine
- **الملف**: `automation_services.py` - `WorkflowEngine`
- **الوظائف**:
  - تنفيذ سير العمل التلقائي
  - دعم الإجراءات المتعددة (رسائل، مكالمات، تحديث البيانات)
  - التحكم في التنفيذ (إيقاف، استئناف، إلغاء)
  - معالجة الشروط والمتغيرات
  - نظام إعادة المحاولة والتعامل مع الأخطاء

### 2. محرك القواعد | Rule Engine
- **الملف**: `automation_services.py` - `RuleEngine`
- **الوظائف**:
  - تقييم القواعد والشروط المعقدة
  - دعم العمليات المنطقية (AND, OR, NOT)
  - تقييم القواعد بالجملة
  - أولوية القواعد

### 3. جدولة المهام | Task Scheduler
- **الملف**: `automation_services.py` - `TaskScheduler`
- **الوظائف**:
  - جدولة الرسائل والمهام
  - دعم الجدولة المتكررة
  - معالجة المهام المجدولة تلقائياً
  - إدارة المناطق الزمنية

### 4. نظام الإشعارات | Notification System
- **الملف**: `notification_services.py`
- **الوظائف**:
  - إرسال إشعارات متعددة القنوات (SMS, Email, WhatsApp, Push)
  - إدارة الاشتراكات والمجموعات
  - نظام إعادة المحاولة مع Exponential Backoff
  - مراقبة صحة النظام

### 5. نظام التقارير | Reporting System
- **الملف**: `automation_reports.py`
- **الوظائف**:
  - توليد تقارير شاملة (PDF, Excel, CSV, JSON, HTML)
  - تقارير الأداء والإحصائيات
  - التقارير المجدولة
  - الرسوم البيانية والتحليلات

## نماذج قاعدة البيانات | Database Models

### الجداول الأساسية | Core Tables

```sql
-- سير العمل
AutomationWorkflow
- id, name, description
- trigger_type, trigger_conditions
- is_active, priority
- created_at, updated_at, created_by

-- الإجراءات
AutomationAction  
- id, workflow_id, name
- action_type, parameters
- order, is_active

-- الرسائل المجدولة
ScheduledMessage
- id, message_type, recipient
- message, scheduled_time
- status, sent_at, created_by

-- تنفيذات سير العمل
WorkflowExecution
- id, workflow_id, started_at
- completed_at, status, context
- started_by, duration

-- تنفيذات الإجراءات
ActionExecution
- id, execution_id, action_id
- started_at, completed_at, status
- result, error_message

-- القواعد
AutomationRule
- id, workflow_id, name
- conditions, priority
- is_active, created_at

-- السجلات
AutomationLog
- id, workflow_id, execution_id
- event_type, message, timestamp
- user_id, metadata
```

## واجهات API | API Endpoints

### إدارة سير العمل | Workflow Management

```http
GET    /api/automation/workflows              # قائمة سير العمل
POST   /api/automation/workflows              # إنشاء سير عمل جديد
GET    /api/automation/workflows/{id}         # تفاصيل سير العمل
PUT    /api/automation/workflows/{id}         # تحديث سير العمل
DELETE /api/automation/workflows/{id}         # حذف سير العمل

POST   /api/automation/workflows/{id}/execute # تنفيذ سير العمل
POST   /api/automation/workflows/{id}/pause   # إيقاف التنفيذ
POST   /api/automation/workflows/{id}/resume  # استئناف التنفيذ
POST   /api/automation/workflows/{id}/cancel  # إلغاء التنفيذ
```

### إدارة الرسائل | Message Management

```http
GET    /api/automation/messages               # قائمة الرسائل المجدولة
POST   /api/automation/messages               # جدولة رسالة جديدة
GET    /api/automation/messages/{id}          # تفاصيل الرسالة
PUT    /api/automation/messages/{id}          # تحديث الرسالة
DELETE /api/automation/messages/{id}          # حذف الرسالة

POST   /api/automation/messages/send          # إرسال رسالة فورية
POST   /api/automation/messages/bulk          # إرسال رسائل بالجملة
```

### إدارة القواعد | Rules Management

```http
GET    /api/automation/rules                  # قائمة القواعد
POST   /api/automation/rules                  # إنشاء قاعدة جديدة
GET    /api/automation/rules/{id}             # تفاصيل القاعدة
PUT    /api/automation/rules/{id}             # تحديث القاعدة
DELETE /api/automation/rules/{id}             # حذف القاعدة

POST   /api/automation/rules/{id}/evaluate    # تقييم قاعدة
POST   /api/automation/rules/evaluate-all     # تقييم جميع القواعد
```

### التقارير | Reports

```http
POST   /api/automation/reports/generate       # توليد تقرير
GET    /api/automation/reports/types          # أنواع التقارير
POST   /api/automation/reports/schedule       # جدولة تقرير
GET    /api/automation/reports/scheduled      # التقارير المجدولة
DELETE /api/automation/reports/scheduled/{id} # إلغاء تقرير مجدول
GET    /api/automation/reports/statistics     # إحصائيات سريعة
```

### المراقبة | Monitoring

```http
GET    /api/automation/executions             # قائمة التنفيذات
GET    /api/automation/executions/{id}        # تفاصيل التنفيذ
GET    /api/automation/logs                   # سجلات النظام
GET    /api/automation/engine/status          # حالة المحرك
POST   /api/automation/engine/start           # بدء المحرك
POST   /api/automation/engine/stop            # إيقاف المحرك
```

## أنواع الإجراءات المدعومة | Supported Action Types

### 1. إرسال الرسائل | Send Messages
```json
{
  "action_type": "send_message",
  "parameters": {
    "message_type": "sms|email|whatsapp|push",
    "recipient": "phone_or_email",
    "message": "نص الرسالة",
    "template_id": "optional_template_id"
  }
}
```

### 2. المكالمات الصوتية | Voice Calls
```json
{
  "action_type": "make_call",
  "parameters": {
    "phone": "+966501234567",
    "message": "نص المكالمة",
    "language": "ar"
  }
}
```

### 3. تحديث البيانات | Update Records
```json
{
  "action_type": "update_record",
  "parameters": {
    "table": "table_name",
    "record_id": 123,
    "data": {"field": "value"}
  }
}
```

### 4. إنشاء السجلات | Create Records
```json
{
  "action_type": "create_record",
  "parameters": {
    "table": "table_name",
    "data": {"field": "value"}
  }
}
```

### 5. مزامنة الأنظمة الخارجية | External System Sync
```json
{
  "action_type": "sync_external",
  "parameters": {
    "system_id": 1,
    "data": {"sync_data": "value"}
  }
}
```

### 6. الانتظار | Wait
```json
{
  "action_type": "wait",
  "parameters": {
    "duration": 300  // بالثواني
  }
}
```

### 7. الشروط | Conditions
```json
{
  "action_type": "condition",
  "parameters": {
    "condition": "variable == 'value'",
    "true_action": "continue",
    "false_action": "skip"
  }
}
```

### 8. استدعاء API | API Calls
```json
{
  "action_type": "api_call",
  "parameters": {
    "url": "https://api.example.com/endpoint",
    "method": "POST",
    "headers": {"Authorization": "Bearer token"},
    "data": {"key": "value"}
  }
}
```

## أنواع المحفزات | Trigger Types

### 1. يدوي | Manual
```json
{
  "trigger_type": "manual",
  "trigger_conditions": {}
}
```

### 2. مجدول | Scheduled
```json
{
  "trigger_type": "scheduled",
  "trigger_conditions": {
    "schedule": "0 9 * * *",  // Cron expression
    "timezone": "Asia/Riyadh"
  }
}
```

### 3. حدث قاعدة البيانات | Database Event
```json
{
  "trigger_type": "database_event",
  "trigger_conditions": {
    "table": "patients",
    "event": "insert|update|delete",
    "conditions": {"status": "new"}
  }
}
```

### 4. API Webhook
```json
{
  "trigger_type": "webhook",
  "trigger_conditions": {
    "endpoint": "/webhook/automation",
    "method": "POST",
    "auth_required": true
  }
}
```

## لوحة التحكم | Dashboard

### الملفات | Files
- **HTML**: `templates/automation.html`
- **JavaScript**: `static/js/automation.js`
- **CSS**: مدمج في Bootstrap مع تخصيصات RTL

### الميزات | Features
- واجهة عربية RTL كاملة
- إدارة سير العمل والقواعد
- مراقبة التنفيذات والسجلات
- جدولة الرسائل
- توليد التقارير
- تحديث تلقائي كل 30 ثانية
- إشعارات المستخدم

### الأقسام | Sections
1. **سير العمل** - إدارة وتنفيذ سير العمل
2. **القواعد** - إنشاء وإدارة القواعد
3. **الرسائل** - جدولة ومراقبة الرسائل
4. **التنفيذات** - مراقبة تنفيذات سير العمل
5. **السجلات** - عرض سجلات النظام
6. **التقارير** - توليد وجدولة التقارير

## نظام التقارير | Reporting System

### أنواع التقارير | Report Types

1. **تقرير أداء سير العمل** - `workflow_performance`
   - إحصائيات التنفيذ
   - معدلات النجاح
   - متوسط أوقات التنفيذ

2. **تقرير ملخص التنفيذ** - `execution_summary`
   - ملخص شامل للتنفيذات
   - الإحصائيات اليومية
   - أكثر سير العمل استخداماً

3. **تقرير تسليم الرسائل** - `message_delivery`
   - إحصائيات الرسائل
   - معدلات التسليم
   - تحليل حسب النوع

4. **تقرير صحة النظام** - `system_health`
   - سجلات الأخطاء
   - وقت التشغيل
   - حالة المكونات

5. **تقرير فعالية القواعد** - `rule_effectiveness`
   - إحصائيات تنفيذ القواعد
   - تحليل الفعالية

6. **التقارير الدورية** - `daily_summary`, `weekly_summary`, `monthly_summary`
   - ملخصات شاملة دورية

### تنسيقات التقارير | Report Formats
- **PDF** - تقارير مطبوعة احترافية
- **Excel** - جداول بيانات تفاعلية
- **CSV** - بيانات خام للتحليل
- **JSON** - بيانات منظمة للتطبيقات
- **HTML** - تقارير ويب تفاعلية

## التثبيت والإعداد | Installation & Setup

### المتطلبات | Requirements
```bash
pip install -r requirements.txt
```

### المتغيرات البيئية | Environment Variables
```bash
# قاعدة البيانات
DATABASE_URL=postgresql://user:pass@localhost/db

# JWT
JWT_SECRET_KEY=your-secret-key

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase (Push Notifications)
FIREBASE_CREDENTIALS_PATH=path/to/firebase-credentials.json

# WhatsApp Business API
WHATSAPP_API_URL=https://api.whatsapp.com
WHATSAPP_API_TOKEN=your-token

# OneSignal (Push Notifications)
ONESIGNAL_APP_ID=your-app-id
ONESIGNAL_API_KEY=your-api-key

# Email
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-password
```

### إعداد قاعدة البيانات | Database Setup
```bash
# إنشاء الجداول
python -c "from app import db; db.create_all()"

# أو استخدام Flask-Migrate
flask db init
flask db migrate -m "Initial automation tables"
flask db upgrade
```

### تشغيل النظام | Running the System
```bash
# تشغيل التطبيق
python app.py

# تشغيل المجدول في الخلفية
python -c "from automation_services import task_scheduler; task_scheduler.start_scheduler()"
```

## الاختبارات | Testing

### تشغيل الاختبارات | Running Tests
```bash
# تشغيل جميع الاختبارات
python -m pytest test_automation_system.py -v

# أو استخدام unittest
python test_automation_system.py
```

### أنواع الاختبارات | Test Types
1. **اختبارات الوحدة** - محرك سير العمل، القواعد، الجدولة
2. **اختبارات التكامل** - API endpoints، قاعدة البيانات
3. **اختبارات النظام** - سير العمل الكامل من البداية للنهاية

## الأمان | Security

### المصادقة | Authentication
- JWT tokens لجميع API endpoints
- انتهاء صلاحية الرموز
- تجديد الرموز التلقائي

### التخويل | Authorization
- فحص صلاحيات المستخدم
- تسجيل جميع العمليات
- فصل البيانات حسب المستخدم

### حماية البيانات | Data Protection
- تشفير البيانات الحساسة
- تسجيل مفصل للعمليات
- نسخ احتياطية منتظمة

## المراقبة والصيانة | Monitoring & Maintenance

### المراقبة | Monitoring
- سجلات مفصلة لجميع العمليات
- إشعارات تلقائية للأخطاء
- مراقبة الأداء والموارد

### الصيانة | Maintenance
- تنظيف السجلات القديمة
- تحسين الاستعلامات
- تحديث التبعيات

### النسخ الاحتياطية | Backups
- نسخ احتياطية يومية لقاعدة البيانات
- حفظ ملفات التكوين
- اختبار استعادة البيانات

## استكشاف الأخطاء | Troubleshooting

### مشاكل شائعة | Common Issues

1. **فشل تنفيذ سير العمل**
   - فحص السجلات في `AutomationLog`
   - التحقق من صحة المعاملات
   - فحص الاتصال بالخدمات الخارجية

2. **عدم إرسال الرسائل**
   - التحقق من إعدادات الخدمات (Twilio, Firebase)
   - فحص صحة أرقام الهواتف والبريد الإلكتروني
   - مراجعة حالة الرسائل في قاعدة البيانات

3. **مشاكل الجدولة**
   - التحقق من تشغيل المجدول
   - فحص المنطقة الزمنية
   - مراجعة تعبيرات Cron

### السجلات | Logs
```python
# عرض السجلات الأخيرة
logs = AutomationLog.query.order_by(AutomationLog.timestamp.desc()).limit(100).all()

# فلترة حسب نوع الحدث
error_logs = AutomationLog.query.filter(
    AutomationLog.event_type.contains('error')
).all()
```

## التطوير والتوسع | Development & Extension

### إضافة أنواع إجراءات جديدة | Adding New Action Types
```python
# في WorkflowEngine._execute_action
elif action.action_type == 'new_action_type':
    return self._handle_new_action(action, context)

def _handle_new_action(self, action, context):
    # تنفيذ الإجراء الجديد
    pass
```

### إضافة محفزات جديدة | Adding New Triggers
```python
# في WorkflowEngine
def _setup_new_trigger(self, workflow):
    # إعداد المحفز الجديد
    pass
```

### توسيع نظام التقارير | Extending Reports
```python
# في AutomationReportGenerator
def _collect_new_report_data(self, start_date, end_date, filters):
    # جمع بيانات التقرير الجديد
    pass
```

## الدعم | Support

للحصول على الدعم التقني أو الإبلاغ عن مشاكل:
- مراجعة هذا الدليل أولاً
- فحص السجلات والأخطاء
- التواصل مع فريق التطوير

---

## ملاحظات التطوير | Development Notes

تم تطوير هذا النظام باستخدام:
- **Python 3.8+**
- **Flask** - إطار العمل الأساسي
- **SQLAlchemy** - ORM لقاعدة البيانات
- **JWT** - المصادقة والتخويل
- **Bootstrap 5** - واجهة المستخدم
- **Chart.js** - الرسوم البيانية
- **Schedule** - جدولة المهام
- **Pandas** - معالجة البيانات
- **ReportLab** - توليد PDF

النظام مصمم ليكون:
- **قابل للتوسع** - سهولة إضافة ميزات جديدة
- **موثوق** - معالجة شاملة للأخطاء
- **آمن** - مصادقة وتخويل محكم
- **سريع** - استعلامات محسنة وفهرسة
- **سهل الاستخدام** - واجهة بديهية ودليل شامل

---

*تم إنشاء هذا الدليل كجزء من نظام الأتمتة الشامل لمراكز الأوائل*
