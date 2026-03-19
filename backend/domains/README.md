# Domain-Driven Design (DDD) — البنية المعيارية

هيكل تنظيم الكود باستخدام نمط **Domain-Driven Design** لتقسيم النظام إلى وحدات (Domains) مستقلة.

## البنية

```
domains/
├── index.js              # Domain Registry — تسجيل وتحميل جميع الدومينات
├── _base/                # الكلاسات الأساسية المشتركة
│   ├── BaseDomainModule.js
│   ├── BaseRepository.js
│   └── BaseService.js
├── auth/                 # نطاق المصادقة والتفويض
│   ├── index.js
│   ├── auth.routes.js
│   ├── auth.controller.js
│   ├── auth.service.js
│   └── auth.model.js
├── hr/                   # نطاق الموارد البشرية
├── finance/              # نطاق المالية والمحاسبة
├── fleet/                # نطاق إدارة الأسطول
├── rehabilitation/       # نطاق التأهيل والإعاقة
├── education/            # نطاق التعليم
├── communication/        # نطاق التواصل والإشعارات
├── supply-chain/         # نطاق سلسلة التوريد
├── medical/              # نطاق الخدمات الطبية
├── government/           # نطاق التكاملات الحكومية
└── admin/                # نطاق الإدارة العامة
```

## كيفية إنشاء دومين جديد

```javascript
const { BaseDomainModule } = require('../_base/BaseDomainModule');

class MyDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'my-domain',
      version: '1.0.0',
      prefix: '/api/v1/my-domain',
      description: 'وصف النظام',
    });
  }

  registerRoutes(router) {
    router.get('/', this.controller.list.bind(this.controller));
    router.post('/', this.controller.create.bind(this.controller));
  }
}
```

## الفوائد

1. **فصل المسؤوليات**: كل دومين مسؤول عن نطاقه فقط
2. **سهولة الصيانة**: تعديل دومين لا يؤثر على البقية
3. **قابلية التوسع**: إضافة دومين جديد بسهولة
4. **اختبارات معزولة**: كل دومين يُختبر بشكل مستقل
5. **إعادة الاستخدام**: الكلاسات الأساسية مشتركة
