"""
API Documentation using Flasgger
"""

from flask import Flask
from flasgger import Swagger
from functools import wraps

def setup_swagger(app):
    """إعداد Swagger API Documentation"""
    
    swagger = Swagger(app, template={
        "swagger": "2.0",
        "info": {
            "title": "نظام إدارة مراكز التأهيل",
            "description": "API شامل لإدارة المستفيدين والجلسات والتقارير والتقييمات",
            "version": "1.0.0",
            "contact": {
                "email": "support@rehab-system.com"
            }
        },
        "basePath": "/api",
        "schemes": ["http", "https"],
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "JWT Token - أدخل 'Bearer YOUR_TOKEN_HERE'"
            }
        }
    })
    
    return swagger


def swagger_doc(**kwargs):
    """ديكوريتر لتوثيق المسارات"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **decor_kwargs):
            return f(*args, **decor_kwargs)
        
        decorated_function.__doc__ = kwargs.get('description', '')
        decorated_function.swagger = kwargs
        return decorated_function
    return decorator


# أمثلة على المسارات المموثقة:

"""
GET /auth/profile
---
tags:
  - Authentication
summary: الحصول على ملف المستخدم الشخصي
description: استرجاع بيانات المستخدم الحالي
security:
  - Bearer: []
responses:
  200:
    description: بيانات المستخدم
    schema:
      properties:
        id:
          type: integer
        username:
          type: string
        email:
          type: string
        name:
          type: string
  401:
    description: غير مصرح - الرمز مفقود أو غير صحيح
  422:
    description: رمز غير صحيح

---

POST /beneficiaries
---
tags:
  - Beneficiaries
summary: إنشاء مستفيد جديد
description: إضافة مستفيد جديد إلى النظام
security:
  - Bearer: []
parameters:
  - name: body
    in: body
    required: true
    schema:
      properties:
        first_name:
          type: string
          example: أحمد
        last_name:
          type: string
          example: محمد
        date_of_birth:
          type: string
          format: date
          example: 2010-05-15
        gender:
          type: string
          enum: [M, F]
        disability_type:
          type: string
          example: Physical
        disability_category:
          type: string
          example: Mobility
        severity_level:
          type: string
          enum: [Mild, Moderate, Severe]
        phone:
          type: string
        email:
          type: string
        address:
          type: string
        guardian_name:
          type: string
        guardian_phone:
          type: string
responses:
  201:
    description: تم إنشاء المستفيد بنجاح
    schema:
      properties:
        id:
          type: integer
        first_name:
          type: string
        message:
          type: string
  400:
    description: بيانات غير صحيحة
  401:
    description: غير مصرح

---

GET /beneficiaries
---
tags:
  - Beneficiaries
summary: الحصول على قائمة المستفيدين
description: استرجاع قائمة بجميع المستفيدين مع الترقيم
security:
  - Bearer: []
parameters:
  - name: page
    in: query
    type: integer
    default: 1
  - name: per_page
    in: query
    type: integer
    default: 10
  - name: search
    in: query
    type: string
    description: البحث بالاسم أو البريد الإلكتروني
  - name: disability_type
    in: query
    type: string
    description: تصفية حسب نوع الإعاقة
responses:
  200:
    description: قائمة المستفيدين
    schema:
      properties:
        data:
          type: array
          items:
            type: object
        pagination:
          properties:
            page:
              type: integer
            per_page:
              type: integer
            total:
              type: integer
            pages:
              type: integer
  401:
    description: غير مصرح

---

GET /beneficiaries/<id>
---
tags:
  - Beneficiaries
summary: الحصول على مستفيد محدد
description: استرجاع بيانات مستفيد واحد
security:
  - Bearer: []
parameters:
  - name: id
    in: path
    type: integer
    required: true
responses:
  200:
    description: بيانات المستفيد
  404:
    description: المستفيد غير موجود
  401:
    description: غير مصرح

---

PUT /beneficiaries/<id>
---
tags:
  - Beneficiaries
summary: تحديث بيانات مستفيد
description: تعديل بيانات مستفيد موجود
security:
  - Bearer: []
parameters:
  - name: id
    in: path
    type: integer
    required: true
  - name: body
    in: body
    required: true
    schema:
      properties:
        first_name:
          type: string
        last_name:
          type: string
        phone:
          type: string
        email:
          type: string
responses:
  200:
    description: تم التحديث بنجاح
  400:
    description: بيانات غير صحيحة
  404:
    description: المستفيد غير موجود
  401:
    description: غير مصرح

---

DELETE /beneficiaries/<id>
---
tags:
  - Beneficiaries
summary: حذف مستفيد
description: حذف مستفيد من النظام
security:
  - Bearer: []
parameters:
  - name: id
    in: path
    type: integer
    required: true
responses:
  200:
    description: تم الحذف بنجاح
  404:
    description: المستفيد غير موجود
  401:
    description: غير مصرح

---

POST /sessions
---
tags:
  - Sessions
summary: إنشاء جلسة جديدة
description: إضافة جلسة علاج جديدة
security:
  - Bearer: []
parameters:
  - name: body
    in: body
    required: true
    schema:
      properties:
        beneficiary_id:
          type: integer
        therapist_id:
          type: integer
        session_type:
          type: string
        session_date:
          type: string
          format: date
        session_time:
          type: string
          format: time
        duration_minutes:
          type: integer
        objectives:
          type: string
        notes:
          type: string
responses:
  201:
    description: تم إنشاء الجلسة بنجاح
  400:
    description: بيانات غير صحيحة
  401:
    description: غير مصرح

---

GET /sessions
---
tags:
  - Sessions
summary: الحصول على قائمة الجلسات
description: استرجاع جميع الجلسات مع الترقيم والتصفية
security:
  - Bearer: []
parameters:
  - name: page
    in: query
    type: integer
    default: 1
  - name: beneficiary_id
    in: query
    type: integer
  - name: status
    in: query
    type: string
    enum: [scheduled, completed, cancelled]
responses:
  200:
    description: قائمة الجلسات
  401:
    description: غير مصرح

---

POST /reports
---
tags:
  - Reports
summary: إنشاء تقرير جديد
description: إضافة تقرير تقييم شامل
security:
  - Bearer: []
parameters:
  - name: body
    in: body
    required: true
    schema:
      properties:
        beneficiary_id:
          type: integer
        report_type:
          type: string
        title:
          type: string
        summary:
          type: string
        description:
          type: string
        recommendations:
          type: string
responses:
  201:
    description: تم إنشاء التقرير بنجاح
  400:
    description: بيانات غير صحيحة
  401:
    description: غير مصرح

---

GET /reports
---
tags:
  - Reports
summary: الحصول على قائمة التقارير
description: استرجاع جميع التقارير
security:
  - Bearer: []
parameters:
  - name: page
    in: query
    type: integer
  - name: beneficiary_id
    in: query
    type: integer
  - name: report_type
    in: query
    type: string
responses:
  200:
    description: قائمة التقارير
  401:
    description: غير مصرح

---

POST /assessments
---
tags:
  - Assessments
summary: إنشاء تقييم جديد
description: إضافة تقييم جديد للمستفيد
security:
  - Bearer: []
parameters:
  - name: body
    in: body
    required: true
    schema:
      properties:
        beneficiary_id:
          type: integer
        assessment_type:
          type: string
        assessment_tool:
          type: string
        assessment_date:
          type: string
          format: date
        total_score:
          type: number
        assessment_results:
          type: string
        recommendations:
          type: string
responses:
  201:
    description: تم إنشاء التقييم بنجاح
  400:
    description: بيانات غير صحيحة
  401:
    description: غير مصرح

---

GET /programs
---
tags:
  - Programs
summary: الحصول على قائمة البرامج
description: استرجاع جميع برامج التأهيل
security:
  - Bearer: []
parameters:
  - name: page
    in: query
    type: integer
responses:
  200:
    description: قائمة البرامج
  401:
    description: غير مصرح

---

POST /goals
---
tags:
  - Goals
summary: إنشاء هدف جديد
description: إضافة هدف SMART جديد
security:
  - Bearer: []
parameters:
  - name: body
    in: body
    required: true
    schema:
      properties:
        beneficiary_id:
          type: integer
        goal_description:
          type: string
        domain:
          type: string
        goal_category:
          type: string
        start_date:
          type: string
          format: date
        target_date:
          type: string
          format: date
        target_value:
          type: number
        current_progress:
          type: number
responses:
  201:
    description: تم إنشاء الهدف بنجاح
  400:
    description: بيانات غير صحيحة
  401:
    description: غير مصرح
"""
