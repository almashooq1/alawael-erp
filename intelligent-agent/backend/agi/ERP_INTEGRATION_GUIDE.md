# 💼 دليل تكامل نظام ERP مع Rehab AGI

## نظرة عامة

هذا الدليل يشرح كيفية تكامل نظام Rehab AGI مع أنظمة تخطيط موارد المؤسسات (ERP)
المختلفة. النظام مصمم ليكون مرناً ويدعم التكامل مع معظم أنظمة ERP الشائعة.

---

## 🎯 الوحدات المدعومة

نظام Rehab AGI يتكامل مع 8 وحدات رئيسية في أنظمة ERP:

### 1. 👥 إدارة الموارد البشرية (HR Management)

- إدارة المعالجين والموظفين
- الحضور والانصراف
- الجداول الزمنية
- تقييم الأداء
- الرواتب والحوافز

### 2. 💰 الإدارة المالية (Finance Management)

- إنشاء الفواتير
- تسجيل المدفوعات
- تتبع الحسابات
- التقارير المالية
- الميزانيات

### 3. 📦 إدارة المخزون (Inventory Management)

- تتبع الأجهزة الطبية
- المعدات التأهيلية
- المستلزمات الطبية
- أوامر الشراء
- التنبيهات عند نفاد المخزون

### 4. 👤 إدارة المستفيدين (Beneficiary Management)

- قاعدة بيانات المستفيدين
- السجلات الشخصية
- تاريخ الخدمات
- حالة التسجيل

### 5. 🏥 السجلات الطبية (Medical Records)

- التقارير الطبية
- التقييمات
- نتائج الفحوصات
- سجل الأدوية
- الحساسيات والتحذيرات

### 6. 📚 الخدمات التعليمية (Education Services)

- البرامج التعليمية
- المناهج الخاصة
- تتبع التقدم الأكاديمي
- المواد التعليمية

### 7. 📊 التقارير والتحليلات (Reports & Analytics)

- تقارير الأداء
- الإحصائيات
- لوحات المعلومات
- تحليلات متقدمة

### 8. 📞 إدارة علاقات العملاء (CRM)

- التواصل مع العائلات
- المواعيد
- الاستفسارات والشكاوى
- استطلاعات الرضا

---

## 🔧 إعداد التكامل

### الخطوة 1: تهيئة ملف البيئة

أنشئ أو عدّل ملف `.env` في مجلد AGI:

```env
# معلومات نظام ERP
ERP_API_URL=https://your-erp-system.com/api
ERP_API_KEY=your-secret-api-key-here
ERP_COMPANY_ID=COMP-001
ERP_BRANCH_ID=BRANCH-001

# إعدادات المزامنة
ERP_SYNC_INTERVAL=3600000      # كل ساعة (بالميلي ثانية)
ERP_SYNC_ENABLED=true
ERP_AUTO_SYNC=true

# إعدادات إعادة المحاولة
ERP_RETRY_ATTEMPTS=3
ERP_RETRY_DELAY=2000           # 2 ثانية
ERP_TIMEOUT=30000              # 30 ثانية

# إعدادات التسجيل
ERP_LOG_LEVEL=info
ERP_LOG_REQUESTS=true
ERP_LOG_RESPONSES=false        # تجنب تسجيل البيانات الحساسة

# إعدادات الأمان
ERP_USE_SSL=true
ERP_VERIFY_CERTIFICATE=true

# إعدادات التخزين المؤقت
ERP_CACHE_ENABLED=true
ERP_CACHE_TTL=300000           # 5 دقائق
```

### الخطوة 2: تثبيت الاعتماديات

```bash
npm install axios dotenv
```

### الخطوة 3: تحديث ملف التكامل

عدّل ملف `specialized/erp-integration.ts` حسب نظام ERP الخاص بك:

```typescript
import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';

dotenv.config();

export class ERPIntegration extends EventEmitter {
  private apiClient: AxiosInstance;
  private apiBaseUrl: string;
  private apiKey: string;

  constructor(config?: {
    apiBaseUrl?: string;
    apiKey?: string;
    timeout?: number;
  }) {
    super();

    this.apiBaseUrl = config?.apiBaseUrl || process.env.ERP_API_URL!;
    this.apiKey = config?.apiKey || process.env.ERP_API_KEY!;

    // إنشاء عميل Axios مع الإعدادات
    this.apiClient = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: config?.timeout || parseInt(process.env.ERP_TIMEOUT || '30000'),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'X-Company-ID': process.env.ERP_COMPANY_ID,
        'X-Branch-ID': process.env.ERP_BRANCH_ID,
      },
    });

    // Interceptor للتسجيل
    this.apiClient.interceptors.request.use(
      config => {
        if (process.env.ERP_LOG_REQUESTS === 'true') {
          console.log(
            '[ERP Request]',
            config.method?.toUpperCase(),
            config.url
          );
        }
        return config;
      },
      error => {
        console.error('[ERP Request Error]', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      response => {
        if (process.env.ERP_LOG_RESPONSES === 'true') {
          console.log('[ERP Response]', response.status, response.config.url);
        }
        return response;
      },
      async error => {
        // إعادة المحاولة تلقائياً
        const config = error.config;

        if (!config || !config.retry) {
          config.retry = 0;
        }

        const maxRetries = parseInt(process.env.ERP_RETRY_ATTEMPTS || '3');

        if (config.retry < maxRetries) {
          config.retry += 1;

          const delay = parseInt(process.env.ERP_RETRY_DELAY || '2000');
          await new Promise(resolve =>
            setTimeout(resolve, delay * config.retry)
          );

          console.log(
            `[ERP Retry] محاولة ${config.retry}/${maxRetries} - ${config.url}`
          );
          return this.apiClient(config);
        }

        console.error('[ERP Error]', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  // ... باقي الدوال
}
```

---

## 🔌 التكامل مع أنظمة ERP المختلفة

### 1. SAP Business One

#### إعداد الاتصال

```env
ERP_API_URL=https://your-sap-server:50000/b1s/v1
ERP_API_KEY=your-session-id
ERP_COMPANY_DB=SBO_DEMO_SA
```

#### مثال على استدعاء API

```typescript
// إنشاء فاتورة في SAP
async createSAPInvoice(beneficiaryId: string, items: any[]) {
  try {
    const response = await this.apiClient.post('/Invoices', {
      CardCode: beneficiaryId,
      DocDate: new Date().toISOString().split('T')[0],
      DocumentLines: items.map(item => ({
        ItemDescription: item.description,
        Quantity: item.quantity,
        UnitPrice: item.unitPrice,
      }))
    });

    return response.data;
  } catch (error) {
    console.error('خطأ في إنشاء فاتورة SAP:', error);
    throw error;
  }
}
```

### 2. Microsoft Dynamics 365

#### إعداد الاتصال

```env
ERP_API_URL=https://your-org.api.crm.dynamics.com/api/data/v9.2
ERP_API_KEY=your-access-token
ERP_TENANT_ID=your-tenant-id
```

#### مثال على استدعاء API

```typescript
// إنشاء عميل في Dynamics
async createDynamicsAccount(beneficiary: any) {
  try {
    const response = await this.apiClient.post('/accounts', {
      name: beneficiary.name,
      accountnumber: beneficiary.nationalId,
      telephone1: beneficiary.phone,
      emailaddress1: beneficiary.email,
      address1_line1: beneficiary.address.street,
      address1_city: beneficiary.address.city,
    });

    return response.data;
  } catch (error) {
    console.error('خطأ في إنشاء حساب Dynamics:', error);
    throw error;
  }
}
```

### 3. Oracle NetSuite

#### إعداد الاتصال

```env
ERP_API_URL=https://your-account.suitetalk.api.netsuite.com/services/rest
ERP_API_KEY=your-token-id
ERP_ACCOUNT_ID=1234567
```

#### مثال على استدعاء API

```typescript
// إنشاء عميل في NetSuite
async createNetSuiteCustomer(beneficiary: any) {
  try {
    const response = await this.apiClient.post('/record/v1/customer', {
      companyName: beneficiary.name,
      email: beneficiary.email,
      phone: beneficiary.phone,
      isPerson: true,
      firstName: beneficiary.name.split(' ')[0],
      lastName: beneficiary.name.split(' ').slice(1).join(' '),
    });

    return response.data;
  } catch (error) {
    console.error('خطأ في إنشاء عميل NetSuite:', error);
    throw error;
  }
}
```

### 4. Odoo

#### إعداد الاتصال

```env
ERP_API_URL=https://your-odoo.com
ERP_DATABASE=your-database
ERP_USERNAME=admin
ERP_PASSWORD=your-password
```

#### مثال على استدعاء API

```typescript
// مصادقة Odoo
async authenticateOdoo() {
  try {
    const response = await axios.post(`${this.apiBaseUrl}/web/session/authenticate`, {
      jsonrpc: '2.0',
      params: {
        db: process.env.ERP_DATABASE,
        login: process.env.ERP_USERNAME,
        password: process.env.ERP_PASSWORD,
      }
    });

    return response.data.result.session_id;
  } catch (error) {
    console.error('خطأ في مصادقة Odoo:', error);
    throw error;
  }
}

// إنشاء شريك في Odoo
async createOdooPartner(beneficiary: any) {
  try {
    const sessionId = await this.authenticateOdoo();

    const response = await axios.post(`${this.apiBaseUrl}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      params: {
        model: 'res.partner',
        method: 'create',
        args: [{
          name: beneficiary.name,
          email: beneficiary.email,
          phone: beneficiary.phone,
          street: beneficiary.address.street,
          city: beneficiary.address.city,
          is_company: false,
        }],
        kwargs: {}
      }
    }, {
      headers: {
        'Cookie': `session_id=${sessionId}`
      }
    });

    return response.data.result;
  } catch (error) {
    console.error('خطأ في إنشاء شريك Odoo:', error);
    throw error;
  }
}
```

### 5. ERPNext

#### إعداد الاتصال

```env
ERP_API_URL=https://your-erpnext.com/api
ERP_API_KEY=your-api-key
ERP_API_SECRET=your-api-secret
```

#### مثال على استدعاء API

```typescript
// إنشاء عميل في ERPNext
async createERPNextCustomer(beneficiary: any) {
  try {
    const response = await this.apiClient.post('/resource/Customer', {
      customer_name: beneficiary.name,
      customer_type: 'Individual',
      territory: 'Saudi Arabia',
      customer_group: 'Beneficiaries',
    });

    return response.data;
  } catch (error) {
    console.error('خطأ في إنشاء عميل ERPNext:', error);
    throw error;
  }
}

// إنشاء فاتورة في ERPNext
async createERPNextInvoice(beneficiaryId: string, items: any[]) {
  try {
    const response = await this.apiClient.post('/resource/Sales Invoice', {
      customer: beneficiaryId,
      posting_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: items.map(item => ({
        item_code: item.itemCode,
        item_name: item.description,
        qty: item.quantity,
        rate: item.unitPrice,
      }))
    });

    return response.data;
  } catch (error) {
    console.error('خطأ في إنشاء فاتورة ERPNext:', error);
    throw error;
  }
}
```

---

## 🔄 سيناريوهات التكامل الشائعة

### سيناريو 1: تسجيل مستفيد جديد

```typescript
async function registerNewBeneficiary(beneficiaryData: any) {
  const erpIntegration = new ERPIntegration();

  try {
    // 1. حفظ البيانات محلياً
    const beneficiary = await saveBeneficiaryLocally(beneficiaryData);

    // 2. مزامنة مع ERP
    const syncResult = await erpIntegration.syncBeneficiary(beneficiary.id);

    // 3. إنشاء حساب مالي
    const accountResult = await erpIntegration.createFinancialAccount(
      beneficiary.id
    );

    // 4. إرسال إشعار ترحيبي
    await erpIntegration.sendNotification(
      beneficiary.id,
      'sms',
      'مرحباً بك',
      `أهلاً ${beneficiary.name}، تم تسجيلك بنجاح في المركز`
    );

    console.log('✅ تم تسجيل المستفيد بنجاح');
    return { beneficiary, syncResult, accountResult };
  } catch (error) {
    console.error('❌ خطأ في تسجيل المستفيد:', error);
    throw error;
  }
}
```

### سيناريو 2: إنشاء فاتورة شهرية

```typescript
async function createMonthlyInvoice(beneficiaryId: string, month: string) {
  const erpIntegration = new ERPIntegration();

  try {
    // 1. الحصول على جلسات الشهر
    const sessions = await getMonthSessions(beneficiaryId, month);

    // 2. حساب التكلفة
    const items = sessions.map(session => ({
      description: `جلسة ${session.programType} - ${session.date}`,
      quantity: 1,
      unitPrice: session.cost,
      total: session.cost,
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

    // 3. إنشاء الفاتورة في ERP
    const invoice = await erpIntegration.createInvoice(
      beneficiaryId,
      items,
      totalAmount,
      new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() // استحقاق بعد 15 يوم
    );

    // 4. إرسال إشعار بالفاتورة
    await erpIntegration.sendNotification(
      beneficiaryId,
      'email',
      'فاتورة جديدة',
      `تم إصدار فاتورة بمبلغ ${totalAmount} ريال. رقم الفاتورة: ${invoice.data.invoiceNumber}`
    );

    console.log('✅ تم إنشاء الفاتورة:', invoice.data.invoiceNumber);
    return invoice;
  } catch (error) {
    console.error('❌ خطأ في إنشاء الفاتورة:', error);
    throw error;
  }
}
```

### سيناريو 3: تسجيل دفعة وتحديث الحساب

```typescript
async function processPayment(paymentData: any) {
  const erpIntegration = new ERPIntegration();

  try {
    // 1. تسجيل الدفعة في ERP
    const payment = await erpIntegration.recordPayment(
      paymentData.beneficiaryId,
      paymentData.amount,
      paymentData.method,
      paymentData.reference
    );

    // 2. تحديث الرصيد
    const summary = await erpIntegration.getFinancialSummary(
      paymentData.beneficiaryId
    );

    // 3. إرسال إشعار بالاستلام
    await erpIntegration.sendNotification(
      paymentData.beneficiaryId,
      'sms',
      'إيصال دفع',
      `تم استلام دفعة بمبلغ ${paymentData.amount} ريال. الرصيد المتبقي: ${summary.data.balance} ريال`
    );

    // 4. إذا كان الرصيد صفر، إرسال شهادة إخلاء طرف
    if (summary.data.balance === 0) {
      await sendClearanceCertificate(paymentData.beneficiaryId);
    }

    console.log('✅ تم معالجة الدفعة بنجاح');
    return { payment, summary };
  } catch (error) {
    console.error('❌ خطأ في معالجة الدفعة:', error);
    throw error;
  }
}
```

### سيناريو 4: جدولة موعد وحجز موارد

```typescript
async function scheduleAppointment(appointmentData: any) {
  const erpIntegration = new ERPIntegration();

  try {
    // 1. حجز الغرفة
    const roomBooking = await erpIntegration.bookResource(
      'room',
      appointmentData.roomId,
      appointmentData.beneficiaryId,
      appointmentData.therapistId,
      appointmentData.startTime,
      appointmentData.endTime,
      'جلسة علاجية'
    );

    // 2. حجز الأجهزة المطلوبة
    const equipmentBookings = await Promise.all(
      appointmentData.equipment.map(eq =>
        erpIntegration.bookResource(
          'equipment',
          eq.id,
          appointmentData.beneficiaryId,
          appointmentData.therapistId,
          appointmentData.startTime,
          appointmentData.endTime,
          'جلسة علاجية'
        )
      )
    );

    // 3. تحديث جدول المعالج
    await updateTherapistSchedule(
      appointmentData.therapistId,
      appointmentData.startTime,
      appointmentData.endTime
    );

    // 4. إرسال تذكير بالموعد
    await erpIntegration.sendNotification(
      appointmentData.beneficiaryId,
      'sms',
      'تذكير بالموعد',
      `لديك موعد غداً ${appointmentData.startTime} في ${roomBooking.data.location}`
    );

    console.log('✅ تم جدولة الموعد بنجاح');
    return { roomBooking, equipmentBookings };
  } catch (error) {
    console.error('❌ خطأ في جدولة الموعد:', error);
    throw error;
  }
}
```

---

## 🔐 الأمان وأفضل الممارسات

### 1. حماية مفاتيح API

```typescript
// ❌ سيء - لا تفعل هذا
const apiKey = 'sk-1234567890abcdef';

// ✅ جيد - استخدم متغيرات البيئة
const apiKey = process.env.ERP_API_KEY;

// ✅ أفضل - استخدم مدير أسرار
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
const apiKey = await getSecretFromVault('erp-api-key');
```

### 2. تشفير البيانات الحساسة

```typescript
import crypto from 'crypto';

function encryptSensitiveData(data: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

function decryptSensitiveData(encryptedData: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### 3. معالجة الأخطاء بشكل آمن

```typescript
try {
  await erpIntegration.syncBeneficiary(id);
} catch (error) {
  // ❌ سيء - قد يكشف معلومات حساسة
  console.error('Error:', error);

  // ✅ جيد - رسائل عامة
  console.error('فشل المزامنة مع ERP');

  // ✅ أفضل - تسجيل مفصل في السجلات فقط
  logger.error('ERP sync failed', {
    beneficiaryId: id,
    error: error.message,
    stack: error.stack,
  });

  // إرسال رسالة عامة للمستخدم
  throw new Error('حدث خطأ أثناء المزامنة. يرجى المحاولة لاحقاً.');
}
```

### 4. تحديد معدل الطلبات (Rate Limiting)

```typescript
import rateLimit from 'express-rate-limit';

const erpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // حد أقصى 100 طلب لكل IP
  message: 'تم تجاوز عدد الطلبات المسموح. يرجى المحاولة لاحقاً.',
});

// تطبيق على مسارات ERP
app.use('/api/rehab-agi/erp', erpLimiter);
```

### 5. التحقق من صلاحية البيانات

```typescript
import Joi from 'joi';

const invoiceSchema = Joi.object({
  beneficiaryId: Joi.string()
    .required()
    .pattern(/^BEN-\d+$/),
  items: Joi.array().min(1).required(),
  totalAmount: Joi.number().positive().required(),
  dueDate: Joi.date().iso().min('now').required(),
});

function validateInvoiceData(data: any) {
  const { error, value } = invoiceSchema.validate(data);

  if (error) {
    throw new Error(`بيانات غير صالحة: ${error.details[0].message}`);
  }

  return value;
}
```

---

## 📊 المراقبة والصيانة

### 1. مراقبة صحة التكامل

```typescript
async function checkERPHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${process.env.ERP_API_URL}/health`, {
      timeout: 5000,
    });

    return response.status === 200;
  } catch (error) {
    console.error('ERP health check failed:', error);
    return false;
  }
}

// فحص دوري كل 5 دقائق
setInterval(
  async () => {
    const isHealthy = await checkERPHealth();

    if (!isHealthy) {
      // إرسال تنبيه للمسؤولين
      await sendAlertToAdmins('نظام ERP غير متاح');
    }
  },
  5 * 60 * 1000
);
```

### 2. تسجيل العمليات

```typescript
import winston from 'winston';

const erpLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'erp-integration' },
  transports: [
    new winston.transports.File({ filename: 'erp-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'erp-combined.log' }),
  ],
});

// استخدام
erpLogger.info('Syncing beneficiary', { beneficiaryId: 'BEN-001' });
erpLogger.error('Sync failed', {
  beneficiaryId: 'BEN-001',
  error: 'Connection timeout',
});
```

### 3. مقاييس الأداء

```typescript
import { performance } from 'perf_hooks';

async function measureERPOperation<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    console.log(`[ERP Metrics] ${operation}: ${duration.toFixed(2)}ms`);

    // حفظ في قاعدة بيانات للتحليل
    await saveMetric({
      operation,
      duration,
      timestamp: new Date(),
      status: 'success',
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    await saveMetric({
      operation,
      duration,
      timestamp: new Date(),
      status: 'error',
      error: error.message,
    });

    throw error;
  }
}

// استخدام
const result = await measureERPOperation('sync-beneficiary', () =>
  erpIntegration.syncBeneficiary('BEN-001')
);
```

---

## 🧪 الاختبار

### اختبار وحدة للتكامل

```typescript
import { describe, it, expect, jest } from '@jest/globals';
import { ERPIntegration } from './erp-integration';

describe('ERP Integration', () => {
  let erpIntegration: ERPIntegration;

  beforeEach(() => {
    erpIntegration = new ERPIntegration({
      apiBaseUrl: 'http://localhost:3000/mock-erp',
      apiKey: 'test-key',
    });
  });

  it('should create invoice successfully', async () => {
    const result = await erpIntegration.createInvoice(
      'BEN-001',
      [{ description: 'Test', quantity: 1, unitPrice: 100, total: 100 }],
      100,
      '2026-02-15'
    );

    expect(result.success).toBe(true);
    expect(result.data.invoiceNumber).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    await expect(
      erpIntegration.syncBeneficiary('INVALID-ID')
    ).rejects.toThrow();
  });
});
```

---

## 📞 الدعم

للحصول على مساعدة إضافية:

- 📧 البريد الإلكتروني: erp-support@rehab-agi.com
- 📚 الوثائق: [REHAB_AGI_README.md](REHAB_AGI_README.md)
- 💬 الدعم الفني: +966-XX-XXXXXXX

---

_آخر تحديث: 30 يناير 2026_
